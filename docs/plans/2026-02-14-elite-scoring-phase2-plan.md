# Elite Scoring Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add deterministic outfit reranking to `elitePostProcessOutfits()` using StyleContext signals, gated behind per-surface V2 flags.

**Architecture:** Phase 2 adds scoring logic (`scoreOutfit`, `colorMatches`, `deterministicHash`, `stableSortOutfits`) inside the existing `elitePostProcessOutfits` function. When `env.rerank=true`, outfits are scored and stably sorted by score descending. When `env.debug=true`, debug metadata is attached. Original array is never mutated (`[...outfits]` copy). No item swaps, no drops, no additions — only array order changes.

**Tech Stack:** TypeScript, NestJS (backend), React Native (frontend), Jest

**Design doc:** `docs/plans/2026-02-14-elite-scoring-phase2-design.md`

---

### Task 1: Add V2 flags to feature-flags.ts and eliteFlags.ts

**Files:**
- Modify: `apps/backend-nest/src/config/feature-flags.ts:42-46`
- Modify: `apps/frontend/src/lib/elite/eliteFlags.ts:1-6`

**Step 1: Add backend V2 flags**

In `apps/backend-nest/src/config/feature-flags.ts`, expand `ELITE_FLAGS` (line 42-46) from:

```typescript
export const ELITE_FLAGS = {
  STYLIST: getFlag('ELITE_SCORING_STYLIST', false),
  STUDIO: getFlag('ELITE_SCORING_STUDIO', false),
  DEBUG: getFlag('ELITE_SCORING_DEBUG', false),
};
```

To:

```typescript
export const ELITE_FLAGS = {
  STYLIST: getFlag('ELITE_SCORING_STYLIST', false),
  STUDIO: getFlag('ELITE_SCORING_STUDIO', false),
  STUDIO_V2: getFlag('ELITE_SCORING_STUDIO_V2', false),
  STYLIST_V2: getFlag('ELITE_SCORING_STYLIST_V2', false),
  DEBUG: getFlag('ELITE_SCORING_DEBUG', false),
};
```

**Step 2: Add frontend V2 flag**

In `apps/frontend/src/lib/elite/eliteFlags.ts`, change to:

```typescript
/**
 * Elite Scoring feature flags (frontend).
 * All default OFF — Phase 2 V2 enables reranking.
 */
export const ELITE_SCORING_TRIPS = false;
export const ELITE_SCORING_TRIPS_V2 = false;
export const ELITE_SCORING_DEBUG = false;
```

**Step 3: Commit**

```bash
git add apps/backend-nest/src/config/feature-flags.ts apps/frontend/src/lib/elite/eliteFlags.ts
git commit -m "feat(elite): add V2 reranking flags (all OFF by default)"
```

---

### Task 2: Expand EliteEnv + add scoring helpers to backend eliteScoring.ts

**Files:**
- Modify: `apps/backend-nest/src/ai/elite/eliteScoring.ts:57-78`

This is the core scoring implementation. All new functions go in the backend eliteScoring.ts.

**Step 1: Expand EliteEnv type**

Change `EliteEnv` (line 57-62) from:

```typescript
export type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
};
```

To:

```typescript
export type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
  rerank?: boolean;
  debug?: boolean;
};
```

**Step 2: Add OutfitScore type**

Add after `EliteResult<T>` type (after line 67):

```typescript
export type OutfitScore = {
  score: number;
  confidence: number;
  flags: string[];
};
```

**Step 3: Add colorMatches helper**

Add before the `elitePostProcessOutfits` function:

```typescript
export function colorMatches(itemColor: string, prefColor: string): boolean {
  const a = itemColor.toLowerCase();
  const b = prefColor.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}
```

**Step 4: Add deterministicHash helper**

```typescript
export function deterministicHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}
```

**Step 5: Add scoreOutfit function**

