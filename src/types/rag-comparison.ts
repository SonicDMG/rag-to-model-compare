/**
 * Core type definitions for RAG comparison application
 */

/**
 * Represents a single chunk of text from a document
 */
export interface Chunk {
  /** Unique identifier for the chunk */
  id: string;
  /** The actual text content of the chunk */
  content: string;
  /** Estimated number of tokens in the chunk */
  tokenCount: number;
  /** Additional metadata about the chunk */
  metadata: ChunkMetadata;
}

/**
 * Metadata associated with a chunk
 */
export interface ChunkMetadata {
  /** Index position of the chunk in the original document */
  index: number;
  /** Starting character position in the original document */
  startChar: number;
  /** Ending character position in the original document */
  endChar: number;
  /** Optional source document identifier */
  sourceId?: string;
  /** Optional section or heading information */
  section?: string;
}

/**
 * Processing status for document operations
 */
export type ProcessingStatus = 'idle' | 'processing' | 'ready' | 'error';

/**
 * Chunking strategy for document processing
 */
export type ChunkStrategy = 'fixed' | 'paragraph' | 'semantic';

/**
 * Folder metadata for multi-file uploads
 */
export interface FolderMetadata {
  /** Relative path within the folder structure */
  relativePath: string;
  /** Name of the root folder */
  folderName: string;
  /** Depth level in folder hierarchy (0 = root) */
  depth: number;
  /** Parent folder path if nested */
  parentPath?: string;
  /** Whether this file is part of a folder upload */
  isPartOfFolder: boolean;
  /** Unique batch ID for this folder upload */
  uploadBatchId?: string;
}

/**
 * Metadata about a processed document
 */
export interface DocumentMetadata {
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Upload timestamp */
  uploadedAt: Date;
  /** Total number of chunks created */
  chunkCount: number;
  /** Total token count across all chunks */
  totalTokens: number;
  /** Chunking strategy used */
  strategy: ChunkStrategy;
  /** Folder context if part of multi-file upload */
  folderContext?: FolderMetadata;
}

/**
 * Performance metrics for operations
 */
export interface PerformanceMetrics {
  /** Time taken in milliseconds */
  time: number;
  /** Number of tokens used */
  tokens: number;
  /** Cost in USD */
  cost: number;
}

/**
 * Timing breakdown for detailed metrics
 */
export interface TimingBreakdown {
  /** Retrieval time in milliseconds (RAG only) */
  retrievalTime?: number;
  /** Retrieval time as percentage of total (RAG only) */
  retrievalPercent?: number;
  /** Generation time in milliseconds */
  generationTime: number;
  /** Generation time as percentage of total */
  generationPercent: number;
  /** Total time in milliseconds */
  totalTime: number;
}

/**
 * Token breakdown by component
 */
export interface TokenBreakdown {
  /** System prompt tokens */
  systemPrompt: number;
  /** User query tokens */
  query: number;
  /** Context/document tokens */
  context: number;
  /** Per-source token breakdown (RAG only) */
  perSource?: Array<{
    /** Source chunk ID */
    sourceId: string;
    /** Tokens in this source */
    tokens: number;
  }>;
  /** Output/completion tokens */
  output: number;
  /** Total input tokens (system + query + context) */
  totalInput: number;
  /** Total tokens (input + output) */
  total: number;
}

/**
 * Cost breakdown by component
 */
export interface CostBreakdown {
  /** Input cost in USD */
  inputCost: number;
  /** Output cost in USD */
  outputCost: number;
  /** Embedding cost in USD (RAG only, estimated) */
  embeddingCost?: number;
  /** Total cost in USD */
  totalCost: number;
}

/**
 * Context window usage breakdown
 */
export interface ContextWindowBreakdown {
  /** Total context window size in tokens */
  contextWindowSize: number;
  /** Tokens used */
  tokensUsed: number;
  /** Percentage of context window used */
  percentageUsed: number;
  /** Remaining tokens available */
  tokensRemaining: number;
}

/**
 * Metadata about the breakdown calculation
 */
export interface BreakdownMetadata {
  /** Model used for the query */
  model: string;
  /** Timestamp of the calculation */
  timestamp: Date;
  /** Whether generation time is estimated (RAG only) */
  generationTimeEstimated?: boolean;
  /** Whether embedding cost is estimated */
  embeddingCostEstimated?: boolean;
  /** Additional notes or limitations */
  notes?: string[];
}

/**
 * Detailed metrics breakdown
 */
export interface DetailedMetricsBreakdown {
  /** Timing breakdown */
  timing: TimingBreakdown;
  /** Token breakdown */
  tokens: TokenBreakdown;
  /** Cost breakdown */
  cost: CostBreakdown;
  /** Context window breakdown */
  contextWindow: ContextWindowBreakdown;
  /** Metadata about the breakdown */
  metadata: BreakdownMetadata;
}

/**
 * Result from RAG-based query processing
 */
export interface RAGResult {
  /** Generated answer from the model */
  answer: string;
  /** Source chunks used to generate the answer */
  sources: Chunk[];
  /** Performance and cost metrics */
  metrics: {
    /** Time taken for retrieval in milliseconds */
    retrievalTime: number;
    /** Time taken for generation in milliseconds */
    generationTime: number;
    /** Total tokens used (prompt + completion) */
    tokens: number;
    /** Total cost in USD */
    cost: number;
    /** Detailed metrics breakdown (optional) */
    breakdown?: DetailedMetricsBreakdown;
  };
}

