'use client';

import { DirectResult } from '@/types/rag-comparison';
import { ProcessingEvent, PipelineType } from '@/types/processing-events';
import { ExpandableText } from '../shared/ExpandableText';
import { ProcessingTimeline } from '../processing/ProcessingTimeline';

interface HybridAnswerSectionProps {
  directResult: DirectResult | null;
  isQuerying: boolean;
  error: string | null;
  processingEvents?: ProcessingEvent[];
}

/**
 * Simplified Hybrid section for Query tab - shows answer and timeline only
 * For detailed metrics, see Performance tab
 */
export function HybridAnswerSection({
  directResult,
  isQuerying,
  error,
  processingEvents,
}: HybridAnswerSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 rounded-unkey-lg p-6 border border-blue-500/30 h-[140px] flex flex-col justify-center shadow-unkey-card">
        <h2 className="text-2xl font-bold text-white mb-2">
          Hybrid Approach
        </h2>
        <p className="text-unkey-gray-200">
          Full Document Context: Entire document sent directly to the model without chunking
        </p>
      </div>

      {/* Processing Timeline */}
      {processingEvents && processingEvents.length > 0 && (
        <ProcessingTimeline
          pipeline={PipelineType.DIRECT}
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
      {isQuerying && !directResult && !error && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg p-8 border border-unkey-gray-700">
          <div className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-unkey-gray-300">Processing Hybrid query...</span>
          </div>
        </div>
      )}

      {/* Answer Display */}
      {directResult && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg p-6 border border-unkey-gray-700 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Answer</h3>
            {/* Quick Metrics */}
            <div className="flex gap-4 text-sm text-unkey-gray-400">
              <span>
                ⚡ {(directResult.metrics.generationTime / 1000).toFixed(2)}s
              </span>
              <span>
                🎯 {directResult.metrics.tokens.toLocaleString()} tokens
              </span>
              <span>
                💰 ${directResult.metrics.cost.toFixed(4)}
              </span>
            </div>
          </div>
          
          <ExpandableText text={directResult.answer} characterLimit={500} />

          {/* Context Window Usage */}
          <div className="mt-4 pt-4 border-t border-unkey-gray-700">
            <div className="flex items-center gap-2 text-sm text-unkey-gray-400">
              <span>Context Window Usage:</span>
              <span className="text-white font-semibold">
                {directResult.metrics.contextWindowUsage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Link to Performance Tab */}
          <div className="mt-4 pt-4 border-t border-unkey-gray-700">
            <a
              href="#performance"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
            >
              <span>View detailed metrics in Performance tab</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob