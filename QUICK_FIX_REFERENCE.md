# QUICK FIX REFERENCE - Copy/Paste Ready

Use this document to implement all 4 fixes. Each section is copy-paste ready.

---

## FIX #1: Consent Gating (shoppingStore.ts)

**File**: `/Users/giffinmike/Git/StylIQ/store/shoppingStore.ts`

**Find this code** (lines 717-735):
```typescript
recordProductInteraction: (
  productUrl: string,
  type: 'view' | 'add_to_cart' | 'bookmark',
  bodyMeasurements?: any,
) => {
  set(state => ({
```

**Replace with**:
```typescript
recordProductInteraction: (
  productUrl: string,
  type: 'view' | 'add_to_cart' | 'bookmark',
  bodyMeasurements?: any,
) => {
  // ✅ CONSENT GATE - FIXED
  if (!get().isTrackingEnabled()) {
    console.log('[Store] Product interaction blocked: tracking not accepted');
    return;
  }

  set(state => ({
```

---

**Find this code** (lines 739-742):
```typescript
recordCartEvent: (event: CartEvent) => {
  set(state => {
    const cartUrl = event.cartUrl;
```

**Replace with**:
```typescript
recordCartEvent: (event: CartEvent) => {
  // ✅ CONSENT GATE - FIXED
  if (!get().isTrackingEnabled()) {
    console.log('[Store] Cart event blocked: tracking not accepted');
    return;
  }

  set(state => {
    const cartUrl = event.cartUrl;
```

---

## FIX #2a: Create sanitize.ts

**File**: `/Users/giffinmike/Git/StylIQ/apps/frontend/src/utils/sanitize.ts`

**Create new file with this content**:
```typescript
/**
 * Sanitization utilities for analytics
 * Removes PII from URLs and titles
 */

/**
 * Sanitize URL for analytics storage
 * Removes query params (?) and fragments (#) to prevent PII leakage
 *
 * Examples:
 * - Input: https://asos.com/product?utm_source=google&ref=abc123&sid=session_token
 * - Output: https://asos.com/product
 *
 * - Input: https://zara.com/pants#section-xs
 * - Output: https://zara.com/pants
 */
export function sanitizeUrlForAnalytics(url: string): string {
  try {
    const urlObj = new URL(url);
    // Clear query params and fragment
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    // If URL parsing fails, strip ? and # manually
    return url.split('?')[0].split('#')[0];
  }
}

/**
 * Sanitize title for analytics
 * Removes HTML, limits length, prevents XSS
 */
export function sanitizeTitle(title: string, maxLength = 200): string {
  if (!title) return '';
  // Remove HTML tags
  const clean = title.replace(/<[^>]*>/g, '');
  // Limit length
  return clean.substring(0, maxLength);
}
```

---

## FIX #2b: Update browserSyncService.ts

**File**: `/Users/giffinmike/Git/StylIQ/apps/frontend/src/services/browserSyncService.ts`

**Add import** (line 1):
```typescript
import { sanitizeUrlForAnalytics } from '../utils/sanitize';
```

**Find lines 481-527** (bookmarks mapping):
```typescript
bookmarks: pendingChanges.bookmarks.map(b => ({
  url: b.url,
```

**Replace bookmarks section with**:
```typescript
bookmarks: pendingChanges.bookmarks.map(b => ({
  url: sanitizeUrlForAnalytics(b.url),  // ✅ SANITIZED
```

**Find lines 503-515** (history mapping):
```typescript
history: pendingChanges.history.map(h => ({
  url: h.url,
```

**Replace history section with**:
```typescript
history: pendingChanges.history.map(h => ({
  url: sanitizeUrlForAnalytics(h.url),  // ✅ SANITIZED
```

**Find line 502** (deletedBookmarkUrls):
```typescript
deletedBookmarkUrls: pendingChanges.deletedBookmarkUrls,
```

**Replace with**:
```typescript
deletedBookmarkUrls: pendingChanges.deletedBookmarkUrls.map(url =>
  sanitizeUrlForAnalytics(url)  // ✅ SANITIZED
),
```

---

## FIX #2c: Update browser-sync.service.ts (Backend)

**File**: `/Users/giffinmike/Git/StylIQ/apps/backend-nest/src/browser-sync/browser-sync.service.ts`

**Add private method** (line ~300):
```typescript
private sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}
```

