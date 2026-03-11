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
    if (percentage >= 70) return 'blue';
    return 'green';
  };

  const usageColor = getUsageColor(contextWindow.percentageUsed);

  return (
    <div className="space-y-4">
      {/* Context Window Limit */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Context Window Limit</h4>
          <span className="text-2xl font-bold text-gray-900">
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
              className="text-gray-200"
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
                usageColor === 'blue' ? 'text-blue-500' :
                'text-green-500'
              }`}
              strokeLinecap="round"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${
              usageColor === 'orange' ? 'text-orange-600' :
              usageColor === 'blue' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {contextWindow.percentageUsed.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-600 mt-1">Used</span>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h5 className="text-xs font-medium text-gray-600 mb-1">Tokens Used</h5>
          <p className="text-xl font-bold text-blue-700">
            {formatTokens(contextWindow.tokensUsed)}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h5 className="text-xs font-medium text-gray-600 mb-1">Remaining</h5>
          <p className="text-xl font-bold text-green-700">
            {formatTokens(contextWindow.tokensRemaining)}
          </p>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h5 className="text-sm font-semibold text-gray-700 mb-3">
          Breakdown by Component
        </h5>
        <div className="space-y-3">
          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-gray-600">System Prompt</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {formatTokens(tokens.systemPrompt)}
                </span>
                <span className="text-xs text-gray-500">
                  ({systemPromptPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={systemPromptPercent}
              variant="gray"
              height="sm"
              showLabel={false}
            />
          </div>

          {/* Query */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-gray-600">Query</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {formatTokens(tokens.query)}
                </span>
                <span className="text-xs text-gray-500">
                  ({queryPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={queryPercent}
              variant="blue"
              height="sm"
              showLabel={false}
            />
          </div>

          {/* Context */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-gray-600">Context</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {formatTokens(tokens.context)}
                </span>
                <span className="text-xs text-gray-500">
                  ({contextPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={contextPercent}
              variant="blue"
              height="sm"
              showLabel={false}
            />
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-gray-600">Output</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {formatTokens(tokens.output)}
                </span>
                <span className="text-xs text-gray-500">
                  ({outputPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <ProgressBar
              percentage={outputPercent}
              variant="green"
              height="sm"
              showLabel={false}
            />
          </div>
        </div>
      </div>

      {/* Stacked Bar Visualization */}
      <div className="mt-4">
        <h5 className="text-xs font-medium text-gray-600 mb-2">Context Window Usage</h5>
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-300">
          <div
            className="bg-gray-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${systemPromptPercent}%` }}
            title={`System: ${systemPromptPercent.toFixed(1)}%`}
          >
            {systemPromptPercent > 8 && 'Sys'}
          </div>
          <div
            className="bg-blue-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${queryPercent}%` }}
            title={`Query: ${queryPercent.toFixed(1)}%`}
          >
            {queryPercent > 8 && 'Q'}
          </div>
          <div
            className="bg-blue-600 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${contextPercent}%` }}
            title={`Context: ${contextPercent.toFixed(1)}%`}
          >
            {contextPercent > 8 && 'Ctx'}
          </div>
          <div
            className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${outputPercent}%` }}
            title={`Output: ${outputPercent.toFixed(1)}%`}
          >
            {outputPercent > 8 && 'Out'}
          </div>
          <div
            className="bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold transition-all duration-500"
            style={{ width: `${(contextWindow.tokensRemaining / contextWindow.contextWindowSize) * 100}%` }}
            title={`Remaining: ${((contextWindow.tokensRemaining / contextWindow.contextWindowSize) * 100).toFixed(1)}%`}
          >
            {((contextWindow.tokensRemaining / contextWindow.contextWindowSize) * 100) > 8 && 'Free'}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-400 rounded"></span>
            System
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-400 rounded"></span>
            Query
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-600 rounded"></span>
            Context
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            Output
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-200 border border-gray-300 rounded"></span>
            Free
          </span>
        </div>
      </div>

      {/* Warning if usage is high */}
      {contextWindow.percentageUsed >= 90 && (
        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
          <p className="text-xs text-orange-800">
            <strong>Warning:</strong> Context window usage is very high ({contextWindow.percentageUsed.toFixed(1)}%). 
            Consider using a model with a larger context window or reducing input size.
          </p>
        </div>
      )}
    </div>
  );
}

// Made with Bob