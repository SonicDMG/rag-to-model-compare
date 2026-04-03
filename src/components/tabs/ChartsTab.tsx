/**
 * Charts tab component for visualizing query history performance data
 * Aggregates and displays timing, token, and cost comparisons
 */

'use client';

import { useState } from 'react';
import { useQueryHistory } from '@/hooks/useQueryHistory';
import { aggregateChartData } from '@/lib/utils/chart-aggregator';
import { TimingComparisonChart } from '@/components/charts/TimingComparisonChart';
import { TokenComparisonChart } from '@/components/charts/TokenComparisonChart';
import { CostComparisonChart } from '@/components/charts/CostComparisonChart';
import { ModelComparisonChart } from '@/components/charts/ModelComparisonChart';

type ChartRange = 'last10' | 'all';

/**
 * Charts tab component
 *
 * Features:
 * - Loads query history from localStorage with reactive updates
 * - Allows selection between "Last 10" or "All" queries for chart display
 * - Aggregates performance metrics based on selected range
 * - Displays timing, token, and cost comparison charts
 * - Shows helpful message when no data is available
 * - Responsive grid layout
 * - Automatically updates when new queries are executed
 */
export function ChartsTab() {
  const { history, isLoading, getCounters } = useQueryHistory();
  const counters = getCounters();
  const [chartRange, setChartRange] = useState<ChartRange>('all');

  // Filter history based on selected range
  const filteredHistory = chartRange === 'last10' ? history.slice(0, 10) : history;
  const chartData = aggregateChartData(filteredHistory);

  // Show loading state briefly on initial mount
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Performance Charts</h2>
          <p className="text-unkey-gray-300">Loading query history...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (chartData.totalQueries === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Performance Charts</h2>
          <p className="text-unkey-gray-300">
            Visualize and compare performance metrics across all your queries
          </p>
        </div>

        {/* Empty state */}
        <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Query History Yet
            </h3>
            <p className="text-unkey-gray-300 mb-6">
              Execute some queries to see performance charts and comparisons. Up to 1000 queries are stored and can be visualized here.
            </p>
            <div className="bg-unkey-teal/10 border border-unkey-teal/30 rounded-lg p-4 text-sm text-left">
              <p className="font-semibold text-unkey-teal mb-2">What you'll see:</p>
              <ul className="space-y-1 text-unkey-gray-300">
                <li>• Response time comparisons (RAG vs Hybrid vs Direct)</li>
                <li>• Token usage analysis (average and total)</li>
                <li>• Cost breakdowns and accumulated expenses</li>
                <li>• RAG retrieval vs generation time breakdown</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Performance Charts</h2>
            <p className="text-unkey-gray-300">
              {counters.totalQueries} total {counters.totalQueries === 1 ? 'query' : 'queries'} executed • Charts based on {chartRange === 'all' ? 'all' : 'last 10'} {chartData.totalQueries} {chartData.totalQueries === 1 ? 'query' : 'queries'}
            </p>
          </div>
          
          {/* Chart Range Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="chartRange" className="text-sm font-medium text-unkey-gray-300 whitespace-nowrap">
              Show:
            </label>
            <select
              id="chartRange"
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value as ChartRange)}
              className="px-3 py-2 bg-unkey-gray-850 border border-unkey-gray-700 rounded-md text-white text-sm focus:ring-2 focus:ring-unkey-teal focus:border-unkey-teal transition-colors"
            >
              <option value="all">All Queries</option>
              <option value="last10">Last 10 Queries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {chartData.rag && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-400 mb-1">{counters.ragQueries} Total RAG {counters.ragQueries === 1 ? 'Query' : 'Queries'}</div>
            <div className="text-2xl font-bold text-blue-300">{counters.ragQueries}</div>
            <div className="text-xs text-blue-400 mt-1">
              Avg (last {chartData.rag.queryCount}): {chartData.rag.avgTime.toFixed(0)}ms
            </div>
          </div>
        )}
        {chartData.hybrid && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="text-sm font-medium text-green-400 mb-1">{counters.hybridQueries} Total Hybrid {counters.hybridQueries === 1 ? 'Query' : 'Queries'}</div>
            <div className="text-2xl font-bold text-green-300">{counters.hybridQueries}</div>
            <div className="text-xs text-green-400 mt-1">
              Avg (last {chartData.hybrid.queryCount}): {chartData.hybrid.avgTime.toFixed(0)}ms
            </div>
          </div>
        )}
        {chartData.direct && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="text-sm font-medium text-orange-400 mb-1">{counters.directQueries} Total Direct {counters.directQueries === 1 ? 'Query' : 'Queries'}</div>
            <div className="text-2xl font-bold text-orange-300">{counters.directQueries}</div>
            <div className="text-xs text-orange-400 mt-1">
              Avg (last {chartData.direct.queryCount}): {chartData.direct.avgTime.toFixed(0)}ms
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="space-y-8">
        {/* Timing Chart - Full Width */}
        <div className="w-full">
          <TimingComparisonChart data={chartData} />
        </div>

        {/* Token and Cost Charts - Side by Side on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TokenComparisonChart data={chartData} />
          <CostComparisonChart data={chartData} />
        </div>

        {/* Model Comparison Chart - Full Width */}
        <div className="w-full">
          <ModelComparisonChart queryHistory={filteredHistory} minQueries={1} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-unkey-gray-900 border border-unkey-gray-700 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">About These Charts</h4>
            <p className="text-xs text-unkey-gray-300 leading-relaxed">
              <strong>Total Counters:</strong> Show cumulative queries executed across all time ({counters.totalQueries} total).
              {' '}<strong>Charts:</strong> Display aggregated metrics from {chartRange === 'all' ? `all ${chartData.totalQueries}` : `the last ${Math.min(10, chartData.totalQueries)}`} {chartData.totalQueries === 1 ? 'query' : 'queries'}.
              {' '}<strong>Storage:</strong> Up to 1000 queries are stored in browser localStorage. Use the "Show" selector above to toggle between viewing all stored queries or just the last 10.
              {' '}RAG timing includes both retrieval and generation phases shown as stacked bars.
              {chartData.direct && ' Direct approach runs locally via Ollama and has no API costs.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob