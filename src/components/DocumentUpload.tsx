'use client';

import { useState, useRef, DragEvent } from 'react';
import { SUPPORTED_MODELS } from '@/lib/constants/models';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
  ragChunks?: number;
  ragTokens?: number;
  directTokens?: number;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [model, setModel] = useState('gpt-4-turbo');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const extension = droppedFile.name.toLowerCase().match(/\.[^.]+$/)?.[0];
      const allowedExtensions = ['.txt', '.md', '.json', '.pdf', '.docx', '.doc'];
      
      if (extension && allowedExtensions.includes(extension)) {
        setFile(droppedFile);
        setUploadStatus({ status: 'idle' });
      } else {
        setUploadStatus({
          status: 'error',
          message: 'Please upload a supported file type (TXT, MD, JSON, PDF, DOCX, DOC)'
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus({ status: 'idle' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus({ status: 'uploading', message: 'Uploading document...' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', model);

      const response = await fetch('/api/rag-comparison/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadStatus({
        status: 'success',
        message: 'Document processed successfully!',
        ragChunks: result.ragChunks,
        ragTokens: result.ragTokens,
        directTokens: result.directTokens,
      });

      if (onUploadComplete) {
        onUploadComplete(result.documentId);
      }
    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };

  const availableModels = Object.entries(SUPPORTED_MODELS)
    .filter(([_, config]) => config.available)
    .map(([id, config]) => ({ id, name: config.name }));

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Upload Document</h2>
        
        {/* Drag and Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.pdf,.docx,.doc"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File upload"
          />
          
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            {file ? (
              <p className="text-sm text-gray-600">
                <span className="font-medium text-blue-600">{file.name}</span>
                <br />
                Click to change file
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                <br />
                TXT, MD, JSON, PDF, DOCX, DOC files
              </p>
            )}
          </div>
        </div>

        {/* Model Selection */}
        <div className="mt-6">
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
          >
            {availableModels.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
          className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'
            ? 'Processing...'
            : 'Upload and Process'}
        </button>

        {/* Status Display */}
        {uploadStatus.status !== 'idle' && (
          <div className={`
            mt-4 p-4 rounded-lg
            ${uploadStatus.status === 'success' ? 'bg-green-50 border border-green-200' : ''}
            ${uploadStatus.status === 'error' ? 'bg-red-50 border border-red-200' : ''}
            ${uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' ? 'bg-blue-50 border border-blue-200' : ''}
          `}>
            <div className="flex items-start">
              {uploadStatus.status === 'success' && (
                <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {uploadStatus.status === 'error' && (
                <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
                <svg className="animate-spin h-5 w-5 text-blue-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              
              <div className="flex-1">
                <p className={`text-sm font-medium
                  ${uploadStatus.status === 'success' ? 'text-green-800' : ''}
                  ${uploadStatus.status === 'error' ? 'text-red-800' : ''}
                  ${uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' ? 'text-blue-800' : ''}
                `}>
                  {uploadStatus.message}
                </p>
                
                {uploadStatus.status === 'success' && (
                  <div className="mt-2 text-sm text-green-700 space-y-1">
                    <p><strong>RAG Approach:</strong> {uploadStatus.ragChunks} chunks, {uploadStatus.ragTokens?.toLocaleString()} tokens</p>
                    <p><strong>Direct Approach:</strong> {uploadStatus.directTokens?.toLocaleString()} tokens</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob