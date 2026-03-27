/**
 * Shared Pipeline Utilities
 *
 * Common functions used across RAG, Direct, and Ollama pipelines.
 * Includes OpenRAG client management, error handling, and input validation
 * following OWASP security standards.
 */

import {
  OpenRAGClient,
  OpenRAGError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError
} from 'openrag-sdk';

/**
 * Base error interface for pipeline errors
 */
interface PipelineError extends Error {
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Constructor type for pipeline errors
 */
type PipelineErrorConstructor = new (
  message: string,
  code: string,
  details?: Record<string, unknown>
) => PipelineError;

/**
 * OpenRAG client instance
 * Configured via OPENRAG_URL and OPENRAG_API_KEY environment variables
 */
let openragClient: OpenRAGClient | null = null;

/**
 * Get or create OpenRAG client instance
 * 
 * @param ErrorClass - The error class to throw if configuration is missing
 * @returns Configured OpenRAG client
 * @throws {PipelineError} If environment variables are not configured
 */
export function getOpenRAGClient(
  ErrorClass: PipelineErrorConstructor
): OpenRAGClient {
  if (!openragClient) {
    // Validate environment variables
    if (!process.env.OPENRAG_API_KEY) {
      throw new ErrorClass(
        'OPENRAG_API_KEY environment variable is not set',
        'MISSING_API_KEY'
      );
    }
    if (!process.env.OPENRAG_URL) {
      throw new ErrorClass(
        'OPENRAG_URL environment variable is not set',
        'MISSING_URL'
      );
    }

    openragClient = new OpenRAGClient({
      apiKey: process.env.OPENRAG_API_KEY,
      baseUrl: process.env.OPENRAG_URL,
      timeout: 180000, // 3 minutes timeout to prevent premature aborts
    });
  }
  return openragClient;
}

/**
 * Transform OpenRAG SDK errors into pipeline-specific errors
 * 
 * @param error - The error to transform
 * @param ErrorClass - The error class to instantiate
 * @returns Pipeline-specific error instance
 */
export function handleOpenRAGError(
  error: unknown,
  ErrorClass: PipelineErrorConstructor
): PipelineError {
  // Check for network/fetch errors first
  if (error instanceof Error) {
    const errorAny = error as any;
    
    // Check for fetch/network failures
    if (error.message?.includes('fetch failed') ||
        errorAny?.code === 'ECONNREFUSED' ||
        errorAny?.code === 'ENOTFOUND' ||
        errorAny?.code === 'ETIMEDOUT' ||
        errorAny?.cause?.code === 'ECONNREFUSED' ||
        errorAny?.cause?.code === 'ENOTFOUND' ||
        errorAny?.cause?.code === 'ETIMEDOUT') {
      
      const errorCode = errorAny?.code || errorAny?.cause?.code || 'NETWORK_ERROR';
      let suggestion = 'Check that OPENRAG_URL is correct and the OpenRAG server is running';
      
      if (errorCode === 'ECONNREFUSED') {
        suggestion = 'The OpenRAG server refused the connection. Ensure it is running and accessible.';
      } else if (errorCode === 'ENOTFOUND') {
        suggestion = 'The OpenRAG server hostname could not be resolved. Check your OPENRAG_URL configuration.';
      } else if (errorCode === 'ETIMEDOUT') {
        suggestion = 'The connection to OpenRAG server timed out. Check network connectivity and server status.';
      }
      
      return new ErrorClass(
        `Cannot connect to OpenRAG backend at ${process.env.OPENRAG_URL}. ${suggestion}`,
        'NETWORK_ERROR',
        {
          url: process.env.OPENRAG_URL,
          errorCode,
          errorMessage: error.message,
          suggestion
        }
      );
    }
  }
  
  if (error instanceof AuthenticationError) {
    return new ErrorClass(
      'Authentication failed. Please check your OPENRAG_API_KEY.',
      'AUTHENTICATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof NotFoundError) {
    return new ErrorClass(
      'Resource not found in OpenRAG.',
      'NOT_FOUND_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ValidationError) {
    return new ErrorClass(
      'Invalid request to OpenRAG.',
      'VALIDATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof RateLimitError) {
    return new ErrorClass(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ServerError) {
    // ServerError (HTTP 500) often indicates context window/token limit exceeded
    // Capture detailed error information for debugging
    const errorAny = error as any;
    const statusCode = errorAny?.statusCode || 500;
    const errorBody = errorAny?.body || errorAny?.response?.data || {};
    const errorDetail = errorBody?.detail || errorBody?.error || error.message;
    
    // Check if this is a token/context limit error
    const isTokenLimitError =
      errorDetail?.toLowerCase().includes('token') ||
      errorDetail?.toLowerCase().includes('context') ||
      errorDetail?.toLowerCase().includes('length') ||
      errorDetail?.toLowerCase().includes('maximum') ||
      errorDetail?.toLowerCase().includes('limit');
    
    let userMessage = 'OpenRAG server error. Please try again later.';
    let errorCode = 'SERVER_ERROR';
    
    if (isTokenLimitError) {
      userMessage = 'Request exceeds model context window or token limit. Try reducing document size or using a model with larger context window.';
      errorCode = 'TOKEN_LIMIT_ERROR';
    }
    
    // Log detailed error for debugging
    console.error('[OpenRAG ServerError Details]', {
      statusCode,
      message: error.message,
      detail: errorDetail,
      body: errorBody,
      isTokenLimitError
    });
    
    return new ErrorClass(
      userMessage,
      errorCode,
      {
        originalError: error.message,
        statusCode,
        detail: errorDetail,
        isTokenLimitError
      }
    );
  }
  
  if (error instanceof OpenRAGError) {
    return new ErrorClass(
      `OpenRAG error: ${error.message}`,
      'OPENRAG_ERROR',
      { originalError: error.message, statusCode: error.statusCode }
    );
  }
  
  if (error instanceof Error) {
    return new ErrorClass(
      `Unexpected error: ${error.message}`,
      'UNEXPECTED_ERROR',
      { originalError: error.message }
    );
  }
  
  return new ErrorClass(
    'Unknown error occurred',
    'UNKNOWN_ERROR'
  );
}

/**
 * Sanitize input string by removing null bytes and control characters
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
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
 * Validate document ID format and security constraints
 * 
 * @param documentId - Document ID to validate
 * @param ErrorClass - The error class to throw on validation failure
 * @throws {PipelineError} If document ID is invalid
 */
export function validateDocumentId(
  documentId: string,
  ErrorClass: PipelineErrorConstructor
): void {
  if (!documentId || typeof documentId !== 'string') {
    throw new ErrorClass(
      'Document ID is required',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Prevent path traversal and injection
  if (documentId.includes('..') || documentId.includes('/') || documentId.includes('\\')) {
    throw new ErrorClass(
      'Document ID contains invalid characters',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Limit length to prevent DoS
  if (documentId.length > 255) {
    throw new ErrorClass(
      'Document ID exceeds maximum length',
      'INVALID_DOCUMENT_ID',
      { documentId, maxLength: 255 }
    );
  }
}

/**
 * Validate query string format and security constraints
 * 
 * @param query - Query to validate
 * @param ErrorClass - The error class to throw on validation failure
 * @throws {PipelineError} If query is invalid
 */
export function validateQuery(
  query: string,
  ErrorClass: PipelineErrorConstructor
): void {
  if (!query || typeof query !== 'string') {
    throw new ErrorClass(
      'Query is required',
      'INVALID_QUERY',
      { query }
    );
  }

  const sanitized = sanitizeInput(query);
  if (sanitized.length === 0) {
    throw new ErrorClass(
      'Query cannot be empty after sanitization',
      'INVALID_QUERY',
      { query }
    );
  }

  // Limit query length to prevent DoS
  if (sanitized.length > 10000) {
    throw new ErrorClass(
      'Query exceeds maximum length',
      'INVALID_QUERY',
      { query, maxLength: 10000 }
    );
  }
}

/**
 * Validate metrics input values
 *
 * Common validation logic for calculateMetrics functions across all pipelines.
 * Ensures time and token values are non-negative.
 *
 * @param params - Object containing values to validate
 * @param params.times - Time values to validate (e.g., retrievalTime, generationTime)
 * @param params.tokens - Token counts to validate (e.g., inputTokens, outputTokens)
 * @param ErrorClass - The error class to throw on validation failure
 * @throws {PipelineError} If any value is negative
 */
export function validateMetricsInput(
  params: {
    times?: Record<string, number>;
    tokens?: Record<string, number>;
  },
  ErrorClass: PipelineErrorConstructor
): void {
  // Validate time values
  if (params.times) {
    const negativeTime = Object.entries(params.times).find(([_, value]) => value < 0);
    if (negativeTime) {
      const [key, value] = negativeTime;
      throw new ErrorClass(
        `${key} cannot be negative`,
        'INVALID_METRICS',
        { [key]: value, ...params.times }
      );
    }
  }

  // Validate token counts
  if (params.tokens) {
    const negativeTokens = Object.entries(params.tokens).find(([_, value]) => value < 0);
    if (negativeTokens) {
      throw new ErrorClass(
        'Token counts cannot be negative',
        'INVALID_METRICS',
        params.tokens
      );
    }
  }
}

// Made with Bob
