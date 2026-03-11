'use client';

import { useState } from 'react';
import { TokenBreakdown } from '@/types/rag-comparison';
import { formatTokens } from '@/lib/utils/formatters';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface TokenBreakdownViewProps {
  tokens: TokenBreakdown;
  isRAG: boolean;
}

export function TokenBreakdownView({ tokens, isRAG }: TokenBreakdownViewProps) {
  const [showAllSources, setShowAllSources] = useState(false);

  const inputPercentage = (tokens.totalInput / tokens.total) * 100;
  const outputPercentage = (tokens.output / tokens.total) * 100;

  const systemPromptPercent = (tokens.systemPrompt / tokens.total) * 100;
  const queryPercent = (tokens.query / tokens.total) * 100;
  const contextPercent = (tokens.context / tokens.total) * 100;

  const visibleSources = showAllSources
    ? tokens.perSource
    : tokens.perSource?.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Total Tokens */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Total Tokens</h4>
          <span className="text-2xl font-bold text-gray-900">
            {formatTokens(tokens.total)}
          </span>
        </div>
      </div>

      {/* Input/Output Breakdown */}
      <div className="space-y-3">
        {/* Input Tokens */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-gray-700">Input Tokens</h5>
            <span className="text-lg font-bold text-blue-700">
              {formatTokens(tokens.totalInput)}
            </span>
          </div>
          <ProgressBar
            percentage={inputPercentage}
            variant="blue"
            height="sm"
          />

          {/* Input Token Breakdown */}
          <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-300">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">System Prompt</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {formatTokens(tokens.systemPrompt)}
                </span>
                <span className="text-xs text-gray-500">
                  ({systemPromptPercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Query</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {formatTokens(tokens.query)}
                </span>
                <span className="text-xs text-gray-500">
                  ({queryPercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Context</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {formatTokens(tokens.context)}
                </span>
                <span className="text-xs text-gray-500">
                  ({contextPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Output Tokens */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-gray-700">Output Tokens</h5>
            <span className="text-lg font-bold text-green-700">
              {formatTokens(tokens.output)}
            </span>
          </div>
          <ProgressBar
            percentage={outputPercentage}
            variant="green"
            height="sm"
          />
        </div>
      </div>

      {/* Per-Source Breakdown (RAG only) */}
      {isRAG && tokens.perSource && tokens.perSource.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h5 className="text-sm font-semibold text-gray-700 mb-3">
            Per-Source Token Usage
          </h5>
          <div className="space-y-2">
            {visibleSources?.map((source, index) => {
              const sourcePercent = (source.tokens / tokens.context) * 100;
              return (
                <div
                  key={source.sourceId}
                  className="bg-white rounded p-3 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      Source {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatTokens(source.tokens)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({sourcePercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${sourcePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {tokens.perSource.length > 3 && (
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {showAllSources
                ? 'Show fewer sources'
                : `Show all ${tokens.perSource.length} sources`}
            </button>
          )}
        </div>
      )}

      {/* Token Distribution Visualization */}
      <div className="mt-4">
        <h5 className="text-xs font-medium text-gray-600 mb-2">Token Distribution</h5>
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-300">
          <div
            className="bg-blue-500 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${inputPercentage}%` }}
            title={`Input: ${inputPercentage.toFixed(1)}%`}
          >
            {inputPercentage > 15 && `${inputPercentage.toFixed(0)}%`}
          </div>
          <div
            className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${outputPercentage}%` }}
            title={`Output: ${outputPercentage.toFixed(1)}%`}
          >
            {outputPercentage > 15 && `${outputPercentage.toFixed(0)}%`}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded"></span>
            Input
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            Output
          </span>
        </div>
      </div>
    </div>
  );
}

// Made with Bob