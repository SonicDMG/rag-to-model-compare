/**
 * Ollama Models Detection API Route
 *
 * Provides endpoint for detecting available Ollama models on the local system.
 */

import { NextResponse } from 'next/server';
import { detectAvailableModels, isOllamaAvailable } from '@/lib/rag-comparison/clients/ollama-model-detector';

/**
 * GET /api/ollama/models
 * 
 * Detects and returns available Ollama models on the local system.
 * 
 * Response:
 * ```json
 * {
 *   "success": true,
 *   "models": ["llama3.2", "mistral", ...],
 *   "count": 2,
 *   "available": true
 * }
 * ```
 * 
 * Error Response (Ollama not running):
 * ```json
 * {
 *   "success": false,
 *   "error": "Ollama server is not running",
 *   "models": [],
 *   "available": false
 * }
 * ```
 */
export async function GET() {
  try {
    // Check if Ollama is available first
    const available = await isOllamaAvailable();
    
    if (!available) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ollama server is not running. Please start Ollama with: ollama serve',
          models: [],
          available: false
        },
        { status: 503 }
      );
    }

    // Detect available models
    const models = await detectAvailableModels();
    
    return NextResponse.json({
      success: true,
      models,
      count: models.length,
      available: true
    });
  } catch (error) {
    console.error('Failed to detect Ollama models:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect models',
        models: [],
        available: false
      },
      { status: 500 }
    );
  }
}

// Made with Bob
