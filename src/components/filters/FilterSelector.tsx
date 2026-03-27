/**
 * FilterSelector Component
 * 
 * Tag/badge-based selector for choosing the active knowledge filter.
 * Uses OpenRAG's color scheme for visual consistency.
 */

'use client';

import { useFilter } from '@/contexts/FilterContext';

interface FilterSelectorProps {
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Callback to open filter management modal */
  onManageFilters: () => void;
}

export function FilterSelector({ disabled = false, onManageFilters }: FilterSelectorProps) {
  const { currentFilter, availableFilters, isLoading, error, selectFilter } = useFilter();

  const handleFilterClick = (filterId: string) => {
    if (!disabled && !isLoading) {
      selectFilter(filterId);
    }
  };

  /**
   * Get Tailwind color classes based on filter color (matching OpenRAG scheme)
   */
  const getColorClasses = (color?: string, isSelected?: boolean) => {
    const colorMap: Record<string, { selected: string; unselected: string }> = {
      red: {
        selected: 'bg-red-600 text-white border-red-700 hover:bg-red-700',
        unselected: 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200 hover:border-red-400'
      },
      emerald: {
        selected: 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700',
        unselected: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400'
      },
      blue: {
        selected: 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700',
        unselected: 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200 hover:border-blue-400'
      },
      purple: {
        selected: 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700',
        unselected: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 hover:border-purple-400'
      },
      amber: {
        selected: 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700',
        unselected: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 hover:border-amber-400'
      },
      green: {
        selected: 'bg-green-600 text-white border-green-700 hover:bg-green-700',
        unselected: 'bg-green-100 text-green-900 border-green-300 hover:bg-green-200 hover:border-green-400'
      },
      indigo: {
        selected: 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700',
        unselected: 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200 hover:border-indigo-400'
      },
      pink: {
        selected: 'bg-pink-600 text-white border-pink-700 hover:bg-pink-700',
        unselected: 'bg-pink-100 text-pink-900 border-pink-300 hover:bg-pink-200 hover:border-pink-400'
      },
      orange: {
        selected: 'bg-orange-600 text-white border-orange-700 hover:bg-orange-700',
        unselected: 'bg-orange-100 text-orange-900 border-orange-300 hover:bg-orange-200 hover:border-orange-400'
      },
      teal: {
        selected: 'bg-unkey-teal text-white border-unkey-teal/70 hover:bg-unkey-teal/90',
        unselected: 'bg-unkey-teal/10 text-unkey-teal border-unkey-teal/30 hover:bg-unkey-teal/20 hover:border-unkey-teal/40'
      },
    };

    // Default to teal (Unkey theme) if color not found
    const colorScheme = colorMap[color || 'teal'] || colorMap.teal;
    return isSelected ? colorScheme.selected : colorScheme.unselected;
  };

  return (
    <div className="space-y-3">
      {/* Label and Manage Button */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-unkey-gray-300">
          Knowledge Filters
        </label>
        <button
          onClick={onManageFilters}
          disabled={disabled || isLoading}
          className="text-xs text-unkey-teal hover:text-unkey-teal/80 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          Manage
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 p-6 bg-unkey-gray-800/50 border border-unkey-gray-700 rounded-lg">
          <svg
            className="animate-spin h-5 w-5 text-unkey-teal"
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
          <span className="text-sm text-unkey-gray-300">Loading filters...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-200">Error loading filters</p>
              <p className="text-xs text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && availableFilters.length === 0 && (
        <div className="p-6 bg-unkey-gray-800/50 border border-unkey-gray-700 rounded-lg text-center">
          <svg
            className="w-12 h-12 text-unkey-gray-400 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <p className="text-sm text-unkey-gray-300">No filters available</p>
          <p className="text-xs text-unkey-gray-400 mt-1">
            Click "Manage" to create your first filter
          </p>
        </div>
      )}

      {/* Filter Tags */}
      {!isLoading && !error && availableFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 bg-unkey-gray-800/50 border border-unkey-gray-700 rounded-lg min-h-[80px]">
          {availableFilters.map((filter) => {
            const isSelected = currentFilter?.id === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => handleFilterClick(filter.id)}
                disabled={disabled || isLoading}
                title={filter.description}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium
                  border-2 transition-all duration-200
                  cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                  ${getColorClasses(filter.queryData?.color, isSelected)}
                  ${isSelected ? 'shadow-md' : ''}
                  focus:outline-none focus:ring-2 focus:ring-unkey-teal focus:ring-offset-2 focus:ring-offset-unkey-gray-900
                `}
              >
                <span className="flex items-center gap-1.5">
                  {/* Checkmark icon for selected filter */}
                  {isSelected && (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {filter.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Helper Text */}
      {!isLoading && !error && availableFilters.length > 0 && (
        <p className="text-xs text-unkey-gray-400">
          Click a filter to select it. Hover for descriptions.
        </p>
      )}
    </div>
  );
}

// Made with Bob