/**
 * GlobalConfigBar Component
 * 
 * Global configuration bar that displays model and filter selectors.
 * Positioned between the page header and tab navigation for easy access.
 */

'use client';

import { useState } from 'react';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { OllamaModelSelector } from '@/components/ui/OllamaModelSelector';
import { FilterSelector } from '@/components/filters/FilterSelector';
import { FilterManagementModal } from '@/components/filters/FilterManagementModal';
import { getAvailableModels } from '@/lib/constants/models';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
}

interface GlobalConfigBarProps {
  // Ollama model props (for inference)
  ollamaModel: string;
  onOllamaModelChange: (model: string) => void;
  isOllamaAvailable: boolean;
  availableOllamaModels: OllamaModelInfo[];
  
  // Pricing model props (for cost calculations)
  pricingModel: string;
  onPricingModelChange: (model: string) => void;
}

export function GlobalConfigBar({
  ollamaModel,
  onOllamaModelChange,
  isOllamaAvailable,
  availableOllamaModels,
  pricingModel,
  onPricingModelChange,
}: GlobalConfigBarProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleManageFilters = () => {
    setIsFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
  };
  
  // Get available OpenAI models for pricing
  const availablePricingModels = getAvailableModels();

  return (
    <>
      {/* Configuration Bar */}
      <div className="relative border-b border-unkey-gray-800 bg-unkey-gray-900/50 backdrop-blur-sm">
        <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            {/* Section Title */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-unkey-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-white">Global Configuration</h2>
              </div>
  
              {/* Configuration Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inference Model Selector (Ollama) */}
                <div className="bg-unkey-gray-800/50 border border-unkey-gray-700 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-unkey-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <label className="block text-sm font-medium text-unkey-gray-300">
                        Inference Model
                      </label>
                    </div>
                    {isOllamaAvailable ? (
                      <OllamaModelSelector
                        currentModel={ollamaModel}
                        availableModels={availableOllamaModels.map(m => m.name)}
                        onModelChange={onOllamaModelChange}
                      />
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-unkey-gray-400 py-2">
                        <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Ollama unavailable</span>
                      </div>
                    )}
                    <p className="text-xs text-unkey-gray-500">
                      Local model used for actual inference
                    </p>
                  </div>
                </div>
  
                {/* Pricing Model Selector (OpenAI) */}
                <div className="bg-unkey-gray-800/50 border border-unkey-gray-700 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-unkey-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <label className="block text-sm font-medium text-unkey-gray-300">
                        Pricing Model
                      </label>
                    </div>
                    <ModelSelector
                      currentModel={pricingModel}
                      availableModels={availablePricingModels}
                      onModelChange={onPricingModelChange}
                    />
                    <p className="text-xs text-unkey-gray-500">
                      OpenAI model for cost calculations
                    </p>
                  </div>
                </div>
  
                {/* Knowledge Filter Selector */}
                <div className="bg-unkey-gray-800/50 border border-unkey-gray-700 rounded-lg p-4">
                  <FilterSelector
                    onManageFilters={handleManageFilters}
                  />
                </div>
              </div>

            {/* Info Text */}
            <div className="flex items-start gap-2 text-xs text-unkey-gray-500">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p>
                These settings apply globally across all tabs. The <strong>inference model</strong> is used for actual local inference,
                the <strong>pricing model</strong> determines cost calculations, and the <strong>knowledge filter</strong> determines
                which documents are retrieved during RAG queries.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Management Modal */}
      <FilterManagementModal
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
      />
    </>
  );
}

// Made with Bob