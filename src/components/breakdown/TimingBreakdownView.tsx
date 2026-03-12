import { TimingBreakdown } from '@/types/rag-comparison';
import { formatTime } from '@/lib/utils/formatters';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { EstimatedBadge } from '@/components/ui/Badge';

interface TimingBreakdownViewProps {
  timing: TimingBreakdown;
  isRAG: boolean;
  isEstimated?: boolean;
}

export function TimingBreakdownView({ timing, isRAG, isEstimated }: TimingBreakdownViewProps) {
  return (
    <div className="space-y-4">
      {/* Total Time */}
      <div className="bg-unkey-gray-850 rounded-unkey-lg p-4 border border-unkey-gray-700 shadow-unkey-card">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-unkey-gray-200">Total Time</h4>
          <span className="text-2xl font-bold text-white">
            {formatTime(timing.totalTime)}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {/* Retrieval Time (RAG only) */}
        {isRAG && timing.retrievalTime !== undefined && timing.retrievalPercent !== undefined && (
          <div className="bg-unkey-gray-850 rounded-unkey-md p-4 border border-unkey-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-medium text-unkey-gray-200">Retrieval Time</h5>
              </div>
              <span className="text-lg font-bold text-unkey-teal-400">
                {formatTime(timing.retrievalTime)}
              </span>
            </div>
            <ProgressBar
              percentage={timing.retrievalPercent}
              variant="teal"
              height="sm"
            />
          </div>
        )}

        {/* Generation Time */}
        <div className="bg-unkey-gray-850 rounded-unkey-md p-4 border border-unkey-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-medium text-unkey-gray-200">Generation Time</h5>
              {isRAG && isEstimated && (
                <div className="flex items-center gap-1">
                  <EstimatedBadge />
                  <InfoTooltip content="This value is estimated as the difference between total time and retrieval time. OpenRAG SDK doesn't provide separate generation timing." />
                </div>
              )}
            </div>
            <span className="text-lg font-bold text-green-400">
              {formatTime(timing.generationTime)}
            </span>
          </div>
          <ProgressBar
            percentage={timing.generationPercent}
            variant="success"
            height="sm"
          />
        </div>
      </div>

      {/* Stacked Bar Visualization */}
      {isRAG && timing.retrievalPercent !== undefined && (
        <div className="mt-4">
          <h5 className="text-sm font-medium text-unkey-gray-400 mb-2">Time Distribution</h5>
          <div className="flex h-8 rounded-unkey-md overflow-hidden border border-unkey-gray-700 bg-unkey-gray-850">
            <div
              className="bg-gradient-to-r from-unkey-teal-500 to-unkey-teal-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
              style={{ width: `${timing.retrievalPercent}%` }}
            >
              {timing.retrievalPercent > 15 && `${timing.retrievalPercent.toFixed(0)}%`}
            </div>
            <div
              className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
              style={{ width: `${timing.generationPercent}%` }}
            >
              {timing.generationPercent > 15 && `${timing.generationPercent.toFixed(0)}%`}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-unkey-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-unkey-teal-500 rounded"></span>
              Retrieval
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              Generation
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob