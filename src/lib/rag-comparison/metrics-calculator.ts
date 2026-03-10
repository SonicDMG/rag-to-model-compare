/**
 * Metrics calculator for comparing RAG and Direct query approaches
 * 
 * This module provides comprehensive comparison functionality between RAG-based
 * and direct model query approaches, analyzing performance across multiple dimensions
 * including speed, token usage, cost, context window efficiency, and quality.
 */

import type {
  RAGResult,
  DirectResult,
  ComparisonResult,
  ComparisonMetrics,
} from '@/types/rag-comparison';
import { formatCost, formatTime, formatTokens, formatPercentage } from '@/lib/utils/formatters';

/**
 * Tie thresholds for determining winners
 * Differences below these thresholds are considered ties
 */
const TIE_THRESHOLDS = {
  /** Speed difference threshold in milliseconds */
  SPEED_MS: 100,
  /** Token difference threshold */
  TOKENS: 100,
  /** Cost difference threshold in USD */
  COST_USD: 0.0001,
} as const;

/**
 * Winner type for comparisons
 */
type Winner = 'rag' | 'direct' | 'tie';

/**
 * Speed comparison result
 */
interface SpeedComparison {
  winner: Winner;
  ragTotal: number;
  directTotal: number;
  differenceMs: number;
  differencePercent: number;
}

/**
 * Token comparison result
 */
interface TokenComparison {
  winner: Winner;
  rag: number;
  direct: number;
  difference: number;
  differencePercent: number;
}

/**
 * Cost comparison result
 */
interface CostComparison {
  winner: Winner;
  rag: number;
  direct: number;
  difference: number;
  differencePercent: number;
}

/**
 * Context window comparison result
 */
interface ContextComparison {
  ragUsage: number;
  directUsage: number;
  difference: number;
  insight: string;
}

/**
 * Quality comparison result
 */
interface QualityComparison {
  ragScore: number;
  directScore: number;
  difference: number;
  insights: string[];
}

/**
 * Determines the winner between two values based on a threshold
 * 
 * @param value1 - First value to compare
 * @param value2 - Second value to compare
 * @param threshold - Threshold for considering values as tied
 * @param lowerIsBetter - If true, lower value wins; if false, higher value wins
 * @returns Winner designation ('rag', 'direct', or 'tie')
 * 
 * @example
 * ```typescript
 * // For speed (lower is better)
 * determineWinner(1000, 1500, 100, true) // Returns 'rag'
 * determineWinner(1000, 1050, 100, true) // Returns 'tie'
 * 
 * // For quality (higher is better)
 * determineWinner(0.8, 0.6, 0.05, false) // Returns 'rag'
 * ```
 */
function determineWinner(
  value1: number,
  value2: number,
  threshold: number,
  lowerIsBetter: boolean = true
): Winner {
  const difference = Math.abs(value1 - value2);
  
  // If difference is within threshold, it's a tie
  if (difference <= threshold) {
    return 'tie';
  }
  
  // Determine winner based on whether lower or higher is better
  if (lowerIsBetter) {
    return value1 < value2 ? 'rag' : 'direct';
  } else {
    return value1 > value2 ? 'rag' : 'direct';
  }
}

/**
 * Calculates the percentage difference between two values
 * 
 * Positive percentage means value1 is larger than value2
 * Negative percentage means value1 is smaller than value2
 * 
 * @param value1 - First value (baseline)
 * @param value2 - Second value (comparison)
 * @returns Percentage difference
 * 
 * @example
 * ```typescript
 * calculatePercentageDifference(100, 150) // Returns -33.33 (value1 is 33% less)
 * calculatePercentageDifference(150, 100) // Returns 50.00 (value1 is 50% more)
 * calculatePercentageDifference(100, 100) // Returns 0.00
 * ```
 */
function calculatePercentageDifference(value1: number, value2: number): number {
  if (value2 === 0) {
    return value1 === 0 ? 0 : 100;
  }
  
  return ((value1 - value2) / value2) * 100;
}

/**
 * Compares speed between RAG and Direct approaches
 * 
 * @param ragTime - Total RAG time (retrieval + generation) in milliseconds
 * @param directTime - Direct generation time in milliseconds
 * @returns Speed comparison result with winner and metrics
 * 
 * @example
 * ```typescript
 * const speedComp = compareSpeed(1200, 1500);
 * console.log(speedComp.winner); // 'rag'
 * console.log(speedComp.differenceMs); // -300
 * ```
 */
