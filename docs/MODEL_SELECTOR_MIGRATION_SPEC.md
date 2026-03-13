# Model Selector Migration - Technical Specification

## Executive Summary

This document provides a comprehensive technical specification for migrating the model selection dropdown from the document upload phase to the performance metrics section. This change enables users to switch between models after uploading documents, allowing dynamic comparison of different cost/performance outcomes without re-uploading.

**Current State:** Model selected before upload → Single query per upload
**Target State:** Model selected in metrics section → Re-query capability with different models

---

## 1. Component Architecture Changes

### 1.1 Components to Modify

#### **DocumentUpload.tsx** (Lines 1-700+)
**Changes Required:**
- **Remove:** Model dropdown UI (lines 625-643)
- **Remove:** Model state management (`const [model, setModel] = useState<string>(DEFAULT_MODEL)` at line 55)
- **Remove:** Model parameter from `onUploadComplete` callback (line 37)
- **Simplify:** Upload flow to focus only on document selection and processing
- **Keep:** All document processing logic, file validation, and upload status handling

**Impact:** Simplifies upload UX, removes ~50 lines of model selection code

#### **MetricsBreakdownPanel.tsx** (Lines 1-187)
**Changes Required:**
- **Add:** Model selector dropdown component in the header section (before tabs, after line 63)
- **Add:** Props for model change callback: `onModelChange?: (newModel: string) => void`
- **Add:** Props for current model: `currentModel: string`
- **Add:** Props for loading state: `isChangingModel?: boolean`
- **Modify:** Display current model with ability to change it
- **Add:** Validation logic to check context window compatibility before allowing model switch

**New UI Structure:**
```
┌─────────────────────────────────────────┐
│ Detailed Metrics Breakdown       [▼]   │ ← Expandable header
├─────────────────────────────────────────┤
│ Model: [Dropdown: gpt-4o ▼] [Switch]   │ ← NEW: Model selector
├─────────────────────────────────────────┤
│ [Timing] [Tokens] [Cost] [Context]     │ ← Existing tabs
└─────────────────────────────────────────┘
```

#### **RagSection.tsx** & **DirectModelSection.tsx**
**Changes Required:**
- **Pass through:** Model change handler to `MetricsBreakdownPanel`
- **Add:** Loading overlay when model is being switched
- **Update:** Display logic to show "Updating with new model..." state

#### **page.tsx** (Main Application)
**Changes Required:**
- **Remove:** `selectedModel` state management (line 16)
- **Remove:** Model parameter from `handleUploadComplete` (lines 31-36)
- **Add:** Model state management at query level (not upload level)
- **Add:** `handleModelChange` function to trigger re-query with new model
- **Modify:** `handleQueryBoth` to accept optional model parameter for re-queries
- **Add:** State to track if a re-query is in progress

### 1.2 New Components to Create

#### **ModelSelector.tsx**
**Purpose:** Reusable model selection dropdown with validation

**Props Interface:**
```typescript
interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (newModel: string) => void;
  disabled?: boolean;
  contextWindowUsed?: number; // For validation
  variant?: 'success' | 'info'; // For styling (RAG vs Direct)
  showContextWarning?: boolean;
}
```

**Features:**
- Dropdown with all available models from `SUPPORTED_MODELS`
- Display model name, context window size, and pricing
- Validate context window compatibility before allowing selection
- Show warning if new model has smaller context window than current usage
- Loading state during model switch
- Accessible keyboard navigation

**Location:** `src/components/ModelSelector.tsx`

---

## 2. Data Flow Design

### 2.1 Current Flow (Before Changes)
```
Upload Phase:
User selects model → Upload document → Store with model → Query with that model

Query Phase:
User enters query → Use stored model → Get results → Display metrics
```

### 2.2 New Flow (After Changes)
```
Upload Phase:
Upload document → Store without model association

Query Phase:
User enters query → Use DEFAULT_MODEL → Get results → Display metrics

Model Switch Phase:
User selects new model in metrics → Validate context window → Re-query with new model → Update metrics
```

### 2.3 State Management Strategy

