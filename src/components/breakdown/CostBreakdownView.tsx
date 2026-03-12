import { CostBreakdown } from '@/types/rag-comparison';
import { formatCost } from '@/lib/utils/formatters';
import { InfoTooltip } from '@/components/ui/Tooltip';

interface CostBreakdownViewProps {
  cost: CostBreakdown;
  tokens: {
    totalInput: number;
    output: number;
  };
  isRAG: boolean;
}

export function CostBreakdownView({ cost, tokens, isRAG }: CostBreakdownViewProps) {
  // Calculate rates per 1K tokens
  const inputRatePer1K = tokens.totalInput > 0
    ? (cost.inputCost / tokens.totalInput) * 1000
    : 0;
  const outputRatePer1K = tokens.output > 0
    ? (cost.outputCost / tokens.output) * 1000
    : 0;

  const inputPercentage = cost.totalCost > 0
    ? (cost.inputCost / cost.totalCost) * 100
    : 0;
  const outputPercentage = cost.totalCost > 0
    ? (cost.outputCost / cost.totalCost) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Total Cost */}
      <div className="bg-unkey-gray-850 rounded-unkey-lg p-4 border border-unkey-gray-700 shadow-unkey-card">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-unkey-gray-200">Total Cost</h4>
          <span className="text-2xl font-bold text-white">
            {formatCost(cost.totalCost)}
          </span>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="bg-unkey-gray-900 rounded-unkey-lg border border-unkey-gray-700 overflow-hidden shadow-unkey-card">
        <table className="w-full text-sm">
          <thead className="bg-unkey-gray-850 border-b border-unkey-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-unkey-gray-200">
                Component
              </th>
              <th className="text-right py-3 px-4 font-semibold text-unkey-gray-200">
                Cost
              </th>
              <th className="text-right py-3 px-4 font-semibold text-unkey-gray-200">
                Rate/1K
              </th>
              <th className="text-right py-3 px-4 font-semibold text-unkey-gray-200">
                %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-unkey-gray-700">
            {/* Input Cost */}
            <tr className="hover:bg-unkey-gray-850 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-unkey-teal-500 rounded"></span>
                  <span className="font-medium text-white">Input Tokens</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-white">
                {formatCost(cost.inputCost)}
              </td>
              <td className="py-3 px-4 text-right text-unkey-gray-300">
                {formatCost(inputRatePer1K)}
              </td>
              <td className="py-3 px-4 text-right text-unkey-gray-300">
                {inputPercentage.toFixed(1)}%
              </td>
            </tr>

            {/* Output Cost */}
            <tr className="hover:bg-unkey-gray-850 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  <span className="font-medium text-white">Output Tokens</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-white">
                {formatCost(cost.outputCost)}
              </td>
              <td className="py-3 px-4 text-right text-unkey-gray-300">
                {formatCost(outputRatePer1K)}
              </td>
              <td className="py-3 px-4 text-right text-unkey-gray-300">
                {outputPercentage.toFixed(1)}%
              </td>
            </tr>

            {/* Embedding Cost (RAG only) */}
            {isRAG && (
              <tr className="hover:bg-unkey-gray-850 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded"></span>
                    <span className="font-medium text-white">Embeddings</span>
                    <InfoTooltip content="Embedding costs are managed by OpenRAG and not exposed in API responses. Typical embedding costs are ~$0.0001 per 1K tokens." />
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-unkey-gray-400 italic">
                  Not Available
                </td>
                <td className="py-3 px-4 text-right text-unkey-gray-500">
                  —
                </td>
                <td className="py-3 px-4 text-right text-unkey-gray-500">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cost Distribution Bar */}
      <div className="mt-4">
        <h5 className="text-sm font-medium text-unkey-gray-400 mb-2">Cost Distribution</h5>
        <div className="flex h-8 rounded-unkey-md overflow-hidden border border-unkey-gray-700 bg-unkey-gray-850">
          <div
            className="bg-gradient-to-r from-unkey-teal-500 to-unkey-teal-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${inputPercentage}%` }}
            title={`Input: ${inputPercentage.toFixed(1)}%`}
          >
            {inputPercentage > 15 && `${inputPercentage.toFixed(0)}%`}
          </div>
          <div
            className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{ width: `${outputPercentage}%` }}
            title={`Output: ${outputPercentage.toFixed(1)}%`}
          >
            {outputPercentage > 15 && `${outputPercentage.toFixed(0)}%`}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-unkey-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-unkey-teal-500 rounded"></span>
            Input
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            Output
          </span>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-unkey-teal-500/10 rounded-unkey-md p-3 border border-unkey-teal-500/30">
        <p className="text-xs text-unkey-teal-300">
          <strong>Note:</strong> Output tokens typically cost more per token than input tokens.
          The exact rates depend on the model being used.
        </p>
      </div>
    </div>
  );
}

// Made with Bob