export function compareSpeed(ragTime: number, directTime: number): SpeedComparison {
  const winner = determineWinner(ragTime, directTime, TIE_THRESHOLDS.SPEED_MS, true);
  const differenceMs = ragTime - directTime;
  const differencePercent = calculatePercentageDifference(ragTime, directTime);
  
  return {
    winner,
    ragTotal: ragTime,
    directTotal: directTime,
    differenceMs,
    differencePercent,
  };
}

/**
 * Compares token usage between RAG and Direct approaches
 * 
 * @param ragTokens - Tokens used by RAG approach
 * @param directTokens - Tokens used by Direct approach
 * @returns Token comparison result with winner and metrics
 * 
 * @example
 * ```typescript
 * const tokenComp = compareTokens(5000, 8000);
 * console.log(tokenComp.winner); // 'rag'
 * console.log(tokenComp.difference); // -3000
 * ```
 */
export function compareTokens(ragTokens: number, directTokens: number): TokenComparison {
  const winner = determineWinner(ragTokens, directTokens, TIE_THRESHOLDS.TOKENS, true);
  const difference = ragTokens - directTokens;
  const differencePercent = calculatePercentageDifference(ragTokens, directTokens);
  
  return {
    winner,
    rag: ragTokens,
    direct: directTokens,
    difference,
    differencePercent,
  };
}

/**
 * Compares cost between RAG and Direct approaches
 * 
 * @param ragCost - Cost of RAG approach in USD
 * @param directCost - Cost of Direct approach in USD
 * @returns Cost comparison result with winner and metrics
 * 
 * @example
 * ```typescript
 * const costComp = compareCost(0.005, 0.008);
 * console.log(costComp.winner); // 'rag'
 * console.log(formatCost(costComp.difference)); // '-$0.003'
 * ```
 */
export function compareCost(ragCost: number, directCost: number): CostComparison {
  const winner = determineWinner(ragCost, directCost, TIE_THRESHOLDS.COST_USD, true);
  const difference = ragCost - directCost;
  const differencePercent = calculatePercentageDifference(ragCost, directCost);
  
  return {
    winner,
    rag: ragCost,
    direct: directCost,
    difference,
    differencePercent,
  };
}

/**
 * Compares context window usage between RAG and Direct approaches
 * 
 * RAG typically uses less context window because it only includes relevant chunks,
 * while Direct includes the entire document.
 * 
 * @param ragUsage - RAG context window usage percentage (0-100)
 * @param directUsage - Direct context window usage percentage (0-100)
 * @returns Context comparison result with usage metrics and insights
 * 
 * @example
 * ```typescript
 * const contextComp = compareContextWindow(15.5, 85.2);
 * console.log(contextComp.insight); // "RAG uses 69.7% less context window"
 * ```
 */
export function compareContextWindow(
  ragUsage: number,
  directUsage: number
): ContextComparison {
  const difference = directUsage - ragUsage;
  const percentReduction = (difference / directUsage) * 100;
  
  let insight: string;
  if (Math.abs(difference) < 5) {
    insight = 'Both approaches use similar context window space';
  } else if (ragUsage < directUsage) {
    insight = `RAG uses ${percentReduction.toFixed(1)}% less context window, enabling more efficient processing`;
  } else {
    insight = `Direct approach uses ${Math.abs(percentReduction).toFixed(1)}% less context window`;
  }
  
  return {
    ragUsage,
    directUsage,
    difference,
    insight,
  };
}

/**
 * Compares quality between RAG and Direct approaches using heuristics
 * 
 * NOTE: This is a heuristic-based comparison and not a definitive quality measure.
 * True quality assessment requires human evaluation or specialized metrics like BLEU, ROUGE, etc.
 * 
 * Heuristics used:
 * - Answer length (longer may indicate more comprehensive)
 * - Structure (presence of formatting, lists, sections)
 * - Sources (RAG has explicit source attribution)
 * - Specificity (presence of specific details vs. general statements)
 * 
 * @param ragResult - RAG query result
 * @param directResult - Direct query result
 * @returns Quality comparison with heuristic scores and insights
 * 
 * @example
 * ```typescript
 * const qualityComp = compareQuality(ragResult, directResult);
 * console.log(qualityComp.insights);
 * // ["RAG provides explicit source attribution", "Direct answer is more concise"]
 * ```
 */
export function compareQuality(
  ragResult: RAGResult,
  directResult: DirectResult
): QualityComparison {
  const insights: string[] = [];
  
  // Heuristic 1: Answer length (normalized to 0-1 scale)
  const ragLength = ragResult.answer.length;
  const directLength = directResult.answer.length;
  const maxLength = Math.max(ragLength, directLength);
  
  const ragLengthScore = ragLength / maxLength;
  const directLengthScore = directLength / maxLength;
  
  // Heuristic 2: Structure (presence of formatting)
  const ragStructureScore = calculateStructureScore(ragResult.answer);
  const directStructureScore = calculateStructureScore(directResult.answer);
  
  // Heuristic 3: Source attribution (RAG has explicit sources)
  const ragSourceScore = ragResult.sources.length > 0 ? 1 : 0;
  const directSourceScore = 0; // Direct doesn't have explicit sources
  
  // Heuristic 4: Specificity (presence of numbers, dates, specific terms)
  const ragSpecificityScore = calculateSpecificityScore(ragResult.answer);
  const directSpecificityScore = calculateSpecificityScore(directResult.answer);
  
  // Calculate weighted scores (0-1 scale)
  const ragScore = (
    ragLengthScore * 0.2 +
    ragStructureScore * 0.3 +
    ragSourceScore * 0.3 +
    ragSpecificityScore * 0.2
  );
  
  const directScore = (
    directLengthScore * 0.2 +
    directStructureScore * 0.3 +
    directSourceScore * 0.3 +
    directSpecificityScore * 0.2
  );
  
  const difference = ragScore - directScore;
  
  // Generate insights
  if (ragResult.sources.length > 0) {
    insights.push(`RAG provides explicit source attribution (${ragResult.sources.length} sources)`);
  }
  
  if (Math.abs(ragLength - directLength) > 200) {
    if (ragLength > directLength) {
      insights.push('RAG answer is more comprehensive');
    } else {
      insights.push('Direct answer is more concise');
    }
  }
  
  if (ragStructureScore > directStructureScore + 0.2) {
    insights.push('RAG answer has better structure and formatting');
  } else if (directStructureScore > ragStructureScore + 0.2) {
    insights.push('Direct answer has better structure and formatting');
  }
  
  if (ragSpecificityScore > directSpecificityScore + 0.2) {
    insights.push('RAG answer includes more specific details');
  } else if (directSpecificityScore > ragSpecificityScore + 0.2) {
    insights.push('Direct answer includes more specific details');
  }
  
  if (insights.length === 0) {
    insights.push('Both answers have similar quality characteristics');
  }
  
  return {
    ragScore,
    directScore,
    difference,
    insights,
  };
}

/**
 * Calculates a structure score based on formatting elements
 * 
 * @param text - Text to analyze
 * @returns Structure score (0-1)
 */
function calculateStructureScore(text: string): number {
  let score = 0;
  
  // Check for bullet points or numbered lists
  if (/^[\s]*[-*•]\s/m.test(text) || /^[\s]*\d+\.\s/m.test(text)) {
    score += 0.3;
  }
  
  // Check for paragraphs (multiple line breaks)
  const paragraphs = text.split(/\n\s*\n/).length;
  if (paragraphs > 1) {
    score += Math.min(0.3, paragraphs * 0.1);
  }
  
  // Check for headings or sections
  if (/^#{1,6}\s/m.test(text) || /^[A-Z][^.!?]*:$/m.test(text)) {
    score += 0.2;
  }
  
  // Check for code blocks or quotes
  if (/```[\s\S]*```/.test(text) || /^>\s/m.test(text)) {
    score += 0.2;
  }
  
  return Math.min(score, 1);
}

/**
 * Calculates a specificity score based on presence of specific details
 * 
 * @param text - Text to analyze
 * @returns Specificity score (0-1)
 */
function calculateSpecificityScore(text: string): number {
  let score = 0;
  
  // Check for numbers
  const numberMatches = text.match(/\d+/g);
  if (numberMatches) {
    score += Math.min(0.3, numberMatches.length * 0.05);
  }
  
  // Check for dates
  if (/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|January|February|March|April|May|June|July|August|September|October|November|December/i.test(text)) {
    score += 0.2;
  }
  
  // Check for proper nouns (capitalized words not at sentence start)
  const properNouns = text.match(/(?<!^|\. )[A-Z][a-z]+/g);
  if (properNouns) {
    score += Math.min(0.3, properNouns.length * 0.03);
  }
  
  // Check for technical terms or acronyms
  if (/\b[A-Z]{2,}\b/.test(text)) {
    score += 0.2;
  }
  
  return Math.min(score, 1);
}

