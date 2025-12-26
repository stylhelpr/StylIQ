# WebBrowser Analytics GOLD Metrics — Implementation Guide to FAANG Compliance

This guide provides exact code changes needed to fix the 4 blocking issues.

---

## FIX #1: Add Consent Gating for GOLD Metrics

**File:** `apps/frontend/src/services/browserSyncService.ts`

**Problem:** `pushChanges()` syncs GOLD metrics without checking `trackingConsent`.

**Current Code (Lines 438-599):**
```typescript
async pushChanges(accessToken: string): Promise<SyncResponse | null> {
  const store = useShoppingStore.getState();
  const pendingChanges = store.getPendingChangesForSync();
  const pendingCartHistory = (pendingChanges as any).cartHistory || [];

  // GOLD: Get time-to-action and product interactions for sync
  const timeToActionLog = store.timeToActionLog || [];
  const productInteractions = store.productInteractions || [];

  // ... mapping code ...

  const requestBody: SyncRequest = {
    // ... mapped data ...
    timeToActionEvents: timeToActionLog.map(e => ({...})),     // ❌ NO CONSENT CHECK
    productInteractions: productInteractions.map(p => ({...})), // ❌ NO CONSENT CHECK
  };

  // Send to backend
  const response = await fetch(`${this.baseUrl}/browser-sync`, {...});
  // ...
}
```

**Fix:**
```typescript
async pushChanges(accessToken: string): Promise<SyncResponse | null> {
  const store = useShoppingStore.getState();
  const pendingChanges = store.getPendingChangesForSync();
  const pendingCartHistory = (pendingChanges as any).cartHistory || [];

  // ✅ CHECK CONSENT STATUS
  const isTrackingEnabled = store.trackingConsent === 'accepted';

  // GOLD: Get time-to-action and product interactions for sync (only if tracking enabled)
  const timeToActionLog = isTrackingEnabled ? (store.timeToActionLog || []) : [];
  const productInteractions = isTrackingEnabled ? (store.productInteractions || []) : [];

  // ... mapping code ...

  // ✅ ONLY INCLUDE GOLD METRICS IF TRACKING ACCEPTED
  const requestBody: SyncRequest = {
    // ... always sync bookmarks/history (app features) ...
    bookmarks: pendingChanges.bookmarks.map(...),
    history: pendingChanges.history.map(...),
    // ...

    // ✅ CONDITIONALLY INCLUDE GOLD METRICS
    timeToActionEvents: isTrackingEnabled
      ? timeToActionLog.map(e => ({...}))
      : [],
    productInteractions: isTrackingEnabled
      ? productInteractions.map(p => ({...}))
      : [],
  };

  console.log('[BrowserSync] Pushing changes. Tracking enabled:', isTrackingEnabled);

  // Send to backend
  const response = await fetch(`${this.baseUrl}/browser-sync`, {...});
  // ...

  // ✅ CLEAR SYNCED GOLD METRICS (only if tracking enabled)
  if (isTrackingEnabled) {
    store.clearSyncedGoldMetrics();
  }
}
```

**Also Update:** `fullSync()` and `deltaSync()` to log consent status (informational, no behavior change needed for pulls).

---

## FIX #2: Add URL Sanitization on Backend

**File:** `apps/backend-nest/src/browser-sync/browser-sync.service.ts`

**Problem:** `upsertBookmarks()` and `upsertHistory()` persist raw URLs with query params.

**Current Code (Line 303-348):**
```typescript
private async upsertBookmarks(
  userId: string,
  bookmarks: BookmarkDto[],
): Promise<void> {
  for (const bookmark of bookmarks) {
    await this.db.query(
      `INSERT INTO browser_bookmarks
       (user_id, url, title, ...)
       VALUES ($1, $2, $3, ...)
       ON CONFLICT (user_id, url)
       DO UPDATE SET ...`,
      [
        userId,
        bookmark.url,  // ❌ RAW URL - NEEDS SANITIZATION
        bookmark.title || null,
        // ...
      ],
    );
  }
}
```

