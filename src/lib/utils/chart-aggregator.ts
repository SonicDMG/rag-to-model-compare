/**
 * Chart aggregation utilities for processing query history data
 * Aggregates timing, token, and cost metrics across multiple queries
 */

import { QueryHistoryItem } from '@/types/tabs';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';

/**
 * Aggregated metrics for a single approach
 */
export interface ApproachMetrics {
  /** Average response time in milliseconds */
  avgTime: number;
  /** Minimum response time in milliseconds */
  minTime: number;
  /** Maximum response time in milliseconds */
  maxTime: number;
  /** Total time across all queries in milliseconds */
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
  /** Number of queries included in aggregation */
  queryCount: number;
}

/**
 * RAG-specific metrics with retrieval breakdown
 */
export interface RAGMetrics extends ApproachMetrics {
  /** Average retrieval time in milliseconds */
  avgRetrievalTime: number;
  /** Average generation time in milliseconds */
  avgGenerationTime: number;
  /** Retrieval time as percentage of total */
  retrievalPercent: number;
  /** Generation time as percentage of total */
  generationPercent: number;
}

/**
 * Aggregated data for all approaches
 */
export interface AggregatedChartData {
  /** RAG approach metrics */
  rag: RAGMetrics | null;
  /** Direct approach metrics */
  direct: ApproachMetrics | null;
  /** Hybrid approach metrics (same as direct for now) */
  hybrid: ApproachMetrics | null;
  /** Ollama approach metrics (optional) */
  ollama: ApproachMetrics | null;
  /** Total number of queries analyzed */
  totalQueries: number;
}

/**
 * Aggregate RAG metrics from query history
 */
function aggregateRAGMetrics(items: QueryHistoryItem[]): RAGMetrics | null {
  const ragResults = items
    .map(item => item.ragResult as RAGResult)
    .filter(result => result && result.metrics);

  if (ragResults.length === 0) return null;

  // Use actual measured total time from breakdown if available, otherwise fall back to retrievalTime
  // This matches the logic in metrics-calculator.ts for consistency
  const times = ragResults.map(r => r.metrics.breakdown?.timing.totalTime ?? r.metrics.retrievalTime);
  const retrievalTimes = ragResults.map(r => r.metrics.retrievalTime);
  const generationTimes = ragResults.map(r => r.metrics.generationTime);
  const tokens = ragResults.map(r => r.metrics.tokens);
  const costs = ragResults.map(r => r.metrics.cost);
  const contextUsages = ragResults
    .map(r => r.metrics.contextWindowUsage)
    .filter((usage): usage is number => usage !== undefined);

  const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
  const avgRetrievalTime = retrievalTimes.reduce((sum, t) => sum + t, 0) / retrievalTimes.length;
  const avgGenerationTime = generationTimes.reduce((sum, t) => sum + t, 0) / generationTimes.length;

  return {
    avgTime,
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
    queryCount: ragResults.length,
    avgRetrievalTime,
    avgGenerationTime,
    retrievalPercent: (avgRetrievalTime / avgTime) * 100,
    generationPercent: (avgGenerationTime / avgTime) * 100,
  };
}

/**
 * Aggregate Direct/Hybrid metrics from query history
 */
function aggregateDirectMetrics(items: QueryHistoryItem[]): ApproachMetrics | null {
  const directResults = items
    .map(item => item.directResult as DirectResult)
    .filter(result => result && result.metrics);

  if (directResults.length === 0) return null;

  const times = directResults.map(r => r.metrics.generationTime);
  const tokens = directResults.map(r => r.metrics.tokens);
  const costs = directResults.map(r => r.metrics.cost);
  const contextUsages = directResults
    .map(r => r.metrics.contextWindowUsage)
    .filter((usage): usage is number => usage !== undefined);

  return {
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
    queryCount: directResults.length,
  };
}

/**
 * Aggregate Ollama metrics from query history
 */
function aggregateOllamaMetrics(items: QueryHistoryItem[]): ApproachMetrics | null {
  const ollamaResults = items
    .map(item => item.ollamaResult as OllamaResult)
    .filter(result => result && result.metrics);

  if (ollamaResults.length === 0) return null;

  const times = ollamaResults.map(r => r.metrics.generationTime);
  const tokens = ollamaResults.map(r => r.metrics.tokens);
  const costs = ollamaResults.map(r => r.metrics.cost); // Always $0
  const contextUsages = ollamaResults
    .map(r => r.metrics.contextWindowUsage)
    .filter((usage): usage is number => usage !== undefined);

  return {
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
    queryCount: ollamaResults.length,
  };
}

/**
 * Aggregate all metrics from query history
 * 
 * @param history - Array of query history items
 * @returns Aggregated chart data for all approaches
 */
export function aggregateChartData(history: QueryHistoryItem[]): AggregatedChartData {
  if (history.length === 0) {
    return {
      rag: null,
      direct: null,
      hybrid: null,
      ollama: null,
      totalQueries: 0,
    };
  }

  return {
    rag: aggregateRAGMetrics(history),
    direct: aggregateDirectMetrics(history),
    hybrid: aggregateDirectMetrics(history), // Hybrid uses same data as direct
    ollama: aggregateOllamaMetrics(history),
    totalQueries: history.length,
  };
}

/**
 * Get the maximum value across all approaches for a given metric
 * Useful for scaling charts
 */
export function getMaxValue(
  data: AggregatedChartData,
  metric: 'avgTime' | 'avgTokens' | 'avgCost' | 'totalTime' | 'totalTokens' | 'totalCost'
): number {
  const values: number[] = [];
  
  if (data.rag) values.push(data.rag[metric]);
  if (data.direct) values.push(data.direct[metric]);
  if (data.ollama) values.push(data.ollama[metric]);
  
  return values.length > 0 ? Math.max(...values) : 0;
}

// Made with Bob