/**
 * Generates a human-readable summary of the comparison
 * 
 * Focuses on the most significant differences and provides actionable insights
 * about when to use each approach.
 * 
 * @param comparison - Comparison metrics
 * @returns Formatted summary string
 * 
 * @example
 * ```typescript
 * const summary = generateSummary(comparisonMetrics);
 * console.log(summary);
 * // "RAG is 45% faster and 30% cheaper, using 70% less context window.
 * //  Recommended for: cost-sensitive applications with large documents."
 * ```
 */
export function generateSummary(comparison: ComparisonMetrics): string {
  const insights: string[] = [];
  
  // Speed insights
  const speedDiff = Math.abs(comparison.speed.difference);
  if (speedDiff > 20) {
    const faster = comparison.speed.difference < 0 ? 'RAG' : 'Direct';
    insights.push(`${faster} is ${speedDiff.toFixed(0)}% faster`);
  }
  
  // Token insights
  const tokenDiff = Math.abs(comparison.tokens.difference);
  if (tokenDiff > 20) {
    const fewer = comparison.tokens.difference < 0 ? 'RAG' : 'Direct';
    insights.push(`${fewer} uses ${tokenDiff.toFixed(0)}% fewer tokens`);
  }
  
  // Cost insights
  const costDiff = Math.abs(comparison.cost.difference);
  if (costDiff > 20) {
    const cheaper = comparison.cost.difference < 0 ? 'RAG' : 'Direct';
    insights.push(`${cheaper} is ${costDiff.toFixed(0)}% cheaper`);
  }
  
  // Context window insights
  const contextDiff = Math.abs(comparison.contextWindow.difference);
  if (contextDiff > 10) {
    const efficient = comparison.contextWindow.ragUsage < comparison.contextWindow.directUsage ? 'RAG' : 'Direct';
    insights.push(`${efficient} uses ${contextDiff.toFixed(0)}% less context window`);
  }
  
  // Quality insights
  if (comparison.quality && comparison.quality.difference !== undefined && Math.abs(comparison.quality.difference) > 0.1) {
    const better = comparison.quality.difference > 0 ? 'RAG' : 'Direct';
    insights.push(`${better} shows better quality heuristics`);
  }
  
  if (insights.length === 0) {
    return 'Both approaches show similar performance characteristics.';
  }
  
  return insights.join(', ') + '.';
}

/**
 * Formats a detailed comparison summary with recommendations
 * 
 * @param metrics - Comparison metrics
 * @returns Formatted summary with recommendations
 */
export function formatComparisonSummary(metrics: ComparisonMetrics): string {
  const lines: string[] = [];
  
  lines.push('Performance Comparison:');
  lines.push(`  Speed: RAG ${formatTime(metrics.speed.ragTotal)} vs Direct ${formatTime(metrics.speed.directTotal)}`);
  lines.push(`  Tokens: RAG ${formatTokens(metrics.tokens.rag)} vs Direct ${formatTokens(metrics.tokens.direct)}`);
  lines.push(`  Cost: RAG ${formatCost(metrics.cost.rag)} vs Direct ${formatCost(metrics.cost.direct)}`);
  lines.push(`  Context: RAG ${formatPercentage(metrics.contextWindow.ragUsage)} vs Direct ${formatPercentage(metrics.contextWindow.directUsage)}`);
  
  lines.push('');
  lines.push('Summary: ' + generateSummary(metrics));
  
  return lines.join('\n');
}

/**
 * Main comparison function that analyzes RAG and Direct results
 * 
 * Performs comprehensive comparison across multiple dimensions:
 * - Speed (total execution time)
 * - Token usage (efficiency)
 * - Cost (economic efficiency)
 * - Context window usage (scalability)
 * - Quality (heuristic-based)
 * 
 * @param ragResult - Result from RAG pipeline
 * @param directResult - Result from Direct pipeline
 * @returns Complete comparison result with metrics and recommendations
 * 
 * @throws {Error} If results are invalid or missing required data
 * 
 * @example
 * ```typescript
 * const comparison = compare(ragResult, directResult);
 * console.log(comparison.summary.recommendation); // 'rag' | 'direct' | 'similar'
 * console.log(comparison.summary.insights);
 * ```
 */
