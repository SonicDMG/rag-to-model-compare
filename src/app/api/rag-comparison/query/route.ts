/**
 * Query Execution API Route
 *
 * Handles query execution against uploaded documents using RAG, Direct, and
 * Ollama pipelines independently via Server-Sent Events streaming.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Maximum duration for this API route in seconds
 * Set to 120 seconds (2 minutes) to accommodate LLM response generation
 * which can take longer for complex queries or large documents
 */
export const maxDuration = 120;
import { z } from 'zod';
import { getDocument, debugStorage } from '@/lib/rag-comparison/document-storage';
import {
  query as ragQuery
} from '@/lib/rag-comparison/rag-pipeline';
import {
  query as directQuery
} from '@/lib/rag-comparison/direct-pipeline';
import {
  query as ollamaQuery
} from '@/lib/rag-comparison/ollama-pipeline';
import { DEFAULT_MODEL } from '@/lib/constants/models';
import { OLLAMA_CONFIG } from '@/lib/env';
import type {
  RAGConfig,
  DirectConfig
} from '@/types/rag-comparison';
import type { OllamaConfig } from '@/types/ollama';

/**
 * Request validation schema using Zod
 */
const QueryRequestSchema = z.object({
  documentId: z.string()
    .min(1, 'Document ID is required')
    .max(255, 'Document ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Document ID contains invalid characters'),
  
  query: z.string()
    .min(1, 'Query is required')
    .max(10000, 'Query exceeds maximum length'),
  
  model: z.string()
    .regex(/^[a-zA-Z0-9.-]+$/, 'Invalid model name format')
    .optional()
    .default(DEFAULT_MODEL),
  
  temperature: z.number()
    .min(0, 'Temperature must be between 0 and 1')
    .max(1, 'Temperature must be between 0 and 1')
    .optional()
    .default(0.7),
  
  maxTokens: z.number()
    .min(1, 'Max tokens must be positive')
    .max(4096, 'Max tokens cannot exceed 4096')
    .optional()
    .default(1000),
  
  topK: z.number()
    .min(1, 'Top K must be at least 1')
    .max(20, 'Top K cannot exceed 20')
    .optional()
    .default(5),
  
  // Ollama-specific parameters
  ollamaModel: z.string()
    .regex(/^[a-zA-Z0-9.:_-]+$/, 'Invalid Ollama model name format')
    .optional(),
  
  ollamaTemperature: z.number()
    .min(0, 'Ollama temperature must be between 0 and 2')
    .max(2, 'Ollama temperature must be between 0 and 2')
    .optional(),
  
  ollamaMaxTokens: z.number()
    .min(1, 'Ollama max tokens must be positive')
    .optional(),
});


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
  
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * POST /api/rag-comparison/query
 * 
 * Executes a query against an uploaded document using both RAG and Direct
 * pipelines, then compares the results.
 * 
 * Request Body:
 * ```json
 * {
 *   "documentId": "doc-123",
 *   "query": "What is the main topic?",
 *   "model": "gpt-4o",
 *   "temperature": 0.7,
 *   "maxTokens": 1000,
 *   "topK": 5
 * }
 * ```
 * 
 * Response: QueryResponse with ComparisonResult
 */
