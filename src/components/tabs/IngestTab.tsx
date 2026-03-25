'use client';

import { ModelConfigSection } from '@/components/processing/ModelConfigSection';
import { DocumentUpload, UploadResultData } from '@/components/upload/DocumentUpload';
import { RagUploadResult } from '@/components/upload/RagUploadResult';
import { HybridUploadResult } from '@/components/upload/HybridUploadResult';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
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
  
  // Upload result data
  uploadResult: UploadResultData | null;
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
  uploadResult,
}: IngestTabProps) {
  return (
    <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Model Configuration Section */}
      <section className="animate-slideUp">
        <ModelConfigSection
          selectedModel={ollamaModel}
          onModelChange={onOllamaModelChange}
          isOllamaAvailable={isOllamaAvailable}
          availableModels={availableOllamaModels}
        />
      </section>

      {/* Document Upload Section */}
      <section className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
        <DocumentUpload
          onUploadComplete={onUploadComplete}
          onUploadResult={onUploadResult}
        />
      </section>

      {/* Upload Results - Side by Side */}
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