**Fix - Add Sanitization Method:**
```typescript
// Add this helper method to BrowserSyncService class
private sanitizeUrl(url: string): string {
  if (!url) return '';

  try {
    // Parse URL and reconstruct without query/hash
    const parsed = new URL(url);
    // Only keep protocol, host, and pathname
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch (error) {
    // Fallback to regex if URL parsing fails
    const match = url.match(/^(https?:\/\/[^/?#]+(?:\/[^?#]*)?)/);
    return match ? match[1] : '';
  }
}

// Validate URL doesn't contain dangerous params
private validateUrl(url: string): void {
  if (url.includes('?') || url.includes('#')) {
    throw new BadRequestException(
      'URL contains query parameters or hash. Only canonical URLs allowed.'
    );
  }
}
```

**Fix - Apply to upsertBookmarks():**
```typescript
private async upsertBookmarks(
  userId: string,
  bookmarks: BookmarkDto[],
): Promise<void> {
  for (const bookmark of bookmarks) {
    // ✅ SANITIZE URL BEFORE INSERT
    const sanitizedUrl = this.sanitizeUrl(bookmark.url);
    this.validateUrl(sanitizedUrl);

    await this.db.query(
      `INSERT INTO browser_bookmarks
       (user_id, url, title, ...)
       VALUES ($1, $2, $3, ...)
       ON CONFLICT (user_id, url)
       DO UPDATE SET ...`,
      [
        userId,
        sanitizedUrl,  // ✅ SANITIZED
        bookmark.title || null,
        // ...
      ],
    );
  }
}
```

**Fix - Apply to upsertHistory():**
```typescript
private async upsertHistory(
  userId: string,
  history: HistoryEntryDto[],
): Promise<void> {
  for (const entry of history) {
    // ✅ SANITIZE URL BEFORE INSERT
    const sanitizedUrl = this.sanitizeUrl(entry.url);
    this.validateUrl(sanitizedUrl);

    await this.db.query(
      `INSERT INTO browser_history
       (user_id, url, ...)
       VALUES ($1, $2, ...)`,
      [userId, sanitizedUrl, ...],  // ✅ SANITIZED
    );
  }
}
```

**Fix - Apply to replaceTabs():**
```typescript
private async replaceTabs(
  userId: string,
  tabs: BrowserTabDto[],
  currentTabId: string | null,
): Promise<void> {
  // ... existing code ...
  for (const tab of tabs) {
    // ✅ SANITIZE URL BEFORE INSERT
    const sanitizedUrl = this.sanitizeUrl(tab.url);
    this.validateUrl(sanitizedUrl);

    await this.db.query(
      `INSERT INTO browser_tabs (user_id, url, ...)
       VALUES ($1, $2, ...)`,
      [userId, sanitizedUrl, ...],  // ✅ SANITIZED
    );
  }
}
```

---

## FIX #3: Add Idempotency to GOLD Metrics

**File A:** `migrations/` — Create new migration

**New File:** `apps/backend-nest/src/db/migrations/2025-12-27_add_gold_metrics_idempotency.sql`

```sql
-- Add client_event_id for idempotency to GOLD metrics tables

-- 1. Add column to browser_time_to_action
ALTER TABLE browser_time_to_action
ADD COLUMN client_event_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid();

-- 2. Add column to browser_product_interactions
ALTER TABLE browser_product_interactions
ADD COLUMN client_event_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid();

-- 3. Create index for faster dedup lookups
CREATE INDEX idx_browser_time_to_action_client_event_id
ON browser_time_to_action(user_id, client_event_id);

CREATE INDEX idx_browser_product_interactions_client_event_id
ON browser_product_interactions(user_id, client_event_id);

-- 4. Verify schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('browser_time_to_action', 'browser_product_interactions')
  AND column_name = 'client_event_id';
```

**File B:** `apps/frontend/src/services/browserSyncService.ts`