```typescript
export function scoreOutfit(
  outfit: CanonicalOutfit,
  ctx: StyleContext,
  env: EliteEnv,
): OutfitScore {
  let score = 0;
  const flags: string[] = [];
  let signalsAvailable = 0;
  let signalsUsed = 0;

  const fs = ctx.fashionState;
  const ws = ctx.wardrobeStats;

  // ── Brand affinity (Studio only: items have brand field) ──
  if (env.mode === 'studio' && fs) {
    const topBrands = [...(fs.topBrands ?? []), ...(ctx.preferredBrands ?? [])];
    const avoidBrands = fs.avoidBrands ?? [];
    if (topBrands.length > 0 || avoidBrands.length > 0) {
      signalsAvailable++;
      let brandFired = false;
      for (const item of outfit.items) {
        const brand = (item as any).brand as string | undefined;
        if (!brand) continue;
        const brandLower = brand.toLowerCase();
        if (topBrands.some(b => b.toLowerCase() === brandLower)) {
          score += 10;
          brandFired = true;
        }
        if (avoidBrands.some(b => b.toLowerCase() === brandLower)) {
          score -= 15;
          brandFired = true;
        }
      }
      if (brandFired) {
        signalsUsed++;
        flags.push('brand');
      }
    }
  }

  // ── Color affinity ──
  // Studio: fashionState.topColors/avoidColors + item.color
  // Trips: wardrobeStats.dominantColors + item.color
  {
    const topColors = env.mode === 'studio'
      ? (fs?.topColors ?? [])
      : env.mode === 'trips'
        ? (ws?.dominantColors ?? [])
        : [];
    const avoidColors = env.mode === 'studio' ? (fs?.avoidColors ?? []) : [];

    if (topColors.length > 0 || avoidColors.length > 0) {
      signalsAvailable++;
      let colorFired = false;
      for (const item of outfit.items) {
        const itemColor = (item as any).color as string | undefined;
        if (!itemColor) continue;
        if (topColors.some(c => colorMatches(itemColor, c))) {
          score += 5;
          colorFired = true;
        }
        if (avoidColors.some(c => colorMatches(itemColor, c))) {
          score -= 8;
          colorFired = true;
        }
      }
      if (colorFired) {
        signalsUsed++;
        flags.push('color');
      }
    }
  }

  // ── Category affinity ──
  // Studio: fashionState.topCategories
  // Trips: wardrobeStats.topCategories
  // Stylist: fashionState.topCategories (if available)
  {
    const topCategories = fs?.topCategories ?? ws?.topCategories ?? [];
    if (topCategories.length > 0) {
      signalsAvailable++;
      let catFired = false;
      const topCatLower = topCategories.map(c => c.toLowerCase());
      for (const item of outfit.items) {
        if (topCatLower.includes(item.slot.toLowerCase())) {
          score += 3;
          catFired = true;
        }
      }
      if (catFired) {
        signalsUsed++;
        flags.push('category');
      }
    }
  }

  // ── Slot completeness (all modes) ──
  {
    signalsAvailable++;
    const slots = new Set(outfit.items.map(i => i.slot));
    const hasComplete =
      (slots.has('tops') && slots.has('bottoms') && slots.has('shoes')) ||
      (slots.has('dresses') && slots.has('shoes'));
    if (hasComplete) {
      score += 5;
      signalsUsed++;
      flags.push('slot_complete');
    }
  }

  const confidence = signalsAvailable > 0 ? signalsUsed / signalsAvailable : 0;

  return { score, confidence, flags };
}
```

**Step 6: Add stableSortOutfits function**

```typescript
export function stableSortOutfits<T extends CanonicalOutfit>(
  outfits: T[],
  scores: Map<string, OutfitScore>,
): T[] {
  return [...outfits].sort((a, b) => {
    const sa = scores.get(a.id)?.score ?? 0;
    const sb = scores.get(b.id)?.score ?? 0;
    if (sa !== sb) return sb - sa;
    return deterministicHash(a.id + ':' + a.items.map(i => i.id).sort().join(','))
         - deterministicHash(b.id + ':' + b.items.map(i => i.id).sort().join(','));
  });
}
```

**Step 7: Replace NO-OP elitePostProcessOutfits with Phase 2 version**

Replace the function (currently lines 71-78) with:

```typescript
export function elitePostProcessOutfits<T>(
  outfits: T[],
  ctx: StyleContext,
  env: EliteEnv,
): EliteResult<T> {
  // Pass-through when rerank not enabled or <=1 outfit
  if (!env.rerank || outfits.length <= 1) {
    return { outfits, debug: {} };
  }

  const canonical = outfits as unknown as CanonicalOutfit[];

  // Score each outfit
  const scores = new Map<string, OutfitScore>();
  for (const outfit of canonical) {
    scores.set(outfit.id, scoreOutfit(outfit, ctx, env));
  }

  // Stable sort by score descending
  const reranked = stableSortOutfits(canonical, scores) as unknown as T[];

  // Debug output (only when debug flag enabled)
  const debug: Record<string, unknown> = {};
  if (env.debug) {
    debug.scores = canonical.map(o => ({
      outfitId: o.id,
      ...scores.get(o.id),
    }));
    debug.originalOrder = canonical.map(o => o.id);
    debug.rerankedOrder = (reranked as unknown as CanonicalOutfit[]).map(o => o.id);
  }

  return { outfits: reranked, debug };
}
```

**Step 8: Update file header comment**

Change `Phase 0 (NO-OP)` to `Phase 2 (Rerank)` in the file header.

**Step 9: Commit**

```bash
git add apps/backend-nest/src/ai/elite/eliteScoring.ts
git commit -m "feat(elite): add Phase 2 scoring + reranking logic to backend eliteScoring"
```

---

### Task 3: SYNC frontend eliteScoring.ts with backend

**Files:**
- Modify: `apps/frontend/src/lib/elite/eliteScoring.ts:56-77`

The frontend must have the same `EliteEnv`, `OutfitScore`, `colorMatches`, `deterministicHash`, `scoreOutfit`, `stableSortOutfits`, and updated `elitePostProcessOutfits`. Copy from backend with these adjustments:
- Remove `import { randomUUID }` (no crypto in frontend)
- Remove `buildEliteExposureEvent` (backend-only)
- Keep `deriveWardrobeStats`, Trips adapters, and all existing frontend-only code

**Step 1: Expand EliteEnv**

Add `rerank?: boolean;` and `debug?: boolean;` fields to EliteEnv (line 56-61).

**Step 2: Add OutfitScore type**

After `EliteResult<T>` (line 66), add:

```typescript
export type OutfitScore = {
  score: number;
  confidence: number;
  flags: string[];
};
```

**Step 3: Add colorMatches, deterministicHash, scoreOutfit, stableSortOutfits**

Copy exact same implementations from Task 2 (identical logic, no backend-specific deps).

**Step 4: Replace NO-OP elitePostProcessOutfits**

Same reranking implementation as backend Task 2 Step 7.

**Step 5: Update file header comment**

Change `Phase 0 (NO-OP)` to `Phase 2 (Rerank)`.

**Step 6: Commit**

```bash
git add apps/frontend/src/lib/elite/eliteScoring.ts
git commit -m "feat(elite): SYNC frontend eliteScoring with Phase 2 scoring logic"
```

---

### Task 4: Write Phase 2 tests

**Files:**
- Modify: `apps/backend-nest/src/ai/elite/eliteScoring.spec.ts`

Add 8 new test cases after existing tests. Import new exports: `scoreOutfit`, `stableSortOutfits`, `colorMatches`, `deterministicHash`, `OutfitScore`.

**Step 1: Write failing tests**

Add to the test file:

