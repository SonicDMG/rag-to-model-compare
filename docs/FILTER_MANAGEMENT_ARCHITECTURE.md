# Filter Management Architecture

## Overview

This document explains the critical filter management system that prevents race conditions during concurrent file uploads. **This system has been broken multiple times and must be protected from future modifications.**

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution](#the-solution)
3. [Implementation Details](#implementation-details)
4. [Critical Code Sections](#critical-code-sections)
5. [Testing](#testing)
6. [Modification Guidelines](#modification-guidelines)
7. [Troubleshooting](#troubleshooting)

---

## The Problem

### Race Condition Scenario

When multiple files are uploaded concurrently (e.g., folder upload with 10 files), each upload request independently calls `ensureKnowledgeFilter()`. Without proper synchronization:

```
Time    Request 1           Request 2           Request 3
----    ---------           ---------           ---------
T0      Search for filter   
T1                          Search for filter
T2                                              Search for filter
T3      No filter found
T4                          No filter found
T5                                              No filter found
T6      Create filter A
T7                          Create filter B
T8                                              Create filter C
T9      Store file1 → A
T10                         Store file2 → B
T11                                             Store file3 → C
```

**Result:** Three different filters created, files split across them, queries return incomplete results.

### Impact

- **Data Inconsistency:** Files associated with different filter IDs
- **Incomplete Queries:** Queries only return files from one filter
- **User Confusion:** Missing files in search results
- **Data Integrity:** Difficult to recover without manual intervention

---

## The Solution

### Three-Layer Defense

1. **Lock Mechanism:** Ensures only ONE request creates/finds the filter
2. **Cache Mechanism:** Avoids repeated API calls for subsequent requests
3. **Debounced Batch Updates:** Collects filenames and updates filter once

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ensureKnowledgeFilter()                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Cache Valid?     │
                    └──────────────────┘
                       │           │
                   YES │           │ NO
                       ▼           ▼
              ┌──────────────┐  ┌──────────────┐
              │ Return Cache │  │ Lock Active? │
              └──────────────┘  └──────────────┘
                                   │           │
                               YES │           │ NO
                                   ▼           ▼
                          ┌──────────────┐  ┌──────────────┐
                          │ Wait for     │  │ Acquire Lock │
                          │ Lock Result  │  │ & Search/    │
                          └──────────────┘  │ Create       │
                                   │        └──────────────┘
                                   │              │
                                   └──────┬───────┘
                                          ▼
                                  ┌──────────────┐
                                  │ Cache Result │
                                  │ Release Lock │
                                  └──────────────┘
                                          │
                                          ▼
                                  ┌──────────────┐
                                  │ Return ID    │
                                  └──────────────┘
```

---

## Implementation Details

### 1. Lock Mechanism

**Location:** `src/app/api/rag-comparison/upload/route.ts`

```typescript
// Module-level variables (shared across all requests)
let filterCreationLock: Promise<string> | null = null;
let cachedFilterId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 60 seconds
```

**How It Works:**

1. **First Request:** No lock exists, creates lock promise, searches/creates filter
2. **Concurrent Requests:** Lock exists, they await the same promise
3. **Lock Release:** First request completes, sets cache, releases lock
4. **Subsequent Requests:** Use cached value (fast path)

**Critical Points:**

- Lock MUST be module-level (not request-scoped)
- Lock MUST be released in `finally` block
- Cache MUST be set before releasing lock
- Concurrent requests MUST await the lock, not create new ones

### 2. Cache Mechanism

**Purpose:** Avoid repeated API calls for subsequent uploads

**TTL:** 60 seconds (configurable via `CACHE_TTL`)

**Validation:**
```typescript
if (cachedFilterId && (now - cacheTimestamp) < CACHE_TTL) {
  return cachedFilterId; // Fast path
}
```

**Why 60 seconds?**
- Long enough for typical multi-file uploads
- Short enough to detect external filter deletions
- Balances performance vs. freshness

### 3. Debounced Batch Updates

**Location:** `scheduleBatchFilterUpdate()` function

**Problem:** Each file needs to add its filename to the filter's `data_sources` array

**Without Debouncing:**
```
File 1: Update filter with [file1.txt]
File 2: Update filter with [file2.txt]  ← Overwrites file1!
File 3: Update filter with [file3.txt]  ← Overwrites file1, file2!
```

**With Debouncing:**
```
File 1: Schedule update, start 2s timer
File 2: Add to pending, reset timer
File 3: Add to pending, reset timer
... 2 seconds of inactivity ...
Timer fires: Update filter with [file1.txt, file2.txt, file3.txt]
```

**Implementation:**
```typescript
let pendingFilterUpdates: Set<string> = new Set();
let filterUpdateTimer: NodeJS.Timeout | null = null;
const FILTER_UPDATE_DELAY = 2000; // 2 seconds

async function scheduleBatchFilterUpdate(filterId: string, filename: string) {
  pendingFilterUpdates.add(filename);
  
  if (filterUpdateTimer) {
    clearTimeout(filterUpdateTimer);
  }
  
  filterUpdateTimer = setTimeout(async () => {
    const filenames = Array.from(pendingFilterUpdates);
    pendingFilterUpdates.clear();
    
    // Single atomic update with all filenames
    await client.knowledgeFilters.update(filterId, {
      queryData: {
        filters: {
          data_sources: [...existingFiles, ...filenames]
        }
      }
    });
  }, FILTER_UPDATE_DELAY);
}
```

---

## Critical Code Sections

### ⚠️ DO NOT MODIFY WITHOUT REVIEW

#### Section 1: Module-Level Variables

**File:** `src/app/api/rag-comparison/upload/route.ts`  
**Lines:** ~213-260

```typescript
// CRITICAL: These MUST be module-level, not request-scoped
let filterCreationLock: Promise<string> | null = null;
let cachedFilterId: string | null = null;
let cacheTimestamp: number = 0;
let pendingFilterUpdates: Set<string> = new Set();
let filterUpdateTimer: NodeJS.Timeout | null = null;
```

**Why Critical:** Moving these inside a function or request handler breaks the lock mechanism.

#### Section 2: ensureKnowledgeFilter Function

**File:** `src/app/api/rag-comparison/upload/route.ts`  
**Lines:** ~336-439

**Critical Logic:**
1. Cache check (fast path)
2. Lock check (wait for concurrent request)
3. Lock acquisition (slow path)
4. Lock release in `finally` block

**Common Mistakes:**
- ❌ Removing the lock check
- ❌ Not awaiting the lock
- ❌ Forgetting the `finally` block
- ❌ Not setting cache before releasing lock

#### Section 3: Filter ID Validation

**File:** `src/app/api/rag-comparison/upload/route.ts`  
**Lines:** ~782-830

**Validates:**
- Filter ID is not null/undefined
- Filter ID is a non-empty string
- Filter ID has reasonable length
- Filter exists in OpenRAG

**Why Critical:** Catches silent failures that could lead to race conditions.

#### Section 4: Filter ID Consistency Check

**File:** `src/app/api/rag-comparison/upload/route.ts`  
**Lines:** ~1030-1045

**Validates:**
- All files in a batch use the same filter ID
- Stored filter ID matches expected filter ID

**Why Critical:** Detects race conditions that slip through other checks.

---

## Testing

### Automated Integration Test

**File:** `src/__tests__/filter-race-condition.test.ts`

**Run Command:**
```bash
npx ts-node src/__tests__/filter-race-condition.test.ts
```

**What It Tests:**
1. **Concurrent Filter Creation:** 5 simultaneous uploads use same filter ID
2. **Single Filter Existence:** Only one "Compare" filter exists
3. **Cache Mechanism:** Second call is significantly faster

**Test Output:**
```
✅ All 5 concurrent uploads used the SAME filter ID
✅ Exactly ONE "Compare" filter exists
✅ Cache mechanism working correctly (10x faster)
```

**When to Run:**
- Before deploying any changes to filter management
- After modifying `ensureKnowledgeFilter()`
- After modifying `scheduleBatchFilterUpdate()`
- When debugging race condition issues

### Manual Testing

**Scenario 1: Folder Upload**
1. Upload a folder with 10+ files
2. Check logs for filter ID consistency
3. Verify all files appear in query results

**Scenario 2: Rapid Single Uploads**
1. Upload 5 files individually in quick succession
2. Check logs for lock acquisition/waiting
3. Verify only one filter created

**Expected Log Pattern:**
```
🔍 [call-1] ensureKnowledgeFilter() called
🔒 [call-1] Acquiring filter creation lock...
🔍 [call-2] ensureKnowledgeFilter() called
⏳ [call-2] Waiting for lock...
🔍 [call-3] ensureKnowledgeFilter() called
⏳ [call-3] Waiting for lock...
✅ [call-1] Created filter: abc123
🔓 [call-1] Releasing lock
✅ [call-2] Got filter ID from concurrent request: abc123
✅ [call-3] Got filter ID from concurrent request: abc123
```

---

## Modification Guidelines

### Before Making Changes

1. **Read This Document:** Understand the race condition and solution
2. **Review Existing Code:** Study the current implementation
3. **Run Tests:** Ensure current tests pass
4. **Plan Changes:** Document what you're changing and why

### Safe Modifications

✅ **Allowed:**
- Adjusting `CACHE_TTL` (with testing)
- Adjusting `FILTER_UPDATE_DELAY` (with testing)
- Adding more logging
- Adding more validation checks
- Improving error messages

❌ **Forbidden Without Expert Review:**
- Removing the lock mechanism
- Removing the cache mechanism
- Removing the debounce mechanism
- Making variables request-scoped
- Skipping the lock check
- Removing the `finally` block
- Calling `ensureKnowledgeFilter()` multiple times per request

### After Making Changes

1. **Run Integration Test:** Must pass 100%
2. **Manual Testing:** Test with 10+ concurrent uploads
3. **Log Review:** Verify lock/cache behavior in logs
4. **Code Review:** Get approval from someone who understands the race condition
5. **Documentation:** Update this document if behavior changes

---

## Troubleshooting

### Issue: Multiple Filters Created

**Symptoms:**
- Multiple "Compare" filters in OpenRAG
- Files split across different filter IDs
- Incomplete query results

**Diagnosis:**
```bash
# Check logs for concurrent filter creation
grep "Creating new filter" logs.txt

# Should see only ONE creation, others should "wait for lock"
```

**Causes:**
1. Lock mechanism broken (variables not module-level)
2. Lock not being awaited
3. Cache not being set
4. Lock not being released

**Fix:**
1. Verify module-level variables
2. Verify lock await logic
3. Run integration test
4. Delete duplicate filters manually

### Issue: Slow Upload Performance

**Symptoms:**
- Every upload takes 2+ seconds
- Logs show repeated filter searches

**Diagnosis:**
```bash
# Check cache hit rate
grep "Using cached filter" logs.txt
grep "Searching for filter" logs.txt
```

**Causes:**
1. Cache TTL too short
2. Cache not being set
3. Cache being cleared prematurely

**Fix:**
1. Verify cache is being set after filter creation
2. Consider increasing `CACHE_TTL`
3. Check for code that clears cache

### Issue: Files Missing from Queries

**Symptoms:**
- Some files don't appear in query results
- Inconsistent search results

**Diagnosis:**
```bash
# Check filter ID consistency
grep "Filter ID mismatch" logs.txt
grep "stored with filter ID" logs.txt
```

**Causes:**
1. Files using different filter IDs
2. Batch update not executing
3. Race condition in filter updates

**Fix:**
1. Check runtime validation logs
2. Verify debounce mechanism
3. Run integration test

### Issue: Deadlock/Hanging Uploads

**Symptoms:**
- Uploads never complete
- Requests timeout
- Logs show "waiting for lock" but never complete

**Diagnosis:**
```bash
# Check for lock release
grep "Releasing filter creation lock" logs.txt
grep "Acquiring filter creation lock" logs.txt
```

**Causes:**
1. Lock not released (missing `finally` block)
2. Exception before lock release
3. Lock promise never resolves

**Fix:**
1. Verify `finally` block exists
2. Check for exceptions in lock code
3. Restart server to clear stuck lock

---

## References

### Related Documentation

- [FILTER_LOCK_FIX_FINAL.md](./FILTER_LOCK_FIX_FINAL.md) - Original fix documentation
- [FILTER_RACE_CONDITION_FIX.md](./FILTER_RACE_CONDITION_FIX.md) - Initial race condition fix

### Code Locations

- **Main Implementation:** `src/app/api/rag-comparison/upload/route.ts`
- **Integration Test:** `src/__tests__/filter-race-condition.test.ts`
- **Type Definitions:** `src/types/rag-comparison.ts`

### External Resources

- [OpenRAG SDK Documentation](https://docs.openrag.com)
- [Node.js Async/Await Best Practices](https://nodejs.org/en/docs/guides/blocking-vs-non-blocking/)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-19 | Initial documentation | System |

---

## Contact

If you need to modify this system and are unsure about the implications:

1. **Read this entire document**
2. **Run the integration test**
3. **Test with concurrent uploads**
4. **Get code review from someone familiar with the race condition**

**Remember:** This bug has been fixed multiple times. Don't be the one to break it again! 🔒