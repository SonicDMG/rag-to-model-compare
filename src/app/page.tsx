'use client';

import { useState } from 'react';
import { DocumentUpload, UploadResultData } from '@/components/DocumentUpload';
import { RagUploadResult } from '@/components/RagUploadResult';
import { DirectUploadResult } from '@/components/DirectUploadResult';
import { RagSection } from '@/components/RagSection';
import { DirectModelSection } from '@/components/DirectModelSection';
import { UnifiedQuerySection } from '@/components/UnifiedQuerySection';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { RAGResult, DirectResult } from '@/types/rag-comparison';
import { MetricsTabProvider } from '@/contexts/MetricsTabContext';
import { DEFAULT_MODEL, SUPPORTED_MODELS } from '@/lib/constants/models';
import { recalculateRagMetrics, recalculateDirectMetrics } from '@/lib/rag-comparison/metrics-recalculator';

export default function Home() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResultData | null>(null);
  
  // Query state
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Model state - used for metrics recalculation (applies to both pipelines)
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  
  // RAG state
  const [ragResult, setRagResult] = useState<RAGResult | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [isRagQuerying, setIsRagQuerying] = useState(false);
  
  // Direct state
  const [directResult, setDirectResult] = useState<DirectResult | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const [isDirectQuerying, setIsDirectQuerying] = useState(false);

  const handleUploadComplete = (docId: string) => {
    setDocumentId(docId);
  };

  const handleUploadResult = (result: UploadResultData) => {
    setUploadResult(result);
  };

  const handleQueryBoth = async (query: string, temperature: number, maxTokens: number) => {
    if (!documentId) return;

    // Reset state for both pipelines
    setIsQuerying(true);
    setIsRagQuerying(true);
    setIsDirectQuerying(true);
    setRagError(null);
    setDirectError(null);
    setRagResult(null);
    setDirectResult(null);

    try {
      const response = await fetch('/api/rag-comparison/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          documentId,
          temperature,
          maxTokens,
          model: selectedModel, // Use selected model for initial query
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

            if (data.type === 'rag') {
              if (data.success) {
                console.log('✅ RAG result received and rendering');
                setRagResult(data.data);
                setIsRagQuerying(false);
              } else {
                console.error('❌ RAG error received:', data.error);
                setRagError(data.error);
                setIsRagQuerying(false);
              }
            } else if (data.type === 'direct') {
              if (data.success) {
                console.log('✅ Direct result received and rendering');
                setDirectResult(data.data);
                setIsDirectQuerying(false);
              } else {
                console.error('❌ Direct error received:', data.error);
                setDirectError(data.error);
                setIsDirectQuerying(false);
              }
            } else if (data.type === 'complete') {
              console.log('✅ Stream complete');
              setIsQuerying(false);
            }
          } catch (parseError) {
            console.error('Failed to parse SSE message:', parseError, message);
          }
        }
      }

      // Ensure loading states are cleared
      setIsQuerying(false);
      setIsRagQuerying(false);
      setIsDirectQuerying(false);

    } catch (err) {
      console.error('Query error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Set error for both if the request itself failed
      setRagError(errorMessage);
      setDirectError(errorMessage);
      
      setIsQuerying(false);
      setIsRagQuerying(false);
      setIsDirectQuerying(false);
    }
  };

  // Handle model change for BOTH pipelines - recalculate metrics locally
  const handleModelChange = (newModel: string) => {
    if (!ragResult || !directResult) {
      console.error('Cannot change model: results not available for both pipelines');
      return;
    }

    // Recalculate metrics with new model pricing for BOTH pipelines
    const updatedRagResult = recalculateRagMetrics(ragResult, newModel);
    const updatedDirectResult = recalculateDirectMetrics(directResult, newModel);
    
    setRagResult(updatedRagResult);
    setDirectResult(updatedDirectResult);
    setSelectedModel(newModel);
  };

  // Get list of available model IDs
  const availableModels = Object.keys(SUPPORTED_MODELS).filter(
    modelId => SUPPORTED_MODELS[modelId].available
  );

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Introduction */}
        <section className="animate-slideUp">
          <div className="bg-unkey-gray-900/50 backdrop-blur-sm rounded-xl border border-unkey-gray-800 p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-unkey-teal to-unkey-cyan rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-unkey-teal/20">
                    R
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">RAG Approach (Left)</h3>
                    <p className="text-sm text-unkey-gray-300 leading-relaxed">
                      Document is split into chunks, relevant pieces are retrieved based on your query,
                      and only those chunks are sent to the model for context.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                    D
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Direct Context Approach (Right)</h3>
                    <p className="text-sm text-unkey-gray-300 leading-relaxed">
                      The entire document is sent directly to the model's context window without
                      chunking or retrieval steps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Single Upload Section */}
        <section className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            onUploadResult={handleUploadResult}
          />
        </section>

        {/* Upload Results - Side by Side */}
        {uploadResult && (uploadResult.ragStatus || uploadResult.directStatus) && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <RagUploadResult
              status={uploadResult.ragStatus}
              chunkCount={uploadResult.ragChunks}
              tokenCount={uploadResult.ragTokens}
              indexTime={uploadResult.ragIndexTime}
              processedText={uploadResult.ragProcessedText}
              error={uploadResult.ragError}
              hasImages={uploadResult.hasImages}
              imageCount={uploadResult.imageCount}
            />
            <DirectUploadResult
              status={uploadResult.directStatus}
              tokenCount={uploadResult.directTokens}
              loadTime={uploadResult.directLoadTime}
              warnings={uploadResult.directWarnings}
              processedText={uploadResult.directProcessedText}
              error={uploadResult.directError}
              hasImages={uploadResult.hasImages}
              imageCount={uploadResult.imageCount}
            />
          </section>
        )}

        {/* Unified Query Section */}
        {documentId && (
          <section className="animate-slideUp" style={{ animationDelay: '0.3s' }}>
            <UnifiedQuerySection
              documentId={documentId}
              onQueryBoth={handleQueryBoth}
              isLoading={isQuerying}
            />
          </section>
        )}

        {/* Model Selector - Show when both results are available */}
        {documentId && ragResult && directResult && !isRagQuerying && !isDirectQuerying && (
          <section className="animate-slideUp" style={{ animationDelay: '0.4s' }}>
            <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Model Configuration</h2>
              <p className="text-sm text-unkey-gray-400 mb-6">
                Change the model to recalculate metrics for both RAG and Direct pipelines. No re-query needed - metrics update instantly.
              </p>
              
              <div className="max-w-md">
                <ModelSelector
                  currentModel={selectedModel}
                  availableModels={availableModels}
                  onModelChange={handleModelChange}
                  disabled={false}
                  isLoading={false}
                />
              </div>
            </div>
          </section>
        )}

        {/* Side-by-Side Answer Sections - Show during loading or when results are available */}
        {documentId && (isRagQuerying || isDirectQuerying || ragResult || directResult) && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slideUp" style={{ animationDelay: '0.5s' }}>
            <RagSection
              ragResult={ragResult}
              isQuerying={isRagQuerying}
              error={ragError}
              documentTokens={uploadResult?.ragTokens}
            />
            <DirectModelSection
              directResult={directResult}
              isQuerying={isDirectQuerying}
              error={directError}
              documentTokens={uploadResult?.directTokens}
            />
          </section>
        )}

        {/* Get Started Message */}
        {!documentId && (
          <section className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <div className="bg-unkey-gray-900/50 backdrop-blur-sm rounded-xl border border-unkey-gray-800 p-8 sm:p-12 text-center">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-unkey-teal/10 blur-2xl rounded-full" />
                  <svg
                    className="relative mx-auto h-16 w-16 text-unkey-teal"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Get Started
                </h2>
                
                <p className="text-unkey-gray-300 leading-relaxed">
                  Upload a document above to begin comparing RAG and Direct Context approaches.
                  The same document will be processed by both pipelines, allowing you to query each independently.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Benefits Comparison */}
        <section className="animate-slideUp" style={{ animationDelay: '0.5s' }}>
          <div className="bg-unkey-gray-900/50 backdrop-blur-sm rounded-xl border border-unkey-gray-800 p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
              When to Use Each Approach
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RAG Benefits */}
              <div className="bg-gradient-to-br from-unkey-teal/10 to-unkey-cyan/10 rounded-xl p-6 border border-unkey-teal/20 hover:border-unkey-teal/40 transition-colors">
                <h3 className="text-lg font-bold text-unkey-teal mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-unkey-teal rounded-full" />
                  RAG is Better For:
                </h3>
                <ul className="space-y-3 text-sm text-unkey-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-unkey-teal mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Large documents</strong> that exceed context window limits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-unkey-teal mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Cost optimization</strong> when only specific sections are needed</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-unkey-teal mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Source attribution</strong> with specific chunk citations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-unkey-teal mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Multiple documents</strong> in a knowledge base</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-unkey-teal mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Focused queries</strong> about specific topics</span>
                  </li>
                </ul>
              </div>

              {/* Direct Benefits */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full" />
                  Direct Context is Better For:
                </h3>
                <ul className="space-y-3 text-sm text-unkey-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Small to medium documents</strong> that fit in context</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Holistic understanding</strong> requiring full document context</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Simpler implementation</strong> with no retrieval step</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Cross-referencing</strong> information across the document</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">Faster processing</strong> with no retrieval overhead</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-unkey-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

// Made with Bob
