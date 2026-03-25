'use client';

import { UploadResultBase } from './UploadResultBase';

interface HybridUploadResultProps {
  status?: 'success' | 'error';
  tokenCount?: number;
  loadTime?: number;
  warnings?: string[];
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

export function HybridUploadResult(props: HybridUploadResultProps) {
  return <UploadResultBase pipelineType="direct" {...props} />;
}

// Made with Bob
