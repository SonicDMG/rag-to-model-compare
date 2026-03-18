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
  },
  'qwen3': {
    name: 'Qwen 3',
    contextWindow: 128000,
    supportsImages: false,
    family: 'qwen',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'qwen3.5': {
    name: 'Qwen 3.5',
    contextWindow: 128000,
    supportsImages: false,
    family: 'qwen',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'qwen3-coder-next': {
    name: 'Qwen 3 Coder Next',
    contextWindow: 128000,
    supportsImages: false,
    family: 'qwen3next',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash Preview',
    contextWindow: 128000,
    supportsImages: true,
    family: 'gemini',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'nemotron-3-nano': {
    name: 'Nemotron 3 Nano',
    contextWindow: 128000,
    supportsImages: false,
    family: 'nemotron_h_moe',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'gpt-oss': {
    name: 'GPT-OSS',
    contextWindow: 128000,
    supportsImages: false,
    family: 'gptoss',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  },
  'granite4': {
    name: 'Granite 4',
    contextWindow: 128000,
    supportsImages: false,
    family: 'granite',
    defaultParams: { temperature: 0.7, top_p: 0.9, top_k: 40 }
  }
};

export const DEFAULT_OLLAMA_MODEL = 'llama3.2';
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
