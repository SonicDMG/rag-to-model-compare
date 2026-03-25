'use client';

import { useState } from 'react';

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

export function RagUploadResult({ status, tokenCount, indexTime, processedText, error, hasImages, imageCount, fileSize, skipped, existingDocument, message }: RagUploadResultProps) {
  const [showText, setShowText] = useState(false);

  if (!status) return null;

  // Estimate raw file size in tokens (rough estimate: 1 token ≈ 4 characters)
  const estimatedRawTokens = fileSize ? Math.ceil(fileSize / 4) : undefined;

  return (
    <div className={`
      p-4 rounded-unkey-lg border shadow-unkey-card flex flex-col min-h-[280px]
      ${status === 'success'
        ? skipped ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-success/10 border-success/20'
        : 'bg-red-500/10 border-red-500/20'
      }
    `}>
      <h3 className="text-lg font-bold text-white mb-3">RAG Approach Results</h3>
      {status === 'success' && skipped ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-yellow-400">File Already Indexed - Skipped</span>
          </div>
          
          <div className="ml-7 space-y-2">
            <p className="text-sm text-unkey-gray-300">
              {message || 'This file has already been indexed in OpenSearch.'}
            </p>
            
            {existingDocument && (
              <div className="mt-3 p-3 bg-unkey-gray-900/50 border border-yellow-500/30 rounded-unkey-md space-y-2">
                <p className="text-sm font-semibold text-unkey-gray-200">Existing Document:</p>
                <div className="space-y-1 text-sm text-unkey-gray-300">
                  <p className="flex items-start gap-2">
                    <span className="text-unkey-gray-400">•</span>
                    <span>
                      <span className="font-medium text-unkey-gray-200">Document ID:</span> {existingDocument.id}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-unkey-gray-400">•</span>
                    <span>
                      <span className="font-medium text-unkey-gray-200">Filename:</span> {existingDocument.filename}
                    </span>
                  </p>
                  {existingDocument.uploadedAt && (
                    <p className="flex items-start gap-2">
                      <span className="text-unkey-gray-400">•</span>
                      <span>
                        <span className="font-medium text-unkey-gray-200">Originally Uploaded:</span> {new Date(existingDocument.uploadedAt).toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-3 p-2 bg-blue/10 border border-blue/20 rounded-unkey-md">
              <p className="text-xs text-blue">
                💡 <span className="font-semibold">Tip:</span> To re-index this file, delete it from OpenSearch first or rename the file before uploading.
              </p>
            </div>
          </div>
        </div>
      ) : status === 'success' ? (
        <div className="flex flex-col flex-grow">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-success">Successfully Processed</span>
            </div>
            
            {/* Token Analysis Section */}
            <div className="ml-7 space-y-2">
              <p className="text-sm font-semibold text-unkey-gray-200">Token Analysis:</p>
              <div className="space-y-1 text-sm text-unkey-gray-300">
                {estimatedRawTokens && (
                  <p className="flex items-start gap-2">
                    <span className="text-unkey-gray-400">•</span>
                    <span>
                      <span className="font-medium text-unkey-gray-200">Raw File Size:</span> ~{estimatedRawTokens.toLocaleString()} tokens <span className="text-xs text-unkey-gray-400">(estimated from file size)</span>
                    </span>
                  </p>
                )}
                {tokenCount !== undefined && (
                  <p className="flex items-start gap-2">
                    <span className="text-unkey-gray-400">•</span>
                    <span>
                      <span className="font-medium text-unkey-gray-200">Indexed Content:</span> {tokenCount.toLocaleString()} tokens <span className="text-xs text-unkey-gray-400">(processed by RAG)</span>
                    </span>
                  </p>
                )}
                {tokenCount !== undefined && (
                  <p className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <span>
                      <span className="font-medium text-success">Usable Content:</span> {tokenCount.toLocaleString()} tokens
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Images Section */}
            {hasImages && imageCount !== undefined && (
              <div className="ml-7">
                <div className="p-2 bg-success/20 border border-success/30 rounded-unkey-md">
                  <p className="text-sm text-success flex items-center gap-2">
                    <span className="text-base">🖼️</span>
                    <span className="font-semibold">Contains {imageCount} image{imageCount !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-xs text-unkey-gray-300 mt-1 ml-6">
                    Images are processed by RAG and contribute to the token count.
                  </p>
                </div>
              </div>
            )}

            {/* Duration Section */}
            {indexTime !== undefined && (
              <div className="ml-7">
                <p className="text-sm text-unkey-gray-300">
                  <span className="font-semibold text-unkey-gray-200">Upload Duration:</span> {indexTime}ms
                </p>
              </div>
            )}
          </div>
          
          {/* Collapsible processed text section - pushed to bottom */}
          {processedText && (
            <div className="mt-auto pt-3 ml-7">
              <button
                onClick={() => setShowText(!showText)}
                className="flex items-center gap-2 text-sm font-medium text-success hover:text-success/80 transition-colors"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${showText ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {showText ? 'Hide processed text' : 'Show processed text'}
              </button>
              
              {showText && (
                <div className="mt-2 p-3 bg-unkey-gray-900 border border-success/30 rounded-unkey-md max-h-96 overflow-auto">
                  <pre className="text-xs font-mono text-unkey-gray-200 whitespace-pre-wrap break-words">
                    {processedText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-400">Processing Failed</span>
          </div>
          <p className="text-sm text-red-300 ml-7">
            {error || 'Failed to process document'}
          </p>
        </div>
      )}
    </div>
  );
}

// Made with Bob
