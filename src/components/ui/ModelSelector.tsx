'use client';

import { useState } from 'react';
import { SUPPORTED_MODELS, getModelConfig } from '@/lib/constants/models';

export interface ModelSelectorProps {
  /** Currently selected model ID */
  currentModel: string;
  /** Array of available model IDs to display */
  availableModels: string[];
  /** Callback when model selection changes */
  onModelChange: (newModel: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether a model change is in progress */
  isLoading?: boolean;
}

/**
 * ModelSelector Component
 * 
 * A dropdown selector for choosing between different LLM models.
 * Displays model information including name, context window, and pricing.
 */
export function ModelSelector({
  currentModel,
  availableModels,
  onModelChange,
  disabled = false,
  isLoading = false,
}: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value;
    setSelectedModel(newModel);
    onModelChange(newModel);
  };

  // Get current model configuration for display
  const currentModelConfig = getModelConfig(currentModel);

  // Filter available models to only show those that exist in SUPPORTED_MODELS
  const validModels = availableModels.filter(modelId => 
    SUPPORTED_MODELS[modelId] !== undefined
  );

  return (
    <div className="flex items-center gap-3">
      {/* Model Icon */}
      <div className="flex-shrink-0">
        <svg
          className="w-5 h-5 text-unkey-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* Model Label */}
      <label htmlFor="model-selector" className="text-sm font-medium text-unkey-gray-200">
        Model:
      </label>

      {/* Model Dropdown */}
      <div className="relative flex-1 min-w-[200px]">
        <select
          id="model-selector"
          value={selectedModel}
          onChange={handleModelChange}
          disabled={disabled || isLoading}
          className="w-full px-3 py-2 bg-unkey-gray-850 border border-unkey-gray-700 text-white rounded-md 
                     focus:ring-2 focus:ring-unkey-teal-500/20 focus:border-unkey-teal-500 
                     disabled:bg-unkey-gray-800 disabled:text-unkey-gray-500 disabled:cursor-not-allowed
                     transition-all duration-200 appearance-none cursor-pointer"
        >
          {validModels.map((modelId) => {
            const config = SUPPORTED_MODELS[modelId];
            if (!config) return null;

            return (
              <option key={modelId} value={modelId} className="bg-unkey-gray-850">
                {config.name} ({(config.contextWindow / 1000).toFixed(0)}K context, 
                ${config.pricing.input.toFixed(2)}/${config.pricing.output.toFixed(2)} per 1M tokens)
              </option>
            );
          })}
        </select>

        {/* Dropdown Arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <svg
              className="animate-spin h-4 w-4 text-unkey-teal-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-unkey-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Current Model Info Badge */}
      {currentModelConfig && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-unkey-gray-800/50 border border-unkey-gray-700 rounded-md">
          <span className="text-xs text-unkey-gray-400">
            {(currentModelConfig.contextWindow / 1000).toFixed(0)}K tokens
          </span>
        </div>
      )}
    </div>
  );
}

// Made with Bob
