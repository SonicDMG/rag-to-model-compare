'use client';

import { DocumentUpload, UploadResultData } from '@/components/upload/DocumentUpload';
import { RagUploadResult } from '@/components/upload/RagUploadResult';
import { HybridUploadResult } from '@/components/upload/HybridUploadResult';
import { DualPipelineUploadProgress } from '@/components/upload/DualPipelineUploadProgress';
import { PipelineProgress } from '@/types/rag-comparison';

export interface StreamingProgressData {
  isActive: boolean;
  filename: string;
  ragProgress: PipelineProgress;
  directProgress: PipelineProgress;
}

interface IngestTabProps {
  // Upload handlers
  onUploadComplete: (documentId: string) => void;
  onUploadResult: (result: UploadResultData) => void;
  onUploadStart?: () => void;
  onStreamingProgressChange?: (progress: StreamingProgressData | null) => void;
  
  // Upload result data
  uploadResult: UploadResultData | null;
  streamingProgress: StreamingProgressData | null;
}

/**
 * IngestTab - Contains document upload interface
 *
 * Features:
 * - Document upload with drag & drop
 * - Upload results display (RAG + Hybrid side-by-side)
 * - Real-time pipeline processing progress
 *
 * Note: Model configuration is now in the global config bar
 */
export function IngestTab({
  onUploadComplete,
  onUploadResult,
  onUploadStart,
  onStreamingProgressChange,
  uploadResult,
  streamingProgress,
}: IngestTabProps) {
  return (
    <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Document Upload - Full Width */}
      <section className="animate-slideUp">
        <DocumentUpload
          onUploadComplete={onUploadComplete}
          onUploadResult={onUploadResult}
          onUploadStart={onUploadStart}
          onStreamingProgressChange={onStreamingProgressChange}
        />
      </section>

      {/* Pipeline Processing Progress - Full Width */}
      {/* Show pipeline progress if we have streaming progress data (active or completed) */}
      {streamingProgress && (
        <section className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <DualPipelineUploadProgress
            ragProgress={streamingProgress.ragProgress}
            directProgress={streamingProgress.directProgress}
            filename={streamingProgress.filename}
          />
        </section>
      )}

      {/* Upload Results - Side by Side (2 Columns) */}
      {uploadResult && (uploadResult.ragStatus || uploadResult.directStatus) && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slideUp" style={{ animationDelay: '0.15s' }}>
          <RagUploadResult
            status={uploadResult.ragStatus}
            chunkCount={uploadResult.ragChunks}
            tokenCount={uploadResult.ragTokens}
            indexTime={uploadResult.ragIndexTime}
            processedText={uploadResult.ragProcessedText}
            error={uploadResult.ragError}
            hasImages={uploadResult.hasImages}
            imageCount={uploadResult.imageCount}
            fileSize={uploadResult.fileSize}
          />
          <HybridUploadResult
            status={uploadResult.directStatus}
            tokenCount={uploadResult.directTokens}
            loadTime={uploadResult.directLoadTime}
            warnings={uploadResult.directWarnings}
            processedText={uploadResult.directProcessedText}
            error={uploadResult.directError}
            hasImages={uploadResult.hasImages}
            imageCount={uploadResult.imageCount}
            fileSize={uploadResult.fileSize}
          />
        </section>
      )}
    </div>
  );
}

// Made with Bob