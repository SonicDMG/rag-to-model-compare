/**
 * Model-based aggregation utilities for grouping query results by inference model
 * Enables model comparison charts by aggregating metrics across all pipelines
 */

import { QueryHistoryItem } from '@/types/tabs';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';

/**
 * Aggregated metrics for a single model across all pipelines
 */
export interface ModelMetrics {
  /** Number of queries that used this model */
  queryCount: number;
  /** Average generation time in milliseconds */
  avgTime: number;
  /** Minimum generation time in milliseconds */
  minTime: number;
  /** Maximum generation time in milliseconds */
  maxTime: number;
  /** Total generation time across all queries in milliseconds */
  totalTime: number;
  /** Average tokens used */
  avgTokens: number;
  /** Total tokens used across all queries */
  totalTokens: number;
  /** Average cost in USD */
  avgCost: number;
  /** Total cost across all queries in USD */
  totalCost: number;
  /** Average context window usage percentage */
  avgContextUsage: number;
}

/**
 * Map of model names to their aggregated metrics
 */
export type ModelAggregationResult = Record<string, ModelMetrics>;

/**
 * Individual model usage from a single query result
 */
interface ModelUsage {
  model: string;
  time: number;
  tokens: number;
  cost: number;
  contextUsage: number;
}

/**
 * Extract model usage from RAG result
 */
function extractRAGModelUsage(result: RAGResult): ModelUsage | null {
  if (!result || !result.model || !result.metrics) {
    return null;
  }

  return {
    model: result.model,
    time: result.metrics.retrievalTime + result.metrics.generationTime,
    tokens: result.metrics.tokens,
    cost: result.metrics.cost,
    contextUsage: result.metrics.contextWindowUsage ?? 0,
  };
}

/**
 * Extract model usage from Direct result
 */
function extractDirectModelUsage(result: DirectResult): ModelUsage | null {
  if (!result || !result.model || !result.metrics) {
    return null;
  }

  return {
    model: result.model,
    time: result.metrics.generationTime,
    tokens: result.metrics.tokens,
    cost: result.metrics.cost,
    contextUsage: result.metrics.contextWindowUsage ?? 0,
  };
}

/**
 * Extract model usage from Ollama result
 */
function extractOllamaModelUsage(result: OllamaResult): ModelUsage | null {
  if (!result || !result.model || !result.metrics) {
    return null;
  }

  return {
    model: result.model,
    time: result.metrics.generationTime,
    tokens: result.metrics.tokens,
    cost: result.metrics.cost, // Always $0 for Ollama
    contextUsage: result.metrics.contextWindowUsage ?? 0,
  };
}

/**
 * Aggregate query results by inference model
 * 
 * Groups all query results by the model used, calculating aggregate metrics
 * for each model across all pipelines (RAG, Direct, Hybrid, Ollama).
 * 
 * If the same model is used in multiple pipelines for a single query,
 * each usage is counted separately in the aggregation.
 * 
 * @param history - Array of query history items to aggregate
 * @returns Object mapping model names to their aggregated metrics
 * 
 * @example
 * ```typescript
 * const history = getQueryHistory();
 * const modelMetrics = aggregateByModel(history);
 * 
 * // Access metrics for a specific model
 * const gpt4Metrics = modelMetrics['gpt-4o'];
 * console.log(`GPT-4o average time: ${gpt4Metrics.avgTime}ms`);
 * console.log(`GPT-4o total cost: $${gpt4Metrics.totalCost}`);
 * ```
 */
