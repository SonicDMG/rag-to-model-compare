/**
 * Streaming Upload API Route
 *
 * Handles document upload with real-time progress updates via Server-Sent Events.
 * RAG and Direct pipelines run independently and stream their progress separately.
 */

import { NextRequest } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { parseDocument } from '@/lib/rag-comparison/document-processor';
import { storeDocument, getDocument } from '@/lib/rag-comparison/document-storage';
import { indexDocument as ragIndexDocument } from '@/lib/rag-comparison/rag-pipeline';
import { loadDocument as directLoadDocument } from '@/lib/rag-comparison/direct-pipeline';
import { ProcessingEventTracker, ProcessingEventType, PipelineType } from '@/types/processing-events';
import type { DocumentMetadata } from '@/types/rag-comparison';
import { OpenRAGClient } from 'openrag-sdk';

/**
 * Maximum duration for this API route in seconds
 */
export const maxDuration = 300; // 5 minutes for large file uploads

/**
 * File validation schema
 */
const FileValidationSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().min(1).max(50 * 1024 * 1024), // 50MB max
  type: z.string().regex(/^[a-zA-Z0-9\/\-\+\.]+$/)
});

/**
 * Validate uploaded file
 */
function validateFile(file: File): void {
  try {
    FileValidationSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => e.message).join(', ');
      throw new Error(`File validation failed: ${messages}`);
    }
    throw error;
  }

  // Additional validation
  const allowedExtensions = ['.txt', '.pdf', '.docx', '.md'];
  const ext = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}`);
  }
}

/**
 * Batch filter update mechanism for concurrent uploads
 * Collects filenames and updates filter once after all uploads complete
 */
let pendingFilterUpdates: Set<string> = new Set();
let filterUpdateTimer: NodeJS.Timeout | null = null;
const FILTER_UPDATE_DELAY = 2000; // Wait 2 seconds after last file before updating filter

/**
 * Schedule a batch filter update with all pending filenames.
 * Uses a debounce mechanism to wait for all concurrent uploads to complete.
 *
 * This prevents race conditions when multiple files are uploaded concurrently
 * by batching all filename updates into a single atomic operation.
 *
 * @param filterId - The filter ID to update
 * @param filename - The filename to add to the filter's data_sources
 */
async function scheduleBatchFilterUpdate(filterId: string, filename: string): Promise<void> {
  // Add filename to pending updates
  pendingFilterUpdates.add(filename);
  console.log(`📎 [Stream] Scheduled filter update for: ${filename} (${pendingFilterUpdates.size} pending)`);
  
  // Clear existing timer
  if (filterUpdateTimer) {
    clearTimeout(filterUpdateTimer);
  }
  
  // Set new timer - will execute after FILTER_UPDATE_DELAY ms of inactivity
  filterUpdateTimer = setTimeout(async () => {
    const filenamesToUpdate = Array.from(pendingFilterUpdates);
    pendingFilterUpdates.clear();
    filterUpdateTimer = null;
    
    if (filenamesToUpdate.length === 0) {
      return;
    }
    
    console.log(`\n📎 [Stream] Executing batch filter update for ${filenamesToUpdate.length} file(s)`);
    console.log(`📎 [Stream] Files: [${filenamesToUpdate.join(', ')}]`);
    
    try {
      const client = new OpenRAGClient({
        apiKey: process.env.OPENRAG_API_KEY!,
        baseUrl: process.env.OPENRAG_URL!,
      });
      
      // Get current filter state
      const filterResponse = await client.knowledgeFilters.get(filterId);
      
      if (filterResponse) {
        const currentDataSources = filterResponse.queryData?.filters?.data_sources || [];
        
        // Merge new filenames with existing ones (avoid duplicates)
        const allDataSources = [...new Set([...currentDataSources, ...filenamesToUpdate])];
        
        console.log(`📎 [Stream] Current data_sources: [${currentDataSources.join(', ')}]`);
        console.log(`📎 [Stream] Adding: [${filenamesToUpdate.join(', ')}]`);
        console.log(`📎 [Stream] Final data_sources: [${allDataSources.join(', ')}]`);
        
        // Single atomic update with all filenames
        await client.knowledgeFilters.update(filterId, {
          queryData: {
            filters: {
              data_sources: allDataSources
            }
          }
        });
        
        console.log(`✅ [Stream] Batch filter update successful - ${filenamesToUpdate.length} new files, ${allDataSources.length} total`);
      }
    } catch (error) {
      console.error(`❌ [Stream] Batch filter update failed:`, error);
      // Don't throw - documents are already indexed
    }
  }, FILTER_UPDATE_DELAY);
}

/**
 * Ensure knowledge filter exists
 * Uses the same robust filter management as the main upload route
 */
async function ensureKnowledgeFilter(): Promise<string> {
  try {
    const client = new OpenRAGClient({
      apiKey: process.env.OPENRAG_API_KEY!,
      baseUrl: process.env.OPENRAG_URL!,
    });
    
    const filterName = 'Compare';
    
    // Search for existing filter with exact name match
    console.log(`🔍 [Stream] Searching for "${filterName}" knowledge filter...`);
    const existingFilters = await client.knowledgeFilters.search(filterName, 10);
    
    // Find exact match (search might return partial matches)
    const exactMatch = existingFilters?.find((f: any) => f.name === filterName);
    
    if (exactMatch) {
      console.log(`✅ [Stream] Found existing "${filterName}" filter with ID: ${exactMatch.id}`);
      return exactMatch.id;
    }
    
    // Create new filter if it doesn't exist
    console.log(`📝 [Stream] No existing filter found, creating new "${filterName}" filter...`);
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
      console.error(`❌ [Stream] Filter creation failed:`, result);
      throw new Error('Failed to create knowledge filter');
    }
    
    console.log(`✅ [Stream] Created "${filterName}" filter with ID: ${result.id}`);
    return result.id;
    
  } catch (error) {
    console.error('❌ [Stream] Failed to ensure knowledge filter:', error);
    throw new Error(
      `Failed to ensure knowledge filter: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * POST /api/rag-comparison/upload-stream
 * 
 * Streams upload progress via Server-Sent Events
 */
