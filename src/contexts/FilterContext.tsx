/**
 * Filter Context
 * 
 * Provides global state management for OpenRAG knowledge filters.
 * Handles filter selection, CRUD operations, and localStorage persistence.
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { FilterConfig, FilterContextState, FilterFormData } from '@/types/filter-management';

const FilterContext = createContext<FilterContextState | undefined>(undefined);

/**
 * FilterProvider Component
 * 
 * Wraps the application to provide filter state and operations
 * to all child components via the useFilter hook.
 */
export function FilterProvider({ children }: { children: ReactNode }) {
  const [currentFilter, setCurrentFilter] = useState<FilterConfig | null>(null);
  const [availableFilters, setAvailableFilters] = useState<FilterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all filters from OpenRAG API
   */
  const refreshFilters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[FilterContext] Fetching filters from API...');
      const response = await fetch('/api/filters/list');
      const data = await response.json();
      
      if (data.success) {
        console.log(`[FilterContext] Loaded ${data.filters.length} filters`);
        setAvailableFilters(data.filters);
        
        // If no current filter selected, try to select "Compare" or first available
        if (!currentFilter && data.filters.length > 0) {
          const compareFilter = data.filters.find((f: FilterConfig) => f.name === 'Compare');
          const filterToSelect = compareFilter || data.filters[0];
          setCurrentFilter(filterToSelect);
          localStorage.setItem('selectedFilterId', filterToSelect.id);
          console.log(`[FilterContext] Auto-selected filter: ${filterToSelect.name}`);
        }
      } else {
        setError(data.error || 'Failed to load filters');
        console.error('[FilterContext] Failed to load filters:', data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load filters';
      setError(errorMessage);
      console.error('[FilterContext] Error loading filters:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilter]);

  /**
   * Load saved filter from localStorage
   */
  const loadSavedFilter = useCallback(() => {
    const savedFilterId = localStorage.getItem('selectedFilterId');
    if (savedFilterId && availableFilters.length > 0) {
      const filter = availableFilters.find(f => f.id === savedFilterId);
      if (filter) {
        console.log(`[FilterContext] Restored saved filter: ${filter.name}`);
        setCurrentFilter(filter);
      }
    }
  }, [availableFilters]);

  /**
   * Initialize filters on mount
   */
  useEffect(() => {
    async function initializeFilters() {
      await refreshFilters();
    }
    
    initializeFilters();
  }, []); // Only run once on mount

  /**
   * Load saved filter when available filters change
   */
  useEffect(() => {
    if (availableFilters.length > 0 && !currentFilter) {
      loadSavedFilter();
    }
  }, [availableFilters, currentFilter, loadSavedFilter]);

  /**
   * Select a filter by ID
   */
  const selectFilter = useCallback(async (filterId: string) => {
    const filter = availableFilters.find(f => f.id === filterId);
    if (filter) {
      console.log(`[FilterContext] Selected filter: ${filter.name}`);
      setCurrentFilter(filter);
      localStorage.setItem('selectedFilterId', filterId);
    } else {
      console.warn(`[FilterContext] Filter not found: ${filterId}`);
    }
  }, [availableFilters]);

  /**
   * Create a new filter
   */
  const createFilter = useCallback(async (data: FilterFormData): Promise<FilterConfig> => {
    console.log('[FilterContext] Creating filter:', data.name);
    
    const response = await fetch('/api/filters/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!result.success || !result.filter) {
      throw new Error(result.error || 'Failed to create filter');
    }
    
    console.log(`[FilterContext] Filter created: ${result.filter.name}`);
    
    // Refresh filters list to include new filter
    await refreshFilters();
    
    return result.filter;
  }, [refreshFilters]);

  /**
   * Update an existing filter
   */
  const updateFilter = useCallback(async (filterId: string, data: Partial<FilterFormData>) => {
    console.log('[FilterContext] Updating filter:', filterId);
    
    const response = await fetch('/api/filters/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterId, ...data }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update filter');
    }
    
    console.log(`[FilterContext] Filter updated: ${filterId}`);
    
    // Refresh filters list to reflect changes
    await refreshFilters();
    
    // Update current filter if it was the one modified
    if (currentFilter?.id === filterId && result.filter) {
      setCurrentFilter(result.filter);
    }
  }, [currentFilter, refreshFilters]);

  /**
   * Delete a filter
   */
  const deleteFilter = useCallback(async (filterId: string) => {
    console.log('[FilterContext] Deleting filter:', filterId);
    
    const response = await fetch('/api/filters/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterId }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete filter');
    }
    
    console.log(`[FilterContext] Filter deleted: ${filterId}`);
    
    // If deleted filter was selected, select another one
    if (currentFilter?.id === filterId) {
      await refreshFilters();
      const remainingFilters = availableFilters.filter(f => f.id !== filterId);
      if (remainingFilters.length > 0) {
        const newFilter = remainingFilters[0];
        setCurrentFilter(newFilter);
        localStorage.setItem('selectedFilterId', newFilter.id);
        console.log(`[FilterContext] Switched to filter: ${newFilter.name}`);
      } else {
        setCurrentFilter(null);
        localStorage.removeItem('selectedFilterId');
        console.log('[FilterContext] No filters remaining');
      }
    } else {
      await refreshFilters();
    }
  }, [currentFilter, availableFilters, refreshFilters]);

  const value: FilterContextState = {
    currentFilter,
    availableFilters,
    isLoading,
    error,
    selectFilter,
    refreshFilters,
    createFilter,
    updateFilter,
    deleteFilter,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

/**
 * useFilter Hook
 * 
 * Access filter context from any component.
 * Must be used within a FilterProvider.
 * 
 * @throws Error if used outside FilterProvider
 * @returns FilterContextState
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentFilter, selectFilter } = useFilter();
 *   return <div>Current: {currentFilter?.name}</div>;
 * }
 * ```
 */
export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
}

// Made with Bob