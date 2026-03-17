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

/**
 * Maximum duration for this API route in seconds
 * Set to 120 seconds (2 minutes) to accommodate document processing and indexing
 * which can take longer for large files or multiple file uploads
 */
export const maxDuration = 120;
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
import { storeDocument, getDocument, debugStorage } from '@/lib/rag-comparison/document-storage';
import { DEFAULT_MODEL } from '@/lib/constants/models';
import type {
  DocumentMetadata,
  FolderMetadata,
  FileUploadResult,
  MultiFileUploadResponse
} from '@/types/rag-comparison';
import { OpenRAGClient } from 'openrag-sdk';

/**
 * Maximum file size (150MB)
 * Increased limit for comprehensive RAG comparison testing with larger documents
 */
const MAX_FILE_SIZE = 150 * 1024 * 1024;

/**
 * Multi-file upload limits
 */
const MAX_FILES_PER_UPLOAD = 100;
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_FOLDER_DEPTH = 10;

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
    return DEFAULT_MODEL; // Use the default model from constants
  }

  const sanitized = sanitizeInput(model);
  
  // Basic validation - model name should be alphanumeric with hyphens and dots
  if (!/^[a-zA-Z0-9.-]+$/.test(sanitized)) {
    throw new Error('Invalid model name format');
  }

  return sanitized;
}

/**
 * Validates multi-file upload constraints
 *
 * @param files - Array of files to validate
 * @returns Validation result with error message if invalid
 */
