/**
 * Progress bar component for visualizing percentages
 * Styled with Unkey-inspired dark theme with teal accents
 */

interface ProgressBarProps {
  /** Percentage value (0-100) */
  percentage: number;
  /** Color variant */
  variant?: 'teal' | 'success' | 'blue' | 'purple';
  /** Show percentage label */
  showLabel?: boolean;
  /** Height of the bar */
  height?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function ProgressBar({
  percentage,
  variant = 'teal',
  showLabel = true,
  height = 'md',
  className = '',
}: ProgressBarProps) {
  const colorClasses = {
    teal: 'bg-gradient-to-r from-unkey-teal-500 to-unkey-teal-400 shadow-unkey-glow',
    success: 'bg-gradient-to-r from-success to-green-400',
    blue: 'bg-gradient-to-r from-blue to-blue-400',
    purple: 'bg-gradient-to-r from-purple to-purple-400',
  };

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex-1 bg-unkey-gray-800 rounded-unkey-md ${heightClasses[height]} overflow-hidden`}>
        <div
          className={`h-full ${colorClasses[variant]} transition-all duration-500 ease-out rounded-unkey-md`}
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-unkey-gray-200 min-w-[3rem] text-right">
          {clampedPercentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// Made with Bob