export function aggregateByModel(history: QueryHistoryItem[]): ModelAggregationResult {
  if (history.length === 0) {
    return {};
  }

  // Collect all model usages from all queries and pipelines
  const modelUsages: Record<string, ModelUsage[]> = {};

  for (const item of history) {
    // Extract RAG model usage
    const ragUsage = extractRAGModelUsage(item.ragResult as RAGResult);
    if (ragUsage) {
      if (!modelUsages[ragUsage.model]) {
        modelUsages[ragUsage.model] = [];
      }
      modelUsages[ragUsage.model].push(ragUsage);
    }

    // Extract Direct model usage
    const directUsage = extractDirectModelUsage(item.directResult as DirectResult);
    if (directUsage) {
      if (!modelUsages[directUsage.model]) {
        modelUsages[directUsage.model] = [];
      }
      modelUsages[directUsage.model].push(directUsage);
    }

    // Extract Ollama model usage (if present)
    if (item.ollamaResult) {
      const ollamaUsage = extractOllamaModelUsage(item.ollamaResult as OllamaResult);
      if (ollamaUsage) {
        if (!modelUsages[ollamaUsage.model]) {
          modelUsages[ollamaUsage.model] = [];
        }
        modelUsages[ollamaUsage.model].push(ollamaUsage);
      }
    }
  }

  // Aggregate metrics for each model
  const result: ModelAggregationResult = {};

  for (const [modelName, usages] of Object.entries(modelUsages)) {
    const times = usages.map(u => u.time);
    const tokens = usages.map(u => u.tokens);
    const costs = usages.map(u => u.cost);
    const contextUsages = usages.map(u => u.contextUsage).filter(u => u > 0);

    result[modelName] = {
      queryCount: usages.length,
      avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      totalTime: times.reduce((sum, t) => sum + t, 0),
      avgTokens: tokens.reduce((sum, t) => sum + t, 0) / tokens.length,
      totalTokens: tokens.reduce((sum, t) => sum + t, 0),
      avgCost: costs.reduce((sum, c) => sum + c, 0) / costs.length,
      totalCost: costs.reduce((sum, c) => sum + c, 0),
      avgContextUsage: contextUsages.length > 0
        ? contextUsages.reduce((sum, u) => sum + u, 0) / contextUsages.length
        : 0,
    };
  }

  return result;
}

/**
 * Get sorted list of model names by a specific metric
 * 
 * @param aggregation - Model aggregation result
 * @param metric - Metric to sort by
 * @param order - Sort order ('asc' or 'desc')
 * @returns Array of model names sorted by the specified metric
 */
export function getSortedModelNames(
  aggregation: ModelAggregationResult,
  metric: keyof ModelMetrics = 'queryCount',
  order: 'asc' | 'desc' = 'desc'
): string[] {
  const entries = Object.entries(aggregation);
  
  entries.sort((a, b) => {
    const aValue = a[1][metric];
    const bValue = b[1][metric];
    return order === 'desc' ? bValue - aValue : aValue - bValue;
  });

  return entries.map(([modelName]) => modelName);
}

/**
 * Get the maximum value for a specific metric across all models
 * Useful for scaling charts
 * 
 * @param aggregation - Model aggregation result
 * @param metric - Metric to find maximum for
 * @returns Maximum value for the specified metric
 */
export function getMaxMetricValue(
  aggregation: ModelAggregationResult,
  metric: keyof ModelMetrics
): number {
  const values = Object.values(aggregation).map(m => m[metric]);
  return values.length > 0 ? Math.max(...values) : 0;
}

/**
 * Get the minimum value for a specific metric across all models
 * 
 * @param aggregation - Model aggregation result
 * @param metric - Metric to find minimum for
 * @returns Minimum value for the specified metric
 */
export function getMinMetricValue(
  aggregation: ModelAggregationResult,
  metric: keyof ModelMetrics
): number {
  const values = Object.values(aggregation).map(m => m[metric]);
  return values.length > 0 ? Math.min(...values) : 0;
}

/**
 * Filter models by minimum query count
 * Useful for excluding models with insufficient data
 * 
 * @param aggregation - Model aggregation result
 * @param minQueries - Minimum number of queries required
 * @returns Filtered aggregation result
 */
export function filterByMinQueries(
  aggregation: ModelAggregationResult,
  minQueries: number
): ModelAggregationResult {
  const result: ModelAggregationResult = {};
  
  for (const [modelName, metrics] of Object.entries(aggregation)) {
    if (metrics.queryCount >= minQueries) {
      result[modelName] = metrics;
    }
  }
  
  return result;
}

// Made with Bob