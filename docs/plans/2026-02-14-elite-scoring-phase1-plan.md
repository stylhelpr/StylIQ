# Elite Scoring Phase 1 — StyleContext Plumbing + Event Writes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Populate `StyleContext` with real user data at each hook point and log `ELITE_SUGGESTION_SERVED` exposure events. Outfits returned unchanged — no ranking changes.

**Architecture:** Backend hooks (Stylist + Studio) load FashionStateSummary + preferred brands via NestJS DI, then fire exposure events via LearningEventsService (fire-and-forget). Frontend hook (Trips) derives wardrobeStats from items already in memory. Event writes are NOT gated by ELITE_FLAGS — they're gated only by LEARNING_FLAGS.EVENTS_ENABLED + consent + circuit breaker.

**Tech Stack:** NestJS DI, TypeScript, Jest, existing LearningModule + FashionStateService + LearningEventsService

**Design doc:** `docs/plans/2026-02-14-elite-scoring-phase1-design.md`

---

### Task 1: Add ELITE_SUGGESTION_SERVED Event Type

**Files:**
- Modify: `apps/backend-nest/src/learning/dto/learning-event.dto.ts`

**Step 1: Add event type to union**

In `learning-event.dto.ts`, add `ELITE_SUGGESTION_SERVED` to the `LearningEventType` union (after line 23):

```typescript
// BEFORE (line 9-23):
export type LearningEventType =
  | 'OUTFIT_RATED_POSITIVE'
  | 'OUTFIT_RATED_NEGATIVE'
  | 'OUTFIT_WORN'
  | 'OUTFIT_FAVORITED'
  | 'OUTFIT_UNFAVORITED'
  | 'PRODUCT_SAVED'
  | 'PRODUCT_UNSAVED'
  | 'PRODUCT_PURCHASED'
  | 'PRODUCT_RETURNED'
  | 'LOOK_SAVED'
  | 'POST_LIKED'
  | 'POST_SAVED'
  | 'POST_DISMISSED'
  | 'ITEM_EXPLICITLY_DISMISSED';

// AFTER:
export type LearningEventType =
  | 'OUTFIT_RATED_POSITIVE'
  | 'OUTFIT_RATED_NEGATIVE'
  | 'OUTFIT_WORN'
  | 'OUTFIT_FAVORITED'
  | 'OUTFIT_UNFAVORITED'
  | 'PRODUCT_SAVED'
  | 'PRODUCT_UNSAVED'
  | 'PRODUCT_PURCHASED'
  | 'PRODUCT_RETURNED'
  | 'LOOK_SAVED'
  | 'POST_LIKED'
  | 'POST_SAVED'
  | 'POST_DISMISSED'
  | 'ITEM_EXPLICITLY_DISMISSED'
  | 'ELITE_SUGGESTION_SERVED';
```

**Step 2: Add signal defaults entry**

Add to `EVENT_SIGNAL_DEFAULTS` (after line 129, before the closing `}`):

```typescript
  ITEM_EXPLICITLY_DISMISSED: { polarity: -1, weight: 0.4 },
  ELITE_SUGGESTION_SERVED: { polarity: 0, weight: 0 },
};
```

**Step 3: Extend EventContext with schema/pipeline version fields**

Add two optional fields to `EventContext` interface (after line 66):

```typescript
export interface EventContext {
  weather_code?: string;
  temp_f?: number;
  season?: string;
  occasion?: string;
  location_type?: string;
  schema_version?: number;
  pipeline_version?: number;
}
```

**Step 4: Run backend tests to verify no breakage**

Run: `cd apps/backend-nest && npx jest --testPathPattern='learning' --passWithNoTests 2>&1 | tail -20`
Expected: All existing learning tests pass, no type errors.

**Step 5: Commit**

```bash
git add apps/backend-nest/src/learning/dto/learning-event.dto.ts
git commit -m "feat(elite): add ELITE_SUGGESTION_SERVED event type with neutral signal defaults"
```

