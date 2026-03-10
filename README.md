# RAG vs Direct Context Comparison Tool

A comprehensive Next.js application for comparing **RAG (Retrieval-Augmented Generation)** implementations with **Direct Context Window** approaches. This tool helps developers understand the trade-offs between using RAG systems versus sending entire documents directly to LLMs.

## 🎯 Purpose

This application provides side-by-side comparison of two approaches to document-based question answering:

1. **RAG Approach**: Documents are uploaded to OpenRAG which handles chunking, indexing, and retrieval automatically
2. **Direct Approach**: Entire documents are sent directly to the LLM's context window

The comparison includes detailed metrics on:
- Response quality
- Token usage and costs
- Processing time
- Context window utilization
- Document parsing requirements

## ✨ Key Features

### Document Support
- **Text Files**: `.txt`, `.md`, `.json` - Can be sent directly to models (no parsing needed)
- **PDF Files**: `.pdf` - Requires parsing for direct approach (RAG handles natively)
- **Word Documents**: `.docx`, `.doc` - Requires parsing for direct approach (RAG handles natively)

**Key Insight**: 
- **RAG Approach**: Can handle ALL formats natively via OpenRAG SDK - no parsing needed
- **Direct Approach**: Requires parsing for binary formats (PDF, DOCX) since models cannot accept binary files directly

This parsing requirement is automatically tracked and displayed in the comparison results, highlighting a key advantage of RAG systems.

### Comparison Metrics
- **Token Usage**: Input/output tokens for both approaches
- **Cost Analysis**: Real-time cost calculation based on model pricing
- **Performance**: Retrieval time, generation time, total time
- **Context Window Usage**: Percentage of model's context window utilized
- **Source Citations**: Retrieved chunks with relevance scores (RAG only)
- **Parsing Requirements**: Whether document parsing was needed (Direct only)

### Security
- OWASP security standards implementation
- Input validation and sanitization
- File upload security (size limits, type validation, path traversal prevention)
- Secure API routes with error handling

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or later
- **npm** or **yarn**
- **OpenRAG Server** running and accessible

### Installation

1. **Clone the repository and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env.local
```

3. **Configure your `.env.local` file:**

```env
# OpenRAG Server Configuration
OPENRAG_URL=http://localhost:3000
OPENRAG_API_KEY=your_api_key_here
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

### Type Checking

Run TypeScript type checking:

```bash
npm run type-check
```

## 📖 Usage Guide

### 1. Upload a Document

1. Navigate to the home page
2. Drag and drop a document or click to browse
3. Select file type: TXT, MD, JSON, PDF, DOCX, or DOC
4. Select the LLM model to use for comparison
5. Click "Upload and Process"

The system will:
- Validate and parse the document (if needed for direct approach)
- Upload to OpenRAG (handles chunking and indexing automatically)
- Load full document for direct approach
- Display processing statistics and any warnings

### 2. Run Comparisons

1. Enter your question in the query form
2. Configure comparison settings:
   - **Model**: LLM model for generation
   - **Top K**: Number of chunks to retrieve (RAG only)
   - **Temperature**: Generation randomness (0-1)
3. Click "Compare Approaches"

The system will:
- Execute RAG query (OpenRAG retrieves relevant chunks + generates answer)
- Execute direct query (full document sent to model + generates answer)
- Display side-by-side results with comprehensive metrics

### 3. Analyze Results

Review the comparison metrics:

**RAG Approach:**
- Retrieved chunks with relevance scores
- Retrieval time + generation time
- Token usage (only retrieved chunks)
- Cost based on actual tokens used
- No parsing required (OpenRAG handles all formats)

**Direct Approach:**
- Full document context
- Generation time only
- Token usage (entire document)
- Context window utilization percentage
- Parsing requirements indicated (for PDF/DOCX)
- May exceed context limits for large documents

## 🏗️ Architecture Overview

### Application Structure

```
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout with metadata
│   │   ├── page.tsx                  # Main comparison interface
│   │   ├── globals.css               # Global styles
│   │   └── api/                      # API routes
│   │       └── rag-comparison/
│   │           ├── upload/           # Document upload endpoint
│   │           │   └── route.ts
│   │           └── query/            # Query comparison endpoint
│   │               └── route.ts
│   ├── components/                   # React components
│   │   ├── DocumentUpload.tsx        # File upload with drag-drop
│   │   ├── QueryForm.tsx             # Query input and configuration
│   │   ├── ComparisonResults.tsx     # Side-by-side results display
│   │   └── MetricsDisplay.tsx        # Detailed metrics visualization
│   ├── lib/                          # Core business logic
│   │   ├── env.ts                    # Environment validation (Zod)
│   │   ├── openrag.ts                # OpenRAG client wrapper
│   │   ├── constants/
│   │   │   └── models.ts             # Model configs and pricing
│   │   ├── rag-comparison/
│   │   │   ├── document-processor.ts # File parsing (for direct approach)
│   │   │   ├── document-storage.ts   # In-memory document store
│   │   │   ├── rag-pipeline.ts       # RAG indexing and querying
│   │   │   ├── direct-pipeline.ts    # Direct context querying
│   │   │   └── metrics-calculator.ts # Metrics computation
│   │   └── utils/
│   │       ├── token-estimator.ts    # Token counting
│   │       └── formatters.ts         # Display formatting
│   └── types/                        # TypeScript definitions
│       ├── index.ts                  # Shared types
│       └── rag-comparison.ts         # Comparison-specific types
├── .env.example                      # Environment template
├── .env.local                        # Local environment (gitignored)
├── next.config.js                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── tailwind.config.ts                # Tailwind CSS configuration
└── package.json                      # Dependencies and scripts
```

