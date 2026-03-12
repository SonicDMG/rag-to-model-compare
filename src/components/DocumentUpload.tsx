'use client';

import { useState, useRef, DragEvent } from 'react';
import { SUPPORTED_MODELS } from '@/lib/constants/models';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'partial' | 'error';
  message?: string;
  ragStatus?: 'success' | 'error';
  ragChunks?: number;
  ragTokens?: number;
  ragError?: string;
  directStatus?: 'success' | 'error';
  directTokens?: number;
  directWarnings?: string[];
  directError?: string;
}

export interface UploadResultData {
  ragStatus?: 'success' | 'error';
  ragChunks?: number;
  ragTokens?: number;
  ragIndexTime?: number;
  ragProcessedText?: string;
  ragError?: string;
  directStatus?: 'success' | 'error';
  directTokens?: number;
  directLoadTime?: number;
  directWarnings?: string[];
  directProcessedText?: string;
  directError?: string;
  hasImages?: boolean;
  imageCount?: number;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
  onUploadResult?: (result: UploadResultData) => void;
}

interface UploadProgress {
  current: number;
  total: number;
  currentFile?: string;
}

export function DocumentUpload({ onUploadComplete, onUploadResult }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'single' | 'folder'>('single');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ current: 0, total: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [model, setModel] = useState('gpt-4-turbo');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to validate file types
  const isValidFileType = (file: File): boolean => {
    const validExtensions = ['.txt', '.md', '.json', '.pdf', '.docx', '.doc'];
    return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Recursive folder traversal for drag & drop
  const traverseDirectory = async (
    entry: FileSystemDirectoryEntry,
    path: string = ''
  ): Promise<File[]> => {
    const collectedFiles: File[] = [];
    const reader = entry.createReader();
    
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };
    
    let entries = await readEntries();
    
    while (entries.length > 0) {
      for (const entry of entries) {
        const fullPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.isDirectory) {
          const subFiles = await traverseDirectory(
            entry as FileSystemDirectoryEntry,
            fullPath
          );
          collectedFiles.push(...subFiles);
        } else if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry;
          const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
          });
          
          if (isValidFileType(file)) {
            // Preserve folder structure
            Object.defineProperty(file, 'webkitRelativePath', {
              value: fullPath,
              writable: false,
              configurable: true
            });
            collectedFiles.push(file);
          }
        }
      }
      entries = await readEntries();
    }
    
    return collectedFiles;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = Array.from(e.dataTransfer.items);
    const collectedFiles: File[] = [];
    
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isDirectory) {
            const dirFiles = await traverseDirectory(
              entry as FileSystemDirectoryEntry
            );
            collectedFiles.push(...dirFiles);
          } else {
            const file = item.getAsFile();
            if (file && isValidFileType(file)) {
              collectedFiles.push(file);
            }
          }
        }
      }
    }
    
    if (collectedFiles.length > 0) {
      setFiles(collectedFiles);
      setUploadStatus({ status: 'idle' });
    } else {
      setUploadStatus({
        status: 'error',
        message: 'No valid files found. Please upload supported file types (TXT, MD, JSON, PDF, DOCX, DOC)'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const fileArray = Array.from(selectedFiles).filter(isValidFileType);
      if (fileArray.length > 0) {
        setFiles(fileArray);
        setUploadStatus({ status: 'idle' });
      } else {
        setUploadStatus({
          status: 'error',
          message: 'No valid files selected. Please upload supported file types (TXT, MD, JSON, PDF, DOCX, DOC)'
        });
      }
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !model) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    setUploadStatus({ status: 'uploading', message: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...` });

    try {
      const formData = new FormData();
      
      // Add all files to FormData
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('model', model);

      const response = await fetch('/api/rag-comparison/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      // Check if request completely failed
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Handle single file response (backward compatible)
      if ('data' in result && result.data && !Array.isArray(result.data)) {
        // Single file response
        const ragSuccess = result.data?.rag?.status === 'success';
        const directSuccess = result.data?.direct?.status === 'success';

        let overallStatus: 'success' | 'partial' | 'error';
        let message: string;

        if (ragSuccess && directSuccess) {
          overallStatus = 'success';
          message = 'Document processed successfully for both RAG and Direct approaches!';
        } else if (ragSuccess || directSuccess) {
          overallStatus = 'partial';
          message = 'Document partially processed. ';
          if (ragSuccess) {
            message += 'RAG approach succeeded, but Direct approach failed.';
          } else {
            message += 'Direct approach succeeded, but RAG approach failed.';
          }
        } else {
          overallStatus = 'error';
          message = 'Both processing approaches failed.';
        }

        const uploadResultData = {
          ragStatus: result.data?.rag?.status,
          ragChunks: result.data?.rag?.chunkCount,
          ragTokens: result.data?.rag?.tokenCount,
          ragIndexTime: result.data?.rag?.indexTime,
          ragProcessedText: result.data?.rag?.processedText,
          ragError: result.data?.rag?.error,
          directStatus: result.data?.direct?.status,
          directTokens: result.data?.direct?.tokenCount,
          directLoadTime: result.data?.direct?.loadTime,
          directWarnings: result.data?.direct?.warnings,
          directProcessedText: result.data?.direct?.processedText,
          directError: result.data?.direct?.error,
          hasImages: result.data?.hasImages,
          imageCount: result.data?.imageCount,
        };

        setUploadStatus({
          status: overallStatus,
          message,
          ...uploadResultData,
        });

        // Call callbacks if at least one approach succeeded
        if (ragSuccess || directSuccess) {
          if (onUploadComplete) {
            onUploadComplete(result.data.documentId);
          }
          if (onUploadResult) {
            onUploadResult(uploadResultData);
          }
        }
      } else {
        // Multi-file response
        const successCount = result.results?.filter((r: any) => 
          r.data?.rag?.status === 'success' || r.data?.direct?.status === 'success'
        ).length || 0;
        
        const overallStatus: 'success' | 'partial' | 'error' = 
          successCount === files.length ? 'success' :
          successCount > 0 ? 'partial' : 'error';
        
        const message = 
          overallStatus === 'success' ? `All ${files.length} files processed successfully!` :
          overallStatus === 'partial' ? `${successCount} of ${files.length} files processed successfully.` :
          'All files failed to process.';

        setUploadStatus({
          status: overallStatus,
          message,
        });

        // For multi-file, we don't call the single callbacks
        // The parent component should handle the multi-file response differently
      }
      
      setFiles([]);
    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const availableModels = Object.entries(SUPPORTED_MODELS)
    .filter(([_, config]) => config.available)
    .map(([id, config]) => ({ id, name: config.name }));

  return (
    <div className="w-full space-y-6">
      <div className="bg-unkey-gray-900 border border-unkey-gray-700 rounded-unkey-lg shadow-unkey-card p-6">
        <h2 className="text-2xl font-bold mb-4 text-white">Upload Document</h2>
        
        {/* Upload Mode Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={uploadMode === 'folder'}
              onChange={(e) => {
                setUploadMode(e.target.checked ? 'folder' : 'single');
                setFiles([]);
                setUploadStatus({ status: 'idle' });
              }}
              className="w-4 h-4 text-unkey-teal-500 bg-unkey-gray-850 border-unkey-gray-600 rounded focus:ring-unkey-teal-500 focus:ring-2"
            />
            <span className="text-sm text-unkey-gray-200">Upload entire folder</span>
          </label>
        </div>
        
        {/* Drag and Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-unkey-md p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? 'border-unkey-teal-500 bg-unkey-gray-850 shadow-[0_0_20px_rgba(20,184,166,0.15)]'
              : 'border-unkey-gray-600 bg-unkey-gray-850 hover:border-unkey-teal-500 hover:shadow-[0_0_15px_rgba(20,184,166,0.1)]'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.pdf,.docx,.doc"
            multiple={uploadMode === 'folder'}
            {...(uploadMode === 'folder' ? { webkitdirectory: '' } : {})}
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File upload"
          />
          
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-unkey-gray-500"
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
            
            {files.length > 0 ? (
              <p className="text-sm text-unkey-gray-300">
                <span className="font-medium text-unkey-teal-500">
                  {files.length} file{files.length > 1 ? 's' : ''} selected
                </span>
                <br />
                Click to change {uploadMode === 'folder' ? 'folder' : 'file'}
              </p>
            ) : (
              <p className="text-sm text-unkey-gray-300">
                <span className="font-medium text-unkey-teal-500">Click to upload</span> or drag and drop
                <br />
                {uploadMode === 'folder' ? 'Folder with ' : ''}TXT, MD, JSON, PDF, DOCX, DOC files
              </p>
            )}
          </div>
        </div>

        {/* File List Display */}
        {files.length > 0 && (
          <div className="mt-4 p-4 border border-unkey-gray-700 rounded-unkey-md bg-unkey-gray-850">
            <h3 className="font-semibold mb-2 text-white">
              Selected Files ({files.length})
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm py-1">
                  <span className="truncate text-unkey-gray-300 flex-1">
                    {(file as any).webkitRelativePath || file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-red-400 hover:text-red-300 ml-2 px-2"
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-unkey-gray-400">
              Total size: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div className="mt-6">
          <label htmlFor="model" className="block text-sm font-medium text-unkey-gray-200 mb-2">
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 bg-unkey-gray-850 border border-unkey-gray-600 text-white rounded-unkey-md focus:ring-2 focus:ring-unkey-teal-500/20 focus:border-unkey-teal-500 transition-all duration-200"
            disabled={isUploading}
          >
            {availableModels.map(({ id, name }) => (
              <option key={id} value={id} className="bg-unkey-gray-850">
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading}
          className="mt-6 w-full bg-white text-black py-3 px-4 rounded-unkey-md hover:bg-unkey-gray-100 disabled:bg-unkey-gray-700 disabled:text-unkey-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-medium"
        >
          {isUploading
            ? 'Processing...'
            : `Upload and Process ${files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : ''}`}
        </button>

        {/* Progress Display for Multi-file Uploads */}
        {isUploading && uploadProgress.total > 1 && (
          <div className="mt-4 p-4 border border-unkey-gray-700 rounded-unkey-md bg-unkey-gray-850">
            <div className="flex justify-between text-sm mb-2 text-unkey-gray-300">
              <span>Uploading files...</span>
              <span>{uploadProgress.current} / {uploadProgress.total}</span>
            </div>
            <div className="w-full bg-unkey-gray-700 rounded-full h-2">
              <div
                className="bg-unkey-teal-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                }}
              />
            </div>
            {uploadProgress.currentFile && (
              <div className="text-xs text-unkey-gray-400 mt-2">
                Processing: {uploadProgress.currentFile}
              </div>
            )}
          </div>
        )}

        {/* Status Display */}
        {uploadStatus.status !== 'idle' && (
          <div className={`
            mt-4 p-4 rounded-unkey-md border transition-all duration-200
            ${uploadStatus.status === 'success' ? 'bg-unkey-teal-500/10 border-unkey-teal-500/30' : ''}
            ${uploadStatus.status === 'partial' ? 'bg-yellow-500/10 border-yellow-500/30' : ''}
            ${uploadStatus.status === 'error' ? 'bg-red-500/10 border-red-500/30' : ''}
            ${uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' ? 'bg-unkey-teal-500/10 border-unkey-teal-500/30' : ''}
          `}>
            <div className="flex items-start">
              {uploadStatus.status === 'success' && (
                <svg className="h-5 w-5 text-unkey-teal-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {uploadStatus.status === 'partial' && (
                <svg className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {uploadStatus.status === 'error' && (
                <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
                <svg className="animate-spin h-5 w-5 text-unkey-teal-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              
              <div className="flex-1">
                <p className={`text-sm font-medium
                  ${uploadStatus.status === 'success' ? 'text-unkey-teal-400' : ''}
                  ${uploadStatus.status === 'partial' ? 'text-yellow-400' : ''}
                  ${uploadStatus.status === 'error' ? 'text-red-400' : ''}
                  ${uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' ? 'text-unkey-teal-400' : ''}
                `}>
                  {uploadStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob