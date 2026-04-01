'use client';

import { useCallback, useState, useEffect } from 'react';
import { QueryHistoryItem } from '@/types/tabs';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';

const STORAGE_KEY = 'queryHistory';
const COUNTERS_KEY = 'queryCounters';
const MAX_HISTORY_ITEMS = 1000;

/**
 * Cumulative query counters that persist across all time
 */
export interface QueryCounters {
  totalQueries: number;
  ragQueries: number;
  directQueries: number;
  ollamaQueries: number;
}

/**
 * Custom hook for managing query history in localStorage
 *
 * Features:
 * - Save query results to localStorage
 * - Retrieve query history with reactive state
 * - Limit to last 1000 queries
 * - Generate unique IDs
 * - Automatically re-renders components when history changes
 */
export function useQueryHistory() {
  // Reactive state for query history
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load history from localStorage
   */
  const loadHistory = useCallback((): QueryHistoryItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    } catch (error) {
      console.error('Failed to load query history:', error);
      return [];
    }
  }, []);

  /**
   * Load counters from localStorage
   */
  const loadCounters = useCallback((): QueryCounters => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return {
        totalQueries: 0,
        ragQueries: 0,
        directQueries: 0,
        ollamaQueries: 0,
      };
    }

    try {
      const stored = localStorage.getItem(COUNTERS_KEY);
      if (!stored) {
        return {
          totalQueries: 0,
          ragQueries: 0,
          directQueries: 0,
          ollamaQueries: 0,
        };
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load query counters:', error);
      return {
        totalQueries: 0,
        ragQueries: 0,
        directQueries: 0,
        ollamaQueries: 0,
      };
    }
  }, []);

  /**
   * Save counters to localStorage
   */
  const saveCounters = useCallback((counters: QueryCounters) => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
    } catch (error) {
      console.error('Failed to save query counters:', error);
    }
  }, []);

  /**
   * Initialize counters from existing query history
   * This is called once on mount to migrate existing queries to the counter system
   */
  const initializeCountersFromHistory = useCallback(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return;

    try {
      // Check if counters already exist
      const existingCounters = localStorage.getItem(COUNTERS_KEY);
      if (existingCounters) {
        // Counters already initialized, don't overwrite
        return;
      }

      // Load existing query history
      const existingHistory = loadHistory();
      
      // If no history exists, initialize with zeros
      if (existingHistory.length === 0) {
        const initialCounters: QueryCounters = {
          totalQueries: 0,
          ragQueries: 0,
          directQueries: 0,
          ollamaQueries: 0,
        };
        saveCounters(initialCounters);
        return;
      }

      // Count queries from existing history
      let ragCount = 0;
      let directCount = 0;
      let ollamaCount = 0;

      existingHistory.forEach((item) => {
        if (item.ragResult !== null && item.ragResult !== undefined) {
          ragCount += 1;
        }
        if (item.directResult !== null && item.directResult !== undefined) {
          directCount += 1;
        }
        if (item.ollamaResult !== null && item.ollamaResult !== undefined) {
          ollamaCount += 1;
        }
      });

      // Initialize counters with historical data
      const initialCounters: QueryCounters = {
        totalQueries: existingHistory.length,
        ragQueries: ragCount,
        directQueries: directCount,
        ollamaQueries: ollamaCount,
      };

      saveCounters(initialCounters);
      console.log('Initialized query counters from history:', initialCounters);
    } catch (error) {
      console.error('Failed to initialize counters from history:', error);
    }
  }, [loadHistory, saveCounters]);

  /**
   * Increment counters based on query results
   */
  const incrementCounters = useCallback(
    (
      ragResult: RAGResult | null,
      directResult: DirectResult | null,
      ollamaResult?: OllamaResult | null
    ) => {
      const counters = loadCounters();
      
      counters.totalQueries += 1;
      
      if (ragResult) {
        counters.ragQueries += 1;
      }
      
      if (directResult) {
        counters.directQueries += 1;
      }
      
      if (ollamaResult) {
        counters.ollamaQueries += 1;
      }
      
      saveCounters(counters);
    },
    [loadCounters, saveCounters]
  );

  /**
   * Initialize history on mount and set up storage event listener
   */
  useEffect(() => {
    // Initialize counters from existing history (migration for backward compatibility)
    initializeCountersFromHistory();
    
    // Load initial history
    setHistory(loadHistory());
    setIsLoading(false);

    // Listen for storage events (updates from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setHistory(loadHistory());
      }
    };

    // Listen for custom event (updates from same tab)
    const handleHistoryUpdate = () => {
      setHistory(loadHistory());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('queryHistoryUpdated', handleHistoryUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('queryHistoryUpdated', handleHistoryUpdate);
    };
  }, [loadHistory, initializeCountersFromHistory]);

  /**
   * Generate a unique ID for a query
   */
  const generateId = useCallback((): string => {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Get all query history from localStorage (for backward compatibility)
   */
  const getHistory = useCallback((): QueryHistoryItem[] => {
    return history;
  }, [history]);

  /**
   * Save a new query to history
   */
  const saveQuery = useCallback(
    (
      query: string,
      ragResult: RAGResult | null,
      directResult: DirectResult | null,
      ollamaResult?: OllamaResult | null
    ) => {
      try {
        const currentHistory = loadHistory();
        
        const newItem: QueryHistoryItem = {
          id: generateId(),
          query,
          timestamp: new Date(),
          ragResult,
          directResult,
          ollamaResult: ollamaResult || undefined,
        };

        // Add to beginning of array and limit to MAX_HISTORY_ITEMS
        const updatedHistory = [newItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        
        // Increment cumulative counters
        incrementCounters(ragResult, directResult, ollamaResult);
        
        // Dispatch custom event to notify other components in the same tab
        window.dispatchEvent(new Event('queryHistoryUpdated'));
        
        return newItem.id;
      } catch (error) {
        console.error('Failed to save query to history:', error);
        return null;
      }
    },
    [loadHistory, generateId, incrementCounters]
  );

  /**
   * Get a specific query from history by ID
   */
  const getQueryById = useCallback(
    (id: string): QueryHistoryItem | null => {
      return history.find((item) => item.id === id) || null;
    },
    [history]
  );

  /**
   * Clear all query history
   */
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Note: We don't clear counters when clearing history
      // Counters are cumulative across all time
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('queryHistoryUpdated'));
    } catch (error) {
      console.error('Failed to clear query history:', error);
    }
  }, []);

  /**
   * Get cumulative query counters
   */
  const getCounters = useCallback((): QueryCounters => {
    return loadCounters();
  }, [loadCounters]);

  /**
   * Reset cumulative query counters (use with caution)
   */
  const resetCounters = useCallback(() => {
    try {
      const resetCounters: QueryCounters = {
        totalQueries: 0,
        ragQueries: 0,
        directQueries: 0,
        ollamaQueries: 0,
      };
      saveCounters(resetCounters);
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('queryHistoryUpdated'));
    } catch (error) {
      console.error('Failed to reset query counters:', error);
    }
  }, [saveCounters]);

  /**
   * Remove a specific query from history
   */
  const removeQuery = useCallback(
    (id: string) => {
      try {
        const currentHistory = loadHistory();
        const updatedHistory = currentHistory.filter((item) => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('queryHistoryUpdated'));
      } catch (error) {
        console.error('Failed to remove query from history:', error);
      }
    },
    [loadHistory]
  );

  return {
    history,
    isLoading,
    getHistory,
    saveQuery,
    getQueryById,
    clearHistory,
    removeQuery,
    getCounters,
    resetCounters,
  };
}

// Made with Bob