---

### Task 2: Expand Backend StyleContext + Add buildEliteExposureEvent()

**Files:**
- Modify: `apps/backend-nest/src/ai/elite/eliteScoring.ts`

**Step 1: Expand StyleContext type**

Replace the existing `StyleContext` type (line 34-36) with:

```typescript
export type StyleContext = {
  presentation?: 'masculine' | 'feminine' | 'mixed';
  fashionState?: {
    topBrands: string[];
    avoidBrands: string[];
    topColors: string[];
    avoidColors: string[];
    topCategories: string[];
    priceBracket: string | null;
    isColdStart: boolean;
  } | null;
  wardrobeStats?: {
    dominantColors: string[];
    topCategories: string[];
    topBrands: string[];
    totalItems: number;
  };
  preferredBrands?: string[];
};
```

**Step 2: Add buildEliteExposureEvent() helper**

Add after the `elitePostProcessOutfits` function (after line 59), before the Stylist Adapters section:

```typescript
// ── Exposure Event Builder ──────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import type { CreateLearningEventInput } from '../../learning/dto/learning-event.dto';

export function buildEliteExposureEvent(
  userId: string,
  outfits: CanonicalOutfit[],
  env: EliteEnv,
): CreateLearningEventInput {
  const allItemIds = outfits.flatMap(o => o.items.map(i => i.id));
  const canonicalSlots = outfits.flatMap(o => o.items.map(i => i.slot));

  return {
    userId,
    eventType: 'ELITE_SUGGESTION_SERVED',
    entityType: 'outfit',
    entityId: env.requestId ?? randomUUID(),
    signalPolarity: 0,
    signalWeight: 0,
    sourceFeature: 'elite_scoring',
    extractedFeatures: {
      categories: canonicalSlots,
      item_ids: allItemIds,
    },
    context: {
      occasion: env.mode,
      temp_f: typeof env.weather === 'object' && env.weather !== null
        ? (env.weather as { temp?: number }).temp
        : undefined,
      schema_version: 1,
      pipeline_version: 1,
    },
  };
}
```

**Important:** Move the `import { randomUUID } from 'crypto'` to the top of the file (after line 8). Move the `import type { CreateLearningEventInput }` to the top as well. Do NOT leave imports inline inside the file body.

**Step 3: Verify TypeScript compiles**

Run: `cd apps/backend-nest && npx tsc --noEmit --pretty 2>&1 | grep -i 'eliteScoring' | head -10`
Expected: No errors referencing eliteScoring.ts.

**Step 4: Commit**

```bash
git add apps/backend-nest/src/ai/elite/eliteScoring.ts
git commit -m "feat(elite): expand StyleContext type and add buildEliteExposureEvent helper"
```

---

### Task 3: Expand Frontend StyleContext + Add deriveWardrobeStats()

**Files:**
- Modify: `apps/frontend/src/lib/elite/eliteScoring.ts`

**Step 1: Expand StyleContext type (SYNC with backend)**

Replace the existing `StyleContext` type (line 36-38) with the same expanded type from Task 2:

```typescript
export type StyleContext = {
  presentation?: 'masculine' | 'feminine' | 'mixed';
  fashionState?: {
    topBrands: string[];
    avoidBrands: string[];
    topColors: string[];
    avoidColors: string[];
    topCategories: string[];
    priceBracket: string | null;
    isColdStart: boolean;
  } | null;
  wardrobeStats?: {
    dominantColors: string[];
    topCategories: string[];
    topBrands: string[];
    totalItems: number;
  };
  preferredBrands?: string[];
};
```

**Step 2: Add deriveWardrobeStats() function**

Add after the `elitePostProcessOutfits` function (after line 61), before the Trips Adapters section. Also add the `TripWardrobeItem` import at the top:

Add to the existing import on line 10:
```typescript
import type {CapsuleOutfit, TripPackingItem, TripWardrobeItem} from '../../types/trips';
```

