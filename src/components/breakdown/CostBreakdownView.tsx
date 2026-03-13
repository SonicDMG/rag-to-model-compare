import { CostBreakdown } from '@/types/rag-comparison';
import { formatCost } from '@/lib/utils/formatters';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { getPricingMetadata, getEffectivePricing, LONG_CONTEXT_THRESHOLD } from '@/lib/constants/models';

interface CostBreakdownViewProps {
  cost: CostBreakdown;
  tokens: {
    totalInput: number;
    output: number;
  };
  isRAG: boolean;
  modelId?: string;
}

export function CostBreakdownView({ cost, tokens, isRAG, modelId }: CostBreakdownViewProps) {
  // Get pricing metadata if modelId is provided (OpenAI only)
  const pricingMetadata = modelId ? getPricingMetadata(modelId) : undefined;
  
  // Get effective pricing tier based on input tokens (OpenAI only)
  const { pricing: effectivePricing, isLongContext } = modelId
    ? getEffectivePricing(modelId, tokens.totalInput)
    : { pricing: undefined, isLongContext: false };
  
  // Calculate rates per 1M tokens for display (multiply by 1000 from per 1K base)
  const inputRatePer1M = tokens.totalInput > 0
    ? (cost.inputCost / tokens.totalInput) * 1000000
    : 0;
  const outputRatePer1M = tokens.output > 0
    ? (cost.outputCost / tokens.output) * 1000000
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
                Rate/1M
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
                {formatCost(inputRatePer1M)}
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
                {formatCost(outputRatePer1M)}
              </td>
              <td className="py-3 px-4 text-right text-unkey-gray-300">
                {outputPercentage.toFixed(1)}%
              </td>
            </tr>
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

      {/* Calculation Details */}
      <div className="bg-unkey-gray-850 rounded-unkey-lg p-4 border border-unkey-gray-700 shadow-unkey-card">
        <h4 className="text-sm font-semibold text-unkey-gray-200 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Calculation Details
        </h4>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-center justify-between py-2 px-3 bg-unkey-gray-900 rounded border border-unkey-gray-700">
            <span className="text-unkey-gray-400">Input:</span>
            <span className="text-unkey-teal-300">
              {tokens.totalInput.toLocaleString()} tokens × ${inputRatePer1M.toFixed(2)}/1M = {formatCost(cost.inputCost)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-unkey-gray-900 rounded border border-unkey-gray-700">
            <span className="text-unkey-gray-400">Output:</span>
            <span className="text-green-300">
              {tokens.output.toLocaleString()} tokens × ${outputRatePer1M.toFixed(2)}/1M = {formatCost(cost.outputCost)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-unkey-gray-900 rounded border border-unkey-teal-500/30 border-2">
            <span className="text-unkey-gray-200 font-semibold">Total:</span>
            <span className="text-white font-bold">
              {formatCost(cost.totalCost)}
            </span>
          </div>
        </div>
        <p className="text-xs text-unkey-gray-500 mt-3 italic">
          All pricing is calculated per 1 million (1M) tokens
        </p>
      </div>

      {/* Additional Info */}
      <div className="bg-unkey-teal-500/10 rounded-unkey-md p-3 border border-unkey-teal-500/30">
        <p className="text-xs text-unkey-teal-300">
          <strong>Note:</strong> Output tokens typically cost more per token than input tokens.
          The exact rates depend on the model being used.
        </p>
      </div>

      {/* Pricing Source Info */}
      {pricingMetadata && (
        <div className="bg-unkey-gray-850 rounded-unkey-md p-3 border border-unkey-gray-700">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-unkey-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-unkey-gray-400 space-y-1">
              <p>
                <strong className="text-unkey-gray-300">Pricing Source:</strong>{' '}
                <a
                  href={pricingMetadata.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-unkey-teal-400 hover:text-unkey-teal-300 underline"
                >
                  {pricingMetadata.provider.charAt(0).toUpperCase() + pricingMetadata.provider.slice(1)} Official Pricing
                </a>
              </p>
              <p>
                <strong className="text-unkey-gray-300">Last Updated:</strong>{' '}
                {new Date(pricingMetadata.lastUpdated).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              {effectivePricing && (
                <p>
                  <strong className="text-unkey-gray-300">Pricing Tier:</strong>{' '}
                  <span className={isLongContext ? 'text-orange-400' : 'text-unkey-teal-400'}>
                    {isLongContext ? 'Long Context' : 'Short Context'}
                  </span>
                  {' '}
                  ({tokens.totalInput.toLocaleString()} input tokens
                  {isLongContext ? ` ≥ ${LONG_CONTEXT_THRESHOLD.toLocaleString()}` : ` < ${LONG_CONTEXT_THRESHOLD.toLocaleString()}`})
                </p>
              )}
              {effectivePricing && (
                <p className="text-unkey-gray-500">
                  Rates: ${effectivePricing.input.toFixed(2)}/1M input, ${effectivePricing.output.toFixed(2)}/1M output
                  {effectivePricing.cachedInput && `, $${effectivePricing.cachedInput.toFixed(2)}/1M cached`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob