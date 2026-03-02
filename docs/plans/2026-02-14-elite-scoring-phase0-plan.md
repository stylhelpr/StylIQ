# Elite Scoring Phase 0 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire a NO-OP `elitePostProcessOutfits()` post-processor into 3 surfaces (Stylist, Studio, Trips) behind feature flags that default OFF, creating zero behavior change.

**Architecture:** Dual stubs — backend module for Stylist + Studio, frontend module for Trips (which runs client-side). Types duplicated in both locations (~30 lines). Feature flags use the existing `getFlag()` pattern on backend, hardcoded constants on frontend.

**Tech Stack:** TypeScript, NestJS (backend), React Native (frontend), Jest (tests)

---

### Task 1: Create Backend Elite Scoring Types + NO-OP

**Files:**
- Create: `apps/backend-nest/src/ai/elite/eliteScoring.ts`

**Step 1: Create the file with types, NO-OP function, and adapters**

```typescript
/**
 * Elite Scoring — Phase 0 (NO-OP)
 *
 * Shared post-processor for outfit quality scoring.
 * Phase 0: returns outfits unchanged. Wired behind feature flags.
 *
 * // SYNC: keep types in sync with apps/frontend/src/lib/elite/eliteScoring.ts
 */

// ── Canonical Slot Taxonomy ──────────────────────────────────────────────────

export type CanonicalSlot =
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'outerwear'
  | 'dresses'
  | 'accessories'
  | 'activewear'
  | 'swimwear';

export type CanonicalItem = {
  id: string;
  slot: CanonicalSlot;
  [key: string]: unknown;
};

export type CanonicalOutfit = {
  id: string;
  items: CanonicalItem[];
  [key: string]: unknown;
};

export type StyleContext = {
  presentation?: 'masculine' | 'feminine' | 'mixed';
};

export type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
};

export type EliteResult<T> = {
  outfits: T[];
  debug: Record<string, unknown>;
};

// ── NO-OP Post-Processor ─────────────────────────────────────────────────────

export function elitePostProcessOutfits<T>(
  outfits: T[],
  _ctx: StyleContext,
  _env: EliteEnv,
): EliteResult<T> {
  // Phase 0: pass-through, no scoring
  return { outfits, debug: {} };
}

// ── Stylist Adapters ─────────────────────────────────────────────────────────
// Stylist items use: { id, name, imageUrl, category: 'top'|'bottom'|'shoes'|... }

const STYLIST_TO_CANONICAL: Record<string, CanonicalSlot> = {
  top: 'tops',
  bottom: 'bottoms',
  shoes: 'shoes',
  outerwear: 'outerwear',
  dress: 'dresses',
  accessory: 'accessories',
  activewear: 'activewear',
  swimwear: 'swimwear',
};

const CANONICAL_TO_STYLIST: Record<CanonicalSlot, string> = {
  tops: 'top',
  bottoms: 'bottom',
  shoes: 'shoes',
  outerwear: 'outerwear',
  dresses: 'dress',
  accessories: 'accessory',
  activewear: 'activewear',
  swimwear: 'swimwear',
};

export function normalizeStylistOutfit(outfit: any): CanonicalOutfit {
  return {
    ...outfit,
    items: (outfit.items ?? []).map((item: any) => ({
      ...item,
      slot: STYLIST_TO_CANONICAL[item.category] ?? 'accessories',
    })),
  };
}

export function denormalizeStylistOutfit(outfit: CanonicalOutfit): any {
  const { items, ...rest } = outfit;
  return {
    ...rest,
    items: items.map(({ slot, ...item }) => ({
      ...item,
      category: CANONICAL_TO_STYLIST[slot] ?? 'accessory',
    })),
  };
}

// ── Studio Adapters ──────────────────────────────────────────────────────────
// Studio items use: { id, label, main_category: 'Tops'|'Bottoms'|..., ... }
// Studio outfit: { outfit_id, title, items, why, missing? }

const STUDIO_MAIN_CAT_TO_CANONICAL: Record<string, CanonicalSlot> = {
  Tops: 'tops',
  Bottoms: 'bottoms',
  Shoes: 'shoes',
  Outerwear: 'outerwear',
  Dresses: 'dresses',
  Accessories: 'accessories',
  Activewear: 'activewear',
  Swimwear: 'swimwear',
  Skirts: 'bottoms',
  Bags: 'accessories',
  Headwear: 'accessories',
  Jewelry: 'accessories',
  Formalwear: 'dresses',
  TraditionalWear: 'dresses',
  Loungewear: 'tops',
  Sleepwear: 'tops',
  Maternity: 'tops',
  Unisex: 'tops',
  Costumes: 'tops',
  Undergarments: 'accessories',
};

export function normalizeStudioOutfit(outfit: any): CanonicalOutfit {
  return {
    ...outfit,
    id: outfit.outfit_id ?? outfit.id,
    items: (outfit.items ?? []).map((item: any) => ({
      ...item,
      slot: STUDIO_MAIN_CAT_TO_CANONICAL[item.main_category] ?? 'accessories',
    })),
  };
}

export function denormalizeStudioOutfit(outfit: CanonicalOutfit): any {
  const { slot: _unusedSlot, items, id, ...rest } = outfit as any;
  return {
    ...rest,
    id,
    outfit_id: rest.outfit_id ?? id,
    items: items.map(({ slot, ...item }: any) => item),
  };
}
```

**Step 2: Verify file compiles**

Run: `cd apps/backend-nest && npx tsc --noEmit src/ai/elite/eliteScoring.ts 2>&1 | head -20`
Expected: No errors (or only unrelated import errors from the wider project)

**Step 3: Commit**

```bash
git add apps/backend-nest/src/ai/elite/eliteScoring.ts
git commit -m "feat(elite): add Phase 0 NO-OP elitePostProcessOutfits with backend types and adapters"
```

---

### Task 2: Create Frontend Elite Scoring Types + NO-OP

**Files:**
- Create: `apps/frontend/src/lib/elite/eliteScoring.ts`
- Create: `apps/frontend/src/lib/elite/eliteFlags.ts`

**Step 1: Create the frontend flags file**

```typescript
/**
 * Elite Scoring feature flags (frontend).
 * All default OFF — Phase 0 creates zero behavior change.
 */
export const ELITE_SCORING_TRIPS = false;
export const ELITE_SCORING_DEBUG = false;
```

**Step 2: Create the frontend elite scoring file with types, NO-OP, and Trips adapter**

```typescript
/**
 * Elite Scoring — Phase 0 (NO-OP)
 *
 * Frontend stub for Trips Capsule surface.
 * Phase 0: returns outfits unchanged. Wired behind ELITE_SCORING_TRIPS flag.
 *
 * // SYNC: keep types in sync with apps/backend-nest/src/ai/elite/eliteScoring.ts
 */

import type {CapsuleOutfit, TripPackingItem} from '../../types/trips';

// ── Canonical Slot Taxonomy ──────────────────────────────────────────────────

export type CanonicalSlot =
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'outerwear'
  | 'dresses'
  | 'accessories'
  | 'activewear'
  | 'swimwear';

export type CanonicalItem = {
  id: string;
  slot: CanonicalSlot;
  [key: string]: unknown;
};

export type CanonicalOutfit = {
  id: string;
  items: CanonicalItem[];
  [key: string]: unknown;
};

export type StyleContext = {
  presentation?: 'masculine' | 'feminine' | 'mixed';
};

export type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
};

export type EliteResult<T> = {
  outfits: T[];
  debug: Record<string, unknown>;
};

// ── NO-OP Post-Processor ─────────────────────────────────────────────────────

export function elitePostProcessOutfits<T>(
  outfits: T[],
  _ctx: StyleContext,
  _env: EliteEnv,
): EliteResult<T> {
  // Phase 0: pass-through, no scoring
  return {outfits, debug: {}};
}

// ── Trips Adapters ───────────────────────────────────────────────────────────
// Trips items use: { id, mainCategory: 'Tops'|'Bottoms'|..., ... }
// Trips outfit: { id, dayLabel, type?, occasion?, items: TripPackingItem[] }

const TRIPS_MAIN_CAT_TO_CANONICAL: Record<string, CanonicalSlot> = {
  Tops: 'tops',
  Bottoms: 'bottoms',
  Shoes: 'shoes',
  Outerwear: 'outerwear',
  Dresses: 'dresses',
  Accessories: 'accessories',
  Activewear: 'activewear',
  Swimwear: 'swimwear',
};

const CANONICAL_TO_TRIPS_MAIN_CAT: Record<CanonicalSlot, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  shoes: 'Shoes',
  outerwear: 'Outerwear',
  dresses: 'Dresses',
  accessories: 'Accessories',
  activewear: 'Activewear',
  swimwear: 'Swimwear',
};

export function normalizeTripsOutfit(outfit: CapsuleOutfit): CanonicalOutfit {
  return {
    ...outfit,
    items: outfit.items.map((item: TripPackingItem) => ({
      ...item,
      slot: TRIPS_MAIN_CAT_TO_CANONICAL[item.mainCategory] ?? 'accessories',
    })),
  };
}

export function denormalizeTripsOutfit(outfit: CanonicalOutfit): CapsuleOutfit {
  const {items, ...rest} = outfit;
  return {
    ...rest,
    items: items.map(({slot, ...item}: any) => ({
      ...item,
      mainCategory: CANONICAL_TO_TRIPS_MAIN_CAT[slot] ?? 'Accessories',
    })),
  } as CapsuleOutfit;
}
```

**Step 3: Commit**

```bash
git add apps/frontend/src/lib/elite/eliteScoring.ts apps/frontend/src/lib/elite/eliteFlags.ts
git commit -m "feat(elite): add Phase 0 NO-OP frontend stub with Trips adapters and flags"
```

---

### Task 3: Add Backend Feature Flags

**Files:**
- Modify: `apps/backend-nest/src/config/feature-flags.ts:36` (append after LEARNING_FLAGS)

**Step 1: Add ELITE_FLAGS to the existing feature-flags.ts**

Append after the `LEARNING_FLAGS` block (after line 36), before `AGGREGATION_CONFIG`:

```typescript
/**
 * Elite Scoring flags — Phase 0 (all OFF).
 * Controls whether elitePostProcessOutfits() is called per surface.
 */
export const ELITE_FLAGS = {
  STYLIST: getFlag('ELITE_SCORING_STYLIST', false),
  STUDIO: getFlag('ELITE_SCORING_STUDIO', false),
  DEBUG: getFlag('ELITE_SCORING_DEBUG', false),
};
```

**Step 2: Verify build**

Run: `cd apps/backend-nest && npx tsc --noEmit 2>&1 | tail -5`
Expected: No new errors

**Step 3: Commit**

```bash
git add apps/backend-nest/src/config/feature-flags.ts
git commit -m "feat(elite): add ELITE_FLAGS to feature-flags.ts (all default OFF)"
```

---

### Task 4: Write Backend NO-OP Invariance Tests

**Files:**
- Create: `apps/backend-nest/src/ai/elite/eliteScoring.spec.ts`

**Step 1: Write the test file**

```typescript
/**
 * Elite Scoring Phase 0 — NO-OP invariance tests.
 *
 * Proves:
 * 1. elitePostProcessOutfits returns outfits unchanged
 * 2. Stylist normalize/denormalize round-trips to original
 * 3. Studio normalize/denormalize round-trips to original
 */
import {
  elitePostProcessOutfits,
  normalizeStylistOutfit,
  denormalizeStylistOutfit,
  normalizeStudioOutfit,
  denormalizeStudioOutfit,
} from './eliteScoring';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const stylistOutfit = {
  id: 'outfit-1',
  rank: 1,
  summary: 'A casual look',
  items: [
    { id: 'item-1', name: 'White Tee', imageUrl: 'https://img/1.jpg', category: 'top' },
    { id: 'item-2', name: 'Blue Jeans', imageUrl: 'https://img/2.jpg', category: 'bottom' },
    { id: 'item-3', name: 'Sneakers', imageUrl: 'https://img/3.jpg', category: 'shoes' },
  ],
  fashionContext: {
    weatherFit: 'optimal',
    silhouette: 'relaxed',
    colorStrategy: 'neutral palette',
    confidenceLevel: 0.82,
  },
};

const studioOutfit = {
  outfit_id: 'studio-1',
  title: 'Business Casual',
  why: 'Smart pairing for the office',
  missing: null,
  items: [
    { id: 'w-1', label: 'Oxford Shirt', main_category: 'Tops', subcategory: 'Oxford Shirt', color: 'white' },
    { id: 'w-2', label: 'Chinos', main_category: 'Bottoms', subcategory: 'Chinos', color: 'khaki' },
    { id: 'w-3', label: 'Loafers', main_category: 'Shoes', subcategory: 'Loafers', color: 'brown' },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('elitePostProcessOutfits (Phase 0 NO-OP)', () => {
  it('returns outfits array unchanged', () => {
    const input = [stylistOutfit, { ...stylistOutfit, id: 'outfit-2' }];
    const result = elitePostProcessOutfits(
      input,
      { presentation: 'mixed' },
      { mode: 'stylist', requestId: 'test-1' },
    );
    expect(result.outfits).toBe(input); // same reference
    expect(result.debug).toEqual({});
  });

  it('returns empty array unchanged', () => {
    const result = elitePostProcessOutfits(
      [],
      { presentation: 'masculine' },
      { mode: 'studio' },
    );
    expect(result.outfits).toEqual([]);
    expect(result.debug).toEqual({});
  });
});

describe('Stylist adapter round-trip', () => {
  it('normalize then denormalize produces original shape', () => {
    const normalized = normalizeStylistOutfit(stylistOutfit);

    // Verify canonical slots assigned
    expect(normalized.items[0].slot).toBe('tops');
    expect(normalized.items[1].slot).toBe('bottoms');
    expect(normalized.items[2].slot).toBe('shoes');

    const restored = denormalizeStylistOutfit(normalized);

    // Verify original category values restored
    expect(restored.items[0].category).toBe('top');
    expect(restored.items[1].category).toBe('bottom');
    expect(restored.items[2].category).toBe('shoes');

    // Verify all other fields preserved
    expect(restored.id).toBe(stylistOutfit.id);
    expect(restored.rank).toBe(stylistOutfit.rank);
    expect(restored.summary).toBe(stylistOutfit.summary);
    expect(restored.items[0].id).toBe('item-1');
    expect(restored.items[0].name).toBe('White Tee');
    expect(restored.fashionContext).toEqual(stylistOutfit.fashionContext);
  });

  it('handles dress slot', () => {
    const dressOutfit = {
      id: 'dress-1',
      items: [
        { id: 'd-1', category: 'dress' },
        { id: 'd-2', category: 'shoes' },
        { id: 'd-3', category: 'accessory' },
      ],
    };
    const normalized = normalizeStylistOutfit(dressOutfit);
    expect(normalized.items[0].slot).toBe('dresses');
    expect(normalized.items[2].slot).toBe('accessories');

    const restored = denormalizeStylistOutfit(normalized);
    expect(restored.items[0].category).toBe('dress');
    expect(restored.items[2].category).toBe('accessory');
  });
});

describe('Studio adapter round-trip', () => {
  it('normalize then denormalize preserves outfit structure', () => {
    const normalized = normalizeStudioOutfit(studioOutfit);

    // Verify canonical slots assigned
    expect(normalized.items[0].slot).toBe('tops');
    expect(normalized.items[1].slot).toBe('bottoms');
    expect(normalized.items[2].slot).toBe('shoes');
    expect(normalized.id).toBe('studio-1');

    const restored = denormalizeStudioOutfit(normalized);

    // Verify original main_category values preserved (not stripped)
    expect(restored.items[0].main_category).toBe('Tops');
    expect(restored.items[1].main_category).toBe('Bottoms');
    expect(restored.items[2].main_category).toBe('Shoes');

    // Verify other fields preserved
    expect(restored.outfit_id).toBe('studio-1');
    expect(restored.title).toBe('Business Casual');
    expect(restored.why).toBe('Smart pairing for the office');
  });

  it('handles extended category mappings', () => {
    const formalOutfit = {
      outfit_id: 'formal-1',
      items: [
        { id: 'f-1', main_category: 'Formalwear' },
        { id: 'f-2', main_category: 'Jewelry' },
        { id: 'f-3', main_category: 'Bags' },
      ],
    };
    const normalized = normalizeStudioOutfit(formalOutfit);
    expect(normalized.items[0].slot).toBe('dresses');
    expect(normalized.items[1].slot).toBe('accessories');
    expect(normalized.items[2].slot).toBe('accessories');
  });
});

describe('Full pipeline: normalize → elitePostProcess → denormalize', () => {
  it('Stylist pipeline returns equivalent output', () => {
    const canonical = normalizeStylistOutfit(stylistOutfit);
    const result = elitePostProcessOutfits(
      [canonical],
      { presentation: 'mixed' },
      { mode: 'stylist' },
    );
    const restored = denormalizeStylistOutfit(result.outfits[0]);
    expect(restored.items[0].category).toBe('top');
    expect(restored.items.length).toBe(stylistOutfit.items.length);
  });

  it('Studio pipeline returns equivalent output', () => {
    const canonical = normalizeStudioOutfit(studioOutfit);
    const result = elitePostProcessOutfits(
      [canonical],
      { presentation: 'masculine' },
      { mode: 'studio' },
    );
    const restored = denormalizeStudioOutfit(result.outfits[0]);
    expect(restored.items[0].main_category).toBe('Tops');
    expect(restored.outfit_id).toBe('studio-1');
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `cd apps/backend-nest && npx jest src/ai/elite/eliteScoring.spec.ts --verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add apps/backend-nest/src/ai/elite/eliteScoring.spec.ts
git commit -m "test(elite): add Phase 0 NO-OP invariance tests for adapters and post-processor"
```

---

### Task 5: Wire Stylist Hook Point

**Files:**
- Modify: `apps/backend-nest/src/ai/ai.service.ts`
  - Add import near top (after line 12)
  - Add hook at line ~4483 (before the return statement at line 4484)

**Step 1: Add import at top of file**

After the existing import on line 12 (`import { getSecret, secretExists } from '../config/secrets';`), add:

```typescript
import { ELITE_FLAGS } from '../config/feature-flags';
import {
  elitePostProcessOutfits,
  normalizeStylistOutfit,
  denormalizeStylistOutfit,
} from './elite/eliteScoring';
```

**Step 2: Wire the hook before the return**

Replace this block (lines 4483-4484):

```typescript

    return { weatherSummary, outfits: finalOutfits.slice(0, 3) };
