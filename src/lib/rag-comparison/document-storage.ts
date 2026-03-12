/**
 * In-Memory Document Storage
 * 
 * Simple in-memory storage for document content and metadata.
 * Used to store documents for retrieval during query execution.
 * 
 * Note: This is a simple implementation for development/demo purposes.
 * For production, consider using a persistent storage solution like Redis,
 * a database, or a file system with proper access controls.
 */

import type { DocumentMetadata, FolderMetadata } from '@/types/rag-comparison';

/**
 * Stored document with content and metadata
 */
export interface StoredDocument {
  /** Full document content */
  content: string;
  /** Document metadata */
  metadata: DocumentMetadata;
  /** Knowledge filter ID for RAG queries */
  filterId?: string;
  /** Folder metadata for multi-file uploads */
  folderMetadata?: FolderMetadata;
}

/**
 * In-memory document store
 * Maps document ID to stored document
 *
 * Using globalThis to persist across Next.js hot reloads in development
 */
const getDocumentStore = (): Map<string, StoredDocument> => {
  if (!globalThis.__documentStore) {
    globalThis.__documentStore = new Map<string, StoredDocument>();
  }
  return globalThis.__documentStore;
};

// Type augmentation for globalThis
declare global {
  var __documentStore: Map<string, StoredDocument> | undefined;
}

const documentStore = getDocumentStore();

/**
 * Stores a document in memory
 *
 * @param id - Unique document identifier
 * @param content - Full document content
 * @param metadata - Document metadata
 * @param filterId - Optional knowledge filter ID for RAG queries
 *
 * @example
 * ```typescript
 * storeDocument('doc-123', content, {
 *   filename: 'example.txt',
 *   size: 1024,
 *   mimeType: 'text/plain',
 *   uploadedAt: new Date(),
 *   chunkCount: 10,
 *   totalTokens: 500,
 *   strategy: 'fixed'
 * }, 'filter-123');
 * ```
 */
export function storeDocument(
  id: string,
  content: string,
  metadata: DocumentMetadata,
  filterId?: string
): void {
  if (!id || typeof id !== 'string') {
    throw new Error('Document ID is required and must be a string');
  }

  // Allow empty string content (for cases where RAG handles the file directly)
  if (typeof content !== 'string') {
    throw new Error('Document content must be a string (can be empty)');
  }

  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Document metadata is required and must be an object');
  }

  // Validate metadata has required fields
  const requiredFields: (keyof DocumentMetadata)[] = [
    'filename',
    'size',
    'mimeType',
    'uploadedAt',
    'chunkCount',
    'totalTokens',
    'strategy'
  ];

  for (const field of requiredFields) {
    if (!(field in metadata)) {
      throw new Error(`Document metadata missing required field: ${field}`);
    }
  }

  documentStore.set(id, { content, metadata, filterId });
}

/**
 * Retrieves a document from storage
 * 
 * @param id - Document identifier
 * @returns Stored document or undefined if not found
 * 
 * @example
 * ```typescript
 * const doc = getDocument('doc-123');
 * if (doc) {
 *   console.log('Found document:', doc.metadata.filename);
 * }
 * ```
 */
export function getDocument(id: string): StoredDocument | undefined {
  if (!id || typeof id !== 'string') {
    return undefined;
  }

  return documentStore.get(id);
}

/**
 * Deletes a document from storage
 * 
 * @param id - Document identifier
 * @returns True if document was deleted, false if not found
 * 
 * @example
 * ```typescript
 * const deleted = deleteDocument('doc-123');
 * if (deleted) {
 *   console.log('Document deleted successfully');
 * }
 * ```
 */
export function deleteDocument(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return documentStore.delete(id);
}

/**
 * Checks if a document exists in storage
 * 
 * @param id - Document identifier
 * @returns True if document exists, false otherwise
 * 
 * @example
 * ```typescript
 * if (hasDocument('doc-123')) {
 *   console.log('Document exists');
 * }
 * ```
 */
export function hasDocument(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return documentStore.has(id);
}

/**
 * Gets the total number of documents in storage
 * 
 * @returns Number of stored documents
 * 
 * @example
 * ```typescript
 * console.log(`Total documents: ${getDocumentCount()}`);
 * ```
 */
export function getDocumentCount(): number {
  return documentStore.size;
}

/**
 * Clears all documents from storage
 * 
 * WARNING: This will delete all stored documents.
 * Use with caution, primarily for testing purposes.
 * 
 * @example
 * ```typescript
 * clearAllDocuments();
 * console.log('All documents cleared');
 * ```
 */
export function clearAllDocuments(): void {
  documentStore.clear();
}

/**
 * Gets all document IDs in storage
 * 
 * @returns Array of document IDs
 * 
 * @example
 * ```typescript
 * const ids = getAllDocumentIds();
 * console.log(`Stored documents: ${ids.join(', ')}`);
 * ```
 */
export function getAllDocumentIds(): string[] {
  return Array.from(documentStore.keys());
}

/**
 * Debug function to log current storage state
 *
 * @example
 * ```typescript
 * debugStorage();
 * ```
 */
export function debugStorage(): void {
  console.log('[Storage Debug] Current document count:', documentStore.size);
  console.log('[Storage Debug] Document IDs:', Array.from(documentStore.keys()));
  for (const [id, doc] of documentStore.entries()) {
    console.log(`[Storage Debug] ${id}:`, {
      filename: doc.metadata.filename,
      hasContent: doc.content.length > 0,
      contentLength: doc.content.length,
      filterId: doc.filterId
    });
  }
}

// Made with Bob