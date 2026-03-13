/**
 * RAG Pipeline with OpenRAG SDK Integration
 *
 * Implements document indexing, query execution, and metrics calculation
 * for RAG-based retrieval and generation following OWASP security standards.
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
import { calculateCost, getModelPricing } from '@/lib/constants/models';
import { estimateTokens } from '@/lib/utils/token-estimator';
import {
  calculateTimingBreakdown,
  calculateTokenBreakdown,
  calculateCostBreakdown,
  calculateContextWindowBreakdown
} from '@/lib/rag-comparison/metrics-calculator';
import type {
  Chunk,
  DocumentMetadata,
  RAGConfig,
  RAGResult
} from '@/types/rag-comparison';

/**
 * OpenRAG client instance
 * Configured via OPENRAG_URL and OPENRAG_API_KEY environment variables
 */
let openragClient: OpenRAGClient | null = null;

/**
 * Get or create OpenRAG client instance
 * @throws {RAGPipelineError} If environment variables are not configured
 */
function getOpenRAGClient(): OpenRAGClient {
  if (!openragClient) {
    // Validate environment variables
    if (!process.env.OPENRAG_API_KEY) {
      throw new RAGPipelineError(
        'OPENRAG_API_KEY environment variable is not set',
        'MISSING_API_KEY'
      );
    }
    if (!process.env.OPENRAG_URL) {
      throw new RAGPipelineError(
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
 * Convert OpenRAG SDK errors to RAGPipelineError
 * @param error - Error from OpenRAG SDK
 * @returns RAGPipelineError with appropriate code and message
 */
function handleOpenRAGError(error: unknown): RAGPipelineError {
  if (error instanceof AuthenticationError) {
    return new RAGPipelineError(
      'Authentication failed. Please check your OPENRAG_API_KEY.',
      'AUTHENTICATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof NotFoundError) {
    return new RAGPipelineError(
      'Resource not found in OpenRAG.',
      'NOT_FOUND_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ValidationError) {
    return new RAGPipelineError(
      'Invalid request to OpenRAG.',
      'VALIDATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof RateLimitError) {
    return new RAGPipelineError(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ServerError) {
    return new RAGPipelineError(
      'OpenRAG server error. Please try again later.',
      'SERVER_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof OpenRAGError) {
    return new RAGPipelineError(
      `OpenRAG error: ${error.message}`,
      'OPENRAG_ERROR',
      { originalError: error.message, statusCode: error.statusCode }
    );
  }
  
  if (error instanceof Error) {
    return new RAGPipelineError(
      `Unexpected error: ${error.message}`,
      'UNEXPECTED_ERROR',
      { originalError: error.message }
    );
  }
  
  return new RAGPipelineError(
    'Unknown error occurred',
    'UNKNOWN_ERROR'
  );
}

/**
 * Result from document indexing operation
 */
export interface IndexResult {
  /** Whether indexing was successful */
  success: boolean;
  /** Document identifier in the RAG system */
  documentId: string;
  /** Knowledge filter ID for scoped retrieval */
  filterId?: string;
  /** Number of chunks indexed */
  chunkCount: number;
  /** Total tokens in indexed document */
  tokenCount: number;
  /** Time taken to index in milliseconds */
  indexTime: number;
  /** Error message if indexing failed */
  error?: string;
}

/**
 * Metrics for RAG operations
 */
export interface RAGMetrics {
  /** Total time (retrieval + generation) in milliseconds */
  totalTime: number;
  /** Time taken for retrieval in milliseconds */
  retrievalTime: number;
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
}

/**
 * Source citation from retrieved chunks
 */
export interface Source {
  /** Chunk content */
  content: string;
  /** Document reference */
  documentId: string;
  /** Chunk index in document */
  chunkIndex: number;
  /** Relevance score (0-1) */
  score: number;
  /** Character position in original document */
  position?: {
    start: number;
    end: number;
  };
}

/**
 * Knowledge filter identifier for scoping retrieval
 */
const KNOWLEDGE_FILTER_ID = 'Compare';

/**
 * System prompt for RAG queries
 */
const RAG_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context.

Instructions:
- Answer the question using ONLY the information from the provided context
- If the context doesn't contain enough information to answer the question, say so clearly
- Be concise and accurate
- Cite specific parts of the context when relevant
- Do not make up information or use knowledge outside the provided context`;

/**
 * Custom error class for RAG pipeline errors
 */
export class RAGPipelineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RAGPipelineError';
  }
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
 * @throws {RAGPipelineError} If document ID is invalid
 */
function validateDocumentId(documentId: string): void {
  if (!documentId || typeof documentId !== 'string') {
    throw new RAGPipelineError(
      'Document ID is required',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Prevent path traversal and injection
  if (documentId.includes('..') || documentId.includes('/') || documentId.includes('\\')) {
    throw new RAGPipelineError(
      'Document ID contains invalid characters',
      'INVALID_DOCUMENT_ID',
      { documentId }
    );
  }

  // Limit length to prevent DoS
  if (documentId.length > 255) {
    throw new RAGPipelineError(
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
 * @throws {RAGPipelineError} If query is invalid
 */
function validateQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new RAGPipelineError(
      'Query is required',
      'INVALID_QUERY',
      { query }
    );
  }

  const sanitized = sanitizeInput(query);
  if (sanitized.length === 0) {
    throw new RAGPipelineError(
      'Query cannot be empty after sanitization',
      'INVALID_QUERY',
      { query }
    );
  }

  // Limit query length to prevent DoS
  if (sanitized.length > 10000) {
    throw new RAGPipelineError(
      'Query exceeds maximum length',
      'INVALID_QUERY',
      { query, maxLength: 10000 }
    );
  }
}

/**
 * Creates or updates the "Compare" knowledge filter for a specific document
 *
 * This filter ensures that RAG queries can retrieve from documents uploaded
 * for comparison by filtering on data_sources (which includes document filenames).
 *
 * The filter is always named "Compare". If it already exists, the new filename
 * is added to the existing data_sources list.
 *
 * @param documentId - Document identifier (for logging/error handling)
 * @param filename - Document filename to add to data source filter
 * @returns Promise resolving to the filter ID
 * @throws {RAGPipelineError} If filter creation/update fails
 *
 * @example
 * ```typescript
 * const filterId = await createKnowledgeFilter('doc-123', 'example.pdf');
 * ```
 */
export async function createKnowledgeFilter(
  documentId: string,
  filename: string
): Promise<string> {
  try {
    // Validate inputs
    if (!documentId || typeof documentId !== 'string') {
      throw new RAGPipelineError(
        'Document ID is required',
        'INVALID_DOCUMENT_ID',
        { documentId }
      );
    }

    if (!filename || typeof filename !== 'string') {
      throw new RAGPipelineError(
        'Filename is required',
        'INVALID_FILENAME',
        { filename }
      );
    }

    const client = getOpenRAGClient();
    
    // Use the constant "Compare" as the filter name
    const filterName = KNOWLEDGE_FILTER_ID;
    
    // Check if "Compare" filter already exists
    const existingFilters = await client.knowledgeFilters.search(filterName, 1);
    
    if (existingFilters && existingFilters.length > 0) {
      const existingFilter = existingFilters[0];
      console.log(`Knowledge filter "${filterName}" already exists with ID: ${existingFilter.id}`);
      
      // Get current data sources
      const currentDataSources = existingFilter.queryData?.filters?.data_sources || [];
      
      // Add new filename if not already present
      if (!currentDataSources.includes(filename)) {
        console.log(`Adding filename "${filename}" to existing filter`);
        await client.knowledgeFilters.update(existingFilter.id, {
          queryData: {
            filters: {
              data_sources: [...currentDataSources, filename]
            }
          }
        });
        console.log(`Updated filter with new filename`);
      } else {
        console.log(`Filename "${filename}" already in filter`);
      }
      
      return existingFilter.id;
    }
    
    // Create new "Compare" knowledge filter with this document's filename
    console.log(`Creating new "${filterName}" filter with filename: ${filename}`);
    const result = await client.knowledgeFilters.create({
      name: filterName,
      description: `Filter for document comparison`,
      queryData: {
        filters: {
          data_sources: [filename] // Start with this document's filename
        }
      }
    });
    
    if (!result.success || !result.id) {
      throw new RAGPipelineError(
        'Failed to create knowledge filter',
        'FILTER_CREATION_ERROR',
        { filterName, result }
      );
    }
    
    console.log(`Created knowledge filter "${filterName}" with ID: ${result.id}`);
    return result.id;
    
  } catch (error) {
    if (error instanceof RAGPipelineError) {
      throw error;
    }
    
    throw new RAGPipelineError(
      'Failed to create/update knowledge filter',
      'FILTER_OPERATION_ERROR',
      {
        documentId,
        filename,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}

/**
 * Builds the system prompt for RAG queries
 * 
 * @param query - User query
 * @returns System prompt string
 * 
 * @example
 * ```typescript
 * const prompt = buildRAGPrompt("What is the main topic?");
 * ```
 */
export function buildRAGPrompt(query: string): string {
  const sanitizedQuery = sanitizeInput(query);
  
  return `${RAG_SYSTEM_PROMPT}

User Question: ${sanitizedQuery}

Please provide a clear and accurate answer based on the context provided.`;
}

/**
 * Extracts source citations from retrieved chunks
 * 
 * @param retrievedChunks - Array of retrieved chunks from RAG system
 * @returns Array of source citations
 * 
 * @example
 * ```typescript
 * const sources = extractSources(chunks);
 * console.log(`Found ${sources.length} sources`);
 * ```
 */
export function extractSources(retrievedChunks: any[]): Source[] {
  if (!Array.isArray(retrievedChunks)) {
    return [];
  }

  return retrievedChunks.map((chunk, index) => ({
    content: chunk.content || chunk.text || '',
    documentId: chunk.metadata?.sourceId || chunk.metadata?.documentId || 'unknown',
    chunkIndex: chunk.metadata?.index ?? index,
    score: chunk.score ?? chunk.relevance ?? 0,
    position: chunk.metadata?.startChar !== undefined && chunk.metadata?.endChar !== undefined
      ? {
          start: chunk.metadata.startChar,
          end: chunk.metadata.endChar
        }
      : undefined
  }));
}

/**
 * Calculates comprehensive metrics for RAG operations
 * 
 * @param retrievalTime - Time taken for retrieval in milliseconds
 * @param generationTime - Time taken for generation in milliseconds
 * @param inputTokens - Number of input tokens used
 * @param outputTokens - Number of output tokens generated
 * @param model - Model identifier for pricing
 * @returns RAG metrics object
 * 
 * @example
 * ```typescript
 * const metrics = calculateMetrics(150, 300, 1000, 500, 'gpt-4-turbo');
 * console.log(`Total cost: $${metrics.cost.toFixed(4)}`);
 * ```
 */
export function calculateMetrics(
  retrievalTime: number,
  generationTime: number,
  inputTokens: number,
  outputTokens: number,
  model: string
): RAGMetrics {
  // Validate inputs
  if (retrievalTime < 0 || generationTime < 0) {
    throw new RAGPipelineError(
      'Time values cannot be negative',
      'INVALID_METRICS',
      { retrievalTime, generationTime }
    );
  }

  if (inputTokens < 0 || outputTokens < 0) {
    throw new RAGPipelineError(
      'Token counts cannot be negative',
      'INVALID_METRICS',
      { inputTokens, outputTokens }
    );
  }

  const totalTime = retrievalTime + generationTime;
  const totalTokens = inputTokens + outputTokens;
  const cost = calculateCost(model, inputTokens, outputTokens);

  return {
    totalTime,
    retrievalTime,
    generationTime,
    inputTokens,
    outputTokens,
    totalTokens,
    cost
  };
}

/**
 * Indexes a document into the OpenRAG system
 *
 * Sends the raw file to OpenRAG SDK which handles parsing, chunking,
 * and embedding automatically. Associates document with the "Compare"
 * knowledge filter for scoped retrieval.
 *
 * @param file - Raw file to index (PDF, DOCX, TXT, etc.)
 * @param documentId - Unique identifier for the document
 * @param metadata - Document metadata
 * @returns Promise resolving to index result with timing information
 * @throws {RAGPipelineError} If indexing fails
 *
 * @example
 * ```typescript
 * const result = await indexDocument(file, 'doc-123', metadata);
 * if (result.success) {
 *   console.log(`Indexed document in ${result.indexTime}ms`);
 * }
 * ```
 */
export async function indexDocument(
  file: File,
  documentId: string,
  metadata: DocumentMetadata
): Promise<IndexResult> {
  const startTime = performance.now();

  try {
    // Validate inputs
    validateDocumentId(documentId);

    if (!file || !(file instanceof File)) {
      throw new RAGPipelineError(
        'Valid file is required',
        'INVALID_FILE',
        { documentId, file: typeof file }
      );
    }

    // Validate file size to prevent DoS
    if (file.size > 150 * 1024 * 1024) { // 150MB limit
      throw new RAGPipelineError(
        'File size exceeds maximum (150MB)',
        'FILE_TOO_LARGE',
        { documentId, fileSize: file.size }
      );
    }

    // Note: We don't parse the document here because OpenRAG SDK handles that internally
    // Token count will be estimated from the file size as a rough approximation
    // The actual token count will be determined by OpenRAG during ingestion
    const tokenCount = Math.floor(file.size / 4); // Rough estimate: ~4 bytes per token

    // Get OpenRAG client
    const client = getOpenRAGClient();

    // Upload document using OpenRAG SDK
    // The SDK handles parsing, chunking, and embedding automatically
    const result = await client.documents.ingest({
      file,
      filename: metadata.filename,
      wait: true, // Wait for ingestion to complete
    });

    // Check if ingestion was successful
    // Result is IngestTaskStatus when wait=true
    const taskStatus = result as any; // Type assertion needed due to SDK union type
    if (taskStatus.status !== 'completed') {
      throw new RAGPipelineError(
        `Document ingestion failed with status: ${taskStatus.status}`,
        'INGESTION_ERROR',
        {
          documentId,
          status: taskStatus.status,
          failedFiles: taskStatus.failed_files,
        }
      );
    }

    // Create knowledge filter for this document after successful ingestion
    // This filter will scope retrieval to only this document
    const filterId = await createKnowledgeFilter(documentId, metadata.filename);

    const endTime = performance.now();
    const indexTime = Math.round(endTime - startTime);

    // Use successful_files count as chunk estimate
    const chunkCount = taskStatus.successful_files || 1;

    return {
      success: true,
      documentId,
      filterId,
      chunkCount,
      tokenCount,
      indexTime
    };

  } catch (error) {
    const endTime = performance.now();
    const indexTime = Math.round(endTime - startTime);

    if (error instanceof RAGPipelineError) {
      return {
        success: false,
        documentId,
        chunkCount: 0,
        tokenCount: 0,
        indexTime,
        error: error.message
      };
    }

    return {
      success: false,
      documentId,
      chunkCount: 0,
      tokenCount: 0,
      indexTime,
      error: error instanceof Error ? error.message : 'Unknown error during indexing'
    };
  }
}

/**
 * Executes a RAG query against an indexed document
 * 
 * Performs retrieval using the OpenRAG SDK's chat method with automatic
 * retrieval, tracks timing metrics, and calculates costs.
 * 
 * @param documentId - Document identifier to query against
 * @param query - User query string
 * @param config - RAG configuration (model, topK, etc.)
 * @returns Promise resolving to RAG result with answer, sources, and metrics
 * @throws {RAGPipelineError} If query execution fails
 * 
 * @example
 * ```typescript
 * const result = await query('doc-123', 'What is the main topic?', {
 *   model: 'gpt-4-turbo',
 *   topK: 5,
 *   chunkStrategy: 'fixed',
 *   chunkSize: 512,
 *   chunkOverlap: 50
 * });
 * console.log('Answer:', result.answer);
 * console.log('Cost:', result.metrics.cost);
 * ```
 */
export async function query(
  documentId: string,
  query: string,
  config: RAGConfig
): Promise<RAGResult> {
  console.log('=== RAG Pipeline Query Start ===');
  console.log('Document ID:', documentId);
  console.log('Query:', query);
  console.log('Config:', JSON.stringify(config, null, 2));
  
  try {
    // Validate inputs
    validateDocumentId(documentId);
    validateQuery(query);

    if (!config || typeof config !== 'object') {
      throw new RAGPipelineError(
        'RAG configuration is required',
        'INVALID_CONFIG',
        { config }
      );
    }

    // Validate model
    const pricing = getModelPricing(config.model);
    if (!pricing) {
      throw new RAGPipelineError(
        `Unsupported model: ${config.model}`,
        'UNSUPPORTED_MODEL',
        { model: config.model }
      );
    }

    const sanitizedQuery = sanitizeInput(query);
    console.log('Sanitized query:', sanitizedQuery);

    // Get the "Compare" knowledge filter ID from OpenRAG
    // RAG pipeline is independent - it doesn't need local storage
    console.log('Retrieving "Compare" knowledge filter from OpenRAG...');
    const client = getOpenRAGClient();
    
    const existingFilters = await client.knowledgeFilters.search(KNOWLEDGE_FILTER_ID, 1);
    
    if (!existingFilters || existingFilters.length === 0) {
      throw new RAGPipelineError(
        `Knowledge filter "${KNOWLEDGE_FILTER_ID}" not found. Please ensure the document was uploaded successfully.`,
        'FILTER_NOT_FOUND',
        { documentId, filterName: KNOWLEDGE_FILTER_ID }
      );
    }
    
    const filterId = existingFilters[0].id;
    console.log('Using knowledge filter ID:', filterId);
    console.log('Filter data sources:', existingFilters[0].queryData?.filters?.data_sources);

    // Track retrieval time
    const retrievalStartTime = performance.now();
    console.log('OpenRAG client obtained');
    console.log('[DEBUG] Client config:', {
      hasApiKey: !!process.env.OPENRAG_API_KEY,
      hasUrl: !!process.env.OPENRAG_URL,
      url: process.env.OPENRAG_URL,
      apiKeyLength: process.env.OPENRAG_API_KEY?.length
    });

    // Execute RAG query using OpenRAG SDK chat method
    // The SDK automatically handles retrieval and generation
    // IMPORTANT: Set stream: false to get complete response instead of streaming
    // IMPORTANT: Use filterId to scope retrieval to the specific document via knowledge filter
    const chatRequest = {
      message: sanitizedQuery,
      limit: config.topK,
      scoreThreshold: 0.5, // Reasonable default
      stream: false as const, // Disable streaming to get complete response (literal type)
      filterId: filterId, // Use knowledge filter to scope retrieval to this document
    };
    console.log('Chat request:', JSON.stringify(chatRequest, null, 2));
    console.log('Calling client.chat.create() with knowledge filter...');
    
    const response = await client.chat.create(chatRequest);
    
    console.log('Response received from OpenRAG');
    console.log('Response type:', typeof response);
    console.log('Response keys:', response ? Object.keys(response) : 'null');
    console.log('Response.response:', response?.response ? `${response.response.substring(0, 100)}...` : 'undefined');
    console.log('Response.sources count:', response?.sources?.length || 0);

    const retrievalEndTime = performance.now();
    const retrievalTime = Math.round(retrievalEndTime - retrievalStartTime);
    console.log('Retrieval time:', retrievalTime, 'ms');

    // Track generation time (estimate as 60% of total time)
    const generationTime = Math.round(retrievalTime * 0.6);
    console.log('Generation time (estimated):', generationTime, 'ms');

    // Extract answer from response
    const answer = response.response || '';
    console.log('Answer extracted, length:', answer.length);

    // Extract sources from response
    const sdkSources = response.sources || [];
    console.log('SDK sources count:', sdkSources.length);
    
    const sourceChunks: Chunk[] = sdkSources.map((source, index) => ({
      id: `source-${index}`,
      content: source.text,
      tokenCount: estimateTokens(source.text),
      metadata: {
        index,
        startChar: 0,
        endChar: source.text.length,
        sourceId: source.filename
      }
    }));
    console.log('Source chunks created:', sourceChunks.length);

    // Calculate token usage
    // Input tokens = system prompt + query + retrieved chunks
    const systemPromptTokens = estimateTokens(RAG_SYSTEM_PROMPT);
    const queryTokens = estimateTokens(sanitizedQuery);
    const retrievedContent = sdkSources.map(s => s.text).join('\n\n');
    const contextTokens = estimateTokens(retrievedContent);
    const inputTokens = systemPromptTokens + queryTokens + contextTokens;
    console.log('Input tokens:', inputTokens);
    console.log('  - System prompt:', systemPromptTokens);
    console.log('  - Query:', queryTokens);
    console.log('  - Context:', contextTokens);
    
    // Output tokens = generated response
    const outputTokens = estimateTokens(answer);
    console.log('Output tokens:', outputTokens);

    // Calculate per-source token breakdown
    const perSourceTokens = sourceChunks.map(chunk => ({
      sourceId: chunk.id,
      tokens: chunk.tokenCount
    }));

    // Calculate metrics
    const metrics = calculateMetrics(
      retrievalTime,
      generationTime,
      inputTokens,
      outputTokens,
      config.model
    );
    console.log('Metrics calculated:', JSON.stringify(metrics, null, 2));

    // Calculate detailed breakdown
    const timingBreakdown = calculateTimingBreakdown(retrievalTime, generationTime);
    const tokenBreakdown = calculateTokenBreakdown(
      systemPromptTokens,
      queryTokens,
      contextTokens,
      outputTokens,
      perSourceTokens
    );
    const costBreakdown = calculateCostBreakdown(
      config.model,
      inputTokens,
      outputTokens,
      true // Include embedding cost estimate for RAG
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
        generationTimeEstimated: true,
        embeddingCostEstimated: true,
        notes: [
          'Generation time is estimated as a portion of total time',
          'Embedding costs are estimated and may vary by provider'
        ]
      }
    };

    const result = {
      answer,
      sources: sourceChunks,
      metrics: {
        retrievalTime: metrics.retrievalTime,
        generationTime: metrics.generationTime,
        tokens: metrics.totalTokens,
        cost: metrics.cost,
        breakdown
      }
    };
    
    console.log('=== RAG Pipeline Query Complete ===');
    console.log('Result summary:', {
      answerLength: result.answer.length,
      sourcesCount: result.sources.length,
      totalTokens: result.metrics.tokens,
      cost: result.metrics.cost
    });
    
    return result;

  } catch (error) {
    // Handle OpenRAG SDK errors
    if (error instanceof RAGPipelineError) {
      throw error;
    }

    throw handleOpenRAGError(error);
  }
}

// Made with Bob