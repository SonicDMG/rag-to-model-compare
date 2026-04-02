/**
 * Model comparison chart component
 * Visualizes performance metrics across different inference models
 * Aggregates data from all pipelines (RAG, Direct, Ollama) by model
 */

import { QueryHistoryItem } from '@/types/tabs';
import {
  aggregateByModel,
  filterByMinQueries,
  getSortedModelNames,
  getMaxMetricValue,
  ModelAggregationResult,
} from '@/lib/utils/model-aggregator';
import { formatTime, formatTokens, formatCost } from '@/lib/utils/formatters';

/**
 * Props for ModelComparisonChart component
 */
export interface ModelComparisonChartProps {
  /** Query history to aggregate by model */
  queryHistory: QueryHistoryItem[];
  /** Minimum queries required to include a model (default: 3) */
  minQueries?: number;
}

/**
 * Color palette for different models
 * Uses a diverse set of colors to distinguish models
 */
const MODEL_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#F97316', // Orange-red
  '#6366F1', // Indigo
];

/**
 * Get a consistent color for a model based on its index
 */
function getModelColor(index: number): string {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}

/**
 * Render a single metric section with horizontal bars
 */
interface MetricSectionProps {
  title: string;
  subtitle: string;
  modelNames: string[];
  aggregation: ModelAggregationResult;
  metricKey: 'avgTime' | 'avgTokens' | 'avgCost' | 'queryCount';
  formatter: (value: number) => string;
}

function MetricSection({
  title,
  subtitle,
  modelNames,
  aggregation,
  metricKey,
  formatter,
}: MetricSectionProps) {
  if (modelNames.length === 0) {
    return (
      <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-unkey-gray-300 mb-4">{subtitle}</p>
        <div className="flex items-center justify-center h-32 text-unkey-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Get max value for scaling
  const maxValue = getMaxMetricValue(aggregation, metricKey);
  const barHeight = 50;

  return (
    <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-unkey-gray-300">{subtitle}</p>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {modelNames.map((modelName, index) => {
          const metrics = aggregation[modelName];
          const value = metrics[metricKey];
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const displayValue = formatter(value);
          const color = getModelColor(index);

          return (
            <div key={modelName} className="flex items-center gap-4">
              {/* Model name with query count */}
              <div className="w-32 text-sm font-medium text-unkey-gray-200 text-right flex-shrink-0">
                <div className="truncate" title={modelName}>
                  {modelName}
                </div>
                <div className="text-xs text-unkey-gray-400">
                  {metrics.queryCount} {metrics.queryCount === 1 ? 'query' : 'queries'}
                </div>
              </div>

              {/* Bar container */}
              <div className="flex-1 relative overflow-visible">
                {/* Background track */}
                <div
                  className="w-full bg-unkey-gray-800 rounded-full overflow-hidden"
                  style={{ height: `${barHeight}px` }}
                >
                  {/* Colored bar */}
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-3"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                      minWidth: percentage > 0 ? '40px' : '0',
                    }}
                  >
                    {/* Value label inside bar if it fits */}
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

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-unkey-gray-700">
        <div className="flex flex-wrap gap-3 justify-center text-xs">
          {modelNames.map((modelName, index) => (
            <div key={modelName} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getModelColor(index) }}
              />
              <span className="text-unkey-gray-300 truncate max-w-[150px]" title={modelName}>
                {modelName}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Model comparison chart component
 * 
 * Displays performance metrics across different inference models:
 * - Timing: Average generation time per model
 * - Tokens: Average tokens per model
 * - Cost: Average cost per model
 * - Usage: Query count per model
 * 
 * Features:
 * - Aggregates data from all pipelines by model
 * - Filters out models with insufficient queries
 * - Color-coded horizontal bars
 * - Shows query count for context
 * - Responsive design
 * 
 * @example
 * ```tsx
 * <ModelComparisonChart 
 *   queryHistory={history} 
 *   minQueries={3}
 * />
 * ```
 */
export function ModelComparisonChart({
  queryHistory,
  minQueries = 3,
}: ModelComparisonChartProps) {
  // Aggregate data by model
  const rawAggregation = aggregateByModel(queryHistory);
  
  // Filter by minimum queries
  const aggregation = filterByMinQueries(rawAggregation, minQueries);
  
  // Check if we have any data
  if (Object.keys(aggregation).length === 0) {
    return (
      <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-8">
        <h2 className="text-xl font-bold text-white mb-2">Model Comparison</h2>
        <p className="text-sm text-unkey-gray-300 mb-6">
          Compare performance metrics across different inference models
        </p>
        <div className="flex flex-col items-center justify-center h-64 text-unkey-gray-400">
          <svg
            className="w-16 h-16 mb-4"
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
          <p className="text-center">
            {queryHistory.length === 0
              ? 'No query history available'
              : `No models with at least ${minQueries} ${minQueries === 1 ? 'query' : 'queries'}`}
          </p>
          {queryHistory.length > 0 && Object.keys(rawAggregation).length > 0 && (
            <p className="text-xs text-unkey-gray-500 mt-2">
              {Object.keys(rawAggregation).length} {Object.keys(rawAggregation).length === 1 ? 'model has' : 'models have'} fewer than {minQueries} queries
            </p>
          )}
        </div>
      </div>
    );
  }

  // Get sorted model names for each metric
  const modelsByTime = getSortedModelNames(aggregation, 'avgTime', 'desc');
  const modelsByTokens = getSortedModelNames(aggregation, 'avgTokens', 'desc');
  const modelsByCost = getSortedModelNames(aggregation, 'avgCost', 'desc');
  const modelsByUsage = getSortedModelNames(aggregation, 'queryCount', 'desc');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-unkey-gray-900 rounded-lg border border-unkey-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-2">Model Comparison</h2>
        <p className="text-sm text-unkey-gray-300">
          Performance metrics across {Object.keys(aggregation).length}{' '}
          {Object.keys(aggregation).length === 1 ? 'model' : 'models'} with at least{' '}
          {minQueries} {minQueries === 1 ? 'query' : 'queries'}
        </p>
      </div>

      {/* Timing Section */}
      <MetricSection
        title="Average Response Time"
        subtitle="Average generation time per model (lower is better)"
        modelNames={modelsByTime}
        aggregation={aggregation}
        metricKey="avgTime"
        formatter={formatTime}
      />

      {/* Tokens Section */}
      <MetricSection
        title="Average Token Usage"
        subtitle="Average tokens consumed per model"
        modelNames={modelsByTokens}
        aggregation={aggregation}
        metricKey="avgTokens"
        formatter={formatTokens}
      />

      {/* Cost Section */}
      <MetricSection
        title="Average Cost"
        subtitle="Average cost per query per model (lower is better)"
        modelNames={modelsByCost}
        aggregation={aggregation}
        metricKey="avgCost"
        formatter={formatCost}
      />

      {/* Usage Section */}
      <MetricSection
        title="Query Count"
        subtitle="Number of queries executed per model"
        modelNames={modelsByUsage}
        aggregation={aggregation}
        metricKey="queryCount"
        formatter={(value) => value.toString()}
      />
    </div>
  );
}

// Made with Bob