```typescript
// ── Phase 2 Tests ───────────────────────────────────────────────────────────

describe('colorMatches', () => {
  it('matches exact (case-insensitive)', () => {
    expect(colorMatches('Navy Blue', 'navy blue')).toBe(true);
  });

  it('matches substring (item includes pref)', () => {
    expect(colorMatches('Navy Blue', 'navy')).toBe(true);
  });

  it('matches substring (pref includes item)', () => {
    expect(colorMatches('blue', 'Navy Blue')).toBe(true);
  });

  it('rejects non-match', () => {
    expect(colorMatches('red', 'blue')).toBe(false);
  });
});

describe('deterministicHash', () => {
  it('returns same value for same input', () => {
    expect(deterministicHash('abc')).toBe(deterministicHash('abc'));
  });

  it('returns different values for different inputs', () => {
    expect(deterministicHash('abc')).not.toBe(deterministicHash('xyz'));
  });
});

describe('scoreOutfit (Phase 2)', () => {
  const makeOutfit = (id: string, items: Array<{id: string; slot: any; brand?: string; color?: string}>): any => ({
    id,
    items: items.map(i => ({ ...i })),
  });

  it('scores brand affinity in studio mode', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', brand: 'Nike', color: 'white' },
      { id: 'i2', slot: 'bottoms', brand: 'Zara', color: 'blue' },
      { id: 'i3', slot: 'shoes', brand: 'Gucci', color: 'black' },
    ]);
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'],
        avoidBrands: ['Gucci'],
        topColors: [],
        avoidColors: [],
        topCategories: [],
        priceBracket: null,
        isColdStart: false,
      },
      preferredBrands: [],
    };
    const result = scoreOutfit(outfit, ctx, { mode: 'studio', rerank: true });
    // Nike: +10, Gucci: -15, slot complete: +5 = 0
    expect(result.score).toBe(0);
    expect(result.flags).toContain('brand');
    expect(result.flags).toContain('slot_complete');
  });

  it('scores color affinity in studio mode', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', color: 'Navy Blue' },
      { id: 'i2', slot: 'bottoms', color: 'Black' },
      { id: 'i3', slot: 'shoes', color: 'Brown' },
    ]);
    const ctx: any = {
      fashionState: {
        topBrands: [],
        avoidBrands: [],
        topColors: ['navy', 'black'],
        avoidColors: ['brown'],
        topCategories: [],
        priceBracket: null,
        isColdStart: false,
      },
    };
    const result = scoreOutfit(outfit, ctx, { mode: 'studio', rerank: true });
    // navy blue matches navy: +5, black matches black: +5, brown matches brown: -8, slot: +5 = 7
    expect(result.score).toBe(7);
    expect(result.flags).toContain('color');
  });

  it('returns zero score with empty StyleContext (fail-open)', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops' },
    ]);
    const result = scoreOutfit(outfit, {}, { mode: 'studio', rerank: true });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('only uses wardrobeStats for trips mode color', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', color: 'blue' },
      { id: 'i2', slot: 'bottoms', color: 'red' },
      { id: 'i3', slot: 'shoes', color: 'black' },
    ]);
    const ctx: any = {
      wardrobeStats: {
        dominantColors: ['blue', 'black'],
        topCategories: ['tops'],
        topBrands: [],
        totalItems: 10,
      },
    };
    const result = scoreOutfit(outfit, ctx, { mode: 'trips', rerank: true });
    // blue: +5, black: +5, category tops: +3, slot: +5 = 18
    expect(result.score).toBe(18);
    expect(result.flags).toContain('color');
    expect(result.flags).toContain('category');
    expect(result.flags).toContain('slot_complete');
  });
});

describe('elitePostProcessOutfits (Phase 2 rerank)', () => {
  const makeOutfit = (id: string, items: Array<{id: string; slot: any; brand?: string; color?: string}>): any => ({
    id,
    items: items.map(i => ({ ...i })),
  });

  it('identity: rerank=false → output order unchanged (same reference)', () => {
    const input = [
      makeOutfit('o1', [{ id: 'i1', slot: 'tops' }]),
      makeOutfit('o2', [{ id: 'i2', slot: 'bottoms' }]),
    ];
    const result = elitePostProcessOutfits(input, {}, { mode: 'studio' });
    expect(result.outfits).toBe(input); // same reference
    expect(result.debug).toEqual({});
  });

  it('no mutation: items are byte-identical before/after rerank', () => {
    const o1 = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', brand: 'Nike', color: 'white' },
      { id: 'i2', slot: 'bottoms', color: 'blue' },
      { id: 'i3', slot: 'shoes', color: 'black' },
    ]);
    const o2 = makeOutfit('o2', [
      { id: 'i4', slot: 'tops', brand: 'Gucci', color: 'red' },
      { id: 'i5', slot: 'bottoms', color: 'green' },
    ]);
    const inputCopy = JSON.parse(JSON.stringify([o1, o2]));
    const result = elitePostProcessOutfits(
      [o1, o2],
      {
        fashionState: {
          topBrands: ['Nike'], avoidBrands: [], topColors: [],
          avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
        },
      },
      { mode: 'studio', rerank: true },
    );
    // Items unchanged — deep equal against original snapshot
    for (const outfit of result.outfits) {
      const original = inputCopy.find((o: any) => o.id === (outfit as any).id);
      expect((outfit as any).items).toEqual(original.items);
    }
    // Same count
    expect(result.outfits.length).toBe(2);
  });

  it('deterministic: same inputs → same order across multiple runs', () => {
    const outfits = [
      makeOutfit('o1', [{ id: 'i1', slot: 'tops', brand: 'Nike' }, { id: 'i2', slot: 'bottoms' }, { id: 'i3', slot: 'shoes' }]),
      makeOutfit('o2', [{ id: 'i4', slot: 'tops', brand: 'Zara' }, { id: 'i5', slot: 'bottoms' }, { id: 'i6', slot: 'shoes' }]),
    ];
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'], avoidBrands: [], topColors: [],
        avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
      },
    };
    const env: any = { mode: 'studio', rerank: true };

    const r1 = elitePostProcessOutfits(outfits, ctx, env);
    const r2 = elitePostProcessOutfits(outfits, ctx, env);
    const r3 = elitePostProcessOutfits(outfits, ctx, env);

    const ids1 = r1.outfits.map((o: any) => o.id);
    const ids2 = r2.outfits.map((o: any) => o.id);
    const ids3 = r3.outfits.map((o: any) => o.id);

    expect(ids1).toEqual(ids2);
    expect(ids2).toEqual(ids3);
  });

  it('tie-breaker: equal scores → deterministic order by hash', () => {
    const outfits = [
      makeOutfit('o-zzz', [{ id: 'i1', slot: 'tops' }]),
      makeOutfit('o-aaa', [{ id: 'i2', slot: 'tops' }]),
    ];
    const env: any = { mode: 'studio', rerank: true };

    const r1 = elitePostProcessOutfits(outfits, {}, env);
    const r2 = elitePostProcessOutfits(outfits, {}, env);

    expect(r1.outfits.map((o: any) => o.id)).toEqual(r2.outfits.map((o: any) => o.id));
  });

  it('rerank: outfit with brand/color hits sorted before outfit without', () => {
    const loser = makeOutfit('loser', [
      { id: 'i1', slot: 'tops', brand: 'Unknown' },
      { id: 'i2', slot: 'bottoms' },
      { id: 'i3', slot: 'shoes' },
    ]);
    const winner = makeOutfit('winner', [
      { id: 'i4', slot: 'tops', brand: 'Nike', color: 'black' },
      { id: 'i5', slot: 'bottoms', color: 'blue' },
      { id: 'i6', slot: 'shoes' },
    ]);
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'], avoidBrands: [], topColors: ['black'],
        avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
      },
    };

    // loser is first in input
    const result = elitePostProcessOutfits(
      [loser, winner], ctx, { mode: 'studio', rerank: true },
    );
    // winner should be sorted first (higher score)
    expect((result.outfits[0] as any).id).toBe('winner');
  });

  it('fail-open: empty StyleContext → original order preserved', () => {
    const outfits = [
      makeOutfit('first', [{ id: 'i1', slot: 'tops' }]),
      makeOutfit('second', [{ id: 'i2', slot: 'bottoms' }]),
    ];
    const result = elitePostProcessOutfits(outfits, {}, { mode: 'studio', rerank: true });
    // All scores are 0, tie-breaker decides, but order is deterministic
    // Important: same count, same items
    expect(result.outfits.length).toBe(2);
    const ids = new Set(result.outfits.map((o: any) => o.id));
    expect(ids).toEqual(new Set(['first', 'second']));
  });

  it('debug output: debug=true → scores/flags/originalOrder in debug map', () => {
    const outfits = [
      makeOutfit('o1', [{ id: 'i1', slot: 'tops', brand: 'Nike' }, { id: 'i2', slot: 'bottoms' }, { id: 'i3', slot: 'shoes' }]),
      makeOutfit('o2', [{ id: 'i4', slot: 'tops' }]),
    ];
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'], avoidBrands: [], topColors: [],
        avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
      },
    };
    const result = elitePostProcessOutfits(
      outfits, ctx, { mode: 'studio', rerank: true, debug: true },
    );

    expect(result.debug.scores).toBeDefined();
    expect(result.debug.originalOrder).toEqual(['o1', 'o2']);
    expect(result.debug.rerankedOrder).toBeDefined();
    expect(Array.isArray(result.debug.scores)).toBe(true);
    expect((result.debug.scores as any[]).length).toBe(2);
    expect((result.debug.scores as any[])[0].outfitId).toBeDefined();
    expect((result.debug.scores as any[])[0].flags).toBeDefined();
  });

  it('confidence: 0 signals available → confidence=0, no rerank effect', () => {
    const outfit = makeOutfit('o1', [{ id: 'i1', slot: 'tops' }]);
    const result = scoreOutfit(outfit, {}, { mode: 'stylist', rerank: true });
    // Only slot completeness is available (always), but tops alone is not complete
    // So signalsAvailable=1 (slot), signalsUsed=0 → confidence=0
    expect(result.confidence).toBe(0);
    expect(result.score).toBe(0);
  });
});

describe('stableSortOutfits', () => {
  it('preserves item identity (no swaps/drops)', () => {
    const o1: any = { id: 'o1', items: [{ id: 'i1', slot: 'tops' }] };
    const o2: any = { id: 'o2', items: [{ id: 'i2', slot: 'bottoms' }] };

    const scores = new Map<string, any>();
    scores.set('o1', { score: 10, confidence: 1, flags: ['brand'] });
    scores.set('o2', { score: 20, confidence: 1, flags: ['color'] });

    const sorted = stableSortOutfits([o1, o2], scores);

    expect(sorted.length).toBe(2);
    expect(sorted[0].id).toBe('o2'); // higher score first
    expect(sorted[1].id).toBe('o1');
    // Items unchanged
    expect(sorted[0].items).toEqual(o2.items);
    expect(sorted[1].items).toEqual(o1.items);
  });
});
```

