# Visual OpenRAG Filter Management

## Overview

This document describes the implementation of visual filter management for OpenRAG knowledge filters. The system allows users to create, select, and manage filters through a visual UI with color-coded badges, replacing the previous hardcoded "Compare" filter approach.

## Architecture

### Core Components

#### 1. Filter Context (`src/contexts/FilterContext.tsx`)
- **Purpose**: Global state management for filters
- **Features**:
  - CRUD operations for filters
  - Current filter selection with localStorage persistence
  - Automatic filter list refresh
  - Error handling and loading states

#### 2. Filter Selector (`src/components/filters/FilterSelector.tsx`)
- **Purpose**: Visual filter selection interface
- **UI Pattern**: Tag/badge-based selector (not dropdown)
- **Features**:
  - Color-coded filter badges
  - Selected/unselected states with visual feedback
  - Inline "Create Filter" button
  - Responsive grid layout

#### 3. Filter Form (`src/components/filters/FilterForm.tsx`)
- **Purpose**: Create/edit filter interface
- **Features**:
  - Name input with validation
  - Color picker (5x2 grid of 10 colors)
  - Visual color preview
  - Form validation

#### 4. Filter Management Modal (`src/components/filters/FilterManagementModal.tsx`)
- **Purpose**: Full CRUD interface for filters
- **Features**:
  - List all filters with color badges
  - Edit filter (name and color)
  - Delete filter with confirmation
  - Create new filter

#### 5. Global Config Bar (`src/components/config/GlobalConfigBar.tsx`)
- **Purpose**: Centralized configuration interface
- **Layout**: Three sections in a single bar
  - **Inference Model**: Ollama model selector for local inference
  - **Knowledge Filter**: Filter selector for RAG operations
  - **Pricing Model**: OpenAI model selector for cost calculations
- **Placement**: Between page header and tab navigation

### API Endpoints

All endpoints are located in `src/app/api/filters/`:

#### GET `/api/filters/list`
- **Purpose**: Retrieve all filters
- **Response**: Array of FilterConfig objects with id, name, and color

#### POST `/api/filters/create`
- **Purpose**: Create new filter
- **Body**: `{ name: string, color: FilterColor }`
- **Response**: Created FilterConfig object

#### PUT `/api/filters/update`
- **Purpose**: Update existing filter
- **Body**: `{ id: string, name: string, color: FilterColor }`
- **Response**: Updated FilterConfig object

#### DELETE `/api/filters/delete`
- **Purpose**: Delete filter
- **Body**: `{ id: string }`
- **Response**: Success confirmation

### OpenRAG Integration

#### Filter Colors
The system uses 10 colors matching OpenRAG's visual style:
- `teal` (default)
- `red`
- `emerald`
- `blue`
- `purple`
- `amber`
- `green`
- `indigo`
- `pink`
- `orange`

Each color has two states:
- **Selected**: Bright, saturated color with white text
- **Unselected**: Muted color with gray text

#### Pipeline Integration

**Upload Phase** (`src/app/api/rag-comparison/upload-stream/route.ts`):
```typescript
// Receives filterId from FormData
const filterId = formData.get('filterId') as string;

// Passes to RAG pipeline
await processRAGPipeline(
  file,
  filename,
  filterId,  // Dynamic filter
  sendEvent
);
```

**Query Phase** (`src/app/api/rag-comparison/query/route.ts`):
```typescript
// Receives filterId from request body
const { query, documentId, filterId, ... } = await req.json();

// Passes to RAG pipeline query
const ragResult = await ragPipeline.query(
  query,
  documentId,
  filterId,  // Dynamic filter
  temperature,
  maxTokens
);
```

**RAG Pipeline** (`src/lib/rag-comparison/pipelines/rag-pipeline.ts`):
```typescript
// Renamed function for clarity
async addFilenameToFilter(filterId: string, filename: string) {
  const filter = await this.sdk.knowledgeFilters.get(filterId);
  await filter.addFilename(filename);
}

// Query uses dynamic filter
async query(
  query: string,
  documentId: string,
  filterId: string,  // Dynamic filter parameter
  temperature: number,
  maxTokens: number
) {
  const filter = await this.sdk.knowledgeFilters.get(filterId);
  // Use filter for retrieval...
}
```

## User Workflow

### Creating a Filter
1. Click "Create Filter" button in Filter Selector
2. Enter filter name
3. Select color from 5x2 grid
4. Click "Create Filter"
5. New filter appears in selector and is auto-selected

### Selecting a Filter
1. Click on any filter badge in the Global Config Bar
2. Selected filter is highlighted with bright color
3. Selection persists across page reloads (localStorage)

### Managing Filters
1. Click "Manage Filters" button in Filter Selector
2. Modal opens showing all filters
3. Edit: Click edit icon, modify name/color, save
4. Delete: Click delete icon, confirm deletion
5. Create: Use form at bottom of modal

### Document Upload
1. Select filter in Global Config Bar
2. Upload document(s) in Ingest tab
3. Documents are added to selected filter
4. Filter validation prevents upload without selection

### Querying
1. Select filter in Global Config Bar
2. Navigate to Query tab
3. Enter question and submit
4. RAG pipeline uses selected filter for retrieval
5. Filter validation prevents query without selection

## Technical Details

### State Management

**FilterContext State**:
```typescript
{
  filters: FilterConfig[];           // All available filters
  currentFilter: FilterConfig | null; // Currently selected filter
  isLoading: boolean;                // Loading state
  error: string | null;              // Error state
}
```

**localStorage Key**: `selectedFilterId`
- Persists selected filter across sessions
- Auto-loads on mount
- Clears if filter no longer exists

