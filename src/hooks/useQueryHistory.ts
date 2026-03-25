'use client';

import { useCallback } from 'react';
import { QueryHistoryItem } from '@/types/tabs';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';

const STORAGE_KEY = 'queryHistory';
const MAX_HISTORY_ITEMS = 10;

/**
 * Custom hook for managing query history in localStorage
 * 
 * Features:
 * - Save query results to localStorage
 * - Retrieve query history
 * - Limit to last 10 queries
 * - Generate unique IDs
 */
export function useQueryHistory() {
  /**
   * Generate a unique ID for a query
   */
  const generateId = useCallback((): string => {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Get all query history from localStorage
   */
  const getHistory = useCallback((): QueryHistoryItem[] => {
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
        const history = getHistory();
        
        const newItem: QueryHistoryItem = {
          id: generateId(),
          query,
          timestamp: new Date(),
          ragResult,
          directResult,
          ollamaResult: ollamaResult || undefined,
        };

        // Add to beginning of array and limit to MAX_HISTORY_ITEMS
        const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        
        return newItem.id;
      } catch (error) {
        console.error('Failed to save query to history:', error);
        return null;
      }
    },
    [getHistory, generateId]
  );

  /**
   * Get a specific query from history by ID
   */
  const getQueryById = useCallback(
    (id: string): QueryHistoryItem | null => {
      const history = getHistory();
      return history.find((item) => item.id === id) || null;
    },
    [getHistory]
  );

  /**
   * Clear all query history
   */
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear query history:', error);
    }
  }, []);

  /**
   * Remove a specific query from history
   */
  const removeQuery = useCallback(
    (id: string) => {
      try {
        const history = getHistory();
        const updatedHistory = history.filter((item) => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error('Failed to remove query from history:', error);
      }
    },
    [getHistory]
  );

  return {
    getHistory,
    saveQuery,
    getQueryById,
    clearHistory,
    removeQuery,
  };
}

// Made with Bob