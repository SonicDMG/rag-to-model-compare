'use client';

import { RAGResult } from '@/types/rag-comparison';
import { ProcessingEvent, PipelineType } from '@/types/processing-events';
import { ExpandableText } from '../shared/ExpandableText';
import { ProcessingTimeline } from '../processing/ProcessingTimeline';
import { Spinner } from '../ui/Spinner';

interface RagAnswerSectionProps {
  ragResult: RAGResult | null;
  isQuerying: boolean;
  error: string | null;
  processingEvents?: ProcessingEvent[];
}

/**
 * Simplified RAG section for Query tab - shows answer and timeline only
 */
export function RagAnswerSection({
  ragResult,
  isQuerying,
  error,
  processingEvents,
}: RagAnswerSectionProps) {
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

      {/* Processing Timeline */}
      {processingEvents && processingEvents.length > 0 && (
        <ProcessingTimeline
          pipeline={PipelineType.RAG}
          events={processingEvents}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-unkey-lg p-6">
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
              <h3 className="text-lg font-semibold text-red-400 mb-2">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isQuerying && !ragResult && !error && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg p-8 border border-unkey-gray-700">
          <div className="flex items-center justify-center gap-3">
            <Spinner size="lg" className="text-success" />
            <span className="text-unkey-gray-300">Processing RAG query...</span>
          </div>
        </div>
      )}

      {/* Answer Display */}
      {ragResult && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg p-6 border border-unkey-gray-700 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Answer</h3>
            {/* Quick Metrics */}
            <div className="flex gap-4 text-sm text-unkey-gray-400">
              <span>
                ⚡ {((ragResult.metrics.breakdown?.timing.totalTime ?? ragResult.metrics.retrievalTime) / 1000).toFixed(2)}s
              </span>
              <span>
                🎯 {ragResult.metrics.tokens.toLocaleString()} tokens
              </span>
              <span>
                💰 ${ragResult.metrics.cost.toFixed(4)}
              </span>
            </div>
          </div>
          
          <ExpandableText text={ragResult.answer} characterLimit={500} />

          {/* Sources */}
          {ragResult.sources && ragResult.sources.length > 0 && (
            <div className="mt-6 pt-6 border-t border-unkey-gray-700">
              <h4 className="text-sm font-semibold text-unkey-gray-300 mb-3">
                Retrieved Sources ({ragResult.sources.length})
              </h4>
              <div className="space-y-2">
                {ragResult.sources.slice(0, 3).map((source, idx) => (
                  <div key={source.id} className="bg-unkey-gray-850 rounded p-3 text-sm">
                    <div className="text-unkey-gray-400 mb-1">Chunk {idx + 1}</div>
                    <ExpandableText text={source.content} characterLimit={150} />
                  </div>
                ))}
                {ragResult.sources.length > 3 && (
                  <div className="text-sm text-unkey-gray-500 text-center pt-2">
                    + {ragResult.sources.length - 3} more sources
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Model Info */}
          <div className="mt-4 pt-4 border-t border-unkey-gray-700">
            <div className="flex items-center gap-2 text-sm text-unkey-gray-400">
              <span>Model:</span>
              <span className="text-white font-semibold">
                {ragResult.model}
              </span>
              {ragResult.metrics.contextWindowUsage !== undefined && (
                <>
                  <span className="ml-4">Context Window Usage:</span>
                  <span className="text-white font-semibold">
                    {ragResult.metrics.contextWindowUsage.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Made with Bob