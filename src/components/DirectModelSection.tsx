'use client';

import { useState } from 'react';
import { QueryForm } from '@/components/QueryForm';
import { DirectResult } from '@/types/rag-comparison';
import { ExpandableText } from './ExpandableText';

interface DirectModelSectionProps {
  documentId: string;
}

export function DirectModelSection({ documentId }: DirectModelSectionProps) {
  const [isQuerying, setIsQuerying] = useState(false);
  const [directResult, setDirectResult] = useState<DirectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (query: string, docId: string, temperature?: number, maxTokens?: number) => {
    if (!docId) {
      setError('Please upload a document first');
      return;
    }

    setIsQuerying(true);
    setError(null);

    try {
      const response = await fetch('/api/rag-comparison/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          documentId: docId,
          temperature,
          maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

      const result = await response.json();
      // Extract only Direct result from comparison
      setDirectResult(result.direct);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDirectResult(null);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-blue-900 mb-2">
          Direct Context Approach
        </h2>
        <p className="text-blue-700">
          Full document is provided directly in the context window without chunking or retrieval
        </p>
      </div>

      {/* Query Section */}
      <section>
        <QueryForm
          documentId={documentId}
          onSubmit={handleQuery}
          isLoading={isQuerying}
        />
      </section>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg 
              className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                clipRule="evenodd" 
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isQuerying && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-center gap-3">
            <svg 
              className="animate-spin h-8 w-8 text-blue-600" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
              />
            </svg>
            <div>
              <p className="text-lg font-semibold text-blue-900">
                Processing direct query...
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Sending full document context to model
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {directResult && !isQuerying && (
        <section className="space-y-6">
          {/* Answer Display */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Answer</h3>
            
            <div className="prose prose-sm max-w-none">
              <ExpandableText text={directResult.answer} characterLimit={400} />
            </div>

            {/* Context Window Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Context Window Usage
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(directResult.metrics.contextWindowUsage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-700">
                    {directResult.metrics.contextWindowUsage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Percentage of model's context window used by the full document
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Generation Time */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Generation Time</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {directResult.metrics.generationTime.toFixed(0)}ms
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  No retrieval step needed
                </p>
              </div>

              {/* Token Usage */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Tokens Used</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {directResult.metrics.tokens.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Full document in context
                </p>
              </div>

              {/* Cost */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 md:col-span-2">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Cost</h4>
                <p className="text-2xl font-bold text-blue-700">
                  ${directResult.metrics.cost.toFixed(4)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Single API call
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

// Made with Bob