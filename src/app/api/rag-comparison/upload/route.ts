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
  processDocument,
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
    rag: {
      status: 'success' | 'error';
      chunkCount?: number;
      indexTime?: number;
      error?: string;
    };
    direct: {
      status: 'success' | 'error';
      tokenCount?: number;
      loadTime?: number;
      withinLimit?: boolean;
      warnings?: string[];
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

    // Step 1: Process the document (parse and chunk with default settings)
    // OpenRAG SDK will handle chunking automatically with optimal defaults
    let processedDoc;
    try {
      processedDoc = await processDocument(file, {
        chunkStrategy: 'fixed',
        chunkSize: 512,
        overlap: 51 // 10% overlap
      });
    } catch (error) {
      if (error instanceof DocumentProcessingError) {
        return NextResponse.json(
          {
            success: false,
            error: `Document processing failed: ${error.message}`
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Document processing failed'
        },
        { status: 500 }
      );
    }

    // Step 2: Read full document content for storage
    const content = await file.text();
    
    // Create document metadata
    const metadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: processedDoc.chunks.length,
      totalTokens: processedDoc.metadata.totalTokens,
      strategy: 'fixed'
    };

    // Step 3: Store document in memory for later retrieval
    try {
      storeDocument(documentId, content, metadata);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to store document'
        },
        { status: 500 }
      );
    }

    // Step 4: Process through RAG pipeline (index document)
    const ragResult = await ragIndexDocument(
      processedDoc.chunks,
      documentId,
      metadata
    );

    // Step 5: Process through Direct pipeline (load document)
    const directResult = await directLoadDocument(
      content,
      documentId,
      metadata
    );

    // Build response
    const response: UploadResponse = {
      success: true,
      data: {
        documentId,
        filename: file.name,
        rag: {
          status: ragResult.success ? 'success' : 'error',
          chunkCount: ragResult.chunkCount,
          indexTime: ragResult.indexTime,
          error: ragResult.error
        },
        direct: {
          status: directResult.success ? 'success' : 'error',
          tokenCount: directResult.tokenCount,
          loadTime: directResult.loadTime,
          withinLimit: directResult.withinLimit,
          warnings: directResult.warnings,
          error: directResult.error
        }
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    
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