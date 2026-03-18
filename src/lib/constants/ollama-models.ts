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
  'qwen3.5': {
    name: 'qwen3.5',
    contextWindow: 128000,
    supportsImages: false,
    family: 'qwen',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'qwen3-coder-next': {
    name: 'qwen3-coder-next',
    contextWindow: 128000,
    supportsImages: false,
    family: 'qwen3next',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'moz123m/astronomy-bot': {
    name: 'moz123m/astronomy-bot',
    contextWindow: 8192,
    supportsImages: false,
    family: 'llama',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'vanta-research/atom-astronomy-7b': {
    name: 'vanta-research/atom-astronomy-7b',
    contextWindow: 8192,
    supportsImages: false,
    family: 'olmo2',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'gemini-3-flash-preview': {
    name: 'gemini-3-flash-preview',
    contextWindow: 128000,
    supportsImages: true,
    family: 'gemini',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'nemotron-3-nano': {
    name: 'nemotron-3-nano',
    contextWindow: 128000,
    supportsImages: false,
    family: 'nemotron_h_moe',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'gpt-oss': {
    name: 'gpt-oss',
    contextWindow: 128000,
    supportsImages: false,
    family: 'gptoss',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'granite4': {
    name: 'granite4',
    contextWindow: 128000,
    supportsImages: false,
    family: 'granite',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'all-minilm': {
    name: 'all-minilm',
    contextWindow: 512,
    supportsImages: false,
    family: 'bert',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'nomic-embed-text': {
    name: 'nomic-embed-text',
    contextWindow: 8192,
    supportsImages: false,
    family: 'nomic-bert',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  }
};

export const DEFAULT_OLLAMA_MODEL = 'qwen3.5';
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * Get model configuration by model identifier
 * Handles both base model names (e.g., 'llama3.2') and tagged versions (e.g., 'llama3.2:3b')
 */
export function getOllamaModelConfig(modelId: string): OllamaModelConfig | undefined {
  // First try exact match
  if (OLLAMA_MODEL_CONFIGS[modelId]) {
    return OLLAMA_MODEL_CONFIGS[modelId];
  }
  
  // If not found, try stripping the tag (everything after ':')
  const baseModelId = modelId.split(':')[0];
  if (baseModelId !== modelId && OLLAMA_MODEL_CONFIGS[baseModelId]) {
    return OLLAMA_MODEL_CONFIGS[baseModelId];
  }
  
  return undefined;
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
