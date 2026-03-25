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
    return new ErrorClass(
      'OpenRAG server error. Please try again later.',
      'SERVER_ERROR',
      { originalError: error.message }
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

// Made with Bob
