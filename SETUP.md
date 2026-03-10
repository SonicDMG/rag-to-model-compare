# RAG vs Direct Context Comparison - Setup Guide

## Overview

This application compares two approaches to document-based question answering:
1. **RAG (Retrieval-Augmented Generation)** - Uses OpenRAG SDK for document chunking, indexing, and retrieval
2. **Direct Context** - Sends the entire document directly to the LLM

## Prerequisites

### Required Services

1. **OpenRAG Server** - Must be running and accessible
   - Default port: 3000
   - Get your API key from OpenRAG settings

2. **Node.js** - Version 18.x or later

### Environment Setup

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your OpenRAG credentials:
   ```env
   # OpenRAG Server URL (where OpenRAG is running)
   OPENRAG_URL=http://localhost:3000

   # OpenRAG API Key (get from OpenRAG settings)
   OPENRAG_API_KEY=your_api_key_here
   ```

## Running the Application

### Development Mode

The application will automatically use the PORT environment variable or default to Next.js defaults:

```bash
npm run dev
```

If you need to specify a port (e.g., if OpenRAG is on 3000):
```bash
PORT=3020 npm run dev
```

Then open your browser to the port shown in the terminal (e.g., http://localhost:3020)

### Production Mode

```bash
npm run build
npm start
```

## Architecture

### RAG Pipeline (uses OpenRAG SDK)
- **Document Upload**: Uses `client.documents.ingest()` from OpenRAG SDK
- **Query Execution**: Uses `client.chat.create()` with automatic retrieval
- **No Direct HTTP Calls**: All communication through OpenRAG SDK

### Direct Pipeline (independent)
- **Document Upload**: Parses documents locally (PDF, DOCX, TXT)
- **Query Execution**: Sends full document context directly to LLM
- **No OpenRAG**: Completely separate from RAG pipeline

## Key Changes Made

### 1. Port Configuration
- **Issue**: OpenRAG runs on port 3000, conflicting with Next.js default
- **Solution**: Application uses PORT environment variable (set at runtime)
- **No hardcoded ports** in package.json

### 2. OpenRAG SDK Integration
- **Before**: Used direct HTTP fetch calls to OpenRAG API
- **After**: Uses official OpenRAG SDK for all RAG operations
- **Benefits**: 
  - Type safety
  - Better error handling
  - Automatic retries and connection management

### 3. Error Handling
- Added comprehensive error handling for OpenRAG SDK errors:
  - `AuthenticationError` - Invalid API key
  - `NotFoundError` - Resource not found
  - `ValidationError` - Invalid request
  - `RateLimitError` - Rate limit exceeded
  - `ServerError` - OpenRAG server issues

### 4. Separation of Concerns
- **RAG Pipeline**: Only uses OpenRAG SDK
- **Direct Pipeline**: Independent, no OpenRAG dependency
- **No stream crossing**: Each pipeline is completely separate

## Troubleshooting

### "Both RAG and Direct processing failed"

**Possible Causes:**

1. **OpenRAG Not Running**
   - Check if OpenRAG server is running on the configured port
   - Verify with: `curl http://localhost:3000/health`

2. **Invalid API Key**
   - Check `OPENRAG_API_KEY` in `.env.local`
   - Get a new key from OpenRAG settings if needed

3. **Wrong URL**
   - Verify `OPENRAG_URL` points to your OpenRAG instance
   - Default is `http://localhost:3000`

4. **Port Conflict**
   - If OpenRAG is on port 3000, run Next.js on a different port:
     ```bash
     PORT=3020 npm run dev
     ```

### "Authentication failed"
- Your `OPENRAG_API_KEY` is invalid or expired
- Get a new API key from OpenRAG settings

### "Cannot connect to OpenRAG"
- OpenRAG server is not running or not accessible
- Check the URL in `OPENRAG_URL`
- Verify network connectivity

## Testing the Application

1. **Start OpenRAG Server** (on port 3000)
2. **Start this application** (on a different port, e.g., 3020)
3. **Upload a document** (PDF, DOCX, or TXT)
4. **Ask questions** to both RAG and Direct approaches
5. **Compare results** side-by-side

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── rag-comparison/
│   │       ├── upload/route.ts    # Document upload endpoint
│   │       └── query/route.ts     # Query comparison endpoint
│   └── page.tsx                   # Main UI
├── lib/
│   ├── rag-comparison/
│   │   ├── rag-pipeline.ts        # RAG using OpenRAG SDK
│   │   ├── direct-pipeline.ts     # Direct context (no OpenRAG)
│   │   ├── document-processor.ts  # PDF/DOCX parsing
│   │   └── document-storage.ts    # In-memory storage
│   └── constants/
│       └── models.ts               # Model configs and pricing
└── types/
    └── rag-comparison.ts           # TypeScript types
```

## Important Notes

1. **OpenRAG SDK Only for RAG**: The RAG pipeline uses OpenRAG SDK exclusively
2. **Direct Pipeline is Independent**: Does not use OpenRAG at all
3. **No Hardcoded Ports**: Use environment variables for port configuration
4. **Error Handling**: All OpenRAG SDK errors are properly caught and handled

## Support

For issues related to:
- **OpenRAG SDK**: Check https://docs.openr.ag/sdk/typescript
- **This Application**: Check the main README.md
- **OpenRAG Server**: Check OpenRAG documentation

## Security

- API keys are stored in `.env.local` (gitignored)
- Input validation on all user inputs
- File upload size limits (10MB)
- OWASP security standards followed