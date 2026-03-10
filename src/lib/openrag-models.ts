/**
 * OpenRAG Dynamic Model Fetching Utilities
 * 
 * Provides functions to retrieve current model configurations from OpenRAG
 * instead of relying on hardcoded values. Includes error handling and fallbacks
 * to ensure application stability.
 * 
 * @module openrag-models
 */

import {
  OpenRAGClient,
  OpenRAGError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  type SettingsResponse
} from 'openrag-sdk';
import { SUPPORTED_MODELS, ModelConfig } from '@/lib/constants/models';

/**
 * OpenRAG settings response structure
 * Re-exported from SDK for convenience
 */
export type OpenRAGSettings = SettingsResponse;

/**
 * Flattened settings for easier access
 */
export interface FlattenedSettings {
  /** Currently active LLM model identifier */
  llm_model: string | null;
  /** Currently active embedding model identifier */
  embedding_model: string | null;
  /** LLM provider (e.g., 'openai', 'anthropic') */
  llm_provider: string | null;
  /** Embedding provider (e.g., 'openai', 'cohere') */
  embedding_provider: string | null;
  /** Chunk size for document splitting */
  chunk_size: number | null;
  /** Chunk overlap for document splitting */
  chunk_overlap: number | null;
}

/**
 * Model information from OpenRAG
 */
export interface OpenRAGModelInfo {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Provider name */
  provider: string;
  /** Whether the model is currently active */
  isActive: boolean;
  /** Model type (llm or embedding) */
  type: 'llm' | 'embedding';
}

/**
 * Result from fetching OpenRAG settings
 */
export interface SettingsResult {
  /** Whether the fetch was successful */
  success: boolean;
  /** The settings data if successful */
  settings?: OpenRAGSettings;
  /** Flattened settings for easier access */
  flattened?: FlattenedSettings;
  /** Error message if failed */
  error?: string;
  /** Whether fallback data is being used */
  usingFallback: boolean;
}

/**
 * Result from fetching available models
 */
export interface ModelsResult {
  /** Whether the fetch was successful */
  success: boolean;
  /** List of available models if successful */
  models?: OpenRAGModelInfo[];
  /** Error message if failed */
  error?: string;
  /** Whether fallback data is being used */
  usingFallback: boolean;
}

/**
 * Custom error class for OpenRAG model operations
 */
export class OpenRAGModelsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OpenRAGModelsError';
  }
}

/**
 * Singleton OpenRAG client instance
 */
let openragClient: OpenRAGClient | null = null;

/**
 * Get or create OpenRAG client instance
 * 
 * @returns OpenRAG client instance
 * @throws {OpenRAGModelsError} If environment variables are not configured
 * 
 * @example
 * ```typescript
 * const client = getClient();
 * const settings = await client.settings.get();
 * ```
 */
function getClient(): OpenRAGClient {
  if (!openragClient) {
    // Validate environment variables
    if (!process.env.OPENRAG_API_KEY) {
      throw new OpenRAGModelsError(
        'OPENRAG_API_KEY environment variable is not set',
        'MISSING_API_KEY'
      );
    }
    if (!process.env.OPENRAG_URL) {
      throw new OpenRAGModelsError(
        'OPENRAG_URL environment variable is not set',
        'MISSING_URL'
      );
    }

    openragClient = new OpenRAGClient({
      apiKey: process.env.OPENRAG_API_KEY,
      baseUrl: process.env.OPENRAG_URL,
    });
  }
  return openragClient;
}

/**
 * Convert OpenRAG SDK errors to OpenRAGModelsError
 * 
 * @param error - Error from OpenRAG SDK
 * @returns OpenRAGModelsError with appropriate code and message
 */
