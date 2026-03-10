/**
 * Formatting utilities for displaying metrics and values
 */

/**
 * Formats a cost value as USD currency
 * 
 * @param cost - Cost value in USD
 * @returns Formatted cost string with dollar sign and appropriate precision
 * 
 * @example
 * ```typescript
 * formatCost(0.0001)  // Returns "$0.0001"
 * formatCost(0.05)    // Returns "$0.05"
 * formatCost(1.234)   // Returns "$1.23"
 * formatCost(100)     // Returns "$100.00"
 * ```
 */
export function formatCost(cost: number): string {
  if (cost === 0) {
    return '$0.00';
  }
  
  // For very small costs (< $0.01), show up to 4 decimal places
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  
  // For costs < $1, show up to 3 decimal places
  if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  
  // For larger costs, show 2 decimal places
  return `$${cost.toFixed(2)}`;
}

/**
 * Formats a token count with thousand separators
 * 
 * @param tokens - Number of tokens
 * @returns Formatted token count with commas
 * 
 * @example
 * ```typescript
 * formatTokens(1234)     // Returns "1,234"
 * formatTokens(1234567)  // Returns "1,234,567"
 * formatTokens(42)       // Returns "42"
 * ```
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString('en-US');
}

/**
 * Formats a time duration in milliseconds
 * 
 * @param ms - Time in milliseconds
 * @returns Formatted time string (ms for < 1000ms, s for >= 1000ms)
 * 
 * @example
 * ```typescript
 * formatTime(123)    // Returns "123ms"
 * formatTime(1234)   // Returns "1.23s"
 * formatTime(5000)   // Returns "5.00s"
 * ```
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  
  const seconds = ms / 1000;
  return `${seconds.toFixed(2)}s`;
}

/**
 * Formats a decimal value as a percentage
 * 
 * @param value - Decimal value (0-1 for 0-100%, or already as percentage)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 * 
 * @example
 * ```typescript
 * formatPercentage(0.1234)      // Returns "12.34%"
 * formatPercentage(0.5)         // Returns "50.00%"
 * formatPercentage(50)          // Returns "50.00%"
 * formatPercentage(0.1234, 1)   // Returns "12.3%"
 * ```
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  // If value is between 0 and 1, treat as decimal (multiply by 100)
  // If value is > 1, treat as already a percentage
  const percentage = value <= 1 ? value * 100 : value;
  
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Formats a large number with appropriate suffix (K, M, B)
 * 
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number with suffix
 * 
 * @example
 * ```typescript
 * formatLargeNumber(1234)       // Returns "1.2K"
 * formatLargeNumber(1234567)    // Returns "1.2M"
 * formatLargeNumber(1234567890) // Returns "1.2B"
 * formatLargeNumber(999)        // Returns "999"
 * ```
 */
export function formatLargeNumber(num: number, decimals: number = 1): string {
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 1000000) {
    return `${(num / 1000).toFixed(decimals)}K`;
  }
  
  if (num < 1000000000) {
    return `${(num / 1000000).toFixed(decimals)}M`;
  }
  
  return `${(num / 1000000000).toFixed(decimals)}B`;
}

/**
 * Formats a comparison difference with sign and color indication
 * 
 * @param difference - Difference value (positive or negative)
 * @param isInverse - If true, negative is better (e.g., for cost/time)
 * @returns Object with formatted string and indicator of better/worse
 * 
 * @example
 * ```typescript
 * formatDifference(25.5)              // Returns { text: "+25.5%", isBetter: true }
 * formatDifference(-10.2)             // Returns { text: "-10.2%", isBetter: false }
 * formatDifference(15.0, true)        // Returns { text: "+15.0%", isBetter: false }
 * formatDifference(-20.0, true)       // Returns { text: "-20.0%", isBetter: true }
 * ```
 */
export function formatDifference(
  difference: number,
  isInverse: boolean = false
): { text: string; isBetter: boolean } {
  const sign = difference >= 0 ? '+' : '';
  const text = `${sign}${difference.toFixed(1)}%`;
  
  // For inverse metrics (cost, time), negative is better
  // For normal metrics (quality), positive is better
  const isBetter = isInverse ? difference < 0 : difference > 0;
  
  return { text, isBetter };
}

/**
 * Formats bytes to human-readable file size
 * 
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 * 
 * @example
 * ```typescript
 * formatFileSize(1024)        // Returns "1.00 KB"
 * formatFileSize(1048576)     // Returns "1.00 MB"
 * formatFileSize(1234567890)  // Returns "1.15 GB"
 * ```
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

/**
 * Formats a date to a relative time string (e.g., "2 hours ago")
 * 
 * @param date - Date to format
 * @returns Relative time string
 * 
 * @example
 * ```typescript
 * formatRelativeTime(new Date(Date.now() - 60000))      // Returns "1 minute ago"
 * formatRelativeTime(new Date(Date.now() - 3600000))    // Returns "1 hour ago"
 * formatRelativeTime(new Date(Date.now() - 86400000))   // Returns "1 day ago"
 * ```
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return 'just now';
  }
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  // For older dates, show the actual date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Made with Bob
