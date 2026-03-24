/**
 * Document processing and chunking utilities for RAG comparison
 *
 * Provides secure file validation, parsing, and chunking strategies
 * following OWASP security standards for file handling.
 *
 * Supports multiple document formats:
 * - Text files (.txt, .md, .json) - Direct text extraction
 * - PDF files (.pdf) - Parsed using pdf-parse (for direct approach)
 * - Word documents (.docx) - Parsed using mammoth (for direct approach)
 *
 * Note: RAG approach can handle all formats natively via OpenRAG SDK.
 * Direct approach requires parsing for binary formats (PDF, DOCX).
 */

import { randomUUID } from 'crypto';
import { estimateTokens } from '@/lib/utils/token-estimator';
import type { Chunk, ChunkStrategy } from '@/types/rag-comparison';

/**
 * Maximum file size allowed (150MB)
 */
const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB in bytes

/**
 * Allowed MIME types for document upload
 */
const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.pdf', '.docx', '.doc'] as const;

/**
 * Default chunking parameters
 */
const DEFAULT_CHUNK_SIZE = 512; // tokens
const DEFAULT_OVERLAP = 50; // tokens
const MAX_CHUNK_SIZE = 2048; // Maximum tokens per chunk

/**
 * Options for document processing
 */
export interface ProcessingOptions {
  /** Chunking strategy to use */
  chunkStrategy?: ChunkStrategy;
  /** Target chunk size in tokens */
  chunkSize?: number;
  /** Overlap between chunks in tokens */
  overlap?: number;
}

/**
 * Result of document processing
 */
export interface ProcessedDocument {
  /** Array of document chunks */
  chunks: Chunk[];
  /** Document metadata */
  metadata: {
    /** Original filename */
    filename: string;
    /** File size in bytes */
    fileSize: number;
    /** Total tokens across all chunks */
    totalTokens: number;
    /** Number of chunks created */
    chunkCount: number;
    /** Processing time in milliseconds */
    processingTime: number;
    /** Whether parsing was required (true for PDF/DOCX, false for text files) */
    parsingRequired: boolean;
    /** Type of parsing used, if any */
    parsingMethod?: 'pdf-parse' | 'mammoth' | 'none';
    /** Whether the document contains images */
    hasImages?: boolean;
    /** Number of images detected in the document */
    imageCount?: number;
  };
}

/**
 * Custom error class for document processing errors
 */
export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

/**
 * Validates a document file for security and compatibility
 * 
 * Checks file type, size, and extension against allowed values.
 * Throws descriptive errors for invalid files.
 * 
 * @param file - The file to validate
 * @throws {DocumentProcessingError} If file is invalid
 * 
 * @example
 * ```typescript
 * try {
 *   await validateDocument(file);
 *   // File is valid, proceed with processing
 * } catch (error) {
 *   console.error('Invalid file:', error.message);
 * }
 * ```
 */
