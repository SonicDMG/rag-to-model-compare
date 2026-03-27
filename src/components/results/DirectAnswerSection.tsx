'use client';

import { OllamaResult } from '@/types/ollama';
import { ProcessingEvent, PipelineType } from '@/types/processing-events';
import { ExpandableText } from '../shared/ExpandableText';
import { ProcessingTimeline } from '../processing/ProcessingTimeline';
import { Spinner } from '../ui/Spinner';

interface DirectAnswerSectionProps {
  ollamaResult: OllamaResult | null;
  isQuerying: boolean;
  error: string | null;
  processingEvents?: ProcessingEvent[];
  selectedModel?: string;
}

/**
 * Simplified Direct (Ollama) section for Query tab - shows answer and timeline only
 */
export function DirectAnswerSection({
  ollamaResult,
  isQuerying,
  error,
  processingEvents,
  selectedModel,
}: DirectAnswerSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/10 rounded-unkey-lg p-6 border border-purple-500/30 h-[140px] flex flex-col justify-center shadow-unkey-card">
        <h2 className="text-2xl font-bold text-white mb-2">
          Direct Approach
        </h2>
        <p className="text-unkey-gray-200">
          Local LLM: Complete privacy, zero API costs, runs entirely on your machine
        </p>
      </div>

      {/* Processing Timeline */}
      {processingEvents && processingEvents.length > 0 && (
        <ProcessingTimeline
          pipeline={PipelineType.OLLAMA}
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
      {isQuerying && !ollamaResult && !error && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg p-8 border border-unkey-gray-700">
          <div className="flex items-center justify-center gap-3">
            <Spinner size="lg" className="text-purple-400" />
            <span className="text-unkey-gray-300">Processing Direct query with {selectedModel || 'Ollama'}...</span>
          </div>
        </div>
      )}

      {/* Answer Display */}
      {ollamaResult && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg p-6 border border-unkey-gray-700 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Answer</h3>
            {/* Quick Metrics */}
            <div className="flex gap-4 text-sm text-unkey-gray-400">
              <span>
                ⚡ {(ollamaResult.metrics.generationTime / 1000).toFixed(2)}s
              </span>
              <span>
                🎯 {ollamaResult.metrics.tokens.toLocaleString()} tokens
              </span>
              <span className="text-green-400">
                💰 Free
              </span>
            </div>
          </div>
          
          <ExpandableText text={ollamaResult.answer} characterLimit={500} />

          {/* Model Info */}
          <div className="mt-4 pt-4 border-t border-unkey-gray-700">
            <div className="flex items-center gap-2 text-sm text-unkey-gray-400">
              <span>Model:</span>
              <span className="text-white font-semibold">
                {selectedModel || 'Unknown'}
              </span>
              <span className="ml-4">Context Window Usage:</span>
              <span className="text-white font-semibold">
                {ollamaResult.metrics.contextWindowUsage?.toFixed(1) || 'N/A'}%
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Made with Bob