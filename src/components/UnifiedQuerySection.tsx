'use client';

import { useState } from 'react';

interface UnifiedQuerySectionProps {
  documentId: string | null;
  onQueryBoth: (query: string, temperature: number, maxTokens: number) => Promise<void>;
  isLoading?: boolean;
}

export function UnifiedQuerySection({ documentId, onQueryBoth, isLoading = false }: UnifiedQuerySectionProps) {
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

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Query Document</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question to compare RAG vs Direct context approaches"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
              rows={4}
              disabled={isDisabled}
              required
              aria-label="Query input"
            />
            <p className="mt-1 text-sm text-gray-500">
              This query will be sent to both RAG and Direct Context approaches simultaneously
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full"
                  disabled={isDisabled}
                  aria-label="Temperature slider"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              <div>
                <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  disabled={isDisabled}
                  aria-label="Max tokens input"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum length of generated response
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDisabled || !query.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
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