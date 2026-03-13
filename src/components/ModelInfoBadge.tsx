'use client';

import { getModelConfig, getPricingMetadata } from '@/lib/constants/models';
import { Badge } from './ui/Badge';

interface ModelInfoBadgeProps {
  /** Model identifier (e.g., 'gpt-4o') */
  modelId: string;
  /** Optional variant for styling */
  variant?: 'success' | 'info' | 'primary';
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Displays provider and model information with detailed pricing and link to official pricing
 *
 * @example
 * ```tsx
 * <ModelInfoBadge modelId="gpt-4o" variant="success" />
 * ```
 */
export function ModelInfoBadge({ modelId, variant = 'primary', className = '' }: ModelInfoBadgeProps) {
  const modelConfig = getModelConfig(modelId);
  const pricingMetadata = getPricingMetadata(modelId);

  if (!modelConfig) {
    return null;
  }

  const providerName = modelConfig.provider.charAt(0).toUpperCase() + modelConfig.provider.slice(1);
  const pricing = modelConfig.pricing;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Provider and Model Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant} size="sm">
          Provider: {providerName}
        </Badge>
        <Badge variant={variant} size="sm">
          Model: {modelConfig.name}
        </Badge>
      </div>

      {/* Pricing Information */}
      <div className="bg-unkey-gray-850 rounded-unkey-md p-3 border border-unkey-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h5 className="text-xs font-semibold text-unkey-gray-400 uppercase tracking-wide">Pricing (per 1M tokens)</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-unkey-gray-500 text-xs">Input:</span>
                <span className="ml-2 font-mono font-semibold text-white">${pricing.input.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-unkey-gray-500 text-xs">Output:</span>
                <span className="ml-2 font-mono font-semibold text-white">${pricing.output.toFixed(2)}</span>
              </div>
              {pricing.cachedInput !== undefined && (
                <div className="col-span-2">
                  <span className="text-unkey-gray-500 text-xs">Cached Input:</span>
                  <span className="ml-2 font-mono font-semibold text-unkey-teal-400">${pricing.cachedInput.toFixed(2)}</span>
                  <span className="ml-1 text-xs text-unkey-gray-500">(if supported)</span>
                </div>
              )}
            </div>
            {pricing.longContext && (
              <div className="pt-2 border-t border-unkey-gray-700">
                <p className="text-xs text-unkey-gray-500 mb-1">Long Context (≥272K tokens):</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-unkey-gray-500 text-xs">Input:</span>
                    <span className="ml-2 font-mono font-semibold text-yellow-400">${pricing.longContext.input.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-unkey-gray-500 text-xs">Output:</span>
                    <span className="ml-2 font-mono font-semibold text-yellow-400">${pricing.longContext.output.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Link */}
          {pricingMetadata && (
            <a
              href={pricingMetadata.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-unkey-teal-400 hover:text-unkey-teal-300 transition-colors underline decoration-dotted underline-offset-2"
              title={`View official pricing from ${providerName} (last updated: ${new Date(pricingMetadata.lastUpdated).toLocaleDateString()})`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Verify
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob