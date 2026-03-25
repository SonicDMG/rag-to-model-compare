'use client';

import { UploadResultBase } from './UploadResultBase';

interface RagUploadResultProps {
  status?: 'success' | 'error';
  chunkCount?: number;
  tokenCount?: number;
  indexTime?: number;
  processedText?: string;
  error?: string;
  hasImages?: boolean;
  imageCount?: number;
  fileSize?: number;
  skipped?: boolean;
  existingDocument?: {
    id: string;
    filename: string;
    uploadedAt?: string;
  };
  message?: string;
}

export function RagUploadResult(props: RagUploadResultProps) {
  return <UploadResultBase pipelineType="rag" {...props} />;
}

// Made with Bob