Add the function:
```typescript
// ── Wardrobe Stats Derivation (Trips) ───────────────────────────────────────

export function deriveWardrobeStats(
  items: TripWardrobeItem[],
): NonNullable<StyleContext['wardrobeStats']> {
  if (items.length === 0) {
    return {dominantColors: [], topCategories: [], topBrands: [], totalItems: 0};
  }

  const colorCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const item of items) {
    if (item.color) {
      colorCounts.set(item.color, (colorCounts.get(item.color) || 0) + 1);
    }
    if (item.main_category) {
      categoryCounts.set(
        item.main_category,
        (categoryCounts.get(item.main_category) || 0) + 1,
      );
    }
  }

  const topN = (map: Map<string, number>, n: number): string[] =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);

  return {
    dominantColors: topN(colorCounts, 5),
    topCategories: topN(categoryCounts, 5),
    topBrands: [], // TripWardrobeItem has no brand field
    totalItems: items.length,
  };
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/giffinmike/Git/StylIQ && npx tsc --noEmit --project apps/frontend/tsconfig.json 2>&1 | grep -i 'eliteScoring' | head -10`

If no tsconfig.json exists for frontend or the above errors, verify the import compiles by checking for type errors in the file directly:

Run: `cd /Users/giffinmike/Git/StylIQ && npx tsc --noEmit 2>&1 | grep -i 'elite' | head -10`

Expected: No errors.

**Step 4: Commit**

```bash
git add apps/frontend/src/lib/elite/eliteScoring.ts
git commit -m "feat(elite): expand frontend StyleContext (SYNC) and add deriveWardrobeStats"
```

---

### Task 4: Add Phase 1 Tests

**Files:**
- Modify: `apps/backend-nest/src/ai/elite/eliteScoring.spec.ts`

**Step 1: Write failing tests**

Add these new test blocks after the existing `describe('Full pipeline...')` block (after line 180):

```typescript
// ── Phase 1 Tests ───────────────────────────────────────────────────────────

describe('buildEliteExposureEvent', () => {
  // Need to import at the top of the file
  it('produces correct shape with neutral signal', () => {
    const outfits: import('./eliteScoring').CanonicalOutfit[] = [
      {
        id: 'o-1',
        items: [
          { id: 'item-1', slot: 'tops' as const },
          { id: 'item-2', slot: 'bottoms' as const },
          { id: 'item-3', slot: 'shoes' as const },
        ],
      },
    ];
    const event = buildEliteExposureEvent('user-123', outfits, {
      mode: 'stylist',
      requestId: 'req-abc',
    });

    expect(event.eventType).toBe('ELITE_SUGGESTION_SERVED');
    expect(event.entityType).toBe('outfit');
    expect(event.entityId).toBe('req-abc');
    expect(event.signalPolarity).toBe(0);
    expect(event.signalWeight).toBe(0);
    expect(event.sourceFeature).toBe('elite_scoring');
    expect(event.userId).toBe('user-123');
    expect(event.extractedFeatures.item_ids).toEqual([
      'item-1',
      'item-2',
      'item-3',
    ]);
    expect(event.extractedFeatures.categories).toEqual([
      'tops',
      'bottoms',
      'shoes',
    ]);
    expect(event.context?.occasion).toBe('stylist');
    expect(event.context?.schema_version).toBe(1);
    expect(event.context?.pipeline_version).toBe(1);
  });

  it('generates entityId when requestId is missing', () => {
    const event = buildEliteExposureEvent(
      'user-123',
      [{ id: 'o-1', items: [] }],
      { mode: 'studio' },
    );

    expect(event.entityId).toBeDefined();
    expect(event.entityId!.length).toBeGreaterThan(0);
    expect(event.context?.occasion).toBe('studio');
  });

  it('includes temp_f from weather when provided', () => {
    const event = buildEliteExposureEvent(
      'user-123',
      [{ id: 'o-1', items: [] }],
      { mode: 'stylist', weather: { temp: 72 } },
    );

    expect(event.context?.temp_f).toBe(72);
  });

  it('omits temp_f when weather is null', () => {
    const event = buildEliteExposureEvent(
      'user-123',
      [{ id: 'o-1', items: [] }],
      { mode: 'stylist', weather: null },
    );

    expect(event.context?.temp_f).toBeUndefined();
  });
});

describe('Expanded StyleContext acceptance', () => {
  it('elitePostProcessOutfits accepts full StyleContext without error', () => {
    const fullContext: import('./eliteScoring').StyleContext = {
      presentation: 'feminine',
      fashionState: {
        topBrands: ['Nike', 'Zara'],
        avoidBrands: ['Gucci'],
        topColors: ['black', 'white'],
        avoidColors: ['neon green'],
        topCategories: ['Tops', 'Dresses'],
        priceBracket: 'mid',
        isColdStart: false,
      },
      wardrobeStats: {
        dominantColors: ['blue', 'black'],
        topCategories: ['Tops', 'Bottoms'],
        topBrands: [],
        totalItems: 42,
      },
      preferredBrands: ['Nike', 'Adidas'],
    };

    const result = elitePostProcessOutfits(
      [stylistOutfit],
      fullContext,
      { mode: 'stylist' },
    );

    // Phase 1: still returns unchanged
    expect(result.outfits).toEqual([stylistOutfit]);
    expect(result.debug).toEqual({});
  });

  it('accepts null fashionState (cold start / timeout)', () => {
    const result = elitePostProcessOutfits(
      [stylistOutfit],
      { presentation: 'mixed', fashionState: null },
      { mode: 'stylist' },
    );

    expect(result.outfits).toEqual([stylistOutfit]);
  });
});
```

Also add `buildEliteExposureEvent` to the import at the top of the file (line 9-15):

```typescript
import {
  elitePostProcessOutfits,
  buildEliteExposureEvent,
  normalizeStylistOutfit,
  denormalizeStylistOutfit,
  normalizeStudioOutfit,
  denormalizeStudioOutfit,
} from './eliteScoring';
```

**Step 2: Run tests to verify they pass**

Run: `cd apps/backend-nest && npx jest --testPathPattern='eliteScoring' --verbose 2>&1 | tail -30`
Expected: All 8 existing tests PASS + 6 new tests PASS = 14 tests total.

**Step 3: Commit**

```bash
git add apps/backend-nest/src/ai/elite/eliteScoring.spec.ts
git commit -m "test(elite): add Phase 1 tests for buildEliteExposureEvent, expanded StyleContext"
```

---

### Task 5: Wire DI + Populate Stylist Hook

**Files:**
- Modify: `apps/backend-nest/src/ai/ai.module.ts`
- Modify: `apps/backend-nest/src/ai/ai.service.ts`

**Step 1: Import LearningModule in ai.module.ts**

```typescript
// BEFORE (line 1-7):
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseService } from '../db/database.service';
import { VertexService } from '../vertex/vertex.service';

// AFTER:
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseService } from '../db/database.service';
import { VertexService } from '../vertex/vertex.service';
import { LearningModule } from '../learning/learning.module';
```

Add `LearningModule` to imports array:

```typescript
// BEFORE (line 9-14):
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/backend-nest/.env',
    }),
  ],

// AFTER:
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/backend-nest/.env',
    }),
    LearningModule,
  ],
```

**Step 2: Add constructor params to AiService**

In `ai.service.ts`, add imports at the top (after line 13, alongside existing feature-flags import):

```typescript
import { FashionStateService } from '../learning/fashion-state.service';
import { LearningEventsService } from '../learning/learning-events.service';
import type { StyleContext } from './elite/eliteScoring';
import { buildEliteExposureEvent } from './elite/eliteScoring';
```

Add class properties (after line 157, after `visualExclusionCache`):

```typescript
  private fashionStateService?: FashionStateService;
  private learningEventsService?: LearningEventsService;
```

Update constructor (line 159) to accept new params:

```typescript
// BEFORE:
  constructor(vertexService?: VertexService) {

// AFTER:
  constructor(
    vertexService?: VertexService,
    fashionStateService?: FashionStateService,
    learningEventsService?: LearningEventsService,
  ) {
```

Add assignments at the end of the constructor body (before the closing `}` of the constructor, after `this.productSearch = new ProductSearchService();` at line 183):

```typescript
    this.fashionStateService = fashionStateService;
    this.learningEventsService = learningEventsService;
```

**Step 3: Populate StyleContext + fire event at Stylist hook**

Replace lines 4490-4498 in `suggestVisualOutfits()`:

```typescript
// BEFORE (lines 4490-4498):
    // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
    let eliteOutfits = finalOutfits.slice(0, 3);
    if (ELITE_FLAGS.STYLIST) {
      const canonical = eliteOutfits.map(normalizeStylistOutfit);
      const result = elitePostProcessOutfits(canonical, { presentation: userPresentation }, { mode: 'stylist' });
      eliteOutfits = result.outfits.map(denormalizeStylistOutfit);
    }

    return { weatherSummary, outfits: eliteOutfits };

// AFTER:
    // ── Elite Scoring: load context (non-blocking) ──
    let eliteFashionState: StyleContext['fashionState'] = null;
    let elitePreferredBrands: string[] = [];
    if (userId && this.fashionStateService) {
      try {
        const [summary, brandsRes] = await Promise.all([
          this.fashionStateService.getStateSummary(userId).catch(() => null),
          pool.query(
            'SELECT preferred_brands FROM style_profiles WHERE user_id = $1',
            [userId],
          ).then(r => {
            const raw = r.rows[0]?.preferred_brands;
            return Array.isArray(raw) ? raw : [];
          }).catch(() => [] as string[]),
        ]);
        if (summary) {
          eliteFashionState = {
            topBrands: summary.topBrands,
            avoidBrands: summary.avoidBrands,
            topColors: summary.topColors,
            avoidColors: summary.avoidColors,
            topCategories: summary.topCategories,
            priceBracket: summary.priceBracket,
            isColdStart: summary.isColdStart,
          };
        }
        elitePreferredBrands = brandsRes;
      } catch {
        // Non-blocking: fallback to empty context
      }
    }

    const eliteStyleContext: StyleContext = {
      presentation: userPresentation,
      fashionState: eliteFashionState,
      preferredBrands: elitePreferredBrands,
    };

    // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
    let eliteOutfits = finalOutfits.slice(0, 3);
    if (ELITE_FLAGS.STYLIST) {
      const canonical = eliteOutfits.map(normalizeStylistOutfit);
      const result = elitePostProcessOutfits(canonical, eliteStyleContext, { mode: 'stylist' });
      eliteOutfits = result.outfits.map(denormalizeStylistOutfit);
    }

    // ── Elite Scoring: log exposure event (fire-and-forget) ──
    // NOT gated by ELITE_FLAGS — gated by LEARNING_FLAGS + consent + circuit breaker
    if (this.learningEventsService && userId) {
      const canonicalForEvent = eliteOutfits.map(normalizeStylistOutfit);
      const exposureEvent = buildEliteExposureEvent(userId, canonicalForEvent, {
        mode: 'stylist',
        weather: temp != null ? { temp } : undefined,
      });
      this.learningEventsService.logEvent(exposureEvent).catch(() => {});
    }

    return { weatherSummary, outfits: eliteOutfits };
```

**Step 4: Run backend tests to verify no breakage**

Run: `cd apps/backend-nest && npx jest --testPathPattern='eliteScoring' --verbose 2>&1 | tail -30`
Expected: All 14 tests pass.

Run: `cd apps/backend-nest && npx jest --passWithNoTests 2>&1 | tail -5`
Expected: Full backend test suite passes.

**Step 5: Commit**

```bash
git add apps/backend-nest/src/ai/ai.module.ts apps/backend-nest/src/ai/ai.service.ts
git commit -m "feat(elite): wire Stylist StyleContext plumbing + exposure event logging"
```