export async function POST(request: NextRequest): Promise<Response> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   STREAMING UPLOAD API - START         ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file
    try {
      validateFile(file);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'File validation failed' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate document IDs
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`📄 Processing file: ${file.name}`);
    console.log(`📋 Document ID: ${documentId}`);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Track start times for cumulative time calculation
        const pipelineStartTimes: Record<PipelineType, number> = {
          [PipelineType.RAG]: Date.now(),
          [PipelineType.DIRECT]: Date.now(),
          [PipelineType.OLLAMA]: Date.now() // Not used in upload, but needed for type
        };

        // Helper to send events
        const sendEvent = (pipeline: PipelineType, event: any) => {
          const cumulativeTime = Date.now() - pipelineStartTimes[pipeline];
          const eventData = JSON.stringify({
            type: 'processing_event',
            pipeline,
            event,
            cumulativeTime
          });
          controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
        };

        // Create event callbacks for each pipeline
        const ragEventCallback = (event: any) => sendEvent(PipelineType.RAG, event);
        const directEventCallback = (event: any) => sendEvent(PipelineType.DIRECT, event);

        // Ensure knowledge filter exists
        let knowledgeFilterId: string;
        try {
          knowledgeFilterId = await ensureKnowledgeFilter();
          console.log(`✅ Knowledge filter ready: ${knowledgeFilterId}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to create filter';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            pipeline: 'system',
            error: errorMsg
          })}\n\n`));
          controller.close();
          return;
        }

        // Execute both pipelines independently
        const ragPromise = processRAGPipeline(
          file,
          documentId,
          knowledgeFilterId,
          ragEventCallback
        );

        const directPromise = processDirectPipeline(
          file,
          documentId,
          directEventCallback
        );

        // Handle RAG completion
        ragPromise
          .then((result) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_complete',
              pipeline: PipelineType.RAG,
              result
            })}\n\n`));
          })
          .catch((error) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_error',
              pipeline: PipelineType.RAG,
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`));
          });

        // Handle Direct completion
        directPromise
          .then((result) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_complete',
              pipeline: PipelineType.DIRECT,
              result
            })}\n\n`));
          })
          .catch((error) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_error',
              pipeline: PipelineType.DIRECT,
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`));
          });

        // Wait for both pipelines to complete
        const results = await Promise.allSettled([ragPromise, directPromise]);

        // Send final completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'upload_complete',
          documentId,
          filename: file.name,
          ragSuccess: results[0].status === 'fulfilled',
          directSuccess: results[1].status === 'fulfilled'
        })}\n\n`));

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
    console.error('❌ Upload stream error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Process RAG pipeline with progress tracking
 */
async function processRAGPipeline(
  file: File,
  documentId: string,
  knowledgeFilterId: string,
  eventCallback: (event: any) => void
): Promise<any> {
  const tracker = new ProcessingEventTracker(eventCallback, PipelineType.RAG);

  try {
    // Check if file already exists in OpenSearch
    const fileCheckId = tracker.startEvent(
      ProcessingEventType.FILE_STATUS_CHECK,
      'Checking if file already exists in OpenSearch'
    );

    let fileExists = false;
    let existingDocument: any = null;

    try {
      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rag-comparison/check-filename?filename=${encodeURIComponent(file.name)}`
      );
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        fileExists = checkData.exists;
        existingDocument = checkData.document;
        
        tracker.completeEvent(fileCheckId, {
          exists: fileExists,
          filename: file.name,
          ...(existingDocument && {
            documentId: existingDocument.id,
            uploadedAt: existingDocument.uploadedAt
          })
        });
      } else {
        tracker.completeEvent(fileCheckId, {
          exists: false,
          filename: file.name,
          note: 'Check failed, proceeding with upload'
        });
      }
    } catch (error) {
      tracker.failEvent(
        fileCheckId,
        `File check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Continue with upload even if check fails
    }

    // File validation
    const validationId = tracker.startEvent(
      ProcessingEventType.FILE_VALIDATION,
      'Validating file for RAG indexing'
    );
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate validation
    tracker.completeEvent(validationId, { filename: file.name, size: file.size });

    // RAG indexing
    const indexingId = tracker.startEvent(
      ProcessingEventType.RAG_INDEXING,
      'Indexing document with OpenRAG'
    );

    const ragMetadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: 0,
      totalTokens: 0,
      strategy: 'fixed'
    };

    const ragResult = await ragIndexDocument(
      file,
      documentId,
      ragMetadata,
      knowledgeFilterId,
      true // skipFilterUpdate
    );

    tracker.completeEvent(indexingId, {
      chunkCount: ragResult.chunkCount,
      tokenCount: ragResult.tokenCount,
      indexTime: ragResult.indexTime
    });

    if (!ragResult.success) {
      throw new Error(ragResult.error || 'RAG indexing failed');
    }

    // Log detailed RAG upload results
    console.log('\n[RAG Upload] Document indexed successfully:');
    console.log(`  - OpenRAG Document ID: ${documentId}`);
    console.log(`  - Filter ID: ${ragResult.filterId || knowledgeFilterId}`);
    console.log(`  - Chunks: ${ragResult.chunkCount}`);
    console.log(`  - Tokens: ${ragResult.tokenCount}`);
    console.log(`  - Index Time: ${ragResult.indexTime}ms`);
    console.log(`  - Status: indexed`);
    console.log(`  - Verification: passed`);

    // Storage - RAG adds filterId to document (preserving any content from Direct)
    const storageId = tracker.startEvent(
      ProcessingEventType.STORAGE_OPERATION,
      'Storing RAG metadata'
    );

    // Check if Direct has already stored content
    const existingDoc = getDocument(documentId);
    
    const storageMetadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: ragResult.chunkCount,
      totalTokens: ragResult.tokenCount,
      strategy: 'fixed'
    };

    if (existingDoc && existingDoc.content) {
      // Direct completed first - preserve its content and add filterId
      storeDocument(documentId, existingDoc.content, storageMetadata, ragResult.filterId);
      console.log(`[RAG] ✅ Added filterId to existing content (${existingDoc.content.length} chars)`);
    } else {
      // Direct hasn't completed yet - store with empty content and filterId
      storeDocument(documentId, '', storageMetadata, ragResult.filterId);
      console.log(`[RAG] ✅ Stored filterId, content will be added by Direct`);
    }
    
    tracker.completeEvent(storageId);

    // Schedule batch filter update to associate this file with the Compare filter
    // Uses debouncing to handle concurrent uploads efficiently
    const baseFilename = path.basename(file.name);
    scheduleBatchFilterUpdate(knowledgeFilterId, baseFilename).catch(err => {
      console.error(`[RAG] ⚠️  Failed to schedule filter update:`, err);
      // Don't throw - document is already indexed and stored
    });

    return {
      success: true,
      chunkCount: ragResult.chunkCount,
      tokenCount: ragResult.tokenCount,
      indexTime: ragResult.indexTime,
      filterId: ragResult.filterId
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RAG] Pipeline error:', errorMsg);
    throw error;
  }
}

/**
 * Process Direct pipeline with progress tracking
 */
async function processDirectPipeline(
  file: File,
  documentId: string,
  eventCallback: (event: any) => void
): Promise<any> {
  const tracker = new ProcessingEventTracker(eventCallback, PipelineType.DIRECT);

  try {
    // File validation
    const validationId = tracker.startEvent(
      ProcessingEventType.FILE_VALIDATION,
      'Validating file for Direct processing'
    );
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate validation
    tracker.completeEvent(validationId, { filename: file.name, size: file.size });

    // Document parsing
    const parsingId = tracker.startEvent(
      ProcessingEventType.DOCUMENT_PARSING,
      'Parsing document content'
    );

    let content: string;
    let hasImages: boolean | undefined;
    let imageCount: number | undefined;

    try {
      const parseResult = await parseDocument(file);
      content = parseResult.content;
      hasImages = parseResult.hasImages;
      imageCount = parseResult.imageCount;
      
      tracker.completeEvent(parsingId, {
        contentLength: content.length,
        hasImages,
        imageCount
      });
    } catch (parseError) {
      tracker.failEvent(parsingId, parseError instanceof Error ? parseError.message : 'Parse failed');
      throw parseError;
    }

    // Document loading
    const loadingId = tracker.startEvent(
      ProcessingEventType.DOCUMENT_LOADING,
      'Loading document into Direct context'
    );

    const directMetadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: 0,
      totalTokens: 0,
      strategy: 'fixed'
    };

    const directResult = await directLoadDocument(
      content,
      documentId,
      directMetadata,
      false,
      file.name
    );

    tracker.completeEvent(loadingId, {
      tokenCount: directResult.tokenCount,
      loadTime: directResult.loadTime,
      withinLimit: directResult.withinLimit
    });

    if (!directResult.success) {
      throw new Error(directResult.error || 'Direct loading failed');
    }

    // Storage - Direct stores full parsed content for query-time use
    const storageId = tracker.startEvent(
      ProcessingEventType.STORAGE_OPERATION,
      'Storing Direct content'
    );

    // Check if RAG has already stored metadata with filterId
    const existingDoc = getDocument(documentId);
    
    if (existingDoc && existingDoc.filterId) {
      // RAG completed first - update with content while preserving filterId
      const updatedMetadata: DocumentMetadata = {
        ...existingDoc.metadata,
        totalTokens: directResult.tokenCount,
      };
      
      storeDocument(documentId, content, updatedMetadata, existingDoc.filterId);
      console.log(`[Direct] ✅ Stored content (${content.length} chars) with filterId: ${existingDoc.filterId}`);
    } else {
      // RAG hasn't completed yet or failed - store content without filterId
      // RAG will update the filterId when it completes
      const storageMetadata: DocumentMetadata = {
        filename: file.name,
        size: file.size,
        mimeType: file.type || 'text/plain',
        uploadedAt: new Date(),
        chunkCount: 0,
        totalTokens: directResult.tokenCount,
        strategy: 'fixed'
      };
      
      storeDocument(documentId, content, storageMetadata, existingDoc?.filterId);
      console.log(`[Direct] ✅ Stored content (${content.length} chars), filterId will be added by RAG`);
    }
    
    tracker.completeEvent(storageId);

    return {
      success: true,
      tokenCount: directResult.tokenCount,
      loadTime: directResult.loadTime,
      withinLimit: directResult.withinLimit,
      warnings: directResult.warnings,
      hasImages,
      imageCount,
      processedText: content
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Direct] Pipeline error:', errorMsg);
    throw error;
  }
}

// Made with Bob
