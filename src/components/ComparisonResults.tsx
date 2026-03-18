'use client';

import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { OllamaResult } from '@/types/ollama';
import { RagSection } from './RagSection';
import { DirectModelSection } from './DirectModelSection';
import { OllamaSection } from './OllamaSection';
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
  documentTokens
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
          />
          
          {/* Direct Model Section */}
          <DirectModelSection
            directResult={directResult}
            isQuerying={isDirectQuerying}
            error={directError}
            documentTokens={documentTokens}
          />
          
          {/* Ollama Section */}
          <OllamaSection
            ollamaResult={ollamaResult}
            isQuerying={isOllamaQuerying}
            error={ollamaError}
            documentTokens={documentTokens}
            selectedModel={ollamaModel}
            availableModels={availableOllamaModels}
            onModelChange={onOllamaModelChange}
            isOllamaAvailable={isOllamaAvailable}
          />
        </div>
      </div>
    </MetricsTabProvider>
  );
}

// Made with Bob