**Update upsertBookmarks** (lines 308-349):
```typescript
private async upsertBookmarks(
  userId: string,
  bookmarks: BookmarkDto[],
): Promise<void> {
  for (const bookmark of bookmarks) {
    // ✅ Sanitize URL before storage
    const canonicalUrl = this.sanitizeUrl(bookmark.url);

    await this.db.query(
      `INSERT INTO browser_bookmarks (...)
       VALUES (...)
       ON CONFLICT (user_id, url) DO UPDATE SET ...`,
      [
        userId,
        canonicalUrl,  // ✅ CLEAN URL
        // ... rest of params
      ],
    );
  }
}
```

**Update upsertHistory** (lines 352-390):
```typescript
private async upsertHistory(
  userId: string,
  history: HistoryEntryDto[],
): Promise<void> {
  for (const entry of history) {
    // ✅ Sanitize URL before storage
    const canonicalUrl = this.sanitizeUrl(entry.url);

    await this.db.query(
      `INSERT INTO browser_history (...)
       VALUES (...)
       ON CONFLICT (user_id, url) DO UPDATE SET ...`,
      [
        userId,
        canonicalUrl,  // ✅ CLEAN URL
        // ... rest of params
      ],
    );
  }
}
```

**Update deleteBookmarksByUrls** (lines 466-476):
```typescript
private async deleteBookmarksByUrls(
  userId: string,
  urls: string[],
): Promise<void> {
  if (urls.length === 0) return;

  const sanitizedUrls = urls.map(url => this.sanitizeUrl(url));  // ✅ SANITIZE

  await this.db.query(
    'DELETE FROM browser_bookmarks WHERE user_id = $1 AND url = ANY($2::text[])',
    [userId, sanitizedUrls],  // ✅ USE SANITIZED
  );
}
```

---

## FIX #3a: Update sync.dto.ts

**File**: `/Users/giffinmike/Git/StylIQ/apps/backend-nest/src/browser-sync/dto/sync.dto.ts`

**Find TimeToActionDto** (lines 417-438) and add field:
```typescript
export class TimeToActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @IsString()
  @MaxLength(2048)
  productUrl: string;

  @IsString()
  @IsIn(['bookmark', 'cart'])
  actionType: 'bookmark' | 'cart';

  @IsNumber()
  @Min(0)
  seconds: number;

  @IsNumber()
  timestamp: number;

  // ✅ NEW: Idempotency key
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientEventId?: string;
}
```

**Find ProductInteractionDto** (lines 440-484) and add field:
```typescript
export class ProductInteractionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @IsString()
  @MaxLength(2048)
  productUrl: string;

  @IsString()
  @IsIn([...])
  interactionType: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  bodyMeasurementsAtTime?: Record<string, any>;

  @IsNumber()
  timestamp: number;

  // ✅ NEW: Idempotency key
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientEventId?: string;
}
```

---

## FIX #3b: Create Migration File

**File**: `/Users/giffinmike/Git/StylIQ/migrations/2025-12-27_add_idempotency.sql`

**Create new file with this content**:
```sql
-- Add idempotency columns to GOLD metrics tables
ALTER TABLE browser_time_to_action
  ADD COLUMN IF NOT EXISTS client_event_id UUID UNIQUE;

ALTER TABLE browser_product_interactions
  ADD COLUMN IF NOT EXISTS client_event_id UUID UNIQUE;

-- Create unique indexes on client_event_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_time_to_action_client_event_id ON browser_time_to_action(client_event_id)
  WHERE client_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  idx_product_interactions_client_event_id ON browser_product_interactions(client_event_id)
  WHERE client_event_id IS NOT NULL;
```

---

## FIX #3c: Update insertTimeToActionEvents

**File**: `/Users/giffinmike/Git/StylIQ/apps/backend-nest/src/browser-sync/browser-sync.service.ts`

**Find insertTimeToActionEvents** (lines 700-721) and replace with:
```typescript
// GOLD: Insert time-to-action events
private async insertTimeToActionEvents(
  userId: string,
  events: TimeToActionDto[],
): Promise<void> {
  for (const event of events) {
    // ✅ Generate client_event_id if not provided
    const eventId = event.clientEventId || `${userId}_${event.productUrl}_${event.timestamp}_${Math.random()}`;

    await this.db.query(
      `INSERT INTO browser_time_to_action
       (user_id, session_id, product_url, action_type, time_to_action_seconds, occurred_at, client_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_event_id)
       DO UPDATE SET
         occurred_at = EXCLUDED.occurred_at
       WHERE browser_time_to_action.client_event_id = EXCLUDED.client_event_id`,
      [
        userId,
        event.sessionId || null,
        event.productUrl,
        event.actionType,
        event.seconds,
        new Date(event.timestamp),
        eventId,  // ✅ IDEMPOTENCY KEY
      ],
    );
  }
}
```

