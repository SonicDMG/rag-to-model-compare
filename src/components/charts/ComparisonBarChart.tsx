/**
 * Generic bar chart component for comparing different approaches
 * Uses CSS-based bars for simple, native visualization
 */

/**
 * Data point for a single bar in the chart
 */
export interface BarData {
  /** Label for this bar */
  label: string;
  /** Value to display */
  value: number;
  /** Color for the bar (hex or Tailwind color) */
  color: string;
  /** Optional formatted display value (e.g., "$0.05" instead of "0.05") */
  displayValue?: string;
}

/**
 * Props for ComparisonBarChart component
 */
export interface ComparisonBarChartProps {
  /** Title of the chart */
  title: string;
  /** Array of bar data to display */
  data: BarData[];
  /** Unit to display (e.g., "ms", "tokens", "$") */
  unit: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Optional height in pixels (default: 300) */
  height?: number;
}

/**
 * Generic bar chart component for comparing approaches
 * 
 * Features:
 * - CSS-based horizontal bars
 * - Automatic scaling based on max value
 * - Color-coded by approach
 * - Responsive design
 */
export function ComparisonBarChart({
  title,
  data,
  unit,
  subtitle,
  height = 300,
}: ComparisonBarChartProps) {
  // Filter out bars with no data
  const validData = data.filter(d => d.value > 0);
  
  if (validData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(...validData.map(d => d.value));
  
  // Calculate bar height based on number of bars
  const barHeight = Math.min(60, (height - 100) / validData.length);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {validData.map((bar, index) => {
          const percentage = (bar.value / maxValue) * 100;
          const displayValue = bar.displayValue || `${bar.value.toFixed(2)}${unit}`;

          return (
            <div key={index} className="flex items-center gap-4">
              {/* Label */}
              <div className="w-20 text-sm font-medium text-gray-700 text-right flex-shrink-0">
                {bar.label}
              </div>

              {/* Bar container */}
              <div className="flex-1 relative">
                {/* Background track */}
                <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                  {/* Colored bar */}
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-3"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: bar.color,
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
                {percentage <= 20 && (
                  <span
                    className="absolute text-xs font-semibold text-gray-700 whitespace-nowrap"
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
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 justify-center">
          {validData.map((bar, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: bar.color }}
              />
              <span className="text-xs text-gray-600">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Made with Bob