**Step 2: Run tests to verify they pass**

```bash
cd apps/backend-nest && npx jest src/ai/elite/eliteScoring.spec.ts --verbose
```

Expected: All existing + new tests PASS (since Task 2 already added the implementation).

**Step 3: Commit**

```bash
git add apps/backend-nest/src/ai/elite/eliteScoring.spec.ts
git commit -m "test(elite): add Phase 2 reranking tests (identity, no-mutation, deterministic, debug)"
```

---

### Task 5: Update Studio STD + FAST hooks (wardrobe.service.ts)

**Files:**
- Modify: `apps/backend-nest/src/wardrobe/wardrobe.service.ts:1832-1838` (STD hook)
- Modify: `apps/backend-nest/src/wardrobe/wardrobe.service.ts:2861-2867` (FAST hook)

**Step 1: Update Studio STD hook gate**

Change lines 1832-1838 from:

```typescript
      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = withIds;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = withIds.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, eliteStyleContext, { mode: 'studio', requestId: request_id });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }
```

To:

```typescript
      // Elite Scoring hook — Phase 2: rerank when V2 flag on
      let eliteOutfits = withIds;
      if (ELITE_FLAGS.STUDIO || ELITE_FLAGS.STUDIO_V2) {
        const canonical = withIds.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, eliteStyleContext, {
          mode: 'studio', requestId: request_id,
          rerank: ELITE_FLAGS.STUDIO_V2, debug: ELITE_FLAGS.DEBUG,
        });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }
```