**Approach:** Props drilling with optional Context for complex scenarios

**State Location:**
- **page.tsx (Root):** 
  - `documentId: string | null`
  - `currentQuery: string | null` (NEW - store last query for re-execution)
  - `queryParams: { temperature: number; maxTokens: number } | null` (NEW)
  - `ragResult: RAGResult | null`
  - `directResult: DirectResult | null`
  - `isRequerying: boolean` (NEW - separate from initial query state)

**Data Flow:**
```
page.tsx
  ├─> RagSection
  │     └─> MetricsBreakdownPanel
  │           └─> ModelSelector (onModelChange callback)
  │
  └─> DirectModelSection
        └─> MetricsBreakdownPanel
              └─> ModelSelector (onModelChange callback)
```

### 2.4 Model Change Handler

**Function Signature:**
```typescript
const handleModelChange = async (
  newModel: string,
  pipelineType: 'rag' | 'direct'
) => {
  // 1. Validate context window compatibility
  // 2. Set loading state for specific pipeline
  // 3. Re-execute query with new model
  // 4. Update results for that pipeline only
  // 5. Clear loading state
}
```

**Key Considerations:**
- Only re-query the pipeline where model was changed (RAG or Direct)
- Preserve the other pipeline's results
- Use the same query and parameters from the original query
- Handle errors gracefully without losing existing results

---

## 3. API Modifications

### 3.1 Query API Changes

**File:** `src/app/api/rag-comparison/query/route.ts`

**Current Behavior:**
- Model parameter is optional, defaults to `DEFAULT_MODEL`
- Model is validated and sanitized
- Both pipelines use the same model

**Required Changes:**
✅ **No changes needed** - API already supports model parameter

**Validation to Add:**
- Check if document's token count exceeds new model's context window
- Return clear error message if incompatible

### 3.2 Model Override Logic

**Current:** Document stores model, but API can override it
**New:** Document doesn't store model, API always uses provided model parameter

**Implementation:**
```typescript
// In query route.ts (lines 136-141)
const { documentId, query, model, temperature, maxTokens, topK } = validatedData;

// Model is now always from request, not from stored document
const sanitizedModel = sanitizeInput(model);

// Validate context window before proceeding
const storedDoc = getDocument(sanitizedDocumentId);
if (storedDoc) {
  const modelConfig = getModelConfig(sanitizedModel);
  if (modelConfig && storedDoc.metadata.totalTokens > modelConfig.contextWindow) {
    return NextResponse.json({
      success: false,
      error: `Document (${storedDoc.metadata.totalTokens} tokens) exceeds ${sanitizedModel} context window (${modelConfig.contextWindow} tokens)`
    }, { status: 400 });
  }
}
```

---

## 4. Type System Updates

### 4.1 New Interfaces

**ModelChangeRequest:**
```typescript
interface ModelChangeRequest {
  documentId: string;
  query: string;
  newModel: string;
  temperature: number;
  maxTokens: number;
  topK?: number;
  pipelineType: 'rag' | 'direct';
}
```

**ModelValidationResult:**
```typescript
interface ModelValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  contextWindowInfo?: {
    modelLimit: number;
    documentTokens: number;
    percentageUsed: number;
  };
}
```

### 4.2 Modified Interfaces

**MetricsBreakdownPanelProps:**
```typescript
interface MetricsBreakdownPanelProps {
  breakdown: DetailedMetricsBreakdown;
  pipelineType: 'rag' | 'direct';
  // NEW PROPS:
  currentModel: string;
  onModelChange?: (newModel: string) => void;
  isChangingModel?: boolean;
  documentTokens?: number; // For validation
}
```

**DocumentUploadProps:**
```typescript
interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void; // REMOVED: model parameter
  onUploadResult?: (result: UploadResultData) => void;
}
```

### 4.3 Type Guards

