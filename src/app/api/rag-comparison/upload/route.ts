/**
 * Document Upload API Route
 *
 * Handles document upload, processing, and indexing for RAG comparison.
 * Accepts file uploads via FormData and processes them through both
 * RAG and Direct pipelines.
 *
 * OpenRAG SDK handles chunking automatically for the RAG pipeline.
 * The direct context window approach doesn't use chunking at all.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  parseDocument,
  DocumentProcessingError
} from '@/lib/rag-comparison/document-processor';
import {
  indexDocument as ragIndexDocument
} from '@/lib/rag-comparison/rag-pipeline';
import {
  loadDocument as directLoadDocument
} from '@/lib/rag-comparison/direct-pipeline';
import { storeDocument } from '@/lib/rag-comparison/document-storage';
import type { DocumentMetadata } from '@/types/rag-comparison';

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.pdf', '.docx', '.doc'];

/**
 * Upload response structure
 */
interface UploadResponse {
  success: boolean;
  data?: {
    documentId: string;
    filename: string;
    hasImages?: boolean;
    imageCount?: number;
    rag: {
      status: 'success' | 'error';
      chunkCount?: number;
      tokenCount?: number;
      indexTime?: number;
      processedText?: string;
      error?: string;
    };
    direct: {
      status: 'success' | 'error';
      tokenCount?: number;
      loadTime?: number;
      withinLimit?: boolean;
      warnings?: string[];
      processedText?: string;
      error?: string;
    };
  };
  error?: string;
}

/**
 * Validates file from FormData
 * 
 * @param file - File to validate
 * @throws Error if file is invalid
 */
