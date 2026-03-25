/**
 * Shared Prompt Builder
 *
 * Provides consistent prompt building functionality for both Ollama and Direct pipelines.
 * This eliminates redundancy and ensures identical prompts across pipelines.
 */

import { sanitizeInput } from '../utils/pipeline-utils';

/**
 * System prompt for Direct Context (Ollama) pipeline
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
 * System prompt for Hybrid pipeline (Direct Context with RAG capability)
 *
 * This prompt allows the LLM to use both the provided document context and search
 * additional documents from the knowledge base when needed.
 */
export const HYBRID_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions using the provided document context and additional knowledge base resources.

Instructions:
- Read and understand the document context provided below
- Answer the question using the information from the provided document as your primary source
- If the provided document doesn't contain enough information, you may search and reference additional documents from the knowledge base
- Be thorough and accurate in your response
- Cite specific sources when using information from documents
- Clearly indicate when you're using information from the provided context vs. additional sources
- If neither the provided document nor the knowledge base contains enough information, say so clearly`;


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

/**
 * Builds a complete prompt for Hybrid LLM queries
 *
 * Assembles the full context including hybrid system prompt, document content,
 * and user query. This allows the LLM to use both the provided context and
 * search additional documents from the knowledge base.
 *
 * @param content - Full document content (primary context)
 * @param query - User query
 * @returns Complete hybrid prompt string
 *
 * @example
 * ```typescript
 * const prompt = buildHybridPrompt(documentContent, "What is the main topic?");
 * ```
 */
export function buildHybridPrompt(content: string, query: string): string {
  const sanitizedContent = sanitizeInput(content);
  const sanitizedQuery = sanitizeInput(query);
  
  return `${HYBRID_SYSTEM_PROMPT}

=== PRIMARY DOCUMENT CONTEXT START ===

${sanitizedContent}

=== PRIMARY DOCUMENT CONTEXT END ===

User Question: ${sanitizedQuery}

Please provide a clear and accurate answer. Use the primary document context above as your main source, but you may also search and reference additional documents from the knowledge base if needed.`;
}

// Made with Bob
