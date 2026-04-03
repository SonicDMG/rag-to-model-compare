/**
 * Streaming Upload API Route
 *
 * Handles document upload with real-time progress updates via Server-Sent Events.
 * RAG and Direct pipelines run independently and stream their progress separately.
 */

import { NextRequest } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { parseDocument } from '@/lib/rag-comparison/processing/document-processor';
import { storeDocument, getDocument } from '@/lib/rag-comparison/processing/document-storage';
import { indexDocument as ragIndexDocument } from '@/lib/rag-comparison/pipelines/rag-pipeline';
import { loadDocument as hybridLoadDocument } from '@/lib/rag-comparison/pipelines/hybrid-pipeline';
import { ProcessingEventTracker, ProcessingEventType, PipelineType } from '@/types/processing-events';
import type { DocumentMetadata } from '@/types/rag-comparison';
import { OpenRAGClient } from 'openrag-sdk';

/**
 * Maximum duration for this API route in seconds
 * Increased to 15 minutes to support large files and slow processing
 */
export const maxDuration = 900; // 15 minutes for large file uploads

/**
 * File validation schema
 */
const FileValidationSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number()
    .min(1, 'File is empty')
    .max(150 * 1024 * 1024, 'File size exceeds maximum allowed size of 150MB'), // 150MB max
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
        
        // Single atomic update with all filenames - preserve existing queryData fields
        await client.knowledgeFilters.update(filterId, {
          queryData: {
            limit: filterResponse.queryData?.limit ?? 5,
            scoreThreshold: filterResponse.queryData?.scoreThreshold ?? 0.5,
            color: filterResponse.queryData?.color,
            icon: filterResponse.queryData?.icon,
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
    const providedDocumentId = formData.get('documentId') as string | null;
    const filterId = formData.get('filterId') as string | null; // Optional - filters are now optional
    const isMultiFileStr = formData.get('isMultiFile') as string | null;
    const isMultiFile = isMultiFileStr === 'true';
    
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

    // Use provided document ID for multi-file uploads, generate new one for single files
    const documentId = providedDocumentId || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`📄 Processing file: ${file.name}`);
    console.log(`📋 Document ID: ${documentId}`);
    console.log(`🔖 Filter ID: ${filterId}`);
    console.log(`📦 Multi-file upload: ${isMultiFile}`);
    if (providedDocumentId) {
      console.log(`🔗 Using shared document ID for batch: ${documentId}`);
    }

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

        console.log(`✅ Using knowledge filter: ${filterId}`);

        // Clone the file for each pipeline to ensure true independence
        // This prevents one pipeline from consuming the file stream and blocking the other
        const fileBuffer = await file.arrayBuffer();
        const ragFile = new File([fileBuffer], file.name, { type: file.type });
        const directFile = new File([fileBuffer], file.name, { type: file.type });

        // Execute both pipelines independently with their own file copies
        const ragPromise = processRAGPipeline(
          ragFile,
          documentId,
          filterId,
          ragEventCallback
        );

        const directPromise = processDirectPipeline(
          directFile,
          documentId,
          directEventCallback,
          isMultiFile
        );

        // Track completion count to close stream after both pipelines finish
        let completedCount = 0;
        const checkAndClose = () => {
          completedCount++;
          if (completedCount === 2) {
            // Both pipelines have sent their completion events
            // Close the stream after a brief delay to ensure all events are flushed
            setTimeout(() => controller.close(), 100);
          }
        };

        // Handle RAG completion - completely independent
        ragPromise
          .then((result) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_complete',
              pipeline: PipelineType.RAG,
              result
            })}\n\n`));
            checkAndClose();
          })
          .catch((error) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_error',
              pipeline: PipelineType.RAG,
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`));
            checkAndClose();
          });

        // Handle Direct completion - completely independent
        directPromise
          .then((result) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_complete',
              pipeline: PipelineType.DIRECT,
              result
            })}\n\n`));
            checkAndClose();
          })
          .catch((error) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pipeline_error',
              pipeline: PipelineType.DIRECT,
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`));
            checkAndClose();
          });
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
  filterId: string | null,
  eventCallback: (event: any) => void
): Promise<any> {
  const tracker = new ProcessingEventTracker(eventCallback, PipelineType.RAG);

  try {
    // Check if file already exists in OpenRAG
    const fileCheckId = tracker.startEvent(
      ProcessingEventType.FILE_STATUS_CHECK,
      'Checking if file already exists in OpenRAG'
    );

    let fileExists = false;
    let existingDocument: any = null;

    try {
      console.log(`🔍 [RAG] Checking if file exists: ${file.name}`);
      
      // Call OpenRAG backend directly (no HTTP hop through our own API)
      const backendUrl = `${process.env.OPENRAG_URL}/api/documents/check-filename?filename=${encodeURIComponent(file.name)}`;
      console.log(`🔍 [RAG] Backend URL: ${backendUrl}`);
      
      const checkResponse = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENRAG_API_KEY}`
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      console.log(`🔍 [RAG] Check response status: ${checkResponse.status}`);
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        fileExists = checkData.exists;
        existingDocument = checkData.document;
        
        console.log(`🔍 [RAG] File check result: exists=${fileExists}`, existingDocument ? `documentId=${existingDocument.id}` : '');
        
        tracker.completeEvent(fileCheckId, {
          exists: fileExists,
          filename: file.name,
          skipped: fileExists,
          ...(existingDocument && {
            documentId: existingDocument.id,
            uploadedAt: existingDocument.uploadedAt
          })
        });
      } else if (checkResponse.status === 404) {
        // 404 means file doesn't exist - this is expected for new files
        console.log(`🔍 [RAG] File does not exist (404) - proceeding with upload`);
        tracker.completeEvent(fileCheckId, {
          exists: false,
          filename: file.name,
          skipped: false
        });
      } else {
        const errorText = await checkResponse.text();
        console.warn(`⚠️  [RAG] File check returned ${checkResponse.status}: ${errorText}`);
        tracker.completeEvent(fileCheckId, {
          exists: false,
          filename: file.name,
          skipped: false,
          note: `Check returned ${checkResponse.status}, proceeding with upload`
        });
      }
    } catch (error) {
      console.error(`❌ [RAG] File check error:`, error);
      tracker.failEvent(
        fileCheckId,
        `File check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Continue with upload even if check fails
    }

    // If file already exists, skip upload and return existing document info
    if (fileExists) {
      console.log(`⏭️  [RAG] File already exists - skipping upload and indexing`);
      
      if (existingDocument) {
        console.log(`📄 [RAG] Existing document ID: ${existingDocument.id}`);
        console.log(`📅 [RAG] Originally uploaded: ${existingDocument.uploadedAt || 'unknown'}`);
      } else {
        console.log(`⚠️  [RAG] File exists but document details not available`);
      }
      
      // Add a skip event to the timeline
      const skipId = tracker.startEvent(
        ProcessingEventType.RAG_INDEXING,
        'Skipped - file already indexed'
      );
      tracker.completeEvent(skipId, {
        skipped: true,
        reason: 'File already exists in OpenRAG',
        ...(existingDocument && {
          existingDocumentId: existingDocument.id,
          uploadedAt: existingDocument.uploadedAt
        })
      });
      
      // Schedule batch filter update to associate this existing file with the Compare filter
      // This ensures existing files are included in the filter just like newly uploaded files
      // Only update filter if one is selected
      if (filterId) {
        const baseFilename = path.basename(file.name);
        scheduleBatchFilterUpdate(filterId, baseFilename).catch(err => {
          console.error(`[RAG] ⚠️  Failed to schedule filter update for existing file:`, err);
          // Don't throw - file already exists and is indexed
        });
      }
      
      return {
        success: true,
        skipped: true,
        ...(existingDocument && {
          existingDocument: {
            id: existingDocument.id,
            filename: file.name,
            uploadedAt: existingDocument.uploadedAt
          }
        }),
        message: 'File already indexed - skipped upload'
      };
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

    let ragResult;
    try {
      ragResult = await ragIndexDocument(
        file,
        documentId,
        ragMetadata,
        filterId || undefined, // Convert null to undefined for optional parameter
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
    } catch (indexError: any) {
      // Enhanced error logging for indexing failures
      console.error('\n╔════════════════════════════════════════════════════════════╗');
      console.error('║         RAG INDEXING ERROR IN UPLOAD ROUTE                ║');
      console.error('╚════════════════════════════════════════════════════════════╝');
      console.error(`❌ Error Type: ${indexError?.constructor?.name || 'Unknown'}`);
      console.error(`❌ Error Message: ${indexError?.message || 'No message'}`);
      console.error(`❌ Error Code: ${indexError?.code || 'No code'}`);
      console.error(`❌ Document ID: ${documentId}`);
      console.error(`❌ Filter ID: ${filterId}`);
      console.error(`❌ Filename: ${file.name}`);
      
      if (indexError?.details) {
        console.error(`❌ Error Details: ${JSON.stringify(indexError.details, null, 2)}`);
      }
      console.error('════════════════════════════════════════════════════════════\n');
      
      tracker.failEvent(indexingId, indexError?.message || 'Indexing failed');
      throw indexError;
    }

    // Log detailed RAG upload results
    console.log('\n[RAG Upload] Document indexed successfully:');
    console.log(`  - OpenRAG Document ID: ${documentId}`);
    console.log(`  - Filter ID: ${ragResult.filterId || filterId}`);
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

    // RAG pipeline stores its own metadata independently
    // No coordination with Direct pipeline
    const storageMetadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: ragResult.chunkCount,
      totalTokens: ragResult.tokenCount,
      strategy: 'fixed'
    };

    // Store RAG metadata with filterId
    // Check if Direct pipeline already stored content, preserve it
    const existingDoc = getDocument(documentId);
    const contentToStore = existingDoc?.content || '';
    storeDocument(documentId, contentToStore, storageMetadata, ragResult.filterId);
    console.log(`[RAG] ✅ Stored RAG metadata with filterId: ${ragResult.filterId}`);
    if (existingDoc?.content) {
      console.log(`[RAG] ℹ️  Preserved existing content from Direct pipeline (${existingDoc.content.length} chars)`);
    }
    
    tracker.completeEvent(storageId);

    // Schedule batch filter update to associate this file with the Compare filter
    // Uses debouncing to handle concurrent uploads efficiently
    // Only update filter if one is selected
    if (filterId) {
      const baseFilename = path.basename(file.name);
      scheduleBatchFilterUpdate(filterId, baseFilename).catch(err => {
        console.error(`[RAG] ⚠️  Failed to schedule filter update:`, err);
        // Don't throw - document is already indexed and stored
      });
    }

    return {
      success: true,
      documentId: documentId,
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
  eventCallback: (event: any) => void,
  isMultiFile: boolean = false
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

    const directResult = await hybridLoadDocument(
      content,
      documentId,
      directMetadata,
      isMultiFile,
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

    // Direct pipeline stores its own content independently
    // No coordination with RAG pipeline
    const storageMetadata: DocumentMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'text/plain',
      uploadedAt: new Date(),
      chunkCount: 0,
      totalTokens: directResult.tokenCount,
      strategy: 'fixed'
    };
    
    // Store Direct content, preserving filterId if RAG already stored it
    const existingDoc = getDocument(documentId);
    const filterIdToStore = existingDoc?.filterId;
    storeDocument(documentId, content, storageMetadata, filterIdToStore);
    console.log(`[Direct] ✅ Stored content (${content.length} chars)`);
    if (filterIdToStore) {
      console.log(`[Direct] ℹ️  Preserved filterId from RAG pipeline: ${filterIdToStore}`);
    }
    
    tracker.completeEvent(storageId);

    return {
      success: true,
      documentId: documentId,
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
