/**
 * Token counting utilities for text content
 *
 * Uses js-tiktoken for accurate token counting with GPT-style tokenizers.
 * Falls back to heuristic estimation if tiktoken fails.
 */

import { Tiktoken, encodingForModel } from 'js-tiktoken';

/**
 * Average characters per token for fallback estimation
 */
const CHARS_PER_TOKEN = 4;

/**
 * Cache for tiktoken encoders to avoid recreating them
 */
let cachedEncoder: Tiktoken | null = null;
let cachedEncoderModel: string | null = null;

/**
 * Get or create a tiktoken encoder for the specified model
 *
 * @param model - Model name (e.g., 'gpt-4', 'gpt-3.5-turbo')
 * @returns Tiktoken encoder instance
 */
function getEncoder(model: string = 'gpt-4o'): Tiktoken | null {
  try {
    // Reuse cached encoder if same model
    if (cachedEncoder && cachedEncoderModel === model) {
      return cachedEncoder;
    }
    
    // Create new encoder
    cachedEncoder = encodingForModel(model as any);
    cachedEncoderModel = model;
    return cachedEncoder;
  } catch (error) {
    console.warn(`[Token Estimator] Failed to create tiktoken encoder for model ${model}:`, error);
    return null;
  }
}

/**
 * Fallback heuristic token estimation
 * Uses whitespace-aware estimation for better accuracy with PDFs
 */
function estimateTokensHeuristic(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Calculate whitespace ratio to detect sparse content (like PDFs)
  const whitespaceCount = (text.match(/\s/g) || []).length;
  const whitespaceRatio = whitespaceCount / text.length;
  
  // Adjust chars per token based on whitespace density
  let adjustedCharsPerToken = CHARS_PER_TOKEN;
  
  if (whitespaceRatio > 0.3) {
    adjustedCharsPerToken = 5.5; // Sparse content (PDFs, tables)
  } else if (whitespaceRatio > 0.2) {
    adjustedCharsPerToken = 4.75; // Moderate spacing
  } else if (whitespaceRatio < 0.15) {
    adjustedCharsPerToken = 3.5; // Very dense text
  }
  
  // Count characters without normalization to preserve actual text structure
  // Whitespace is significant for token counting
  const charCount = text.length;
  
  return Math.ceil(charCount / adjustedCharsPerToken);
}

/**
 * Counts the exact number of tokens in a given text string using tiktoken
 *
 * Uses the GPT-4 tokenizer by default for accurate token counting.
 * Falls back to heuristic estimation if tiktoken fails.
 *
 * @param text - The text to count tokens for
 * @param model - Model name for tokenizer selection (default: 'gpt-4o')
 * @returns Exact number of tokens
 *
 * @example
 * ```typescript
 * const text = "Hello, world! This is a test.";
 * const tokens = estimateTokens(text); // Returns exact token count
 * ```
 */
export function estimateTokens(text: string, model: string = 'gpt-4o'): number {
  if (!text || text.length === 0) {
    return 0;
  }

  const startTime = performance.now();
  const textLength = text.length;
  const textPreview = text.substring(0, 100).replace(/\n/g, '\\n');

  try {
    const encoder = getEncoder(model);
    
    if (encoder) {
      // Use tiktoken for accurate counting
      const tokens = encoder.encode(text);
      const tokenCount = tokens.length;
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Calculate actual chars per token ratio
      const actualRatio = textLength / tokenCount;
      
      console.log('[Token Estimator] 🔢 Tiktoken counting:');
      console.log(`  Model: ${model}`);
      console.log(`  Text length: ${textLength.toLocaleString()} chars`);
      console.log(`  Token count: ${tokenCount.toLocaleString()} tokens`);
      console.log(`  Actual ratio: ${actualRatio.toFixed(2)} chars/token`);
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Text preview: "${textPreview}..."`);
      
      return tokenCount;
    }
    
    // Fallback to heuristic if encoder creation failed
    const heuristicCount = estimateTokensHeuristic(text);
    console.warn('[Token Estimator] ⚠️ Using fallback heuristic estimation');
    console.warn(`  Text length: ${textLength.toLocaleString()} chars`);
    console.warn(`  Estimated tokens: ${heuristicCount.toLocaleString()}`);
    return heuristicCount;
    
  } catch (error) {
    // Fallback to heuristic on any error
    const heuristicCount = estimateTokensHeuristic(text);
    console.warn('[Token Estimator] ❌ Tiktoken failed, using fallback:', error);
    console.warn(`  Text length: ${textLength.toLocaleString()} chars`);
    console.warn(`  Estimated tokens: ${heuristicCount.toLocaleString()}`);
    return heuristicCount;
  }
}

/**
 * Alias for estimateTokens for backward compatibility
 *
 * @param text - The text to count tokens for
 * @param model - Model name for tokenizer selection (default: 'gpt-4o')
 * @returns Exact number of tokens
 *
 * @example
 * ```typescript
 * const tokens = countTokens("Hello, world!");
 * ```
 */
export function countTokens(text: string, model?: string): number {
  return estimateTokens(text, model);
}

/**
 * Clear the cached encoder to release memory
 * Call this when you're done with token counting operations
 *
 * @example
 * ```typescript
 * // After processing many documents
 * clearEncoderCache();
 * ```
 */
export function clearEncoderCache(): void {
  cachedEncoder = null;
  cachedEncoderModel = null;
}

/**
 * Estimates tokens for an array of text strings
 * 
 * @param texts - Array of text strings
 * @returns Total estimated token count across all texts
 * 
 * @example
 * ```typescript
 * const texts = ["First chunk", "Second chunk", "Third chunk"];
 * const total = estimateTokensForArray(texts); // Returns total tokens
 * ```
 */
export function estimateTokensForArray(texts: string[]): number {
  return texts.reduce((total, text) => total + estimateTokens(text), 0);
}

/**
 * Checks if text exceeds a token limit
 * 
 * @param text - The text to check
 * @param limit - Maximum allowed tokens
 * @returns True if text exceeds the limit
 * 
 * @example
 * ```typescript
 * const exceedsLimit = exceedsTokenLimit(longText, 4096);
 * if (exceedsLimit) {
 *   console.log("Text is too long!");
 * }
 * ```
 */
export function exceedsTokenLimit(text: string, limit: number): boolean {
  return estimateTokens(text) > limit;
}

/**
 * Truncates text to fit within a token limit
 * 
 * @param text - The text to truncate
 * @param maxTokens - Maximum allowed tokens
 * @returns Truncated text that fits within the token limit
 * 
 * @example
 * ```typescript
 * const truncated = truncateToTokenLimit(longText, 100);
 * ```
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const currentTokens = estimateTokens(text);
  
  if (currentTokens <= maxTokens) {
    return text;
  }
  
  // Calculate approximate character limit
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  
  // Truncate and add ellipsis
  const truncated = text.slice(0, maxChars - 3) + '...';
  
  return truncated;
}

/**
 * Calculates the percentage of a context window used by text
 * 
 * @param text - The text to measure
 * @param contextWindowSize - Total context window size in tokens
 * @returns Percentage of context window used (0-100)
 * 
 * @example
 * ```typescript
 * const usage = calculateContextUsage(text, 128000);
 * console.log(`Using ${usage.toFixed(2)}% of context window`);
 * ```
 */
export function calculateContextUsage(
  text: string,
  contextWindowSize: number
): number {
  const tokens = estimateTokens(text);
  const percentage = (tokens / contextWindowSize) * 100;
  
  return Math.min(percentage, 100); // Cap at 100%
}

// Made with Bob