export async function POST(request: NextRequest): Promise<Response> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     QUERY API ROUTE - START (STREAMING)║');
  console.log('╚════════════════════════════════════════╝');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Parse and validate request body
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    let validatedData;
    try {
      validatedData = QueryRequestSchema.parse(body);
      console.log('Validation successful');
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
    } catch (error) {
      console.error('Validation error:', error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return NextResponse.json(
          {
            success: false,
            error: `Validation error: ${errorMessages}`
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body'
        },
        { status: 400 }
      );
    }

    const {
      documentId,
      query,
      model,
      temperature,
      maxTokens,
      topK,
      ollamaModel,
      ollamaTemperature,
      ollamaMaxTokens
    } = validatedData;

    // Sanitize inputs
    const sanitizedDocumentId = sanitizeInput(documentId);
    const sanitizedQuery = sanitizeInput(query);
    const sanitizedModel = sanitizeInput(model);
    const sanitizedOllamaModel = ollamaModel ? sanitizeInput(ollamaModel) : undefined;
    
    console.log('Sanitized inputs:', {
      documentId: sanitizedDocumentId,
      query: sanitizedQuery.substring(0, 100) + '...',
      model: sanitizedModel,
      temperature,
      maxTokens,
      topK,
      ollamaModel: sanitizedOllamaModel,
      ollamaTemperature,
      ollamaMaxTokens
    });

    // Retrieve document from storage (needed for Direct pipeline)
    console.log('Retrieving document from storage...');
    console.log('[DEBUG] Storage state before retrieval:');
    debugStorage();
    console.log('[DEBUG] Looking for document ID:', sanitizedDocumentId);
    const storedDoc = getDocument(sanitizedDocumentId);
    
    if (!storedDoc) {
      console.warn('⚠️  Document not found in storage:', sanitizedDocumentId);
      console.log('This may affect Direct pipeline, but RAG can still work if document was indexed.');
    } else {
      console.log('✅ Document found:', {
        filename: storedDoc.metadata.filename,
        hasFilterId: !!storedDoc.filterId,
        filterId: storedDoc.filterId,
        chunkCount: storedDoc.metadata.chunkCount,
        contentLength: storedDoc.content.length
      });
      
      // Enhanced logging for multi-file uploads
      console.log('[Direct Query Debug] Document ID:', sanitizedDocumentId);
      console.log('[Direct Query Debug] Content length:', storedDoc.content.length);
      console.log('[Direct Query Debug] Content preview (first 500 chars):',
        storedDoc.content.substring(0, 500));
      
      // Count document separators to verify all files are included
      const separatorPattern = /=== DOCUMENT:/g;
      const separatorMatches = storedDoc.content.match(separatorPattern);
      const documentCount = separatorMatches ? separatorMatches.length : 0;
      console.log('[Direct Query Debug] Number of documents in accumulated content:', documentCount);
      
      if (documentCount > 1) {
        console.log('[Direct Query Debug] ✅ Multi-file content detected with', documentCount, 'documents');
      } else if (documentCount === 1) {
        console.log('[Direct Query Debug] ℹ️  Single document detected');
      } else {
        console.log('[Direct Query Debug] ⚠️  No document separators found - may be single file or legacy format');
      }
    }

    // Build RAG configuration
    const ragConfig: RAGConfig = {
      chunkStrategy: storedDoc?.metadata.strategy || 'fixed',
      chunkSize: 512,
      chunkOverlap: 50,
      topK,
      model: sanitizedModel,
      temperature,
    };
    console.log('RAG config:', JSON.stringify(ragConfig, null, 2));

    // Build Direct configuration
    const directConfig: DirectConfig = {
      model: sanitizedModel,
      temperature,
      maxTokens,
    };
    console.log('Direct config:', JSON.stringify(directConfig, null, 2));

    // Build Ollama configuration
    const ollamaConfig: OllamaConfig = {
      model: sanitizedOllamaModel || OLLAMA_CONFIG.defaultModel,
      temperature: ollamaTemperature ?? temperature,
      maxTokens: ollamaMaxTokens ?? maxTokens,
      baseUrl: OLLAMA_CONFIG.baseUrl
    };
    console.log('Ollama config:', JSON.stringify(ollamaConfig, null, 2));

    // Create a streaming response using Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        console.log('\n========================================');
        console.log('⚡ EXECUTING PIPELINES INDEPENDENTLY');
        console.log('========================================\n');

        // Execute all three pipelines independently - store promises to avoid duplicate execution
        // RAG pipeline
        const ragPromise = ragQuery(sanitizedDocumentId, sanitizedQuery, ragConfig);
        
        ragPromise
          .then((ragResult) => {
            console.log('🔵 RAG pipeline completed successfully');
            const data = JSON.stringify({
              type: 'rag',
              success: true,
              data: ragResult
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          })
          .catch((error) => {
            console.error('🔵 RAG pipeline failed:', error);
            const data = JSON.stringify({
              type: 'rag',
              success: false,
              error: error instanceof Error ? error.message : 'RAG pipeline failed'
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          });

        // Direct pipeline
        const directPromise = storedDoc
          ? directQuery(sanitizedDocumentId, storedDoc.content, sanitizedQuery, directConfig)
          : Promise.reject(new Error('Document not found in storage for Direct pipeline'));

        directPromise
          .then((directResult) => {
            console.log('🟢 Direct pipeline completed successfully');
            const data = JSON.stringify({
              type: 'direct',
              success: true,
              data: directResult
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          })
          .catch((error) => {
            console.error('🟢 Direct pipeline failed:', error);
            const data = JSON.stringify({
              type: 'direct',
              success: false,
              error: error instanceof Error ? error.message : 'Direct pipeline failed'
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          });

        // Ollama pipeline
        const ollamaPromise = storedDoc
          ? ollamaQuery(sanitizedDocumentId, storedDoc.content, sanitizedQuery, ollamaConfig)
          : Promise.reject(new Error('Document not found for Ollama pipeline'));

        ollamaPromise
          .then((ollamaResult) => {
            console.log('🟣 Ollama pipeline completed successfully');
            const data = JSON.stringify({
              type: 'ollama',
              success: true,
              data: ollamaResult
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          })
          .catch((error) => {
            console.error('🟣 Ollama pipeline failed:', error);
            const data = JSON.stringify({
              type: 'ollama',
              success: false,
              error: error instanceof Error ? error.message : 'Ollama pipeline failed'
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          });

        // Wait for all three to complete (or fail) before closing the stream
        // Reuse the same promises to avoid duplicate execution
        await Promise.allSettled([
          ragPromise.catch(() => {}),
          directPromise.catch(() => {}),
          ollamaPromise.catch(() => {})
        ]);

        console.log('\n========================================');
        console.log('⚡ ALL PIPELINES COMPLETE');
        console.log('========================================');
        console.log('╔════════════════════════════════════════╗');
        console.log('║     QUERY API ROUTE - END              ║');
        console.log('╚════════════════════════════════════════╝\n');

        // Send completion event
        controller.enqueue(encoder.encode('data: {"type":"complete"}\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Query execution error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rag-comparison/query
 * 
 * Returns information about the query endpoint.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: '/api/rag-comparison/query',
      method: 'POST',
      description: 'Execute queries against uploaded documents using RAG, Direct, and Ollama approaches',
      parameters: {
        documentId: {
          type: 'string',
          required: true,
          description: 'ID of the uploaded document to query',
          validation: 'Alphanumeric with hyphens and underscores, max 255 characters'
        },
        query: {
          type: 'string',
          required: true,
          description: 'Question to ask about the document',
          validation: 'Non-empty string, max 10,000 characters'
        },
        model: {
          type: 'string',
          required: false,
          default: 'gpt-4o',
          description: 'Model to use for RAG and Direct pipelines',
          validation: 'Alphanumeric with hyphens'
        },
        temperature: {
          type: 'number',
          required: false,
          default: 0.7,
          description: 'Temperature for generation (0-1)',
          validation: 'Number between 0 and 1'
        },
        maxTokens: {
          type: 'number',
          required: false,
          default: 1000,
          description: 'Maximum tokens to generate',
          validation: 'Positive integer, max 4096'
        },
        topK: {
          type: 'number',
          required: false,
          default: 5,
          description: 'Number of chunks to retrieve for RAG',
          validation: 'Integer between 1 and 20'
        },
        ollamaModel: {
          type: 'string',
          required: false,
          description: 'Ollama model to use (e.g., llama3.2, mistral)',
          validation: 'Alphanumeric with colons, dots, hyphens, and underscores'
        },
        ollamaTemperature: {
          type: 'number',
          required: false,
          description: 'Temperature for Ollama generation (0-2)',
          validation: 'Number between 0 and 2'
        },
        ollamaMaxTokens: {
          type: 'number',
          required: false,
          description: 'Maximum tokens for Ollama to generate',
          validation: 'Positive integer'
        }
      },
      response: {
        success: 'boolean',
        data: {
          rag: 'RAGResult with answer, sources, and metrics',
          direct: 'DirectResult with answer and metrics',
          ollama: 'OllamaResult with answer and metrics',
          comparison: 'ComparisonMetrics with speed, tokens, cost, and context window comparisons',
          summary: 'Summary with recommendation and insights'
        },
        error: 'Error message if request fails'
      },
      example: {
        request: {
          documentId: 'doc-123',
          query: 'What is the main topic of this document?',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1000,
          topK: 5,
          ollamaModel: 'llama3.2',
          ollamaTemperature: 0.7,
          ollamaMaxTokens: 1000
        }
      }
    },
    { status: 200 }
  );
}

// Made with Bob