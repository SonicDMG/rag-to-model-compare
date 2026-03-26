'use client';

import { ModelConfigSection } from '@/components/processing/ModelConfigSection';
import { DocumentUpload, UploadResultData } from '@/components/upload/DocumentUpload';
import { RagUploadResult } from '@/components/upload/RagUploadResult';
import { HybridUploadResult } from '@/components/upload/HybridUploadResult';
import { DualPipelineUploadProgress, PipelineStatus } from '@/components/upload/DualPipelineUploadProgress';
import { ProcessingEvent } from '@/types/processing-events';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
}

export interface StreamingProgressData {
  isActive: boolean;
  filename: string;
  ragProgress: {
    status: PipelineStatus;
    currentOperation?: string;
    events: ProcessingEvent[];
    error?: string;
    result?: any;
  };
  directProgress: {
    status: PipelineStatus;
    currentOperation?: string;
    events: ProcessingEvent[];
    error?: string;
    result?: any;
  };
}

interface IngestTabProps {
  // Model configuration
  ollamaModel: string;
  onOllamaModelChange: (model: string) => void;
  isOllamaAvailable: boolean;
  availableOllamaModels: OllamaModelInfo[];
  
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
 * IngestTab - Contains document upload and model configuration
 * 
 * Features:
 * - Model configuration section
 * - Document upload with drag & drop
 * - Upload results display (RAG + Hybrid side-by-side)
 */
export function IngestTab({
  ollamaModel,
  onOllamaModelChange,
  isOllamaAvailable,
  availableOllamaModels,
  onUploadComplete,
  onUploadResult,
  onUploadStart,
  onStreamingProgressChange,
  uploadResult,
  streamingProgress,
}: IngestTabProps) {
  return (
    <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Upload and Model Configuration - 3 Column Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slideUp items-stretch">
        {/* Document Upload - Takes 2 columns */}
        <div className="lg:col-span-2 flex w-full">
          <div className="w-full">
            <DocumentUpload
              onUploadComplete={onUploadComplete}
              onUploadResult={onUploadResult}
              onUploadStart={onUploadStart}
              onStreamingProgressChange={onStreamingProgressChange}
            />
          </div>
        </div>

        {/* Model Configuration - Takes 1 column on the right */}
        <div className="lg:col-span-1 flex w-full">
          <div className="w-full">
            <ModelConfigSection
              selectedModel={ollamaModel}
              onModelChange={onOllamaModelChange}
              isOllamaAvailable={isOllamaAvailable}
              availableModels={availableOllamaModels}
            />
          </div>
        </div>
      </section>

      {/* Pipeline Processing Progress - Full Width (All 3 Columns) */}
      {streamingProgress && streamingProgress.isActive && (
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