### Data Flow

1. **Document Upload**:
   - User uploads document → API validates file
   - **RAG Pipeline**: Document sent to OpenRAG (handles chunking/indexing automatically)
   - **Direct Pipeline**: Document parsed if needed (PDF/DOCX) → Full text stored in memory
   - Processing stats returned to user

2. **Query Execution**:
   - User submits query → API receives request
   - **RAG Pipeline**: OpenRAG retrieves relevant chunks → Generates answer
   - **Direct Pipeline**: Full document loaded → Sent to model → Generates answer
   - Metrics calculated for both approaches
   - Results returned with side-by-side comparison

### Key Components

**Document Processor** (`document-processor.ts`):
- Validates file types and sizes
- Parses PDFs (pdf-parse) and DOCX (mammoth) for direct approach
- Tracks whether parsing was required
- Security: Path traversal prevention, size limits, type validation

**RAG Pipeline** (`rag-pipeline.ts`):
- Uploads documents to OpenRAG
- OpenRAG handles chunking and indexing automatically
- Executes retrieval queries
- Calculates RAG-specific metrics

**Direct Pipeline** (`direct-pipeline.ts`):
- Validates context window limits
- Builds full document context
- Tracks context window usage
- Warns when approaching limits

**Metrics Calculator** (`metrics-calculator.ts`):
- Computes token usage and costs
- Calculates performance metrics
- Generates comparison insights

## 🛠️ Technology Stack

### Core Framework
- **Next.js 16.x** - React framework with App Router and Turbopack
- **React 19** - UI library with latest features
- **TypeScript 5.6** - Type safety and developer experience

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

### Document Processing
- **pdf-parse 2.4** - PDF text extraction (for direct approach)
- **mammoth 1.11** - DOCX text extraction (for direct approach)
- **canvas 3.2** - PDF rendering support

### RAG & AI
- **OpenRAG SDK 0.1.3** - RAG functionality with automatic chunking and indexing
- **Zod 3.23** - Schema validation and runtime type checking

### Development Tools
- **ESLint 9** - Code linting with Next.js config
- **TypeScript Compiler** - Type checking

## 🔒 Security Features

Following OWASP security standards:

### HTTP Security Headers
- Strict-Transport-Security (HSTS)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### Input Validation
- File type and size validation
- Path traversal prevention
- Null byte filtering
- Input sanitization
- Zod schema validation

### API Security
- Request validation
- Error handling without information leakage
- Secure environment variable handling

## 📊 Supported Models

The application supports multiple LLM models with automatic cost calculation:

- **GPT-4 Turbo** (128K context)
- **GPT-4** (8K context)
- **GPT-3.5 Turbo** (16K context)
- **Claude 3 Opus** (200K context)
- **Claude 3 Sonnet** (200K context)
- **Claude 3 Haiku** (200K context)

Model pricing is automatically updated based on current rates.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENRAG_URL` | OpenRAG server URL | Yes | - |
| `OPENRAG_API_KEY` | OpenRAG API key | Yes | - |

### File Upload Limits

- **Max File Size**: 10MB
- **Allowed Extensions**: .txt, .md, .json, .pdf, .docx, .doc
- **Validation**: MIME type and extension checking

## 🐛 Troubleshooting

### Build Issues

**Problem**: PDF parsing errors during build  
**Solution**: The application uses dynamic imports for pdf-parse to avoid build-time issues. Ensure canvas is installed.

**Problem**: Turbopack warnings about lockfiles  
**Solution**: Remove unnecessary lockfiles or configure `turbopack.root` in next.config.js

### Runtime Issues

**Problem**: "Cannot connect to OpenRAG"  
**Solution**: Verify OPENRAG_URL and OPENRAG_API_KEY in .env.local

**Problem**: "File type not supported"  
**Solution**: Ensure file extension is in allowed list (.txt, .md, .json, .pdf, .docx, .doc)

**Problem**: "Context limit exceeded" (Direct approach)  
**Solution**: Use RAG approach for large documents or select a model with larger context window

**Problem**: PDF parsing fails  
**Solution**: Ensure PDF contains extractable text (not scanned images)

## 📝 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server

# Quality Checks
npm run type-check       # Run TypeScript type checking

# Utilities
npm install              # Install dependencies
npm update               # Update dependencies
```

## 🎓 Understanding the Comparison

### When to Use RAG

✅ **Use RAG when:**
- Documents are large (exceed model context windows)
- You need to search across multiple documents
- Cost efficiency is important (only relevant chunks are processed)
- You want automatic handling of various file formats
- Documents are frequently updated

### When to Use Direct Context

✅ **Use Direct Context when:**
- Documents are small (fit comfortably in context window)
- You need the model to consider the entire document
- Document structure/context is important
- You're working with simple text files
- Maximum accuracy for small documents is critical

### Key Differences Highlighted

| Aspect | RAG Approach | Direct Approach |
|--------|-------------|-----------------|
| **File Handling** | OpenRAG handles all formats | Requires parsing for PDF/DOCX |
| **Token Usage** | Only retrieved chunks | Entire document |
| **Cost** | Lower (fewer tokens) | Higher (all tokens) |
| **Context Limits** | No limit (retrieves relevant parts) | Limited by model context window |
| **Processing** | Retrieval + Generation | Generation only |
| **Best For** | Large documents, multiple docs | Small documents, full context needed |

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure type checking passes (`npm run type-check`)
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenRAG SDK for RAG functionality with automatic chunking
- Next.js team for the excellent framework
- pdf-parse and mammoth for document parsing
- The open-source community

---

**Made with Bob** - AI-powered development assistant