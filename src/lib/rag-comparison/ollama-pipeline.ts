/**
 * Ollama Pipeline Implementation
 *
 * Implements document loading and query execution using Ollama's local LLM API.
 * Provides full document context processing similar to direct pipeline but with
 * local models. Includes comprehensive metrics tracking and OWASP security compliance.
 */

import { OllamaClient } from './ollama-client';
import { OllamaConfig, OllamaResult, OllamaPipelineError } from '@/types/ollama';
import type { DocumentMetadata } from '@/types/rag-comparison';
import { getDocument, appendToDocument } from './document-storage';
import { estimateTokens } from '@/lib/utils/token-estimator';
import { getOllamaModelConfig } from '@/lib/constants/ollama-models';
import { OLLAMA_CONFIG } from '@/lib/env';
import {
  calculateTimingBreakdown,
  calculateTokenBreakdown,
  calculateCostBreakdown,
  calculateContextWindowBreakdown
} from './metrics-calculator';

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
  withinLimit: boolean;
  /** Total tokens in context */
  totalTokens: number;
  /** Model's context window limit */
  contextWindow: number;
  /** Percentage of context window used */
  usage: number;
  /** Warning messages */
  warnings: string[];
}

/**
 * System prompt for Ollama queries
 */
const OLLAMA_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided document.

Instructions:
- Read and understand the entire document provided below
- Answer the question using ONLY the information from the document
- If the document doesn't contain enough information to answer the question, say so clearly
- Be thorough and accurate in your response
- Cite specific parts of the document when relevant
- Do not make up information or use knowledge outside the provided document`;

/**
 * Ollama client instance
 */
let ollamaClient: OllamaClient | null = null;

/**
 * Get or create Ollama client instance
 * @throws {OllamaPipelineError} If Ollama configuration is invalid
 */
function getOllamaClient(): OllamaClient {
  if (!ollamaClient) {
    if (!OLLAMA_CONFIG.baseUrl) {
      throw new OllamaPipelineError(
        'Ollama base URL is not configured',
        'MISSING_BASE_URL'
      );
    }

    ollamaClient = new OllamaClient({
      baseUrl: OLLAMA_CONFIG.baseUrl,
      timeout: 120000,
      maxRetries: 3
    });
  }
  return ollamaClient;
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
 * @throws {OllamaPipelineError} If document ID is invalid
 */
function validateDocumentId(documentId: string): void {
  if (!documentId || typeof documentId !== 'string') {
    throw new OllamaPipelineError(
      'Document ID is required',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Prevent path traversal and injection
  if (documentId.includes('..') || documentId.includes('/') || documentId.includes('\\')) {
    throw new OllamaPipelineError(
      'Document ID contains invalid characters',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Limit length to prevent DoS
  if (documentId.length > 255) {
    throw new OllamaPipelineError(
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
 * @throws {OllamaPipelineError} If query is invalid
 */
function validateQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new OllamaPipelineError(
      'Query is required',
      'INVALID_QUERY',
      { query }
    );
  }

  const sanitized = sanitizeInput(query);
  if (sanitized.length === 0) {
    throw new OllamaPipelineError(
      'Query cannot be empty after sanitization',
      'INVALID_QUERY',
      { query }
    );
  }

  // Limit query length to prevent DoS
  if (sanitized.length > 10000) {
    throw new OllamaPipelineError(
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
 * @throws {OllamaPipelineError} If content is invalid
 */
function validateContent(content: string): void {
  if (!content || typeof content !== 'string') {
    throw new OllamaPipelineError(
      'Document content is required',
      'INVALID_CONTENT',
      { content }
    );
  }

  const sanitized = sanitizeInput(content);
  if (sanitized.length === 0) {
    throw new OllamaPipelineError(
      'Document content cannot be empty after sanitization',
      'INVALID_CONTENT',
      { content }
    );
  }

  // Limit content length to prevent DoS (150MB)
  if (sanitized.length > 150 * 1024 * 1024) {
    throw new OllamaPipelineError(
      'Document content exceeds maximum size',
      'INVALID_CONTENT',
      { contentLength: sanitized.length, maxLength: 150 * 1024 * 1024 }
    );
  }
}

/**
 * Validates image data
 * 
 * @param images - Array of base64 image strings
 * @throws {OllamaPipelineError} If image data is invalid
 */
function validateImages(images: string[]): void {
  if (!Array.isArray(images)) {
    throw new OllamaPipelineError(
      'Images must be an array',
      'INVALID_IMAGES',
      { images: typeof images }
    );
  }

  if (images.length > 10) {
    throw new OllamaPipelineError(
      'Too many images (maximum 10)',
      'INVALID_IMAGES',
      { count: images.length, maxCount: 10 }
    );
  }

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (typeof image !== 'string') {
      throw new OllamaPipelineError(
        `Image at index ${i} is not a string`,
        'INVALID_IMAGES',
        { index: i, type: typeof image }
      );
    }

    // Basic base64 validation
    if (!image.match(/^[A-Za-z0-9+/=]+$/)) {
      throw new OllamaPipelineError(
        `Image at index ${i} is not valid base64`,
        'INVALID_IMAGES',
        { index: i }
      );
    }

    // Limit image size (10MB per image)
    if (image.length > 10 * 1024 * 1024) {
      throw new OllamaPipelineError(
        `Image at index ${i} exceeds maximum size (10MB)`,
        'INVALID_IMAGES',
        { index: i, size: image.length }
      );
    }
  }
}

/**
 * Generates warning messages based on token count and context limit
 * 
 * @param tokenCount - Number of tokens in document
 * @param contextLimit - Model's context window limit
 * @returns Array of warning messages
 */
function generateWarnings(tokenCount: number, contextLimit: number): string[] {
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
      `Consider using a model with a larger context window.`
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
 * Builds the prompt for Ollama
 * 
 * Assembles the full context including system prompt, document content,
 * and user query in the proper format for the LLM.
 * 
 * @param content - Full document content
 * @param query - User query
 * @returns Complete prompt string
 */
export function buildOllamaPrompt(content: string, query: string): string {
  const sanitizedContent = sanitizeInput(content);
  const sanitizedQuery = sanitizeInput(query);
  
  return `${OLLAMA_SYSTEM_PROMPT}

