/**
 * Direct Context Window Pipeline
 *
 * Implements document loading and query execution using the full document
 * context without RAG retrieval. Includes comprehensive metrics tracking,
 * context window validation, and OWASP security standards compliance.
 */

import {
  ChatResponse
} from 'openrag-sdk';
import {
  calculateCost,
  getContextWindowSize,
  getModelPricing,
  DEFAULT_MODEL
} from '@/lib/constants/models';
import {
  getOpenRAGClient,
  handleOpenRAGError,
  sanitizeInput,
  validateDocumentId,
  validateQuery
} from '../utils/pipeline-utils';
import { estimateTokens } from '@/lib/utils/token-estimator';
import {
  calculateTimingBreakdown,
  calculateTokenBreakdown,
  calculateCostBreakdown,
  calculateContextWindowBreakdown
} from '../metrics/metrics-calculator';
import { appendToDocument, getDocument } from '../processing/document-storage';
import type {
  DocumentMetadata,
  DirectConfig,
  DirectResult
} from '@/types/rag-comparison';
import { buildPrompt, buildHybridPrompt, SYSTEM_PROMPT } from './shared-prompt-builder';
import {
  ProcessingEventTracker,
  ProcessingEventType,
  ProcessingEvent,
  PipelineType
} from '@/types/processing-events';

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

  // Limit content length to prevent DoS (150MB)
  if (sanitized.length > 150 * 1024 * 1024) {
    throw new DirectPipelineError(
      'Document content exceeds maximum size',
      'INVALID_CONTENT',
      { contentLength: sanitized.length, maxLength: 150 * 1024 * 1024 }
    );
  }
}

/**
 * Builds the system prompt for direct queries
 * @deprecated Use SYSTEM_PROMPT from shared-prompt-builder instead
 * @returns System prompt string
 *
 * @example
 * ```typescript
 * const prompt = buildSystemPrompt();
 * ```
 */
