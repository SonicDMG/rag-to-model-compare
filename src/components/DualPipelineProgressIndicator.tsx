'use client';

import { FileProcessingProgress, PipelineProgress } from '@/types/rag-comparison';
import { ProgressBar } from './ui/ProgressBar';

interface DualPipelineProgressIndicatorProps {
  progress: FileProcessingProgress;
}

/**
 * Displays dual progress bars for RAG and Direct pipelines
 * Shows real-time progress for both pipelines processing in parallel
 */
export function DualPipelineProgressIndicator({ progress }: DualPipelineProgressIndicatorProps) {
  const getStatusColor = (status: PipelineProgress['status']): string => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getProgressBarVariant = (status: PipelineProgress['status']): 'teal' | 'success' | 'blue' | 'purple' => {
    switch (status) {
      case 'processing':
        return 'blue';
      case 'completed':
        return 'success';
      case 'error':
        return 'purple'; // Use purple for errors to distinguish from success
      default:
        return 'teal';
    }
  };

  const getStatusIcon = (status: PipelineProgress['status']): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* File name header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          Processing: {progress.filename}
        </h3>
        <span className="text-sm text-gray-600">
          Overall: {Math.round(progress.overallProgress)}%
        </span>
      </div>

      {/* RAG Pipeline Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(progress.rag.status)}</span>
            <span className={`font-medium ${getStatusColor(progress.rag.status)}`}>
              RAG Pipeline
            </span>
          </div>
          <span className="text-sm text-gray-600">
            {Math.round(progress.rag.progress)}%
          </span>
        </div>
        
        <ProgressBar
          percentage={progress.rag.progress}
          variant={getProgressBarVariant(progress.rag.status)}
          height="md"
          showLabel={false}
        />
        
        {progress.rag.stage && (
          <p className="text-sm text-gray-600 italic">
            {progress.rag.stage}
          </p>
        )}
        
        {progress.rag.error && (
          <p className="text-sm text-red-600">
            Error: {progress.rag.error}
          </p>
        )}
      </div>

      {/* Direct Pipeline Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(progress.direct.status)}</span>
            <span className={`font-medium ${getStatusColor(progress.direct.status)}`}>
              Direct Pipeline
            </span>
          </div>
          <span className="text-sm text-gray-600">
            {Math.round(progress.direct.progress)}%
          </span>
        </div>
        
        <ProgressBar
          percentage={progress.direct.progress}
          variant={getProgressBarVariant(progress.direct.status)}
          height="md"
          showLabel={false}
        />
        
        {progress.direct.stage && (
          <p className="text-sm text-gray-600 italic">
            {progress.direct.stage}
          </p>
        )}
        
        {progress.direct.error && (
          <p className="text-sm text-red-600">
            Error: {progress.direct.error}
          </p>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="pt-2 border-t border-gray-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm text-gray-600">
            {Math.round(progress.overallProgress)}%
          </span>
        </div>
        <ProgressBar
          percentage={progress.overallProgress}
          variant="teal"
          height="sm"
          showLabel={false}
        />
      </div>
    </div>
  );
}

// Made with Bob