**isModelCompatible:**
```typescript
function isModelCompatible(
  modelId: string,
  documentTokens: number
): ModelValidationResult {
  const modelConfig = getModelConfig(modelId);
  
  if (!modelConfig) {
    return {
      isValid: false,
      error: `Model ${modelId} not found`
    };
  }
  
  const percentageUsed = (documentTokens / modelConfig.contextWindow) * 100;
  
  if (documentTokens > modelConfig.contextWindow) {
    return {
      isValid: false,
      error: `Document (${documentTokens} tokens) exceeds model context window (${modelConfig.contextWindow} tokens)`,
      contextWindowInfo: {
        modelLimit: modelConfig.contextWindow,
        documentTokens,
        percentageUsed
      }
    };
  }
  
  const warnings: string[] = [];
  if (percentageUsed > 90) {
    warnings.push('Document uses >90% of context window');
  }
  
  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    contextWindowInfo: {
      modelLimit: modelConfig.contextWindow,
      documentTokens,
      percentageUsed
    }
  };
}
```

---

## 5. User Experience Flow

### 5.1 Step-by-Step Interaction

**Phase 1: Document Upload**
1. User uploads document (no model selection)
2. System processes document with both pipelines
3. Upload results show processing success/failure
4. User proceeds to query section

**Phase 2: Initial Query**
1. User enters query and parameters
2. System uses `DEFAULT_MODEL` (gpt-4o) for both pipelines
3. Results display with metrics for default model
4. Metrics panels show current model with dropdown

**Phase 3: Model Switching**
1. User expands metrics breakdown panel
2. User sees current model with dropdown selector
3. User selects different model from dropdown
4. System validates context window compatibility:
   - ✅ Compatible: Show "Switch Model" button
   - ❌ Incompatible: Show error message, disable switch
5. User clicks "Switch Model" button
6. System shows loading overlay on that pipeline
7. System re-executes query with new model
8. Results update with new metrics
9. User can compare by switching models multiple times

### 5.2 Visual Feedback States

**Model Selector States:**
```
┌─────────────────────────────────────┐
│ Model: [gpt-4o ▼]  [Switch Model]  │ ← Default state
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Model: [gpt-5 ▼]   [⟳ Switching...] │ ← Loading state
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Model: [gpt-4 ▼]   [⚠️ Too Large]   │ ← Error state
└─────────────────────────────────────┘
```

**Loading Overlay:**
```
┌─────────────────────────────────────┐
│  ⟳ Updating with gpt-5...          │
│                                     │
│  Re-executing query with new model  │
│  This may take a few moments        │
└─────────────────────────────────────┘
```

### 5.3 Error Handling

**Context Window Exceeded:**
```
⚠️ Model Incompatible

The selected model (gpt-4, 8K context) cannot process this document 
(12,450 tokens). Please select a model with a larger context window.

Recommended models:
• gpt-4o (128K context)
• gpt-5 (128K context)
```

**Re-query Failed:**
```
❌ Model Switch Failed

Failed to re-execute query with new model: [error message]

Your previous results are still available. Please try again or 
select a different model.
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Core Changes)
**Goal:** Remove model from upload, add basic model selector

**Tasks:**
1. ✅ Remove model dropdown from `DocumentUpload.tsx`
2. ✅ Remove model parameter from upload callbacks
3. ✅ Create `ModelSelector.tsx` component
4. ✅ Add model selector to `MetricsBreakdownPanel.tsx`
5. ✅ Update type definitions

**Deliverable:** Upload works without model selection, metrics show model selector (non-functional)

**Estimated Effort:** 4-6 hours

### Phase 2: Re-query Logic (Backend Integration)
**Goal:** Enable model switching with re-query capability

**Tasks:**
1. ✅ Add `handleModelChange` function in `page.tsx`
2. ✅ Implement context window validation
3. ✅ Add re-query state management
4. ✅ Connect model selector to re-query handler
5. ✅ Add loading states for re-queries

**Deliverable:** Users can switch models and see updated results

**Estimated Effort:** 6-8 hours

### Phase 3: UX Polish (Visual Feedback)
**Goal:** Smooth user experience with clear feedback

**Tasks:**
1. ✅ Add loading overlays during model switch
2. ✅ Implement error messages and warnings
3. ✅ Add model comparison hints
4. ✅ Improve accessibility (keyboard navigation, ARIA labels)
5. ✅ Add animations for state transitions

**Deliverable:** Polished, production-ready feature

**Estimated Effort:** 4-6 hours

### Phase 4: Testing & Documentation
**Goal:** Ensure reliability and maintainability

**Tasks:**
1. ✅ Test all model switching scenarios
2. ✅ Test context window validation edge cases
3. ✅ Test error handling and recovery
4. ✅ Update user documentation
5. ✅ Add inline code comments

**Deliverable:** Tested, documented feature

**Estimated Effort:** 3-4 hours

**Total Estimated Effort:** 17-24 hours

---

## 7. Edge Cases & Validation

### 7.1 Context Window Validation

**Scenario 1: Document Exceeds New Model's Context**
```
Document: 50,000 tokens
Current Model: gpt-4o (128K context) ✅
New Model: gpt-4 (8K context) ❌

