/**
 * Specialized chart for cost comparison across approaches
 * Shows both average and total costs, with special handling for Ollama ($0)
 */

import { AggregatedChartData } from '@/lib/utils/chart-aggregator';
import { formatCost } from '@/lib/utils/formatters';

/**
 * Props for CostComparisonChart component
 */
export interface CostComparisonChartProps {
  /** Aggregated chart data */
  data: AggregatedChartData;
}

/**
 * Color scheme for approaches
 */
const COLORS = {
  rag: '#3B82F6',      // Blue
  hybrid: '#10B981',   // Green
  direct: '#F59E0B',   // Orange
};

/**
 * Cost comparison chart
 * 
 * Features:
 * - Shows average cost per query
 * - Shows total accumulated cost
 * - Handles $0 cost for Ollama appropriately
 * - Color-coded by approach
 * - Responsive design
 */
export function CostComparisonChart({ data }: CostComparisonChartProps) {
  // Collect all valid cost data
  const costData: Array<{
    label: string;
    avgCost: number;
    totalCost: number;
    color: string;
    queryCount: number;
    isFree: boolean;
  }> = [];

  if (data.rag) {
    costData.push({
      label: 'RAG',
      avgCost: data.rag.avgCost,
      totalCost: data.rag.totalCost,
      color: COLORS.rag,
      queryCount: data.rag.queryCount,
      isFree: false,
    });
  }

  if (data.hybrid) {
    costData.push({
      label: 'Hybrid',
      avgCost: data.hybrid.avgCost,
      totalCost: data.hybrid.totalCost,
      color: COLORS.hybrid,
      queryCount: data.hybrid.queryCount,
      isFree: false,
    });
  }

  if (data.direct) {
    costData.push({
      label: 'Direct',
      avgCost: data.direct.avgCost,
      totalCost: data.direct.totalCost,
      color: COLORS.direct,
      queryCount: data.direct.queryCount,
      isFree: true,
    });
  }

  if (costData.length === 0) {
    return (
      <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Cost Comparison</h3>
        <p className="text-sm text-unkey-gray-300 mb-4">Cost analysis across all queries</p>
        <div className="flex items-center justify-center h-64 text-unkey-gray-400">
          No cost data available
        </div>
      </div>
    );
  }

  // Find max values for scaling (excluding free services)
  const paidCosts = costData.filter(d => !d.isFree);
  const maxAvgCost = paidCosts.length > 0 ? Math.max(...paidCosts.map(d => d.avgCost)) : 0;
  const maxTotalCost = paidCosts.length > 0 ? Math.max(...paidCosts.map(d => d.totalCost)) : 0;
  const barHeight = 50;

  return (
    <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">Cost Comparison</h3>
        <p className="text-sm text-unkey-gray-300">Cost analysis across all queries</p>
      </div>

      {/* Average Cost Section */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-unkey-gray-200 mb-4">Average Cost per Query</h4>
        <div className="space-y-4">
          {costData.map((item, index) => {
            // For free services, show a special indicator
            if (item.isFree) {
              return (
                <div key={index} className="flex items-center gap-4">
                  {/* Label */}
                  <div className="w-20 text-sm font-medium text-unkey-gray-200 text-right flex-shrink-0">
                    {item.label}
                  </div>

                  {/* Free indicator */}
                  <div className="flex-1 relative">
                    <div className="w-full bg-unkey-gray-800 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                      <div
                        className="h-full rounded-full flex items-center justify-center"
                        style={{
                          width: '100%',
                          backgroundColor: item.color,
                          opacity: 0.3,
                        }}
                      >
                        <span className="text-sm font-semibold text-unkey-gray-200">
                          FREE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const percentage = maxAvgCost > 0 ? (item.avgCost / maxAvgCost) * 100 : 0;
            const displayValue = formatCost(item.avgCost);

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
                  {percentage <= 20 && percentage > 0 && (
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

      {/* Total Cost Section */}
      <div className="pt-6 border-t border-unkey-gray-700">
        <h4 className="text-sm font-semibold text-unkey-gray-200 mb-4">Total Cost Accumulated</h4>
        <div className="space-y-4">
          {costData.map((item, index) => {
            // For free services, show a special indicator
            if (item.isFree) {
              return (
                <div key={index} className="flex items-center gap-4">
                  {/* Label */}
                  <div className="w-20 text-sm font-medium text-unkey-gray-200 text-right flex-shrink-0">
                    {item.label}
                  </div>

                  {/* Free indicator */}
                  <div className="flex-1 relative">
                    <div className="w-full bg-unkey-gray-800 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                      <div
                        className="h-full rounded-full flex items-center justify-center"
                        style={{
                          width: '100%',
                          backgroundColor: item.color,
                          opacity: 0.3,
                        }}
                      >
                        <span className="text-sm font-semibold text-unkey-gray-200">
                          $0.00
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const percentage = maxTotalCost > 0 ? (item.totalCost / maxTotalCost) * 100 : 0;
            const displayValue = formatCost(item.totalCost);

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
                  {percentage <= 20 && percentage > 0 && (
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
          {costData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-unkey-gray-300">
                {item.label} ({item.queryCount} {item.queryCount === 1 ? 'query' : 'queries'})
                {item.isFree && ' - FREE'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost savings note if Direct (Ollama) is present */}
      {data.direct && paidCosts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-unkey-gray-700">
          <div className="text-xs text-unkey-gray-300 text-center">
            💡 Direct approach runs locally via Ollama and has no API costs
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob