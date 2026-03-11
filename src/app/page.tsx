'use client';

import { useState } from 'react';
import { DocumentUpload, UploadResultData } from '@/components/DocumentUpload';
import { QueryForm } from '@/components/QueryForm';
import { RagUploadResult } from '@/components/RagUploadResult';
import { DirectUploadResult } from '@/components/DirectUploadResult';
import { ExpandableText } from '@/components/ExpandableText';
import { RAGResult, DirectResult } from '@/types/rag-comparison';

export default function Home() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResultData | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [ragResult, setRagResult] = useState<RAGResult | null>(null);
  const [directResult, setDirectResult] = useState<DirectResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const handleUploadComplete = (docId: string) => {
    setDocumentId(docId);
    // Reset query results when a new document is uploaded
    setRagResult(null);
    setDirectResult(null);
    setQueryError(null);
  };

  const handleUploadResult = (result: UploadResultData) => {
    setUploadResult(result);
  };

  const handleQuery = async (query: string, docId: string, temperature?: number, maxTokens?: number) => {
    setIsQuerying(true);
    setQueryError(null);

    try {
      const response = await fetch('/api/rag-comparison/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          documentId: docId,
          temperature,
          maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

      const result = await response.json();
      
      // API returns data wrapped in { success: true, data: { rag, direct, comparison, summary } }
      if (result.success && result.data) {
        setRagResult(result.data.rag);
        setDirectResult(result.data.direct);
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'An error occurred');
      setRagResult(null);
      setDirectResult(null);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              RAG vs Direct Context Comparison
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Compare Retrieval-Augmented Generation (RAG) with direct context window ingestion.
              Upload a document once, ask questions to both approaches, and see which works best.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                  R
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">RAG Approach (Left)</h3>
                  <p className="text-sm text-gray-600">
                    Document is split into chunks, relevant pieces are retrieved based on your query, 
                    and only those chunks are sent to the model for context.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                  D
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Direct Context Approach (Right)</h3>
                  <p className="text-sm text-gray-600">
                    The entire document is sent directly to the model's context window without 
                    chunking or retrieval steps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Single Upload Section */}
        <section className="mb-8">
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            onUploadResult={handleUploadResult}
          />
        </section>

        {/* Upload Results - Side by Side */}
        {uploadResult && (uploadResult.ragStatus || uploadResult.directStatus) && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
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
          </div>
        )}

        {/* Single Query Section */}
        {documentId && (
          <section className="mb-8">
            <QueryForm
              documentId={documentId}
              onSubmit={handleQuery}
              isLoading={isQuerying}
            />
          </section>
        )}

        {/* Error Display */}
        {queryError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg 
                className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                  clipRule="evenodd" 
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{queryError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isQuerying && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-gray-300 rounded-lg p-8 mb-8">
            <div className="flex items-center justify-center gap-3">
              <svg 
                className="animate-spin h-10 w-10 text-blue-600" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                />
              </svg>
              <div>
                <p className="text-xl font-semibold text-gray-900">
                  Processing query with both approaches...
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Comparing RAG and Direct Context methods
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-Side Results */}
        {ragResult && directResult && !isQuerying && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            {/* RAG Results */}
            <div className="space-y-6">
              {/* RAG Header */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
                <h2 className="text-2xl font-bold text-green-900 mb-2">
                  RAG Approach
                </h2>
                <p className="text-green-700">
                  Retrieval-Augmented Generation: Document is chunked and relevant pieces are retrieved for context
                </p>
              </div>

              {/* RAG Answer */}
              <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Answer</h3>
                
                <div className="prose prose-sm max-w-none">
                  <ExpandableText text={ragResult.answer} characterLimit={400} />
                </div>

                {/* Source Citations */}
                {/* Retrieval Info - matches Direct's Context Window widget */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 min-h-[148px]">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Retrieval Information
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Chunks Retrieved</span>
                          <span className="font-bold text-green-700">
                            {ragResult.sources?.length || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Retrieval Time</span>
                          <span className="font-bold text-green-700">
                            {ragResult.metrics.retrievalTime.toFixed(0)}ms
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Only relevant chunks sent to model for context
                    </p>
                  </div>
                </div>

                {/* Source Citations */}
                {ragResult.sources && ragResult.sources.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Source Citations ({ragResult.sources.length})
                    </h4>
                    <div className="space-y-3">
                      {ragResult.sources.map((source, index) => (
                        <div
                          key={source.id}
                          className="bg-green-50 rounded-lg p-3 text-sm border border-green-200"
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-600 line-clamp-3">
                                {source.content}
                              </p>
                              {source.metadata?.index !== undefined && (
                                <p className="text-xs text-gray-500 mt-1">
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

              {/* RAG Metrics */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Generation Time</h4>
                    <p className="text-2xl font-bold text-green-700">
                      {ragResult.metrics.generationTime.toFixed(0)}ms
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Retrieval: {ragResult.metrics.retrievalTime.toFixed(0)}ms
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Tokens Used</h4>
                    <p className="text-2xl font-bold text-green-700">
                      {ragResult.metrics.tokens.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Retrieved chunks only
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Cost</h4>
                    <p className="text-2xl font-bold text-green-700">
                      ${ragResult.metrics.cost.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total: {(ragResult.metrics.retrievalTime + ragResult.metrics.generationTime).toFixed(0)}ms
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Results */}
            <div className="space-y-6">
              {/* Direct Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
                <h2 className="text-2xl font-bold text-blue-900 mb-2">
                  Direct Context Approach
                </h2>
                <p className="text-blue-700">
                  Full document is provided directly in the context window without chunking or retrieval
                </p>
              </div>

              {/* Direct Answer */}
              <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Answer</h3>
                
                <div className="prose prose-sm max-w-none">
                  <ExpandableText text={directResult.answer} characterLimit={400} />
                </div>

                {/* Context Window Info */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 min-h-[148px]">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Context Window Usage
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Usage Percentage</span>
                          <span className="font-bold text-blue-700">
                            {directResult.metrics.contextWindowUsage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(directResult.metrics.contextWindowUsage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Percentage of model's context window used by the full document
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Metrics */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Generation Time</h4>
                    <p className="text-2xl font-bold text-blue-700">
                      {directResult.metrics.generationTime.toFixed(0)}ms
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      No retrieval step needed
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Tokens Used</h4>
                    <p className="text-2xl font-bold text-blue-700">
                      {directResult.metrics.tokens.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Full document in context
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Cost</h4>
                    <p className="text-2xl font-bold text-blue-700">
                      ${directResult.metrics.cost.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Single API call
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Get Started Message */}
        {!documentId && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="max-w-2xl mx-auto space-y-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
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
              
              <h2 className="text-2xl font-bold text-gray-900">
                Get Started
              </h2>
              
              <p className="text-gray-600">
                Upload a document above to begin comparing RAG and Direct Context approaches.
                The same document will be processed by both pipelines, allowing you to query each independently.
              </p>
            </div>
          </div>
        )}

        {/* Benefits Comparison */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            When to Use Each Approach
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RAG Benefits */}
            <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
              <h3 className="text-lg font-bold text-green-900 mb-4">
                RAG is Better For:
              </h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Large documents</strong> that exceed context window limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Cost optimization</strong> when only specific sections are needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Source attribution</strong> with specific chunk citations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Multiple documents</strong> in a knowledge base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Focused queries</strong> about specific topics</span>
                </li>
              </ul>
            </div>

            {/* Direct Benefits */}
            <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-4">
                Direct Context is Better For:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span><strong>Small to medium documents</strong> that fit in context</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span><strong>Holistic understanding</strong> requiring full document context</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span><strong>Simpler implementation</strong> with no retrieval step</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span><strong>Cross-referencing</strong> information across the document</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span><strong>Faster processing</strong> with no retrieval overhead</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            RAG Comparison Tool - Evaluate which approach works best for your use case
          </p>
        </div>
      </footer>
    </div>
  );
}

// Made with Bob
