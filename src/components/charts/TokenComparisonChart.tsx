/**
 * Specialized chart for token usage comparison across approaches
 * Shows both average and total token consumption
 */

import { AggregatedChartData } from '@/lib/utils/chart-aggregator';
import { formatTokens } from '@/lib/utils/formatters';

/**
 * Props for TokenComparisonChart component
 */
export interface TokenComparisonChartProps {
  /** Aggregated chart data */
  data: AggregatedChartData;
}

/**
 * Color scheme for approaches
 */
const COLORS = {
  rag: '#3B82F6',      // Blue
  direct: '#10B981',   // Green
  hybrid: '#8B5CF6',   // Purple
  ollama: '#F59E0B',   // Orange
};

/**
 * Token usage comparison chart
 * 
 * Features:
 * - Shows average tokens per query
 * - Shows total tokens consumed
 * - Color-coded by approach
 * - Responsive design
 */
export function TokenComparisonChart({ data }: TokenComparisonChartProps) {
  // Collect all valid token data
  const tokenData: Array<{
    label: string;
    avgTokens: number;
    totalTokens: number;
    color: string;
    queryCount: number;
  }> = [];

  if (data.rag) {
    tokenData.push({
      label: 'RAG',
      avgTokens: data.rag.avgTokens,
      totalTokens: data.rag.totalTokens,
      color: COLORS.rag,
      queryCount: data.rag.queryCount,
    });
  }

  if (data.direct) {
    tokenData.push({
      label: 'Direct',
      avgTokens: data.direct.avgTokens,
      totalTokens: data.direct.totalTokens,
      color: COLORS.direct,
      queryCount: data.direct.queryCount,
    });
  }

  if (data.ollama) {
    tokenData.push({
      label: 'Ollama',
      avgTokens: data.ollama.avgTokens,
      totalTokens: data.ollama.totalTokens,
      color: COLORS.ollama,
      queryCount: data.ollama.queryCount,
    });
  }

  if (tokenData.length === 0) {
    return (
      <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Token Usage Comparison</h3>
        <p className="text-sm text-unkey-gray-300 mb-4">Token consumption across all queries</p>
        <div className="flex items-center justify-center h-64 text-unkey-gray-400">
          No token data available
        </div>
      </div>
    );
  }

  // Find max values for scaling
  const maxAvgTokens = Math.max(...tokenData.map(d => d.avgTokens));
  const maxTotalTokens = Math.max(...tokenData.map(d => d.totalTokens));
  const barHeight = 50;

  return (
    <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">Token Usage Comparison</h3>
        <p className="text-sm text-unkey-gray-300">Token consumption across all queries</p>
      </div>

      {/* Average Tokens Section */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-unkey-gray-200 mb-4">Average Tokens per Query</h4>
        <div className="space-y-4">
          {tokenData.map((item, index) => {
            const percentage = (item.avgTokens / maxAvgTokens) * 100;
            const displayValue = formatTokens(Math.round(item.avgTokens));

            return (
              <div key={index} className="flex items-center gap-4">
                {/* Label */}
                <div className="w-20 text-sm font-medium text-unkey-gray-200 text-right flex-shrink-0">
                  {item.label}
                </div>

                {/* Bar container */}
                <div className="flex-1 relative">
                  {/* Background track */}
                  <div className="w-full bg-unkey-gray-800 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                    {/* Colored bar */}
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-3"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                        minWidth: percentage > 0 ? '40px' : '0',
                      }}
                    >
                      {percentage > 20 && (
                        <span className="text-xs font-semibold text-white whitespace-nowrap">
                          {displayValue}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value label outside bar if it doesn't fit */}
                  {percentage <= 20 && (
                    <span
                      className="absolute text-xs font-semibold text-unkey-gray-200 whitespace-nowrap"
                      style={{
                        left: `calc(${percentage}% + 8px)`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {displayValue}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Tokens Section */}
      <div className="pt-6 border-t border-unkey-gray-700">
        <h4 className="text-sm font-semibold text-unkey-gray-200 mb-4">Total Tokens Consumed</h4>
        <div className="space-y-4">
          {tokenData.map((item, index) => {
            const percentage = (item.totalTokens / maxTotalTokens) * 100;
            const displayValue = formatTokens(Math.round(item.totalTokens));

            return (
              <div key={index} className="flex items-center gap-4">
                {/* Label */}
                <div className="w-20 text-sm font-medium text-unkey-gray-200 text-right flex-shrink-0">
                  {item.label}
                </div>

                {/* Bar container */}
                <div className="flex-1 relative">
                  {/* Background track */}
                  <div className="w-full bg-unkey-gray-800 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                    {/* Colored bar */}
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-3"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                        minWidth: percentage > 0 ? '40px' : '0',
                      }}
                    >
                      {percentage > 20 && (
                        <span className="text-xs font-semibold text-white whitespace-nowrap">
                          {displayValue}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value label outside bar if it doesn't fit */}
                  {percentage <= 20 && (
                    <span
                      className="absolute text-xs font-semibold text-unkey-gray-200 whitespace-nowrap"
                      style={{
                        left: `calc(${percentage}% + 8px)`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {displayValue}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-unkey-gray-700">
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          {tokenData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-unkey-gray-300">
                {item.label} ({item.queryCount} {item.queryCount === 1 ? 'query' : 'queries'})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Made with Bob