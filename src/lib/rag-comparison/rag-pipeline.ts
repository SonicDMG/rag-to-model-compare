/**
 * RAG Pipeline with OpenRAG SDK Integration
 * 
 * Implements document indexing, query execution, and metrics calculation
 * for RAG-based retrieval and generation following OWASP security standards.
 */

import { calculateCost, getModelPricing } from '@/lib/constants/models';
import { estimateTokens } from '@/lib/utils/token-estimator';
import type { 
  Chunk, 
  DocumentMetadata, 
  RAGConfig,
  RAGResult 
} from '@/types/rag-comparison';

/**
 * Result from document indexing operation
 */
export interface IndexResult {
  /** Whether indexing was successful */
  success: boolean;
  /** Document identifier in the RAG system */
  documentId: string;
  /** Number of chunks indexed */
  chunkCount: number;
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
 * Creates or updates the "Compare" knowledge filter for scoping retrieval
 * 
 * This filter ensures that RAG queries only retrieve from documents
 * uploaded for comparison purposes.
 * 
 * @param filterId - Filter identifier (default: "Compare")
 * @returns Promise that resolves when filter is created/updated
 * @throws {RAGPipelineError} If filter creation fails
 * 
 * @example
 * ```typescript
 * await createKnowledgeFilter('Compare');
 * ```
 */
export async function createKnowledgeFilter(
  filterId: string = KNOWLEDGE_FILTER_ID
): Promise<void> {
  try {
    // Validate filter ID
    if (!filterId || typeof filterId !== 'string') {
      throw new RAGPipelineError(
        'Filter ID is required',
        'INVALID_FILTER_ID',
        { filterId }
      );
    }

    // Note: This is a placeholder implementation
    // The actual OpenRAG SDK API for creating filters may differ
    // This should be updated based on the SDK documentation
    
    // For now, we'll assume the filter is created automatically
    // when documents are indexed with the filter tag
    console.log(`Knowledge filter "${filterId}" will be used for retrieval scoping`);
    
  } catch (error) {
    if (error instanceof RAGPipelineError) {
      throw error;
    }
    
    throw new RAGPipelineError(
      'Failed to create knowledge filter',
      'FILTER_CREATION_ERROR',
      {
        filterId,
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
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      throw new RAGPipelineError(
        'File size exceeds maximum (100MB)',
        'FILE_TOO_LARGE',
        { documentId, fileSize: file.size }
      );
    }

    // Ensure knowledge filter exists
    await createKnowledgeFilter(KNOWLEDGE_FILTER_ID);

    // Prepare FormData for file upload to OpenRAG
    // OpenRAG SDK will handle parsing, chunking, and embedding
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', documentId);
    formData.append('filter', KNOWLEDGE_FILTER_ID);
    formData.append('metadata', JSON.stringify({
      filename: metadata.filename,
      size: metadata.size,
      mimeType: metadata.mimeType,
      uploadedAt: metadata.uploadedAt.toISOString(),
    }));

    // Upload to OpenRAG for automatic processing
    const response = await fetch(`${process.env.OPENRAG_URL}/api/documents/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENRAG_API_KEY}`
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new RAGPipelineError(
        `Document ingestion failed: ${response.statusText}`,
        'INGESTION_ERROR',
        {
          documentId,
          status: response.status,
          error: errorText
        }
      );
    }

    // Parse response to get chunk count from OpenRAG
    const responseData = await response.json();
    const chunkCount = responseData.chunkCount || responseData.chunks?.length || 0;

    const endTime = performance.now();
    const indexTime = Math.round(endTime - startTime);

    return {
      success: true,
      documentId,
      chunkCount,
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
        indexTime,
        error: error.message
      };
    }

    return {
      success: false,
      documentId,
      chunkCount: 0,
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
    const systemPrompt = buildRAGPrompt(sanitizedQuery);

    // Track retrieval time
    const retrievalStartTime = performance.now();

    // Execute RAG query using OpenRAG SDK
    // Note: This assumes the SDK has a chat() method with automatic retrieval
    // Adjust based on actual SDK API
    const ragResponse = await fetch(`${process.env.OPENRAG_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENRAG_API_KEY}`
      },
      body: JSON.stringify({
        query: sanitizedQuery,
        systemPrompt,
        model: config.model,
        temperature: config.temperature ?? 0.7,
        topK: config.topK,
        filter: KNOWLEDGE_FILTER_ID,
        documentId: documentId
      })
    });

    if (!ragResponse.ok) {
      const errorText = await ragResponse.text();
      throw new RAGPipelineError(
        `RAG query failed: ${ragResponse.statusText}`,
        'QUERY_ERROR',
        { 
          documentId,
          query: sanitizedQuery,
          status: ragResponse.status,
          error: errorText
        }
      );
    }

    const ragData = await ragResponse.json();
    const retrievalEndTime = performance.now();
    const retrievalTime = Math.round(retrievalEndTime - retrievalStartTime);

    // Track generation time (if provided by API, otherwise estimate)
    const generationTime = ragData.generationTime ?? Math.round(retrievalTime * 0.6);

    // Extract retrieved chunks and sources
    const retrievedChunks = ragData.retrievedChunks || ragData.sources || [];
    const sources = extractSources(retrievedChunks);

    // Calculate token usage
    // Input tokens = system prompt + retrieved chunks + user query
    const retrievedContent = sources.map(s => s.content).join('\n\n');
    const inputTokens = estimateTokens(systemPrompt) + 
                       estimateTokens(retrievedContent) + 
                       estimateTokens(sanitizedQuery);
    
    // Output tokens = generated response
    const answer = ragData.answer || ragData.response || '';
    const outputTokens = estimateTokens(answer);

    // Calculate metrics
    const metrics = calculateMetrics(
      retrievalTime,
      generationTime,
      inputTokens,
      outputTokens,
      config.model
    );

    // Convert sources to Chunk format for compatibility
    const sourceChunks: Chunk[] = sources.map((source, index) => ({
      id: `source-${index}`,
      content: source.content,
      tokenCount: estimateTokens(source.content),
      metadata: {
        index: source.chunkIndex,
        startChar: source.position?.start ?? 0,
        endChar: source.position?.end ?? source.content.length,
        sourceId: source.documentId
      }
    }));

    return {
      answer,
      sources: sourceChunks,
      metrics: {
        retrievalTime: metrics.retrievalTime,
        generationTime: metrics.generationTime,
        tokens: metrics.totalTokens,
        cost: metrics.cost
      }
    };

  } catch (error) {
    if (error instanceof RAGPipelineError) {
      throw error;
    }

    throw new RAGPipelineError(
      'RAG query execution failed',
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