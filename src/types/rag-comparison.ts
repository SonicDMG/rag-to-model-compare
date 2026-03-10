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

// Made with Bob
