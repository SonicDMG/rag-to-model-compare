'use client';

import { useState } from 'react';
import { DirectResult } from '@/types/rag-comparison';
import { ProcessingEvent, PipelineType } from '@/types/processing-events';
import { ExpandableText } from '../shared/ExpandableText';
import { MetricsBreakdownPanel } from './MetricsBreakdownPanel';
import { ProcessingTimeline } from '../processing/ProcessingTimeline';

interface HybridSectionProps {
  directResult: DirectResult | null;
  isQuerying: boolean;
  error: string | null;
  documentTokens?: number;
  processingEvents?: ProcessingEvent[];
  processedContent?: string;
  hideAnswer?: boolean;
  hideTimeline?: boolean;
  inferenceModel?: string;
}

export function HybridSection({
  directResult,
  isQuerying,
  error,
  documentTokens,
  processingEvents,
  processedContent,
  hideAnswer = false,
  hideTimeline = false,
  inferenceModel
}: HybridSectionProps) {
  const [showProcessedText, setShowProcessedText] = useState(false);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue/20 to-blue/10 rounded-unkey-lg p-6 border border-blue/30 h-[140px] flex flex-col justify-center shadow-unkey-card">
        <h2 className="text-2xl font-bold text-white mb-2">
          Hybrid Approach
        </h2>
        <p className="text-unkey-gray-200">
          The entire document is sent directly to the model's context window without chunking or retrieval steps
        </p>
      </div>

      {/* Processing Timeline */}
      {!hideTimeline && processingEvents && processingEvents.length > 0 && (
        <ProcessingTimeline
          pipeline={PipelineType.DIRECT}
          events={processingEvents}
        />
      )}

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
        <div className="bg-blue/10 border border-blue/20 rounded-unkey-lg p-6 shadow-unkey-card h-[140px]">
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-blue"
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
                Processing direct query...
              </p>
              <p className="text-sm text-unkey-gray-300 mt-1">
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
          {!hideAnswer && (
            <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card p-6 border border-blue/30">
              <h3 className="text-xl font-bold text-white mb-4">Answer</h3>
              
              <div className="prose prose-sm max-w-none min-h-[180px]">
                <ExpandableText text={directResult.answer} characterLimit={400} />
              </div>
            </div>
          )}

          {/* Metrics Display */}
          <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Performance Metrics</h3>
            
            {/* Model Information */}
            {inferenceModel && (
              <div className="mb-6 pb-6 border-b border-unkey-gray-700">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Model Configuration</h4>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue/20 text-blue border border-blue/30">
                    {inferenceModel}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue/10 text-blue">
                    Local
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Generation Time */}
              <div className="bg-blue/10 rounded-unkey-lg p-4 border border-blue/20">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Generation Time</h4>
                <p className="text-2xl font-bold text-blue">
                  {directResult.metrics.generationTime.toFixed(0)}ms
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  No retrieval step needed
                </p>
              </div>

              {/* Token Usage */}
              <div className="bg-blue/10 rounded-unkey-lg p-4 border border-blue/20">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Tokens Used</h4>
                <p className="text-2xl font-bold text-blue">
                  {directResult.metrics.tokens.toLocaleString()}
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  Full document in context
                </p>
              </div>

              {/* Cost */}
              <div className="bg-blue/10 rounded-unkey-lg p-4 border border-blue/20 md:col-span-2">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Cost</h4>
                <p className="text-2xl font-bold text-blue">
                  ${directResult.metrics.cost.toFixed(4)}
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  Single API call
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Metrics Breakdown */}
          {directResult.metrics.breakdown && (
            <MetricsBreakdownPanel
              breakdown={directResult.metrics.breakdown}
              pipelineType="direct"
              documentTokens={documentTokens}
            />
          )}

          {/* Processed Content Display */}
          {processedContent && (
            <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
              <button
                onClick={() => setShowProcessedText(!showProcessedText)}
                className="flex items-center gap-2 text-sm font-medium text-blue hover:text-blue/80 transition-colors"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${showProcessedText ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {showProcessedText ? 'Hide processed text' : 'Show processed text'}
              </button>
              
              {showProcessedText && (
                <div className="mt-4 p-4 bg-unkey-gray-800 border border-blue/20 rounded-unkey-md max-h-96 overflow-auto">
                  <pre className="text-xs font-mono text-unkey-gray-200 whitespace-pre-wrap break-words">
                    {processedContent}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>
      )}

    </div>
  );
}

// Made with Bob