### Validation

**Upload Validation** (`src/components/upload/DocumentUpload.tsx`):
```typescript
if (!currentFilter) {
  setError('Please select a filter before uploading documents');
  return;
}
```

**Query Validation** (`src/app/page.tsx`):
```typescript
if (!currentFilter) {
  setRagError('Please select a filter before querying');
  setDirectError('Please select a filter before querying');
  setOllamaError('Please select a filter before querying');
  return;
}
```

### Color System

**Tailwind Classes**:
```typescript
const colorClasses = {
  teal: {
    selected: 'bg-unkey-teal text-white',
    unselected: 'bg-unkey-teal/10 text-unkey-teal'
  },
  // ... other colors
};
```

**Color Picker Grid**:
- 5 columns × 2 rows
- 48px × 48px color swatches
- Visual selection indicator
- Hover effects

## Migration from Hardcoded Filter

### Before
```typescript
// Hardcoded "Compare" filter
const COMPARE_FILTER_ID = 'Compare';

async ensureKnowledgeFilter() {
  let filter = await this.sdk.knowledgeFilters.get(COMPARE_FILTER_ID);
  if (!filter) {
    filter = await this.sdk.knowledgeFilters.create({
      id: COMPARE_FILTER_ID,
      name: 'Compare'
    });
  }
  return filter;
}
```

### After
```typescript
// Dynamic filter from user selection
async addFilenameToFilter(filterId: string, filename: string) {
  const filter = await this.sdk.knowledgeFilters.get(filterId);
  await filter.addFilename(filename);
}

// Query accepts filterId parameter
async query(query: string, documentId: string, filterId: string, ...) {
  const filter = await this.sdk.knowledgeFilters.get(filterId);
  // Use filter...
}
```

## UI Placement Rationale

### Global Config Bar Approach
**Chosen Solution**: Single configuration bar above tabs

**Advantages**:
1. **Visibility**: Always visible, never hidden by tab switching
2. **Context**: Clear that settings apply to all operations
3. **Consistency**: All configuration in one place
4. **Efficiency**: No need to set per-tab
5. **Clarity**: Three distinct sections for different purposes

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Inference Model │ Knowledge Filter │ Pricing Model      │
│ [Ollama Select] │ [Filter Badges]  │ [OpenAI Select]   │
└─────────────────────────────────────────────────────────┘
```

### Alternative Approaches Considered

**Option 2: Per-Tab Configuration**
- ❌ Rejected: Redundant, confusing, inconsistent state

**Option 3: Sidebar Configuration**
- ❌ Rejected: Takes up horizontal space, less visible

**Option 4: Modal Configuration**
- ❌ Rejected: Hidden by default, extra clicks required

## Testing

### Manual Testing Checklist
- [ ] Create filter with each color
- [ ] Select different filters
- [ ] Upload document with selected filter
- [ ] Query with selected filter
- [ ] Edit filter name and color
- [ ] Delete filter
- [ ] Verify localStorage persistence
- [ ] Test validation (upload/query without filter)
- [ ] Test filter switching between operations
- [ ] Verify color visual feedback

### Edge Cases
- No filters exist (show create prompt)
- Selected filter deleted (clear selection)
- Network error during CRUD operations
- Concurrent filter modifications
- localStorage corruption

## Future Enhancements

### Potential Features
1. **Filter Descriptions**: Add optional description field
2. **Filter Statistics**: Show document count per filter
3. **Filter Search**: Search/filter in management modal
4. **Filter Export/Import**: Share filter configurations
5. **Filter Templates**: Pre-configured filter sets
6. **Filter Permissions**: Multi-user filter access control
7. **Filter Analytics**: Usage tracking and insights
8. **Bulk Operations**: Multi-select for batch operations

### Performance Optimizations
1. **Filter Caching**: Cache filter list in memory
2. **Lazy Loading**: Load filters on demand
3. **Optimistic Updates**: Update UI before API confirmation
4. **Debounced Search**: For filter search feature

## Troubleshooting

### Common Issues

**Issue**: Filters not loading
- **Cause**: OpenRAG SDK connection issue
- **Solution**: Check environment variables, verify SDK initialization

**Issue**: Selected filter not persisting
- **Cause**: localStorage disabled or corrupted
- **Solution**: Clear localStorage, check browser settings

**Issue**: Upload fails with filter error
- **Cause**: Filter deleted or doesn't exist
- **Solution**: Refresh filter list, select valid filter

**Issue**: Color not displaying correctly
- **Cause**: Tailwind class not generated
- **Solution**: Verify color is in safelist, rebuild

## References

- OpenRAG SDK Documentation: https://docs.openrag.com
- Filter Management Types: `src/types/filter-management.ts`
- Filter Context: `src/contexts/FilterContext.tsx`
- Global Config Bar: `src/components/config/GlobalConfigBar.tsx`
- RAG Pipeline: `src/lib/rag-comparison/pipelines/rag-pipeline.ts`

## Changelog

### Version 1.0.0 (2026-03-27)
- Initial implementation of visual filter management
- Created FilterContext for global state management
- Built FilterSelector with tag/badge UI
- Added color property with 10 OpenRAG colors
- Created FilterForm with color picker
- Built FilterManagementModal for CRUD operations
- Created GlobalConfigBar for centralized configuration
- Refactored RAG pipeline to use dynamic filters
- Updated upload and query APIs to accept filterId
- Added validation for filter selection
- Implemented localStorage persistence
- Removed hardcoded "Compare" filter
- Created comprehensive documentation

---

**Made with Bob** 🤖