Action: Block model switch, show error with recommendations
```

**Scenario 2: Document Near Context Limit**
```
Document: 115,000 tokens
Current Model: gpt-4o (128K context) ✅ (90% used)
New Model: gpt-5 (128K context) ✅ (90% used)

Action: Allow switch, show warning about high context usage
```

**Scenario 3: Switching to Larger Context**
```
Document: 50,000 tokens
Current Model: gpt-4o (128K context) ✅ (39% used)
New Model: gpt-5.4 (128K context) ✅ (39% used)

Action: Allow switch, no warnings
```

### 7.2 Model Availability

**Check Before Allowing Selection:**
```typescript
const availableModels = getAvailableModels();
const modelConfig = getModelConfig(selectedModel);

if (!modelConfig || !modelConfig.available) {
  // Show error: "Model not available"
  // Disable selection
}
```

### 7.3 Failed Re-queries

**Preserve Previous Results:**
```typescript
const handleModelChange = async (newModel: string, pipelineType: 'rag' | 'direct') => {
  // Store current results as backup
  const backupResults = {
    rag: ragResult,
    direct: directResult
  };
  
  try {
    // Attempt re-query
    await requery(newModel, pipelineType);
  } catch (error) {
    // Restore previous results
    setRagResult(backupResults.rag);
    setDirectResult(backupResults.direct);
    
    // Show error message
    showError(`Failed to switch to ${newModel}: ${error.message}`);
  }
};
```

### 7.4 Concurrent Model Switches

**Prevent Race Conditions:**
```typescript
const [isChangingModel, setIsChangingModel] = useState(false);

const handleModelChange = async (newModel: string) => {
  if (isChangingModel) {
    showWarning('Please wait for current model switch to complete');
    return;
  }
  
  setIsChangingModel(true);
  try {
    await requery(newModel);
  } finally {
    setIsChangingModel(false);
  }
};
```

### 7.5 Query History (Optional Enhancement)

**Store Multiple Results:**
```typescript
interface QueryHistory {
  query: string;
  timestamp: Date;
  results: {
    [modelId: string]: {
      rag: RAGResult;
      direct: DirectResult;
    };
  };
}

// Allow users to compare results across multiple models
// Show dropdown: "Compare with: [gpt-4o] [gpt-5] [gpt-4]"
```

---

## 8. Security Considerations

### 8.1 Input Validation

**Model Parameter:**
- Validate against `SUPPORTED_MODELS` whitelist
- Sanitize model string to prevent injection
- Check model availability before processing

**Context Window:**
- Validate token counts are positive integers
- Prevent overflow attacks with max limits
- Verify calculations are accurate

### 8.2 Rate Limiting

**Prevent Abuse:**
- Limit model switches per minute (e.g., 10 switches/min)
- Track re-query attempts per session
- Implement exponential backoff for failures

### 8.3 Error Information Disclosure

**Safe Error Messages:**
```typescript
// ❌ BAD: Exposes internal details
throw new Error(`Database query failed: ${dbError.stack}`);

// ✅ GOOD: Generic user-facing message
throw new Error('Failed to switch model. Please try again.');
// Log detailed error server-side only
```

---

## 9. Performance Considerations

### 9.1 Optimization Strategies

**Caching:**
- Cache model configurations (already done in constants)
- Consider caching query results by (documentId, query, model) tuple
- Implement LRU cache for recent queries

**Lazy Loading:**
- Load model selector component only when metrics panel is expanded
- Defer validation until user attempts to switch

**Debouncing:**
- Debounce model dropdown changes (300ms)
- Prevent accidental rapid switches

### 9.2 Loading States

**Progressive Enhancement:**
```
1. Show "Switching model..." immediately
2. Display progress: "Validating context window..."
3. Update: "Re-executing query..."
4. Complete: "Updated with [model]"
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**ModelSelector Component:**
- Renders with correct initial model
- Calls onModelChange when selection changes
- Disables incompatible models
- Shows warnings for high context usage

**Validation Functions:**
- `isModelCompatible` returns correct results
- Context window calculations are accurate
- Edge cases (0 tokens, max tokens) handled

### 10.2 Integration Tests

**Model Switch Flow:**
- Upload document → Query → Switch model → Verify new results
- Test with multiple models in sequence
- Verify previous results are preserved on error

**API Tests:**
- Query API accepts model parameter
- Returns error for incompatible models
- Handles missing/invalid model gracefully

### 10.3 E2E Tests

**User Scenarios:**
1. Upload small document → Switch between all models → Verify all work
2. Upload large document → Attempt switch to small context model → Verify blocked
3. Upload document → Query → Switch model → Verify metrics update
4. Upload document → Query → Switch model → Trigger error → Verify recovery

---

## 11. Migration Checklist

### Pre-Implementation
- [ ] Review specification with team
- [ ] Confirm API changes are backward compatible
- [ ] Set up feature flag for gradual rollout
- [ ] Create backup of current implementation

### Implementation
- [ ] Phase 1: Foundation (4-6 hours)
- [ ] Phase 2: Re-query Logic (6-8 hours)
- [ ] Phase 3: UX Polish (4-6 hours)
- [ ] Phase 4: Testing & Documentation (3-4 hours)

### Post-Implementation
- [ ] Deploy to staging environment
- [ ] Conduct user acceptance testing
- [ ] Monitor error rates and performance
- [ ] Gather user feedback
- [ ] Deploy to production with feature flag
- [ ] Gradually enable for all users
- [ ] Update user documentation and tutorials

---

## 12. Success Metrics

### Quantitative Metrics
- **Model Switch Success Rate:** >95% of switches complete successfully
- **Average Switch Time:** <3 seconds for re-query
- **Error Rate:** <2% of model switches result in errors
- **Context Window Validation Accuracy:** 100% (no false positives/negatives)

### Qualitative Metrics
- Users can easily compare models without re-uploading
- Clear feedback during model switching process
- Intuitive model selection interface
- Helpful error messages guide users to compatible models

---

## 13. Future Enhancements

### Short-term (Next Sprint)
1. **Model Comparison View:** Side-by-side comparison of results from multiple models
2. **Model Recommendations:** Suggest optimal model based on document size and query type
3. **Cost Estimator:** Show estimated cost before switching models

### Medium-term (Next Quarter)
1. **Query History:** Store and retrieve previous queries with different models
2. **Batch Model Testing:** Test query against multiple models simultaneously
3. **Model Performance Analytics:** Track which models perform best for different document types

### Long-term (Future)
1. **Auto-Model Selection:** AI-powered model selection based on query complexity
2. **Custom Model Configurations:** Allow users to configure temperature, top-p per model
3. **Model Fine-tuning Integration:** Support for custom fine-tuned models

---

## Appendix A: Code Examples

### Example 1: ModelSelector Component

