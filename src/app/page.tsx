'use client';

import { useState } from 'react';
import { DocumentUpload } from '@/components/DocumentUpload';
import { QueryForm } from '@/components/QueryForm';
import { ComparisonResults } from '@/components/ComparisonResults';
import { ComparisonResult } from '@/types/rag-comparison';

export default function Home() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (docId: string) => {
    setDocumentId(docId);
    setComparisonResult(null);
    setError(null);
  };

  const handleQuery = async (query: string, temperature?: number, maxTokens?: number) => {
    if (!documentId) {
      setError('Please upload a document first');
      return;
    }

    setIsQuerying(true);
    setError(null);

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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

      const result = await response.json();
      setComparisonResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setComparisonResult(null);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              RAG vs Direct Context Comparison
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Compare Retrieval-Augmented Generation (RAG) with direct context window ingestion.
              Upload a document, ask questions, and see which approach works best.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Upload Section */}
          <section>
            <DocumentUpload onUploadComplete={handleUploadComplete} />
          </section>

          {/* Query Section */}
          {documentId && (
            <section>
              <QueryForm 
                onSubmit={handleQuery} 
                isLoading={isQuerying}
                disabled={!documentId}
              />
            </section>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
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
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isQuerying && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-center gap-3">
                <svg 
                  className="animate-spin h-8 w-8 text-blue-600" 
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
                  <p className="text-lg font-semibold text-blue-900">
                    Processing your query...
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Running both RAG and Direct approaches for comparison
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {comparisonResult && !isQuerying && (
            <section>
              <ComparisonResults result={comparisonResult} />
            </section>
          )}

          {/* Instructions (shown when no document uploaded) */}
          {!documentId && !comparisonResult && (
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
                
                <div className="text-left space-y-3 text-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      1
                    </span>
                    <p>
                      <strong className="text-gray-900">Upload a document:</strong> Choose a text file and configure chunking settings
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      2
                    </span>
                    <p>
                      <strong className="text-gray-900">Ask a question:</strong> Enter your query about the document
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      3
                    </span>
                    <p>
                      <strong className="text-gray-900">Compare results:</strong> See side-by-side comparison of RAG vs Direct approaches with detailed metrics
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            RAG Comparison Tool - Evaluate which approach works best for your use case
          </p>
        </div>
      </footer>
    </div>
  );
}

// Made with Bob
