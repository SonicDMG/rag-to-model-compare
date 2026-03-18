'use client';

import { useState } from 'react';
import { OllamaResult } from '@/types/ollama';
import { ExpandableText } from './ExpandableText';
import { MetricsBreakdownPanel } from './MetricsBreakdownPanel';

interface OllamaSectionProps {
  ollamaResult: OllamaResult | null;
  isQuerying: boolean;
  error: string | null;
  documentTokens?: number;
  selectedModel?: string;
  availableModels?: Array<{
    name: string;
    displayName: string;
    supportsImages: boolean;
  }>;
  onModelChange?: (model: string) => void;
  isOllamaAvailable?: boolean;
}

export function OllamaSection({
  ollamaResult,
  isQuerying,
  error,
  documentTokens,
  selectedModel,
  availableModels,
  onModelChange,
  isOllamaAvailable = true
}: OllamaSectionProps) {
  const [recheckAttempted, setRecheckAttempted] = useState(false);

  const handleRecheckOllama = async () => {
    setRecheckAttempted(true);
    // Trigger a recheck by reloading the page or calling a callback
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/10 rounded-unkey-lg p-6 border border-purple-500/30 h-[140px] flex flex-col justify-center shadow-unkey-card">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-white">
            Ollama Approach
          </h2>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Native API
          </span>
          {isOllamaAvailable ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              ● Available
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              ● Unavailable
            </span>
          )}
        </div>
        <p className="text-unkey-gray-200">
          Local LLM inference with full document context - no API costs, complete privacy
        </p>
      </div>

      {/* Ollama Not Available Warning */}
      {!isOllamaAvailable && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-unkey-lg p-4 shadow-unkey-card">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">Ollama Not Available</h3>
              <p className="text-sm text-yellow-300 mb-3">
                Ollama server is not running. Please start Ollama to use local models:
              </p>
              <code className="block bg-black/20 px-3 py-2 rounded text-sm text-yellow-200 font-mono">
                ollama serve
              </code>
              <button
                onClick={handleRecheckOllama}
                disabled={recheckAttempted}
                className="mt-3 text-sm text-purple-400 hover:text-purple-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {recheckAttempted ? 'Rechecking...' : 'Retry Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Selector */}
      {isOllamaAvailable && availableModels && availableModels.length > 0 && onModelChange && (
        <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-purple-500/30 p-4">
          <label className="block text-sm font-medium text-unkey-gray-300 mb-2">
            Ollama Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full px-3 py-2 bg-unkey-gray-800 border border-unkey-gray-700 rounded-unkey-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {availableModels.map((model) => (
              <option key={model.name} value={model.name}>
                {model.displayName}
                {model.supportsImages && ' 🖼️'}
              </option>
            ))}
          </select>
          {selectedModel && availableModels.find(m => m.name === selectedModel)?.supportsImages && (
            <p className="text-xs text-purple-400 mt-2">
              ✨ This model supports multimodal inputs (text + images)
            </p>
          )}
        </div>
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
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-400 mb-1">Error</h3>
              <p className="text-sm text-red-300">{error}</p>
              
              {/* Provide helpful guidance based on error type */}
              {error.toLowerCase().includes('model') && error.toLowerCase().includes('not found') && selectedModel && (
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  <p className="text-sm text-red-300 mb-2">
                    The model may not be installed. Pull it with:
                  </p>
                  <code className="block bg-black/20 px-3 py-2 rounded text-sm text-red-200 font-mono">
                    ollama pull {selectedModel}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isQuerying && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-unkey-lg p-6 shadow-unkey-card h-[140px]">
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-purple-500"
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
                Processing with Ollama...
              </p>
              <p className="text-sm text-unkey-gray-300 mt-1">
                Running local inference with full document context
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {ollamaResult && !isQuerying && (
        <section className="space-y-6">
          {/* Answer Display */}
          <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Answer</h3>
            
            <div className="prose prose-sm max-w-none min-h-[180px]">
              <ExpandableText text={ollamaResult.answer} characterLimit={50} />
            </div>
          </div>

          {/* Metrics Display */}
          <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Performance Metrics</h3>
            
            {/* Model Information */}
            {ollamaResult.metrics.breakdown?.metadata?.model && (
              <div className="mb-6 pb-6 border-b border-unkey-gray-700">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Model Configuration</h4>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {ollamaResult.metrics.breakdown.metadata.model}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
                    Local
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Generation Time */}
              <div className="bg-purple-500/10 rounded-unkey-lg p-4 border border-purple-500/20">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Generation Time</h4>
                <p className="text-2xl font-bold text-purple-400">
                  {ollamaResult.metrics.generationTime.toFixed(0)}ms
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  Local inference
                </p>
              </div>

              {/* Token Usage */}
              <div className="bg-purple-500/10 rounded-unkey-lg p-4 border border-purple-500/20">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Tokens Used</h4>
                <p className="text-2xl font-bold text-purple-400">
                  {ollamaResult.metrics.tokens.toLocaleString()}
                </p>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  Full document in context
                </p>
              </div>

              {/* Cost - Always Free */}
              <div className="bg-green-500/10 rounded-unkey-lg p-4 border border-green-500/20 md:col-span-2">
                <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Cost</h4>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-green-400">
                    $0.00
                  </p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
                    Free (Local)
                  </span>
                </div>
                <p className="text-xs text-unkey-gray-500 mt-1">
                  No API costs - runs entirely on your machine
                </p>
              </div>

              {/* Context Window Usage */}
              {ollamaResult.metrics.contextWindowUsage !== undefined && (
                <div className="bg-purple-500/10 rounded-unkey-lg p-4 border border-purple-500/20 md:col-span-2">
                  <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Context Window Usage</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="w-full bg-unkey-gray-800 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(ollamaResult.metrics.contextWindowUsage * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-purple-400">
                      {(ollamaResult.metrics.contextWindowUsage * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Metrics Breakdown */}
          {ollamaResult.metrics.breakdown && (
            <MetricsBreakdownPanel
              breakdown={ollamaResult.metrics.breakdown}
              pipelineType="ollama"
              documentTokens={documentTokens}
            />
          )}
        </section>
      )}

    </div>
  );
}

// Made with Bob