---

### Task 6: Wire DI + Populate Studio Hooks

**Files:**
- Modify: `apps/backend-nest/src/wardrobe/wardrobe.module.ts`
- Modify: `apps/backend-nest/src/wardrobe/wardrobe.service.ts`

**Step 1: Import LearningModule in wardrobe.module.ts**

```typescript
// BEFORE (line 1-5):
import { Module } from '@nestjs/common';
import { WardrobeController } from './wardrobe.controller';
import { WardrobePublicController } from './wardrobe.public.controller';
import { WardrobeService } from './wardrobe.service';
import { VertexModule } from '../vertex/vertex.module';

// AFTER:
import { Module } from '@nestjs/common';
import { WardrobeController } from './wardrobe.controller';
import { WardrobePublicController } from './wardrobe.public.controller';
import { WardrobeService } from './wardrobe.service';
import { VertexModule } from '../vertex/vertex.module';
import { LearningModule } from '../learning/learning.module';
```

Add `LearningModule` to imports:

```typescript
// BEFORE (line 7-8):
  imports: [VertexModule],

// AFTER:
  imports: [VertexModule, LearningModule],
```

**Step 2: Add constructor params to WardrobeService**

In `wardrobe.service.ts`, add imports near the top (alongside existing feature-flags import):

```typescript
import { FashionStateService } from '../learning/fashion-state.service';
import { LearningEventsService } from '../learning/learning-events.service';
import type { StyleContext } from '../ai/elite/eliteScoring';
import { buildEliteExposureEvent, normalizeStylistOutfit as _unused } from '../ai/elite/eliteScoring';
```

Wait — `buildEliteExposureEvent` is in the backend eliteScoring.ts, and `wardrobe.service.ts` already imports from `../ai/elite/eliteScoring` (the Studio adapters). So add `buildEliteExposureEvent` to the existing import:

Find the existing elite import block (around lines 74-79):

```typescript
// BEFORE:
import { ELITE_FLAGS } from '../config/feature-flags';
import {
  elitePostProcessOutfits,
  normalizeStudioOutfit,
  denormalizeStudioOutfit,
} from '../ai/elite/eliteScoring';

// AFTER:
import { ELITE_FLAGS } from '../config/feature-flags';
import {
  elitePostProcessOutfits,
  normalizeStudioOutfit,
  denormalizeStudioOutfit,
  buildEliteExposureEvent,
} from '../ai/elite/eliteScoring';
import type { StyleContext } from '../ai/elite/eliteScoring';
import { FashionStateService } from '../learning/fashion-state.service';
import { LearningEventsService } from '../learning/learning-events.service';
```

Update constructor (line 249):

```typescript
// BEFORE:
  constructor(private readonly vertex: VertexService) {}

// AFTER:
  constructor(
    private readonly vertex: VertexService,
    private readonly fashionStateService: FashionStateService,
    private readonly learningEventsService: LearningEventsService,
  ) {}
```

**Step 3: Add private helper for loading elite context**

Add a private helper method to WardrobeService (after the constructor, before the first method):

```typescript
  /**
   * Load StyleContext for elite scoring (non-blocking).
   * Returns minimal context on timeout/error.
   */
  private async loadEliteStyleContext(userId: string): Promise<StyleContext> {
    try {
      const [summary, brandsRes] = await Promise.all([
        this.fashionStateService.getStateSummary(userId).catch(() => null),
        pool.query(
          'SELECT preferred_brands FROM style_profiles WHERE user_id = $1',
          [userId],
        ).then(r => {
          const raw = r.rows[0]?.preferred_brands;
          return Array.isArray(raw) ? raw : [];
        }).catch(() => [] as string[]),
      ]);

      return {
        fashionState: summary ? {
          topBrands: summary.topBrands,
          avoidBrands: summary.avoidBrands,
          topColors: summary.topColors,
          avoidColors: summary.avoidColors,
          topCategories: summary.topCategories,
          priceBracket: summary.priceBracket,
          isColdStart: summary.isColdStart,
        } : null,
        preferredBrands: brandsRes,
      };
    } catch {
      return {};
    }
  }
```

**Step 4: Populate Studio STD hook**

Replace lines 1788-1794 in `generateOutfits()`:

```typescript
// BEFORE (lines 1788-1794):
      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = withIds;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = withIds.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, {}, { mode: 'studio', requestId: request_id });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }

// AFTER:
      // ── Elite Scoring: load context (non-blocking) ──
      const eliteStyleContext = await this.loadEliteStyleContext(userId);

      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = withIds;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = withIds.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, eliteStyleContext, { mode: 'studio', requestId: request_id });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }

      // ── Elite Scoring: log exposure event (fire-and-forget) ──
      // NOT gated by ELITE_FLAGS — gated by LEARNING_FLAGS + consent + circuit breaker
      {
        const canonicalForEvent = eliteOutfits.map(normalizeStudioOutfit);
        const exposureEvent = buildEliteExposureEvent(userId, canonicalForEvent, {
          mode: 'studio',
          requestId: request_id,
          weather: opts?.weather ? { temp: opts.weather.temp } : undefined,
        });
        this.learningEventsService.logEvent(exposureEvent).catch(() => {});
      }
```

**Step 5: Populate Studio FAST hook**

Replace lines 2802-2808 in `generateOutfitsFast()`:

```typescript
// BEFORE (lines 2802-2808):
      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = outfits;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = outfits.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, {}, { mode: 'studio', requestId: reqId });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }

// AFTER:
      // ── Elite Scoring: load context (non-blocking) ──
      const eliteStyleContext = await this.loadEliteStyleContext(userId);

      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = outfits;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = outfits.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, eliteStyleContext, { mode: 'studio', requestId: reqId });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }

      // ── Elite Scoring: log exposure event (fire-and-forget) ──
      // NOT gated by ELITE_FLAGS — gated by LEARNING_FLAGS + consent + circuit breaker
      {
        const canonicalForEvent = eliteOutfits.map(normalizeStudioOutfit);
        const exposureEvent = buildEliteExposureEvent(userId, canonicalForEvent, {
          mode: 'studio',
          requestId: reqId,
          weather: opts?.weather ? { temp: opts.weather.temp } : undefined,
        });
        this.learningEventsService.logEvent(exposureEvent).catch(() => {});
      }
```

**Step 6: Run backend tests**

Run: `cd apps/backend-nest && npx jest --testPathPattern='eliteScoring' --verbose 2>&1 | tail -30`
Expected: All 14 tests pass.

Run: `cd apps/backend-nest && npx jest --passWithNoTests 2>&1 | tail -5`
Expected: Full backend suite passes.

**Step 7: Commit**

```bash
git add apps/backend-nest/src/wardrobe/wardrobe.module.ts apps/backend-nest/src/wardrobe/wardrobe.service.ts
git commit -m "feat(elite): wire Studio STD+FAST StyleContext plumbing + exposure event logging"
```

---

### Task 7: Populate Trips Hook with wardrobeStats

**Files:**
- Modify: `apps/frontend/src/lib/trips/capsuleEngine.ts`

**Step 1: Add deriveWardrobeStats import**

Update the existing elite import (lines 30-34):

```typescript
// BEFORE:
import {
  elitePostProcessOutfits,
  normalizeTripsOutfit,
  denormalizeTripsOutfit,
} from '../elite/eliteScoring';

// AFTER:
import {
  elitePostProcessOutfits,
  normalizeTripsOutfit,
  denormalizeTripsOutfit,
  deriveWardrobeStats,
} from '../elite/eliteScoring';
```

**Step 2: Compute wardrobeStats and pass enriched StyleContext**

Replace lines 2029-2035 in `buildCapsule()`:

