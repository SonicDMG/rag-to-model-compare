'use client';

import { useState } from 'react';
import { ComparisonResults } from './ComparisonResults';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
}

interface UnifiedQuerySectionProps {
  documentId: string | null;
  onQueryBoth: (query: string, temperature: number, maxTokens: number) => Promise<void>;
  isLoading?: boolean;
  // Pass through results from parent
  ragResult?: RAGResult | null;
  isRagQuerying?: boolean;
  ragError?: string | null;
  directResult?: DirectResult | null;
  isDirectQuerying?: boolean;
  directError?: string | null;
  documentTokens?: number;
  // Ollama props from parent
  ollamaModel?: string;
  availableOllamaModels?: OllamaModelInfo[];
  isOllamaAvailable?: boolean;
}

export function UnifiedQuerySection({
  documentId,
  onQueryBoth,
  isLoading = false,
  ragResult,
  isRagQuerying,
  ragError,
  directResult,
  isDirectQuerying,
  directError,
  documentTokens,
  ollamaModel = 'llama3.2',
  availableOllamaModels = [],
  isOllamaAvailable = false
}: UnifiedQuerySectionProps) {
  const [query, setQuery] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Ollama result state (still managed here)
  const [ollamaResult, setOllamaResult] = useState<OllamaResult | null>(null);
  const [isOllamaQuerying, setIsOllamaQuerying] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || !documentId) return;

    // Reset Ollama state
    setIsOllamaQuerying(true);
    setOllamaError(null);
    setOllamaResult(null);

    // Call parent's query handler for RAG and Direct
    await onQueryBoth(query.trim(), temperature, maxTokens);

    // Query Ollama if available
    if (isOllamaAvailable && ollamaModel) {
      try {
        const response = await fetch('/api/rag-comparison/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            documentId,
            temperature,
            maxTokens,
            ollamaModel,
            ollamaTemperature: temperature,
            ollamaMaxTokens: maxTokens
          })
        });

        if (!response.ok) {
          throw new Error('Ollama query failed');
        }

        // Handle Server-Sent Events stream for Ollama
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const message of messages) {
            if (!message.trim() || !message.startsWith('data: ')) {
              continue;
            }

            try {
              const data = JSON.parse(message.substring(6));

              if (data.type === 'ollama') {
                if (data.success) {
                  console.log('✅ Ollama result received');
                  setOllamaResult(data.data);
                  setIsOllamaQuerying(false);
                } else {
                  console.error('❌ Ollama error:', data.error);
                  setOllamaError(data.error);
                  setIsOllamaQuerying(false);
                }
              }
            } catch (parseError) {
              console.error('Failed to parse Ollama SSE message:', parseError);
            }
          }
        }
      } catch (err) {
        console.error('Ollama query error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Ollama query failed';
        setOllamaError(errorMessage);
        setIsOllamaQuerying(false);
      }
    }
  };

  const isDisabled = !documentId || isLoading;
  const showResults = ragResult || directResult || ollamaResult || isRagQuerying || isDirectQuerying || isOllamaQuerying;

  return (
    <div className="w-full space-y-6">
      {/* Query Form */}
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
              placeholder="Enter your question to compare RAG, Direct context, and Ollama approaches"
              className="w-full px-4 py-3 bg-unkey-gray-850 border border-unkey-gray-700 rounded-unkey-md focus:ring-2 focus:ring-unkey-teal-500 focus:border-unkey-teal-500 resize-none text-white placeholder-unkey-gray-500"
              rows={4}
              disabled={isDisabled}
              required
              aria-label="Query input"
            />
            <p className="mt-1 text-sm text-unkey-gray-400">
              This query will be sent to RAG, Direct Context, and Ollama (if available) simultaneously
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-unkey-teal-400 hover:text-unkey-teal-300 font-medium flex items-center gap-1 transition-colors"
            disabled={isDisabled}
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-unkey-gray-850 rounded-unkey-lg border border-unkey-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="temperature" className="block text-sm font-medium text-unkey-gray-200 mb-2">
                    Temperature: {temperature.toFixed(2)}
                  </label>
                  <input
                    id="temperature"
                    type="range"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full accent-unkey-teal-500"
                    disabled={isDisabled}
                    aria-label="Temperature slider"
                  />
                  <p className="mt-1 text-xs text-unkey-gray-500">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                <div>
                  <label htmlFor="maxTokens" className="block text-sm font-medium text-unkey-gray-200 mb-2">
                    Max Tokens
                  </label>
                  <input
                    id="maxTokens"
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    min={100}
                    max={4000}
                    step={100}
                    className="w-full px-3 py-2 bg-unkey-gray-900 border border-unkey-gray-700 rounded-unkey-md focus:ring-2 focus:ring-unkey-teal-500 focus:border-unkey-teal-500 text-white"
                    disabled={isDisabled}
                    aria-label="Max tokens input"
                  />
                  <p className="mt-1 text-xs text-unkey-gray-500">
                    Maximum length of generated response
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDisabled || !query.trim()}
            className="w-full bg-unkey-teal-500 text-white py-3 px-4 rounded-unkey-lg hover:bg-unkey-teal-400 disabled:bg-unkey-gray-700 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing Query...
              </>
            ) : !documentId ? (
              'Upload a document first'
            ) : (
              'Compare All Approaches'
            )}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {showResults && (
        <ComparisonResults
          ragResult={ragResult || null}
          isRagQuerying={isRagQuerying || false}
          ragError={ragError || null}
          directResult={directResult || null}
          isDirectQuerying={isDirectQuerying || false}
          directError={directError || null}
          ollamaResult={ollamaResult}
          isOllamaQuerying={isOllamaQuerying}
          ollamaError={ollamaError}
          ollamaModel={ollamaModel}
          availableOllamaModels={availableOllamaModels}
          onOllamaModelChange={undefined}
          isOllamaAvailable={isOllamaAvailable}
          documentTokens={documentTokens}
        />
      )}
    </div>
  );
}

// Made with Bob