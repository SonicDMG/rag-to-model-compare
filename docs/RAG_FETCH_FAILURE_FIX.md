# RAG Pipeline Fetch Failure Fix

## Problem
The RAG pipeline was failing with a generic "fetch failed" error when attempting to upload documents to the OpenRAG backend. The error provided no details about the root cause, making it difficult to diagnose whether the issue was:
- Network connectivity
- Incorrect URL configuration
- Authentication problems
- Server availability

## Root Cause
The `client.documents.ingest()` call in `rag-pipeline.ts` was not wrapped in proper error handling to capture and log detailed error information. When a network error occurred (such as ECONNREFUSED, ENOTFOUND, or ETIMEDOUT), the error was caught by the generic error handler but without sufficient context.

## Solution

### 1. Enhanced Error Handling in RAG Pipeline (`src/lib/rag-comparison/pipelines/rag-pipeline.ts`)

Added comprehensive try-catch block around the `client.documents.ingest()` call with:

- **Pre-ingestion logging**: Logs OpenRAG URL, API key status, filename, and file size before attempting ingestion
- **Detailed error capture**: Catches ingestion errors and logs:
  - Error type and constructor name
  - Error message and code
  - Status code (if available)
  - Error cause and stack trace
  - OpenRAG configuration details
- **Network error detection**: Specifically checks for common network errors:
  - `fetch failed` message
  - `ECONNREFUSED` (connection refused)
  - `ENOTFOUND` (hostname not found)
  - `ETIMEDOUT` (connection timeout)
- **User-friendly error messages**: Provides actionable suggestions based on error type

### 2. Enhanced Error Handling in Upload Route (`src/app/api/rag-comparison/upload-stream/route.ts`)

Added try-catch block around `ragIndexDocument()` call with:

- **Detailed error logging**: Logs error type, message, code, and details
- **Context preservation**: Includes document ID, filter ID, and filename in error logs
- **Event tracking**: Properly fails the indexing event with error details

### 3. Improved Network Error Detection (`src/lib/rag-comparison/utils/pipeline-utils.ts`)

Enhanced `handleOpenRAGError()` function to:

- **Prioritize network errors**: Check for fetch/network failures before other error types
- **Detect multiple error codes**: Handles ECONNREFUSED, ENOTFOUND, ETIMEDOUT
- **Provide specific suggestions**: Tailored error messages based on error code:
  - ECONNREFUSED: "The OpenRAG server refused the connection. Ensure it is running and accessible."
  - ENOTFOUND: "The OpenRAG server hostname could not be resolved. Check your OPENRAG_URL configuration."
  - ETIMEDOUT: "The connection to OpenRAG server timed out. Check network connectivity and server status."

## Error Messages

### Before Fix
```
[RAG] Pipeline error: fetch failed
```

### After Fix
```
╔════════════════════════════════════════════════════════════╗
║         OpenRAG Document Ingestion FAILED                 ║
╚════════════════════════════════════════════════════════════╝
❌ Error Type: TypeError
❌ Error Message: fetch failed
❌ Error Code: ECONNREFUSED
❌ Status Code: No status
❌ OpenRAG URL: http://localhost:3000
❌ API Key Present: true
❌ Filename: WALMART_2023_annualreport.pdf
❌ File Size: 1234567 bytes
❌ Error Cause: {"code":"ECONNREFUSED","errno":-61,"syscall":"connect"}
════════════════════════════════════════════════════════════

Cannot connect to OpenRAG backend at http://localhost:3000. 
The OpenRAG server refused the connection. Ensure it is running and accessible.
```

## Files Modified

1. **src/lib/rag-comparison/pipelines/rag-pipeline.ts**
   - Added try-catch around `client.documents.ingest()` call
   - Added pre-ingestion logging
   - Added detailed error logging with visual formatting
   - Added network error detection and user-friendly messages

2. **src/app/api/rag-comparison/upload-stream/route.ts**
   - Added try-catch around `ragIndexDocument()` call
   - Added detailed error logging in upload route
   - Properly fails event tracking on errors

3. **src/lib/rag-comparison/utils/pipeline-utils.ts**
   - Enhanced `handleOpenRAGError()` to prioritize network errors
   - Added detection for ECONNREFUSED, ENOTFOUND, ETIMEDOUT
   - Added specific error messages and suggestions for each error type

## Testing

To verify the fix works correctly:

1. **Test with OpenRAG server down**:
   - Stop the OpenRAG server
   - Attempt to upload a document
   - Should see detailed error message indicating connection refused

2. **Test with incorrect URL**:
   - Set OPENRAG_URL to an invalid hostname
   - Attempt to upload a document
   - Should see error message about hostname resolution

3. **Test with correct configuration**:
   - Ensure OpenRAG server is running
   - Set correct OPENRAG_URL and OPENRAG_API_KEY
   - Upload should succeed with detailed logging

## Benefits

1. **Better Diagnostics**: Developers can quickly identify the root cause of failures
2. **User-Friendly Messages**: Clear, actionable error messages for end users
3. **Debugging Support**: Comprehensive logging includes all relevant context
4. **Network Issue Detection**: Specifically identifies and handles common network errors
5. **Configuration Validation**: Helps identify misconfiguration issues early

## Related Issues

This fix addresses the "fetch failed" error that was occurring when:
- OpenRAG backend is not running
- OPENRAG_URL is misconfigured
- Network connectivity issues
- Authentication problems

The enhanced error handling ensures that all such issues are properly diagnosed and reported with actionable information.