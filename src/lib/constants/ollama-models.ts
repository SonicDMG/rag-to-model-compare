/**
 * Ollama Model Configurations
 * Defines available models and their characteristics
 */

export interface OllamaModelConfig {
  name: string;
  contextWindow: number;
  supportsImages: boolean;
  family: string;
  defaultParams: {
    temperature: number;
    top_p: number;
    top_k: number;
  };
}

export const OLLAMA_MODEL_CONFIGS: Record<string, OllamaModelConfig> = {
  'llama3.2': {
    name: 'Llama 3.2',
    contextWindow: 128000,
    supportsImages: false,
    family: 'llama',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'llama3.2-vision': {
    name: 'Llama 3.2 Vision',
    contextWindow: 128000,
    supportsImages: true,
    family: 'llama',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'llama3.1': {
    name: 'Llama 3.1',
    contextWindow: 128000,
    supportsImages: false,
    family: 'llama',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'mistral': {
    name: 'Mistral',
    contextWindow: 32768,
    supportsImages: false,
    family: 'mistral',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'mixtral': {
    name: 'Mixtral',
    contextWindow: 32768,
    supportsImages: false,
    family: 'mistral',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'phi3': {
    name: 'Phi-3',
    contextWindow: 128000,
    supportsImages: false,
    family: 'phi',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'qwen2.5': {
    name: 'Qwen 2.5',
    contextWindow: 128000,
    supportsImages: false,
    family: 'qwen',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  }
};

export const DEFAULT_OLLAMA_MODEL = 'llama3.2';
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * Get model configuration by model identifier
 */
export function getOllamaModelConfig(modelId: string): OllamaModelConfig | undefined {
  return OLLAMA_MODEL_CONFIGS[modelId];
}

/**
 * Check if a model supports image inputs
 */
export function supportsImages(modelId: string): boolean {
  const config = getOllamaModelConfig(modelId);
  return config?.supportsImages ?? false;
}

/**
 * Get all available Ollama model identifiers
 */
export function getAvailableOllamaModels(): string[] {
  return Object.keys(OLLAMA_MODEL_CONFIGS);
}

/**
 * Get model family
 */
export function getModelFamily(modelId: string): string | undefined {
  const config = getOllamaModelConfig(modelId);
  return config?.family;
}

// Made with Bob
