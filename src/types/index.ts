import { z } from 'zod';

// Environment variables schema
export const envSchema = z.object({
  OPENRAG_URL: z.string().url(),
  OPENRAG_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

// Made with Bob
