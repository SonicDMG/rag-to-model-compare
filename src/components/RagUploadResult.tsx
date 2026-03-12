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
}

export function RagUploadResult({ status, chunkCount, tokenCount, indexTime, processedText, error, hasImages, imageCount }: RagUploadResultProps) {
  const [showText, setShowText] = useState(false);

  if (!status) return null;

  return (
    <div className={`
      p-4 rounded-unkey-lg border shadow-unkey-card
      ${status === 'success'
        ? 'bg-success/10 border-success/20'
        : 'bg-red-500/10 border-red-500/20'
      }
    `}>
      <h3 className="text-lg font-bold text-white mb-3">RAG Approach Results</h3>
      {status === 'success' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-success">Successfully Processed</span>
          </div>
          <div className="ml-7 space-y-1">
            {tokenCount !== undefined && (
              <p className="text-sm text-unkey-gray-300">
                <span className="font-semibold text-unkey-gray-200">Token Count:</span> {tokenCount.toLocaleString()} tokens loaded into context
              </p>
            )}
            {indexTime !== undefined && (
              <p className="text-sm text-unkey-gray-300">
                <span className="font-semibold text-unkey-gray-200">Upload Duration:</span> {indexTime}ms
              </p>
            )}
            {hasImages && imageCount !== undefined && (
              <div className="mt-2 p-2 bg-success/20 border border-success/30 rounded-unkey-md">
                <p className="text-sm text-success flex items-center gap-2">
                  <span className="text-base">🖼️</span>
                  <span className="font-semibold">Contains {imageCount} image{imageCount !== 1 ? 's' : ''}</span>
                </p>
                <p className="text-xs text-unkey-gray-300 mt-1 ml-6">
                  Images are processed by RAG and contribute to the token count. This explains why RAG token counts may be higher than direct text extraction.
                </p>
              </div>
            )}
          </div>
          
          {/* Collapsible processed text section */}
          {processedText && (
            <div className="mt-3 ml-7">
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