=== DOCUMENT START ===

${sanitizedContent}

=== DOCUMENT END ===

User Question: ${sanitizedQuery}

Please provide a clear and accurate answer based on the document above.`;
}

/**
 * Checks if content fits within model's context window limit
 * 
 * @param content - Document content
 * @param query - User query
 * @param model - Model identifier
 * @returns Context validation result
 */
export function checkContextLimit(
  content: string,
  query: string,
  model: string
): ContextCheck {
  const modelConfig = getOllamaModelConfig(model);
  
  // Use sensible defaults for unknown models instead of throwing
  const contextWindow = modelConfig?.contextWindow || 128000; // Default to 128K
  
  const fullPrompt = buildOllamaPrompt(content, query);
  const totalTokens = estimateTokens(fullPrompt);
  const usage = (totalTokens / contextWindow) * 100;
  const withinLimit = totalTokens <= contextWindow;
  
  // Generate warnings
  const warnings: string[] = [];
  
  // Add warning for unknown model
  if (!modelConfig) {
    warnings.push(
      `Model "${model}" not in known configurations. Using default context window of ${contextWindow.toLocaleString()} tokens.`
    );
  }
  
  // Add context usage warnings
  warnings.push(...generateWarnings(totalTokens, contextWindow));

  return {
    withinLimit,
    totalTokens,
    contextWindow,
    usage,
    warnings
  };
}

/**
 * Calculates comprehensive metrics for Ollama queries
 * 
 * @param generationTime - Time taken for generation in milliseconds
 * @param inputTokens - Number of input tokens used
 * @param outputTokens - Number of output tokens generated
 * @param model - Model identifier
 * @returns Metrics object with detailed breakdown
 */
export function calculateMetrics(
  generationTime: number,
  inputTokens: number,
  outputTokens: number,
  model: string
): {
  totalTime: number;
  generationTime: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  contextWindowUsage: number;
} {
  // Validate inputs
  if (generationTime < 0) {
    throw new OllamaPipelineError(
      'Generation time cannot be negative',
      'INVALID_METRICS',
      { generationTime }
    );
  }

  if (inputTokens < 0 || outputTokens < 0) {
    throw new OllamaPipelineError(
      'Token counts cannot be negative',
      'INVALID_METRICS',
      { inputTokens, outputTokens }
    );
  }

  const modelConfig = getOllamaModelConfig(model);
  const contextWindow = modelConfig?.contextWindow || 128000; // Default to 128K

  const totalTime = generationTime;
  const totalTokens = inputTokens + outputTokens;
  const cost = 0; // Ollama is free (local)
  const contextWindowUsage = (inputTokens / contextWindow) * 100;

  return {
    totalTime,
    generationTime,
    inputTokens,
    outputTokens,
    totalTokens,
    cost,
    contextWindowUsage: Math.min(contextWindowUsage, 100)
  };
}

/**
 * Loads a document into memory for Ollama pipeline processing
 *
 * @param content - Full document content
 * @param documentId - Unique identifier for the document
 * @param metadata - Document metadata
 * @param isMultiFile - Whether this is part of a multi-file upload
 * @param filename - Filename for separator in multi-file uploads
 * @returns Promise resolving to load result with timing and validation info
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

    // Sanitize and normalize content
    const sanitizedContent = sanitizeInput(content);
    const normalizedContent = sanitizedContent.trim().replace(/\s+/g, ' ');
    
    // Estimate tokens
    const tokenCount = estimateTokens(normalizedContent);

    // Handle multi-file uploads
    if (isMultiFile) {
      const separator = filename
        ? `\n\n=== DOCUMENT: ${filename} ===\n\n`
        : '\n\n=== NEXT DOCUMENT ===\n\n';
      
      const existingDoc = getDocument(documentId);
      
      if (existingDoc) {
        appendToDocument(documentId, normalizedContent, metadata, undefined, separator);
        console.log(`[Ollama] Appended ${filename || 'document'} to batch ${documentId}`);
      } else {
        const contentWithHeader = filename
          ? `=== DOCUMENT: ${filename} ===\n\n${normalizedContent}`
          : normalizedContent;
        appendToDocument(documentId, contentWithHeader, metadata);
        console.log(`[Ollama] Created batch ${documentId} with ${filename || 'document'}`);
      }
      
      // Get accumulated document
      const accumulatedDoc = getDocument(documentId);
      const normalizedAccumulatedContent = accumulatedDoc
        ? accumulatedDoc.content.trim().replace(/\s+/g, ' ')
        : normalizedContent;
      const totalTokenCount = accumulatedDoc
        ? estimateTokens(normalizedAccumulatedContent)
        : tokenCount;
      
      // Use a default model for context window check
      const defaultModel = OLLAMA_CONFIG.defaultModel || 'llama3.2:3b';
      const modelConfig = getOllamaModelConfig(defaultModel);
      const referenceLimit = modelConfig?.contextWindow || 128000; // Default to 128K
      
      const withinLimit = totalTokenCount < referenceLimit * 0.9;
      const warnings = generateWarnings(totalTokenCount, referenceLimit);

      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);

      return {
        success: true,
        documentId,
        tokenCount: totalTokenCount,
        loadTime,
        withinLimit,
        warnings
      };
    }

    // Single file upload
    const defaultModel = OLLAMA_CONFIG.defaultModel || 'llama3.2:3b';
    const modelConfig = getOllamaModelConfig(defaultModel);
    const referenceLimit = modelConfig?.contextWindow || 128000; // Default to 128K
    
    const withinLimit = tokenCount < referenceLimit * 0.9;
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

    if (error instanceof OllamaPipelineError) {
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
 * Executes a query using Ollama pipeline
 * 
 * @param documentId - Document identifier
 * @param content - Full document content
 * @param query - User query string
 * @param config - Ollama configuration
 * @param images - Optional array of base64-encoded images for multimodal models
 * @returns Promise resolving to Ollama result with answer and metrics
 * @throws {OllamaPipelineError} If query execution fails
 */
export async function query(
  documentId: string,
  content: string,
  query: string,
  config: OllamaConfig,
  images?: string[]
): Promise<OllamaResult> {
  try {
    // Validate inputs
    validateDocumentId(documentId);
    validateContent(content);
    validateQuery(query);

    if (!config || typeof config !== 'object') {
      throw new OllamaPipelineError(
        'Ollama configuration is required',
        'INVALID_CONFIG',
        { config }
      );
    }

    if (images && images.length > 0) {
      validateImages(images);
    }

    const sanitizedContent = sanitizeInput(content);
    const sanitizedQuery = sanitizeInput(query);
    
    console.log('\n[Ollama Pipeline Query] Starting query execution');
    console.log('[Ollama Pipeline Query] Document ID:', documentId);
    console.log('[Ollama Pipeline Query] Content length:', content.length);
    console.log('[Ollama Pipeline Query] Model:', config.model);

    // Validate context doesn't exceed model's limit
    const contextCheck = checkContextLimit(sanitizedContent, sanitizedQuery, config.model);
    
    // Log warnings but don't fail for unknown models
    if (contextCheck.warnings.length > 0) {
      console.warn('[Ollama Pipeline Query] Warnings:', contextCheck.warnings);
    }
    
    // Only fail if truly over limit
    if (!contextCheck.withinLimit) {
      throw new OllamaPipelineError(
        `Content exceeds model context window: ${contextCheck.totalTokens.toLocaleString()} tokens > ${contextCheck.contextWindow.toLocaleString()} tokens`,
        'CONTEXT_LIMIT_EXCEEDED',
        {
          totalTokens: contextCheck.totalTokens,
          contextWindow: contextCheck.contextWindow,
          usage: contextCheck.usage
        }
      );
    }

    // Build full prompt
    const fullPrompt = buildOllamaPrompt(sanitizedContent, sanitizedQuery);
    
    console.log('[Ollama Pipeline Query] Full prompt length:', fullPrompt.length);
    console.log('[Ollama Pipeline Query] Estimated input tokens:', estimateTokens(fullPrompt));

    // Track generation time
    const generationStartTime = performance.now();

    // Get Ollama client
    const client = getOllamaClient();

    // Call Ollama with full context
    const response = await client.generate({
      model: config.model,
      prompt: fullPrompt,
      images: images,
      options: {
        temperature: config.temperature,
        top_p: config.top_p,
        top_k: config.top_k,
        num_predict: config.maxTokens
      }
    });

    const generationEndTime = performance.now();
    const generationTime = Math.round(generationEndTime - generationStartTime);

    console.log('[Ollama Pipeline Query] ✅ Response received');
    console.log('[Ollama Pipeline Query] Generation time:', generationTime, 'ms');

    // Extract answer
    const answer = response.response || '';

    // Calculate token usage
    // Use actual tokens from Ollama if available, otherwise estimate
    const inputTokens = response.prompt_eval_count || estimateTokens(fullPrompt);
    const outputTokens = response.eval_count || estimateTokens(answer);
    
    console.log('[Ollama Pipeline Query] Input tokens:', inputTokens);
    console.log('[Ollama Pipeline Query] Output tokens:', outputTokens);

    // Calculate component tokens for breakdown
    const systemPromptTokens = estimateTokens(OLLAMA_SYSTEM_PROMPT);
    const queryTokens = estimateTokens(sanitizedQuery);
    const documentTokens = inputTokens - systemPromptTokens - queryTokens;

    // Calculate metrics
    const metrics = calculateMetrics(
      generationTime,
      inputTokens,
      outputTokens,
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
      false
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
          'Ollama query uses full document context without retrieval',
          'Token counts from Ollama API when available, estimated otherwise'
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
    if (error instanceof OllamaPipelineError) {
      throw error;
    }

    throw new OllamaPipelineError(
      'Ollama query execution failed',
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