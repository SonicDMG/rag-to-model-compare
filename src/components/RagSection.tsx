'use client';

import { RAGResult } from '@/types/rag-comparison';
import { ExpandableText } from './ExpandableText';
import { MetricsBreakdownPanel } from './MetricsBreakdownPanel';
import { ModelInfoBadge } from './ModelInfoBadge';

interface RagSectionProps {
  ragResult: RAGResult | null;
  isQuerying: boolean;
  error: string | null;
  documentTokens?: number;
}

export function RagSection({
  ragResult,
  isQuerying,
  error,
  documentTokens
}: RagSectionProps) {

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-success/20 to-success/10 rounded-unkey-lg p-6 border border-success/30 h-[140px] flex flex-col justify-center shadow-unkey-card">
        <h2 className="text-2xl font-bold text-white mb-2">
          RAG Approach
        </h2>
        <p className="text-unkey-gray-200">
          Retrieval-Augmented Generation: Document is chunked and relevant pieces are retrieved for context
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-unkey-lg p-4 shadow-unkey-card">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
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
              <h3 className="text-sm font-semibold text-red-400">Error</h3>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isQuerying && (
        <div className="bg-success/10 border border-success/20 rounded-unkey-lg p-6 shadow-unkey-card">
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-success"
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
              <p className="text-lg font-semibold text-white">
                Processing RAG query...
              </p>
              <p className="text-sm text-unkey-gray-300 mt-1">
                Retrieving relevant chunks and generating answer
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {ragResult && !isQuerying && (
        <section className="space-y-6">
          {/* Answer Display */}
          <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card p-6 border border-success/30">
            <h3 className="text-xl font-bold text-white mb-4">Answer</h3>
            
            <div className="prose prose-sm max-w-none">
              <ExpandableText text={ragResult.answer} characterLimit={400} />
            </div>

            {/* Source Citations */}
            {ragResult.sources && ragResult.sources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-unkey-gray-700">
                <h4 className="text-sm font-semibold text-unkey-gray-200 mb-3">
                  Source Citations ({ragResult.sources.length})
                </h4>
                <div className="space-y-3">
                  {ragResult.sources.map((source, index) => (
                    <div
                      key={source.id}
                      className="bg-success/10 rounded-unkey-md p-3 text-sm border border-success/20"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-success text-white rounded-full flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-unkey-gray-300 line-clamp-3">
                            {source.content}
                          </p>
                          {source.metadata?.index !== undefined && (
                            <p className="text-xs text-unkey-gray-500 mt-1">
                              Chunk {source.metadata.index + 1}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metrics Display */}
          <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Performance Metrics</h3>
            
            {/* Model Information */}
            {ragResult.metrics.breakdown?.metadata.model && (
              <div className="mb-6 pb-6 border-b border-unkey-gray-700">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Model Configuration</h4>
                <ModelInfoBadge
                  modelId={ragResult.metrics.breakdown.metadata.model}
                  variant="success"
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Generation Time */}
              <div className="bg-success/10 rounded-unkey-lg p-4 border border-success/20">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Generation Time</h4>
                <p className="text-2xl font-bold text-success">
                  {ragResult.metrics.generationTime.toFixed(0)}ms
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  Retrieval: {ragResult.metrics.retrievalTime.toFixed(0)}ms
                </p>
              </div>

              {/* Token Usage */}
              <div className="bg-success/10 rounded-unkey-lg p-4 border border-success/20">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Tokens Used</h4>
                <p className="text-2xl font-bold text-success">
                  {ragResult.metrics.tokens.toLocaleString()}
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  Retrieved chunks only
                </p>
              </div>

              {/* Cost */}
              <div className="bg-success/10 rounded-unkey-lg p-4 border border-success/20 md:col-span-2">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Cost</h4>
                <p className="text-2xl font-bold text-success">
                  ${ragResult.metrics.cost.toFixed(4)}
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  Total: {(ragResult.metrics.retrievalTime + ragResult.metrics.generationTime).toFixed(0)}ms
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Metrics Breakdown */}
          {ragResult.metrics.breakdown && (
            <MetricsBreakdownPanel
              breakdown={ragResult.metrics.breakdown}
              pipelineType="rag"
              documentTokens={documentTokens}
            />
          )}
        </section>
      )}

    </div>
  );
}

// Made with Bob