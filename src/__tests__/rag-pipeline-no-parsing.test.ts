/**
 * CRITICAL REGRESSION TEST: RAG Pipeline No Parsing Constraint
 * 
 * This test MUST pass to ensure the RAG pipeline does NOT parse documents.
 * 
 * PURPOSE:
 * Prevents a recurring regression where document parsing code is added to the
 * RAG pipeline, causing browser API errors (document is not defined, Image is
 * not defined, etc.) and performance degradation.
 * 
 * WHAT IT TESTS:
 * 1. RAG pipeline does NOT import parseDocument
 * 2. RAG pipeline does NOT call parseDocument
 * 3. RAG pipeline sends raw File objects to OpenRAG SDK
 * 4. RAG pipeline only uses OpenRAG SDK for document processing
 * 
 * WHY THIS MATTERS:
 * - OpenRAG SDK handles ALL document parsing internally
 * - Parsing in Node.js triggers browser API dependencies (pdf-parse/pdfjs-dist)
 * - This causes runtime errors: "document is not defined", "Image is not defined"
 * - Parsing twice (Node.js + OpenRAG) wastes CPU and degrades performance
 * 
 * HISTORICAL CONTEXT:
 * This regression has occurred 3+ times. Each time, parsing was added for:
 * - Token counting before upload
 * - Content preview generation
 * - Document validation
 * All of these should be handled by OpenRAG SDK or alternative methods.
 * 
 * HOW TO RUN:
 * npm test                           # Run all tests
 * npm test rag-pipeline-no-parsing  # Run only this test
 * npm run test:watch                # Watch mode
 * 
 * CRITICAL: If this test fails, DO NOT modify the RAG pipeline to add parsing.
 * Instead, consult docs/RAG_PIPELINE_NO_PARSING.md for alternative solutions.
 * 
 * @see docs/RAG_PIPELINE_NO_PARSING.md - Complete architectural documentation
 */

import * as fs from 'fs';
import * as path from 'path';

// Path to the RAG pipeline file
const RAG_PIPELINE_PATH = path.join(__dirname, '../lib/rag-comparison/pipelines/rag-pipeline.ts');

// Error message template for failed tests
const CRITICAL_ERROR_PREFIX = `
╔════════════════════════════════════════════════════════════╗
║  ❌ CRITICAL: RAG pipeline contains document parsing code! ║
╚════════════════════════════════════════════════════════════╝

This is a known regression that causes browser API errors.
See docs/RAG_PIPELINE_NO_PARSING.md for details.

`;

const CRITICAL_ERROR_SUFFIX = `

OpenRAG SDK handles all parsing internally. Remove any parseDocument imports/calls.

ALTERNATIVE SOLUTIONS:
- Token counting: Get from OpenRAG response or estimate from file size
- Content preview: Query OpenRAG after ingestion
- Validation: Let OpenRAG validate during ingestion

See docs/RAG_PIPELINE_NO_PARSING.md for complete guidance.
`;

describe('RAG Pipeline - No Parsing Constraint', () => {
  let ragPipelineContent: string;

  beforeAll(() => {
    // Read the RAG pipeline file once for all tests
    try {
      ragPipelineContent = fs.readFileSync(RAG_PIPELINE_PATH, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read RAG pipeline file at ${RAG_PIPELINE_PATH}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  describe('Test 1: Verify no parseDocument import', () => {
    it('should not import parseDocument from document-processor', () => {
      // Check for ES6 import syntax
      const es6ImportPattern = /import\s+\{[^}]*parseDocument[^}]*\}\s+from\s+['"].*document-processor['"]/;
      const es6Match = ragPipelineContent.match(es6ImportPattern);

      if (es6Match) {
        fail(`${CRITICAL_ERROR_PREFIX}Found forbidden import pattern: ${es6Match[0]}
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      // Check for CommonJS require syntax
      const requirePattern = /require\s*\(\s*['"].*document-processor['"]\s*\)/;
      const requireMatch = ragPipelineContent.match(requirePattern);

      if (requireMatch) {
        fail(`${CRITICAL_ERROR_PREFIX}Found forbidden require pattern: ${requireMatch[0]}
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      // Check for any reference to document-processor module
      const moduleRefPattern = /['"].*document-processor['"]/;
      const moduleMatch = ragPipelineContent.match(moduleRefPattern);

      if (moduleMatch) {
        fail(`${CRITICAL_ERROR_PREFIX}Found reference to document-processor module: ${moduleMatch[0]}
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      // Test passes - no imports found
      expect(es6Match).toBeNull();
      expect(requireMatch).toBeNull();
      expect(moduleMatch).toBeNull();
    });

    it('should not have parseDocument in import statements', () => {
      // More comprehensive check for any import containing parseDocument
      const lines = ragPipelineContent.split('\n');
      const importLines = lines.filter(line => 
        line.trim().startsWith('import') && line.includes('parseDocument')
      );

      if (importLines.length > 0) {
        fail(`${CRITICAL_ERROR_PREFIX}Found parseDocument in import statement(s):
${importLines.map((line, i) => `  Line ${i + 1}: ${line.trim()}`).join('\n')}

Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(importLines).toHaveLength(0);
    });
  });

  describe('Test 2: Verify no parseDocument calls', () => {
    it('should not call parseDocument function', () => {
      // Check for direct function calls
      const directCallPattern = /parseDocument\s*\(/;
      const directMatch = ragPipelineContent.match(directCallPattern);

      if (directMatch) {
        // Find the line number for better error reporting
        const lines = ragPipelineContent.split('\n');
        const lineNumber = lines.findIndex(line => directCallPattern.test(line)) + 1;
        const lineContent = lines[lineNumber - 1];

        fail(`${CRITICAL_ERROR_PREFIX}Found forbidden parseDocument call:
  Line ${lineNumber}: ${lineContent.trim()}

Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(directMatch).toBeNull();
    });

    it('should not await parseDocument', () => {
      // Check for awaited calls
      const awaitPattern = /await\s+parseDocument/;
      const awaitMatch = ragPipelineContent.match(awaitPattern);

      if (awaitMatch) {
        const lines = ragPipelineContent.split('\n');
        const lineNumber = lines.findIndex(line => awaitPattern.test(line)) + 1;
        const lineContent = lines[lineNumber - 1];

        fail(`${CRITICAL_ERROR_PREFIX}Found forbidden awaited parseDocument call:
  Line ${lineNumber}: ${lineContent.trim()}

Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(awaitMatch).toBeNull();
    });

    it('should not have parseDocument in variable assignments', () => {
      // Check for assignments like: const result = parseDocument(...)
      const assignmentPattern = /=\s*(?:await\s+)?parseDocument\s*\(/;
      const assignmentMatch = ragPipelineContent.match(assignmentPattern);

      if (assignmentMatch) {
        const lines = ragPipelineContent.split('\n');
        const lineNumber = lines.findIndex(line => assignmentPattern.test(line)) + 1;
        const lineContent = lines[lineNumber - 1];

        fail(`${CRITICAL_ERROR_PREFIX}Found parseDocument in variable assignment:
  Line ${lineNumber}: ${lineContent.trim()}

Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(assignmentMatch).toBeNull();
    });
  });

  describe('Test 3: Verify indexDocument signature', () => {
    it('should accept raw File object parameter', () => {
      // Check that indexDocument function exists and has File parameter
      const functionPattern = /export\s+async\s+function\s+indexDocument\s*\([^)]*file:\s*File[^)]*\)/;
      const match = ragPipelineContent.match(functionPattern);

      if (!match) {
        fail(`${CRITICAL_ERROR_PREFIX}indexDocument function signature is incorrect or missing.
Expected: file: File parameter

The function should accept a raw File object, not parsed content.
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(match).not.toBeNull();
    });

    it('should not require parsed content parameter', () => {
      // Check that there's no 'content' or 'parsedContent' parameter
      const contentParamPattern = /export\s+async\s+function\s+indexDocument\s*\([^)]*(?:content|parsedContent):\s*string[^)]*\)/;
      const match = ragPipelineContent.match(contentParamPattern);

      if (match) {
        fail(`${CRITICAL_ERROR_PREFIX}indexDocument has a content/parsedContent parameter.
Found: ${match[0]}

The function should accept raw File objects, not pre-parsed content.
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(match).toBeNull();
    });
  });

  describe('Test 4: Static code analysis', () => {
    it('should only use OpenRAG SDK for document processing', () => {
      // Verify that client.documents.ingest is called with raw file
      const ingestPattern = /client\.documents\.ingest\s*\(\s*\{[^}]*file[^}]*\}/;
      const match = ragPipelineContent.match(ingestPattern);

      if (!match) {
        fail(`${CRITICAL_ERROR_PREFIX}Cannot find correct OpenRAG SDK usage pattern.
Expected: client.documents.ingest({ file, ... })

The RAG pipeline must send raw File objects to OpenRAG SDK.
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(match).not.toBeNull();
    });

    it('should not parse content before sending to OpenRAG', () => {
      // Check for patterns that suggest parsing before OpenRAG ingestion
      const lines = ragPipelineContent.split('\n');
      
      // Find the indexDocument function
      const functionStartIndex = lines.findIndex(line => 
        /export\s+async\s+function\s+indexDocument/.test(line)
      );
      
      expect(functionStartIndex).not.toBe(-1);

      // Find the ingest call
      const ingestIndex = lines.findIndex((line, index) => 
        index > functionStartIndex && /client\.documents\.ingest/.test(line)
      );

      expect(ingestIndex).not.toBe(-1);

      // Check lines between function start and ingest call for parsing
      const functionBody = lines.slice(functionStartIndex, ingestIndex).join('\n');
      
      // Look for suspicious patterns
      const suspiciousPatterns = [
        { pattern: /parseDocument/, name: 'parseDocument call' },
        { pattern: /\.text\(\)/, name: 'file.text() call' },
        { pattern: /\.arrayBuffer\(\)/, name: 'file.arrayBuffer() call' },
        { pattern: /pdf-parse/, name: 'pdf-parse usage' },
        { pattern: /pdfjs-dist/, name: 'pdfjs-dist usage' },
      ];

      for (const { pattern, name } of suspiciousPatterns) {
        const match = functionBody.match(pattern);
        if (match) {
          const lineNumber = functionStartIndex + functionBody.substring(0, functionBody.indexOf(match[0])).split('\n').length;
          
          fail(`${CRITICAL_ERROR_PREFIX}Found suspicious parsing pattern before OpenRAG ingestion:
  Pattern: ${name}
  Line ~${lineNumber}: ${match[0]}

Documents should be sent to OpenRAG SDK without pre-processing.
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
        }
      }
    });

    it('should send raw file to OpenRAG, not parsed content', () => {
      // Check that the file parameter is passed directly to ingest
      // Look for pattern: ingest({ file, ... }) or ingest({ file: file, ... })
      const correctPattern = /client\.documents\.ingest\s*\(\s*\{\s*file(?:\s*:\s*file)?\s*,/;
      const match = ragPipelineContent.match(correctPattern);

      if (!match) {
        fail(`${CRITICAL_ERROR_PREFIX}OpenRAG ingest call does not use raw file parameter correctly.
Expected pattern: client.documents.ingest({ file, ... })

The raw File object should be passed directly to OpenRAG SDK.
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(match).not.toBeNull();
    });

    it('should not have token counting from parsed content', () => {
      // Check for patterns like: estimateTokens(content) where content comes from parsing
      const lines = ragPipelineContent.split('\n');
      
      // Find suspicious token estimation patterns
      const suspiciousLines = lines.filter((line, index) => {
        // Look for estimateTokens with content that might be from parsing
        if (/estimateTokens\s*\(\s*content\s*\)/.test(line)) {
          // Check if this is after a parseDocument call
          const previousLines = lines.slice(Math.max(0, index - 10), index).join('\n');
          if (/parseDocument/.test(previousLines)) {
            return true;
          }
        }
        return false;
      });

      if (suspiciousLines.length > 0) {
        fail(`${CRITICAL_ERROR_PREFIX}Found token estimation from parsed content:
${suspiciousLines.map((line) => `  ${line.trim()}`).join('\n')}

Token counts should come from OpenRAG response or file size estimation.
Location: ${RAG_PIPELINE_PATH}
${CRITICAL_ERROR_SUFFIX}`);
      }

      expect(suspiciousLines).toHaveLength(0);
    });
  });

  describe('Test 5: Documentation and comments', () => {
    it('should have comments warning against parsing', () => {
      // Check for helpful comments that warn against parsing
      const hasWarningComment = 
        /OpenRAG.*handles.*parsing/i.test(ragPipelineContent) ||
        /do not parse/i.test(ragPipelineContent) ||
        /raw file/i.test(ragPipelineContent);

      if (!hasWarningComment) {
        console.warn(`
⚠️  WARNING: RAG pipeline lacks comments warning against parsing.
Consider adding comments like:
  // OpenRAG SDK handles all document parsing internally
  // Send raw File object - do not parse!
  // See docs/RAG_PIPELINE_NO_PARSING.md
`);
      }

      // This is a soft warning, not a hard failure
      expect(true).toBe(true);
    });

    it('should reference RAG_PIPELINE_NO_PARSING.md documentation', () => {
      // Check if the file references the documentation
      const hasDocReference = /RAG_PIPELINE_NO_PARSING\.md/.test(ragPipelineContent);

      if (!hasDocReference) {
        console.warn(`
⚠️  WARNING: RAG pipeline does not reference docs/RAG_PIPELINE_NO_PARSING.md
Consider adding a comment at the top of the file:
  /**
   * IMPORTANT: This pipeline must NOT parse documents.
   * See docs/RAG_PIPELINE_NO_PARSING.md for details.
   */
`);
      }

      // This is a soft warning, not a hard failure
      expect(true).toBe(true);
    });
  });
});

/**
 * Summary of what this test file prevents:
 * 
 * ❌ PREVENTS:
 * - Importing parseDocument in RAG pipeline
 * - Calling parseDocument before OpenRAG ingestion
 * - Parsing documents for token counting
 * - Parsing documents for content preview
 * - Parsing documents for validation
 * - Using browser-dependent parsing libraries (pdf-parse, pdfjs-dist)
 * 
 * ✅ ENSURES:
 * - Raw File objects are sent to OpenRAG SDK
 * - OpenRAG handles all document processing
 * - No browser API dependencies in Node.js code
 * - Optimal performance (no redundant parsing)
 * 
 * 📚 REFERENCES:
 * - docs/RAG_PIPELINE_NO_PARSING.md - Complete architectural guide
 * - src/lib/rag-comparison/pipelines/rag-pipeline.ts - Implementation
 * - src/__tests__/README.md - Test documentation
 */

// Made with Bob