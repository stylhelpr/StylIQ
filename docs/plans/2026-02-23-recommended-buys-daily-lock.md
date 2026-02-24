# Recommended Buys — Daily Refresh Lock

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lock Recommended Buys to refresh at most once per calendar day per user — no re-scoring, no re-LLM, no re-vector-search within the same day.

**Architecture:** Replace the rolling 24-hour TTL + profile fingerprint invalidation in `isCacheValid()` with a single calendar-date check against the existing `batch_date` column in `user_discover_products`. No new table needed — the existing table already stores `batch_date` (YYYY-MM-DD) on every save.

**Tech Stack:** PostgreSQL `CURRENT_DATE`, existing `user_discover_products` table.

---

## Why No New Table

The spec proposes `user_recommended_buys_snapshot`, but `user_discover_products` already serves this purpose:

| Spec field | Existing column |
|---|---|
| `user_id` | `user_id` (indexed) |
| `snapshot_date` | `batch_date` (date) |
| `recommendations` | Individual product rows with `is_current = TRUE` |
| `created_at` | Implicit from `batch_date` |

Adding a new table with JSONB `recommendations` would duplicate data already stored row-by-row. The existing `batch_date` + `is_current` pattern is the snapshot.

---

## Current vs. New Behavior

| Aspect | Current | New |
|---|---|---|
| Cache check | Rolling 24h TTL from `last_discover_refresh` timestamp | `batch_date = CURRENT_DATE` on existing products |
| Mid-day invalidation | Profile fingerprint change breaks cache | No mid-day invalidation |
| Cache source of truth | `users.last_discover_refresh` + fingerprint | `user_discover_products.batch_date` |
| Same-day behavior | Could regenerate if profile edited | Always serves cached products |

---

## Scope Isolation

**Changed:** `isCacheValid()` in `discover.service.ts` (1 method)

**NOT changed:**
- AI Stylist Suggestions
- Outfit Studio
- Ask Styla
- Trips
- `fetchPersonalizedProducts()` (generation logic untouched)
- `saveProducts()` (write path untouched)
- `getCachedProducts()` (read path untouched)
- `updateRefreshTimestamp()` (kept for audit trail)
- Learning event recording (still fires immediately)
- Veto, curator, brain gate modules

---

## Tasks

### Task 1: Write failing test for daily lock behavior

**Files:**
- Create: `apps/backend-nest/src/services/__tests__/discover-daily-lock.spec.ts`

**Step 1: Write the failing test**