function validateFile(file: File): void {
  // Check file exists
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size === 0) {
    throw new Error('File is empty');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  // Check file extension
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error(
      `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // Check for path traversal in filename
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new Error('Invalid filename: contains path traversal characters');
  }

  // Check for null bytes in filename
  if (file.name.includes('\0')) {
    throw new Error('Invalid filename: contains null bytes');
  }
}

/**
 * Sanitizes input strings
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
 * Validates model parameter
 * 
 * @param model - Model to validate
 * @returns Validated model or default
 */
function validateModel(model: string | null): string {
  if (!model) {
    return 'gpt-4-turbo'; // Default
  }

  const sanitized = sanitizeInput(model);
  
  // Basic validation - model name should be alphanumeric with hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(sanitized)) {
    throw new Error('Invalid model name format');
  }

  return sanitized;
}

/**
 * POST /api/rag-comparison/upload
 *
 * Uploads and processes a document for RAG comparison.
 *
 * Request: FormData with:
 * - file: File (required) - Document file to upload
 * - model: string (optional) - Model to use (default: 'gpt-4-turbo')
 *
 * Response: UploadResponse with processing status for both RAG and Direct paths
 *
 * Note: OpenRAG SDK handles chunking automatically with optimal defaults.
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Parse FormData
    const formData = await request.formData();
    
    // Extract and validate file
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided in request'
        },
        { status: 400 }
      );
    }

    // Validate file
    try {
      validateFile(file);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'File validation failed'
        },
        { status: 400 }
      );
    }

    // Validate model parameter
    try {
      // Validate model but don't store it - it's used during query, not upload
      validateModel(formData.get('model') as string | null);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Invalid parameters'
        },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Initialize response structure
    const response: UploadResponse = {
      success: false,
      data: {
        documentId,
        filename: file.name,
        rag: {
          status: 'error',
          error: 'Not processed'
        },
        direct: {
          status: 'error',
          error: 'Not processed'
        }
      }
    };

    // Track if at least one processing method succeeds
    let ragSuccess = false;
    let directSuccess = false;
    
    // Parse document content once for both pipelines
    let parsedContent: string | null = null;
    let hasImages: boolean | undefined = undefined;
    let imageCount: number | undefined = undefined;
    try {
      const parseResult = await parseDocument(file);
      parsedContent = parseResult.content;
      hasImages = parseResult.hasImages;
      imageCount = parseResult.imageCount;
    } catch (parseError) {
      console.error('[Parse] Failed to parse document:', parseError);
      // Continue - RAG might still work with raw file
    }

    // ============================================================
    // RAG PIPELINE PROCESSING (Independent with own error handling)
    // OpenRAG SDK handles all parsing, chunking, and embedding
    // ============================================================
    try {
      console.log(`[RAG] Starting processing for document: ${documentId}`);
      
      // Create metadata for RAG
      const ragMetadata: DocumentMetadata = {
        filename: file.name,
        size: file.size,
        mimeType: file.type || 'text/plain',
        uploadedAt: new Date(),
        chunkCount: 0, // Will be set by OpenRAG
        totalTokens: 0, // Will be set by OpenRAG
        strategy: 'fixed'
      };

      // Send raw file to OpenRAG SDK for ingestion
      // OpenRAG handles parsing, chunking, and embedding automatically
      const ragResult = await ragIndexDocument(
        file, // Send the raw file, not parsed chunks
        documentId,
        ragMetadata
      );

      // Update response with RAG results and image data
      response.data!.rag = {
        status: ragResult.success ? 'success' : 'error',
        chunkCount: ragResult.chunkCount,
        tokenCount: ragResult.tokenCount,
        indexTime: ragResult.indexTime,
        processedText: parsedContent || undefined,
        error: ragResult.error
      };
      
      // Add image data to response
      if (hasImages !== undefined) {
        response.data!.hasImages = hasImages;
        response.data!.imageCount = imageCount;
      }

      ragSuccess = ragResult.success;
      
      if (ragSuccess) {
        console.log(`[RAG] Successfully indexed document in ${ragResult.indexTime}ms`);
      } else {
        console.error(`[RAG] Indexing failed: ${ragResult.error}`);
      }

    } catch (error) {
      // RAG processing failed, but we continue with Direct processing
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error during RAG processing';
      
      console.error('[RAG] Processing error:', errorMessage);
      
      response.data!.rag = {
        status: 'error',
        error: errorMessage
      };
      ragSuccess = false;
    }

    // ============================================================
    // DIRECT PIPELINE PROCESSING (Independent with own error handling)
    // Direct approach needs parsed text content
    // ============================================================
    try {
      console.log(`[Direct] Starting processing for document: ${documentId}`);
      
      // Use already parsed content or parse again if needed
      let content: string;
      if (parsedContent) {
        content = parsedContent;
      } else {
        try {
          const parseResult = await parseDocument(file);
          content = parseResult.content;
          parsedContent = content; // Store for potential reuse
        } catch (parseError) {
          // If parsing fails, throw a more specific error
          const errorMsg = parseError instanceof DocumentProcessingError
            ? parseError.message
            : parseError instanceof Error
              ? parseError.message
              : 'Unknown parsing error';
          
          throw new DocumentProcessingError(
            `Failed to parse document for Direct approach: ${errorMsg}`,
            'PARSE_ERROR',
            {
              filename: file.name,
              originalError: errorMsg
            }
          );
        }
      }

      // Create metadata for Direct pipeline
      const directMetadata: DocumentMetadata = {
        filename: file.name,
        size: file.size,
        mimeType: file.type || 'text/plain',
        uploadedAt: new Date(),
        chunkCount: 0, // Direct doesn't use chunks
        totalTokens: 0, // Will be calculated by loadDocument
        strategy: 'fixed' // Not used by Direct
      };

      // Load document for Direct pipeline (validates and stores)
      const directResult = await directLoadDocument(
        content,
        documentId,
        directMetadata
      );

      // Update response with Direct results
      response.data!.direct = {
        status: directResult.success ? 'success' : 'error',
        tokenCount: directResult.tokenCount,
        loadTime: directResult.loadTime,
        withinLimit: directResult.withinLimit,
        warnings: directResult.warnings,
        processedText: content,
        error: directResult.error
      };

      directSuccess = directResult.success;
      
      if (directSuccess) {
        console.log(`[Direct] Successfully loaded ${directResult.tokenCount} tokens in ${directResult.loadTime}ms`);
        if (directResult.warnings.length > 0) {
          console.warn(`[Direct] Warnings:`, directResult.warnings);
        }
      } else {
        console.error(`[Direct] Processing failed: ${directResult.error}`);
      }

      // Store parsed content for later retrieval (only if Direct succeeded)
      if (directSuccess) {
        try {
          const storageMetadata: DocumentMetadata = {
            filename: file.name,
            size: file.size,
            mimeType: file.type || 'text/plain',
            uploadedAt: new Date(),
            chunkCount: 0,
            totalTokens: directResult.tokenCount,
            strategy: 'fixed'
          };

          storeDocument(documentId, content, storageMetadata);
          console.log(`[Storage] Document stored successfully: ${documentId}`);
        } catch (error) {
          console.error('[Storage] Failed to store document:', error);
          // Don't fail the entire request if storage fails
        }
      }

    } catch (error) {
      // Direct processing failed, but RAG might have succeeded
      const errorMessage = error instanceof DocumentProcessingError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error during Direct processing';
      
      console.error('[Direct] Processing error:', errorMessage);
      
      response.data!.direct = {
        status: 'error',
        error: errorMessage
      };
      directSuccess = false;
    }

    // ============================================================
    // DETERMINE OVERALL SUCCESS
    // ============================================================
    // Success if at least one processing method succeeded
    response.success = ragSuccess || directSuccess;

    // Determine appropriate HTTP status code
    let statusCode = 200;
    if (!response.success) {
      // Both failed - this is a server error
      statusCode = 500;
      response.error = 'Both RAG and Direct processing failed';
    } else if (ragSuccess && directSuccess) {
      // Both succeeded - perfect
      statusCode = 200;
    } else {
      // Partial success - still return 200 but client should check individual statuses
      statusCode = 200;
      console.warn(`[Upload] Partial success - RAG: ${ragSuccess}, Direct: ${directSuccess}`);
    }

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('[Upload] Unexpected error:', error);
    
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
 * GET /api/rag-comparison/upload
 * 
 * Returns information about the upload endpoint.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: '/api/rag-comparison/upload',
      method: 'POST',
      description: 'Upload and process documents for RAG comparison. OpenRAG SDK handles chunking automatically.',
      parameters: {
        file: {
          type: 'File',
          required: true,
          description: 'Document file to upload (TXT, MD, JSON, PDF, DOCX, DOC)'
        },
        model: {
          type: 'string',
          required: false,
          default: 'gpt-4-turbo',
          description: 'Model to use for processing'
        }
      },
      limits: {
        maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
        allowedExtensions: ALLOWED_EXTENSIONS
      },
      note: 'Chunking is handled automatically by OpenRAG SDK with optimal defaults (512 tokens, 10% overlap)'
    },
    { status: 200 }
  );
}

// Made with Bob