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
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Total Time</h4>
          <span className="text-2xl font-bold text-gray-900">
            {formatTime(timing.totalTime)}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {/* Retrieval Time (RAG only) */}
        {isRAG && timing.retrievalTime !== undefined && timing.retrievalPercent !== undefined && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-medium text-gray-700">Retrieval Time</h5>
              </div>
              <span className="text-lg font-bold text-blue-700">
                {formatTime(timing.retrievalTime)}
              </span>
            </div>
            <ProgressBar
              percentage={timing.retrievalPercent}
              variant="blue"
              height="sm"
            />
          </div>
        )}

        {/* Generation Time */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-medium text-gray-700">Generation Time</h5>
              {isRAG && isEstimated && (
                <div className="flex items-center gap-1">
                  <EstimatedBadge />
                  <InfoTooltip content="This value is estimated as the difference between total time and retrieval time. OpenRAG SDK doesn't provide separate generation timing." />
                </div>
              )}
            </div>
            <span className="text-lg font-bold text-green-700">
              {formatTime(timing.generationTime)}
            </span>
          </div>
          <ProgressBar
            percentage={timing.generationPercent}
            variant="green"
            height="sm"
          />
        </div>
      </div>

      {/* Stacked Bar Visualization */}
      {isRAG && timing.retrievalPercent !== undefined && (
        <div className="mt-4">
          <h5 className="text-xs font-medium text-gray-600 mb-2">Time Distribution</h5>
          <div className="flex h-8 rounded-lg overflow-hidden border border-gray-300">
            <div
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
              style={{ width: `${timing.retrievalPercent}%` }}
            >
              {timing.retrievalPercent > 15 && `${timing.retrievalPercent.toFixed(0)}%`}
            </div>
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
              style={{ width: `${timing.generationPercent}%` }}
            >
              {timing.generationPercent > 15 && `${timing.generationPercent.toFixed(0)}%`}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded"></span>
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