```typescript
// src/components/ModelSelector.tsx
'use client';

import { useState } from 'react';
import { SUPPORTED_MODELS, getModelConfig } from '@/lib/constants/models';

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (newModel: string) => void;
  disabled?: boolean;
  contextWindowUsed?: number;
  variant?: 'success' | 'info';
}

export function ModelSelector({
  currentModel,
  onModelChange,
  disabled = false,
  contextWindowUsed,
  variant = 'info'
}: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [showWarning, setShowWarning] = useState(false);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    
    // Validate context window
    if (contextWindowUsed) {
      const modelConfig = getModelConfig(modelId);
      if (modelConfig && contextWindowUsed > modelConfig.contextWindow) {
        setShowWarning(true);
        return;
      }
    }
    
    setShowWarning(false);
  };

  const handleSwitch = () => {
    if (selectedModel !== currentModel) {
      onModelChange(selectedModel);
    }
  };

  const variantColors = {
    success: 'border-success/30 bg-success/10',
    info: 'border-blue/30 bg-blue/10'
  };

  return (
    <div className={`p-4 rounded-lg border ${variantColors[variant]}`}>
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-white">
          Model:
        </label>
        
        <select
          value={selectedModel}
          onChange={(e) => handleModelSelect(e.target.value)}
          disabled={disabled}
          className="px-3 py-2 bg-unkey-gray-850 border border-unkey-gray-700 rounded-md text-white"
        >
          {Object.entries(SUPPORTED_MODELS).map(([id, config]) => (
            <option key={id} value={id}>
              {config.name} ({config.contextWindow.toLocaleString()} tokens)
            </option>
          ))}
        </select>
        
        <button
          onClick={handleSwitch}
          disabled={disabled || selectedModel === currentModel || showWarning}
          className="px-4 py-2 bg-unkey-teal-500 text-white rounded-md hover:bg-unkey-teal-400 disabled:bg-unkey-gray-700 disabled:cursor-not-allowed"
        >
          Switch Model
        </button>
      </div>
      
      {showWarning && (
        <div className="mt-2 text-sm text-red-400">
          ⚠️ Document exceeds this model's context window
        </div>
      )}
    </div>
  );
}
```

### Example 2: Model Change Handler

```typescript
// In page.tsx
const handleModelChange = async (
  newModel: string,
  pipelineType: 'rag' | 'direct'
) => {
  if (!documentId || !currentQuery) {
    console.error('Cannot change model: missing document or query');
    return;
  }

  // Set loading state for specific pipeline
  if (pipelineType === 'rag') {
    setIsRagQuerying(true);
  } else {
    setIsDirectQuerying(true);
  }

  try {
    // Re-execute query with new model
    const response = await fetch('/api/rag-comparison/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: currentQuery,
        documentId,
        model: newModel,
        temperature: queryParams?.temperature ?? 0.7,
        maxTokens: queryParams?.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('Re-query failed');
    }

    // Handle SSE stream (same as original query)
    const reader = response.body?.getReader();
    // ... stream processing logic ...

  } catch (error) {
    console.error('Model change error:', error);
    
    if (pipelineType === 'rag') {
      setRagError('Failed to switch model. Please try again.');
    } else {
      setDirectError('Failed to switch model. Please try again.');
    }
  } finally {
    if (pipelineType === 'rag') {
      setIsRagQuerying(false);
    } else {
      setIsDirectQuerying(false);
    }
  }
};
```

---

## Appendix B: API Request/Response Examples

### Model Switch Request
```json
POST /api/rag-comparison/query
{
  "documentId": "doc-abc123",
  "query": "What is the main topic?",
  "model": "gpt-5",
  "temperature": 0.7,
  "maxTokens": 1000,
  "topK": 5
}
```

### Success Response (SSE Stream)
```
data: {"type":"rag","success":true,"data":{...}}

data: {"type":"direct","success":true,"data":{...}}

data: {"type":"complete"}
```

### Error Response (Context Window Exceeded)
```json
{
  "success": false,
  "error": "Document (50000 tokens) exceeds gpt-4 context window (8192 tokens)"
}
```

---

## Document Metadata

**Version:** 1.0
**Author:** Bob (Plan Mode)
**Date:** 2026-03-13
**Status:** Ready for Implementation
**Estimated Total Effort:** 17-24 hours
**Priority:** High
**Dependencies:** None (all required infrastructure exists)

---

*This specification is ready for review and implementation. All technical details, edge cases, and implementation phases have been thoroughly documented.*