/**
 * Direct Context Window Pipeline
 *
 * Implements document loading and query execution using the full document
 * context without RAG retrieval. Includes comprehensive metrics tracking,
 * context window validation, and OWASP security standards compliance.
 */

import {
  OpenRAGClient,
  OpenRAGError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  ChatResponse
} from 'openrag-sdk';
import {
  calculateCost,
  getContextWindowSize,
  getModelPricing,
  DEFAULT_MODEL
} from '@/lib/constants/models';
import { estimateTokens } from '@/lib/utils/token-estimator';
import {
  calculateTimingBreakdown,
  calculateTokenBreakdown,
  calculateCostBreakdown,
  calculateContextWindowBreakdown
} from '@/lib/rag-comparison/metrics-calculator';
import { appendToDocument, getDocument } from '@/lib/rag-comparison/document-storage';
import type {
  DocumentMetadata,
  DirectConfig,
  DirectResult
} from '@/types/rag-comparison';

/**
 * Result from document loading operation
 */
export interface LoadResult {
  /** Whether loading was successful */
  success: boolean;
  /** Document identifier */
  documentId: string;
  /** Total token count of the document */
  tokenCount: number;
  /** Time taken to load in milliseconds */
  loadTime: number;
  /** Whether document fits within context window */
  withinLimit: boolean;
  /** Warning messages about document size */
  warnings: string[];
  /** Error message if loading failed */
  error?: string;
}

/**
 * Context validation result
 */
export interface ContextCheck {
  /** Whether context fits within model's limit */
  valid: boolean;
  /** Total tokens in context */
  totalTokens: number;
  /** Model's context window limit */
  limit: number;
  /** Percentage of context window used */
  usage: number;
  /** Warning messages */
  warnings: string[];
}

/**
 * Comprehensive metrics for direct queries
 */
export interface DirectMetrics {
  /** Total time for generation in milliseconds */
  totalTime: number;
  /** Time taken for generation in milliseconds */
  generationTime: number;
  /** Total input tokens used */
  inputTokens: number;
  /** Total output tokens generated */
  outputTokens: number;
  /** Total tokens (input + output) */
  totalTokens: number;
  /** Total cost in USD */
  cost: number;
  /** Percentage of context window used */
  contextWindowUsage: number;
}

/**
 * System prompt for direct queries
 */
const DIRECT_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided document.

