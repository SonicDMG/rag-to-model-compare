/**
 * RAG Pipeline with OpenRAG SDK Integration
 *
 * Implements document indexing, query execution, and metrics calculation
 * for RAG-based retrieval and generation following OWASP security standards.
 */

import path from 'path';
import { OpenRAGClient } from 'openrag-sdk';
import { calculateCost, getModelPricing } from '@/lib/constants/models';
import {
  getOpenRAGClient,
  handleOpenRAGError,
  sanitizeInput,
  validateDocumentId,
  validateQuery,
  validateMetricsInput
} from '../utils/pipeline-utils';

// Re-export getOpenRAGClient for backward compatibility
export { getOpenRAGClient } from '../utils/pipeline-utils';
import { estimateTokens } from '@/lib/utils/token-estimator';
import {
  calculateTimingBreakdown,
  calculateTokenBreakdown,
  calculateCostBreakdown,
  calculateContextWindowBreakdown
} from '../metrics/metrics-calculator';
import type {
  Chunk,
  DocumentMetadata,
  RAGConfig,
  RAGResult
} from '@/types/rag-comparison';
import {
  ProcessingEventTracker,
  ProcessingEventType,
  ProcessingEvent,
  PipelineType
} from '@/types/processing-events';


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
/**
 * Helper function to update filter with retry logic
 */