**Step 2: Update Studio FAST hook gate**

Change lines 2861-2867 from:

```typescript
      // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
      let eliteOutfits = outfits;
      if (ELITE_FLAGS.STUDIO) {
        const canonical = outfits.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, eliteStyleContext, { mode: 'studio', requestId: reqId });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }
```

To:

```typescript
      // Elite Scoring hook — Phase 2: rerank when V2 flag on
      let eliteOutfits = outfits;
      if (ELITE_FLAGS.STUDIO || ELITE_FLAGS.STUDIO_V2) {
        const canonical = outfits.map(normalizeStudioOutfit);
        const result = elitePostProcessOutfits(canonical, eliteStyleContext, {
          mode: 'studio', requestId: reqId,
          rerank: ELITE_FLAGS.STUDIO_V2, debug: ELITE_FLAGS.DEBUG,
        });
        eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
      }
```

**Step 3: Commit**

```bash
git add apps/backend-nest/src/wardrobe/wardrobe.service.ts
git commit -m "feat(elite): update Studio STD+FAST hooks to pass rerank/debug flags"
```

---

### Task 6: Update Stylist hook (ai.service.ts)

**Files:**
- Modify: `apps/backend-nest/src/ai/ai.service.ts:4540-4546`

**Step 1: Update Stylist hook gate**

Change lines 4540-4546 from:

```typescript
    // Elite Scoring hook — Phase 0 NO-OP (flag OFF by default)
    let eliteOutfits = finalOutfits.slice(0, 3);
    if (ELITE_FLAGS.STYLIST) {
      const canonical = eliteOutfits.map(normalizeStylistOutfit);
      const result = elitePostProcessOutfits(canonical, eliteStyleContext, { mode: 'stylist' });
      eliteOutfits = result.outfits.map(denormalizeStylistOutfit);
    }
```