export function compare(
  ragResult: RAGResult,
  directResult: DirectResult
): ComparisonResult {
  // Validate inputs
  if (!ragResult || !directResult) {
    throw new Error('Both RAG and Direct results are required for comparison');
  }
  
  if (!ragResult.metrics || !directResult.metrics) {
    throw new Error('Results must include metrics for comparison');
  }
  
  // Calculate total times
  const ragTotalTime = ragResult.metrics.retrievalTime + ragResult.metrics.generationTime;
  const directTotalTime = directResult.metrics.generationTime;
  
  // Perform individual comparisons
  const speedComp = compareSpeed(ragTotalTime, directTotalTime);
  const tokenComp = compareTokens(ragResult.metrics.tokens, directResult.metrics.tokens);
  const costComp = compareCost(ragResult.metrics.cost, directResult.metrics.cost);
  const contextComp = compareContextWindow(0, directResult.metrics.contextWindowUsage);
  const qualityComp = compareQuality(ragResult, directResult);
  
  // Build comparison metrics
  const comparison: ComparisonMetrics = {
    speed: {
      ragTotal: ragTotalTime,
      directTotal: directTotalTime,
      difference: speedComp.differencePercent,
    },
    tokens: {
      rag: ragResult.metrics.tokens,
      direct: directResult.metrics.tokens,
      difference: tokenComp.differencePercent,
    },
    cost: {
      rag: ragResult.metrics.cost,
      direct: directResult.metrics.cost,
      difference: costComp.differencePercent,
    },
    contextWindow: {
      ragUsage: 0, // RAG doesn't use full context
      directUsage: directResult.metrics.contextWindowUsage,
      difference: contextComp.difference,
    },
    quality: {
      ragScore: qualityComp.ragScore,
      directScore: qualityComp.directScore,
      difference: qualityComp.difference,
    },
  };
  
  // Determine overall recommendation
  let recommendation: 'rag' | 'direct' | 'similar';
  const ragWins = [speedComp.winner, tokenComp.winner, costComp.winner].filter(w => w === 'rag').length;
  const directWins = [speedComp.winner, tokenComp.winner, costComp.winner].filter(w => w === 'direct').length;
  
  if (ragWins > directWins) {
    recommendation = 'rag';
  } else if (directWins > ragWins) {
    recommendation = 'direct';
  } else {
    recommendation = 'similar';
  }
  
  // Generate insights
  const insights: string[] = [];
  
  // Add performance insights
  if (speedComp.winner === 'rag') {
    insights.push(`RAG is faster by ${formatTime(Math.abs(speedComp.differenceMs))}`);
  } else if (speedComp.winner === 'direct') {
    insights.push(`Direct is faster by ${formatTime(Math.abs(speedComp.differenceMs))}`);
  }
  
  if (tokenComp.winner === 'rag') {
    insights.push(`RAG uses ${formatTokens(Math.abs(tokenComp.difference))} fewer tokens`);
  } else if (tokenComp.winner === 'direct') {
    insights.push(`Direct uses ${formatTokens(Math.abs(tokenComp.difference))} fewer tokens`);
  }
  
  if (costComp.winner === 'rag') {
    insights.push(`RAG saves ${formatCost(Math.abs(costComp.difference))} per query`);
  } else if (costComp.winner === 'direct') {
    insights.push(`Direct saves ${formatCost(Math.abs(costComp.difference))} per query`);
  }
  
  // Add context window insight
  insights.push(contextComp.insight);
  
  // Add quality insights
  insights.push(...qualityComp.insights);
  
  // Add recommendation insight
  if (recommendation === 'rag') {
    insights.push('Recommendation: Use RAG for better performance and cost efficiency');
  } else if (recommendation === 'direct') {
    insights.push('Recommendation: Use Direct for simpler implementation');
  } else {
    insights.push('Recommendation: Both approaches perform similarly; choose based on other factors');
  }
  
  return {
    rag: ragResult,
    direct: directResult,
    comparison,
    summary: {
      recommendation,
      insights,
      timestamp: new Date(),
    },
  };
}

// Made with Bob