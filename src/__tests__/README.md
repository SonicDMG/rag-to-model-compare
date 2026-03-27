# Integration Tests

This directory contains critical tests that prevent known regressions and ensure system reliability.

## Overview

| Test File | Type | Purpose | Run Command |
|-----------|------|---------|-------------|
| `rag-pipeline-no-parsing.test.ts` | Jest Unit Test | Prevents document parsing in RAG pipeline | `npm test` |
| `filter-race-condition.test.ts` | Standalone Integration | Prevents filter race conditions | `npx ts-node src/__tests__/filter-race-condition.test.ts` |

---

## RAG Pipeline No Parsing Test

### Purpose

The `rag-pipeline-no-parsing.test.ts` file contains **critical regression tests** that prevent document parsing code from being added to the RAG pipeline. **These tests MUST pass before deploying any changes to the RAG pipeline.**

### What It Tests

1. **No parseDocument Import**: Verifies RAG pipeline does not import `parseDocument` from document-processor
2. **No parseDocument Calls**: Ensures no direct or awaited calls to `parseDocument`
3. **Correct Function Signature**: Validates `indexDocument` accepts raw `File` objects
4. **OpenRAG SDK Usage**: Confirms raw files are sent to OpenRAG SDK
5. **No Pre-Processing**: Detects any document parsing before OpenRAG ingestion

### Why This Test Exists

This is a **recurring regression** that has been fixed multiple times:

- **Problem**: Developers add `parseDocument` calls to count tokens, preview content, or validate documents
- **Impact**: Causes browser API errors (`document is not defined`, `Image is not defined`)
- **Root Cause**: `pdf-parse` library depends on browser APIs that don't exist in Node.js
- **Solution**: OpenRAG SDK handles ALL parsing internally - never parse in RAG pipeline

### Running the Test

#### Quick Run (Recommended)
```bash
npm test
```

#### Watch Mode (During Development)
```bash
npm run test:watch
```

#### With Coverage
```bash
npm run test:coverage
```

#### Run Only This Test
```bash
npm test rag-pipeline-no-parsing
```

### Expected Output

#### Success Case

```
PASS src/__tests__/rag-pipeline-no-parsing.test.ts
  RAG Pipeline - No Parsing Constraint
    Test 1: Verify no parseDocument import
      ✓ should not import parseDocument from document-processor
      ✓ should not have parseDocument in import statements
    Test 2: Verify no parseDocument calls
      ✓ should not call parseDocument function
      ✓ should not await parseDocument
      ✓ should not have parseDocument in variable assignments
    Test 3: Verify indexDocument signature
      ✓ should accept raw File object parameter
      ✓ should not require parsed content parameter
    Test 4: Static code analysis
      ✓ should only use OpenRAG SDK for document processing
      ✓ should not parse content before sending to OpenRAG
      ✓ should send raw file to OpenRAG, not parsed content
      ✓ should not have token counting from parsed content
    Test 5: Documentation and comments
      ✓ should have comments warning against parsing
      ✓ should reference RAG_PIPELINE_NO_PARSING.md documentation

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

#### Failure Case

```
FAIL src/__tests__/rag-pipeline-no-parsing.test.ts
  ● RAG Pipeline - No Parsing Constraint › Test 1 › should not import parseDocument

    ╔════════════════════════════════════════════════════════════╗
    ║  ❌ CRITICAL: RAG pipeline contains document parsing code! ║
    ╚════════════════════════════════════════════════════════════╝

    This is a known regression that causes browser API errors.
    See docs/RAG_PIPELINE_NO_PARSING.md for details.

    Found forbidden import pattern: import { parseDocument } from '../processing/document-processor'
    Location: src/lib/rag-comparison/pipelines/rag-pipeline.ts

    OpenRAG SDK handles all parsing internally. Remove any parseDocument imports/calls.
