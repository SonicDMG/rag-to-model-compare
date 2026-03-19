# Integration Tests

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