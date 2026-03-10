import { z } from 'zod';

// Environment variables schema
export const envSchema = z.object({
  OPENRAG_URL: z.string().url(),
  OPENRAG_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

// RAG Query schema
export const ragQuerySchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().optional().default(5),
  threshold: z.number().min(0).max(1).optional().default(0.7),
});

export type RagQuery = z.infer<typeof ragQuerySchema>;

// RAG Response schema
export const ragResponseSchema = z.object({
  results: z.array(
    z.object({
      content: z.string(),
      score: z.number(),
      metadata: z.record(z.unknown()).optional(),
    })
  ),
  query: z.string(),
  timestamp: z.string().datetime(),
});

export type RagResponse = z.infer<typeof ragResponseSchema>;

// Made with Bob