```

### When to Run

Run this test:

- ✅ **Before every commit** to RAG pipeline code
- ✅ **In CI/CD pipeline** (automatically with `npm test`)
- ✅ **After modifying** `indexDocument()` function
- ✅ **After modifying** any RAG pipeline imports
- ✅ **When adding features** that might need document content
- ✅ **During code review** of RAG pipeline changes

### Troubleshooting

#### Test Fails: parseDocument Import Detected

**Problem**: Test reports `parseDocument` import in RAG pipeline

**Solution**:
1. Remove the import statement from `rag-pipeline.ts`
2. If you need document content, use OpenRAG's query API after ingestion
3. See docs/RAG_PIPELINE_NO_PARSING.md for alternative approaches

#### Test Fails: parseDocument Call Detected

**Problem**: Test reports `parseDocument()` call in RAG pipeline

**Solution**:
1. Remove the `parseDocument()` call
2. Send raw `File` object directly to `client.documents.ingest()`
3. Get token counts from OpenRAG response or estimate from file size

#### Test Fails: Incorrect Function Signature

**Problem**: `indexDocument` has wrong parameters

**Solution**:
1. Ensure function signature is: `indexDocument(file: File, ...)`
2. Do NOT add `content: string` or `parsedContent: string` parameters
3. Accept raw File objects only

#### Need Token Counts?

**Wrong Approach**:
```typescript
const { content } = await parseDocument(file);
const tokenCount = estimateTokens(content);
```

**Right Approach**:
```typescript
// Option 1: Estimate from file size
const estimatedTokens = Math.ceil(file.size / 4);

// Option 2: Get from OpenRAG response (future enhancement)
const result = await client.documents.ingest({ file, ... });
// OpenRAG could return token count in metadata
```

#### Need Content Preview?

**Wrong Approach**:
```typescript
const { content } = await parseDocument(file);
const preview = content.substring(0, 500);
```

**Right Approach**:
```typescript
// Query OpenRAG after ingestion
const response = await client.chat.create({
  message: "Summarize this document in 2-3 sentences",
  filterId: filterId,
  limit: 3
});
```

### Integration with CI/CD

#### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

The test will automatically run with `npm test` and fail the build if parsing is detected.

### Related Documentation

- [RAG Pipeline No Parsing Architecture](../../docs/RAG_PIPELINE_NO_PARSING.md) - Complete architectural guide
- [RAG Pipeline Implementation](../lib/rag-comparison/pipelines/rag-pipeline.ts) - Source code
- [Document Processor](../lib/rag-comparison/processing/document-processor.ts) - Parsing utilities (for Direct pipeline only)

---

## Filter Race Condition Test

### Purpose

The `filter-race-condition.test.ts` file contains critical integration tests that verify the filter management system works correctly under concurrent load. **These tests MUST pass before deploying any changes to filter management code.**

### What It Tests

1. **Concurrent Filter Creation**: Simulates 5 simultaneous file uploads and verifies they all use the same filter ID
2. **Single Filter Existence**: Confirms only one "Compare" filter exists in the system
3. **Cache Mechanism**: Validates that the cache speeds up subsequent filter lookups

### Prerequisites

Before running the test, ensure:

1. **OpenRAG API is running** and accessible
2. **Environment variables are set** in `.env`:
   ```
   OPENRAG_API_KEY=your_api_key
   OPENRAG_URL=https://your-openrag-instance.com
   ```
3. **Dependencies are installed**: `npm install`

### Running the Test

#### Option 1: Direct Execution (Recommended)

```bash
npx ts-node src/__tests__/filter-race-condition.test.ts
```

#### Option 2: With Environment Variables

```bash
OPENRAG_API_KEY=your_key OPENRAG_URL=your_url npx ts-node src/__tests__/filter-race-condition.test.ts
```

### Expected Output

#### Success Case

```
============================================================
🧪 FILTER RACE CONDITION INTEGRATION TEST
============================================================

============================================================
TEST 1: Concurrent Filter Creation
============================================================

🚀 Simulating 5 concurrent uploads...
✅ All 5 concurrent uploads used the SAME filter ID