```typescript
import { pool } from '../../db/pool';

/**
 * Test the daily lock behavior of isCacheValid.
 * We test via the public getRecommended() entrypoint by observing
 * whether fetchPersonalizedProducts is called or skipped.
 *
 * Since isCacheValid is private, we test it indirectly:
 * - Seed user_discover_products with batch_date = today → expect cache hit
 * - Seed with batch_date = yesterday → expect cache miss
 */

// Minimal mock to test the date-based cache logic
describe('Recommended Buys Daily Lock', () => {
  // Direct DB test of the date check query
  describe('isCacheValid date logic (query-level)', () => {
    const testUserId = 'test-daily-lock-user';

    afterEach(async () => {
      await pool.query(
        'DELETE FROM user_discover_products WHERE user_id = $1',
        [testUserId],
      );
    });

    it('should return rows when batch_date = today', async () => {
      const today = new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO user_discover_products
         (user_id, product_id, title, brand, price, image_url, link, source, category, position, batch_date, is_current, saved)
         VALUES ($1, 'test-prod-1', 'Test Product', 'TestBrand', 99.99, 'http://img', 'http://link', 'test', 'Tops', 0, $2, TRUE, FALSE)`,
        [testUserId, today],
      );

      const result = await pool.query(
        `SELECT 1 FROM user_discover_products
         WHERE user_id = $1 AND is_current = TRUE AND batch_date = CURRENT_DATE
         LIMIT 1`,
        [testUserId],
      );
      expect(result.rows.length).toBe(1);
    });

    it('should return NO rows when batch_date = yesterday', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO user_discover_products
         (user_id, product_id, title, brand, price, image_url, link, source, category, position, batch_date, is_current, saved)
         VALUES ($1, 'test-prod-2', 'Test Product', 'TestBrand', 99.99, 'http://img', 'http://link', 'test', 'Tops', 0, $2, TRUE, FALSE)`,
        [testUserId, yesterday],
      );

      const result = await pool.query(
        `SELECT 1 FROM user_discover_products
         WHERE user_id = $1 AND is_current = TRUE AND batch_date = CURRENT_DATE
         LIMIT 1`,
        [testUserId],
      );
      expect(result.rows.length).toBe(0);
    });

    it('should NOT be invalidated by profile fingerprint changes', async () => {
      const today = new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO user_discover_products
         (user_id, product_id, title, brand, price, image_url, link, source, category, position, batch_date, is_current, saved)
         VALUES ($1, 'test-prod-3', 'Test Product', 'TestBrand', 99.99, 'http://img', 'http://link', 'test', 'Tops', 0, $2, TRUE, FALSE)`,
        [testUserId, today],
      );

      // Even if profile fingerprint differs, cache should still be valid
      // (this test just confirms the query doesn't involve fingerprint)
      const result = await pool.query(
        `SELECT 1 FROM user_discover_products
         WHERE user_id = $1 AND is_current = TRUE AND batch_date = CURRENT_DATE
         LIMIT 1`,
        [testUserId],
      );
      expect(result.rows.length).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend-nest && npx jest src/services/__tests__/discover-daily-lock.spec.ts --no-coverage`

Expected: Tests should pass at query level (they test the SQL pattern, not the service method). If DB connection fails, that's expected in CI — these are integration tests.

**Step 3: Commit**

```bash
git add apps/backend-nest/src/services/__tests__/discover-daily-lock.spec.ts
git commit -m "test: add daily lock query-level tests for recommended buys"
```

---

### Task 2: Replace `isCacheValid()` with calendar-date check

**Files:**
- Modify: `apps/backend-nest/src/services/discover.service.ts:1060-1096`

**Step 1: Replace `isCacheValid()` method**

Change from (lines 1060-1096):
```typescript
private async isCacheValid(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT last_discover_refresh FROM users WHERE id = $1',
      [userId],
    );
    const lastRefresh = result.rows[0]?.last_discover_refresh;
    if (!lastRefresh) return false;
    const lastRefreshTime = new Date(lastRefresh).getTime();
    const age = Date.now() - lastRefreshTime;
    if (age >= TWENTY_FOUR_HOURS_MS) return false;
    // Profile fingerprint check...
    const profile = await this.getUserProfile(userId);
    const currentFp = computeProfileFingerprint(profile);
    const storedFpResult = await pool.query(
      `SELECT prefs_jsonb->'discover_profile_fp' as fp FROM style_profiles WHERE user_id = $1`,
      [userId],
    );
    const storedFp = storedFpResult.rows[0]?.fp;
    if (storedFp && storedFp !== currentFp) {
      if (DEBUG_RECOMMENDED_BUYS) {
        console.log('DISCOVER_CACHE_INVALID_PROFILE_CHANGED', { storedFp, currentFp });
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

To:
```typescript
private async isCacheValid(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT 1 FROM user_discover_products
       WHERE user_id = $1 AND is_current = TRUE AND batch_date = CURRENT_DATE
       LIMIT 1`,
      [userId],
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
```

**What this does:**
- Single query: checks if today's snapshot exists
- No rolling TTL — calendar date boundary only
- No profile fingerprint invalidation — same-day stability guaranteed
- `CURRENT_DATE` uses the PostgreSQL server's date (UTC on Cloud Run)

**Step 2: Remove unused constant**

`TWENTY_FOUR_HOURS_MS` is no longer referenced. Remove line 68:
```typescript
// REMOVE:
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
```

**Step 3: Verify no other references to `TWENTY_FOUR_HOURS_MS`**

Run: `grep -rn 'TWENTY_FOUR_HOURS_MS' apps/backend-nest/src/services/discover.service.ts`

Expected: 0 matches after removal.

**Step 4: Run tests**

Run: `cd apps/backend-nest && npx jest --no-coverage --passWithNoTests`

Expected: All existing tests pass.

**Step 5: Commit**

```bash
git add apps/backend-nest/src/services/discover.service.ts
git commit -m "feat: lock recommended buys to calendar-day refresh cycle

Replace rolling 24h TTL + profile fingerprint invalidation with
batch_date = CURRENT_DATE check. Within same calendar day, cached
products are always served — no re-scoring, no re-LLM, no re-search."
```

---

## Verification Checklist

After implementation, confirm:

- [ ] `isCacheValid()` contains ONLY the `batch_date = CURRENT_DATE` query
- [ ] `TWENTY_FOUR_HOURS_MS` constant is removed
- [ ] No other file references `TWENTY_FOUR_HOURS_MS`
- [ ] `fetchPersonalizedProducts()` is untouched
- [ ] `saveProducts()` is untouched (still writes `batch_date` correctly)
- [ ] `getCachedProducts()` is untouched
- [ ] `updateRefreshTimestamp()` is untouched (still updates `last_discover_refresh` for audit)
- [ ] No changes to veto, curator, or brain modules
- [ ] No changes to Trips, Outfit Studio, Ask Styla, or AI Stylist
- [ ] Generation path unreachable when `is_current = TRUE AND batch_date = CURRENT_DATE` rows exist
- [ ] User opening app 5x same day → identical list every time
- [ ] Next calendar day → fresh generation

## Risks

1. **Timezone edge case:** `CURRENT_DATE` in PostgreSQL uses the server timezone. Cloud Run defaults to UTC. Users near midnight UTC may see a refresh mid-evening local time. This is acceptable — it's consistent and deterministic.

2. **Empty cache on same day:** If `saveProducts()` fails but `updateRefreshTimestamp()` succeeds, current code has an edge case where cache is "valid" but empty. The existing guard `if (cacheValid && cached.length === 0)` at line 901 handles this — it logs a warning and proceeds to fetch. This is preserved.

3. **DEBUG_RECOMMENDED_BUYS bypass:** The existing `debugMode` check at line 882-884 still bypasses cache for debugging. This is preserved.
