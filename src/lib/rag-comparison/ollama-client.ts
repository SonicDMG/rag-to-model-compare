/**
 * Ollama HTTP Client
 * Low-level client for communicating with Ollama's API
 */

import { OllamaPipelineError } from '@/types/ollama';

export interface OllamaClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  images?: string[];  // Base64 encoded images
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListModelsResponse {
  models: OllamaModel[];
}

export interface OllamaShowModelRequest {
  name: string;
}

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: OllamaClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 120000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Generate a completion (non-streaming)
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    // Sanitize inputs
    const sanitizedRequest = this.sanitizeGenerateRequest(request);

    const url = `${this.baseUrl}/api/generate`;
    const body = JSON.stringify({
      ...sanitizedRequest,
      stream: false
    });

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OllamaPipelineError(
          `Ollama API error: ${response.statusText}`,
          'OLLAMA_API_ERROR',
          { status: response.status, body: errorText }
        );
      }

      const data = await response.json();
      return this.validateGenerateResponse(data);
    } catch (error) {
      if (error instanceof OllamaPipelineError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new OllamaPipelineError(
            'Request timeout',
            'TIMEOUT',
            { timeout: this.timeout }
          );
        }
        throw new OllamaPipelineError(
          `Failed to generate completion: ${error.message}`,
          'GENERATION_ERROR',
          { originalError: error.message }
        );
      }
      
      throw new OllamaPipelineError(
        'Unknown error during generation',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Generate a completion (streaming)
   */
  async *generateStream(request: OllamaGenerateRequest): AsyncGenerator<OllamaGenerateResponse> {
    // Sanitize inputs
    const sanitizedRequest = this.sanitizeGenerateRequest(request);

    const url = `${this.baseUrl}/api/generate`;
    const body = JSON.stringify({
      ...sanitizedRequest,
      stream: true
    });

    let response: Response;
    try {
      response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OllamaPipelineError(
          `Ollama API error: ${response.statusText}`,
          'OLLAMA_API_ERROR',
          { status: response.status, body: errorText }
        );
      }
    } catch (error) {
      if (error instanceof OllamaPipelineError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new OllamaPipelineError(
            'Request timeout',
            'TIMEOUT',
            { timeout: this.timeout }
          );
        }
        throw new OllamaPipelineError(
          `Failed to start streaming: ${error.message}`,
          'STREAM_START_ERROR',
          { originalError: error.message }
        );
      }
      
      throw new OllamaPipelineError(
        'Unknown error starting stream',
        'UNKNOWN_ERROR'
      );
    }

    // Parse NDJSON stream
    if (!response.body) {
      throw new OllamaPipelineError(
        'No response body',
        'NO_RESPONSE_BODY'
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining data in buffer
          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer);
              yield this.validateGenerateResponse(data);
            } catch (error) {
              // Ignore incomplete JSON at end of stream
            }
          }
          break;
        }

        // Append new data to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed);
            yield this.validateGenerateResponse(data);
          } catch (error) {
            throw new OllamaPipelineError(
              'Failed to parse streaming response',
              'STREAM_PARSE_ERROR',
              { line: trimmed }
            );
          }
        }
      }
    } catch (error) {
      if (error instanceof OllamaPipelineError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new OllamaPipelineError(
          `Stream reading error: ${error.message}`,
          'STREAM_READ_ERROR',
          { originalError: error.message }
        );
      }
      
      throw new OllamaPipelineError(
        'Unknown error reading stream',
        'UNKNOWN_ERROR'
      );
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * List all available models
   */
  async listModels(): Promise<OllamaModel[]> {
    const url = `${this.baseUrl}/api/tags`;

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OllamaPipelineError(
          `Failed to list models: ${response.statusText}`,
          'LIST_MODELS_ERROR',
          { status: response.status, body: errorText }
        );
      }

      const data: OllamaListModelsResponse = await response.json();
      return data.models || [];
    } catch (error) {
      if (error instanceof OllamaPipelineError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new OllamaPipelineError(
            'Request timeout',
            'TIMEOUT',
            { timeout: this.timeout }
          );
        }
        throw new OllamaPipelineError(
          `Failed to list models: ${error.message}`,
          'LIST_MODELS_ERROR',
          { originalError: error.message }
        );
      }
      
      throw new OllamaPipelineError(
        'Unknown error listing models',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Get detailed information about a specific model
   */
  async showModel(name: string): Promise<OllamaModel> {
    // Sanitize model name
    const sanitizedName = this.sanitizeString(name);
    
    const url = `${this.baseUrl}/api/show`;
    const body = JSON.stringify({ name: sanitizedName });

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OllamaPipelineError(
          `Failed to show model: ${response.statusText}`,
          'SHOW_MODEL_ERROR',
          { status: response.status, body: errorText, model: sanitizedName }
        );
      }

      const data: OllamaModel = await response.json();
      return data;
    } catch (error) {
      if (error instanceof OllamaPipelineError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new OllamaPipelineError(
            'Request timeout',
            'TIMEOUT',
            { timeout: this.timeout }
          );
        }
        throw new OllamaPipelineError(
          `Failed to show model: ${error.message}`,
          'SHOW_MODEL_ERROR',
          { originalError: error.message, model: sanitizedName }
        );
      }
      
      throw new OllamaPipelineError(
        'Unknown error showing model',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Check if Ollama server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/tags`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // Short timeout for health check
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Private helper for making HTTP requests with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = this.maxRetries
  ): Promise<Response> {
    let lastError: Error | null = null;
    let delay = 1000; // Start with 1 second

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Don't retry on client errors (4xx), only server errors (5xx) and network errors
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // Server error, will retry
        lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on timeout or abort
        if (lastError.name === 'AbortError' || lastError.name === 'TimeoutError') {
          throw lastError;
        }
      }

      // If we have retries left, wait and try again
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    // All retries exhausted
    throw new OllamaPipelineError(
      `Request failed after ${retries + 1} attempts`,
      'MAX_RETRIES_EXCEEDED',
      { lastError: lastError?.message, url }
    );
  }

  /**
   * Sanitize generate request to prevent injection attacks
   */
  private sanitizeGenerateRequest(request: OllamaGenerateRequest): OllamaGenerateRequest {
    return {
      model: this.sanitizeString(request.model),
      prompt: this.sanitizeString(request.prompt),
      images: request.images?.map(img => this.sanitizeString(img)),
      stream: request.stream,
      options: request.options ? {
        temperature: this.sanitizeNumber(request.options.temperature, 0, 2),
        top_p: this.sanitizeNumber(request.options.top_p, 0, 1),
        top_k: this.sanitizeNumber(request.options.top_k, 1, 100),
        num_predict: this.sanitizeNumber(request.options.num_predict, 1, 1000000),
      } : undefined,
    };
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(value: string | undefined): string {
    if (!value) return '';
    // Remove null bytes and control characters except newlines and tabs
    return value.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Sanitize and validate numeric input
   */
  private sanitizeNumber(value: number | undefined, min?: number, max?: number): number | undefined {
    if (value === undefined) return undefined;
    
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return undefined;
    
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    
    return num;
  }

  /**
   * Validate generate response structure
   */
  private validateGenerateResponse(data: any): OllamaGenerateResponse {
    if (!data || typeof data !== 'object') {
      throw new OllamaPipelineError(
        'Invalid response format',
        'INVALID_RESPONSE',
        { data }
      );
    }

    // Ensure required fields exist
    if (typeof data.model !== 'string') {
      throw new OllamaPipelineError(
        'Missing or invalid model field',
        'INVALID_RESPONSE'
      );
    }

    if (typeof data.response !== 'string') {
      throw new OllamaPipelineError(
        'Missing or invalid response field',
        'INVALID_RESPONSE'
      );
    }

    if (typeof data.done !== 'boolean') {
      throw new OllamaPipelineError(
        'Missing or invalid done field',
        'INVALID_RESPONSE'
      );
    }

    return data as OllamaGenerateResponse;
  }
}

// Made with Bob
