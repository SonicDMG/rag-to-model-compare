# Metrics Breakdown UI Implementation

## Overview
This document describes the implementation of the detailed metrics breakdown feature for the RAG-to-Model comparison application.

## Components Created

### Helper Components (src/components/ui/)

1. **ProgressBar.tsx**
   - Reusable progress bar component with percentage visualization
   - Supports multiple color variants (blue, green, gray, orange)
   - Configurable height (sm, md, lg)
   - Smooth transitions and accessibility features

2. **Tooltip.tsx**
   - Hover-based tooltip component for explanatory text
   - Supports multiple positions (top, bottom, left, right)
   - Includes `InfoTooltip` helper component with info icon
   - Keyboard navigation support

3. **Badge.tsx**
   - Label/indicator component with multiple variants
   - Includes `EstimatedBadge` helper for marking estimated values
   - Configurable sizes and colors

### Breakdown View Components (src/components/breakdown/)

1. **TimingBreakdownView.tsx**
   - Displays timing metrics breakdown
   - Shows retrieval time (RAG only) and generation time
   - Includes percentage calculations and progress bars
   - Stacked bar visualization for time distribution
   - "Estimated" badge for RAG generation time with tooltip

2. **TokenBreakdownView.tsx**
   - Displays token usage breakdown
   - Shows input tokens (system prompt, query, context)
   - Shows output tokens
   - Per-source token breakdown for RAG (collapsible, shows top 3 by default)
   - Tree view with progress bars for percentages
   - Color coding: blue for input, green for output

3. **CostBreakdownView.tsx**
   - Displays cost breakdown
   - Shows input and output costs with rates per 1K tokens
   - Table format with component breakdown
   - Shows "Not Available" for embedding costs (RAG only) with explanation
   - Cost distribution bar chart

4. **ContextWindowBreakdownView.tsx**
   - Displays context window usage
   - Circular progress indicator showing percentage used
   - Breakdown by component (system prompt, query, context, output)
   - Shows remaining capacity
   - Stacked bar visualization
   - Warning message when usage exceeds 90%

### Main Component

**MetricsBreakdownPanel.tsx**
- Main accordion-style component that integrates all breakdown views
- Expandable/collapsible with smooth transitions
- Tab navigation for different breakdown categories
- Displays metadata and limitations notices
- Props: `breakdown: DetailedMetricsBreakdown`, `pipelineType: 'rag' | 'direct'`
- Fully accessible with ARIA labels and keyboard navigation

## Integration

The `MetricsBreakdownPanel` has been integrated into:

1. **RagSection.tsx**
   - Added below the existing metrics display
   - Only renders if `ragResult.metrics.breakdown` is available
   - Passes `pipelineType="rag"`

2. **DirectModelSection.tsx**
   - Added below the existing metrics display
   - Only renders if `directResult.metrics.breakdown` is available
   - Passes `pipelineType="direct"`

## Features Implemented

### Visual Design
- ✅ Tailwind CSS classes consistent with existing components
- ✅ Smooth transitions for expandable sections
- ✅ Tooltips with info icon (ⓘ) and hover behavior
- ✅ Clear progress bars with percentages
- ✅ Color scheme: blue for input/retrieval, green for output/generation

### Responsive Design
- ✅ Mobile-friendly layout
- ✅ Collapsible sections work on all screen sizes
- ✅ Tables/charts adapt to smaller screens
- ✅ Grid layouts adjust for mobile (1 column) and desktop (2 columns)

### Accessibility
- ✅ Proper ARIA labels for expandable sections
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Color contrast meets WCAG 2.1 AA standards
- ✅ Role attributes for tabs and panels

### Key Implementation Details

**Estimated Indicators:**
- ✅ "Estimated" badge next to RAG generation time
- ✅ Tooltip: "This value is estimated as the difference between total time and retrieval time. OpenRAG SDK doesn't provide separate generation timing."

**Embedding Cost:**
- ✅ Shows "Not Available" with info icon
- ✅ Tooltip: "Embedding costs are managed by OpenRAG and not exposed in API responses. Typical embedding costs are ~$0.0001 per 1K tokens."

**Per-Source Breakdown (RAG):**
- ✅ Shows top 3 sources by default
- ✅ "Show all sources" button if more than 3
- ✅ Each source shows: ID/name, token count, percentage

**Formatting:**
- ✅ Times: "1,234ms" or "1.23s" for larger values
- ✅ Tokens: "5,234 tokens" with comma separators
- ✅ Costs: "$0.0523" with 4 decimal places
- ✅ Percentages: "37%" or "37.5%" (1 decimal if needed)

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── ProgressBar.tsx
│   │   ├── Tooltip.tsx
│   │   └── Badge.tsx
│   ├── breakdown/
│   │   ├── TimingBreakdownView.tsx
│   │   ├── TokenBreakdownView.tsx
│   │   ├── CostBreakdownView.tsx
│   │   └── ContextWindowBreakdownView.tsx
│   ├── MetricsBreakdownPanel.tsx
│   ├── RagSection.tsx (modified)
│   └── DirectModelSection.tsx (modified)
```

## Testing

- ✅ TypeScript compilation: No errors
- ✅ Build process: Successful
- ✅ All imports resolved correctly
- ✅ Components follow existing patterns
- ✅ No breaking changes to existing functionality

## Usage

The breakdown panel will automatically appear when:
1. A query is executed (RAG or Direct)
2. The backend provides breakdown data in the response
3. The user can expand/collapse the panel to view detailed metrics
4. Users can switch between tabs to view different metric categories

## Notes

- The implementation gracefully handles missing/undefined breakdown data
- All components use existing utility functions from `src/lib/utils/formatters.ts`
- The design is consistent with the existing UI patterns in the application
- Components are fully typed with TypeScript for type safety

## Made with Bob