---

## FIX #3d: Update insertProductInteractions

**File**: `/Users/giffinmike/Git/StylIQ/apps/backend-nest/src/browser-sync/browser-sync.service.ts`

**Find insertProductInteractions** (lines 724-747) and replace with:
```typescript
// GOLD: Insert product interactions
private async insertProductInteractions(
  userId: string,
  interactions: ProductInteractionDto[],
): Promise<void> {
  for (const interaction of interactions) {
    // ✅ Generate client_event_id if not provided
    const eventId = interaction.clientEventId || `${userId}_${interaction.productUrl}_${interaction.timestamp}_${Math.random()}`;

    await this.db.query(
      `INSERT INTO browser_product_interactions
       (user_id, session_id, product_url, interaction_type, metadata, body_measurements_at_time, occurred_at, client_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (client_event_id)
       DO UPDATE SET
         occurred_at = EXCLUDED.occurred_at
       WHERE browser_product_interactions.client_event_id = EXCLUDED.client_event_id`,
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
        eventId,  // ✅ IDEMPOTENCY KEY
      ],
    );
  }
}
```

---

## FIX #3e: Update Frontend to Generate clientEventId

**File**: `/Users/giffinmike/Git/StylIQ/apps/frontend/src/services/browserSyncService.ts`

**Find timeToActionEvents mapping** (around line 543):
```typescript
timeToActionEvents: timeToActionLog.map(e => ({
  sessionId: store.currentSessionId || undefined,
  productUrl: e.productUrl,
  actionType: e.actionType as 'bookmark' | 'cart',
  seconds: e.seconds,
  timestamp: e.timestamp,
})),
```

**Replace with**:
```typescript
timeToActionEvents: timeToActionLog.map(e => ({
  sessionId: store.currentSessionId || undefined,
  productUrl: e.productUrl,
  actionType: e.actionType as 'bookmark' | 'cart',
  seconds: e.seconds,
  timestamp: e.timestamp,
  // ✅ NEW: Generate idempotency key
  clientEventId: `${store.currentSessionId || 'anon'}_${e.productUrl}_${e.timestamp}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100),
})),
```

**Find productInteractions mapping** (around line 551):
```typescript
productInteractions: productInteractions.map((p: ProductInteraction) => ({
  sessionId: p.sessionId,
  productUrl: p.productUrl,
  interactionType: p.type,
  metadata: {},
  bodyMeasurementsAtTime: p.bodyMeasurementsAtTime,
  timestamp: p.timestamp,
})),
```

**Replace with**:
```typescript
productInteractions: productInteractions.map((p: ProductInteraction) => ({
  sessionId: p.sessionId,
  productUrl: p.productUrl,
  interactionType: p.type,
  metadata: {},
  bodyMeasurementsAtTime: p.bodyMeasurementsAtTime,
  timestamp: p.timestamp,
  // ✅ NEW: Generate idempotency key
  clientEventId: `${p.sessionId || 'anon'}_${p.productUrl}_${p.timestamp}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100),
})),
```

---

## FIX #4a: Add Delete Endpoint (controller)

**File**: `/Users/giffinmike/Git/StylIQ/apps/backend-nest/src/browser-sync/browser-sync.controller.ts`

**Add after clearHistory method** (after line 99):
```typescript
/**
 * DELETE /browser-sync/analytics
 * Comprehensive GDPR deletion of ALL shopping analytics data
 *
 * Deletes:
 * - All bookmarks and metadata (GOLD #4, #5, #6, #7, #8, #10)
 * - All browsing history (GOLD #1, #2, #3, #9)
 * - All product interactions (GOLD #5, #8)
 * - All time-to-action events (GOLD #1, #3)
 * - All cart history and events
 * - All sessions and collections
 */
@Delete('analytics')
@HttpCode(HttpStatus.NO_CONTENT)
async deleteAllAnalytics(@Request() req: AuthenticatedRequest): Promise<void> {
  const userId = req.user.userId;
  await this.browserSyncService.deleteAllAnalyticsData(userId);
}
```

---

## FIX #4b: Add Delete Service Method

**File**: `/Users/giffinmike/Git/StylIQ/apps/backend-nest/src/browser-sync/browser-sync.service.ts`

**Add after clearHistory method** (after line 496):
```typescript
/**
 * Delete all analytics data for a user (GDPR compliance)
 * Comprehensive deletion of all shopping behavior signals
 */
async deleteAllAnalyticsData(userId: string): Promise<void> {
  try {
    // Delete all browsing history (GOLD #1, #2, #3, #9)
    await this.db.query(
      'DELETE FROM browser_history WHERE user_id = $1',
      [userId],
    );

    // Delete all bookmarks (GOLD #4, #5, #6, #7, #8, #10)
    await this.db.query(
      'DELETE FROM browser_bookmarks WHERE user_id = $1',
      [userId],
    );

    // Delete all product interactions (GOLD #5, #8)
    await this.db.query(
      'DELETE FROM browser_product_interactions WHERE user_id = $1',
      [userId],
    );

    // Delete all time-to-action events (GOLD #1, #3)
    await this.db.query(
      'DELETE FROM browser_time_to_action WHERE user_id = $1',
      [userId],
    );

    // Delete all cart events and history
    const cartHistories = await this.db.query(
      'SELECT id FROM browser_cart_history WHERE user_id = $1',
      [userId],
    );

    for (const cart of cartHistories.rows) {
      await this.db.query(
        'DELETE FROM browser_cart_events WHERE cart_history_id = $1',
        [cart.id],
      );
    }

    await this.db.query(
      'DELETE FROM browser_cart_history WHERE user_id = $1',
      [userId],
    );

    // Delete all collections and items
    const collections = await this.db.query(
      'SELECT id FROM browser_collections WHERE user_id = $1',
      [userId],
    );

    for (const col of collections.rows) {
      await this.db.query(
        'DELETE FROM browser_collection_items WHERE collection_id = $1',
        [col.id],
      );
    }

    await this.db.query(
      'DELETE FROM browser_collections WHERE user_id = $1',
      [userId],
    );

    // Delete all tabs and tab state
    await this.db.query(
      'DELETE FROM browser_tabs WHERE user_id = $1',
      [userId],
    );

    await this.db.query(
      'DELETE FROM browser_tab_state WHERE user_id = $1',
      [userId],
    );

    console.log(`[BrowserSync] All analytics data deleted for user: ${userId}`);
  } catch (error) {
    console.error('[BrowserSync] Error deleting analytics data:', error);
    throw error;
  }
}
```

---

## VERIFICATION CHECKLIST

After implementing all fixes:

- [ ] shoppingStore.ts: recordProductInteraction has consent check
- [ ] shoppingStore.ts: recordCartEvent has consent check
- [ ] sanitize.ts: created with sanitizeUrlForAnalytics function
- [ ] browserSyncService.ts: imports sanitizeUrlForAnalytics
- [ ] browserSyncService.ts: uses sanitizer for all URLs
- [ ] browser-sync.service.ts: has sanitizeUrl private method
- [ ] browser-sync.service.ts: all upserts sanitize URLs
- [ ] sync.dto.ts: TimeToActionDto has clientEventId field
- [ ] sync.dto.ts: ProductInteractionDto has clientEventId field
- [ ] migrations/2025-12-27_add_idempotency.sql: created
- [ ] browser-sync.service.ts: insertTimeToActionEvents uses ON CONFLICT
- [ ] browser-sync.service.ts: insertProductInteractions uses ON CONFLICT
- [ ] browserSyncService.ts: generates clientEventId for events
- [ ] browser-sync.controller.ts: has deleteAllAnalytics endpoint
- [ ] browser-sync.service.ts: has deleteAllAnalyticsData method

---

## RUN TESTS

```bash
# Run verification script
./GOLD_METRICS_VERIFY_FINAL.sh
# Expected: All 16 checks pass

# Run SQL verification
psql -f GOLD_METRICS_PROOF_FINAL.sql
# Expected: All queries return valid results

# Run unit tests
npm test -- consent-gating url-sanitization idempotency gdpr-delete
# Expected: All tests pass
```

---

Done! All 4 fixes are ready to implement.