async function updateFilterWithRetry(
  client: OpenRAGClient,
  filterId: string,
  dataSources: string[],
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.knowledgeFilters.update(filterId, {
        queryData: {
          filters: {
            data_sources: dataSources
          }
        }
      });
      console.log(`✅ Filter update successful on attempt ${attempt}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`⚠️  Filter update attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = 100 * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new RAGPipelineError(
    `Failed to update filter after ${maxRetries} attempts`,
    'FILTER_UPDATE_ERROR',
    { filterId, lastError: lastError?.message }
  );
}

/**
 * Add a filename to an existing knowledge filter's data sources
 *
 * @param filterId - ID of the filter to update
 * @param documentId - Document ID (for logging/validation)
 * @param filename - Filename to add to the filter
 * @returns The filter ID
 */
export async function addFilenameToFilter(
  filterId: string,
  documentId: string,
  filename: string
): Promise<string> {
  try {
    // Validate inputs
    if (!filterId || typeof filterId !== 'string') {
      throw new RAGPipelineError(
        'Filter ID is required',
        'INVALID_FILTER_ID',
        { filterId }
      );
    }

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

    const client = getOpenRAGClient(RAGPipelineError);
    
    // Get the filter
    const filter = await client.knowledgeFilters.get(filterId);
    
    if (!filter) {
      throw new RAGPipelineError(
        'Filter not found',
        'FILTER_NOT_FOUND',
        { filterId }
      );
    }
    
    console.log(`Adding filename "${filename}" to filter "${filter.name}" (${filterId})`);
    
    // Get current data sources
    const currentDataSources = filter.queryData?.filters?.data_sources || [];
    
    // Add new filename if not already present
    if (!currentDataSources.includes(filename)) {
      console.log(`Adding filename "${filename}" to filter`);
      await updateFilterWithRetry(client, filterId, [...currentDataSources, filename]);
      console.log(`✅ Updated filter with new filename`);
    } else {
      console.log(`ℹ️  Filename "${filename}" already in filter`);
    }
    
    return filterId;
    
  } catch (error) {
    if (error instanceof RAGPipelineError) {
      throw error;
    }
    
    throw new RAGPipelineError(
      'Failed to add filename to filter',
      'FILTER_UPDATE_ERROR',
      {
        filterId,
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
  validateMetricsInput(
    {
      times: { retrievalTime, generationTime },
      tokens: { inputTokens, outputTokens }
    },
    RAGPipelineError
  );

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
  metadata: DocumentMetadata,
  knowledgeFilterId?: string,
  skipFilterUpdate: boolean = false
): Promise<IndexResult> {
  const startTime = performance.now();

  try {
    // Validate inputs
    validateDocumentId(documentId, RAGPipelineError);

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

    // Token count will be retrieved from OpenRAG's response after ingestion
    // OpenRAG SDK handles all document parsing internally
    const tokenCount = 0; // Placeholder - will be updated from ingestion result

    // Get OpenRAG client
    const client = getOpenRAGClient(RAGPipelineError);

    // Upload document using OpenRAG SDK
    // The SDK handles parsing, chunking, and embedding automatically
    // Extract just the filename (without directory path) for OpenRAG
    console.log(`[RAG Pipeline] Attempting to ingest document...`);
    console.log(`[RAG Pipeline] OpenRAG URL: ${process.env.OPENRAG_URL}`);
    console.log(`[RAG Pipeline] API Key configured: ${!!process.env.OPENRAG_API_KEY}`);
    console.log(`[RAG Pipeline] Filename: ${path.basename(metadata.filename)}`);
    console.log(`[RAG Pipeline] File size: ${file.size} bytes`);
    
    let result: any;
    try {
      result = await client.documents.ingest({
        file,
        filename: path.basename(metadata.filename),
        wait: true, // Wait for ingestion to complete
      });
    } catch (ingestError: any) {
      // Enhanced error logging for fetch failures
      console.error('\n╔════════════════════════════════════════════════════════════╗');
      console.error('║         OpenRAG Document Ingestion FAILED                 ║');
      console.error('╚════════════════════════════════════════════════════════════╝');
      console.error(`❌ Error Type: ${ingestError?.constructor?.name || 'Unknown'}`);
      console.error(`❌ Error Message: ${ingestError?.message || 'No message'}`);
      console.error(`❌ Error Code: ${ingestError?.code || 'No code'}`);
      console.error(`❌ Status Code: ${ingestError?.statusCode || 'No status'}`);
      console.error(`❌ OpenRAG URL: ${process.env.OPENRAG_URL}`);
      console.error(`❌ API Key Present: ${!!process.env.OPENRAG_API_KEY}`);
      console.error(`❌ Filename: ${path.basename(metadata.filename)}`);
      console.error(`❌ File Size: ${file.size} bytes`);
      
      // Log full error object for debugging
      if (ingestError?.cause) {
        console.error(`❌ Error Cause: ${JSON.stringify(ingestError.cause, null, 2)}`);
      }
      if (ingestError?.stack) {
        console.error(`❌ Stack Trace:\n${ingestError.stack}`);
      }
      console.error('════════════════════════════════════════════════════════════\n');
      
      // Check for common network errors
      if (ingestError?.message?.includes('fetch failed') ||
          ingestError?.code === 'ECONNREFUSED' ||
          ingestError?.code === 'ENOTFOUND' ||
          ingestError?.cause?.code === 'ECONNREFUSED' ||
          ingestError?.cause?.code === 'ENOTFOUND') {
        throw new RAGPipelineError(
          `Cannot connect to OpenRAG backend at ${process.env.OPENRAG_URL}. Please ensure the OpenRAG server is running and accessible.`,
          'NETWORK_ERROR',
          {
            documentId,
            url: process.env.OPENRAG_URL,
            errorCode: ingestError?.code || ingestError?.cause?.code,
            errorMessage: ingestError?.message,
            suggestion: 'Check that OPENRAG_URL is correct and the OpenRAG server is running'
          }
        );
      }
      
      // Re-throw with enhanced context
      throw new RAGPipelineError(
        `Document ingestion failed: ${ingestError?.message || 'Unknown error'}`,
        'INGESTION_ERROR',
        {
          documentId,
          filename: path.basename(metadata.filename),
          errorType: ingestError?.constructor?.name,
          errorCode: ingestError?.code,
          statusCode: ingestError?.statusCode,
          originalError: ingestError?.message
        }
      );
    }

    // Check if ingestion was successful
    // Result is IngestTaskStatus when wait=true
    const taskStatus = result as any; // Type assertion needed due to SDK union type
    
    // Log detailed ingestion results
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         OpenRAG Document Ingestion Complete               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📄 Filename: ${path.basename(metadata.filename)}`);
    console.log(`🆔 Document ID: ${documentId}`);
    console.log(`📊 Ingestion Status: ${taskStatus.status}`);
    console.log(`✅ Successful Files: ${taskStatus.successful_files || 0}`);
    console.log(`❌ Failed Files: ${taskStatus.failed_files || 0}`);
    console.log(`📦 Total Files Processed: ${(taskStatus.successful_files || 0) + (taskStatus.failed_files || 0)}`);
    console.log(`⏱️  Processing Time: ${Math.round(performance.now() - startTime)}ms`);
    console.log(`🔢 Estimated Tokens: ${tokenCount}`);
    console.log(`📏 File Size: ${(file.size / 1024).toFixed(2)} KB`);
    
    if (taskStatus.status !== 'completed') {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                  ❌ INGESTION FAILED                       ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`Status: ${taskStatus.status}`);
      console.log(`Failed Files: ${JSON.stringify(taskStatus.failed_files, null, 2)}`);
      
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
    
    console.log('✅ Verification: Document successfully indexed in OpenRAG');
    console.log('════════════════════════════════════════════════════════════\n');

    // Use the provided knowledge filter ID or create/update one
    // If knowledgeFilterId is provided (from upload route), use it directly without additional operations
    // This avoids race conditions and duplicate filter operations during multi-file uploads
    let filterId: string;
    if (knowledgeFilterId) {
      // Filter was already created/found by the upload route - use it directly
      console.log(`✅ Using pre-created filter ID: ${knowledgeFilterId} for ${metadata.filename}`);
      filterId = knowledgeFilterId;
      
      // For multi-file uploads with skipFilterUpdate=true, skip all filter operations
      // The batch update will happen after all files are processed
      if (skipFilterUpdate) {
        console.log(`ℹ️  Skipping individual filter update - will be done in batch`);
      } else {
        // Single file upload path - associate this file with the filter
        try {
          const client = getOpenRAGClient(RAGPipelineError);
          const filterResponse = await client.knowledgeFilters.get(knowledgeFilterId);
          
          if (filterResponse) {
            const currentDataSources = filterResponse.queryData?.filters?.data_sources || [];
            
            // Add new filename if not already present
            // Use basename to match what was sent to OpenRAG during ingestion
            const baseFilename = path.basename(metadata.filename);
            if (!currentDataSources.includes(baseFilename)) {
              console.log(`📎 Associating "${baseFilename}" with filter ${knowledgeFilterId}`);
              await updateFilterWithRetry(client, knowledgeFilterId, [...currentDataSources, baseFilename]);
              console.log(`✅ File associated with filter`);
            } else {
              console.log(`ℹ️  Filename "${baseFilename}" already associated with filter`);
            }
          }
        } catch (error) {
          // Log warning but don't fail the upload - the document is already indexed
          console.warn(`⚠️  Failed to associate file with filter ${knowledgeFilterId}:`, error);
        }
      }
    } else {
      // No filter provided - throw error (filter is now required)
      throw new RAGPipelineError(
        'Knowledge filter ID is required for document indexing',
        'FILTER_REQUIRED',
        { documentId, filename: metadata.filename }
      );
    }

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
  config: RAGConfig,
  filterId?: string,
  eventCallback?: (event: ProcessingEvent) => void
): Promise<RAGResult> {
  console.log('=== RAG Pipeline Query Start ===');
  console.log('Document ID:', documentId);
  console.log('Query:', query);
  console.log('Config:', JSON.stringify(config, null, 2));
  
  // Initialize event tracker with optional callback for real-time streaming
  const eventTracker = new ProcessingEventTracker(eventCallback, PipelineType.RAG);
  
  try {
    // Track initialization
    const initEventId = eventTracker.startEvent(
      ProcessingEventType.INITIALIZATION,
      'Initialize RAG pipeline',
      { documentId, model: config.model }
    );
    
    // Validate inputs
    const validationEventId = eventTracker.startEvent(
      ProcessingEventType.VALIDATION,
      'Validate inputs (documentId, query, config)'
    );
    
    validateDocumentId(documentId, RAGPipelineError);
    validateQuery(query, RAGPipelineError);

    if (!config || typeof config !== 'object') {
      eventTracker.failEvent(validationEventId, 'Invalid RAG configuration');
      throw new RAGPipelineError(
        'RAG configuration is required',
        'INVALID_CONFIG',
        { config }
      );
    }

    // Validate model
    const pricing = getModelPricing(config.model);
    if (!pricing) {
      eventTracker.failEvent(validationEventId, `Unsupported model: ${config.model}`);
      throw new RAGPipelineError(
        `Unsupported model: ${config.model}`,
        'UNSUPPORTED_MODEL',
        { model: config.model }
      );
    }
    
    eventTracker.completeEvent(validationEventId);
    eventTracker.completeEvent(initEventId);

    const sanitizedQuery = sanitizeInput(query);
    console.log('Sanitized query:', sanitizedQuery);

    // Track filter lookup (optional - if no filter, query all documents)
    const filterLookupEventId = eventTracker.startEvent(
      ProcessingEventType.FILTER_LOOKUP,
      filterId ? 'Retrieve knowledge filter from OpenRAG' : 'No filter selected - will query all documents',
      { filterId: filterId || 'none' }
    );
    
    const client = getOpenRAGClient(RAGPipelineError);
    let filter = null;
    let filterLimit = config.topK;
    let filterScoreThreshold = 0.5;
    
    if (filterId) {
      console.log(`Retrieving knowledge filter ${filterId} from OpenRAG...`);
      filter = await client.knowledgeFilters.get(filterId);
      
      if (!filter) {
        eventTracker.failEvent(filterLookupEventId, 'Knowledge filter not found');
        throw new RAGPipelineError(
          `Knowledge filter "${filterId}" not found. Please ensure the document was uploaded successfully.`,
          'FILTER_NOT_FOUND',
          { documentId, filterId }
        );
      }
      
      // Extract limit and scoreThreshold from filter configuration
      // Filter configuration takes precedence over request parameters
      filterLimit = filter.queryData?.limit ?? config.topK;
      filterScoreThreshold = filter.queryData?.scoreThreshold ?? 0.5;
      
      console.log('Using knowledge filter ID:', filterId);
      console.log('Filter data sources:', filter.queryData?.filters?.data_sources);
    } else {
      console.log('No filter selected - querying all documents');
    }
    
    eventTracker.completeEvent(filterLookupEventId, { filterId: filterId || 'none' });
    console.log('Filter limit (from config):', filterLimit);
    console.log('Filter scoreThreshold (from config):', filterScoreThreshold);

    // Track RAG query time (single API call performs both retrieval and generation)
    const retrievalStartTime = performance.now();
    const retrievalEventId = eventTracker.startEvent(
      ProcessingEventType.VECTOR_SEARCH,
      'RAG Query (Retrieval + Generation)',
      { topK: filterLimit, filterId, model: config.model }
    );
    console.log('OpenRAG client obtained');
    console.log('[DEBUG] Client config:', {
      hasApiKey: !!process.env.OPENRAG_API_KEY,
      hasUrl: !!process.env.OPENRAG_URL,
      url: process.env.OPENRAG_URL,
      apiKeyLength: process.env.OPENRAG_API_KEY?.length
    });

    // Execute RAG query using OpenRAG SDK chat method
    // This single API call performs both vector search/retrieval AND generation
    // Use limit and scoreThreshold from filter configuration
    const chatRequest: any = {
      message: sanitizedQuery,
      limit: filterLimit,
      scoreThreshold: filterScoreThreshold,
      stream: false as const,
    };
    
    // Only include filterId if one is provided
    if (filterId) {
      chatRequest.filterId = filterId;
    }
    
    console.log('Chat request:', JSON.stringify(chatRequest, null, 2));
    console.log(filterId ? 'Calling client.chat.create() with knowledge filter...' : 'Calling client.chat.create() without filter (all documents)...');
    
    const response = await client.chat.create(chatRequest);
    
    console.log('Response received from OpenRAG');
    console.log('Response type:', typeof response);
    console.log('Response keys:', response ? Object.keys(response) : 'null');
    console.log('Response.response:', response?.response ? `${response.response.substring(0, 100)}...` : 'undefined');
    console.log('Response.sources count:', response?.sources?.length || 0);

    const retrievalEndTime = performance.now();
    const retrievalTime = Math.round(retrievalEndTime - retrievalStartTime);
    eventTracker.completeEvent(retrievalEventId, {
      retrievalTime,
      sourcesRetrieved: response?.sources?.length || 0,
      responseLength: response?.response?.length || 0
    });
    console.log('RAG query completed in:', retrievalTime, 'ms');

    // Track generation time (estimate as 60% of total time)
    const generationTime = Math.round(retrievalTime * 0.6);
    console.log('Generation time (estimated):', generationTime, 'ms');

    // Track context assembly
    const contextAssemblyEventId = eventTracker.startEvent(
      ProcessingEventType.CONTEXT_ASSEMBLY,
      'Assemble context from retrieved sources'
    );
    
    const answer = response.response || '';
    console.log('Answer extracted, length:', answer.length);

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
    
    eventTracker.completeEvent(contextAssemblyEventId, {
      chunksCreated: sourceChunks.length
    });
    console.log('Source chunks created:', sourceChunks.length);

    // Track token estimation
    const tokenEstimationEventId = eventTracker.startEvent(
      ProcessingEventType.TOKEN_ESTIMATION,
      'Estimate token usage for all components'
    );
    
    const systemPromptTokens = estimateTokens(RAG_SYSTEM_PROMPT);
    const queryTokens = estimateTokens(sanitizedQuery);
    const retrievedContent = sdkSources.map(s => s.text).join('\n\n');
    const contextTokens = estimateTokens(retrievedContent);
    const inputTokens = systemPromptTokens + queryTokens + contextTokens;
    const outputTokens = estimateTokens(answer);
    
    eventTracker.completeEvent(tokenEstimationEventId, {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    });
    
    console.log('Input tokens:', inputTokens);
    console.log('  - System prompt:', systemPromptTokens);
    console.log('  - Query:', queryTokens);
    console.log('  - Context:', contextTokens);
    console.log('Output tokens:', outputTokens);

    // Calculate per-source token breakdown
    const perSourceTokens = sourceChunks.map(chunk => ({
      sourceId: chunk.id,
      tokens: chunk.tokenCount
    }));

    // Track metrics calculation
    const metricsCalcEventId = eventTracker.startEvent(
      ProcessingEventType.METRICS_CALCULATION,
      'Calculate performance metrics and breakdowns'
    );
    
    const metrics = calculateMetrics(
      retrievalTime,
      generationTime,
      inputTokens,
      outputTokens,
      config.model
    );
    console.log('Metrics calculated:', JSON.stringify(metrics, null, 2));

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
      true
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
    
    eventTracker.completeEvent(metricsCalcEventId, {
      cost: metrics.cost,
      totalTokens: metrics.totalTokens
    });

    const result = {
      answer,
      sources: sourceChunks,
      model: config.model,
      embeddingModel: undefined, // Embedding model not currently tracked in RAGConfig
      metrics: {
        retrievalTime: metrics.retrievalTime,
        generationTime: metrics.generationTime,
        tokens: metrics.totalTokens,
        cost: metrics.cost,
        contextWindowUsage: contextWindowBreakdown.percentageUsed,
        breakdown
      },
      processingEvents: eventTracker.getEvents()
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

    throw handleOpenRAGError(error, RAGPipelineError);
  }
}

// Made with Bob