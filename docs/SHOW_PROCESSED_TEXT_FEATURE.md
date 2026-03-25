# Show Processed Text Feature

## Location

The "Show processed text" dropdown appears in **two places**:

### 1. Upload Results (After Upload, Before Query)
- **RAG Upload Result** - Shows the processed text that was indexed
- **Hybrid Upload Result** - Shows the processed text loaded into memory

The dropdown appears at the **bottom** of each upload result card.

### 2. Query Results (After Querying) - NEWLY ADDED
- **RAG Section** - Shows the document content
- **Hybrid Section** - Shows the document content  
- **Direct/Ollama Section** - Shows the document content

The dropdown appears at the **bottom** of the results section, after the metrics breakdown.

## How It Works

### Upload Time
1. Document is uploaded and parsed
2. API returns `processedText` field with the extracted content
3. `UploadResultBase` component renders a collapsible section
4. Click "Show processed text" to expand and see the content

### Query Time (New)
1. Document content is retrieved from storage
2. Passed through props: `page.tsx` → `UnifiedQuerySection` → `ComparisonResults` → Result sections
3. Each result section renders a collapsible section at the bottom
4. Click "Show processed text" to expand and see the content

## Implementation Details

### Upload Results
- **Component**: `src/components/upload/UploadResultBase.tsx` (lines 228-253)
- **Data Flow**: 
  - API: `src/app/api/rag-comparison/upload-stream/route.ts` (line 788)
  - Props: `processedText` passed to `RagUploadResult` and `HybridUploadResult`
  - Display: Collapsible section with scrollable pre-formatted text

### Query Results  
- **Components**: 
  - `src/components/results/DirectSection.tsx`
  - `src/components/results/HybridSection.tsx`
  - `src/components/results/RagSection.tsx`
- **Data Flow**:
  - Storage: `getDocument()` retrieves content
  - Props chain: `page.tsx` → `UnifiedQuerySection` → `ComparisonResults` → Result sections
  - Display: Collapsible section with scrollable pre-formatted text

## Styling

Each section uses its pipeline's color scheme:
- **RAG**: Green (`text-success`, `border-success/20`)
- **Hybrid**: Blue (`text-blue`, `border-blue/20`)
- **Direct/Ollama**: Purple (`text-purple-400`, `border-purple-500/20`)

## Troubleshooting

### "I don't see the dropdown"

1. **Check if document uploaded successfully** - The dropdown only appears if `processedText` is available
2. **Check upload result status** - Must be "success" status
3. **Scroll down** - The dropdown is at the bottom of the result card
4. **Check console** - Look for "[Page] Retrieved document content" log message

### "The dropdown is empty"

1. **Check API response** - Verify `processedText` field in network tab
2. **Check document parsing** - Some files may fail to extract text
3. **Check file type** - Binary files without text won't have content

### "Content is truncated"

- The display has `max-h-96` (384px) with scrolling
- This is intentional to prevent overwhelming the UI
- Scroll within the box to see all content

## Related Files

- `src/components/upload/UploadResultBase.tsx` - Upload time display
- `src/components/results/*Section.tsx` - Query time display
- `src/app/api/rag-comparison/upload-stream/route.ts` - API that returns processedText
- `src/lib/rag-comparison/processing/document-storage.ts` - Storage for query time retrieval