/**
 * Model configuration constants for RAG comparison application
 *
 * Includes context window limits, pricing information, and supported models
 * for various LLM providers (OpenAI, Anthropic, etc.)
 */

/**
 * Pricing metadata for tracking source and update information
 */
export interface PricingMetadata {
  /** Source URL for pricing information */
  sourceUrl: string;
  /** Date when pricing was last updated (ISO 8601 format) */
  lastUpdated: string;
  /** Provider name */
  provider: string;
}

/**
 * Model pricing structure
 */
export interface ModelPricing {
  /** Cost per 1M input tokens in USD */
  input: number;
  /** Cost per 1M output tokens in USD */
  output: number;
  /** Optional: Cost per 1M cached input tokens in USD */
  cachedInput?: number;
  /** Optional: Long context pricing (for inputs >= 272K tokens) */
  longContext?: {
    /** Cost per 1M input tokens in USD for long context */
    input: number;
    /** Cost per 1M output tokens in USD for long context */
    output: number;
    /** Optional: Cost per 1M cached input tokens in USD for long context */
    cachedInput?: number;
  };
}

/**
 * Threshold for long context pricing (in tokens)
 * According to OpenAI: short context < 272K tokens, long context >= 272K tokens
 */
export const LONG_CONTEXT_THRESHOLD = 272000;

/**
 * Pricing metadata for OpenAI models
 * Source: https://platform.openai.com/docs/pricing
 * Last updated: 2026-03-13
 */
export const OPENAI_PRICING_METADATA: PricingMetadata = {
  sourceUrl: 'https://platform.openai.com/docs/pricing',
  lastUpdated: '2026-03-13',
  provider: 'openai',
};

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
  // Source: https://platform.openai.com/docs/pricing (Last updated: 2026-03-13)
  'gpt-5.4': 128000,
  'gpt-5.4-pro': 128000,
  'gpt-5.2': 128000,
  'gpt-5.1': 128000,
  'gpt-5': 128000,
  'gpt-5-mini': 128000,
  'gpt-5-nano': 128000,
  'gpt-4.1': 128000,
  'gpt-4.1-mini': 128000,
  'gpt-4.1-nano': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
} as const;

/**
 * Pricing per 1M tokens for supported models (in USD)
 *
 * OpenAI pricing source: https://platform.openai.com/docs/pricing
 * Last updated: 2026-03-13
 *
 * Prices may change. Always verify with provider documentation for latest pricing.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI GPT-5 Models
  // Source: https://platform.openai.com/docs/pricing (Last updated: 2026-03-13)
  'gpt-5.4': {
    input: 2.50,
    output: 15.00,
    cachedInput: 0.25,
    longContext: {
      input: 5.00,
      output: 22.50,
      cachedInput: 0.50,
    },
  },
  'gpt-5.4-pro': {
    input: 30.00,
    output: 180.00,
    longContext: {
      input: 60.00,
      output: 270.00,
    },
  },
  'gpt-5.2': {
    input: 1.75,
    output: 14.00,
    cachedInput: 0.175,
  },
  'gpt-5.1': {
    input: 1.25,
    output: 10.00,
    cachedInput: 0.125,
  },
  'gpt-5': {
    input: 1.25,
    output: 10.00,
    cachedInput: 0.125,
  },
  'gpt-5-mini': {
    input: 0.25,
    output: 2.00,
    cachedInput: 0.025,
  },
  'gpt-5-nano': {
    input: 0.05,
    output: 0.40,
    cachedInput: 0.005,
  },
  
  // OpenAI GPT-4 Models
  // Source: https://platform.openai.com/docs/pricing (Last updated: 2026-03-13)
  'gpt-4.1': {
    input: 2.00,
    output: 8.00,
    cachedInput: 0.50,
  },
  'gpt-4.1-mini': {
    input: 0.40,
    output: 1.60,
    cachedInput: 0.10,
  },
  'gpt-4.1-nano': {
    input: 0.10,
    output: 0.40,
    cachedInput: 0.025,
  },
  'gpt-4o': {
    input: 2.50,
    output: 10.00,
    cachedInput: 1.25,
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.60,
    cachedInput: 0.075,
  },
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
} as const;

/**
 * Default model to use when none is specified
 */