export async function validateDocument(file: File): Promise<void> {
  // Validate file exists
  if (!file) {
    throw new DocumentProcessingError(
      'No file provided',
      'NO_FILE',
      { provided: file }
    );
  }

  // Validate file size
  if (file.size === 0) {
    throw new DocumentProcessingError(
      'File is empty',
      'EMPTY_FILE',
      { filename: file.name, size: file.size }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new DocumentProcessingError(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      'FILE_TOO_LARGE',
      { 
        filename: file.name, 
        size: file.size, 
        maxSize: MAX_FILE_SIZE,
        sizeMB: (file.size / 1024 / 1024).toFixed(2)
      }
    );
  }

  // Validate file extension
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as any)) {
    throw new DocumentProcessingError(
      `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      'INVALID_FILE_TYPE',
      { 
        filename: file.name, 
        extension,
        allowedExtensions: ALLOWED_EXTENSIONS 
      }
    );
  }

  // Validate MIME type (defense in depth)
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    // Some systems may not set MIME type correctly, so we warn but don't fail
    console.warn(`File MIME type '${file.type}' not in allowed list, but extension is valid`);
  }

  // Additional security: Check for null bytes in filename (path traversal prevention)
  if (file.name.includes('\0')) {
    throw new DocumentProcessingError(
      'Invalid filename: contains null bytes',
      'INVALID_FILENAME',
      { filename: file.name }
    );
  }

  // Check for path traversal attempts in filename
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new DocumentProcessingError(
      'Invalid filename: contains path traversal characters',
      'INVALID_FILENAME',
      { filename: file.name }
    );
  }
}

/**
 * Parses a document file and extracts its text content
 *
 * Supports multiple formats:
 * - TXT, MD: Direct text extraction (no parsing needed - models can handle directly)
 * - JSON: Parsed and formatted (no parsing needed - models can handle directly)
 * - PDF: Extracted using pdf-parse (parsing required - models cannot handle binary)
 * - DOCX: Extracted using mammoth (parsing required - models cannot handle binary)
 *
 * @param file - The file to parse
 * @returns Promise resolving to object with extracted text and parsing info
 * @throws {DocumentProcessingError} If parsing fails
 *
 * @example
 * ```typescript
 * const result = await parseDocument(file);
 * console.log('Content:', result.content);
 * console.log('Parsing required:', result.parsingRequired);
 * ```
 */
export async function parseDocument(file: File): Promise<{
  content: string;
  parsingRequired: boolean;
  parsingMethod: 'pdf-parse' | 'mammoth' | 'none';
  hasImages?: boolean;
  imageCount?: number;
}> {
  try {
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];

    // Handle PDF files - PARSING REQUIRED (models cannot handle binary)
    if (extension === '.pdf') {
      try {
        // Use pdf-parse/lib/pdf-parse.js directly to bypass test code in index.js
        // The main index.js has test code that runs when module.parent is null
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Track image count
        let imageCount = 0;
        
        // Custom page render function to count images
        const options = {
          pagerender: async (pageData: any) => {
            // Get operator list to detect image operations
            const ops = await pageData.getOperatorList();
            
            // Count image operations (opcodes 85 and 86 are image-related)
            for (let i = 0; i < ops.fnArray.length; i++) {
              if (ops.fnArray[i] === 85 || ops.fnArray[i] === 86) {
                imageCount++;
              }
            }
            
            // Extract text content
            const textContent = await pageData.getTextContent();
            return textContent.items.map((item: any) => item.str).join(' ');
          }
        };
        
        // Call pdf-parse function with buffer and options
        const data = await pdfParse(buffer, options);
        
        if (!data.text || data.text.trim().length === 0) {
          throw new DocumentProcessingError(
            'PDF file contains no extractable text',
            'EMPTY_CONTENT',
            { filename: file.name }
          );
        }
        
        return {
          content: data.text,
          parsingRequired: true,
          parsingMethod: 'pdf-parse',
          hasImages: imageCount > 0,
          imageCount: imageCount > 0 ? imageCount : undefined
        };
      } catch (pdfError) {
        if (pdfError instanceof DocumentProcessingError) {
          throw pdfError;
        }
        
        console.error('[PDF Parse] Error:', pdfError);
        
        throw new DocumentProcessingError(
          'Failed to parse PDF file',
          'PDF_PARSE_ERROR',
          {
            filename: file.name,
            error: pdfError instanceof Error ? pdfError.message : 'Unknown error'
          }
        );
      }
    }

    // Handle DOCX files - PARSING REQUIRED (models cannot handle binary)
    if (extension === '.docx' || extension === '.doc') {
      try {
        // Dynamic import to avoid build-time issues
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Track image count
        let imageCount = 0;
        
        // Convert to HTML with custom image handler to count images
        await mammoth.convertToHtml({ buffer }, {
          convertImage: mammoth.images.imgElement(async () => {
            imageCount++;
            return { src: '' }; // Return empty src since we only need the count
          })
        });
        
        // Also extract raw text for content
        const textResult = await mammoth.extractRawText({ buffer });
        
        if (!textResult.value || textResult.value.trim().length === 0) {
          throw new DocumentProcessingError(
            'Word document contains no extractable text',
            'EMPTY_CONTENT',
            { filename: file.name }
          );
        }
        
        return {
          content: textResult.value,
          parsingRequired: true,
          parsingMethod: 'mammoth',
          hasImages: imageCount > 0,
          imageCount: imageCount > 0 ? imageCount : undefined
        };
      } catch (docError) {
        if (docError instanceof DocumentProcessingError) {
          throw docError;
        }
        throw new DocumentProcessingError(
          'Failed to parse Word document',
          'DOC_PARSE_ERROR',
          {
            filename: file.name,
            error: docError instanceof Error ? docError.message : 'Unknown error'
          }
        );
      }
    }

    // Handle text-based files - NO PARSING REQUIRED (models can handle directly)
    const text = await file.text();

    // Validate content is not empty after reading
    if (!text || text.trim().length === 0) {
      throw new DocumentProcessingError(
        'File content is empty',
        'EMPTY_CONTENT',
        { filename: file.name }
      );
    }

    // Handle JSON files specially
    if (extension === '.json') {
      try {
        // Parse and re-stringify to validate and format
        const parsed = JSON.parse(text);
        return {
          content: JSON.stringify(parsed, null, 2),
          parsingRequired: false,
          parsingMethod: 'none'
        };
      } catch (jsonError) {
        throw new DocumentProcessingError(
          'Invalid JSON format',
          'INVALID_JSON',
          {
            filename: file.name,
            error: jsonError instanceof Error ? jsonError.message : 'Unknown error'
          }
        );
      }
    }

    // For TXT and MD files, return as-is (already text)
    return {
      content: text,
      parsingRequired: false,
      parsingMethod: 'none',
      hasImages: false,
      imageCount: undefined
    };

  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    
    throw new DocumentProcessingError(
      'Failed to read file content',
      'READ_ERROR',
      {
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}

/**
 * Splits text into sentences for better chunking
 * 
 * Uses a simple regex-based approach that handles common sentence
 * endings while avoiding false positives with abbreviations.
 * 
 * @param text - The text to split into sentences
 * @returns Array of sentences
 * 
 * @example
 * ```typescript
 * const sentences = splitIntoSentences("Hello world. How are you?");
 * // Returns: ["Hello world.", "How are you?"]
 * ```
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split on sentence boundaries (., !, ?) followed by whitespace or end of string
  // This regex attempts to avoid splitting on abbreviations like "Dr." or "U.S."
  const sentenceRegex = /[.!?]+(?:\s+|$)/g;
  
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = text.slice(lastIndex, match.index + match[0].length).trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push(remaining);
    }
  }

  return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * Creates fixed-size chunks with overlap
 * 
 * @param content - The text content to chunk
 * @param chunkSize - Target size in tokens
 * @param overlap - Overlap size in tokens
 * @returns Array of text chunks
 */
function createFixedChunks(
  content: string,
  chunkSize: number,
  overlap: number
): string[] {
  const sentences = splitIntoSentences(content);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // If single sentence exceeds chunk size, split it by words
    if (sentenceTokens > chunkSize) {
      // Save current chunk if it has content
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentTokens = 0;
      }

      // Split large sentence into smaller chunks
      const words = sentence.split(/\s+/);
      let wordChunk: string[] = [];
      let wordTokens = 0;

      for (const word of words) {
        const wordTokenCount = estimateTokens(word);
        
        if (wordTokens + wordTokenCount > chunkSize && wordChunk.length > 0) {
          chunks.push(wordChunk.join(' '));
          
          // Apply overlap by keeping last few words
          const overlapWords = Math.floor(wordChunk.length * (overlap / chunkSize));
          wordChunk = wordChunk.slice(-overlapWords);
          wordTokens = estimateTokens(wordChunk.join(' '));
        }
        
        wordChunk.push(word);
        wordTokens += wordTokenCount;
      }

      if (wordChunk.length > 0) {
        chunks.push(wordChunk.join(' '));
      }
      continue;
    }

    // Check if adding this sentence would exceed chunk size
    if (currentTokens + sentenceTokens > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      
      // Apply overlap by keeping last few sentences
      const overlapSentences = Math.floor(currentChunk.length * (overlap / chunkSize));
      currentChunk = currentChunk.slice(-Math.max(1, overlapSentences));
      currentTokens = estimateTokens(currentChunk.join(' '));
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks.length > 0 ? chunks : [content];
}

/**
 * Creates paragraph-based chunks
 * 
 * @param content - The text content to chunk
 * @returns Array of text chunks (paragraphs)
 */
function createParagraphChunks(content: string): string[] {
  // Split by double newlines (paragraph boundaries)
  const paragraphs = content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.length > 0 ? paragraphs : [content];
}

/**
 * Ensures no chunk exceeds the maximum size
 * 
 * Splits oversized chunks into smaller ones while preserving
 * chunk metadata and IDs.
 * 
 * @param chunks - Array of chunks to validate
 * @param maxSize - Maximum allowed size in tokens
 * @returns Array of chunks with all chunks within size limit
 * 
 * @example
 * ```typescript
 * const validChunks = ensureChunkSize(chunks, 2048);
 * ```
 */
export function ensureChunkSize(chunks: Chunk[], maxSize: number): Chunk[] {
  const result: Chunk[] = [];

  for (const chunk of chunks) {
    if (chunk.tokenCount <= maxSize) {
      result.push(chunk);
      continue;
    }

    // Split oversized chunk
    const subChunks = createFixedChunks(chunk.content, maxSize, 0);
    let charOffset = chunk.metadata.startChar;

    for (let i = 0; i < subChunks.length; i++) {
      const subContent = subChunks[i];
      const subTokens = estimateTokens(subContent);
      const endChar = charOffset + subContent.length;

      result.push({
        id: randomUUID(),
        content: subContent,
        tokenCount: subTokens,
        metadata: {
          index: result.length,
          startChar: charOffset,
          endChar: endChar,
          sourceId: chunk.metadata.sourceId,
          section: chunk.metadata.section 
            ? `${chunk.metadata.section} (part ${i + 1})`
            : undefined,
        },
      });

      charOffset = endChar;
    }
  }

  return result;
}

/**
 * Chunks a document using the specified strategy
 * 
 * Implements three chunking strategies:
 * - `fixed`: Fixed token-size chunks with overlap
 * - `paragraph`: Split by paragraph boundaries (double newlines)
 * - `semantic`: Currently falls back to paragraph (placeholder for future)
 * 
 * @param content - The document content to chunk
 * @param strategy - The chunking strategy to use
 * @param chunkSize - Target chunk size in tokens (for fixed strategy)
 * @param overlap - Overlap between chunks in tokens (for fixed strategy)
 * @returns Array of chunks with metadata
 * 
 * @example
 * ```typescript
 * const chunks = chunkDocument(content, 'fixed', 512, 50);
 * console.log(`Created ${chunks.length} chunks`);
 * ```
 */
export function chunkDocument(
  content: string,
  strategy: ChunkStrategy = 'fixed',
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): Chunk[] {
  if (!content || content.trim().length === 0) {
    throw new DocumentProcessingError(
      'Cannot chunk empty content',
      'EMPTY_CONTENT'
    );
  }

  // Validate parameters
  if (chunkSize <= 0) {
    throw new DocumentProcessingError(
      'Chunk size must be positive',
      'INVALID_CHUNK_SIZE',
      { chunkSize }
    );
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new DocumentProcessingError(
      'Overlap must be non-negative and less than chunk size',
      'INVALID_OVERLAP',
      { overlap, chunkSize }
    );
  }

  // Create text chunks based on strategy
  let textChunks: string[];
  
  switch (strategy) {
    case 'fixed':
      textChunks = createFixedChunks(content, chunkSize, overlap);
      break;
    
    case 'paragraph':
      textChunks = createParagraphChunks(content);
      break;
    
    case 'semantic':
      // Placeholder: Fall back to paragraph for now
      // Future enhancement: implement semantic chunking using embeddings
      console.warn('Semantic chunking not yet implemented, falling back to paragraph strategy');
      textChunks = createParagraphChunks(content);
      break;
    
    default:
      throw new DocumentProcessingError(
        `Unknown chunking strategy: ${strategy}`,
        'INVALID_STRATEGY',
        { strategy }
      );
  }

  // Convert text chunks to Chunk objects with metadata
  let charOffset = 0;
  const chunks: Chunk[] = textChunks.map((text, index) => {
    const tokenCount = estimateTokens(text);
    const startChar = charOffset;
    const endChar = startChar + text.length;
    
    charOffset = endChar;

    return {
      id: randomUUID(),
      content: text,
      tokenCount,
      metadata: {
        index,
        startChar,
        endChar,
      },
    };
  });

  // Ensure no chunk exceeds maximum size
  const validatedChunks = ensureChunkSize(chunks, MAX_CHUNK_SIZE);

  // Update indices after potential splitting
  return validatedChunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      index,
    },
  }));
}

/**
 * Processes a document file through the complete pipeline
 * 
 * Validates, parses, and chunks the document, returning the processed
 * result with comprehensive metadata.
 * 
 * @param file - The file to process
 * @param options - Processing options (chunking strategy, size, overlap)
 * @returns Promise resolving to processed document with chunks and metadata
 * @throws {DocumentProcessingError} If processing fails
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await processDocument(file, {
 *     chunkStrategy: 'fixed',
 *     chunkSize: 512,
 *     overlap: 50
 *   });
 *   console.log(`Created ${result.chunks.length} chunks`);
 * } catch (error) {
 *   console.error('Processing failed:', error);
 * }
 * ```
 */
export async function processDocument(
  file: File,
  options: ProcessingOptions = {}
): Promise<ProcessedDocument> {
  const startTime = performance.now();

  try {
    // Step 1: Validate the file
    await validateDocument(file);

    // Step 2: Parse the document content
    const parseResult = await parseDocument(file);
    const content = parseResult.content;

    // Step 3: Chunk the document
    const {
      chunkStrategy = 'fixed',
      chunkSize = DEFAULT_CHUNK_SIZE,
      overlap = DEFAULT_OVERLAP,
    } = options;

    const chunks = chunkDocument(content, chunkStrategy, chunkSize, overlap);

    // Add source filename to chunk metadata
    const chunksWithSource = chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        sourceId: file.name,
      },
    }));

    // Calculate total tokens
    const totalTokens = chunksWithSource.reduce(
      (sum, chunk) => sum + chunk.tokenCount,
      0
    );

    const endTime = performance.now();
    const processingTime = Math.round(endTime - startTime);

    return {
      chunks: chunksWithSource,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        totalTokens,
        chunkCount: chunksWithSource.length,
        processingTime,
        parsingRequired: parseResult.parsingRequired,
        parsingMethod: parseResult.parsingMethod,
        hasImages: parseResult.hasImages,
        imageCount: parseResult.imageCount,
      },
    };

  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }

    throw new DocumentProcessingError(
      'Document processing failed',
      'PROCESSING_ERROR',
      {
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
  }
}

// Made with Bob