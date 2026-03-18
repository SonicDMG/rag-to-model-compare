import { envSchema } from '@/types';

function getEnv() {
  const env = {
    OPENRAG_URL: process.env.OPENRAG_URL,
    OPENRAG_API_KEY: process.env.OPENRAG_API_KEY,
  };

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(parsed.error.format())}`
    );
  }

  return parsed.data;
}

export const env = getEnv();

export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || '120000', 10)
} as const;

export function validateOllamaConfig(): boolean {
  try {
    new URL(OLLAMA_CONFIG.baseUrl);
    return true;
  } catch {
    console.warn('Invalid OLLAMA_BASE_URL, using default');
    return false;
  }
}

// Made with Bob
