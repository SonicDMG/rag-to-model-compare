import { ContextWindowBreakdown, TokenBreakdown } from '@/types/rag-comparison';
import { formatTokens } from '@/lib/utils/formatters';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface ContextWindowBreakdownViewProps {
  contextWindow: ContextWindowBreakdown;
  tokens: TokenBreakdown;
}

export function ContextWindowBreakdownView({
  contextWindow,
  tokens
}: ContextWindowBreakdownViewProps) {
  // Calculate percentages for each component
  const systemPromptPercent = (tokens.systemPrompt / contextWindow.contextWindowSize) * 100;
  const queryPercent = (tokens.query / contextWindow.contextWindowSize) * 100;
  const contextPercent = (tokens.context / contextWindow.contextWindowSize) * 100;
  const outputPercent = (tokens.output / contextWindow.contextWindowSize) * 100;

  // Determine color based on usage
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'orange';
    if (percentage >= 70) return 'teal';
    return 'success';
  };

  const usageColor = getUsageColor(contextWindow.percentageUsed);

  return (
    <div className="space-y-4">
      {/* Context Window Limit */}
      <div className="bg-unkey-gray-850 rounded-unkey-lg p-4 border border-unkey-gray-700 shadow-unkey-card">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-unkey-gray-200">Context Window Limit</h4>
          <span className="text-2xl font-bold text-white">
            {formatTokens(contextWindow.contextWindowSize)}
          </span>
        </div>
      </div>

      {/* Circular Progress Indicator */}
      <div className="flex items-center justify-center py-6">
        <div className="relative w-48 h-48">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="16"
              fill="none"
              className="text-unkey-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="16"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - contextWindow.percentageUsed / 100)}`}
              className={`transition-all duration-1000 ease-out ${
                usageColor === 'orange' ? 'text-orange-500' :
                usageColor === 'teal' ? 'text-unkey-teal-500' :
                'text-green-500'
              }`}
              strokeLinecap="round"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${
              usageColor === 'orange' ? 'text-orange-500' :
              usageColor === 'teal' ? 'text-unkey-teal-400' :
              'text-green-500'
            }`}>
              {contextWindow.percentageUsed.toFixed(1)}%
            </span>
            <span className="text-sm text-unkey-gray-400 mt-1">Used</span>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-unkey-gray-850 rounded-unkey-md p-4 border border-unkey-gray-700">
          <h5 className="text-xs font-medium text-unkey-gray-400 mb-1">Tokens Used</h5>
          <p className="text-xl font-bold text-unkey-teal-400">
            {formatTokens(contextWindow.tokensUsed)}
          </p>
        </div>
        <div className="bg-unkey-gray-850 rounded-unkey-md p-4 border border-unkey-gray-700">
          <h5 className="text-xs font-medium text-unkey-gray-400 mb-1">Remaining</h5>
          <p className="text-xl font-bold text-green-400">
            {formatTokens(contextWindow.tokensRemaining)}
          </p>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="bg-unkey-gray-900 rounded-unkey-lg border border-unkey-gray-700 p-4">
        <h5 className="text-base font-medium text-unkey-gray-200 mb-3">
          Breakdown by Component
        </h5>
        <div className="space-y-3">
          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-unkey-gray-400">System Prompt</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {formatTokens(tokens.systemPrompt)}
                </span>
                <span className="text-xs text-unkey-gray-500">
                  ({systemPromptPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={systemPromptPercent}
              variant="purple"
              height="sm"
              showLabel={false}
            />
          </div>

          {/* Query */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-unkey-gray-400">Query</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {formatTokens(tokens.query)}
                </span>
                <span className="text-xs text-unkey-gray-500">
                  ({queryPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={queryPercent}
              variant="teal"
              height="sm"
              showLabel={false}
            />
          </div>

          {/* Context */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-unkey-gray-400">Context</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {formatTokens(tokens.context)}
                </span>
                <span className="text-xs text-unkey-gray-500">
                  ({contextPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={contextPercent}
              variant="teal"
              height="sm"
              showLabel={false}
            />
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-unkey-gray-400">Output</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {formatTokens(tokens.output)}
                </span>
                <span className="text-xs text-unkey-gray-500">
                  ({outputPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={outputPercent}
              variant="success"
              height="sm"
              showLabel={false}
            />
          </div>
        </div>
      </div>

      {/* Stacked Bar Visualization */}
      <div className="mt-4">
        <h5 className="text-sm font-medium text-unkey-gray-400 mb-2">Context Window Usage</h5>
        <div className="flex h-8 rounded-unkey-md overflow-hidden border border-unkey-gray-700 bg-unkey-gray-850">
          <div
            className="bg-gradient-to-r from-unkey-gray-600 to-unkey-gray-500 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${systemPromptPercent}%` }}
            title={`System: ${systemPromptPercent.toFixed(1)}%`}
          >
            {systemPromptPercent > 8 && 'Sys'}
          </div>
          <div
            className="bg-gradient-to-r from-unkey-teal-500 to-unkey-teal-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${queryPercent}%` }}
            title={`Query: ${queryPercent.toFixed(1)}%`}
          >
            {queryPercent > 8 && 'Q'}
          </div>
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${contextPercent}%` }}
            title={`Context: ${contextPercent.toFixed(1)}%`}
          >
            {contextPercent > 8 && 'Ctx'}
          </div>
          <div
            className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${outputPercent}%` }}
            title={`Output: ${outputPercent.toFixed(1)}%`}
          >
            {outputPercent > 8 && 'Out'}
          </div>
          <div
            className="bg-unkey-gray-800 flex items-center justify-center text-unkey-gray-400 text-xs font-semibold transition-all duration-500"
            style={{ width: `${(contextWindow.tokensRemaining / contextWindow.contextWindowSize) * 100}%` }}
            title={`Remaining: ${((contextWindow.tokensRemaining / contextWindow.contextWindowSize) * 100).toFixed(1)}%`}
          >
            {((contextWindow.tokensRemaining / contextWindow.contextWindowSize) * 100) > 8 && 'Free'}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 mt-2 text-xs text-unkey-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-unkey-gray-500 rounded"></span>
            System
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-unkey-teal-500 rounded"></span>
            Query
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded"></span>
            Context
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            Output
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-unkey-gray-800 border border-unkey-gray-700 rounded"></span>
            Free
          </span>
        </div>
      </div>

      {/* Warning if usage is high */}
      {contextWindow.percentageUsed >= 90 && (
        <div className="bg-orange-500/10 rounded-unkey-md p-3 border border-orange-500/30">
          <p className="text-xs text-orange-400">
            <strong>Warning:</strong> Context window usage is very high ({contextWindow.percentageUsed.toFixed(1)}%).
            Consider using a model with a larger context window or reducing input size.
          </p>
        </div>
      )}
    </div>
  );
}

// Made with Bob