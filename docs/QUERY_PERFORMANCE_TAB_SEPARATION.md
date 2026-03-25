# Query vs Performance Tab Separation

## Issue
The Query and Performance tabs were showing redundant information - both displayed detailed metrics breakdowns, which was confusing and unnecessary.

## Solution
Separated concerns between the two tabs:

### Query Tab (Focus: Answers)
**Purpose**: Get quick answers and see real-time processing

**Shows**:
- Query form with advanced settings
- **Answers** from all 3 pipelines (RAG, Hybrid, Direct)
- Real-time processing timelines
- **Quick at-a-glance metrics** (time, tokens, cost)
- Retrieved sources (for RAG)
- Context window usage
- Link to Performance tab for detailed metrics

**Does NOT show**:
- Detailed metric breakdowns
- Comparison charts
- Historical queries

### Performance Tab (Focus: Metrics)
**Purpose**: Deep dive into performance metrics and comparisons

**Shows**:
- Query history selector (last 10 queries)
- **Comparison overview cards** (Speed, Tokens, Cost winners)
- **Detailed metric breakdowns** (timing, tokens, cost, context window)
- Full result sections with all metrics panels
- Historical query replay

**Does NOT show**:
- Query form (use Query tab for that)
- Duplicate answer displays

## Implementation

### New Components Created
1. **`RagAnswerSection.tsx`** - Simplified RAG display (answer + timeline + quick metrics)
2. **`HybridAnswerSection.tsx`** - Simplified Hybrid display (answer + timeline + quick metrics)
3. **`DirectAnswerSection.tsx`** - Simplified Direct display (answer + timeline + quick metrics)

### Components Modified
- **`QueryTab.tsx`** - Now uses simplified answer sections instead of full ComparisonResults
- **`PerformanceTab.tsx`** - Unchanged, continues to use full detailed sections

### User Flow
1. **Query Tab**: Ask question → See answers with quick metrics → "View detailed metrics in Performance tab" link
2. **Performance Tab**: Deep dive into metrics → Compare approaches → Review historical queries

## Benefits
✅ **Clear separation of concerns**
✅ **No redundant information**
✅ **Query tab is faster/lighter** (no heavy metrics panels)
✅ **Performance tab is focused** on analysis
✅ **Better user experience** - know where to go for what

## Files Changed
- Created: `src/components/results/RagAnswerSection.tsx`
- Created: `src/components/results/HybridAnswerSection.tsx`
- Created: `src/components/results/DirectAnswerSection.tsx`
- Modified: `src/components/tabs/QueryTab.tsx`

## Date
March 25, 2026

---
**Made with Bob**