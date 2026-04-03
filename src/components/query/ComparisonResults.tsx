'use client';

import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';
import { ProcessingEvent } from '@/types/processing-events';
import { RagSection } from '../results/RagSection';
import { HybridSection } from '../results/HybridSection';
import { DirectSection } from '../results/DirectSection';
import { MetricsTabProvider } from '@/contexts/MetricsTabContext';

interface ComparisonResultsProps {
  // RAG props
  ragResult: RAGResult | null;
  isRagQuerying: boolean;
  ragError: string | null;
  
  // Hybrid props (uses direct context with RAG data when needed)
  hybridResult: DirectResult | null;
  isHybridQuerying: boolean;
  hybridError: string | null;
  
  // Direct props (via Ollama)
  directResult: OllamaResult | null;
  isDirectQuerying: boolean;
  directError: string | null;
  ollamaModel?: string;
  availableOllamaModels?: Array<{
    name: string;
    displayName: string;
    supportsImages: boolean;
  }>;
  onOllamaModelChange?: (model: string) => void;
  isOllamaAvailable?: boolean;
  
  // Shared props
  documentTokens?: number;
  processedContent?: string;
  
  // Real-time processing events
  ragProcessingEvents?: ProcessingEvent[];
  hybridProcessingEvents?: ProcessingEvent[];
  directProcessingEvents?: ProcessingEvent[];
}

export function ComparisonResults({
  ragResult,
  isRagQuerying,
  ragError,
  hybridResult,
  isHybridQuerying,
  hybridError,
  directResult,
  isDirectQuerying,
  directError,
  ollamaModel,
  availableOllamaModels,
  onOllamaModelChange,
  isOllamaAvailable,
  documentTokens,
  processedContent,
  ragProcessingEvents = [],
  hybridProcessingEvents = [],
  directProcessingEvents = []
}: ComparisonResultsProps) {
  
  return (
    <MetricsTabProvider>
      <div className="w-full space-y-6">
        {/* Three-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* RAG Section */}
          <RagSection
            ragResult={ragResult}
            isQuerying={isRagQuerying}
            error={ragError}
            documentTokens={documentTokens}
            processedContent={processedContent}
            processingEvents={ragProcessingEvents.length > 0 ? ragProcessingEvents : ragResult?.processingEvents}
            inferenceModel={ollamaModel}
          />
          
          {/* Hybrid Section - Shows Hybrid pipeline results (type: 'direct' from backend) */}
          <HybridSection
            directResult={hybridResult}
            isQuerying={isHybridQuerying}
            error={hybridError}
            documentTokens={documentTokens}
            processedContent={processedContent}
            processingEvents={hybridProcessingEvents.length > 0 ? hybridProcessingEvents : hybridResult?.processingEvents}
            inferenceModel={ollamaModel}
          />
          
          {/* Direct Section - Shows Direct pipeline results via Ollama (type: 'ollama' from backend) */}
          <DirectSection
            ollamaResult={directResult}
            isQuerying={isDirectQuerying}
            error={directError}
            documentTokens={documentTokens}
            processedContent={processedContent}
            selectedModel={ollamaModel}
            availableModels={availableOllamaModels}
            onModelChange={onOllamaModelChange}
            isOllamaAvailable={isOllamaAvailable}
            processingEvents={directProcessingEvents.length > 0 ? directProcessingEvents : directResult?.processingEvents}
          />
        </div>
      </div>
    </MetricsTabProvider>
  );
}

// Made with Bob