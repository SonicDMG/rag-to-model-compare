/**
 * Ollama Health Check API Route
 *
 * Provides endpoint for checking Ollama server availability and configuration.
 */

import { NextResponse } from 'next/server';
import { isOllamaAvailable } from '@/lib/rag-comparison/ollama-model-detector';
import { OLLAMA_CONFIG } from '@/lib/env';

/**
 * GET /api/ollama/health
 * 
 * Checks if Ollama server is running and returns configuration details.
 * 
 * Response (Ollama available):
 * ```json
 * {
 *   "available": true,
 *   "baseUrl": "http://localhost:11434",
 *   "defaultModel": "llama3.2"
 * }
 * ```
 * 
 * Response (Ollama unavailable):
 * ```json
 * {
 *   "available": false,
 *   "baseUrl": "http://localhost:11434",
 *   "error": "Connection refused"
 * }
 * ```
 */
export async function GET() {
  try {
    const available = await isOllamaAvailable();
    
    if (available) {
      return NextResponse.json({
        available: true,
        baseUrl: OLLAMA_CONFIG.baseUrl,
        defaultModel: OLLAMA_CONFIG.defaultModel,
        status: 'healthy'
      });
    }
    
    return NextResponse.json(
      {
        available: false,
        baseUrl: OLLAMA_CONFIG.baseUrl,
        defaultModel: OLLAMA_CONFIG.defaultModel,
        status: 'unavailable',
        error: 'Ollama server is not running. Please start Ollama with: ollama serve'
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Ollama health check failed:', error);
    return NextResponse.json(
      {
        available: false,
        baseUrl: OLLAMA_CONFIG.baseUrl,
        defaultModel: OLLAMA_CONFIG.defaultModel,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 503 }
    );
  }
}

// Made with Bob
