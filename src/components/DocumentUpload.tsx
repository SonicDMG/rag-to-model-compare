'use client';

import { useState, useRef, DragEvent } from 'react';
import { ProcessingProgressIndicator } from './ProcessingProgressIndicator';

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
  fileSize?: number;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
  onUploadResult?: (result: UploadResultData) => void;
}

interface FileStatus {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'partial' | 'error';
  error?: string;
  ragStatus?: 'success' | 'error';
  directStatus?: 'success' | 'error';
}

export function DocumentUpload({ onUploadComplete, onUploadResult }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'single' | 'folder'>('single');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [isUploading, setIsUploading] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  
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

  // Upload a single file and return the result
  const uploadSingleFile = async (
    file: File,
    index: number,
    sharedDocumentId?: string
  ): Promise<any> => {
    // Mark as processing
    setFileStatuses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'processing' };
      return updated;
    });

    const formData = new FormData();
    formData.append('files', file);  // Single file
    
    // If this is part of a multi-file upload, include the shared document ID
    if (sharedDocumentId) {
      formData.append('sharedDocumentId', sharedDocumentId);
    }

    const response = await fetch('/api/rag-comparison/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Handle single-file response
    if ('data' in result && result.data) {
      return {
        filename: file.name,
        relativePath: (file as any).webkitRelativePath || file.name,
        documentId: result.data.documentId,
        hasImages: result.data.hasImages,
        imageCount: result.data.imageCount,
        rag: result.data.rag,
        direct: result.data.direct
      };
    }

    throw new Error('Unexpected response format');
  };

  // Update file status based on upload result
  const updateFileStatus = (
    index: number,
    status: 'pending' | 'processing' | 'success' | 'partial' | 'error',
    result?: any
  ) => {
    setFileStatuses(prev => {
      const updated = [...prev];

      if (status === 'success' && result) {
        const ragSuccess = result.rag?.status === 'success';
        const directSuccess = result.direct?.status === 'success';

        if (ragSuccess && directSuccess) {
          updated[index] = {
            ...updated[index],
            status: 'success',
            ragStatus: result.rag?.status,
            directStatus: result.direct?.status
          };
        } else if (ragSuccess || directSuccess) {
          updated[index] = {
            ...updated[index],
            status: 'partial',
            ragStatus: result.rag?.status,
            directStatus: result.direct?.status,
            error: `${!ragSuccess ? 'RAG' : 'Direct'} pipeline failed`
          };
        } else {
          updated[index] = {
            ...updated[index],
            status: 'error',
            ragStatus: result.rag?.status,
            directStatus: result.direct?.status,
            error: result.rag?.error || result.direct?.error || 'Both pipelines failed'
          };
        }
      } else if (status === 'error' && result?.error) {
        updated[index] = {
          ...updated[index],
          status: 'error',
          error: result.error
        };
      } else {
        updated[index] = { ...updated[index], status };
      }

      return updated;
    });
  };

  // Upload files in parallel with concurrency limit
  const uploadFilesInParallel = async (files: File[], concurrency: number = 4) => {
    const results: any[] = [];
    let successCount = 0;
    let partialCount = 0;
    let errorCount = 0;
    let firstSuccessfulDocumentId: string | null = null;
    let firstSuccessfulResult: any = null;

    // For multi-file uploads, generate a shared document ID for Direct pipeline
    const sharedDocumentId = files.length > 1
      ? `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      : undefined;

    // Process files in batches of 'concurrency'
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);

      // Upload batch in parallel, passing shared document ID for multi-file uploads
      const batchPromises = batch.map((file, batchIndex) =>
        uploadSingleFile(file, i + batchIndex, sharedDocumentId)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, batchIndex) => {
        const fileIndex = i + batchIndex;
        if (result.status === 'fulfilled') {
          results.push(result.value);
          updateFileStatus(fileIndex, 'success', result.value);
          
          // Count success types
          const ragSuccess = result.value.rag?.status === 'success';
          const directSuccess = result.value.direct?.status === 'success';
          
          if (ragSuccess && directSuccess) {
            successCount++;
            // Store first successful upload for callbacks
            if (!firstSuccessfulDocumentId) {
              firstSuccessfulDocumentId = result.value.documentId;
              firstSuccessfulResult = result.value;
            }
          } else if (ragSuccess || directSuccess) {
            partialCount++;
            // Store first partial success for callbacks if no full success yet
            if (!firstSuccessfulDocumentId) {
              firstSuccessfulDocumentId = result.value.documentId;
              firstSuccessfulResult = result.value;
            }
          } else {
            errorCount++;
          }
        } else {
          errorCount++;
          updateFileStatus(fileIndex, 'error', { error: result.reason.message });
        }
      });
    }

    // Aggregate results for multi-file uploads
    let aggregatedResult = null;
    if (results.length > 0) {
      // Combine processed text from all files with separators
      const ragProcessedTexts = results
        .filter(r => r.rag?.processedText)
        .map(r => `=== ${r.filename} ===\n${r.rag?.processedText}`)
        .join('\n\n');
      
      const directProcessedTexts = results
        .filter(r => r.direct?.processedText)
        .map(r => `=== ${r.filename} ===\n${r.direct?.processedText}`)
        .join('\n\n');

      // For batch uploads with shared document ID, the LAST file contains the TOTAL token count
      // for all files combined (accumulated). Don't sum them up or we'll get inflated counts!
      const lastResult = results[results.length - 1];
      
      // Use the last file's token count for Direct (it contains the cumulative total)
      // For RAG, we still sum because each file is indexed separately
      const directTokenCount = lastResult.direct?.tokenCount || 0;
      const ragTokenCount = results.reduce((sum, r) => sum + (r.rag?.tokenCount || 0), 0);

      aggregatedResult = {
        documentId: firstSuccessfulDocumentId,
        filename: `${files.length} files`,
        hasImages: results.some(r => r.hasImages),
        imageCount: results.reduce((sum, r) => sum + (r.imageCount || 0), 0),
        fileSize: files.reduce((sum, file) => sum + file.size, 0),
        rag: {
          status: results.some(r => r.rag?.status === 'success') ? 'success' : 'error',
          chunkCount: results.reduce((sum, r) => sum + (r.rag?.chunkCount || 0), 0),
          tokenCount: ragTokenCount,
          indexTime: results.reduce((sum, r) => sum + (r.rag?.indexTime || 0), 0),
          processedText: ragProcessedTexts || undefined,
          error: results.filter(r => r.rag?.error).map(r => r.rag?.error).join('; ') || undefined
        },
        direct: {
          status: results.some(r => r.direct?.status === 'success') ? 'success' : 'error',
          tokenCount: directTokenCount, // Use last file's cumulative count, not sum!
          loadTime: results.reduce((sum, r) => sum + (r.direct?.loadTime || 0), 0),
          withinLimit: results.every(r => r.direct?.withinLimit !== false),
          warnings: results.flatMap(r => r.direct?.warnings || []),
          processedText: directProcessedTexts || undefined,
          error: results.filter(r => r.direct?.error).map(r => r.direct?.error).join('; ') || undefined
        }
      };
    }

    return {
      results,
      successCount,
      partialCount,
      errorCount,
      firstSuccessfulDocumentId,
      firstSuccessfulResult,
      aggregatedResult
    };
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus({ status: 'uploading', message: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...` });

    // Initialize all files as pending
    const initialStatuses: FileStatus[] = files.map(file => ({
      file,
      status: 'pending' as const,
    }));
    setFileStatuses(initialStatuses);

    try {
      // Upload files in parallel (4 at a time)
      const {
        successCount,
        partialCount,
        firstSuccessfulDocumentId,
        firstSuccessfulResult,
        aggregatedResult
      } = await uploadFilesInParallel(files, 4);

      // Determine overall status
      const totalFiles = files.length;
      let overallStatus: 'success' | 'partial' | 'error';
      let message: string;

      if (successCount === totalFiles) {
        overallStatus = 'success';
        message = `All ${totalFiles} file${totalFiles > 1 ? 's' : ''} processed successfully!`;
      } else if (successCount + partialCount > 0) {
        overallStatus = 'partial';
        message = `${successCount + partialCount} of ${totalFiles} file${totalFiles > 1 ? 's' : ''} processed successfully.`;
        if (partialCount > 0) {
          message += ` (${partialCount} partial)`;
        }
      } else {
        overallStatus = 'error';
        message = 'All files failed to process.';
      }

      // Determine which result to use (single file or aggregated)
      const resultToUse = files.length === 1 ? firstSuccessfulResult : aggregatedResult;

      // Include detailed status for both single and multi-file uploads
      if (resultToUse) {
        const uploadResultData = {
          ragStatus: resultToUse.rag?.status,
          ragChunks: resultToUse.rag?.chunkCount,
          ragTokens: resultToUse.rag?.tokenCount,
          ragIndexTime: resultToUse.rag?.indexTime,
          ragProcessedText: resultToUse.rag?.processedText,
          ragError: resultToUse.rag?.error,
          directStatus: resultToUse.direct?.status,
          directTokens: resultToUse.direct?.tokenCount,
          directLoadTime: resultToUse.direct?.loadTime,
          directWarnings: resultToUse.direct?.warnings,
          directProcessedText: resultToUse.direct?.processedText,
          directError: resultToUse.direct?.error,
          hasImages: resultToUse.hasImages,
          imageCount: resultToUse.imageCount,
          fileSize: resultToUse.fileSize || (files.length === 1 ? files[0].size : files.reduce((sum, file) => sum + file.size, 0)),
        };

        setUploadStatus({
          status: overallStatus,
          message,
          ...uploadResultData,
        });

        // Call callbacks if at least one file succeeded
        if (firstSuccessfulDocumentId && (successCount + partialCount > 0)) {
          if (onUploadComplete) {
            onUploadComplete(firstSuccessfulDocumentId);
          }
          if (onUploadResult) {
            onUploadResult(uploadResultData);
          }
        }
      } else {
        setUploadStatus({
          status: overallStatus,
          message,
        });
      }

      // Clear files after successful upload
      if (overallStatus !== 'error') {
        setFiles([]);
      }
    } catch (error) {
      // Mark all files as error
      setFileStatuses(prev => prev.map(fs => ({
        ...fs,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed'
      })));

      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

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

        {/* Per-File Status Display */}
        {isUploading && fileStatuses.length > 0 && (
          <div className="mt-4 p-4 border border-unkey-gray-700 rounded-unkey-md bg-unkey-gray-850">
            <h3 className="font-semibold text-white mb-4">Upload Progress</h3>
            
            {/* Marching Boxes Progress Indicator */}
            <div className="mb-4">
              <ProcessingProgressIndicator
                totalFiles={fileStatuses.length}
                completedFiles={fileStatuses.filter(fs =>
                  fs.status === 'success' || fs.status === 'partial' || fs.status === 'error'
                ).length}
                processingFiles={fileStatuses.filter(fs => fs.status === 'processing').length}
                isActive={isUploading}
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {fileStatuses.map((fileStatus, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded bg-unkey-gray-900 border border-unkey-gray-700"
                >
                  <div className="flex-shrink-0">
                    {fileStatus.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                    )}
                    {fileStatus.status === 'processing' && (
                      <div className="w-5 h-5">
                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    {fileStatus.status === 'success' && (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                    {fileStatus.status === 'partial' && (
                      <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                    {fileStatus.status === 'error' && (
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate text-unkey-gray-200">
                      {(fileStatus.file as any).webkitRelativePath || fileStatus.file.name}
                    </div>
                    {fileStatus.status === 'partial' && (
                      <div className="text-xs text-yellow-400 mt-1">
                        {fileStatus.ragStatus === 'success' ? 'RAG succeeded, Direct failed' : 'Direct succeeded, RAG failed'}
                      </div>
                    )}
                    {fileStatus.error && (
                      <div className="text-xs text-red-400 mt-1 truncate">
                        {fileStatus.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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