```

With:

```typescript

    // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
    let eliteOutfits = finalOutfits.slice(0, 3);
    if (ELITE_FLAGS.STYLIST) {
      const canonical = eliteOutfits.map(normalizeStylistOutfit);
      const result = elitePostProcessOutfits(canonical, { presentation: userPresentation }, { mode: 'stylist', requestId: requestId ?? undefined });
      eliteOutfits = result.outfits.map(denormalizeStylistOutfit);
    }

    return { weatherSummary, outfits: eliteOutfits };
```

**Step 3: Verify the variable `userPresentation` is in scope**

Check that `userPresentation` exists in `suggestVisualOutfits()` — it should be declared near the top of the method.

Run: `grep -n 'userPresentation' apps/backend-nest/src/ai/ai.service.ts | head -5`
Expected: Shows declaration like `const userPresentation = ...`

Also check that `requestId` is in scope (or use a fallback).

**Step 4: Verify build**

Run: `cd apps/backend-nest && npx tsc --noEmit 2>&1 | tail -10`
Expected: No new errors

**Step 5: Commit**

```bash
git add apps/backend-nest/src/ai/ai.service.ts
git commit -m "feat(elite): wire Stylist hook point (flag OFF, NO-OP)"
```

---

### Task 6: Wire Studio STD Hook Point

**Files:**
- Modify: `apps/backend-nest/src/wardrobe/wardrobe.service.ts`
  - Add imports near top of file
  - Wire STD path at line ~1781

**Step 1: Add imports near top of file**

Find the imports section and add:

```typescript
import { ELITE_FLAGS } from '../config/feature-flags';
import {
  elitePostProcessOutfits,
  normalizeStudioOutfit,
  denormalizeStudioOutfit,
} from '../ai/elite/eliteScoring';
```

**Step 2: Wire STD path hook before the return**

Replace this block (lines 1780-1788):

```typescript

      return {
        request_id,
        outfit_id: best.outfit_id,
        items: best.items,
        why: best.why,
        missing: best.missing,
        outfits: withIds,
      };
```

With:

```typescript

      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = withIds;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = withIds.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, {}, { mode: 'studio', requestId: request_id });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }

      return {
        request_id,
        outfit_id: best.outfit_id,
        items: best.items,
        why: best.why,
        missing: best.missing,
        outfits: eliteOutfits,
      };
```

**Step 3: Verify build**

Run: `cd apps/backend-nest && npx tsc --noEmit 2>&1 | tail -10`
Expected: No new errors

**Step 4: Commit**

```bash
git add apps/backend-nest/src/wardrobe/wardrobe.service.ts
git commit -m "feat(elite): wire Studio STD hook point (flag OFF, NO-OP)"
```

---

### Task 7: Wire Studio FAST Hook Point

**Files:**
- Modify: `apps/backend-nest/src/wardrobe/wardrobe.service.ts` (same file, FAST path)

**Step 1: Wire FAST path hook before the return**

Replace this block (lines 2786-2793):

```typescript

      return {
        request_id: reqId,
        outfit_id: best.outfit_id,
        items: best.items,
        why: best.why,
        outfits,
      };