**Update Frontend to Send client_event_id:**
```typescript
// In pushChanges(), update GOLD metrics mapping:

const requestBody: SyncRequest = {
  // ...
  timeToActionEvents: timeToActionLog.map(e => ({
    sessionId: store.currentSessionId || undefined,
    productUrl: e.productUrl,
    actionType: e.actionType as 'bookmark' | 'cart',
    seconds: e.seconds,
    timestamp: e.timestamp,
    // ✅ ADD CLIENT EVENT ID FOR DEDUP
    clientEventId: e.id || `time_${Date.now()}_${Math.random()}`,
  })),
  productInteractions: productInteractions.map(p => ({
    sessionId: p.sessionId,
    productUrl: p.productUrl,
    interactionType: p.type,
    metadata: {},
    bodyMeasurementsAtTime: p.bodyMeasurementsAtTime,
    timestamp: p.timestamp,
    // ✅ ADD CLIENT EVENT ID FOR DEDUP
    clientEventId: p.id || `interaction_${Date.now()}_${Math.random()}`,
  })),
};
```

**File C:** `apps/backend-nest/src/browser-sync/dto/sync.dto.ts`

**Add client_event_id to DTOs:**
```typescript
export class TimeToActionDto {
  sessionId?: string;
  productUrl: string;
  actionType: 'bookmark' | 'cart';
  seconds: number;
  timestamp: number;
  // ✅ ADD FOR DEDUP
  clientEventId?: string;
}

export class ProductInteractionDto {
  sessionId?: string;
  productUrl: string;
  interactionType: string;
  metadata?: Record<string, any>;
  bodyMeasurementsAtTime?: any;
  timestamp: number;
  // ✅ ADD FOR DEDUP
  clientEventId?: string;
}
```

**File D:** `apps/backend-nest/src/browser-sync/browser-sync.service.ts`

**Update inserts to use ON CONFLICT:**
```typescript
private async insertTimeToActionEvents(
  userId: string,
  events: TimeToActionDto[],
): Promise<void> {
  for (const event of events) {
    // ✅ GENERATE CLIENT EVENT ID IF NOT PROVIDED
    const clientEventId = event.clientEventId || uuidv4();

    await this.db.query(
      `INSERT INTO browser_time_to_action
       (user_id, session_id, product_url, action_type,
        time_to_action_seconds, occurred_at, client_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       // ✅ ON CONFLICT for dedup
       ON CONFLICT (user_id, client_event_id) DO NOTHING`,
      [
        userId,
        event.sessionId || null,
        event.productUrl,
        event.actionType,
        event.seconds,
        new Date(event.timestamp),
        clientEventId,
      ],
    );
  }
}

private async insertProductInteractions(
  userId: string,
  interactions: ProductInteractionDto[],
): Promise<void> {
  for (const interaction of interactions) {
    // ✅ GENERATE CLIENT EVENT ID IF NOT PROVIDED
    const clientEventId = interaction.clientEventId || uuidv4();

    await this.db.query(
      `INSERT INTO browser_product_interactions
       (user_id, session_id, product_url, interaction_type,
        metadata, body_measurements_at_time, occurred_at, client_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       // ✅ ON CONFLICT for dedup
       ON CONFLICT (user_id, client_event_id) DO NOTHING`,
      [
        userId,
        interaction.sessionId || null,
        interaction.productUrl,
        interaction.interactionType,
        JSON.stringify(interaction.metadata || {}),
        interaction.bodyMeasurementsAtTime
          ? JSON.stringify(interaction.bodyMeasurementsAtTime)
          : null,
        new Date(interaction.timestamp),
        clientEventId,
      ],
    );
  }
}
```

---

## FIX #4: Define GDPR Delete Scope

**File:** `apps/backend-nest/src/browser-sync/browser-sync.controller.ts`

**Current Code (Line 94-98):**
```typescript
@Delete('history')
@HttpCode(HttpStatus.NO_CONTENT)
async clearHistory(@Request() req: AuthenticatedRequest): Promise<void> {
  const userId = req.user.userId;
  await this.browserSyncService.clearHistory(userId);
}
```

**Issue:** This only clears history, not bookmarks or GOLD metrics.

**Fix Option A: Create Comprehensive Delete Endpoint**

```typescript
/**
 * DELETE /browser-sync/data
 * ✅ GDPR-compliant: Deletes ALL browser sync data scoped to user
 * - Soft-delete all bookmarks
 * - Soft-delete all history
 * - Soft-delete all collections
 * - Soft-delete all cart history
 * - Hard-delete all product interactions (GOLD metrics)
 * - Hard-delete all time-to-action events (GOLD metrics)
 *
 * Per GDPR Article 17: Delete all personal data
 */
@Delete('data')
@HttpCode(HttpStatus.NO_CONTENT)
async deleteAllBrowserData(@Request() req: AuthenticatedRequest): Promise<void> {
  const userId = req.user.userId;
  console.log(`[BrowserSync] GDPR Delete requested for user ${userId}`);
  await this.browserSyncService.deleteAllBrowserData(userId);
}

/**
 * DELETE /browser-sync/history
 * Clears only browsing history (preserves bookmarks/collections)
 * For user clearing recent history (not GDPR delete)
 */
@Delete('history')
@HttpCode(HttpStatus.NO_CONTENT)
async clearHistory(@Request() req: AuthenticatedRequest): Promise<void> {
  const userId = req.user.userId;
  await this.browserSyncService.clearHistory(userId);
}
```

**File:** `apps/backend-nest/src/browser-sync/browser-sync.service.ts`

**Add Method:**
```typescript
/**
 * GDPR Article 17: Right to erasure
 * Deletes all browser data scoped to user
 * - Soft-delete: Bookmarks, history, collections, cart history
 * - Hard-delete: GOLD metrics (time-to-action, product interactions)
 */
async deleteAllBrowserData(userId: string): Promise<void> {
  try {
    await this.db.query('BEGIN TRANSACTION');

    // Soft-delete: Bookmarks
    await this.db.query(
      `UPDATE browser_bookmarks
       SET is_deleted = true, updated_at = now()
       WHERE user_id = $1`,
      [userId],
    );

    // Soft-delete: History
    await this.db.query(
      `UPDATE browser_history
       SET is_deleted = true
       WHERE user_id = $1`,
      [userId],
    );

    // Soft-delete: Collections (and items via cascade)
    await this.db.query(
      `UPDATE browser_collections
       SET is_deleted = true, updated_at = now()
       WHERE user_id = $1`,
      [userId],
    );

    // Soft-delete: Cart history and events
    await this.db.query(
      `UPDATE browser_cart_history
       SET is_deleted = true, updated_at = now()
       WHERE user_id = $1`,
      [userId],
    );

    // Hard-delete: GOLD metrics (cannot be soft-deleted, no recovery needed)
    // time-to-action events
    await this.db.query(
      `DELETE FROM browser_time_to_action
       WHERE user_id = $1`,
      [userId],
    );

    // Hard-delete: Product interactions
    await this.db.query(
      `DELETE FROM browser_product_interactions
       WHERE user_id = $1`,
      [userId],
    );

    // Hard-delete: Tabs (ephemeral, no recovery needed)
    await this.db.query(
      `DELETE FROM browser_tabs
       WHERE user_id = $1`,
      [userId],
    );

    await this.db.query('COMMIT');

    console.log(
      `[BrowserSync] GDPR delete completed for user ${userId}. ` +
      `Soft-deleted: bookmarks, history, collections, cart. ` +
      `Hard-deleted: GOLD metrics, tabs.`,
    );
  } catch (error) {
    await this.db.query('ROLLBACK');
    console.error(`[BrowserSync] GDPR delete failed for user ${userId}:`, error);
    throw error;
  }
}
```

**Document in API:**

Add to controller JSDoc or API documentation:
```
DELETE /browser-sync/history
  - Clears browsing history only
  - Preserves bookmarks and collections
  - Use for: User clearing recent history

DELETE /browser-sync/data
  - GDPR Article 17: Right to erasure
  - Deletes ALL user browser data
  - Soft-deletes: bookmarks, history, collections, cart
  - Hard-deletes: GOLD metrics (no recovery), tabs
  - Use for: GDPR deletion requests
```

---

## ADDITIONAL FIX #5: Add Rate Limiting

**File:** `apps/backend-nest/src/browser-sync/browser-sync.controller.ts`

**Current Code:**
```typescript
@Controller('browser-sync')
@UseGuards(AuthGuard('jwt'))
export class BrowserSyncController {
  // ❌ NO RATE LIMITING
  @Get()
  async getFullSync(...) { }

  @Post()
  async pushSync(...) { }
}
```

**Fix:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('browser-sync')
@UseGuards(AuthGuard('jwt'))
export class BrowserSyncController {
  /**
   * GET /browser-sync
   * Rate limited: 100 requests per 15 minutes per user
   */
  @Get()
  @Throttle({ limit: 100, ttl: 900000 })  // ✅ ADD THROTTLE
  async getFullSync(@Request() req: AuthenticatedRequest): Promise<SyncResponseDto> {
    // ... existing code ...
  }

  /**
   * POST /browser-sync
   * Rate limited: 100 requests per 15 minutes per user
   * Payload validated: max 5MB, max 1000 items per array
   */
  @Post()
  @Throttle({ limit: 100, ttl: 900000 })  // ✅ ADD THROTTLE
  async pushSync(
    @Request() req: AuthenticatedRequest,
    @Body() data: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    // ✅ ADD PAYLOAD SIZE VALIDATION
    const payloadSize = JSON.stringify(data).length;
    if (payloadSize > 5 * 1024 * 1024) {
      throw new BadRequestException(
        `Payload exceeds 5MB limit: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // ✅ ADD BATCH SIZE VALIDATION
    if (data.bookmarks?.length > 1000) {
      throw new BadRequestException('Bookmarks array cannot exceed 1000 items');
    }
    if (data.history?.length > 1000) {
      throw new BadRequestException('History array cannot exceed 1000 items');
    }
    if (data.productInteractions?.length > 1000) {
      throw new BadRequestException('Product interactions cannot exceed 1000 items');
    }

    return this.browserSyncService.pushSync(userId, data);
  }

  @Get('delta')
  @Throttle({ limit: 100, ttl: 900000 })  // ✅ ADD THROTTLE
  async getDeltaSync(...) { }

  @Delete('bookmark')
  @Throttle({ limit: 100, ttl: 900000 })  // ✅ ADD THROTTLE
  async deleteBookmark(...) { }

  @Delete('history')
  @Throttle({ limit: 100, ttl: 900000 })  // ✅ ADD THROTTLE
  async clearHistory(...) { }

  @Delete('data')  // ✅ NEW GDPR DELETE
  @Throttle({ limit: 10, ttl: 900000 })   // ✅ STRICTER LIMIT FOR DESTRUCTIVE OP
  async deleteAllBrowserData(...) { }
}
```

---

## Summary of Changes

| Fix | File | Lines Changed | Complexity | Time |
|-----|------|---------------|-----------|------|
| #1: Consent Gating | browserSyncService.ts | ~20 lines | Low | 1 hr |
| #2: URL Sanitization | browser-sync.service.ts | ~40 lines | Medium | 2 hrs |
| #3: Idempotency | 3 files + migration | ~60 lines | Medium | 2 hrs |
| #4: GDPR Delete | 2 files | ~80 lines | Medium | 1.5 hrs |
| #5: Rate Limiting | browser-sync.controller.ts | ~30 lines | Low | 0.5 hrs |

**Total Effort:** ~7 hours
**Total LOC Added:** ~230 lines

---

## Testing Checklist After Fixes

- [ ] Consent Gating: Verify GOLD metrics don't sync if `trackingConsent !== 'accepted'`
- [ ] URL Sanitization: Bookmark URL with `?token=X` should be stored without params
- [ ] Idempotency: Send same GOLD metric twice, verify only 1 row in DB
- [ ] GDPR Delete: Run `/browser-sync/data` delete, verify bookmarks soft-deleted, GOLD metrics hard-deleted
- [ ] Rate Limiting: Send 101 requests in 15 min, verify 429 on 101st
- [ ] E2E: Full sync → modify data → push changes → verify consent respected

---

**Next Step:** Apply these fixes and run re-audit with `PHASE2_GOLD_METRICS_VERIFY.sh`