export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
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
 * @deprecated Use buildPrompt from shared-prompt-builder instead
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
  return buildPrompt(content, query);
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
  // First try OpenAI/standard models
  let limit = getContextWindowSize(model);
  
  // If not found, try Ollama models (for hybrid pipeline using Ollama models)
  if (limit === 0) {
    const { getOllamaModelConfig } = require('@/lib/constants/ollama-models');
    const ollamaConfig = getOllamaModelConfig(model);
    
    if (ollamaConfig) {
      limit = ollamaConfig.contextWindow;
      console.log(`[Hybrid Pipeline] Using Ollama model config for ${model}: ${limit.toLocaleString()} tokens`);
    } else {
      throw new DirectPipelineError(
        `Unknown model: ${model}. Model not found in OpenAI or Ollama configurations.`,
        'UNKNOWN_MODEL',
        { model }
      );
    }
  }

  // Use shared prompt builder for consistency
  const fullContext = buildHybridPrompt(content, query);
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
    validateDocumentId(documentId, DirectPipelineError);
    validateContent(content);

    // Sanitize content but preserve original formatting for accurate token counting
    // The sanitizeInput removes control characters while preserving whitespace structure
    const sanitizedContent = sanitizeInput(content);
    
    console.log(`[Hybrid Pipeline] BEFORE estimateTokens:`);
    console.log(`[Hybrid Pipeline]   - Original content length: ${content.length.toLocaleString()} characters`);
    console.log(`[Hybrid Pipeline]   - Sanitized content length: ${sanitizedContent.length.toLocaleString()} characters`);
    console.log(`[Hybrid Pipeline]   - Content preview (first 200 chars): "${sanitizedContent.substring(0, 200)}"`);
    
    // Estimate total tokens for this document using the actual content
    // Do NOT normalize whitespace here - tiktoken counts tokens based on actual text structure
    // Collapsing whitespace artificially reduces token count and causes inaccurate metrics
    const tokenCount = estimateTokens(sanitizedContent);
    
    console.log(`[Hybrid Pipeline] AFTER estimateTokens:`);
    console.log(`[Hybrid Pipeline]   - Token count: ${tokenCount.toLocaleString()} tokens`);

    // Handle multi-file uploads - append to existing document
    if (isMultiFile) {
      const separator = filename
        ? `\n\n=== DOCUMENT: ${filename} ===\n\n`
        : '\n\n=== NEXT DOCUMENT ===\n\n';
      
      // Check if document already exists
      const existingDoc = getDocument(documentId);
      
      if (existingDoc) {
        // Append to existing document - use sanitized content
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
      // Calculate tokens on the actual accumulated content without normalization
      // This preserves the true token count including whitespace structure
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
  config: DirectConfig,
  eventCallback?: (event: ProcessingEvent) => void,
  filterId?: string
): Promise<DirectResult> {
  // Initialize event tracker with optional callback for real-time streaming
  const eventTracker = new ProcessingEventTracker(eventCallback, PipelineType.DIRECT);
  
  try {
    // Track initialization
    const initEventId = eventTracker.startEvent(
      ProcessingEventType.INITIALIZATION,
      'Initialize Direct pipeline',
      { documentId, model: config.model }
    );
    
    // Validate inputs
    const validationEventId = eventTracker.startEvent(
      ProcessingEventType.VALIDATION,
      'Validate inputs (documentId, content, query, config)'
    );
    
    validateDocumentId(documentId, DirectPipelineError);
    validateContent(content);
    validateQuery(query, DirectPipelineError);

    if (!config || typeof config !== 'object') {
      eventTracker.failEvent(validationEventId, 'Invalid Direct configuration');
      throw new DirectPipelineError(
        'Direct configuration is required',
        'INVALID_CONFIG',
        { config }
      );
    }

    // Validate model
    const pricing = getModelPricing(config.model);
    if (!pricing) {
      eventTracker.failEvent(validationEventId, `Unsupported model: ${config.model}`);
      throw new DirectPipelineError(
        `Unsupported model: ${config.model}`,
        'UNSUPPORTED_MODEL',
        { model: config.model }
      );
    }
    
    eventTracker.completeEvent(validationEventId);
    eventTracker.completeEvent(initEventId);

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

    // Track context check
    const contextCheckEventId = eventTracker.startEvent(
      ProcessingEventType.CONTEXT_CHECK,
      'Validate context fits within model limits',
      { model: config.model }
    );
    
    const contextCheck = checkContextLimit(sanitizedContent, sanitizedQuery, config.model);
    
    if (!contextCheck.valid) {
      eventTracker.failEvent(contextCheckEventId, 'Context exceeds model limit');
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
    
    eventTracker.completeEvent(contextCheckEventId, {
      totalTokens: contextCheck.totalTokens,
      limit: contextCheck.limit,
      usage: contextCheck.usage
    });

    // Track prompt building
    const promptBuildEventId = eventTracker.startEvent(
      ProcessingEventType.PROMPT_BUILDING,
      'Build complete prompt with document and query'
    );
    
    const client = getOpenRAGClient(DirectPipelineError);
    const fullMessage = buildHybridPrompt(sanitizedContent, sanitizedQuery);
    
    eventTracker.completeEvent(promptBuildEventId, {
      messageLength: fullMessage.length
    });

    // Fetch filter configuration if filterId is provided
    let filterLimit = 0;
    let filterScoreThreshold = 0.99;
    
    if (filterId) {
      try {
        console.log('[Direct Pipeline Query] Fetching filter configuration for ID:', filterId);
        const filter = await client.knowledgeFilters.get(filterId);
        
        if (filter && filter.queryData) {
          // Use filter's configuration if available
          filterLimit = filter.queryData.limit ?? 0;
          filterScoreThreshold = filter.queryData.scoreThreshold ?? 0.99;
          
          console.log('[Direct Pipeline Query] Filter configuration applied:');
          console.log('  - Filter name:', filter.name);
          console.log('  - Limit:', filterLimit);
          console.log('  - Score threshold:', filterScoreThreshold);
          console.log('  - Data sources:', filter.queryData.filters?.data_sources);
        } else {
          console.log('[Direct Pipeline Query] Filter found but no queryData, using defaults');
        }
      } catch (error) {
        console.warn('[Direct Pipeline Query] Failed to fetch filter configuration:', error);
        console.log('[Direct Pipeline Query] Using default values: limit=0, scoreThreshold=0.99');
      }
    } else {
      console.log('[Direct Pipeline Query] No filterId provided, using defaults');
    }

    // Log the full message being sent to LLM with token estimation
    const estimatedInputTokens = estimateTokens(fullMessage);
    console.log('[Hybrid Pipeline Query] Full message length:', fullMessage.length, 'characters');
    console.log('[Hybrid Pipeline Query] Estimated input tokens:', estimatedInputTokens.toLocaleString());
    console.log('[Hybrid Pipeline Query] Full message preview (first 1000 chars):',
      fullMessage.substring(0, 1000));
    console.log('[Hybrid Pipeline Query] Sending to OpenRAG with model:', config.model);
    console.log('[Hybrid Pipeline Query] Filter configuration:', {
      filterId: filterId || 'none',
      limit: filterLimit,
      scoreThreshold: filterScoreThreshold
    });

    // Track API call
    const generationStartTime = performance.now();
    const apiCallEventId = eventTracker.startEvent(
      ProcessingEventType.API_CALL,
      'Call OpenRAG API with full document context and filter',
      {
        model: config.model,
        filterId: filterId || 'none',
        estimatedInputTokens,
        messageLength: fullMessage.length
      }
    );
    
    let responseData: ChatResponse;
    try {
      // Use filter configuration values and pass filterId for hybrid search
      responseData = await client.chat.create({
        message: fullMessage,
        limit: filterLimit,
        scoreThreshold: filterScoreThreshold,
        filterId: filterId
      });
      console.log('[Hybrid Pipeline Query] ✅ OpenRAG response received');
      
      eventTracker.completeEvent(apiCallEventId, {
        responseLength: responseData.response?.length || 0
      });
    } catch (error) {
      console.error('[Hybrid Pipeline Query] ❌ OpenRAG call failed:', error);
      console.error('[Hybrid Pipeline Query] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        estimatedInputTokens,
        messageLength: fullMessage.length,
        model: config.model
      });
      eventTracker.failEvent(apiCallEventId, error instanceof Error ? error.message : 'Unknown error');
      throw handleOpenRAGError(error, DirectPipelineError);
    }

    const generationEndTime = performance.now();
    const generationTime = Math.round(generationEndTime - generationStartTime);

    const answer = responseData.response || '';

    // Track token estimation
    const tokenEstimationEventId = eventTracker.startEvent(
      ProcessingEventType.TOKEN_ESTIMATION,
      'Estimate token usage for input and output'
    );
    
    const inputTokens = estimateTokens(fullMessage);
    const outputTokens = estimateTokens(answer);
    const systemPromptTokens = estimateTokens(SYSTEM_PROMPT);
    const queryTokens = estimateTokens(sanitizedQuery);
    const documentTokens = inputTokens - systemPromptTokens - queryTokens;
    
    eventTracker.completeEvent(tokenEstimationEventId, {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    });
    
    console.log('[Direct Pipeline Query] ✅ Token count calculated on ACTUAL message sent to API');
    console.log('[Direct Pipeline Query] Input tokens (actual):', inputTokens);
    console.log('[Direct Pipeline Query] Message character count:', fullMessage.length);

    const contextWindowSize = getContextWindowSize(config.model);

    // Track metrics calculation
    const metricsCalcEventId = eventTracker.startEvent(
      ProcessingEventType.METRICS_CALCULATION,
      'Calculate performance metrics and breakdowns'
    );
    
    const metrics = calculateMetrics(
      generationTime,
      inputTokens,
      outputTokens,
      contextWindowSize,
      config.model
    );

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
    
    eventTracker.completeEvent(metricsCalcEventId, {
      cost: metrics.cost,
      totalTokens: metrics.totalTokens
    });

    return {
      answer,
      metrics: {
        generationTime: metrics.generationTime,
        tokens: metrics.totalTokens,
        cost: metrics.cost,
        contextWindowUsage: metrics.contextWindowUsage,
        breakdown
      },
      processingEvents: eventTracker.getEvents()
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