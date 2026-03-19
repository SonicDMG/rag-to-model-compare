/**
 * Ollama-specific type definitions
 */

import type { ProcessingEvent } from './processing-events';

export interface OllamaConfig {
  model: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  maxTokens?: number;
  baseUrl?: string;
}

export interface OllamaResult {
  answer: string;
  metrics: {
    generationTime: number;
    tokens: number;
    cost: number;
    contextWindowUsage: number;
    breakdown?: any; // Will be properly typed later
  };
  /** Array of processing events with timing information */
  processingEvents: ProcessingEvent[];
}

export interface OllamaError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class OllamaPipelineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OllamaPipelineError';
  }
}

// Made with Bob
