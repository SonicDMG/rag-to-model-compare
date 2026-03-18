/**
 * Ollama Model Detection and Validation
 *
 * Provides functionality to detect available Ollama models from the server,
 * validate model capabilities, and extract model information.
 */

import { OllamaClient } from './ollama-client';
import { OLLAMA_CONFIG } from '@/lib/env';
import { getOllamaModelConfig } from '@/lib/constants/ollama-models';

/**
 * Detailed information about an Ollama model
 */
export interface OllamaModelInfo {
  /** Model name (e.g., "llama3.2:3b") */
  name: string;
  /** Display-friendly name */
  displayName: string;
  /** Context window size in tokens */
  contextWindow: number;
  /** Whether the model supports image inputs */
  supportsImages: boolean;
  /** Parameter size (e.g., "3B", "8B") */
  parameterSize: string;
  /** Quantization level (e.g., "Q4_0", "Q8_0") */
  quantization: string;
  /** Model family (e.g., "llama", "mistral") */
  family: string;
}

/**
 * Parsed model name components
 */
export interface ParsedModelName {
  /** Model family (e.g., "llama", "mistral") */
  family: string;
  /** Version number (e.g., "3.2", "7") */
  version?: string;
  /** Parameter size (e.g., "3b", "8b") */
  size?: string;
  /** Quantization (e.g., "q4_0", "q8_0") */
  quantization?: string;
}

/**
 * Cache for detected models
 */
interface ModelCache {
  models: OllamaModelInfo[];
  timestamp: number;
}

let modelCache: ModelCache | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse model name to extract family, version, and size
 * 
 * Examples:
 * - "llama3.2:3b" -> { family: "llama", version: "3.2", size: "3b" }
 * - "mistral:7b-instruct-q4_0" -> { family: "mistral", size: "7b", quantization: "q4_0" }
 * - "llava:13b" -> { family: "llava", size: "13b" }
 * 
 * @param modelName - Full model name from Ollama
 * @returns Parsed model components
 */
export function parseModelName(modelName: string): ParsedModelName {
  if (!modelName || typeof modelName !== 'string') {
    return { family: 'unknown' };
  }

  // Sanitize input
  const sanitized = modelName.toLowerCase().trim();
  
  // Split on colon to separate base name from tag
  const [baseName, tag] = sanitized.split(':');
  
  // Extract family (first part before numbers)
  const familyMatch = baseName.match(/^([a-z]+)/);
  const family = familyMatch ? familyMatch[1] : baseName;
  
  // Extract version (numbers with dots in base name)
  const versionMatch = baseName.match(/(\d+(?:\.\d+)*)/);
  const version = versionMatch ? versionMatch[1] : undefined;
  
  // Extract size from tag (e.g., "3b", "7b", "13b")
  const sizeMatch = tag?.match(/(\d+b)/);
  const size = sizeMatch ? sizeMatch[1] : undefined;
  
  // Extract quantization from tag (e.g., "q4_0", "q8_0")
  const quantMatch = tag?.match(/(q\d+_\d+)/);
  const quantization = quantMatch ? quantMatch[1] : undefined;
  
  return {
    family,
    version,
    size,
    quantization
  };
}

/**
 * Format model name for display while preserving important information
 *
 * Examples:
 *   "gpt-oss:120b-cloud" -> "GPT-OSS 120B Cloud"
 *   "gemini-3-flash-preview:cloud" -> "Gemini 3 Flash Preview Cloud"
 *   "llama3.2:3b" -> "Llama 3.2 3B"
 *   "qwen3-coder-next:cloud" -> "Qwen3 Coder Next Cloud"
 *   "granite4:latest" -> "Granite4 Latest"
 *   "moz123m/astronomy-bot:latest" -> "Moz123m/Astronomy Bot Latest"
 *
 * @param modelName - Full model name from Ollama
 * @returns Formatted display name
 */
