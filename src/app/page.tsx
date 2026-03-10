'use client';

import { useState } from 'react';
import { DocumentUpload, UploadResultData } from '@/components/DocumentUpload';
import { RagSection } from '@/components/RagSection';
import { DirectModelSection } from '@/components/DirectModelSection';
import { RagUploadResult } from '@/components/RagUploadResult';
import { DirectUploadResult } from '@/components/DirectUploadResult';

export default function Home() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResultData | null>(null);

  const handleUploadComplete = (docId: string) => {
    setDocumentId(docId);
  };

  const handleUploadResult = (result: UploadResultData) => {
    setUploadResult(result);
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

        {/* Side-by-Side Comparison */}
        {documentId ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* RAG Section */}
            <div className="space-y-6">
              <RagSection documentId={documentId} />
            </div>

            {/* Direct Model Section */}
            <div className="space-y-6">
              <DirectModelSection documentId={documentId} />
            </div>
          </div>
        ) : (
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
