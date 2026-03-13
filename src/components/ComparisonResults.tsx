'use client';

import { ComparisonResult } from '@/types/rag-comparison';
import { MetricsDisplay } from './MetricsDisplay';
import { ExpandableText } from './ExpandableText';
import { Badge } from './ui/Badge';
import { MetricsTabProvider } from '@/contexts/MetricsTabContext';
import { ModelSelector } from './ui/ModelSelector';
import { SUPPORTED_MODELS } from '@/lib/constants/models';

interface ComparisonResultsProps {
  result: ComparisonResult;
  selectedModel: string;
  onModelChange: (newModel: string) => void;
}

function AnswerCard({
  title,
  answer,
  sources,
  isWinner
}: {
  title: string;
  answer: string;
  sources?: Array<{ id: string; content: string; metadata: any }>;
  isWinner: boolean;
}) {
  return (
    <div className={`bg-unkey-gray-900 rounded-unkey-lg border ${
      isWinner ? 'border-unkey-teal-500' : 'border-unkey-gray-700'
    } p-6 relative shadow-unkey-card`}>
      {isWinner && (
        <div className="absolute -top-3 left-4">
          <Badge variant="success" size="md">
            Recommended
          </Badge>
        </div>
      )}
      
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      
      <div className="prose prose-sm max-w-none">
        <ExpandableText text={answer} characterLimit={400} />
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-6 pt-6 border-t border-unkey-gray-700">
          <h4 className="text-sm font-semibold text-unkey-gray-200 mb-3">
            Source Citations ({sources.length})
          </h4>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div
                key={source.id}
                className="bg-unkey-gray-850 rounded-unkey-md p-3 text-sm border border-unkey-gray-700"
              >
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-unkey-teal-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-unkey-gray-300 line-clamp-3">
                      {source.content}
                    </p>
                    {source.metadata?.index !== undefined && (
                      <p className="text-xs text-unkey-gray-500 mt-1">
                        Chunk {source.metadata.index + 1}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ result }: { result: ComparisonResult }) {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'rag':
        return 'bg-success/10 border-success/20 text-success';
      case 'direct':
        return 'bg-blue/10 border-blue/20 text-blue';
      default:
        return 'bg-unkey-gray-850 border-unkey-gray-700 text-unkey-gray-300';
    }
  };

  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case 'rag':
        return 'RAG Approach Recommended';
      case 'direct':
        return 'Direct Context Approach Recommended';
      default:
        return 'Both Approaches Perform Similarly';
    }
  };

  return (
    <div className={`rounded-unkey-lg border p-6 shadow-unkey-card ${getRecommendationColor(result.summary.recommendation)}`}>
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-2">
            {getRecommendationText(result.summary.recommendation)}
          </h3>
          
          {result.summary.insights.length > 0 && (
            <ul className="space-y-2 text-sm">
              {result.summary.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-lg leading-none">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
          
          <p className="text-xs mt-3 opacity-75">
            Analyzed at {new Date(result.summary.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ComparisonResults({
  result,
  selectedModel,
  onModelChange
}: ComparisonResultsProps) {
  const ragIsRecommended = result.summary.recommendation === 'rag';
  const directIsRecommended = result.summary.recommendation === 'direct';

  // Get list of available model IDs
  const availableModels = Object.keys(SUPPORTED_MODELS).filter(
    modelId => SUPPORTED_MODELS[modelId].available
  );

  return (
    <MetricsTabProvider>
      <div className="w-full space-y-6">
      {/* Summary Section */}
      <SummaryCard result={result} />

      {/* Single Model Selector - Above Everything */}
      <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Model Configuration</h2>
        <p className="text-sm text-unkey-gray-400 mb-6">
          Change the model to recalculate metrics for both RAG and Direct pipelines. No re-query needed - metrics update instantly.
        </p>
        
        <div className="max-w-md">
          <ModelSelector
            currentModel={selectedModel}
            availableModels={availableModels}
            onModelChange={onModelChange}
            disabled={false}
            isLoading={false}
          />
        </div>
      </div>

      {/* Side-by-Side Answers */}
      <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Answer Comparison</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnswerCard
            title="RAG Approach"
            answer={result.rag.answer}
            sources={result.rag.sources}
            isWinner={ragIsRecommended}
          />
          
          <AnswerCard
            title="Direct Context Approach"
            answer={result.direct.answer}
            isWinner={directIsRecommended}
          />
        </div>
      </div>

      {/* Side-by-Side Metrics Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RAG Metrics Column */}
        <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-success/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full" />
            RAG Performance
          </h3>
          
          <div className="space-y-4">
            {/* Generation Time */}
            <div className="bg-success/10 rounded-unkey-lg p-4 border border-success/20">
              <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Generation Time</h4>
              <p className="text-2xl font-bold text-success">
                {result.rag.metrics.generationTime.toFixed(0)}ms
              </p>
              <p className="text-xs text-unkey-gray-500 mt-1">
                Retrieval: {result.rag.metrics.retrievalTime.toFixed(0)}ms
              </p>
            </div>

            {/* Token Usage */}
            <div className="bg-success/10 rounded-unkey-lg p-4 border border-success/20">
              <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Tokens Used</h4>
              <p className="text-2xl font-bold text-success">
                {result.rag.metrics.tokens.toLocaleString()}
              </p>
              <p className="text-xs text-unkey-gray-500 mt-1">
                Retrieved chunks only
              </p>
            </div>

            {/* Cost */}
            <div className="bg-success/10 rounded-unkey-lg p-4 border border-success/20">
              <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Cost</h4>
              <p className="text-2xl font-bold text-success">
                ${result.rag.metrics.cost.toFixed(4)}
              </p>
              <p className="text-xs text-unkey-gray-500 mt-1">
                Total: {(result.rag.metrics.retrievalTime + result.rag.metrics.generationTime).toFixed(0)}ms
              </p>
            </div>
          </div>
        </div>

        {/* Direct Metrics Column */}
        <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-blue/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue rounded-full" />
            Direct Performance
          </h3>
          
          <div className="space-y-4">
            {/* Generation Time */}
            <div className="bg-blue/10 rounded-unkey-lg p-4 border border-blue/20">
              <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Generation Time</h4>
              <p className="text-2xl font-bold text-blue">
                {result.direct.metrics.generationTime.toFixed(0)}ms
              </p>
              <p className="text-xs text-unkey-gray-500 mt-1">
                No retrieval step needed
              </p>
            </div>

            {/* Token Usage */}
            <div className="bg-blue/10 rounded-unkey-lg p-4 border border-blue/20">
              <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Tokens Used</h4>
              <p className="text-2xl font-bold text-blue">
                {result.direct.metrics.tokens.toLocaleString()}
              </p>
              <p className="text-xs text-unkey-gray-500 mt-1">
                Full document in context
              </p>
            </div>

            {/* Cost */}
            <div className="bg-blue/10 rounded-unkey-lg p-4 border border-blue/20">
              <h4 className="text-sm font-medium text-unkey-gray-400 mb-2">Cost</h4>
              <p className="text-2xl font-bold text-blue">
                ${result.direct.metrics.cost.toFixed(4)}
              </p>
              <p className="text-xs text-unkey-gray-500 mt-1">
                Single API call
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Metrics Display with Breakdown */}
      <MetricsDisplay
        metrics={result.comparison}
        ragResult={result.rag}
        directResult={result.direct}
      />
      </div>
    </MetricsTabProvider>
  );
}

// Made with Bob