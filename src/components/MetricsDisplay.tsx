'use client';

import { ComparisonMetrics } from '@/types/rag-comparison';
import { formatCost, formatTokens, formatTime, formatPercentage } from '@/lib/utils/formatters';

interface MetricsDisplayProps {
  metrics: ComparisonMetrics;
}

interface MetricCardProps {
  title: string;
  ragValue: string;
  directValue: string;
  difference: number;
  isInverse?: boolean;
  ragLabel?: string;
  directLabel?: string;
}

function MetricCard({ 
  title, 
  ragValue, 
  directValue, 
  difference, 
  isInverse = false,
  ragLabel = 'RAG',
  directLabel = 'Direct'
}: MetricCardProps) {
  // Determine winner based on difference and whether lower is better
  const ragWins = isInverse ? difference < 0 : difference > 0;
  const directWins = isInverse ? difference > 0 : difference < 0;
  const isTie = Math.abs(difference) < 0.1;

  const getColor = (isWinner: boolean) => {
    if (isTie) return 'text-gray-600 bg-gray-100';
    return isWinner ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
  };

  const getBadge = (isWinner: boolean) => {
    if (isTie) return null;
    return isWinner ? (
      <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-600 text-white">
        Winner
      </span>
    ) : null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">{title}</h3>
      
      <div className="space-y-3">
        {/* RAG Value */}
        <div className={`flex items-center justify-between p-3 rounded-lg ${getColor(ragWins)}`}>
          <div>
            <span className="text-xs font-medium">{ragLabel}</span>
            <div className="text-lg font-bold mt-1">{ragValue}</div>
          </div>
          {getBadge(ragWins)}
        </div>

        {/* Direct Value */}
        <div className={`flex items-center justify-between p-3 rounded-lg ${getColor(directWins)}`}>
          <div>
            <span className="text-xs font-medium">{directLabel}</span>
            <div className="text-lg font-bold mt-1">{directValue}</div>
          </div>
          {getBadge(directWins)}
        </div>

        {/* Difference */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Difference</span>
            <span className={`font-semibold ${
              isTie ? 'text-gray-600' : 
              (isInverse ? difference < 0 : difference > 0) ? 'text-green-600' : 'text-red-600'
            }`}>
              {difference > 0 ? '+' : ''}{difference.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextWindowBar({ 
  label, 
  percentage, 
  isWinner 
}: { 
  label: string; 
  percentage: number; 
  isWinner: boolean;
}) {
  const isTie = Math.abs(percentage - 50) < 5;
  const color = isTie ? 'bg-gray-400' : isWinner ? 'bg-green-500' : 'bg-red-500';
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{formatPercentage(percentage / 100)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  const ragContextWins = metrics.contextWindow.ragUsage < metrics.contextWindow.directUsage;
  const directContextWins = metrics.contextWindow.directUsage < metrics.contextWindow.ragUsage;
  const contextTie = Math.abs(metrics.contextWindow.difference) < 5;

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Performance Metrics</h2>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="Speed"
            ragValue={formatTime(metrics.speed.ragTotal)}
            directValue={formatTime(metrics.speed.directTotal)}
            difference={metrics.speed.difference}
            isInverse={true}
          />
          
          <MetricCard
            title="Token Usage"
            ragValue={formatTokens(metrics.tokens.rag)}
            directValue={formatTokens(metrics.tokens.direct)}
            difference={metrics.tokens.difference}
            isInverse={true}
          />
          
          <MetricCard
            title="Cost"
            ragValue={formatCost(metrics.cost.rag)}
            directValue={formatCost(metrics.cost.direct)}
            difference={metrics.cost.difference}
            isInverse={true}
          />
        </div>

        {/* Context Window Usage */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Context Window Usage</h3>
          
          <div className="space-y-4">
            <ContextWindowBar
              label="RAG Approach"
              percentage={metrics.contextWindow.ragUsage}
              isWinner={ragContextWins && !contextTie}
            />
            
            <ContextWindowBar
              label="Direct Approach"
              percentage={metrics.contextWindow.directUsage}
              isWinner={directContextWins && !contextTie}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Difference</span>
              <span className={`font-semibold ${
                contextTie ? 'text-gray-600' : 
                metrics.contextWindow.difference < 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.contextWindow.difference > 0 ? '+' : ''}
                {metrics.contextWindow.difference.toFixed(1)} percentage points
              </span>
            </div>
          </div>
        </div>

        {/* Quality Metrics (if available) */}
        {metrics.quality && (
          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Comparison</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">RAG Quality Score</span>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {metrics.quality.ragScore?.toFixed(2) || 'N/A'}
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Direct Quality Score</span>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {metrics.quality.directScore?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob