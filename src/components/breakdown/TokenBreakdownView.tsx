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
      <div className="bg-unkey-gray-850 rounded-unkey-lg p-4 border border-unkey-gray-700 shadow-unkey-card">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-unkey-gray-200">Total Tokens</h4>
          <span className="text-2xl font-bold text-white">
            {formatTokens(tokens.total)}
          </span>
        </div>
      </div>

      {/* Input/Output Breakdown */}
      <div className="space-y-3">
        {/* Input Tokens */}
        <div className="bg-unkey-gray-850 rounded-unkey-md p-4 border border-unkey-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-unkey-gray-200">Input Tokens</h5>
            <span className="text-lg font-bold text-unkey-teal-400">
              {formatTokens(tokens.totalInput)}
            </span>
          </div>
          <ProgressBar
            percentage={inputPercentage}
            variant="teal"
            height="sm"
          />

          {/* Input Token Breakdown */}
          <div className="mt-3 space-y-2 pl-4 border-l-2 border-unkey-teal-500/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-unkey-gray-400">System Prompt</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {formatTokens(tokens.systemPrompt)}
                </span>
                <span className="text-xs text-unkey-gray-500">
                  ({systemPromptPercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-unkey-gray-400">Query</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {formatTokens(tokens.query)}
                </span>
                <span className="text-xs text-unkey-gray-500">
                  ({queryPercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-unkey-gray-400">Context</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {formatTokens(tokens.context)}
                </span>
                <span className="text-xs text-unkey-gray-500">
                  ({contextPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Output Tokens */}
        <div className="bg-unkey-gray-850 rounded-unkey-md p-4 border border-unkey-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-unkey-gray-200">Output Tokens</h5>
            <span className="text-lg font-bold text-green-400">
              {formatTokens(tokens.output)}
            </span>
          </div>
          <ProgressBar
            percentage={outputPercentage}
            variant="success"
            height="sm"
          />
        </div>
      </div>

      {/* Per-Source Breakdown (RAG only) */}
      {isRAG && tokens.perSource && tokens.perSource.length > 0 && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg p-4 border border-unkey-gray-700">
          <h5 className="text-base font-medium text-unkey-gray-200 mb-3">
            Per-Source Token Usage
          </h5>
          <div className="space-y-2">
            {visibleSources?.map((source, index) => {
              const sourcePercent = (source.tokens / tokens.context) * 100;
              return (
                <div
                  key={source.sourceId}
                  className="bg-unkey-gray-850 rounded-unkey-md p-3 border border-unkey-gray-700 hover:border-unkey-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-unkey-gray-400">
                      Source {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {formatTokens(source.tokens)}
                      </span>
                      <span className="text-xs text-unkey-gray-500">
                        ({sourcePercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-unkey-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-unkey-teal-500 to-unkey-teal-400 transition-all duration-500"
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
              className="mt-3 text-sm text-unkey-teal-400 hover:text-unkey-teal-300 font-medium transition-colors"
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
        <h5 className="text-sm font-medium text-unkey-gray-400 mb-2">Token Distribution</h5>
        <div className="flex h-8 rounded-unkey-md overflow-hidden border border-unkey-gray-700 bg-unkey-gray-850">
          <div
            className="bg-gradient-to-r from-unkey-teal-500 to-unkey-teal-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${inputPercentage}%` }}
            title={`Input: ${inputPercentage.toFixed(1)}%`}
          >
            {inputPercentage > 15 && `${inputPercentage.toFixed(0)}%`}
          </div>
          <div
            className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${outputPercentage}%` }}
            title={`Output: ${outputPercentage.toFixed(1)}%`}
          >
            {outputPercentage > 15 && `${outputPercentage.toFixed(0)}%`}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-unkey-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-unkey-teal-500 rounded"></span>
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