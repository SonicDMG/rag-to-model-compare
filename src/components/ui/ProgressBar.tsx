/**
 * Progress bar component for visualizing percentages
 */

interface ProgressBarProps {
  /** Percentage value (0-100) */
  percentage: number;
  /** Color variant */
  variant?: 'blue' | 'green' | 'gray' | 'orange';
  /** Show percentage label */
  showLabel?: boolean;
  /** Height of the bar */
  height?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function ProgressBar({
  percentage,
  variant = 'blue',
  showLabel = true,
  height = 'md',
  className = '',
}: ProgressBarProps) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    gray: 'bg-gray-600',
    orange: 'bg-orange-600',
  };

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex-1 bg-gray-200 rounded-full ${heightClasses[height]} overflow-hidden`}>
        <div
          className={`h-full ${colorClasses[variant]} transition-all duration-500 ease-out`}
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
          {clampedPercentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// Made with Bob