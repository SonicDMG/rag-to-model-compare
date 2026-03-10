/**
 * Model configuration constants for RAG comparison application
 * 
 * Includes context window limits, pricing information, and supported models
 * for various LLM providers (OpenAI, Anthropic, etc.)
 */

/**
 * Model pricing structure
 */
export interface ModelPricing {
  /** Cost per 1K input tokens in USD */
  input: number;
  /** Cost per 1K output tokens in USD */
  output: number;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  /** Display name for the model */
  name: string;
  /** Provider (e.g., 'openai', 'anthropic') */
  provider: string;
  /** Maximum context window size in tokens */
  contextWindow: number;
  /** Pricing information */
  pricing: ModelPricing;
  /** Whether the model is currently available */
  available: boolean;
}

/**
 * Context window limits for supported models (in tokens)
 * 
 * These represent the maximum number of tokens that can be used
 * in a single request (prompt + completion).
 */
export const MODEL_LIMITS: Record<string, number> = {
  // OpenAI Models
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,
  
  // Anthropic Claude Models
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-2.1': 200000,
  'claude-2': 100000,
  'claude-instant-1.2': 100000,
  
  // Google Models (if supported)
  'gemini-pro': 32768,
  'gemini-pro-vision': 16384,
} as const;

/**
 * Pricing per 1K tokens for supported models (in USD)
 * 
 * Prices are current as of March 2024 and may change.
 * Always verify with provider documentation for latest pricing.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
  },
  'gpt-4-turbo-preview': {
    input: 0.01,
    output: 0.03,
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
  },
  'gpt-4-32k': {
    input: 0.06,
    output: 0.12,
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
  },
  'gpt-3.5-turbo-16k': {
    input: 0.001,
    output: 0.002,
  },
  
  // Anthropic Claude Models
  'claude-3-opus': {
    input: 0.015,
    output: 0.075,
  },
  'claude-3-sonnet': {
    input: 0.003,
    output: 0.015,
  },
  'claude-3-haiku': {
    input: 0.00025,
    output: 0.00125,
  },
  'claude-2.1': {
    input: 0.008,
    output: 0.024,
  },
  'claude-2': {
    input: 0.008,
    output: 0.024,
  },
  'claude-instant-1.2': {
    input: 0.0008,
    output: 0.0024,
  },
  
  // Google Models
  'gemini-pro': {
    input: 0.00025,
    output: 0.0005,
  },
  'gemini-pro-vision': {
    input: 0.00025,
    output: 0.0005,
  },
} as const;

/**
 * Default model to use when none is specified
 */
export const DEFAULT_MODEL = 'gpt-4-turbo' as const;

/**
 * List of supported models with full configuration
 */
export const SUPPORTED_MODELS: Record<string, ModelConfig> = {
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-4-turbo'],
    pricing: MODEL_PRICING['gpt-4-turbo'],
    available: true,
  },
  'gpt-4-turbo-preview': {
    name: 'GPT-4 Turbo Preview',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-4-turbo-preview'],
    pricing: MODEL_PRICING['gpt-4-turbo-preview'],
    available: true,
  },
  'gpt-4': {
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-4'],
    pricing: MODEL_PRICING['gpt-4'],
    available: true,
  },
  'gpt-4-32k': {
    name: 'GPT-4 32K',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-4-32k'],
    pricing: MODEL_PRICING['gpt-4-32k'],
    available: true,
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-3.5-turbo'],
    pricing: MODEL_PRICING['gpt-3.5-turbo'],
    available: true,
  },
  'gpt-3.5-turbo-16k': {
    name: 'GPT-3.5 Turbo 16K',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-3.5-turbo-16k'],
    pricing: MODEL_PRICING['gpt-3.5-turbo-16k'],
    available: true,
  },
  'claude-3-opus': {
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: MODEL_LIMITS['claude-3-opus'],
    pricing: MODEL_PRICING['claude-3-opus'],
    available: true,
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: MODEL_LIMITS['claude-3-sonnet'],
    pricing: MODEL_PRICING['claude-3-sonnet'],
    available: true,
  },
  'claude-3-haiku': {
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: MODEL_LIMITS['claude-3-haiku'],
    pricing: MODEL_PRICING['claude-3-haiku'],
    available: true,
  },
  'claude-2.1': {
    name: 'Claude 2.1',
    provider: 'anthropic',
    contextWindow: MODEL_LIMITS['claude-2.1'],
    pricing: MODEL_PRICING['claude-2.1'],
    available: true,
  },
  'claude-2': {
    name: 'Claude 2',
    provider: 'anthropic',
    contextWindow: MODEL_LIMITS['claude-2'],
    pricing: MODEL_PRICING['claude-2'],
    available: true,
  },
  'claude-instant-1.2': {
    name: 'Claude Instant 1.2',
    provider: 'anthropic',
    contextWindow: MODEL_LIMITS['claude-instant-1.2'],
    pricing: MODEL_PRICING['claude-instant-1.2'],
    available: true,
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    provider: 'google',
    contextWindow: MODEL_LIMITS['gemini-pro'],
    pricing: MODEL_PRICING['gemini-pro'],
    available: false, // Set to true when implemented
  },
  'gemini-pro-vision': {
    name: 'Gemini Pro Vision',
    provider: 'google',
    contextWindow: MODEL_LIMITS['gemini-pro-vision'],
    pricing: MODEL_PRICING['gemini-pro-vision'],
    available: false, // Set to true when implemented
  },
} as const;