function handleOpenRAGError(error: unknown): OpenRAGModelsError {
  if (error instanceof AuthenticationError) {
    return new OpenRAGModelsError(
      'Authentication failed. Please check your OPENRAG_API_KEY.',
      'AUTHENTICATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof NotFoundError) {
    return new OpenRAGModelsError(
      'Resource not found in OpenRAG.',
      'NOT_FOUND_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ValidationError) {
    return new OpenRAGModelsError(
      'Invalid request to OpenRAG.',
      'VALIDATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof RateLimitError) {
    return new OpenRAGModelsError(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof ServerError) {
    return new OpenRAGModelsError(
      'OpenRAG server error. Please try again later.',
      'SERVER_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof OpenRAGError) {
    return new OpenRAGModelsError(
      `OpenRAG error: ${error.message}`,
      'OPENRAG_ERROR',
      { originalError: error.message, statusCode: error.statusCode }
    );
  }
  
  if (error instanceof Error) {
    return new OpenRAGModelsError(
      `Unexpected error: ${error.message}`,
      'UNEXPECTED_ERROR',
      { originalError: error.message }
    );
  }
  
  return new OpenRAGModelsError(
    'Unknown error occurred',
    'UNKNOWN_ERROR'
  );
}

/**
 * Flatten nested settings structure for easier access
 *
 * @param settings - Nested settings from SDK
 * @returns Flattened settings object
 */
function flattenSettings(settings: SettingsResponse): FlattenedSettings {
  return {
    llm_model: settings.agent.llm_model ?? null,
    llm_provider: settings.agent.llm_provider ?? null,
    embedding_model: settings.knowledge.embedding_model ?? null,
    embedding_provider: settings.knowledge.embedding_provider ?? null,
    chunk_size: settings.knowledge.chunk_size ?? null,
    chunk_overlap: settings.knowledge.chunk_overlap ?? null,
  };
}

/**
 * Fetch current OpenRAG settings including active models
 *
 * This function retrieves the current configuration from OpenRAG, including
 * which LLM and embedding models are currently active. If the API call fails,
 * it returns an error result without throwing.
 *
 * @returns Promise resolving to settings result with success status
 *
 * @example
 * ```typescript
 * const result = await getOpenRAGSettings();
 * if (result.success && result.flattened) {
 *   console.log('Active LLM:', result.flattened.llm_model);
 *   console.log('Provider:', result.flattened.llm_provider);
 * } else {
 *   console.error('Failed to fetch settings:', result.error);
 * }
 * ```
 */
export async function getOpenRAGSettings(): Promise<SettingsResult> {
  try {
    const client = getClient();
    const settings = await client.settings.get();
    
    return {
      success: true,
      settings,
      flattened: flattenSettings(settings),
      usingFallback: false
    };
  } catch (error) {
    const openragError = handleOpenRAGError(error);
    
    console.error('Failed to fetch OpenRAG settings:', openragError.message);
    
    return {
      success: false,
      error: openragError.message,
      usingFallback: false
    };
  }
}

/**
 * Get available models from OpenRAG
 * 
 * **IMPORTANT LIMITATION**: The current OpenRAG SDK (v0.1.3) does not provide
 * a direct method to list all available models. This function attempts to
 * extract model information from settings, but has limited capabilities.
 * 
 * **Recommended Alternative**: Use the MCP server's `openrag_list_models` tool
 * which provides comprehensive model listing by provider.
 * 
 * @returns Promise resolving to models result with available models
 * 
 * @example
 * ```typescript
 * const result = await getAvailableModels();
 * if (result.success && result.models) {
 *   result.models.forEach(model => {
 *     console.log(`${model.name} (${model.provider})`);
 *   });
 * } else if (result.usingFallback) {
 *   console.log('Using hardcoded model list');
 * }
 * ```
 */
export async function getAvailableModels(): Promise<ModelsResult> {
  try {
    // Attempt to get settings to extract active models
    const settingsResult = await getOpenRAGSettings();
    
    if (!settingsResult.success || !settingsResult.flattened) {
      // Fall back to hardcoded models
      return getFallbackModels();
    }
    
    const flat = settingsResult.flattened;
    const models: OpenRAGModelInfo[] = [];
    
    // Extract LLM model information
    if (flat.llm_model && flat.llm_provider) {
      models.push({
        id: flat.llm_model,
        name: formatModelName(flat.llm_model),
        provider: flat.llm_provider,
        isActive: true,
        type: 'llm'
      });
    }
    
    // Extract embedding model information
    if (flat.embedding_model && flat.embedding_provider) {
      models.push({
        id: flat.embedding_model,
        name: formatModelName(flat.embedding_model),
        provider: flat.embedding_provider,
        isActive: true,
        type: 'embedding'
      });
    }
    
    // Note: This only returns currently active models
    // For a complete list, the MCP server's openrag_list_models should be used
    return {
      success: true,
      models,
      usingFallback: false
    };
    
  } catch (error) {
    const openragError = handleOpenRAGError(error);
    
    console.error('Failed to fetch available models:', openragError.message);
    
    // Fall back to hardcoded models
    return getFallbackModels();
  }
}

/**
 * Get fallback model list from hardcoded constants
 * 
 * This function provides a fallback when the OpenRAG API is unavailable.
 * It converts the hardcoded SUPPORTED_MODELS into the OpenRAGModelInfo format.
 * 
 * @returns Models result with fallback data
 * 
 * @example
 * ```typescript
 * const result = getFallbackModels();
 * console.log(`Using ${result.models?.length} fallback models`);
 * ```
 */
export function getFallbackModels(): ModelsResult {
  const models: OpenRAGModelInfo[] = Object.entries(SUPPORTED_MODELS)
    .filter(([_, config]) => config.available)
    .map(([id, config]) => ({
      id,
      name: config.name,
      provider: config.provider,
      isActive: false, // We don't know which are active without API
      type: 'llm' as const
    }));
  
  return {
    success: true,
    models,
    usingFallback: true
  };
}

/**
 * Format model ID into a human-readable name
 * 
 * @param modelId - Model identifier (e.g., 'gpt-4-turbo')
 * @returns Formatted display name (e.g., 'GPT-4 Turbo')
 * 
 * @example
 * ```typescript
 * const name = formatModelName('gpt-4-turbo');
 * console.log(name); // "GPT-4 Turbo"
 * ```
 */
function formatModelName(modelId: string): string {
  // Check if we have a hardcoded name
  const config = SUPPORTED_MODELS[modelId];
  if (config) {
    return config.name;
  }
  
  // Otherwise, format the ID
  return modelId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Get the currently active LLM model from OpenRAG
 * 
 * @returns Promise resolving to active model ID or null if unavailable
 * 
 * @example
 * ```typescript
 * const activeModel = await getActiveModel();
 * if (activeModel) {
 *   console.log('Using model:', activeModel);
 * }
 * ```
 */
export async function getActiveModel(): Promise<string | null> {
  const result = await getOpenRAGSettings();
  
  if (result.success && result.flattened) {
    return result.flattened.llm_model;
  }
  
  return null;
}

/**
 * Get model configuration with dynamic fallback
 * 
 * Attempts to get model info from OpenRAG, falls back to hardcoded config.
 * This provides a seamless experience even when the API is unavailable.
 * 
 * @param modelId - Model identifier
 * @returns Promise resolving to model configuration or undefined
 * 
 * @example
 * ```typescript
 * const config = await getModelConfig('gpt-4-turbo');
 * if (config) {
 *   console.log('Context window:', config.contextWindow);
 * }
 * ```
 */
export async function getModelConfig(modelId: string): Promise<ModelConfig | undefined> {
  // First, try to get from hardcoded constants (always available)
  const hardcodedConfig = SUPPORTED_MODELS[modelId];
  
  if (hardcodedConfig) {
    return hardcodedConfig;
  }
  
  // If not in hardcoded list, try to get from OpenRAG
  // (This would require additional SDK methods not currently available)
  console.warn(`Model ${modelId} not found in hardcoded list. Consider updating constants.`);
  
  return undefined;
}

/**
 * Check if OpenRAG API is accessible
 * 
 * Performs a lightweight check to verify API connectivity.
 * Useful for determining whether to use dynamic or fallback data.
 * 
 * @returns Promise resolving to true if API is accessible
 * 
 * @example
 * ```typescript
 * const isOnline = await isOpenRAGAvailable();
 * if (isOnline) {
 *   // Use dynamic model fetching
 * } else {
 *   // Use fallback models
 * }
 * ```
 */
export async function isOpenRAGAvailable(): Promise<boolean> {
  try {
    const result = await getOpenRAGSettings();
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Update OpenRAG settings (including active models)
 *
 * **Note**: This function allows updating the active LLM and embedding models
 * in OpenRAG. Use with caution as it affects the entire OpenRAG instance.
 *
 * @param updates - Settings to update (uses SDK's SettingsUpdateOptions)
 * @returns Promise resolving to success status
 * @throws {OpenRAGModelsError} If update fails
 *
 * @example
 * ```typescript
 * try {
 *   await updateOpenRAGSettings({
 *     llm_model: 'gpt-4-turbo',
 *     llm_provider: 'openai'
 *   });
 *   console.log('Settings updated successfully');
 * } catch (error) {
 *   console.error('Failed to update settings:', error);
 * }
 * ```
 */
export async function updateOpenRAGSettings(updates: {
  llm_model?: string;
  llm_provider?: string;
  embedding_model?: string;
  embedding_provider?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  system_prompt?: string;
}): Promise<boolean> {
  try {
    const client = getClient();
    
    // Validate updates
    if (!updates || typeof updates !== 'object') {
      throw new OpenRAGModelsError(
        'Invalid settings update object',
        'INVALID_UPDATES',
        { updates }
      );
    }
    
    await client.settings.update(updates);
    
    return true;
  } catch (error) {
    throw handleOpenRAGError(error);
  }
}

// Made with Bob