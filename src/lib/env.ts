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

// Made with Bob
