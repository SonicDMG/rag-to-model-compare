'use client';

import { useState, useEffect } from 'react';
import { UploadResultData } from '@/components/upload/DocumentUpload';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { MetricsTabProvider } from '@/contexts/MetricsTabContext';
import { FilterProvider, useFilter } from '@/contexts/FilterContext';
import { ProcessingEvent, PipelineType } from '@/types/processing-events';
import { TabContainer } from '@/components/tabs/TabContainer';
import { TabPanel } from '@/components/tabs/TabPanel';
import { IngestTab, StreamingProgressData } from '@/components/tabs/IngestTab';
import { QueryTab } from '@/components/tabs/QueryTab';
import { PerformanceTab } from '@/components/tabs/PerformanceTab';
import { ChartsTab } from '@/components/tabs/ChartsTab';
import { GlobalConfigBar } from '@/components/config/GlobalConfigBar';
import { useQueryHistory } from '@/hooks/useQueryHistory';
import { DEFAULT_MODEL } from '@/lib/constants/models';
import { recalculateBothMetrics } from '@/lib/rag-comparison/metrics/metrics-recalculator';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
}

function HomeContent() {
  // Filter context
  const { currentFilter } = useFilter();
  
  // Document state
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResultData | null>(null);
  const [queryCount, setQueryCount] = useState(0);
  
  // Upload streaming progress state
  const [streamingProgress, setStreamingProgress] = useState<StreamingProgressData | null>(null);
  
  // Query state
  const [isQuerying, setIsQuerying] = useState(false);
  
  // RAG state
  const [ragResult, setRagResult] = useState<RAGResult | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [isRagQuerying, setIsRagQuerying] = useState(false);
  
  // Hybrid state (uses direct context with RAG data when needed)
  const [hybridResult, setHybridResult] = useState<DirectResult | null>(null);
  const [hybridError, setHybridError] = useState<string | null>(null);
  const [isHybridQuerying, setIsHybridQuerying] = useState(false);

  // Direct state (via Ollama)
  const [directResult, setDirectResult] = useState<any>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const [isDirectQuerying, setIsDirectQuerying] = useState(false);

  // Processing events state for real-time timeline updates
  const [ragProcessingEvents, setRagProcessingEvents] = useState<ProcessingEvent[]>([]);
  const [hybridProcessingEvents, setHybridProcessingEvents] = useState<ProcessingEvent[]>([]);
  const [directProcessingEvents, setDirectProcessingEvents] = useState<ProcessingEvent[]>([]);

  // Ollama configuration state (for inference)
  const [ollamaModel, setOllamaModel] = useState<string>('llama3.2');
  const [availableOllamaModels, setAvailableOllamaModels] = useState<OllamaModelInfo[]>([]);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean>(false);
  
  // Pricing model state (for cost calculations)
  const [pricingModel, setPricingModel] = useState<string>(DEFAULT_MODEL);

  // Query history hook
  const { saveQuery } = useQueryHistory();

  // Fetch available Ollama models on mount
  useEffect(() => {
    async function checkOllama() {
      try {
        const healthRes = await fetch('/api/ollama/health');
        const healthData = await healthRes.json();
        setIsOllamaAvailable(healthData.available);
        
        if (healthData.available) {
          const modelsRes = await fetch('/api/ollama/models');
          const modelsData = await modelsRes.json();
          if (modelsData.success && modelsData.models.length > 0) {
            setAvailableOllamaModels(modelsData.models);
            // Set default model to first available
            setOllamaModel(modelsData.models[0].name);
          }
        }
      } catch (error) {
        console.error('Failed to check Ollama:', error);
        setIsOllamaAvailable(false);
      }
    }
    
    checkOllama();
  }, []);

  // Recalculate metrics when pricing model changes
  useEffect(() => {
    // Only recalculate if we have existing results and the model actually changed
    if (ragResult && hybridResult) {
      const currentRagModel = ragResult.metrics.breakdown?.metadata.model;
      const currentHybridModel = hybridResult.metrics.breakdown?.metadata.model;
      
      // Check if model changed from what's in the results
      if (currentRagModel !== pricingModel || currentHybridModel !== pricingModel) {
        console.log(`Recalculating metrics for pricing model: ${pricingModel}`);
        
        const { rag: updatedRag, direct: updatedHybrid } = recalculateBothMetrics(
          ragResult,
          hybridResult,
          pricingModel,
          pricingModel
        );
        
        setRagResult(updatedRag);
        setHybridResult(updatedHybrid);
      }
    }
  }, [pricingModel]); // Only depend on pricingModel to avoid infinite loops

  const handleUploadComplete = (docId: string) => {
    setDocumentId(docId);
  };

  const handleUploadResult = (result: UploadResultData) => {
    setUploadResult(result);
  };

  // Clear query results and upload results when a new upload starts
  const handleUploadStart = () => {
    // Clear upload results from previous document
    setUploadResult(null);
    
    // Clear streaming progress
    setStreamingProgress(null);
    
    // Clear all query results
    setRagResult(null);
    setHybridResult(null);
    setDirectResult(null);
    
    // Clear errors
    setRagError(null);
    setHybridError(null);
    setDirectError(null);
    
    // Clear processing events
    setRagProcessingEvents([]);
    setHybridProcessingEvents([]);
    setDirectProcessingEvents([]);
    
    // Reset query count
    setQueryCount(0);
  };

  // Handle streaming progress updates from DocumentUpload
  const handleStreamingProgressChange = (progress: StreamingProgressData | null) => {
    setStreamingProgress(progress);
  };

  const handleQueryBoth = async (query: string, temperature: number, maxTokens: number) => {
    if (!documentId) return;

    // Reset state for all pipelines
    setIsQuerying(true);
    setIsRagQuerying(true);
    setIsHybridQuerying(true);
    setIsDirectQuerying(true);
    setRagError(null);
    setHybridError(null);
    setDirectError(null);
    setRagResult(null);
    setHybridResult(null);
    setDirectResult(null);
    
    // Reset processing events for real-time updates
    setRagProcessingEvents([]);
    setHybridProcessingEvents([]);
    setDirectProcessingEvents([]);

    try {
      const response = await fetch('/api/rag-comparison/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          documentId,
          ...(currentFilter && { filterId: currentFilter.id }), // Only include filterId if a filter is selected
          processedContent: uploadResult?.directProcessedText, // Send full processed text from frontend
          temperature,
          maxTokens,
          model: pricingModel, // Use selected pricing model for cost calculations
          ollamaModel,
          ollamaTemperature: temperature,
          ollamaMaxTokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';
      let finalRagResult: RAGResult | null = null;
      let finalHybridResult: DirectResult | null = null;
      let finalDirectResult: any = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete messages (separated by \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (!message.trim() || !message.startsWith('data: ')) {
            continue;
          }

          try {
            const data = JSON.parse(message.substring(6)); // Remove 'data: ' prefix

            // Handle real-time processing events
            if (data.type === 'processing_event') {
              const { pipeline, event } = data;
              
              // Update the appropriate pipeline's events array
              if (pipeline === PipelineType.RAG) {
                setRagProcessingEvents(prev => {
                  // Check if event already exists (update) or is new (append)
                  const existingIndex = prev.findIndex(e => e.id === event.id);
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = event;
                    return updated;
                  }
                  return [...prev, event];
                });
              } else if (pipeline === PipelineType.DIRECT) {
                setHybridProcessingEvents(prev => {
                  const existingIndex = prev.findIndex(e => e.id === event.id);
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = event;
                    return updated;
                  }
                  return [...prev, event];
                });
              } else if (pipeline === PipelineType.OLLAMA) {
                setDirectProcessingEvents(prev => {
                  const existingIndex = prev.findIndex(e => e.id === event.id);
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = event;
                    return updated;
                  }
                  return [...prev, event];
                });
              }
            }
            // Handle final results
            else if (data.type === 'rag') {
              if (data.success) {
                console.log('✅ RAG result received and rendering');
                setRagResult(data.data);
                finalRagResult = data.data;
                setIsRagQuerying(false);
              } else {
                console.error('❌ RAG error received:', data.error);
                setRagError(data.error);
                setIsRagQuerying(false);
              }
            } else if (data.type === 'direct') {
              if (data.success) {
                console.log('✅ Hybrid result received and rendering');
                setHybridResult(data.data);
                finalHybridResult = data.data;
                setIsHybridQuerying(false);
              } else {
                console.error('❌ Hybrid error received:', data.error);
                setHybridError(data.error);
                setIsHybridQuerying(false);
              }
            } else if (data.type === 'ollama') {
              if (data.success) {
                console.log('✅ Direct result received and rendering');
                setDirectResult(data.data);
                finalDirectResult = data.data;
                setIsDirectQuerying(false);
              } else {
                console.error('❌ Direct error received:', data.error);
                setDirectError(data.error);
                setIsDirectQuerying(false);
              }
            } else if (data.type === 'complete') {
              console.log('✅ Stream complete');
              setIsQuerying(false);
              
              // Save to query history
              if (finalRagResult || finalHybridResult) {
                saveQuery(query, finalRagResult, finalHybridResult, finalDirectResult);
                setQueryCount(prev => prev + 1);
              }
            }
          } catch (parseError) {
            console.error('Failed to parse SSE message:', parseError, message);
          }
        }
      }

      // Ensure loading states are cleared
      setIsQuerying(false);
      setIsRagQuerying(false);
      setIsHybridQuerying(false);
      setIsDirectQuerying(false);

    } catch (err) {
      console.error('Query error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Set error for all pipelines if the request itself failed
      setRagError(errorMessage);
      setHybridError(errorMessage);
      setDirectError(errorMessage);
      
      setIsQuerying(false);
      setIsRagQuerying(false);
      setIsHybridQuerying(false);
      setIsDirectQuerying(false);
    }
  };

  // Determine if we have query results for Performance tab
  const hasQueryResults = !!(ragResult || hybridResult || directResult);

  // Get document name for badge
  const documentName = uploadResult?.ragStatus === 'success' || uploadResult?.directStatus === 'success'
    ? 'Uploaded'
    : undefined;

  return (
    <MetricsTabProvider>
      <div className="min-h-screen bg-unkey-black relative overflow-hidden">
          {/* Background Effects */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-unkey-teal/5 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-unkey-cyan/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-unkey-teal/3 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <header className="relative border-b border-unkey-gray-800">
            <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center space-y-4 animate-fadeIn">
                {/* Title with Glow Effect */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-unkey-teal/20 to-unkey-cyan/20 blur-2xl" />
                  <h1 className="relative text-5xl sm:text-6xl font-bold text-white mb-2">
                    RAG vs Direct Context
                  </h1>
                </div>
                <p className="text-lg sm:text-xl text-unkey-gray-300 max-w-3xl mx-auto">
                  Compare Retrieval-Augmented Generation (RAG) with direct context window ingestion.
                  Upload a document once, ask questions to both approaches, and see which works best.
                </p>
              </div>
            </div>
          </header>

          {/* Global Configuration Bar */}
          <GlobalConfigBar
            ollamaModel={ollamaModel}
            onOllamaModelChange={setOllamaModel}
            isOllamaAvailable={isOllamaAvailable}
            availableOllamaModels={availableOllamaModels}
            pricingModel={pricingModel}
            onPricingModelChange={setPricingModel}
          />

          {/* Tabbed Content */}
          <TabContainer
          hasDocument={!!documentId}
          hasQueryResults={hasQueryResults}
          documentName={documentName}
          queryCount={queryCount}
        >
          {({ activeTab }) => (
            <>
              {/* Ingest Tab */}
              <TabPanel tabId="ingest" activeTab={activeTab}>
                <IngestTab
                  onUploadComplete={handleUploadComplete}
                  onUploadResult={handleUploadResult}
                  onUploadStart={handleUploadStart}
                  onStreamingProgressChange={handleStreamingProgressChange}
                  uploadResult={uploadResult}
                  streamingProgress={streamingProgress}
                />
              </TabPanel>

              {/* Query Tab */}
              <TabPanel tabId="query" activeTab={activeTab}>
                <QueryTab
                  documentId={documentId}
                  documentTokens={uploadResult?.ragTokens}
                  processedContent={uploadResult?.directProcessedText}
                  onQueryBoth={handleQueryBoth}
                  isLoading={isQuerying}
                  ragResult={ragResult}
                  isRagQuerying={isRagQuerying}
                  ragError={ragError}
                  ragProcessingEvents={ragProcessingEvents}
                  hybridResult={hybridResult}
                  isHybridQuerying={isHybridQuerying}
                  hybridError={hybridError}
                  hybridProcessingEvents={hybridProcessingEvents}
                  ollamaModel={ollamaModel}
                  availableOllamaModels={availableOllamaModels}
                  isOllamaAvailable={isOllamaAvailable}
                  directResult={directResult}
                  isDirectQuerying={isDirectQuerying}
                  directError={directError}
                  directProcessingEvents={directProcessingEvents}
                />
              </TabPanel>

              {/* Performance Tab */}
              <TabPanel tabId="performance" activeTab={activeTab}>
                <PerformanceTab
                  ragResult={ragResult}
                  hybridResult={hybridResult}
                  directResult={directResult}
                  documentTokens={uploadResult?.ragTokens}
                  processedContent={uploadResult?.directProcessedText}
                  ollamaModel={ollamaModel}
                  availableOllamaModels={availableOllamaModels}
                  isOllamaAvailable={isOllamaAvailable}
                />
              </TabPanel>

              {/* Charts Tab */}
              <TabPanel tabId="charts" activeTab={activeTab}>
                <ChartsTab />
              </TabPanel>
            </>
          )}
        </TabContainer>

        {/* Footer */}
        <footer className="relative mt-16 border-t border-unkey-gray-800">
          <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center space-y-2">
              <p className="text-sm text-unkey-gray-400">
                RAG Comparison Tool - Evaluate which approach works best for your use case
              </p>
              <p className="text-xs text-unkey-gray-500">
                Built with Next.js, OpenAI, and Unkey-inspired design
              </p>
            </div>
          </div>
        </footer>
      </div>
    </MetricsTabProvider>
  );
}

export default function Home() {
  return (
    <FilterProvider>
      <HomeContent />
    </FilterProvider>
  );
}

// Made with Bob
