'use client';

import { useState } from 'react';

interface DirectUploadResultProps {
  status?: 'success' | 'error';
  tokenCount?: number;
  loadTime?: number;
  warnings?: string[];
  processedText?: string;
  error?: string;
  hasImages?: boolean;
  imageCount?: number;
}

export function DirectUploadResult({ status, tokenCount, loadTime, warnings, processedText, error, hasImages, imageCount }: DirectUploadResultProps) {
  const [showText, setShowText] = useState(false);

  if (!status) return null;

  return (
    <div className={`
      p-4 rounded-lg border-2
      ${status === 'success'
        ? 'bg-blue-50 border-blue-200'
        : 'bg-red-50 border-red-200'
      }
    `}>
      <h3 className="text-lg font-bold text-gray-900 mb-3">Direct Approach Results</h3>
      {status === 'success' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-blue-800">Successfully Processed</span>
          </div>
          <div className="ml-7 space-y-1">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Token Count:</span> {tokenCount?.toLocaleString()} tokens loaded into context
            </p>
            {loadTime !== undefined && (
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Upload Duration:</span> {loadTime}ms
              </p>
            )}
            {hasImages && imageCount !== undefined && (
              <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <span className="text-base">🖼️</span>
                  <span className="font-semibold">Contains {imageCount} image{imageCount !== 1 ? 's' : ''}</span>
                </p>
                <p className="text-xs text-blue-700 mt-1 ml-6">
                  Images are stripped during text extraction. Only text content is counted, which explains the lower token count compared to RAG.
                </p>
              </div>
            )}
          </div>
          {warnings && warnings.length > 0 && (
            <div className="mt-3 ml-7 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs font-medium text-yellow-800 mb-1">Warnings:</p>
              {warnings.map((warning, idx) => (
                <p key={idx} className="text-xs text-yellow-700">• {warning}</p>
              ))}
            </div>
          )}
          
          {/* Collapsible processed text section */}
          {processedText && (
            <div className="mt-3 ml-7">
              <button
                onClick={() => setShowText(!showText)}
                className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
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
                <div className="mt-2 p-3 bg-white border border-blue-300 rounded max-h-96 overflow-auto">
                  <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
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
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-800">Processing Failed</span>
          </div>
          <p className="text-sm text-red-700 ml-7">
            {error || 'Failed to process document'}
          </p>
        </div>
      )}
    </div>
  );
}

// Made with Bob
