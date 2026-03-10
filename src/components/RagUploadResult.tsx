'use client';

interface RagUploadResultProps {
  status?: 'success' | 'error';
  chunkCount?: number;
  tokenCount?: number;
  indexTime?: number;
  error?: string;
}

export function RagUploadResult({ status, chunkCount, tokenCount, indexTime, error }: RagUploadResultProps) {
  if (!status) return null;

  return (
    <div className={`
      p-4 rounded-lg border-2
      ${status === 'success'
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
      }
    `}>
      <h3 className="text-lg font-bold text-gray-900 mb-3">RAG Approach Results</h3>
      {status === 'success' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800">Successfully Processed</span>
          </div>
          <div className="ml-7 space-y-1">
            {tokenCount !== undefined && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Tokens:</span> {tokenCount.toLocaleString()} uploaded
              </p>
            )}
            {chunkCount !== undefined && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Chunks:</span> {chunkCount} indexed
              </p>
            )}
            {indexTime !== undefined && (
              <p className="text-sm text-green-700">
                <span className="font-semibold">Upload Duration:</span> {indexTime}ms
              </p>
            )}
          </div>
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
