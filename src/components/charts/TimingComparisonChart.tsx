/**
 * Specialized chart for timing comparison across approaches
 * Shows RAG with stacked bars for retrieval vs generation breakdown
 */

import { AggregatedChartData } from '@/lib/utils/chart-aggregator';
import { formatTime } from '@/lib/utils/formatters';

/**
 * Props for TimingComparisonChart component
 */
export interface TimingComparisonChartProps {
  /** Aggregated chart data */
  data: AggregatedChartData;
}

/**
 * Color scheme for approaches
 */
const COLORS = {
  rag: '#3B82F6',        // Blue
  hybrid: '#10B981',     // Green
  direct: '#F59E0B',     // Orange
};

/**
 * Timing comparison chart showing total response times
 *
 * Features:
 * - Shows average response times
 * - All approaches use single bars for total time
 * - Direct/Hybrid/Ollama show generation time
 * - RAG shows actual measured total time (not additive)
 * - Responsive design
 */
export function TimingComparisonChart({ data }: TimingComparisonChartProps) {
  // Collect all valid timing data
  const timingData: Array<{
    label: string;
    totalTime: number;
    color: string;
  }> = [];

  if (data.rag) {
    timingData.push({
      label: 'RAG',
      totalTime: data.rag.avgTime,
      color: COLORS.rag,
    });
  }

  if (data.hybrid) {
    timingData.push({
      label: 'Hybrid',
      totalTime: data.hybrid.avgTime,
      color: COLORS.hybrid,
    });
  }

  if (data.direct) {
    timingData.push({
      label: 'Direct',
      totalTime: data.direct.avgTime,
      color: COLORS.direct,
    });
  }

  if (timingData.length === 0) {
    return (
      <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Response Time Comparison</h3>
        <p className="text-sm text-unkey-gray-300 mb-4">Average response time across all queries</p>
        <div className="flex items-center justify-center h-64 text-unkey-gray-400">
          No timing data available
        </div>
      </div>
    );
  }

  // Find max time for scaling
  const maxTime = Math.max(...timingData.map(d => d.totalTime));
  const barHeight = 60;

  return (
    <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">Response Time Comparison</h3>
        <p className="text-sm text-unkey-gray-300">Average response time across all queries</p>
      </div>

      {/* Chart */}
      <div className="space-y-6">
        {timingData.map((item, index) => {
          const percentage = (item.totalTime / maxTime) * 100;
          const displayValue = formatTime(item.totalTime);

          return (
            <div key={index} className="flex items-center gap-4">
              {/* Label */}
              <div className="w-20 text-sm font-medium text-unkey-gray-200 text-right flex-shrink-0">
                {item.label}
              </div>

              {/* Bar container - overflow-visible to allow labels to extend */}
              <div className="flex-1 relative overflow-visible">
                {/* Background track */}
                <div className="w-full bg-unkey-gray-800 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                  {/* Single bar for all approaches */}
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color,
                      minWidth: percentage > 0 ? '40px' : '0',
                    }}
                  />
                </div>

                {/* Total time label - positioned to avoid overflow */}
                <span
                  className="absolute text-xs font-semibold text-unkey-gray-200 whitespace-nowrap"
                  style={{
                    // If bar is > 85%, position inside with right padding
                    // Otherwise position outside to the right
                    ...(percentage > 85
                      ? {
                          right: `calc(${100 - percentage}% + 8px)`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }
                      : {
                          left: `calc(${percentage}% + 8px)`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }
                    ),
                  }}
                >
                  {displayValue}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-unkey-gray-700">
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          {data.rag && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.rag }} />
              <span className="text-unkey-gray-300">RAG</span>
            </div>
          )}
          {data.hybrid && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.hybrid }} />
              <span className="text-unkey-gray-300">Hybrid</span>
            </div>
          )}
          {data.direct && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.direct }} />
              <span className="text-unkey-gray-300">Direct</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob