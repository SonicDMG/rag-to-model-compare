/**
 * Token estimation utilities for text content
 * 
 * Uses a simple heuristic of ~4 characters per token, which provides
 * a reasonable approximation for English text with GPT-style tokenizers.
 * For production use, consider using a proper tokenizer library like
 * tiktoken or gpt-tokenizer for more accurate counts.
 */

/**
 * Average characters per token for estimation
 * This is a conservative estimate that works reasonably well for English text
 */
const CHARS_PER_TOKEN = 4;

/**
 * Estimates the number of tokens in a given text string
 * 
 * This uses a simple heuristic of approximately 4 characters per token,
 * which provides a reasonable approximation for most English text.
 * 
 * @param text - The text to estimate tokens for
 * @returns Estimated number of tokens
 * 
 * @example
 * ```typescript
 * const text = "Hello, world! This is a test.";
 * const tokens = estimateTokens(text); // Returns approximately 7-8
 * ```
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Remove extra whitespace and normalize
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  
  // Calculate based on character count
  const charCount = normalizedText.length;
  const estimatedTokens = Math.ceil(charCount / CHARS_PER_TOKEN);
  
  return estimatedTokens;
}

/**
 * Alias for estimateTokens for backward compatibility
 * 
 * @param text - The text to count tokens for
 * @returns Estimated number of tokens
 * 
 * @example
 * ```typescript
 * const tokens = countTokens("Hello, world!");
 * ```
 */
export function countTokens(text: string): number {
  return estimateTokens(text);
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
