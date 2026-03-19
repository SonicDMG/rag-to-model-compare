/**
 * Shared Prompt Builder
 * 
 * Provides consistent prompt building functionality for both Ollama and Direct pipelines.
 * This eliminates redundancy and ensures identical prompts across pipelines.
 */

/**
 * System prompt used by both Ollama and Direct pipelines
 * 
 * This prompt instructs the LLM to answer questions based solely on the provided document.
 */
export const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided document.

Instructions:
- Read and understand the entire document provided below
- Answer the question using ONLY the information from the document
- If the document doesn't contain enough information to answer the question, say so clearly
- Be thorough and accurate in your response
- Cite specific parts of the document when relevant
- Do not make up information or use knowledge outside the provided document`;

/**
 * Sanitizes input strings to prevent injection attacks
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Builds a complete prompt for LLM queries
 * 
 * Assembles the full context including system prompt, document content,
 * and user query in the proper format for the LLM. This function is used
 * by both Ollama and Direct pipelines to ensure consistency.
 * 
 * @param content - Full document content
 * @param query - User query
 * @returns Complete prompt string
 * 
 * @example
 * ```typescript
 * const prompt = buildPrompt(documentContent, "What is the main topic?");
 * ```
 */
export function buildPrompt(content: string, query: string): string {
  const sanitizedContent = sanitizeInput(content);
  const sanitizedQuery = sanitizeInput(query);
  
  return `${SYSTEM_PROMPT}

=== DOCUMENT START ===

${sanitizedContent}

=== DOCUMENT END ===

User Question: ${sanitizedQuery}

Please provide a clear and accurate answer based on the document above.`;
}

// Made with Bob
