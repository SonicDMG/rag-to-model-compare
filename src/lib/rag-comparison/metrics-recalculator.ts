/**
 * Metrics recalculation utility for model changes
 * 
 * This module provides functions to recalculate metrics when a model is changed,
 * without re-querying the API. It uses existing token counts and timing data,
 * and only recalculates cost and context window metrics based on the new model's pricing.
 */

import type { RAGResult, DirectResult, DetailedMetricsBreakdown } from '@/types/rag-comparison';
import {
  calculateCostBreakdown,
  calculateContextWindowBreakdown
} from './metrics-calculator';

/**
 * Recalculate RAG metrics with a new model
 * 
 * @param originalResult - Original RAG result with existing token counts
 * @param newModel - New model ID to use for pricing calculations
 * @returns Updated RAG result with recalculated metrics
 */
export function recalculateRagMetrics(
  originalResult: RAGResult,
  newModel: string
): RAGResult {
  const breakdown = originalResult.metrics.breakdown;
  
  if (!breakdown) {
    // If no breakdown exists, we can't recalculate - return original
    console.warn('No breakdown data available for recalculation');
    return originalResult;
  }

  // Extract existing token counts
  const inputTokens = breakdown.tokens.totalInput;
  const outputTokens = breakdown.tokens.output;
  
  // Recalculate cost with new model pricing
  const newCost = calculateCostBreakdown(
    newModel,
    inputTokens,
    outputTokens,
    true // Include embedding cost estimate for RAG
  );
  
  // Recalculate context window usage with new model
  const totalTokens = breakdown.tokens.total;
  const newContextWindow = calculateContextWindowBreakdown(newModel, totalTokens);
  
  // Create updated breakdown with new model
  const updatedBreakdown: DetailedMetricsBreakdown = {
    ...breakdown,
    cost: newCost,
    contextWindow: newContextWindow,
    metadata: {
      ...breakdown.metadata,
      model: newModel,
      timestamp: new Date(),
      notes: [
        // Filter out any existing recalculation notes to prevent duplicates
        ...(breakdown.metadata.notes || []).filter(
          note => !note.includes('Metrics recalculated for model change')
        ),
        'Metrics recalculated for model change (no re-query performed)'
      ]
    }
  };
  
  // Return updated result
  return {
    ...originalResult,
    metrics: {
      ...originalResult.metrics,
      cost: newCost.totalCost,
      breakdown: updatedBreakdown
    }
  };
}

/**
 * Recalculate Direct metrics with a new model
 * 
 * @param originalResult - Original Direct result with existing token counts
 * @param newModel - New model ID to use for pricing calculations
 * @returns Updated Direct result with recalculated metrics
 */
export function recalculateDirectMetrics(
  originalResult: DirectResult,
  newModel: string
): DirectResult {
  const breakdown = originalResult.metrics.breakdown;
  
  if (!breakdown) {
    // If no breakdown exists, we can't recalculate - return original
    console.warn('No breakdown data available for recalculation');
    return originalResult;
  }

  // Extract existing token counts
  const inputTokens = breakdown.tokens.totalInput;
  const outputTokens = breakdown.tokens.output;
  
  // Recalculate cost with new model pricing
  const newCost = calculateCostBreakdown(
    newModel,
    inputTokens,
    outputTokens,
    false // No embedding cost for Direct
  );
  
  // Recalculate context window usage with new model
  const totalTokens = breakdown.tokens.total;
  const newContextWindow = calculateContextWindowBreakdown(newModel, totalTokens);
  
  // Create updated breakdown with new model
  const updatedBreakdown: DetailedMetricsBreakdown = {
    ...breakdown,
    cost: newCost,
    contextWindow: newContextWindow,
    metadata: {
      ...breakdown.metadata,
      model: newModel,
      timestamp: new Date(),
      notes: [
        // Filter out any existing recalculation notes to prevent duplicates
        ...(breakdown.metadata.notes || []).filter(
          note => !note.includes('Metrics recalculated for model change')
        ),
        'Metrics recalculated for model change (no re-query performed)'
      ]
    }
  };
  
  // Return updated result
  return {
    ...originalResult,
    metrics: {
      ...originalResult.metrics,
      cost: newCost.totalCost,
      contextWindowUsage: newContextWindow.percentageUsed,
      breakdown: updatedBreakdown
    }
  };
}

/**
 * Recalculate both RAG and Direct metrics with new models
 * 
 * This is useful when both models are changed simultaneously or when
 * you want to ensure both results are updated together.
 * 
 * @param ragResult - Original RAG result
 * @param directResult - Original Direct result
 * @param newRagModel - New model for RAG (optional, uses current if not provided)
 * @param newDirectModel - New model for Direct (optional, uses current if not provided)
 * @returns Object with updated RAG and Direct results
 */
export function recalculateBothMetrics(
  ragResult: RAGResult,
  directResult: DirectResult,
  newRagModel?: string,
  newDirectModel?: string
): { rag: RAGResult; direct: DirectResult } {
  const currentRagModel = ragResult.metrics.breakdown?.metadata.model;
  const currentDirectModel = directResult.metrics.breakdown?.metadata.model;
  
  const updatedRag = newRagModel && newRagModel !== currentRagModel
    ? recalculateRagMetrics(ragResult, newRagModel)
    : ragResult;
    
  const updatedDirect = newDirectModel && newDirectModel !== currentDirectModel
    ? recalculateDirectMetrics(directResult, newDirectModel)
    : directResult;
  
  return {
    rag: updatedRag,
    direct: updatedDirect
  };
}

// Made with Bob