```

With:

```typescript

      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = outfits;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = outfits.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, {}, { mode: 'studio', requestId: reqId });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }

      return {
        request_id: reqId,
        outfit_id: best.outfit_id,
        items: best.items,
        why: best.why,
        outfits: eliteOutfits,
      };
```

**Step 2: Verify build**

Run: `cd apps/backend-nest && npx tsc --noEmit 2>&1 | tail -10`
Expected: No new errors

**Step 3: Run all backend tests**

Run: `cd apps/backend-nest && npx jest --verbose 2>&1 | tail -30`
Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/backend-nest/src/wardrobe/wardrobe.service.ts
git commit -m "feat(elite): wire Studio FAST hook point (flag OFF, NO-OP)"
```

---

### Task 8: Wire Trips Hook Point

**Files:**
- Modify: `apps/frontend/src/lib/trips/capsuleEngine.ts`
  - Add import near top (after line 28)
  - Wire hook at line ~2022 (before the return at line 2023)

**Step 1: Add imports at top of file**

After the existing import on line 28 (`} from './logging/tripAI.logger';`), add:

```typescript
import {ELITE_SCORING_TRIPS} from '../elite/eliteFlags';
import {
  elitePostProcessOutfits,
  normalizeTripsOutfit,
  denormalizeTripsOutfit,
} from '../elite/eliteScoring';
```

**Step 2: Wire the hook before the return**

Replace this block (lines 2022-2030):

```typescript

  return {
    build_id: buildId,
    outfits,
    packingList,
    version: CAPSULE_VERSION,
    fingerprint,
    ...(tripBackupKit.length > 0 ? {tripBackupKit} : {}),
  };
```

With:

```typescript

  // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
  let eliteOutfits = outfits;
  if (ELITE_SCORING_TRIPS) {
    const canonical = outfits.map(normalizeTripsOutfit);
    const result = elitePostProcessOutfits(canonical, {presentation}, {mode: 'trips', requestId});
    eliteOutfits = result.outfits.map(denormalizeTripsOutfit);
  }

  return {
    build_id: buildId,
    outfits: eliteOutfits,
    packingList,
    version: CAPSULE_VERSION,
    fingerprint,
    ...(tripBackupKit.length > 0 ? {tripBackupKit} : {}),
  };
```

**Step 3: Verify the variables `presentation` and `requestId` are in scope**

Check that both exist within `buildCapsule()`:
- `presentation` is declared at line 1451
- `requestId` is declared at line 1446

**Step 4: Run frontend capsule tests**

Run: `npx jest apps/frontend/src/lib/trips/capsuleEngine.spec.ts --verbose 2>&1 | tail -30`
Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/frontend/src/lib/trips/capsuleEngine.ts
git commit -m "feat(elite): wire Trips hook point (flag OFF, NO-OP)"
```

---

### Task 9: Final Verification

**Step 1: Run full backend test suite**

Run: `cd apps/backend-nest && npx jest --verbose 2>&1 | tail -40`
Expected: All tests pass

**Step 2: Run full frontend test suite**

Run: `npx jest --verbose 2>&1 | tail -40`
Expected: All tests pass (or existing failures only)

**Step 3: Build backend**

Run: `cd apps/backend-nest && npm run build 2>&1 | tail -10`
Expected: Build succeeds

**Step 4: Verify flags default OFF**

Confirm by reading the flag declarations:
- Backend: `ELITE_FLAGS.STYLIST`, `ELITE_FLAGS.STUDIO`, `ELITE_FLAGS.DEBUG` all `getFlag(..., false)` — no secret files exist → returns `false`
- Frontend: `ELITE_SCORING_TRIPS = false` hardcoded

**Step 5: Compile deliverable summary**

Produce the deliverable format specified in the original task:
- A) Hook Points table
- B) Canonical Schema
- C) Diffs per file
- D) Tests run + results
- E) Manual smoke test checklist:
  1. Start backend locally (`npm run start:dev`), hit `/api/health` — responds 200
  2. Trigger AI Stylist suggestion — verify outfits return as before (3 outfits with items)
  3. Trigger Outfit Studio generation (STD path) — verify outfits return with outfit_id, title, items
  4. Trigger Outfit Studio generation (FAST path) — same verification
  5. Create a trip in the app — verify capsule builds, outfits render, packing list shows

**Step 6: Commit any remaining changes**

```bash
git add -A
git commit -m "feat(elite): Phase 0 complete — NO-OP elite scoring wired to all 3 surfaces"
```
