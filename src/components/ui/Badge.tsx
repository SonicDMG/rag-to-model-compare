/**
 * Badge component for displaying labels and indicators
 * Styled with Unkey-inspired dark theme
 */

interface BadgeProps {
  /** Badge text content */
  children: React.ReactNode;
  /** Color variant */
  variant?: 'default' | 'primary' | 'info' | 'warning' | 'success' | 'error';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-unkey-gray-850 text-unkey-gray-300 border-unkey-gray-700',
    primary: 'bg-unkey-teal-500/10 text-unkey-teal-400 border-unkey-teal-500/20',
    info: 'bg-blue/10 text-blue border-blue/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    success: 'bg-success/10 text-success border-success/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-unkey-md border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Estimated badge with icon
 */
export function EstimatedBadge() {
  return (
    <Badge variant="warning" size="sm">
      <svg
        className="w-3 h-3 mr-1"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      Estimated
    </Badge>
  );
}

// Made with Bob