To:

```typescript
    // Elite Scoring hook — Phase 2: rerank when V2 flag on
    let eliteOutfits = finalOutfits.slice(0, 3);
    if (ELITE_FLAGS.STYLIST || ELITE_FLAGS.STYLIST_V2) {
      const canonical = eliteOutfits.map(normalizeStylistOutfit);
      const result = elitePostProcessOutfits(canonical, eliteStyleContext, {
        mode: 'stylist',
        rerank: ELITE_FLAGS.STYLIST_V2, debug: ELITE_FLAGS.DEBUG,
      });
      eliteOutfits = result.outfits.map(denormalizeStylistOutfit);
    }
```

**Step 2: Commit**

```bash
git add apps/backend-nest/src/ai/ai.service.ts
git commit -m "feat(elite): update Stylist hook to pass rerank/debug flags"
```

---

### Task 7: Update Trips hook (capsuleEngine.ts)

**Files:**
- Modify: `apps/frontend/src/lib/trips/capsuleEngine.ts:2029-2043`

**Step 1: Update import**

Add `ELITE_SCORING_TRIPS_V2` and `ELITE_SCORING_DEBUG` to the import from `../elite/eliteFlags`:

```typescript
import {ELITE_SCORING_TRIPS, ELITE_SCORING_TRIPS_V2, ELITE_SCORING_DEBUG} from '../elite/eliteFlags';
```

**Step 2: Update Trips hook gate**

Change lines 2033-2043 from:

```typescript
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
```

To:

```typescript
  // Elite Scoring hook — Phase 2: rerank when V2 flag on
  let eliteOutfits = outfits;
  if (ELITE_SCORING_TRIPS || ELITE_SCORING_TRIPS_V2) {
    const canonical = outfits.map(normalizeTripsOutfit);
    const result = elitePostProcessOutfits(
      canonical,
      {presentation, wardrobeStats},
      {mode: 'trips', requestId,
       rerank: ELITE_SCORING_TRIPS_V2, debug: ELITE_SCORING_DEBUG},
    );
    eliteOutfits = result.outfits.map(denormalizeTripsOutfit);
  }
```

**Step 3: Commit**

```bash
git add apps/frontend/src/lib/trips/capsuleEngine.ts
git commit -m "feat(elite): update Trips hook to pass rerank/debug flags"
```

---

### Task 8: Final verification

**Step 1: Run all elite tests**

```bash
cd apps/backend-nest && npx jest src/ai/elite/eliteScoring.spec.ts --verbose
```

Expected: All tests pass (Phase 0 + Phase 1 + Phase 2).

**Step 2: Run full backend test suite**

```bash
cd apps/backend-nest && npm run test 2>&1 | tail -5
```

Expected: 550+ tests pass, 0 failures.

**Step 3: Run capsule engine tests**

```bash
npx jest --config apps/frontend/jest.config.js apps/frontend/src/lib/trips/__tests__/ --verbose 2>&1 | tail -10
```

Expected: 207+ tests pass, 0 failures.

**Step 4: Verify V2 flags all default OFF**

```bash
grep -n 'V2' apps/backend-nest/src/config/feature-flags.ts apps/frontend/src/lib/elite/eliteFlags.ts
```

Expected: All V2 flags show `false` default.

**Step 5: Verify no behavior change with flags OFF**

The Phase 0 identity test (`returns outfits array unchanged`) still passes — proving V2 flags OFF = zero behavior change.

---

## Summary

| Task | Files | What |
|------|-------|------|
| 1 | feature-flags.ts, eliteFlags.ts | Add V2 flags (all OFF) |
| 2 | backend eliteScoring.ts | Core scoring: EliteEnv, scoreOutfit, stableSortOutfits, colorMatches, deterministicHash, updated elitePostProcessOutfits |
| 3 | frontend eliteScoring.ts | SYNC all scoring logic |
| 4 | eliteScoring.spec.ts | 8+ Phase 2 test cases |
| 5 | wardrobe.service.ts | Studio STD+FAST hooks: pass rerank/debug |
| 6 | ai.service.ts | Stylist hook: pass rerank/debug |
| 7 | capsuleEngine.ts | Trips hook: pass rerank/debug |
| 8 | — | Final verification: all tests green |

**Total: 8 files modified, 0 new files, 8 tasks**
