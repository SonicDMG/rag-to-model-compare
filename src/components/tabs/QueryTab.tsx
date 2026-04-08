'use client';

import { useState } from 'react';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';
import { ProcessingEvent } from '@/types/processing-events';
import { RagAnswerSection } from '@/components/results/RagAnswerSection';
import { HybridAnswerSection } from '@/components/results/HybridAnswerSection';
import { DirectAnswerSection } from '@/components/results/DirectAnswerSection';
import { Spinner } from '../ui/Spinner';

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
  
  // Hybrid results (uses direct context with RAG data when needed)
  hybridResult?: DirectResult | null;
  isHybridQuerying?: boolean;
  hybridError?: string | null;
  hybridProcessingEvents?: ProcessingEvent[];
  
  // Direct results (via Ollama)
  ollamaModel?: string;
  availableOllamaModels?: OllamaModelInfo[];
  isOllamaAvailable?: boolean;
  directResult?: OllamaResult | null;
  isDirectQuerying?: boolean;
  directError?: string | null;
  directProcessingEvents?: ProcessingEvent[];
}

/**
 * QueryTab - Contains query form and results display
 * 
 * Features:
 * - Sticky query form at top
 * - Three-column results layout (RAG, Hybrid, Direct)
 * - Real-time processing updates
 */
export function QueryTab({
  documentId,
  // documentTokens and processedContent are available but not currently used in this component
  onQueryBoth,
  isLoading = false,
  ragResult,
  isRagQuerying,
  ragError,
  ragProcessingEvents = [],
  hybridResult,
  isHybridQuerying,
  hybridError,
  hybridProcessingEvents = [],
  ollamaModel = 'llama3.2',
  // availableOllamaModels and isOllamaAvailable are available but not currently used in this component
  directResult = null,
  isDirectQuerying = false,
  directError = null,
  directProcessingEvents = []
}: QueryTabProps) {
  const [query, setQuery] = useState('');
  // Fixed default values (advanced settings removed as untested)
  const temperature = 0.7;
  const maxTokens = 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || !documentId) return;

    await onQueryBoth(query.trim(), temperature, maxTokens);
  };

  const isDisabled = !documentId || isLoading;
  const showResults = ragResult || hybridResult || directResult || isRagQuerying || isHybridQuerying || isDirectQuerying;

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
                  <Spinner size="md" />
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
            selectedModel={ollamaModel}
          />
          
          {/* Hybrid Answer Section */}
          <HybridAnswerSection
            directResult={hybridResult || null}
            isQuerying={isHybridQuerying || false}
            error={hybridError || null}
            processingEvents={hybridProcessingEvents}
            selectedModel={ollamaModel}
          />
          
          {/* Direct (Ollama) Answer Section */}
          <DirectAnswerSection
            ollamaResult={directResult}
            isQuerying={isDirectQuerying}
            error={directError}
            processingEvents={directProcessingEvents}
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