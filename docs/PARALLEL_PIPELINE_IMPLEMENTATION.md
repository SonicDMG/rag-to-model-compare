# Parallel Pipeline Processing Implementation

## Overview

This document describes the implementation of parallel pipeline processing with dual progress bar support in the RAG comparison upload system.

## Problem Statement

Previously, file uploads processed sequentially:
1. Parse document (blocking)
2. RAG pipeline (waiting for parse)
3. Direct pipeline (waiting for RAG)

This was inefficient because:
- RAG pipeline doesn't need upfront parsing (OpenRAG SDK handles it internally)
- RAG and Direct pipelines are completely independent
- Large PDF files could take significant time to parse, unnecessarily blocking RAG upload

## Solution: Parallel Execution

### Architecture Changes

#### 1. Refactored `processSingleFile()` Function

**Location:** `/src/app/api/rag-comparison/upload/route.ts` (lines 544-865)

**Key Changes:**
- Removed upfront parsing that blocked both pipelines
- Wrapped RAG pipeline in async function
- Wrapped Direct pipeline in async function with internal parsing
- Implemented `Promise.allSettled()` for true parallel execution
- Updated storage logic to handle async results

**Code Structure:**
```typescript
async function processSingleFile(
  file: File,
  documentId: string,
  folderMetadata?: FolderMetadata,
  isMultiFile: boolean = false,
  sharedDirectDocumentId?: string,
  knowledgeFilterId?: string,
  skipFilterUpdate: boolean = false,
  progressCallback?: ProgressCallback  // NEW: Optional progress tracking
): Promise<FileUploadResult>
```

#### 2. RAG Pipeline Function

**Characteristics:**
- Starts immediately without waiting for parsing
- OpenRAG SDK handles document parsing internally
- Attempts to parse for storage purposes (non-blocking)
- Returns structured result object with all necessary data

**Progress Stages:**
1. Starting indexing (10%)
2. Indexing document (30%)
3. Storing document (70%)
4. Completed (100%)

#### 3. Direct Pipeline Function

**Characteristics:**
- Parses document internally (independent of RAG)
- Normalizes content for consistent token counting
- Loads into context window
- Returns structured result with parsed metadata

**Progress Stages:**
1. Parsing document (10-30%)
2. Loading into context (60%)
3. Completed (100%)

#### 4. Parallel Execution

```typescript
const [ragSettled, directSettled] = await Promise.allSettled([
  ragPipeline(),    // Starts immediately
  directPipeline()  // Runs in parallel
]);
```

**Benefits:**
- Both pipelines start simultaneously
- One pipeline's failure doesn't block the other
- Significantly faster for large files
- Better resource utilization

## Progress Tracking System

### Type Definitions

**Location:** `/src/types/rag-comparison.ts`

```typescript
export interface PipelineProgress {
  pipeline: 'rag' | 'direct';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  stage?: string;
  error?: string;
}

export interface FileProcessingProgress {
  filename: string;
  rag: PipelineProgress;
  direct: PipelineProgress;
  overallProgress: number;
}

export type ProgressCallback = (progress: FileProcessingProgress) => void;
```

### Processing Events

**Location:** `/src/types/processing-events.ts`

Added upload-specific event types:
```typescript
UPLOAD_PARSE = 'upload_parse',
UPLOAD_RAG_INDEX = 'upload_rag_index',
UPLOAD_RAG_STORE = 'upload_rag_store',
UPLOAD_DIRECT_LOAD = 'upload_direct_load',
UPLOAD_DIRECT_STORE = 'upload_direct_store',
```

### Progress Callback Integration

The `processSingleFile()` function now accepts an optional `progressCallback` parameter that emits real-time progress updates:

```typescript
const emitProgress = (
  ragStatus, ragProgress, ragStage, ragError,
  directStatus, directProgress, directStage, directError
) => {
  if (progressCallback) {
    progressCallback({
      filename: file.name,
      rag: { pipeline: 'rag', status: ragStatus, progress: ragProgress, stage: ragStage, error: ragError },
      direct: { pipeline: 'direct', status: directStatus, progress: directProgress, stage: directStage, error: directError },
      overallProgress: (ragProgress + directProgress) / 2
    });
  }
};
```

## UI Components

### DualPipelineProgressIndicator

**Location:** `/src/components/DualPipelineProgressIndicator.tsx`

**Features:**
- Separate progress bars for RAG (teal) and Direct (purple) pipelines
- Real-time status indicators (⏳ pending, ⚙️ processing, ✅ completed, ❌ error)
- Stage descriptions for each pipeline
- Error message display
- Overall progress calculation
- Color-coded status (blue=processing, green=success, purple=error)

**Usage:**
```typescript
<DualPipelineProgressIndicator progress={fileProcessingProgress} />
```

## Integration Guide

### For Real-Time Progress Updates

To fully integrate real-time progress updates, you would need to:

1. **Set up Server-Sent Events (SSE) or WebSocket:**
   ```typescript
   // In upload route
   export async function POST(request: NextRequest) {
     const stream = new TransformStream();
     const writer = stream.writable.getWriter();
     
     const progressCallback = (progress: FileProcessingProgress) => {
       writer.write(JSON.stringify(progress) + '\n');
     };
     
     // Process file with callback
     processSingleFile(file, docId, metadata, false, undefined, undefined, false, progressCallback);
     
     return new Response(stream.readable, {
       headers: { 'Content-Type': 'text/event-stream' }
     });
   }
   ```

2. **Update DocumentUpload component:**
   ```typescript
   const [currentProgress, setCurrentProgress] = useState<FileProcessingProgress | null>(null);
   
   // In upload function
   const eventSource = new EventSource('/api/rag-comparison/upload');
   eventSource.onmessage = (event) => {
     const progress = JSON.parse(event.data);
     setCurrentProgress(progress);
   };
   ```

3. **Display dual progress bars:**
   ```typescript
   {currentProgress && (
     <DualPipelineProgressIndicator progress={currentProgress} />
   )}
   ```

### Current Implementation

The current implementation provides:
- ✅ Parallel pipeline execution (fully functional)
- ✅ Progress callback infrastructure (ready to use)
- ✅ DualPipelineProgressIndicator component (ready to use)
- ⏳ Real-time progress streaming (requires SSE/WebSocket setup)

## Performance Benefits

### Before (Sequential Processing)
```
Parse (5s) → RAG (10s) → Direct (8s) = 23 seconds total
```

### After (Parallel Processing)
```
RAG (10s) ┐
           ├→ Max(10s, 13s) = 13 seconds total
Direct (5s parse + 8s load = 13s) ┘
```

**Improvement:** ~43% faster for this example

## Error Handling

Each pipeline handles errors independently:

1. **RAG Pipeline Errors:**
   - Indexing failures
   - Storage failures
   - SDK errors

2. **Direct Pipeline Errors:**
   - Parsing failures
   - Context window overflow
   - Loading errors

3. **Combined Results:**
   - Both succeed: Full success
   - One succeeds: Partial success
   - Both fail: Error state

## Storage Logic

Storage is handled based on pipeline results:

1. **Single-file uploads:**
   - RAG succeeds: Store with RAG metadata
   - Direct succeeds, RAG fails: Store with Direct metadata
   - Both succeed: Update storage with complete metadata

2. **Multi-file uploads:**
   - Storage handled by `loadDocument` via `appendToDocument`
   - Shared document ID for Direct pipeline
   - Individual document IDs for RAG pipeline

## Testing Recommendations

1. **Unit Tests:**
   - Test parallel execution with mocked pipelines
   - Verify error handling for each pipeline
   - Test storage logic for all success/failure combinations

2. **Integration Tests:**
   - Upload small files (< 1MB)
   - Upload large files (> 10MB)
   - Upload multiple files simultaneously
   - Test with various file types (PDF, DOCX, TXT)

3. **Performance Tests:**
   - Measure time savings vs sequential processing
   - Test with different file sizes
   - Monitor resource usage

## Future Enhancements

1. **Real-time Progress Streaming:**
   - Implement SSE or WebSocket for live updates
   - Show dual progress bars during upload
   - Display current stage for each pipeline

2. **Advanced Progress Tracking:**
   - Chunk-level progress for RAG pipeline
   - Token counting progress for Direct pipeline
   - Estimated time remaining

3. **Retry Logic:**
   - Automatic retry for failed pipelines
   - Exponential backoff
   - User-initiated retry

4. **Cancellation Support:**
   - Cancel individual pipelines
   - Cleanup resources on cancellation
   - Resume from checkpoint

## Conclusion

The parallel pipeline implementation significantly improves upload performance while maintaining all existing functionality. The progress tracking infrastructure is in place and ready for real-time updates when SSE/WebSocket support is added.

---

**Implementation Date:** March 19, 2026  
**Author:** Bob (AI Assistant)  
**Status:** ✅ Complete (Backend + Components), ⏳ Pending (Real-time Streaming)