export const DEFAULT_MODEL = 'gpt-4o' as const;

/**
 * List of supported models with full configuration
 */
export const SUPPORTED_MODELS: Record<string, ModelConfig> = {
  // GPT-5 Models
  'gpt-5.4': {
    name: 'GPT-5.4',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-5.4'],
    pricing: MODEL_PRICING['gpt-5.4'],
    available: true,
  },
  'gpt-5.4-pro': {
    name: 'GPT-5.4 Pro',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-5.4-pro'],
    pricing: MODEL_PRICING['gpt-5.4-pro'],
    available: true,
  },
  'gpt-5': {
    name: 'GPT-5',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-5'],
    pricing: MODEL_PRICING['gpt-5'],
    available: true,
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-5-mini'],
    pricing: MODEL_PRICING['gpt-5-mini'],
    available: true,
  },
  'gpt-5-nano': {
    name: 'GPT-5 Nano',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-5-nano'],
    pricing: MODEL_PRICING['gpt-5-nano'],
    available: true,
  },
  
  // GPT-4 Models
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-4o'],
    pricing: MODEL_PRICING['gpt-4o'],
    available: true,
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-4o-mini'],
    pricing: MODEL_PRICING['gpt-4o-mini'],
    available: true,
  },
  'gpt-4': {
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: MODEL_LIMITS['gpt-4'],
    pricing: MODEL_PRICING['gpt-4'],
    available: true,
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
 * console.log(cost); // 0.000025 (1000 * 0.01/1000000 + 500 * 0.03/1000000)
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
  
  // Determine if we should use long context pricing
  const useLongContext = inputTokens >= LONG_CONTEXT_THRESHOLD && pricing.longContext;
  const effectivePricing = useLongContext ? pricing.longContext! : pricing;
  
  const inputCost = (inputTokens / 1000000) * effectivePricing.input;
  const outputCost = (outputTokens / 1000000) * effectivePricing.output;
  
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

/**
 * Get the effective pricing for a model based on input token count
 *
 * @param modelId - The model identifier
 * @param inputTokens - Number of input tokens
 * @returns Effective pricing (short or long context) and whether long context pricing was used
 *
 * @example
 * ```typescript
 * const { pricing, isLongContext } = getEffectivePricing('gpt-5.4', 300000);
 * console.log(isLongContext); // true
 * console.log(pricing.input); // 5.00 (long context rate)
 * ```
 */
export function getEffectivePricing(
  modelId: string,
  inputTokens: number
): { pricing: ModelPricing | undefined; isLongContext: boolean } {
  const basePricing = getModelPricing(modelId);
  
  if (!basePricing) {
    return { pricing: undefined, isLongContext: false };
  }
  
  const isLongContext = inputTokens >= LONG_CONTEXT_THRESHOLD && !!basePricing.longContext;
  
  if (isLongContext && basePricing.longContext) {
    // Return long context pricing as a full ModelPricing object
    return {
      pricing: {
        input: basePricing.longContext.input,
        output: basePricing.longContext.output,
        cachedInput: basePricing.longContext.cachedInput,
      },
      isLongContext: true,
    };
  }
  
  return { pricing: basePricing, isLongContext: false };
}

/**
 * Get pricing metadata for a model's provider
 *
 * @param modelId - The model identifier
 * @returns Pricing metadata or undefined if not available
 *
 * @example
 * ```typescript
 * const metadata = getPricingMetadata('gpt-5.4');
 * console.log(metadata?.sourceUrl); // 'https://platform.openai.com/docs/pricing'
 * ```
 */
export function getPricingMetadata(modelId: string): PricingMetadata | undefined {
  const config = getModelConfig(modelId);
  
  if (!config) {
    return undefined;
  }
  
  // Return metadata based on provider
  if (config.provider === 'openai') {
    return OPENAI_PRICING_METADATA;
  }
  
  return undefined;
}

// Made with Bob
