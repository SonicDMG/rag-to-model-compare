/**
 * Processing Timeline Component
 * 
 * Displays real-time processing events from RAG, Direct, and Ollama pipelines.
 * Shows operation names, durations, and status with color coding.
 * Highlights operations taking >100ms for easy identification of bottlenecks.
 */

'use client';

import { useState } from 'react';
import {
  ProcessingEvent,
  ProcessingEventStatus,
  ProcessingEventType,
  PipelineType
} from '@/types/processing-events';

interface ProcessingTimelineProps {
  /** Pipeline identifier (rag, direct, or ollama) */
  pipeline: PipelineType;
  /** Array of processing events */
  events: ProcessingEvent[];
  /** Whether to show the timeline expanded by default */
  defaultExpanded?: boolean;
}

/**
 * Get human-readable label for event type
 */
function getEventLabel(type: ProcessingEventType): string {
  const labels: Record<ProcessingEventType, string> = {
    [ProcessingEventType.VALIDATION]: 'Input Validation',
    [ProcessingEventType.PROMPT_BUILDING]: 'Prompt Building',
    [ProcessingEventType.CONTEXT_CHECK]: 'Context Validation',
    [ProcessingEventType.TOKEN_ESTIMATION]: 'Token Estimation',
    [ProcessingEventType.API_CALL]: 'API Call',
    [ProcessingEventType.METRICS_CALCULATION]: 'Metrics Calculation',
    [ProcessingEventType.FILTER_LOOKUP]: 'Filter Lookup',
    [ProcessingEventType.DOCUMENT_RETRIEVAL]: 'Document Retrieval',
    [ProcessingEventType.EMBEDDING_GENERATION]: 'Embedding Generation',
    [ProcessingEventType.VECTOR_SEARCH]: 'Vector Search',
    [ProcessingEventType.CONTEXT_ASSEMBLY]: 'Context Assembly',
    [ProcessingEventType.CONTEXT_BUILDING]: 'Context Building',
    [ProcessingEventType.DOCUMENT_LOADING]: 'Document Loading',
    [ProcessingEventType.MODEL_DETECTION]: 'Model Detection',
    [ProcessingEventType.CONNECTION_CHECK]: 'Connection Check',
    [ProcessingEventType.STREAM_SETUP]: 'Stream Setup',
    [ProcessingEventType.RESPONSE_PARSING]: 'Response Parsing',
    [ProcessingEventType.INITIALIZATION]: 'Initialization',
    [ProcessingEventType.CLEANUP]: 'Cleanup',
    [ProcessingEventType.ERROR_HANDLING]: 'Error Handling',
  };
  
  return labels[type] || type;
}

/**
 * Get color classes based on event status (dark theme)
 */
function getStatusColor(status: ProcessingEventStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case ProcessingEventStatus.STARTED:
      return {
        bg: 'bg-blue/10',
        text: 'text-blue',
        border: 'border-blue/20'
      };
    case ProcessingEventStatus.COMPLETED:
      return {
        bg: 'bg-success/10',
        text: 'text-success',
        border: 'border-success/20'
      };
    case ProcessingEventStatus.FAILED:
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20'
      };
    default:
      return {
        bg: 'bg-unkey-gray-800/50',
        text: 'text-unkey-gray-300',
        border: 'border-unkey-gray-700'
      };
  }
}

/**
 * Get pipeline color (dark theme)
 */
function getPipelineColor(pipeline: PipelineType): string {
  switch (pipeline) {
    case PipelineType.RAG:
      return 'text-success';
    case PipelineType.DIRECT:
      return 'text-blue';
    case PipelineType.OLLAMA:
      return 'text-purple-400';
    default:
      return 'text-unkey-gray-400';
  }
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number | null): string {
  if (ms === null) return 'In progress...';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Processing Timeline Component
 */
export function ProcessingTimeline({
  pipeline,
  events,
  defaultExpanded = false
}: ProcessingTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Calculate total time
  const totalTime = events.length > 0 && events[events.length - 1].endTime
    ? new Date(events[events.length - 1].endTime!).getTime() - new Date(events[0].startTime).getTime()
    : 0;
  
  // Count events by status
  const completedCount = events.filter(e => e.status === ProcessingEventStatus.COMPLETED).length;
  const failedCount = events.filter(e => e.status === ProcessingEventStatus.FAILED).length;
  const inProgressCount = events.filter(e => e.status === ProcessingEventStatus.STARTED).length;
  
  const pipelineColor = getPipelineColor(pipeline);
  const pipelineName = pipeline.toUpperCase();
  
  return (
    <div className="border border-unkey-gray-700 rounded-unkey-lg overflow-hidden bg-unkey-gray-900 shadow-unkey-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-unkey-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${pipelineColor}`}>
            {pipelineName} Pipeline
          </span>
          <span className="text-sm text-unkey-gray-400">
            {events.length} operation{events.length !== 1 ? 's' : ''}
          </span>
          {totalTime > 0 && (
            <span className="text-sm font-medium text-white">
              Total: {formatDuration(totalTime)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status badges */}
          {completedCount > 0 && (
            <span className="text-xs px-2 py-1 bg-success/20 text-success rounded border border-success/30">
              ✓ {completedCount}
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="text-xs px-2 py-1 bg-blue/20 text-blue rounded border border-blue/30">
              ⟳ {inProgressCount}
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30">
              ✗ {failedCount}
            </span>
          )}
          
          {/* Expand/collapse icon */}
          <svg
            className={`w-5 h-5 text-unkey-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Timeline */}
      {isExpanded && (
        <div className="border-t border-unkey-gray-700 bg-unkey-gray-800/30">
          <div className="p-4 space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-8 text-unkey-gray-500">
                No processing events recorded
              </div>
            ) : (
              events.map((event, index) => {
                const colors = getStatusColor(event.status);
                const isSlowOperation = event.duration !== null && event.duration > 100;
                
                return (
                  <div
                    key={event.id}
                    className={`border ${colors.border} ${colors.bg} rounded-unkey-md p-3 ${
                      isSlowOperation ? 'ring-2 ring-yellow-500/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Operation name */}
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${colors.text}`}>
                            {index + 1}. {getEventLabel(event.type)}
                          </span>
                          {isSlowOperation && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 font-medium">
                              SLOW
                            </span>
                          )}
                        </div>
                        
                        {/* Operation description */}
                        <div className="text-sm text-unkey-gray-400 mt-1">
                          {event.operationName}
                        </div>
                        
                        {/* Error message */}
                        {event.error && (
                          <div className="text-sm text-red-400 mt-1 font-medium">
                            Error: {event.error}
                          </div>
                        )}
                        
                        {/* Metadata */}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="text-xs text-unkey-gray-500 mt-2 space-y-1">
                            {Object.entries(event.metadata).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium text-unkey-gray-400">{key}:</span>
                                <span className="text-unkey-gray-500">{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Duration */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-lg font-bold ${colors.text}`}>
                          {formatDuration(event.duration)}
                        </div>
                        <div className="text-xs text-unkey-gray-500 mt-1">
                          {event.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