```typescript
// BEFORE (lines 2029-2035):
  // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
  let eliteOutfits = outfits;
  if (ELITE_SCORING_TRIPS) {
    const canonical = outfits.map(normalizeTripsOutfit);
    const result = elitePostProcessOutfits(canonical, {presentation}, {mode: 'trips', requestId});
    eliteOutfits = result.outfits.map(denormalizeTripsOutfit);
  }

// AFTER:
  // ── Elite Scoring: derive wardrobe stats ──
  const wardrobeStats = deriveWardrobeStats(wardrobeItems);

  // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
  let eliteOutfits = outfits;
  if (ELITE_SCORING_TRIPS) {
    const canonical = outfits.map(normalizeTripsOutfit);
    const result = elitePostProcessOutfits(
      canonical,
      {presentation, wardrobeStats},
      {mode: 'trips', requestId},
    );
    eliteOutfits = result.outfits.map(denormalizeTripsOutfit);
  }
  // NOTE: No exposure event for Trips — no backend call exists.
  // Trips is 100% client-side (AsyncStorage). Revisit in Phase 2.
```

**Step 3: Run capsule engine tests**

Run: `cd /Users/giffinmike/Git/StylIQ && npx jest --testPathPattern='capsuleEngine' --passWithNoTests 2>&1 | tail -10`
Expected: All capsule engine tests pass.

**Step 4: Commit**

```bash
git add apps/frontend/src/lib/trips/capsuleEngine.ts
git commit -m "feat(elite): wire Trips wardrobeStats into StyleContext (no exposure event)"
```

---

### Final Verification

**Step 1: Run elite scoring tests**

Run: `cd apps/backend-nest && npx jest --testPathPattern='eliteScoring' --verbose`
Expected: 14 tests pass (8 Phase 0 + 6 Phase 1).

**Step 2: Run full backend test suite**

Run: `cd apps/backend-nest && npx jest --passWithNoTests 2>&1 | tail -10`
Expected: All tests pass.

**Step 3: Run capsule engine tests**

Run: `cd /Users/giffinmike/Git/StylIQ && npx jest --testPathPattern='capsuleEngine' --passWithNoTests 2>&1 | tail -10`
Expected: All tests pass.

**Step 4: Verify TypeScript compiles**

Run: `cd apps/backend-nest && npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors.

---

## Behavior Change Assessment

| Scenario | Behavior |
|---|---|
| All flags OFF | Zero change — StyleContext populated but unused, no events |
| ELITE_FLAG ON + LEARNING_EVENTS OFF | StyleContext flows through NO-OP, no events written |
| ELITE_FLAG OFF + LEARNING_EVENTS ON | Exposure events still fire (desired for baseline data) |
| ELITE_FLAG ON + LEARNING_EVENTS ON + consent | Full pipeline: context loaded, outfits unchanged, event logged |
| FashionState slow (>100ms) | Returns null, StyleContext.fashionState = null, no latency impact |
| User no consent | Event write silently skipped (existing ConsentCache behavior) |

## Files Changed Summary

| File | What |
|---|---|
| `learning/dto/learning-event.dto.ts` | +ELITE_SUGGESTION_SERVED type, +EventContext fields |
| `ai/elite/eliteScoring.ts` | Expanded StyleContext, +buildEliteExposureEvent() |
| `frontend/lib/elite/eliteScoring.ts` | Expanded StyleContext (SYNC), +deriveWardrobeStats() |
| `ai/elite/eliteScoring.spec.ts` | +6 Phase 1 tests |
| `ai/ai.module.ts` | +LearningModule import |
| `ai/ai.service.ts` | +DI params, +context loading, +event firing |
| `wardrobe/wardrobe.module.ts` | +LearningModule import |
| `wardrobe/wardrobe.service.ts` | +DI params, +loadEliteStyleContext(), +event firing (STD+FAST) |
| `frontend/lib/trips/capsuleEngine.ts` | +deriveWardrobeStats() call, enriched StyleContext |

**Total: 9 files modified, 0 new files**
