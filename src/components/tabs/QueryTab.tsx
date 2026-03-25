'use client';

import { useState } from 'react';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';
import { ProcessingEvent } from '@/types/processing-events';
import { RagAnswerSection } from '@/components/results/RagAnswerSection';
import { HybridAnswerSection } from '@/components/results/HybridAnswerSection';
import { DirectAnswerSection } from '@/components/results/DirectAnswerSection';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
}

interface QueryTabProps {
  // Document info
  documentId: string | null;
  documentTokens?: number;
  processedContent?: string;
  
  // Query handler
  onQueryBoth: (query: string, temperature: number, maxTokens: number) => Promise<void>;
  isLoading?: boolean;
  
  // RAG results
  ragResult?: RAGResult | null;
  isRagQuerying?: boolean;
  ragError?: string | null;
  ragProcessingEvents?: ProcessingEvent[];
  
  // Direct results
  directResult?: DirectResult | null;
  isDirectQuerying?: boolean;
  directError?: string | null;
  directProcessingEvents?: ProcessingEvent[];
  
  // Ollama results
  ollamaModel?: string;
  availableOllamaModels?: OllamaModelInfo[];
  isOllamaAvailable?: boolean;
  ollamaResult?: OllamaResult | null;
  isOllamaQuerying?: boolean;
  ollamaError?: string | null;
  ollamaProcessingEvents?: ProcessingEvent[];
}

/**
 * QueryTab - Contains query form and results display
 * 
 * Features:
 * - Sticky query form at top
 * - Advanced settings (temperature, max tokens)
 * - Three-column results layout (RAG, Hybrid, Direct)
 * - Real-time processing updates
 */
export function QueryTab({
  documentId,
  documentTokens,
  processedContent,
  onQueryBoth,
  isLoading = false,
  ragResult,
  isRagQuerying,
  ragError,
  ragProcessingEvents = [],
  directResult,
  isDirectQuerying,
  directError,
  directProcessingEvents = [],
  ollamaModel = 'llama3.2',
  availableOllamaModels = [],
  isOllamaAvailable = false,
  ollamaResult = null,
  isOllamaQuerying = false,
  ollamaError = null,
  ollamaProcessingEvents = []
}: QueryTabProps) {
  const [query, setQuery] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || !documentId) return;

    await onQueryBoth(query.trim(), temperature, maxTokens);
  };

  const isDisabled = !documentId || isLoading;
  const showResults = ragResult || directResult || ollamaResult || isRagQuerying || isDirectQuerying || isOllamaQuerying;

  return (
    <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      {/* Sticky Query Form */}
      <div className="sticky top-0 z-10 bg-unkey-black/95 backdrop-blur-sm pb-6">
        <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Query Document</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-unkey-gray-200 mb-2">
                Your Question
              </label>
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your question to compare RAG, Hybrid, and Direct approaches"
                className="w-full px-4 py-3 bg-unkey-gray-850 border border-unkey-gray-700 rounded-unkey-md focus:ring-2 focus:ring-unkey-teal-500 focus:border-unkey-teal-500 resize-none text-white placeholder-unkey-gray-500"
                rows={4}
                disabled={isDisabled}
                required
              />
            </div>

            {/* Advanced Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-unkey-teal hover:text-unkey-cyan transition-colors flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advanced Settings
            </button>

            {/* Advanced Settings Panel */}
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-unkey-gray-850 rounded-unkey-md border border-unkey-gray-700">
                <div>
                  <label htmlFor="temperature" className="block text-sm font-medium text-unkey-gray-200 mb-2">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    id="temperature"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    disabled={isDisabled}
                    className="w-full"
                  />
                  <p className="text-xs text-unkey-gray-400 mt-1">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                <div>
                  <label htmlFor="maxTokens" className="block text-sm font-medium text-unkey-gray-200 mb-2">
                    Max Tokens: {maxTokens}
                  </label>
                  <input
                    type="range"
                    id="maxTokens"
                    min="100"
                    max="4000"
                    step="100"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    disabled={isDisabled}
                    className="w-full"
                  />
                  <p className="text-xs text-unkey-gray-400 mt-1">
                    Maximum length of generated response
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isDisabled}
              className={`
                w-full px-6 py-3 rounded-unkey-md font-medium transition-all
                ${
                  isDisabled
                    ? 'bg-unkey-gray-700 text-unkey-gray-500 cursor-not-allowed'
                    : 'bg-white text-unkey-black hover:bg-unkey-gray-100 hover:shadow-lg'
                }
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Querying All Pipelines...
                </span>
              ) : (
                'Query All Approaches'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Results Section - Three Column Layout */}
      {showResults ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* RAG Answer Section */}
          <RagAnswerSection
            ragResult={ragResult || null}
            isQuerying={isRagQuerying || false}
            error={ragError || null}
            processingEvents={ragProcessingEvents}
          />
          
          {/* Hybrid Answer Section */}
          <HybridAnswerSection
            directResult={directResult || null}
            isQuerying={isDirectQuerying || false}
            error={directError || null}
            processingEvents={directProcessingEvents}
          />
          
          {/* Direct (Ollama) Answer Section */}
          <DirectAnswerSection
            ollamaResult={ollamaResult}
            isQuerying={isOllamaQuerying}
            error={ollamaError}
            processingEvents={ollamaProcessingEvents}
            selectedModel={ollamaModel}
          />
        </div>
      ) : (
        <div className="bg-unkey-gray-900/50 backdrop-blur-sm rounded-xl border border-unkey-gray-800 p-8 sm:p-12 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-unkey-teal/10 blur-2xl rounded-full" />
              <svg
                className="relative mx-auto h-16 w-16 text-unkey-teal"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              Ready to Query
            </h3>
            
            <p className="text-unkey-gray-300 leading-relaxed">
              Enter your question above to compare how RAG, Hybrid, and Direct approaches answer it.
              All three pipelines will run in parallel, and you'll see real-time processing updates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob