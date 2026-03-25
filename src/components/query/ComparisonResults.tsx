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
  
  // Direct props
  directResult: DirectResult | null;
  isDirectQuerying: boolean;
  directError: string | null;
  
  // Ollama props
  ollamaResult: OllamaResult | null;
  isOllamaQuerying: boolean;
  ollamaError: string | null;
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
  
  // Real-time processing events
  ragProcessingEvents?: ProcessingEvent[];
  directProcessingEvents?: ProcessingEvent[];
  ollamaProcessingEvents?: ProcessingEvent[];
}

export function ComparisonResults({
  ragResult,
  isRagQuerying,
  ragError,
  directResult,
  isDirectQuerying,
  directError,
  ollamaResult,
  isOllamaQuerying,
  ollamaError,
  ollamaModel,
  availableOllamaModels,
  onOllamaModelChange,
  isOllamaAvailable,
  documentTokens,
  ragProcessingEvents = [],
  directProcessingEvents = [],
  ollamaProcessingEvents = []
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
            processingEvents={ragProcessingEvents.length > 0 ? ragProcessingEvents : ragResult?.processingEvents}
          />
          
          {/* Hybrid Section - Shows Direct pipeline results (type: 'direct' from backend) */}
          <HybridSection
            directResult={directResult}
            isQuerying={isDirectQuerying}
            error={directError}
            documentTokens={documentTokens}
            processingEvents={directProcessingEvents.length > 0 ? directProcessingEvents : directResult?.processingEvents}
          />
          
          {/* Direct Section (Ollama) - Shows Ollama pipeline results (type: 'ollama' from backend) */}
          <DirectSection
            ollamaResult={ollamaResult}
            isQuerying={isOllamaQuerying}
            error={ollamaError}
            documentTokens={documentTokens}
            selectedModel={ollamaModel}
            availableModels={availableOllamaModels}
            onModelChange={onOllamaModelChange}
            isOllamaAvailable={isOllamaAvailable}
            processingEvents={ollamaProcessingEvents.length > 0 ? ollamaProcessingEvents : ollamaResult?.processingEvents}
          />
        </div>
      </div>
    </MetricsTabProvider>
  );
}

// Made with Bob