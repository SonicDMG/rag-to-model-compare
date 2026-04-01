'use client';

import { useState, useEffect } from 'react';

type HistoryRange = 'last10' | 'all';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';
import { QueryHistoryItem } from '@/types/tabs';
import { MetricsTabProvider } from '@/contexts/MetricsTabContext';
import { RagSection } from '@/components/results/RagSection';
import { HybridSection } from '@/components/results/HybridSection';
import { DirectSection } from '@/components/results/DirectSection';
import { formatTime, formatCost } from '@/lib/utils/formatters';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
}

interface PerformanceTabProps {
  // Current results
  ragResult?: RAGResult | null;
  directResult?: DirectResult | null;
  ollamaResult?: OllamaResult | null;
  
  // Document info
  documentTokens?: number;
  processedContent?: string;
  
  // Ollama config
  ollamaModel?: string;
  availableOllamaModels?: OllamaModelInfo[];
  isOllamaAvailable?: boolean;
}

/**
 * PerformanceTab - Detailed metrics and query history
 *
 * Features:
 * - Query history selector with range filter (last 10 or all queries)
 * - Comparison overview cards
 * - Detailed metrics breakdowns
 * - Winner indicators
 */
export function PerformanceTab({
  ragResult,
  directResult,
  ollamaResult,
  documentTokens,
  processedContent,
  ollamaModel,
  availableOllamaModels,
  // isOllamaAvailable is available but not currently used in this component
}: PerformanceTabProps) {
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('all');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('current');
  const [displayedResults, setDisplayedResults] = useState({
    rag: ragResult,
    direct: directResult,
    ollama: ollamaResult,
  });

  // Load query history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('queryHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const history = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setQueryHistory(history);
      }
    } catch (error) {
      console.error('Failed to load query history:', error);
    }
  }, []);

  // Update displayed results when selection changes
  useEffect(() => {
    if (selectedHistoryId === 'current') {
      setDisplayedResults({
        rag: ragResult,
        direct: directResult,
        ollama: ollamaResult,
      });
    } else {
      const historyItem = queryHistory.find((item) => item.id === selectedHistoryId);
      if (historyItem) {
        setDisplayedResults({
          rag: historyItem.ragResult,
          direct: historyItem.directResult,
          ollama: historyItem.ollamaResult,
        });
      }
    }
  }, [selectedHistoryId, ragResult, directResult, ollamaResult, queryHistory]);

  const hasResults = displayedResults.rag || displayedResults.direct || displayedResults.ollama;

  // Calculate comparison metrics
  const getComparisonMetrics = () => {
    if (!displayedResults.rag || !displayedResults.direct) return null;

    const ragTime = displayedResults.rag.metrics.retrievalTime + displayedResults.rag.metrics.generationTime;
    const directTime = displayedResults.direct.metrics.generationTime;
    const ollamaTime = displayedResults.ollama?.metrics.generationTime || 0;

    const ragTokens = displayedResults.rag.metrics.tokens;
    const directTokens = displayedResults.direct.metrics.tokens;
    const ollamaTokens = displayedResults.ollama?.metrics.tokens || 0;

    const ragCost = displayedResults.rag.metrics.cost;
    const directCost = displayedResults.direct.metrics.cost;
    const ollamaCost = 0; // Always free

    return {
      speed: {
        fastest: ollamaTime > 0 && ollamaTime < ragTime && ollamaTime < directTime 
          ? 'ollama' 
          : ragTime < directTime 
          ? 'rag' 
          : 'direct',
        ragTime,
        directTime,
        ollamaTime,
      },
      tokens: {
        lowest: ollamaTokens > 0 && ollamaTokens < ragTokens && ollamaTokens < directTokens
          ? 'ollama'
          : ragTokens < directTokens
          ? 'rag'
          : 'direct',
        ragTokens,
        directTokens,
        ollamaTokens,
      },
      cost: {
        cheapest: ollamaCost === 0 ? 'ollama' : ragCost < directCost ? 'rag' : 'direct',
        ragCost,
        directCost,
        ollamaCost,
      },
    };
  };

  const metrics = getComparisonMetrics();


  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Filter history based on selected range
  const filteredHistory = historyRange === 'last10' ? queryHistory.slice(0, 10) : queryHistory;

  return (
    <MetricsTabProvider>
      <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Query History Selector */}
        {queryHistory.length > 0 && (
          <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-3">
              <label htmlFor="queryHistory" className="block text-sm font-medium text-unkey-gray-200">
                Query History
              </label>
              
              {/* History Range Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="historyRange" className="text-sm font-medium text-unkey-gray-300 whitespace-nowrap">
                  Show:
                </label>
                <select
                  id="historyRange"
                  value={historyRange}
                  onChange={(e) => {
                    setHistoryRange(e.target.value as HistoryRange);
                    // Reset to current query when changing range
                    setSelectedHistoryId('current');
                  }}
                  className="px-3 py-2 bg-unkey-gray-850 border border-unkey-gray-700 rounded-md text-white text-sm focus:ring-2 focus:ring-unkey-teal focus:border-unkey-teal transition-colors"
                >
                  <option value="all">All Queries</option>
                  <option value="last10">Last 10 Queries</option>
                </select>
              </div>
            </div>
            
            <select
              id="queryHistory"
              value={selectedHistoryId}
              onChange={(e) => setSelectedHistoryId(e.target.value)}
              className="w-full px-4 py-2 bg-unkey-gray-850 border border-unkey-gray-700 rounded-unkey-md text-white focus:ring-2 focus:ring-unkey-teal-500 focus:border-unkey-teal-500"
            >
              <option value="current">Current Query</option>
              {filteredHistory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.query.substring(0, 60)}
                  {item.query.length > 60 ? '...' : ''} - {formatDate(item.timestamp)}
                </option>
              ))}
            </select>
            
            <p className="mt-2 text-xs text-unkey-gray-400">
              Showing {filteredHistory.length} of {queryHistory.length} stored {queryHistory.length === 1 ? 'query' : 'queries'}
            </p>
          </div>
        )}

        {/* Comparison Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Speed Comparison */}
            <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-unkey-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Speed
              </h3>
              <div className="space-y-3">
                <div className={`flex justify-between items-center ${metrics.speed.fastest === 'rag' ? 'text-unkey-teal font-semibold' : 'text-unkey-gray-300'}`}>
                  <span>RAG:</span>
                  <span>{formatTime(metrics.speed.ragTime)}</span>
                </div>
                <div className={`flex justify-between items-center ${metrics.speed.fastest === 'direct' ? 'text-blue-400 font-semibold' : 'text-unkey-gray-300'}`}>
                  <span>Hybrid:</span>
                  <span>{formatTime(metrics.speed.directTime)}</span>
                </div>
                {metrics.speed.ollamaTime > 0 && (
                  <div className={`flex justify-between items-center ${metrics.speed.fastest === 'ollama' ? 'text-purple-400 font-semibold' : 'text-unkey-gray-300'}`}>
                    <span>Direct:</span>
                    <span>{formatTime(metrics.speed.ollamaTime)}</span>
                  </div>
                )}
              </div>
              {metrics.speed.fastest && (
                <div className="mt-4 pt-4 border-t border-unkey-gray-700">
                  <span className="text-sm text-unkey-gray-400">
                    Winner: <span className="text-white font-semibold capitalize">{metrics.speed.fastest}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Token Comparison */}
            <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-unkey-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Tokens
              </h3>
              <div className="space-y-3">
                <div className={`flex justify-between items-center ${metrics.tokens.lowest === 'rag' ? 'text-unkey-teal font-semibold' : 'text-unkey-gray-300'}`}>
                  <span>RAG:</span>
                  <span>{metrics.tokens.ragTokens.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between items-center ${metrics.tokens.lowest === 'direct' ? 'text-blue-400 font-semibold' : 'text-unkey-gray-300'}`}>
                  <span>Hybrid:</span>
                  <span>{metrics.tokens.directTokens.toLocaleString()}</span>
                </div>
                {metrics.tokens.ollamaTokens > 0 && (
                  <div className={`flex justify-between items-center ${metrics.tokens.lowest === 'ollama' ? 'text-purple-400 font-semibold' : 'text-unkey-gray-300'}`}>
                    <span>Direct:</span>
                    <span>{metrics.tokens.ollamaTokens.toLocaleString()}</span>
                  </div>
                )}
              </div>
              {metrics.tokens.lowest && (
                <div className="mt-4 pt-4 border-t border-unkey-gray-700">
                  <span className="text-sm text-unkey-gray-400">
                    Most Efficient: <span className="text-white font-semibold capitalize">{metrics.tokens.lowest}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Cost Comparison */}
            <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-unkey-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cost
              </h3>
              <div className="space-y-3">
                <div className={`flex justify-between items-center ${metrics.cost.cheapest === 'rag' ? 'text-unkey-teal font-semibold' : 'text-unkey-gray-300'}`}>
                  <span>RAG:</span>
                  <span>{formatCost(metrics.cost.ragCost)}</span>
                </div>
                <div className={`flex justify-between items-center ${metrics.cost.cheapest === 'direct' ? 'text-blue-400 font-semibold' : 'text-unkey-gray-300'}`}>
                  <span>Hybrid:</span>
                  <span>{formatCost(metrics.cost.directCost)}</span>
                </div>
                <div className={`flex justify-between items-center ${metrics.cost.cheapest === 'ollama' ? 'text-purple-400 font-semibold' : 'text-unkey-gray-300'}`}>
                  <span>Direct:</span>
                  <span>{formatCost(metrics.cost.ollamaCost)}</span>
                </div>
              </div>
              {metrics.cost.cheapest && (
                <div className="mt-4 pt-4 border-t border-unkey-gray-700">
                  <span className="text-sm text-unkey-gray-400">
                    Most Affordable: <span className="text-white font-semibold capitalize">{metrics.cost.cheapest}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {hasResults ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RagSection
              ragResult={displayedResults.rag || null}
              isQuerying={false}
              error={null}
              documentTokens={documentTokens}
              processedContent={processedContent}
              processingEvents={displayedResults.rag?.processingEvents}
              hideAnswer={true}
              hideTimeline={true}
            />
            
            <HybridSection
              directResult={displayedResults.direct || null}
              isQuerying={false}
              error={null}
              documentTokens={documentTokens}
              processedContent={processedContent}
              processingEvents={displayedResults.direct?.processingEvents}
              hideAnswer={true}
              hideTimeline={true}
            />
            
            <DirectSection
              ollamaResult={displayedResults.ollama || null}
              isQuerying={false}
              error={null}
              documentTokens={documentTokens}
              processedContent={processedContent}
              selectedModel={ollamaModel}
              availableModels={availableOllamaModels}
              processingEvents={displayedResults.ollama?.processingEvents}
              hideAnswer={true}
              hideTimeline={true}
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                No Results Yet
              </h3>
              
              <p className="text-unkey-gray-300 leading-relaxed">
                Execute a query to see detailed performance metrics and comparisons.
                Results will appear here with breakdowns of timing, tokens, cost, and context window usage.
              </p>
            </div>
          </div>
        )}
      </div>
    </MetricsTabProvider>
  );
}

// Made with Bob