/**
 * Get model configuration by model ID
 * 
 * @param modelId - The model identifier
 * @returns Model configuration or undefined if not found
 * 
 * @example
 * ```typescript
 * const config = getModelConfig('gpt-4-turbo');
 * console.log(config?.contextWindow); // 128000
 * ```
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return SUPPORTED_MODELS[modelId];
}

/**
 * Get context window size for a model
 * 
 * @param modelId - The model identifier
 * @returns Context window size in tokens, or 0 if model not found
 * 
 * @example
 * ```typescript
 * const limit = getContextWindowSize('gpt-4-turbo'); // 128000
 * ```
 */
export function getContextWindowSize(modelId: string): number {
  return MODEL_LIMITS[modelId] || 0;
}

/**
 * Get pricing for a model
 * 
 * @param modelId - The model identifier
 * @returns Pricing information or undefined if not found
 * 
 * @example
 * ```typescript
 * const pricing = getModelPricing('gpt-4-turbo');
 * console.log(pricing?.input); // 0.01
 * ```
 */
export function getModelPricing(modelId: string): ModelPricing | undefined {
  return MODEL_PRICING[modelId];
}

/**
 * Calculate cost for a given number of tokens
 * 
 * @param modelId - The model identifier
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Total cost in USD, or 0 if model not found
 * 
 * @example
 * ```typescript
 * const cost = calculateCost('gpt-4-turbo', 1000, 500);
 * console.log(cost); // 0.025 (1000 * 0.01/1000 + 500 * 0.03/1000)
 * ```
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(modelId);
  
  if (!pricing) {
    return 0;
  }
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Check if a model is available
 * 
 * @param modelId - The model identifier
 * @returns True if model is available, false otherwise
 * 
 * @example
 * ```typescript
 * if (isModelAvailable('gpt-4-turbo')) {
 *   // Use the model
 * }
 * ```
 */
export function isModelAvailable(modelId: string): boolean {
  return SUPPORTED_MODELS[modelId]?.available ?? false;
}

/**
 * Get list of available models
 * 
 * @returns Array of available model IDs
 * 
 * @example
 * ```typescript
 * const models = getAvailableModels();
 * console.log(models); // ['gpt-4-turbo', 'gpt-4', ...]
 * ```
 */
export function getAvailableModels(): string[] {
  return Object.entries(SUPPORTED_MODELS)
    .filter(([_, config]) => config.available)
    .map(([id, _]) => id);
}

/**
 * Get models by provider
 * 
 * @param provider - Provider name ('openai', 'anthropic', 'google')
 * @returns Array of model IDs for the provider
 * 
 * @example
 * ```typescript
 * const openaiModels = getModelsByProvider('openai');
 * console.log(openaiModels); // ['gpt-4-turbo', 'gpt-4', ...]
 * ```
 */
export function getModelsByProvider(provider: string): string[] {
  return Object.entries(SUPPORTED_MODELS)
    .filter(([_, config]) => config.provider === provider)
    .map(([id, _]) => id);
}

// Made with Bob
