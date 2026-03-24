/**
 * Processing Event Types
 * 
 * Defines types for tracking real-time processing events across all pipelines.
 * Used to instrument and monitor every operation with millisecond precision.
 */

/**
 * Enum of all possible processing event types across RAG, Direct, and Ollama pipelines
 */
export enum ProcessingEventType {
  // Common events
  VALIDATION = 'validation',
  PROMPT_BUILDING = 'prompt_building',
  CONTEXT_CHECK = 'context_check',
  TOKEN_ESTIMATION = 'token_estimation',
  API_CALL = 'api_call',
  METRICS_CALCULATION = 'metrics_calculation',
  
  // RAG-specific events (Query)
  FILTER_LOOKUP = 'filter_lookup',
  DOCUMENT_RETRIEVAL = 'document_retrieval',
  EMBEDDING_GENERATION = 'embedding_generation',
  VECTOR_SEARCH = 'vector_search',
  CONTEXT_ASSEMBLY = 'context_assembly',
  
  // RAG-specific events (Upload)
  FILTER_CREATION = 'filter_creation',
  FILE_VALIDATION = 'file_validation',
  FILE_STATUS_CHECK = 'file_status_check',
  RAG_INDEXING = 'rag_indexing',
  CHUNK_PROCESSING = 'chunk_processing',
  EMBEDDING_UPLOAD = 'embedding_upload',
  FILTER_UPDATE = 'filter_update',
  
  // Direct-specific events (Query)
  CONTEXT_BUILDING = 'context_building',
  DOCUMENT_LOADING = 'document_loading',
  
  // Direct-specific events (Upload)
  DOCUMENT_PARSING = 'document_parsing',
  CONTENT_VALIDATION = 'content_validation',
  STORAGE_OPERATION = 'storage_operation',
  
  // Ollama-specific events
  MODEL_DETECTION = 'model_detection',
  CONNECTION_CHECK = 'connection_check',
  STREAM_SETUP = 'stream_setup',
  RESPONSE_PARSING = 'response_parsing',
  
  // General overhead
  INITIALIZATION = 'initialization',
  CLEANUP = 'cleanup',
  ERROR_HANDLING = 'error_handling',
}

/**
 * Status of a processing event
 */
export enum ProcessingEventStatus {
  STARTED = 'started',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Individual processing event with timing information
 */
export interface ProcessingEvent {
  /** Unique identifier for this event */
  id: string;
  
  /** Type of operation being performed */
  type: ProcessingEventType;
  
  /** Human-readable operation name */
  operationName: string;
  
  /** ISO timestamp when operation started */
  startTime: string;
  
  /** ISO timestamp when operation ended (null if still in progress) */
  endTime: string | null;
  
  /** Duration in milliseconds (null if still in progress) */
  duration: number | null;
  
  /** Current status of the operation */
  status: ProcessingEventStatus;
  
  /** Optional error message if status is FAILED */
  error?: string;
  
  /** Optional metadata about the operation */
  metadata?: Record<string, any>;
}

/**
 * Pipeline identifier for event tracking
 */
export enum PipelineType {
  RAG = 'rag',
  DIRECT = 'direct',
  OLLAMA = 'ollama',
}

/**
 * Event emitted during streaming for real-time updates
 */
export interface StreamedProcessingEvent {
  /** Which pipeline this event belongs to */
  pipeline: PipelineType;
  
  /** The processing event data */
  event: ProcessingEvent;
  
  /** Cumulative time elapsed since pipeline start (ms) */
  cumulativeTime: number;
}

/**
 * Callback function type for real-time event emission
 */
export type EventCallback = (event: ProcessingEvent) => void;

/**
 * Helper class for tracking processing events with real-time streaming support
 */
export class ProcessingEventTracker {
  private events: ProcessingEvent[] = [];
  private startTime: number;
  private eventCallback?: EventCallback;
  private pipelinePrefix?: string;
  
  constructor(eventCallback?: EventCallback, pipelineType?: PipelineType) {
    this.startTime = Date.now();
    this.eventCallback = eventCallback;
    this.pipelinePrefix = pipelineType ? `${pipelineType}_` : '';
  }
  
  /**
   * Start tracking a new operation
   */
  startEvent(type: ProcessingEventType, operationName: string, metadata?: Record<string, any>): string {
    const id = `${this.pipelinePrefix}${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const event: ProcessingEvent = {
      id,
      type,
      operationName,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      status: ProcessingEventStatus.STARTED,
      metadata,
    };
    
    this.events.push(event);
    
    // Emit event immediately if callback is provided
    if (this.eventCallback) {
      this.eventCallback(event);
    }
    
    return id;
  }
  
  /**
   * Mark an operation as completed
   */
  completeEvent(id: string, metadata?: Record<string, any>): void {
    const event = this.events.find(e => e.id === id);
    if (!event) return;
    
    const endTime = new Date();
    event.endTime = endTime.toISOString();
    event.duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    event.status = ProcessingEventStatus.COMPLETED;
    
    if (metadata) {
      event.metadata = { ...event.metadata, ...metadata };
    }
    
    // Emit updated event immediately if callback is provided
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }
  
  /**
   * Mark an operation as failed
   */
  failEvent(id: string, error: string): void {
    const event = this.events.find(e => e.id === id);
    if (!event) return;
    
    const endTime = new Date();
    event.endTime = endTime.toISOString();
    event.duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    event.status = ProcessingEventStatus.FAILED;
    event.error = error;
    
    // Emit updated event immediately if callback is provided
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }
  
  /**
   * Get all tracked events
   */
  getEvents(): ProcessingEvent[] {
    return [...this.events];
  }
  
  /**
   * Get cumulative time since tracker creation
   */
  getCumulativeTime(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * Get the most recent event
   */
  getLastEvent(): ProcessingEvent | null {
    return this.events.length > 0 ? this.events[this.events.length - 1] : null;
  }
}

// Made with Bob