export function formatModelDisplayName(modelName: string): string {
  if (!modelName || typeof modelName !== 'string') {
    return 'Unknown Model';
  }

  // Common acronyms that should be fully uppercase
  const acronyms = ['gpt', 'oss', 'llm', 'ai', 'ml', 'api'];

  // Split on colon to separate base name from tag
  const [baseName, tag] = modelName.split(':');
  
  // Format the base name
  const formattedBase = baseName
    .split(/[-_]/)
    .map(part => {
      // Preserve version numbers like "3.2" or standalone numbers
      if (/^\d+(\.\d+)?$/.test(part)) {
        return part;
      }
      // Preserve paths like "moz123m/astronomy"
      if (part.includes('/')) {
        return part.split('/').map(subpart =>
          subpart.charAt(0).toUpperCase() + subpart.slice(1)
        ).join('/');
      }
      // Check if it's a known acronym
      if (acronyms.includes(part.toLowerCase())) {
        return part.toUpperCase();
      }
      // Capitalize first letter of each word
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
  
  // Format the tag if present
  if (tag) {
    const formattedTag = tag
      .split('-')
      .map(part => {
        // Uppercase size indicators like "120b", "3b", "30b"
        if (/^\d+b$/i.test(part)) {
          return part.toUpperCase();
        }
        // Capitalize other parts like "cloud", "latest", "instruct"
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
    
    return `${formattedBase} ${formattedTag}`;
  }
  
  return formattedBase;
}

/**
 * Check if a model is an embedding model (not for text generation)
 *
 * @param modelName - Model name to check
 * @returns True if model is an embedding model
 */
export function isEmbeddingModel(modelName: string): boolean {
  const lowerName = modelName.toLowerCase();
  
  // Common embedding model patterns
  const embeddingPatterns = [
    'embed',
    'embedding',
    'nomic-embed',
    'mxbai-embed',
    'all-minilm',
    'bge-',
    'gte-'
  ];
  
  return embeddingPatterns.some(pattern => lowerName.includes(pattern));
}

/**
 * Check if a model supports multimodal inputs (images)
 *
 * @param modelName - Model name to check
 * @returns True if model supports images
 */
export function isMultimodalModel(modelName: string): boolean {
  const parsed = parseModelName(modelName);
  
  // Known multimodal model families
  const multimodalFamilies = ['llava', 'bakllava', 'moondream'];
  
  return multimodalFamilies.includes(parsed.family);
}

/**
 * Get the context window size for a model
 * 
 * @param modelName - Model name
 * @returns Context window size in tokens
 */
export function getContextWindowSize(modelName: string): number {
  const config = getOllamaModelConfig(modelName);
  return config?.contextWindow || 2048; // Default fallback
}

/**
 * Convert Ollama API model to OllamaModelInfo
 *
 * @param apiModel - Model from Ollama API
 * @returns Formatted model info
 */
function convertApiModelToInfo(apiModel: any): OllamaModelInfo {
  const parsed = parseModelName(apiModel.name);
  const config = getOllamaModelConfig(apiModel.name);
  
  // Extract parameter size from API details or parsed name
  const parameterSize = apiModel.details?.parameter_size ||
                       parsed.size?.toUpperCase() ||
                       'Unknown';
  
  // Extract quantization from API details or parsed name
  const quantization = apiModel.details?.quantization_level ||
                      parsed.quantization?.toUpperCase() ||
                      'Unknown';
  
  // Use the formatted model name directly (preserves full model name with proper capitalization)
  const displayName = formatModelDisplayName(apiModel.name);
  
  return {
    name: apiModel.name, // Keep the full original name for API calls
    displayName, // Human-readable formatted name
    contextWindow: config?.contextWindow || 2048,
    supportsImages: isMultimodalModel(apiModel.name),
    parameterSize,
    quantization,
    family: parsed.family
  };
}

/**
 * Detect available Ollama models from the server
 * 
 * Queries the Ollama API to get a list of installed models and returns
 * detailed information about each one. Results are cached for 5 minutes.
 * 
 * @returns Promise resolving to array of model information
 * 
 * @example
 * ```typescript
 * const models = await detectAvailableModels();
 * console.log(`Found ${models.length} models`);
 * models.forEach(m => console.log(`- ${m.displayName} (${m.contextWindow} tokens)`));
 * ```
 */
export async function detectAvailableModels(): Promise<OllamaModelInfo[]> {
  try {
    // Check cache first
    if (modelCache && Date.now() - modelCache.timestamp < CACHE_DURATION_MS) {
      console.log('[Ollama Model Detector] Using cached models');
      return modelCache.models;
    }

    console.log('[Ollama Model Detector] Fetching models from Ollama server...');
    
    // Validate configuration
    if (!OLLAMA_CONFIG.baseUrl) {
      console.warn('[Ollama Model Detector] Ollama base URL not configured');
      return [];
    }

    // Create client
    const client = new OllamaClient({
      baseUrl: OLLAMA_CONFIG.baseUrl,
      timeout: 10000, // 10 second timeout for listing
      maxRetries: 2
    });

    // Fetch models from Ollama
    const response = await client.listModels();
    
    if (!response || !Array.isArray(response)) {
      console.warn('[Ollama Model Detector] Invalid response from Ollama API');
      return [];
    }

    console.log(`[Ollama Model Detector] Found ${response.length} models`);

    // Convert to OllamaModelInfo and filter out embedding models
    const models = response
      .filter((model: any) => !isEmbeddingModel(model.name))
      .map(convertApiModelToInfo);
    
    console.log(`[Ollama Model Detector] ${models.length} inference models after filtering`);
    
    // Sort by family and size
    models.sort((a: OllamaModelInfo, b: OllamaModelInfo) => {
      if (a.family !== b.family) {
        return a.family.localeCompare(b.family);
      }
      return a.name.localeCompare(b.name);
    });

    // Update cache
    modelCache = {
      models,
      timestamp: Date.now()
    };

    console.log('[Ollama Model Detector] Models cached successfully');
    
    return models;

  } catch (error) {
    console.error('[Ollama Model Detector] Error detecting models:', error);
    
    // Return empty array on error (don't throw)
    // This allows the application to continue even if Ollama is not running
    return [];
  }
}

/**
 * Get detailed information about a specific model
 * 
 * @param modelName - Name of the model to get info for
 * @returns Promise resolving to model info or null if not found
 * 
 * @example
 * ```typescript
 * const info = await getModelInfo('llama3.2:3b');
 * if (info) {
 *   console.log(`Context window: ${info.contextWindow} tokens`);
 *   console.log(`Supports images: ${info.supportsImages}`);
 * }
 * ```
 */
export async function getModelInfo(modelName: string): Promise<OllamaModelInfo | null> {
  try {
    // Sanitize input
    if (!modelName || typeof modelName !== 'string') {
      return null;
    }

    const sanitized = modelName.trim();
    if (sanitized.length === 0) {
      return null;
    }

    // Get all models
    const models = await detectAvailableModels();
    
    // Find matching model
    const model = models.find(m => m.name === sanitized);
    
    return model || null;

  } catch (error) {
    console.error('[Ollama Model Detector] Error getting model info:', error);
    return null;
  }
}

/**
 * Invalidate the model cache
 * 
 * Forces the next call to detectAvailableModels() to fetch fresh data
 * from the Ollama server.
 * 
 * @example
 * ```typescript
 * // After installing a new model
 * invalidateModelCache();
 * const models = await detectAvailableModels(); // Will fetch fresh data
 * ```
 */
export function invalidateModelCache(): void {
  modelCache = null;
  console.log('[Ollama Model Detector] Model cache invalidated');
}

/**
 * Check if Ollama server is available
 * 
 * @returns Promise resolving to true if server is reachable
 * 
 * @example
 * ```typescript
 * const available = await isOllamaAvailable();
 * if (!available) {
 *   console.log('Ollama server is not running');
 * }
 * ```
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    if (!OLLAMA_CONFIG.baseUrl) {
      return false;
    }

    const client = new OllamaClient({
      baseUrl: OLLAMA_CONFIG.baseUrl,
      timeout: 5000,
      maxRetries: 1
    });

    await client.listModels();
    return true;

  } catch (error) {
    return false;
  }
}

/**
 * Get recommended models for different use cases
 * 
 * @returns Object with recommended model names for different scenarios
 * 
 * @example
 * ```typescript
 * const recommendations = getRecommendedModels();
 * console.log(`For speed: ${recommendations.speed}`);
 * console.log(`For quality: ${recommendations.quality}`);
 * ```
 */
export function getRecommendedModels(): {
  speed: string[];
  quality: string[];
  multimodal: string[];
  balanced: string[];
} {
  return {
    speed: ['llama3.2:3b', 'phi3:mini', 'gemma2:2b'],
    quality: ['llama3.1:8b', 'mistral:7b', 'llama3.2:8b'],
    multimodal: ['llava:7b', 'llava:13b', 'bakllava'],
    balanced: ['llama3.2:3b', 'mistral:7b', 'phi3:medium']
  };
}

// Made with Bob