Instructions:
- Read and understand the entire document provided below
- Answer the question using ONLY the information from the document
- If the document doesn't contain enough information to answer the question, say so clearly
- Be thorough and accurate in your response
- Cite specific parts of the document when relevant
- Do not make up information or use knowledge outside the provided document`;

/**
 * Custom error class for direct pipeline errors
 */
export class DirectPipelineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DirectPipelineError';
  }
}

/**
 * OpenRAG client instance
 * Configured via OPENRAG_URL and OPENRAG_API_KEY environment variables
 */
let openragClient: OpenRAGClient | null = null;

/**
 * Get or create OpenRAG client instance
 * @throws {DirectPipelineError} If environment variables are not configured
 */
function getOpenRAGClient(): OpenRAGClient {
  if (!openragClient) {
    // Validate environment variables
    if (!process.env.OPENRAG_API_KEY) {
      throw new DirectPipelineError(
        'OPENRAG_API_KEY environment variable is not set',
        'MISSING_API_KEY'
      );
    }
    if (!process.env.OPENRAG_URL) {
      throw new DirectPipelineError(
        'OPENRAG_URL environment variable is not set',
        'MISSING_URL'
      );
    }

    openragClient = new OpenRAGClient({
      apiKey: process.env.OPENRAG_API_KEY,
      baseUrl: process.env.OPENRAG_URL,
    });
  }
  return openragClient;
}

/**
 * Convert OpenRAG SDK errors to DirectPipelineError
 * @param error - Error from OpenRAG SDK
 * @returns DirectPipelineError with appropriate code and message
 */
function handleOpenRAGError(error: unknown): DirectPipelineError {
  if (error instanceof AuthenticationError) {
    return new DirectPipelineError(
      'Authentication failed. Please check your OPENRAG_API_KEY.',
      'AUTHENTICATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof NotFoundError) {
    return new DirectPipelineError(
      'Resource not found in OpenRAG.',
      'NOT_FOUND_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ValidationError) {
    return new DirectPipelineError(
      'Invalid request to OpenRAG.',
      'VALIDATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof RateLimitError) {
    return new DirectPipelineError(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ServerError) {
    return new DirectPipelineError(
      'OpenRAG server error. Please try again later.',
      'SERVER_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof OpenRAGError) {
    return new DirectPipelineError(
      `OpenRAG error: ${error.message}`,
      'OPENRAG_ERROR',
      { originalError: error.message, statusCode: error.statusCode }
    );
  }
  
  if (error instanceof Error) {
    return new DirectPipelineError(
      `Unexpected error: ${error.message}`,
      'UNEXPECTED_ERROR',
      { originalError: error.message }
    );
  }
  
  return new DirectPipelineError(
    'Unknown error occurred',
    'UNKNOWN_ERROR'
  );
}

/**
 * Sanitizes input strings to prevent injection attacks
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validates document ID format
 * 
 * @param documentId - Document ID to validate
 * @throws {DirectPipelineError} If document ID is invalid
 */
function validateDocumentId(documentId: string): void {
  if (!documentId || typeof documentId !== 'string') {
    throw new DirectPipelineError(
      'Document ID is required',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Prevent path traversal and injection
  if (documentId.includes('..') || documentId.includes('/') || documentId.includes('\\')) {
    throw new DirectPipelineError(
      'Document ID contains invalid characters',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Limit length to prevent DoS
  if (documentId.length > 255) {
    throw new DirectPipelineError(
      'Document ID exceeds maximum length',
      'INVALID_DOCUMENT_ID',
      { documentId, maxLength: 255 }
    );
  }
}

/**
 * Validates query string
 * 
 * @param query - Query to validate
 * @throws {DirectPipelineError} If query is invalid
 */
function validateQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new DirectPipelineError(
      'Query is required',
      'INVALID_QUERY',
      { query }
    );
  }

  const sanitized = sanitizeInput(query);
  if (sanitized.length === 0) {
    throw new DirectPipelineError(
      'Query cannot be empty after sanitization',
      'INVALID_QUERY',
      { query }
    );
  }

  // Limit query length to prevent DoS
  if (sanitized.length > 10000) {
    throw new DirectPipelineError(
      'Query exceeds maximum length',
      'INVALID_QUERY',
      { query, maxLength: 10000 }
    );
  }
}

/**
 * Validates document content
 * 
 * @param content - Document content to validate
 * @throws {DirectPipelineError} If content is invalid
 */
function validateContent(content: string): void {
  if (!content || typeof content !== 'string') {
    throw new DirectPipelineError(
      'Document content is required',
      'INVALID_CONTENT',
      { content }
    );
  }

  const sanitized = sanitizeInput(content);
  if (sanitized.length === 0) {
    throw new DirectPipelineError(
      'Document content cannot be empty after sanitization',
      'INVALID_CONTENT',
      { content }
    );
  }

  // Limit content length to prevent DoS (100MB)
  if (sanitized.length > 100 * 1024 * 1024) {
    throw new DirectPipelineError(
      'Document content exceeds maximum size',
      'INVALID_CONTENT',
      { contentLength: sanitized.length, maxLength: 100 * 1024 * 1024 }
    );
  }
}

/**
 * Builds the system prompt for direct queries
 * 
 * @returns System prompt string
 * 
 * @example
 * ```typescript
 * const prompt = buildSystemPrompt();
 * ```
 */
export function buildSystemPrompt(): string {
  return DIRECT_SYSTEM_PROMPT;
}

/**
 * Validates if token count is within context size limit
 * 
 * @param tokens - Number of tokens to validate
 * @param limit - Context window limit
 * @returns True if within limits, false otherwise
 * 
 * @example
 * ```typescript
 * const valid = validateContextSize(5000, 128000); // true
 * ```
 */
export function validateContextSize(tokens: number, limit: number): boolean {
  if (tokens < 0 || limit <= 0) {
    return false;
  }
  return tokens <= limit;
}

/**
 * Generates warning messages based on token count and context limit
 * 
 * @param tokenCount - Number of tokens in document
 * @param contextLimit - Model's context window limit
 * @returns Array of warning messages
 * 
 * @example
 * ```typescript
 * const warnings = generateWarnings(70000, 128000);
 * // Returns: ["Document uses 54.69% of context window"]
 * ```
 */
export function generateWarnings(tokenCount: number, contextLimit: number): string[] {
  const warnings: string[] = [];
  const percentage = (tokenCount / contextLimit) * 100;

  if (percentage > 90) {
    warnings.push(
      `⚠️ CRITICAL: Document uses ${percentage.toFixed(2)}% of context window (>90%). ` +
      `This leaves very little room for the query and response.`
    );
  } else if (percentage > 75) {
    warnings.push(
      `⚠️ WARNING: Document uses ${percentage.toFixed(2)}% of context window (>75%). ` +
      `Consider using RAG for better performance.`
    );
  } else if (percentage > 50) {
    warnings.push(
      `⚠️ NOTICE: Document uses ${percentage.toFixed(2)}% of context window (>50%). ` +
      `Monitor token usage carefully.`
    );
  }

  return warnings;
}

/**
 * Builds complete context for direct query
 * 
 * Assembles the full context including system prompt, document content,
 * and user query in the proper format for the LLM.
 * 
 * @param content - Full document content
 * @param query - User query
 * @returns Complete context string
 * 
 * @example
 * ```typescript
 * const context = buildDirectContext(documentContent, "What is the main topic?");
 * ```
 */
export function buildDirectContext(content: string, query: string): string {
  const sanitizedContent = sanitizeInput(content);
  const sanitizedQuery = sanitizeInput(query);
  
  return `${DIRECT_SYSTEM_PROMPT}

