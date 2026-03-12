'use client';

import { useState } from 'react';

interface QueryFormProps {
  documentId: string | null;
  onSubmit: (query: string, documentId: string, temperature?: number, maxTokens?: number) => Promise<void>;
  isLoading?: boolean;
}

export function QueryForm({ documentId, onSubmit, isLoading = false }: QueryFormProps) {
  const [query, setQuery] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || !documentId) return;

    await onSubmit(query.trim(), documentId, temperature, maxTokens);
  };

  const isDisabled = !documentId || isLoading;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-unkey-gray-900 border border-unkey-gray-700 rounded-unkey-lg shadow-unkey-card p-6">
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
              placeholder="Ask a question about your document..."
              className="w-full px-4 py-3 bg-unkey-gray-850 border border-unkey-gray-600 rounded-unkey-md focus:ring-2 focus:ring-unkey-teal-500/20 focus:border-unkey-teal-500 resize-none text-white placeholder-unkey-gray-500 transition-all duration-200"
              rows={4}
              disabled={isDisabled}
              required
              aria-label="Query input"
            />
            <p className="mt-1 text-sm text-unkey-gray-400">
              Enter your question to compare RAG vs Direct context approaches
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-unkey-teal-500 hover:text-unkey-teal-400 font-medium flex items-center gap-1 transition-colors duration-200"
            disabled={isDisabled}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-unkey-gray-850 border border-unkey-gray-700 rounded-unkey-md">
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
                <p className="mt-1 text-xs text-unkey-gray-400">
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
                  className="w-full px-3 py-2 bg-unkey-gray-900 border border-unkey-gray-600 rounded-unkey-md focus:ring-2 focus:ring-unkey-teal-500/20 focus:border-unkey-teal-500 text-white transition-all duration-200"
                  disabled={isDisabled}
                  aria-label="Max tokens input"
                />
                <p className="mt-1 text-xs text-unkey-gray-400">
                  Maximum length of generated response
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDisabled || !query.trim()}
            className="w-full bg-unkey-teal-500 text-white py-3 px-4 rounded-unkey-md hover:bg-unkey-teal-400 disabled:bg-unkey-gray-700 disabled:text-unkey-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center gap-2"
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
              'Compare Approaches'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Made with Bob