function validateMultiFileUpload(files: File[]): { valid: boolean; error?: string } {
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return {
      valid: false,
      error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload`
    };
  }
  
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: `Total size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`
    };
  }
  
  for (const file of files) {
    const relativePath = (file as any).webkitRelativePath || '';
    const depth = relativePath ? relativePath.split('/').length - 1 : 0;
    if (depth > MAX_FOLDER_DEPTH) {
      return {
        valid: false,
        error: `Folder depth exceeds maximum of ${MAX_FOLDER_DEPTH} levels`
      };
    }
  }
  
  return { valid: true };
}
/**
 * Ensure the "Compare" knowledge filter exists before processing files
 * This prevents race conditions when multiple files are uploaded simultaneously
 * 
 * @returns Promise resolving to the filter ID
 * @throws Error if filter creation/retrieval fails
 */
async function ensureKnowledgeFilter(): Promise<string> {
  try {
    console.log('🔍 Ensuring "Compare" knowledge filter exists...');
    
    // Get OpenRAG client
    const client = new OpenRAGClient({
      apiKey: process.env.OPENRAG_API_KEY!,
      baseUrl: process.env.OPENRAG_URL!,
    });
    
    const filterName = 'Compare';
    
    // Search for existing filter
    const existingFilters = await client.knowledgeFilters.search(filterName, 1);
    
    if (existingFilters && existingFilters.length > 0) {
      const filterId = existingFilters[0].id;
      console.log(`✅ Found existing "${filterName}" filter with ID: ${filterId}`);
      return filterId;
    }
    
    // Create new filter if it doesn't exist
    console.log(`📝 Creating new "${filterName}" filter...`);
    const result = await client.knowledgeFilters.create({
      name: filterName,
      description: 'Filter for document comparison',
      queryData: {
        filters: {
          data_sources: [] // Start with empty array, files will add themselves
        }
      }
    });
    
    if (!result.success || !result.id) {
      throw new Error('Failed to create knowledge filter');
    }
    
    console.log(`✅ Created "${filterName}" filter with ID: ${result.id}`);
    return result.id;
    
  } catch (error) {
    console.error('❌ Failed to ensure knowledge filter:', error);
    throw new Error(
      `Failed to ensure knowledge filter: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}


/**
 * Extracts folder metadata from a file
 *
 * @param file - File to extract metadata from
 * @param uploadBatchId - Unique batch ID for this upload
 * @returns Folder metadata or undefined if not part of folder
 */
function extractFolderMetadata(file: File, uploadBatchId: string): FolderMetadata | undefined {
  const relativePath = (file as any).webkitRelativePath || '';
  
  if (!relativePath) {
    return undefined;
  }
  
  const parts = relativePath.split('/');
  const depth = parts.length - 1;
  const folderName = parts[0];
  const parentPath = parts.length > 2 ? parts.slice(0, -1).join('/') : undefined;
  
  return {
    relativePath,
    folderName,
    depth,
    parentPath,
    isPartOfFolder: true,
    uploadBatchId
  };
}

/**
 * Processes a single file through both RAG and Direct pipelines
 *
 * @param file - File to process
 * @param documentId - Unique document ID
 * @param folderMetadata - Optional folder metadata
 * @returns File upload result
 */
async function processSingleFile(
  file: File,
  documentId: string,
  folderMetadata?: FolderMetadata,
  isMultiFile: boolean = false,
  sharedDirectDocumentId?: string,
  knowledgeFilterId?: string
): Promise<FileUploadResult> {
  // Use shared document ID for Direct pipeline in multi-file uploads
  const directDocId = isMultiFile && sharedDirectDocumentId ? sharedDirectDocumentId : documentId;
  
  const result: FileUploadResult = {
    filename: file.name,
    relativePath: folderMetadata?.relativePath,
    documentId: directDocId, // Use shared ID for result
    hasImages: false,
    imageCount: 0,
    rag: {
      status: 'error',
      error: 'Not processed'
    },
    direct: {
      status: 'error',
      error: 'Not processed'
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
    result.hasImages = hasImages || false;
    result.imageCount = imageCount || 0;
  } catch (parseError) {
    console.error(`[Parse] Failed to parse ${file.name}:`, parseError);
    // Continue - RAG might still work with raw file
  }

  // ============================================================
  // RAG PIPELINE PROCESSING
  // ============================================================
  console.log(`\n[RAG] Processing ${file.name}...`);
  try {
    const ragMetadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: 0,
      totalTokens: 0,
      strategy: 'fixed',
      folderContext: folderMetadata
    };

    const ragResult = await ragIndexDocument(file, documentId, ragMetadata, knowledgeFilterId);

    let filterIdForStorage: string | undefined = undefined;
    if (ragResult.success && ragResult.filterId) {
      filterIdForStorage = ragResult.filterId;
    }

    result.rag = {
      status: ragResult.success ? 'success' : 'error',
      chunkCount: ragResult.chunkCount,
      tokenCount: ragResult.tokenCount,
      indexTime: ragResult.indexTime,
      processedText: parsedContent || undefined,
      error: ragResult.error
    };

    ragSuccess = ragResult.success;
    
    if (ragSuccess) {
      console.log(`[RAG] ✅ ${file.name} indexed successfully`);
      
      try {
        const ragStorageMetadata: DocumentMetadata = {
          filename: file.name,
          size: file.size,
          mimeType: file.type || 'text/plain',
          uploadedAt: new Date(),
          chunkCount: ragResult.chunkCount,
          totalTokens: ragResult.tokenCount,
          strategy: 'fixed',
          folderContext: folderMetadata
        };

        const contentToStore = parsedContent || '';
        storeDocument(documentId, contentToStore, ragStorageMetadata, filterIdForStorage);
        console.log(`[RAG] ✅ ${file.name} stored with filter ID`);
      } catch (storageError) {
        console.error(`[RAG] ❌ Failed to store ${file.name}:`, storageError);
      }
    } else {
      console.error(`[RAG] ❌ ${file.name} indexing failed: ${ragResult.error}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[RAG] ❌ ${file.name} processing error:`, errorMessage);
    result.rag = {
      status: 'error',
      error: errorMessage
    };
    ragSuccess = false;
  }

  // ============================================================
  // DIRECT PIPELINE PROCESSING
  // ============================================================
  console.log(`\n[Direct] Processing ${file.name}...`);
  try {
    let content: string;
    if (parsedContent) {
      content = parsedContent;
    } else {
      try {
        const parseResult = await parseDocument(file);
        content = parseResult.content;
        parsedContent = content;
      } catch (parseError) {
        const errorMsg = parseError instanceof DocumentProcessingError
          ? parseError.message
          : parseError instanceof Error
            ? parseError.message
            : 'Unknown parsing error';
        
        throw new DocumentProcessingError(
          `Failed to parse ${file.name}: ${errorMsg}`,
          'PARSE_ERROR',
          { filename: file.name, originalError: errorMsg }
        );
      }
    }

    // Normalize content to remove extra whitespace and formatting artifacts
    // This ensures consistent token counting between upload and query time
    // The normalization matches what estimateTokens() does internally
    const normalizedContent = content.trim().replace(/\s+/g, ' ');

    const directMetadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: 0,
      totalTokens: 0,
      strategy: 'fixed',
      folderContext: folderMetadata
    };

    // Pass normalized content to loadDocument for consistent token counting
    const directResult = await directLoadDocument(
      normalizedContent,
      directDocId,
      directMetadata,
      isMultiFile,
      file.name
    );

    result.direct = {
      status: directResult.success ? 'success' : 'error',
      tokenCount: directResult.tokenCount,
      loadTime: directResult.loadTime,
      withinLimit: directResult.withinLimit,
      warnings: directResult.warnings,
      processedText: normalizedContent || undefined, // Use normalized content for accurate token display
      error: directResult.error
    };

    directSuccess = directResult.success;
    
    if (directSuccess) {
      console.log(`[Direct] ✅ ${file.name} loaded successfully`);
      
      // For multi-file uploads, storage is handled by loadDocument via appendToDocument
      // For single-file uploads, we still need to store if RAG failed
      if (!isMultiFile) {
        if (directSuccess && !ragSuccess) {
          try {
            const storageMetadata: DocumentMetadata = {
              filename: file.name,
              size: file.size,
              mimeType: file.type || 'text/plain',
              uploadedAt: new Date(),
              chunkCount: 0,
              totalTokens: directResult.tokenCount,
              strategy: 'fixed',
              folderContext: folderMetadata
            };

            // Store normalized content for consistency with token counting
            storeDocument(directDocId, normalizedContent, storageMetadata);
            console.log(`[Direct] ✅ ${file.name} stored (Direct-only)`);
          } catch (error) {
            console.error(`[Direct] ❌ Failed to store ${file.name}:`, error);
          }
        } else if (directSuccess && ragSuccess) {
          try {
            const existingDoc = getDocument(directDocId);
            if (existingDoc && (!existingDoc.content || existingDoc.content.length === 0)) {
              const updatedMetadata: DocumentMetadata = {
                ...existingDoc.metadata,
                totalTokens: directResult.tokenCount,
                folderContext: folderMetadata
              };
              // Store normalized content for consistency with token counting
              storeDocument(directDocId, normalizedContent, updatedMetadata, existingDoc.filterId);
              console.log(`[Direct] ✅ ${file.name} storage updated with content`);
            }
          } catch (error) {
            console.error(`[Direct] ❌ Failed to update ${file.name}:`, error);
          }
        }
      } else {
        console.log(`[Direct] ℹ️  Multi-file upload - storage handled by loadDocument`);
      }
    } else {
      console.error(`[Direct] ❌ ${file.name} processing failed: ${directResult.error}`);
    }

  } catch (error) {
    const errorMessage = error instanceof DocumentProcessingError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Unknown error';
    
    console.error(`[Direct] ❌ ${file.name} processing error:`, errorMessage);
    result.direct = {
      status: 'error',
      error: errorMessage
    };
    directSuccess = false;
  }

  return result;
}

/**
 * POST /api/rag-comparison/upload
 *
 * Uploads and processes document(s) for RAG comparison.
 * Supports both single file and multi-file (folder) uploads.
 *
 * Request: FormData with:
 * - file: File or File[] (required) - Document file(s) to upload
 * - model: string (optional) - Model to use (default: 'gpt-4o')
 *
 * Response: UploadResponse (single file) or MultiFileUploadResponse (multiple files)
 *
 * Note: OpenRAG SDK handles chunking automatically with optimal defaults.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse | MultiFileUploadResponse>> {
  try {
    const startTime = Date.now();
    
    // Parse FormData
    const formData = await request.formData();
    
    // Extract all files from FormData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided in request'
        },
        { status: 400 }
      );
    }

    // Validate model parameter
    try {
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

    // ============================================================
    // SINGLE FILE UPLOAD (Backward Compatibility)
    // ============================================================
    if (files.length === 1) {
      const file = files[0];
      
      // Validate single file
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

      // Check if this is part of a multi-file upload (shared document ID provided)
      const sharedDocumentId = formData.get('sharedDocumentId') as string | null;
      const isPartOfBatch = !!sharedDocumentId;
      
      // Generate unique document ID for RAG, or use provided shared ID
      const ragDocumentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const directDocumentId = sharedDocumentId || ragDocumentId;
      
      // Extract folder metadata if this is part of a batch
      const folderMetadata = isPartOfBatch ? extractFolderMetadata(file, sharedDocumentId) : undefined;
      
      // Use the appropriate document ID based on whether this is part of a batch
      const documentId = ragDocumentId;

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
      console.log('\n========================================');
      console.log('🔵 RAG PIPELINE - START');
      console.log('========================================');
      try {
        console.log(`[RAG] Document ID: ${documentId}`);
        console.log(`[RAG] Filename: ${file.name}`);
        console.log(`[RAG] Starting OpenRAG ingestion...`);
        
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

        // Store the filter ID for later use in queries
        let filterIdForStorage: string | undefined = undefined;
        if (ragResult.success && ragResult.filterId) {
          filterIdForStorage = ragResult.filterId;
        }

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
          console.log(`[RAG] ✅ Successfully indexed document in ${ragResult.indexTime}ms`);
          console.log(`[RAG] Chunks: ${ragResult.chunkCount}, Tokens: ${ragResult.tokenCount}`);
          
          // RAG PIPELINE: Store document metadata with filter ID for queries
          // This is independent of Direct pipeline
          try {
            const ragStorageMetadata: DocumentMetadata = {
              filename: file.name,
              size: file.size,
              mimeType: file.type || 'text/plain',
              uploadedAt: new Date(),
              chunkCount: ragResult.chunkCount,
              totalTokens: ragResult.tokenCount,
              strategy: 'fixed'
            };

            // Store with parsed content if available, otherwise empty string
            const contentToStore = parsedContent || '';
            storeDocument(documentId, contentToStore, ragStorageMetadata, filterIdForStorage);
            console.log(`[RAG] ✅ Document stored with filter ID: ${filterIdForStorage}`);
            console.log('[DEBUG] Storage state after RAG storage:');
            debugStorage();
          } catch (storageError) {
            console.error('[RAG] ❌ Failed to store document:', storageError);
            // Don't fail RAG processing if storage fails
          }
        } else {
          console.error(`[RAG] ❌ Indexing failed: ${ragResult.error}`);
        }
        
        console.log('========================================');
        console.log('🔵 RAG PIPELINE - END');
        console.log('========================================\n');

      } catch (error) {
        // RAG processing failed, but we continue with Direct processing
        const errorMessage = error instanceof Error
          ? error.message
          : 'Unknown error during RAG processing';
        
        console.error('[RAG] ❌ Processing error:', errorMessage);
        console.log('========================================');
        console.log('🔵 RAG PIPELINE - END (ERROR)');
        console.log('========================================\n');
        
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
      console.log('\n========================================');
      console.log('🟢 DIRECT PIPELINE - START');
      console.log('========================================');
      try {
        console.log(`[Direct] Document ID: ${documentId}`);
        console.log(`[Direct] Filename: ${file.name}`);
        console.log(`[Direct] Starting direct context loading...`);
        
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
          strategy: 'fixed', // Not used by Direct
          folderContext: folderMetadata
        };

        // Load document for Direct pipeline (validates and stores)
        const directResult = await directLoadDocument(
          content,
          directDocumentId,
          directMetadata,
          isPartOfBatch,
          file.name
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
          console.log(`[Direct] ✅ Successfully loaded ${directResult.tokenCount} tokens in ${directResult.loadTime}ms`);
          if (directResult.warnings.length > 0) {
            console.warn(`[Direct] ⚠️  Warnings:`, directResult.warnings);
          }
        } else {
          console.error(`[Direct] ❌ Processing failed: ${directResult.error}`);
        }

        // Handle storage based on whether this is part of a batch
        if (!isPartOfBatch) {
          // Single file upload - handle storage as before
          if (directSuccess && !ragSuccess) {
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

              // Store document with Direct content (no filter ID since RAG didn't succeed)
              storeDocument(directDocumentId, content, storageMetadata);
              console.log(`[Direct] ✅ Document stored (Direct-only, no RAG filter)`);
            } catch (error) {
              console.error('[Direct] ❌ Failed to store document:', error);
              // Don't fail the entire request if storage fails
            }
          } else if (directSuccess && ragSuccess) {
            // Both succeeded - RAG already stored the document with filter ID
            // We need to update it with Direct's parsed content if RAG stored empty content
            try {
              const existingDoc = getDocument(documentId);
              if (existingDoc && (!existingDoc.content || existingDoc.content.length === 0)) {
                // Update with Direct's parsed content while preserving filter ID
                const updatedMetadata: DocumentMetadata = {
                  ...existingDoc.metadata,
                  totalTokens: directResult.tokenCount // Update with Direct's token count
                };
                storeDocument(documentId, content, updatedMetadata, existingDoc.filterId);
                console.log(`[Direct] ✅ Updated storage with parsed content (preserving RAG filter ID)`);
              } else {
                console.log(`[Direct] ℹ️  Storage already has content from RAG`);
              }
            } catch (error) {
              console.error('[Direct] ❌ Failed to update document storage:', error);
            }
          }
        } else {
          // Part of batch - storage is handled by loadDocument via appendToDocument
          console.log(`[Direct] ℹ️  Batch upload - storage handled by loadDocument`);
        }
        
        console.log('========================================');
        console.log('🟢 DIRECT PIPELINE - END');
        console.log('========================================\n');

      } catch (error) {
        // Direct processing failed, but RAG might have succeeded
        const errorMessage = error instanceof DocumentProcessingError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error during Direct processing';
        
        console.error('[Direct] ❌ Processing error:', errorMessage);
        console.log('========================================');
        console.log('🟢 DIRECT PIPELINE - END (ERROR)');
        console.log('========================================\n');
        
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

      // Return the direct document ID (shared ID for batch uploads)
      response.data!.documentId = directDocumentId;
      
      return NextResponse.json(response, { status: statusCode });
    }

    // ============================================================
    // MULTI-FILE UPLOAD (Folder Upload)
    // ============================================================
    console.log('\n========================================');
    console.log('📁 MULTI-FILE UPLOAD - START');
    console.log(`📁 Processing ${files.length} files`);
    console.log('========================================\n');

    // Validate multi-file upload
    const validation = validateMultiFileUpload(files);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error
        },
        { status: 400 }
      );
    }

    // Validate each file individually
    const validationErrors: Array<{ filename: string; error: string }> = [];
    for (const file of files) {
      try {
        validateFile(file);
      } catch (error) {
        validationErrors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Validation failed'
        });
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors: validationErrors,
          results: [],
          summary: {
            total: files.length,
            successful: 0,
            failed: validationErrors.length,
            partialSuccess: 0,
            totalProcessingTime: 0
          }
        },
        { status: 400 }
      );
    }

    // Generate unique batch ID for this folder upload
    const uploadBatchId = crypto.randomUUID();
    console.log(`📁 Upload Batch ID: ${uploadBatchId}`);

    // Use a shared documentId for all files in the batch for Direct pipeline
    // This allows Direct pipeline to accumulate all documents into one context
    const sharedDocumentId = `batch-${uploadBatchId}`;
    console.log(`📁 Shared Document ID for Direct pipeline: ${sharedDocumentId}`);

    // Ensure knowledge filter exists BEFORE processing any files
    // This prevents race conditions when multiple files try to create/update the filter simultaneously
    let knowledgeFilterId: string | undefined;
    try {
      knowledgeFilterId = await ensureKnowledgeFilter();
      console.log(`✅ Knowledge filter ready: ${knowledgeFilterId}`);
    } catch (error) {
      console.error('❌ Failed to ensure knowledge filter:', error);
      // Continue without pre-created filter - files will try to create/find it individually
      // This maintains backward compatibility
    }

    // Process files sequentially
    const results: FileUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Each file gets unique ID for RAG (individual indexing)
      // But uses shared ID for Direct (accumulated context)
      const ragDocumentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      console.log(`\n📄 Processing file ${i + 1}/${files.length}: ${file.name}`);
      console.log(`📄 RAG Document ID: ${ragDocumentId}`);
      console.log(`📄 Direct Document ID: ${sharedDocumentId} (shared)`);
      
      // Extract folder metadata
      const folderMetadata = extractFolderMetadata(file, uploadBatchId);
      
      // Process the file with multi-file flag enabled
      // Pass both RAG document ID (unique per file) and shared Direct document ID
      // Also pass the pre-created knowledge filter ID to avoid race conditions
      const result = await processSingleFile(
        file,
        ragDocumentId,
        folderMetadata,
        true,
        sharedDocumentId,
        knowledgeFilterId
      );
      
      results.push(result);
      
      console.log(`📄 File ${i + 1}/${files.length} complete: ${file.name}`);
    }

    // Calculate summary statistics
    const totalProcessingTime = Date.now() - startTime;
    let successful = 0;
    let failed = 0;
    let partialSuccess = 0;

    for (const result of results) {
      const ragSuccess = result.rag.status === 'success';
      const directSuccess = result.direct.status === 'success';
      
      if (ragSuccess && directSuccess) {
        successful++;
      } else if (!ragSuccess && !directSuccess) {
        failed++;
      } else {
        partialSuccess++;
      }
    }

    const response: MultiFileUploadResponse = {
      success: successful + partialSuccess > 0,
      results,
      summary: {
        total: files.length,
        successful,
        failed,
        partialSuccess,
        totalProcessingTime
      }
    };

    console.log('\n========================================');
    console.log('📁 MULTI-FILE UPLOAD - COMPLETE');
    console.log(`📁 Total: ${files.length}, Success: ${successful}, Partial: ${partialSuccess}, Failed: ${failed}`);
    console.log(`📁 Total time: ${totalProcessingTime}ms`);
    console.log('========================================\n');

    const statusCode = response.success ? 200 : 500;
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
      description: 'Upload and process documents for RAG comparison. Supports single file and multi-file (folder) uploads. OpenRAG SDK handles chunking automatically.',
      parameters: {
        file: {
          type: 'File or File[]',
          required: true,
          description: 'Document file(s) to upload (TXT, MD, JSON, PDF, DOCX, DOC)'
        },
        model: {
          type: 'string',
          required: false,
          default: 'gpt-4o',
          description: 'Model to use for processing'
        }
      },
      limits: {
        singleFile: {
          maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
          allowedExtensions: ALLOWED_EXTENSIONS
        },
        multiFile: {
          maxFiles: MAX_FILES_PER_UPLOAD,
          maxTotalSize: `${MAX_TOTAL_SIZE / 1024 / 1024}MB`,
          maxFolderDepth: MAX_FOLDER_DEPTH,
          allowedExtensions: ALLOWED_EXTENSIONS
        }
      },
      note: 'Chunking is handled automatically by OpenRAG SDK with optimal defaults (512 tokens, 10% overlap). Multi-file uploads process files sequentially.'
    },
    { status: 200 }
  );
}

// Made with Bob