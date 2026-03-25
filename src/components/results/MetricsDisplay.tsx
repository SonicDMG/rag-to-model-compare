'use client';

import { ComparisonMetrics, RAGResult, DirectResult } from '@/types/rag-comparison';
import { formatCost, formatTokens, formatTime, formatPercentage } from '@/lib/utils/formatters';
import { MetricsBreakdownPanel } from './MetricsBreakdownPanel';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { ModelInfoBadge } from '../shared/ModelInfoBadge';

interface MetricsDisplayProps {
  metrics: ComparisonMetrics;
  ragResult?: RAGResult;
  directResult?: DirectResult;
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
    if (isTie) return 'bg-unkey-gray-850 border-unkey-gray-700';
    return isWinner ? 'bg-success/10 border-success/20' : 'bg-red-500/10 border-red-500/20';
  };

  const getTextColor = (isWinner: boolean) => {
    if (isTie) return 'text-unkey-gray-300';
    return isWinner ? 'text-success' : 'text-red-400';
  };

  const getBadge = (isWinner: boolean) => {
    if (isTie) return null;
    return isWinner ? (
      <Badge variant="success" size="sm">
        Winner
      </Badge>
    ) : null;
  };

  return (
    <div className="bg-unkey-gray-900 rounded-unkey-lg border border-unkey-gray-700 p-4 shadow-unkey-card">
      <h3 className="text-sm font-medium text-unkey-gray-400 mb-3">{title}</h3>
      
      <div className="space-y-3">
        {/* RAG Value */}
        <div className={`flex items-center justify-between p-3 rounded-unkey-md border ${getColor(ragWins)}`}>
          <div>
            <span className="text-xs font-medium text-unkey-gray-400">{ragLabel}</span>
            <div className={`text-lg font-bold mt-1 ${getTextColor(ragWins)}`}>{ragValue}</div>
          </div>
          {getBadge(ragWins)}
        </div>

        {/* Direct Value */}
        <div className={`flex items-center justify-between p-3 rounded-unkey-md border ${getColor(directWins)}`}>
          <div>
            <span className="text-xs font-medium text-unkey-gray-400">{directLabel}</span>
            <div className={`text-lg font-bold mt-1 ${getTextColor(directWins)}`}>{directValue}</div>
          </div>
          {getBadge(directWins)}
        </div>

        {/* Difference */}
        <div className="pt-2 border-t border-unkey-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-unkey-gray-400">Difference</span>
            <span className={`font-semibold ${
              isTie ? 'text-unkey-gray-300' :
              (isInverse ? difference < 0 : difference > 0) ? 'text-success' : 'text-red-400'
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
  const variant = isTie ? 'teal' : isWinner ? 'success' : 'blue';
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-unkey-gray-200">{label}</span>
        <span className="font-semibold text-white">{formatPercentage(percentage / 100)}</span>
      </div>
      <ProgressBar percentage={percentage} variant={variant} showLabel={false} />
    </div>
  );
}

export function MetricsDisplay({
  metrics,
  ragResult,
  directResult
}: MetricsDisplayProps) {
  const ragContextWins = metrics.contextWindow.ragUsage < metrics.contextWindow.directUsage;
  const directContextWins = metrics.contextWindow.directUsage < metrics.contextWindow.ragUsage;
  const contextTie = Math.abs(metrics.contextWindow.difference) < 5;

  return (
    <div className="w-full space-y-6">
      <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Performance Metrics</h2>
        
        {/* Model Information */}
        {(ragResult?.metrics.breakdown?.metadata.model || directResult?.metrics.breakdown?.metadata.model) && (
          <div className="mb-6 pb-6 border-b border-unkey-gray-700">
            <div className="flex flex-col gap-4">
              {ragResult?.metrics.breakdown?.metadata.model && (
                <div>
                  <h3 className="text-sm font-medium text-unkey-gray-400 mb-2">RAG Model</h3>
                  <ModelInfoBadge
                    modelId={ragResult.metrics.breakdown.metadata.model}
                    variant="success"
                  />
                </div>
              )}
              {directResult?.metrics.breakdown?.metadata.model && (
                <div>
                  <h3 className="text-sm font-medium text-unkey-gray-400 mb-2">Direct Model</h3>
                  <ModelInfoBadge
                    modelId={directResult.metrics.breakdown.metadata.model}
                    variant="info"
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
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
        <div className="bg-unkey-gray-850 rounded-unkey-lg p-6 border border-unkey-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Context Window Usage</h3>
          
          <div className="space-y-4">
            <ContextWindowBar
              label="RAG Approach"
              percentage={metrics.contextWindow.ragUsage}
              isWinner={ragContextWins && !contextTie}
            />
            
            <ContextWindowBar
              label="Hybrid Approach"
              percentage={metrics.contextWindow.directUsage}
              isWinner={directContextWins && !contextTie}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-unkey-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-unkey-gray-400">Difference</span>
              <span className={`font-semibold ${
                contextTie ? 'text-unkey-gray-300' :
                metrics.contextWindow.difference < 0 ? 'text-success' : 'text-red-400'
              }`}>
                {metrics.contextWindow.difference > 0 ? '+' : ''}
                {metrics.contextWindow.difference.toFixed(1)} percentage points
              </span>
            </div>
          </div>
        </div>

        {/* Quality Metrics (if available) */}
        {metrics.quality && (
          <div className="mt-6 bg-unkey-teal-500/10 rounded-unkey-lg p-6 border border-unkey-teal-500/20">
            <h3 className="text-lg font-semibold text-white mb-4">Quality Comparison</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-unkey-gray-400">RAG Quality Score</span>
                <div className="text-2xl font-bold text-unkey-teal-400 mt-1">
                  {metrics.quality.ragScore?.toFixed(2) || 'N/A'}
                </div>
              </div>
              
              <div>
                <span className="text-sm text-unkey-gray-400">Direct Quality Score</span>
                <div className="text-2xl font-bold text-unkey-teal-400 mt-1">
                  {metrics.quality.directScore?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Breakdown Panels */}
      {ragResult?.metrics.breakdown && (
        <MetricsBreakdownPanel
          breakdown={ragResult.metrics.breakdown}
          pipelineType="rag"
        />
      )}

      {directResult?.metrics.breakdown && (
        <MetricsBreakdownPanel
          breakdown={directResult.metrics.breakdown}
          pipelineType="direct"
        />
      )}
    </div>
  );
}

// Made with Bob