============================================================
TEST 2: Single Filter Verification
============================================================

✅ Exactly ONE "Compare" filter exists

============================================================
TEST 3: Cache Mechanism Verification
============================================================

✅ Cache mechanism working correctly

============================================================
TEST SUMMARY
============================================================

Test 1: ✅ All 5 concurrent uploads used the SAME filter ID
Test 2: ✅ Exactly ONE "Compare" filter exists
Test 3: ✅ Cache mechanism working correctly

============================================================
✅ ALL TESTS PASSED
============================================================

The filter race condition fix is working correctly.
It is safe to deploy this code.
```

#### Failure Case

```
============================================================
❌ TESTS FAILED
============================================================

⚠️  WARNING: Filter race condition detected!
DO NOT deploy this code until the issue is fixed.
See docs/FILTER_MANAGEMENT_ARCHITECTURE.md for details.
```

### When to Run

Run this test:

- ✅ **Before deploying** any changes to filter management code
- ✅ **After modifying** `ensureKnowledgeFilter()` function
- ✅ **After modifying** `scheduleBatchFilterUpdate()` function
- ✅ **After modifying** module-level filter variables
- ✅ **When debugging** race condition issues
- ✅ **As part of CI/CD** pipeline (if configured)

### Troubleshooting

#### Test Fails: Multiple Filters Created

**Problem**: Test reports multiple "Compare" filters exist

**Solution**:
1. Check if the lock mechanism is working (see logs)
2. Verify module-level variables are not request-scoped
3. Review recent changes to `ensureKnowledgeFilter()`
4. Manually delete duplicate filters in OpenRAG
5. Re-run the test

#### Test Fails: Different Filter IDs

**Problem**: Concurrent uploads got different filter IDs

**Solution**:
1. Verify the lock is being awaited properly
2. Check if cache is being set correctly
3. Review the lock acquisition logic
4. See docs/FILTER_MANAGEMENT_ARCHITECTURE.md for details

#### Test Hangs/Timeouts

**Problem**: Test never completes

**Solution**:
1. Check if OpenRAG API is accessible
2. Verify environment variables are correct
3. Check if lock is being released (finally block)
4. Restart the test with increased timeout

#### Connection Errors

**Problem**: Cannot connect to OpenRAG

**Solution**:
1. Verify `OPENRAG_URL` is correct
2. Verify `OPENRAG_API_KEY` is valid
3. Check network connectivity
4. Verify OpenRAG service is running

### Adding to CI/CD

To add this test to your CI/CD pipeline:

#### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - name: Run Filter Race Condition Test
        env:
          OPENRAG_API_KEY: ${{ secrets.OPENRAG_API_KEY }}
          OPENRAG_URL: ${{ secrets.OPENRAG_URL }}
        run: npx ts-node src/__tests__/filter-race-condition.test.ts
```

### Test Configuration

The test uses these configuration values (defined in the test file):

```typescript
const TEST_CONFIG = {
  CONCURRENT_UPLOADS: 5,        // Number of concurrent uploads to simulate
  UPLOAD_DELAY_MS: 100,         // Delay between upload starts
  FILTER_NAME: 'Compare',       // Filter name to test
  TIMEOUT_MS: 30000,            // Test timeout
};
```

You can modify these values if needed, but the defaults are recommended.

### Related Documentation

- [Filter Management Architecture](../../docs/FILTER_MANAGEMENT_ARCHITECTURE.md) - Detailed explanation of the filter system
- [Filter Lock Fix](../../docs/FILTER_LOCK_FIX_FINAL.md) - Original fix documentation
- [Upload Route](../app/api/rag-comparison/upload/route.ts) - Implementation code

### Support

If you encounter issues with this test:

1. Read the error message carefully
2. Check the troubleshooting section above
3. Review docs/FILTER_MANAGEMENT_ARCHITECTURE.md
4. Check recent changes to filter management code
5. Verify your environment setup

**Remember**: If this test fails, DO NOT deploy the code. The race condition bug is critical and must be fixed before deployment.