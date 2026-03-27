/**
 * Dual Pipeline Upload Progress Component
 *
 * Displays real-time progress for both RAG and Direct pipelines during upload.
 * Shows side-by-side progress with independent status tracking and event timelines.
 * Transitions to result components (RagUploadResult/DirectUploadResult) when complete.
 */

'use client';

import React from 'react';
import { PipelineType } from '@/types/processing-events';
import { PipelineProgress, PipelineStatus } from '@/types/rag-comparison';
import { ProcessingTimeline } from '../processing/ProcessingTimeline';
import { Spinner } from '../ui/Spinner';

interface DualPipelineUploadProgressProps {
  ragProgress: PipelineProgress;
  directProgress: PipelineProgress;
  filename: string;
}

/**
 * Get status color and icon for pipeline
 */
function getStatusDisplay(status: PipelineStatus): {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactElement;
  label: string;
} {
  switch (status) {
    case 'idle':
      return {
        color: 'text-unkey-gray-400',
        bgColor: 'bg-unkey-gray-800/30',
        borderColor: 'border-unkey-gray-700',
        icon: (
          <div className="w-5 h-5 rounded-full border-2 border-unkey-gray-500" />
        ),
        label: 'Waiting...'
      };
    case 'starting':
      return {
        color: 'text-blue',
        bgColor: 'bg-blue/10',
        borderColor: 'border-blue/20',
        icon: <Spinner size="md" className="text-blue" />,
        label: 'Starting...'
      };
    case 'processing':
      return {
        color: 'text-blue',
        bgColor: 'bg-blue/10',
        borderColor: 'border-blue/20',
        icon: <Spinner size="md" className="text-blue" />,
        label: 'Processing...'
      };
    case 'complete':
      return {
        color: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-success/20',
        icon: (
          <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        label: 'Complete'
      };
    case 'error':
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        icon: (
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        label: 'Failed'
      };
  }
}

/**
 * Individual pipeline progress card
 */
function PipelineProgressCard({
  pipeline,
  progress,
  pipelineName
}: {
  pipeline: PipelineType;
  progress: PipelineProgress;
  pipelineName: string;
}) {
  const display = getStatusDisplay(progress.status);
  
  return (
    <div className={`
      border rounded-unkey-lg shadow-unkey-card overflow-hidden
      ${display.borderColor} ${display.bgColor}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-unkey-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-white">{pipelineName} Pipeline</h3>
          {display.icon}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${display.color}`}>
            {display.label}
          </span>
          {progress.currentOperation && progress.status === 'processing' && (
            <span className="text-xs text-unkey-gray-400">
              • {progress.currentOperation}
            </span>
          )}
        </div>
      </div>

      {/* Progress Content */}
      <div className="p-4">
        {/* Error Message */}
        {progress.error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-unkey-md">
            <p className="text-sm font-medium text-red-400 mb-1">Error:</p>
            <p className="text-sm text-red-300">{progress.error}</p>
          </div>
        )}

        {/* Event Timeline */}
        {progress.events && progress.events.length > 0 && (
          <div className="mt-4">
            <ProcessingTimeline
              pipeline={pipeline}
              events={progress.events}
            />
          </div>
        )}

        {/* Idle State */}
        {progress.status === 'idle' && (!progress.events || progress.events.length === 0) && (
          <div className="text-center py-8 text-unkey-gray-500">
            <p className="text-sm">Waiting to start...</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main dual pipeline progress component
 *
 * Shows real-time progress only. Does NOT show completion summary - that's handled
 * by RagUploadResult and DirectUploadResult components after streaming completes.
 */
export function DualPipelineUploadProgress({
  ragProgress,
  directProgress,
  filename
}: DualPipelineUploadProgressProps) {
  // Check if any pipeline is still processing
  const isProcessing = ragProgress.status === 'processing' || ragProgress.status === 'starting' ||
                       directProgress.status === 'processing' || directProgress.status === 'starting';
  
  // Check if both are complete
  const bothComplete = ragProgress.status === 'complete' && directProgress.status === 'complete';
  
  return (
    <div className="space-y-4">
      {/* Overall Status Header */}
      <div className="bg-unkey-gray-900 border border-unkey-gray-700 rounded-unkey-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Processing: {filename}
            </h2>
            <p className="text-sm text-unkey-gray-400">
              {bothComplete
                ? 'Upload complete - both pipelines finished successfully'
                : 'Upload in progress - both pipelines running independently'}
            </p>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-2">
              <Spinner size="lg" className="text-unkey-teal-500" />
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side Pipeline Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PipelineProgressCard
          pipeline={PipelineType.RAG}
          progress={ragProgress}
          pipelineName="RAG"
        />
        <PipelineProgressCard
          pipeline={PipelineType.DIRECT}
          progress={directProgress}
          pipelineName="Direct"
        />
      </div>
    </div>
  );
}

// Made with Bob