/**
 * Result from direct model query (no RAG)
 */
export interface DirectResult {
  /** Generated answer from the model */
  answer: string;
  /** Performance and cost metrics */
  metrics: {
    /** Time taken for generation in milliseconds */
    generationTime: number;
    /** Total tokens used (prompt + completion) */
    tokens: number;
    /** Total cost in USD */
    cost: number;
    /** Percentage of context window used */
    contextWindowUsage: number;
    /** Detailed metrics breakdown (optional) */
    breakdown?: DetailedMetricsBreakdown;
  };
}

/**
 * Comparison metrics between RAG and direct approaches
 */
export interface ComparisonMetrics {
  /** Speed comparison */
  speed: {
    /** RAG total time (retrieval + generation) in ms */
    ragTotal: number;
    /** Direct generation time in ms */
    directTotal: number;
    /** Percentage difference (positive means RAG is faster) */
    difference: number;
  };
  /** Token usage comparison */
  tokens: {
    /** Tokens used by RAG approach */
    rag: number;
    /** Tokens used by direct approach */
    direct: number;
    /** Percentage difference (positive means RAG uses fewer) */
    difference: number;
  };
  /** Cost comparison */
  cost: {
    /** Cost of RAG approach in USD */
    rag: number;
    /** Cost of direct approach in USD */
    direct: number;
    /** Percentage difference (positive means RAG is cheaper) */
    difference: number;
  };
  /** Context window usage comparison */
  contextWindow: {
    /** Percentage used by RAG approach */
    ragUsage: number;
    /** Percentage used by direct approach */
    directUsage: number;
    /** Difference in percentage points */
    difference: number;
  };
  /** Quality comparison (if available) */
  quality?: {
    /** RAG answer quality score (0-1) */
    ragScore?: number;
    /** Direct answer quality score (0-1) */
    directScore?: number;
    /** Difference in quality scores */
    difference?: number;
  };
}

/**
 * Complete comparison result between RAG and direct approaches
 */
export interface ComparisonResult {
  /** RAG approach result */
  rag: RAGResult;
  /** Direct approach result */
  direct: DirectResult;
  /** Comparative metrics */
  comparison: ComparisonMetrics;
  /** Summary and recommendations */
  summary: {
    /** Which approach performed better overall */
    recommendation: 'rag' | 'direct' | 'similar';
    /** Key insights from the comparison */
    insights: string[];
    /** Timestamp of the comparison */
    timestamp: Date;
  };
}

/**
 * Configuration for RAG processing
 */
export interface RAGConfig {
  /** Chunking strategy to use */
  chunkStrategy: ChunkStrategy;
  /** Target chunk size in tokens */
  chunkSize: number;
  /** Overlap between chunks in tokens */
  chunkOverlap: number;
  /** Number of chunks to retrieve */
  topK: number;
  /** Model to use for generation */
  model: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
}

/**
 * Configuration for direct model query
 */
export interface DirectConfig {
  /** Model to use for generation */
  model: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Query request parameters
 */
export interface QueryRequest {
  /** The user's question */
  query: string;
  /** RAG configuration */
  ragConfig: RAGConfig;
  /** Direct query configuration */
  directConfig: DirectConfig;
  /** Document ID to query against */
  documentId?: string;
}

/**
 * Error information
 */
export interface ErrorInfo {
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Result for a single file upload in multi-file scenario
 */
export interface FileUploadResult {
  /** Original filename */
  filename: string;
  /** Relative path within folder structure */
  relativePath?: string;
  /** Unique document ID */
  documentId: string;
  /** Whether file contains images */
  hasImages: boolean;
  /** Number of images in file */
  imageCount: number;
  /** RAG pipeline result */
  rag: {
    /** Processing status */
    status: 'success' | 'error';
    /** Number of chunks created */
    chunkCount?: number;
    /** Total tokens in chunks */
    tokenCount?: number;
    /** Time taken to index (ms) */
    indexTime?: number;
    /** Processed text content */
    processedText?: string;
    /** Error message if failed */
    error?: string;
  };
  /** Direct pipeline result */
  direct: {
    /** Processing status */
    status: 'success' | 'error';
    /** Total tokens in document */
    tokenCount?: number;
    /** Time taken to load (ms) */
    loadTime?: number;
    /** Whether within context window limit */
    withinLimit?: boolean;
    /** Warning messages */
    warnings?: string[];
    /** Processed text content */
    processedText?: string;
    /** Error message if failed */
    error?: string;
  };
}

/**
 * Response for multi-file upload
 */
export interface MultiFileUploadResponse {
  /** Overall success status */
  success: boolean;
  /** Per-file results */
  results: FileUploadResult[];
  /** Summary statistics */
  summary: {
    /** Total files processed */
    total: number;
    /** Files that succeeded in both pipelines */
    successful: number;
    /** Files that failed in both pipelines */
    failed: number;
    /** Files that succeeded in at least one pipeline */
    partialSuccess: number;
    /** Total processing time (ms) */
    totalProcessingTime: number;
  };
  /** Errors that prevented processing */
  errors?: Array<{
    /** Filename that caused error */
    filename: string;
    /** Error message */
    error: string;
  }>;
}

// Made with Bob