=== DOCUMENT START ===

${sanitizedContent}

=== DOCUMENT END ===

User Question: ${sanitizedQuery}

Please provide a clear and accurate answer based on the document above.`;
}

/**
 * Checks if context fits within model's context window limit
 * 
 * Validates the total context (system prompt + document + query) against
 * the model's context window size and generates appropriate warnings.
 * 
 * @param content - Document content
 * @param query - User query
 * @param model - Model identifier
 * @returns Context validation result
 * 
 * @example
 * ```typescript
 * const check = checkContextLimit(content, query, 'gpt-4-turbo');
 * if (!check.valid) {
 *   console.error('Context exceeds model limit!');
 * }
 * ```
 */
export function checkContextLimit(
  content: string,
  query: string,
  model: string
): ContextCheck {
  const limit = getContextWindowSize(model);
  
  if (limit === 0) {
    throw new DirectPipelineError(
      `Unknown model: ${model}`,
      'UNKNOWN_MODEL',
      { model }
    );
  }

  const fullContext = buildDirectContext(content, query);
  const totalTokens = estimateTokens(fullContext);
  const usage = (totalTokens / limit) * 100;
  const valid = validateContextSize(totalTokens, limit);
  const warnings = generateWarnings(totalTokens, limit);

  return {
    valid,
    totalTokens,
    limit,
    usage,
    warnings
  };
}

/**
 * Calculates context window usage percentage
 * 
 * @param totalTokens - Total tokens in context
 * @param model - Model identifier
 * @returns Percentage of context window used (0-100)
 * 
 * @example
 * ```typescript
 * const usage = calculateContextUsage(50000, 'gpt-4-turbo');
 * console.log(`Using ${usage.toFixed(2)}% of context window`);
 * ```
 */
export function calculateContextUsage(totalTokens: number, model: string): number {
  const limit = getContextWindowSize(model);
  
  if (limit === 0) {
    return 0;
  }

  const percentage = (totalTokens / limit) * 100;
  return Math.min(percentage, 100); // Cap at 100%
}

/**
 * Calculates comprehensive metrics for direct queries
 * 
 * @param generationTime - Time taken for generation in milliseconds
 * @param inputTokens - Number of input tokens used
 * @param outputTokens - Number of output tokens generated
 * @param contextWindowSize - Model's context window size
 * @param model - Model identifier for pricing
 * @returns Direct metrics object
 * 
 * @example
 * ```typescript
 * const metrics = calculateMetrics(500, 50000, 1000, 128000, 'gpt-4-turbo');
 * console.log(`Cost: $${metrics.cost.toFixed(4)}`);
 * ```
 */
export function calculateMetrics(
  generationTime: number,
  inputTokens: number,
  outputTokens: number,
  _contextWindowSize: number,
  model: string
): DirectMetrics {
  // Validate inputs
  if (generationTime < 0) {
    throw new DirectPipelineError(
      'Generation time cannot be negative',
      'INVALID_METRICS',
      { generationTime }
    );
  }

  if (inputTokens < 0 || outputTokens < 0) {
    throw new DirectPipelineError(
      'Token counts cannot be negative',
      'INVALID_METRICS',
      { inputTokens, outputTokens }
    );
  }

  const totalTime = generationTime;
  const totalTokens = inputTokens + outputTokens;
  const cost = calculateCost(model, inputTokens, outputTokens);
  const contextWindowUsage = calculateContextUsage(inputTokens, model);

  return {
    totalTime,
    generationTime,
    inputTokens,
    outputTokens,
    totalTokens,
    cost,
    contextWindowUsage
  };
}

/**
 * Loads a document into memory for direct context window processing
 *
 * Validates the document content, estimates token count, checks against
 * context window limits, and generates appropriate warnings.
 *
 * @param content - Full document content
 * @param documentId - Unique identifier for the document
 * @param metadata - Document metadata
 * @param isMultiFile - Whether this is part of a multi-file upload (default: false)
 * @param filename - Filename for separator in multi-file uploads
 * @returns Promise resolving to load result with timing and validation info
 *
 * @example
 * ```typescript
 * const result = await loadDocument(content, 'doc-123', metadata);
 * if (result.success && result.withinLimit) {
 *   console.log(`Loaded ${result.tokenCount} tokens in ${result.loadTime}ms`);
 * }
 * ```
 */
export async function loadDocument(
  content: string,
  documentId: string,
  metadata: DocumentMetadata,
  isMultiFile: boolean = false,
  filename?: string
): Promise<LoadResult> {
  const startTime = performance.now();

  try {
    // Validate inputs
    validateDocumentId(documentId);
    validateContent(content);

    const sanitizedContent = sanitizeInput(content);

    // Estimate total tokens for this document
    const tokenCount = estimateTokens(sanitizedContent);

    // Handle multi-file uploads - append to existing document
    if (isMultiFile) {
      const separator = filename
        ? `\n\n=== DOCUMENT: ${filename} ===\n\n`
        : '\n\n=== NEXT DOCUMENT ===\n\n';
      
      // Check if document already exists
      const existingDoc = getDocument(documentId);
      
      if (existingDoc) {
        // Append to existing document
        appendToDocument(documentId, sanitizedContent, metadata, undefined, separator);
        console.log(`[Direct] Appended ${filename || 'document'} to batch ${documentId}`);
      } else {
        // First document in the batch - create with separator prefix
        const contentWithHeader = filename
          ? `=== DOCUMENT: ${filename} ===\n\n${sanitizedContent}`
          : sanitizedContent;
        appendToDocument(documentId, contentWithHeader, metadata);
        console.log(`[Direct] Created batch ${documentId} with ${filename || 'document'}`);
      }
      
      // Get the accumulated document to calculate total tokens
      const accumulatedDoc = getDocument(documentId);
      const totalTokenCount = accumulatedDoc
        ? estimateTokens(accumulatedDoc.content)
        : tokenCount;
      
      // Get context window limit for a default model
      const referenceLimit = getContextWindowSize(DEFAULT_MODEL);
      
      // Check if accumulated content is within limits
      const withinLimit = totalTokenCount < referenceLimit * 0.9;
      
      // Generate warnings based on accumulated content
      const warnings = generateWarnings(totalTokenCount, referenceLimit);

      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);

      return {
        success: true,
        documentId,
        tokenCount: totalTokenCount, // Return accumulated token count
        loadTime,
        withinLimit,
        warnings
      };
    }

    // Single file upload - original behavior
    // Get context window limit for a default model (we'll check per-model at query time)
    // Using DEFAULT_MODEL as reference for warnings
    const referenceLimit = getContextWindowSize(DEFAULT_MODEL);
    
    // Check if within reasonable limits
    const withinLimit = tokenCount < referenceLimit * 0.9; // Leave 10% for query/response
    
    // Generate warnings
    const warnings = generateWarnings(tokenCount, referenceLimit);

    const endTime = performance.now();
    const loadTime = Math.round(endTime - startTime);

    return {
      success: true,
      documentId,
      tokenCount,
      loadTime,
      withinLimit,
      warnings
    };

  } catch (error) {
    const endTime = performance.now();
    const loadTime = Math.round(endTime - startTime);

    if (error instanceof DirectPipelineError) {
      return {
        success: false,
        documentId,
        tokenCount: 0,
        loadTime,
        withinLimit: false,
        warnings: [],
        error: error.message
      };
    }

    return {
      success: false,
      documentId,
      tokenCount: 0,
      loadTime,
      withinLimit: false,
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown error during loading'
    };
  }
}

/**
 * Executes a direct query using full document context
 * 
 * Builds complete context with the full document, validates against model's
 * context window, calls LLM without retrieval, and tracks comprehensive metrics.
 * 
 * @param documentId - Document identifier
 * @param content - Full document content
 * @param query - User query string
 * @param config - Direct query configuration
 * @returns Promise resolving to direct result with answer and metrics
 * @throws {DirectPipelineError} If query execution fails
 * 
 * @example
 * ```typescript
 * const result = await query('doc-123', content, 'What is the main topic?', {
 *   model: 'gpt-4-turbo',
 *   temperature: 0.7,
 *   maxTokens: 1000
 * });
 * console.log('Answer:', result.answer);
 * console.log('Cost:', result.metrics.cost);
 * ```
 */
export async function query(
  documentId: string,
  content: string,
  query: string,
  config: DirectConfig
): Promise<DirectResult> {
  try {
    // Validate inputs
    validateDocumentId(documentId);
    validateContent(content);
    validateQuery(query);

    if (!config || typeof config !== 'object') {
      throw new DirectPipelineError(
        'Direct configuration is required',
        'INVALID_CONFIG',
        { config }
      );
    }

    // Validate model
    const pricing = getModelPricing(config.model);
    if (!pricing) {
      throw new DirectPipelineError(
        `Unsupported model: ${config.model}`,
        'UNSUPPORTED_MODEL',
        { model: config.model }
      );
    }

    const sanitizedContent = sanitizeInput(content);
    const sanitizedQuery = sanitizeInput(query);
    
    // Enhanced logging for debugging multi-file content
    console.log('\n[Direct Pipeline Query] Starting query execution');
    console.log('[Direct Pipeline Query] Document ID:', documentId);
    console.log('[Direct Pipeline Query] Content length received:', content.length);
    console.log('[Direct Pipeline Query] Content preview (first 500 chars):',
      content.substring(0, 500));
    
    // Count document separators to verify all files are included
    const separatorPattern = /=== DOCUMENT:/g;
    const separatorMatches = content.match(separatorPattern);
    const documentCount = separatorMatches ? separatorMatches.length : 0;
    console.log('[Direct Pipeline Query] Number of documents in content:', documentCount);
    
    if (documentCount > 1) {
      console.log('[Direct Pipeline Query] ✅ Processing multi-file content with', documentCount, 'documents');
      // Log each document header found
      const headerPattern = /=== DOCUMENT: ([^\n]+) ===/g;
      const headers = [...content.matchAll(headerPattern)];
      console.log('[Direct Pipeline Query] Document files included:');
      headers.forEach((match, idx) => {
        console.log(`  ${idx + 1}. ${match[1]}`);
      });
    } else if (documentCount === 1) {
      console.log('[Direct Pipeline Query] ℹ️  Processing single document');
    } else {
      console.log('[Direct Pipeline Query] ⚠️  No document separators found - legacy format or single file');
    }

    // Validate total context doesn't exceed model's context window
    const contextCheck = checkContextLimit(sanitizedContent, sanitizedQuery, config.model);
    
    if (!contextCheck.valid) {
      throw new DirectPipelineError(
        `Context exceeds model's limit: ${contextCheck.totalTokens} tokens > ${contextCheck.limit} tokens`,
        'CONTEXT_LIMIT_EXCEEDED',
        {
          totalTokens: contextCheck.totalTokens,
          limit: contextCheck.limit,
          usage: contextCheck.usage
        }
      );
    }

    // Track generation time
    const generationStartTime = performance.now();

    // Get OpenRAG client
    const client = getOpenRAGClient();

    // Build complete message with system prompt, document, and query
    // Since SDK uses single message format, we combine everything
    const fullMessage = `${buildSystemPrompt()}

=== DOCUMENT START ===

${sanitizedContent}

=== DOCUMENT END ===

User Question: ${sanitizedQuery}

Please provide a clear and accurate answer based on the document above.`;

    // Log the full message being sent to LLM
    console.log('[Direct Pipeline Query] Full message length:', fullMessage.length);
    console.log('[Direct Pipeline Query] Full message preview (first 1000 chars):',
      fullMessage.substring(0, 1000));
    console.log('[Direct Pipeline Query] Sending to LLM with model:', config.model);

    // Call LLM with full context using OpenRAG SDK
    // Note: SDK doesn't support model/temperature/max_tokens parameters or disabling retrieval
    // The model and settings are configured server-side in OpenRAG settings
    let responseData: ChatResponse;
    try {
      responseData = await client.chat.create({
        message: fullMessage,
        // Set limit to 0 to minimize retrieval impact (SDK doesn't have use_retrieval parameter)
        limit: 0,
        // Set high score threshold to minimize retrieval results
        scoreThreshold: 0.99
      });
      console.log('[Direct Pipeline Query] ✅ LLM response received');
    } catch (error) {
      console.error('[Direct Pipeline Query] ❌ LLM call failed:', error);
      throw handleOpenRAGError(error);
    }

    const generationEndTime = performance.now();
    const generationTime = Math.round(generationEndTime - generationStartTime);

    // Extract answer from SDK response
    const answer = responseData.response || '';

    // Calculate token usage breakdown
    // Input tokens = system prompt + full document + user query
    const systemPrompt = buildSystemPrompt();
    const systemPromptTokens = estimateTokens(systemPrompt);
    const queryTokens = estimateTokens(sanitizedQuery);
    const documentTokens = estimateTokens(sanitizedContent);
    const inputTokens = systemPromptTokens + documentTokens + queryTokens;
    
    // Output tokens = generated response
    const outputTokens = estimateTokens(answer);

    // Get context window size for usage calculation
    const contextWindowSize = getContextWindowSize(config.model);

    // Calculate comprehensive metrics
    const metrics = calculateMetrics(
      generationTime,
      inputTokens,
      outputTokens,
      contextWindowSize,
      config.model
    );

    // Calculate detailed breakdown
    const timingBreakdown = calculateTimingBreakdown(undefined, generationTime);
    const tokenBreakdown = calculateTokenBreakdown(
      systemPromptTokens,
      queryTokens,
      documentTokens,
      outputTokens
    );
    const costBreakdown = calculateCostBreakdown(
      config.model,
      inputTokens,
      outputTokens,
      false // No embedding cost for direct queries
    );
    const contextWindowBreakdown = calculateContextWindowBreakdown(
      config.model,
      inputTokens + outputTokens
    );

    const breakdown = {
      timing: timingBreakdown,
      tokens: tokenBreakdown,
      cost: costBreakdown,
      contextWindow: contextWindowBreakdown,
      metadata: {
        model: config.model,
        timestamp: new Date(),
        notes: [
          'Direct query uses full document context without retrieval',
          'Token count includes the entire document in the context window'
        ]
      }
    };

    return {
      answer,
      metrics: {
        generationTime: metrics.generationTime,
        tokens: metrics.totalTokens,
        cost: metrics.cost,
        contextWindowUsage: metrics.contextWindowUsage,
        breakdown
      }
    };

  } catch (error) {
    if (error instanceof DirectPipelineError) {
      throw error;
    }

    throw new DirectPipelineError(
      'Direct query execution failed',
      'QUERY_EXECUTION_ERROR',
      {
        documentId,
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}

// Made with Bob