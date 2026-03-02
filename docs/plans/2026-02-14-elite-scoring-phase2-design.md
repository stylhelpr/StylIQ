# Elite Scoring Phase 2 — Rerank + Soft Repair

**Date:** 2026-02-14
**Status:** Proposed
**Phase:** 2 (rerank outfits, debug metadata; no item swaps, no drops)
**Depends on:** Phase 0 (hooks) + Phase 1 (context plumbing + events)

## Objective

Reorder the returned outfit array using a deterministic outfit-level score computed from StyleContext signals. Attach optional debug metadata when DEBUG flag is on. **Outfits themselves are never mutated** — same items, same slots, same count. Only array order changes.

## Non-Negotiable Invariants

1. **Same items** — no item swaps, no drops, no additions
2. **Same count** — no outfit removal
3. **Same composition** — no generator changes, no refactors
4. **Masculine hard-block unchanged** — existing filters stay as-is
5. **Flag-gated** — V2 flags default OFF per surface
6. **Fail-open** — missing context → keep original order

## Flag Structure

### Backend (`config/feature-flags.ts`)
```typescript
export const ELITE_FLAGS = {
  STYLIST: getFlag('ELITE_SCORING_STYLIST', false),        // Phase 0
  STUDIO: getFlag('ELITE_SCORING_STUDIO', false),          // Phase 0
  STUDIO_V2: getFlag('ELITE_SCORING_STUDIO_V2', false),    // Phase 2 rerank
  STYLIST_V2: getFlag('ELITE_SCORING_STYLIST_V2', false),  // Phase 2 rerank
  DEBUG: getFlag('ELITE_SCORING_DEBUG', false),
};
```

### Frontend (`elite/eliteFlags.ts`)
```typescript
export const ELITE_SCORING_TRIPS = false;       // Phase 0
export const ELITE_SCORING_TRIPS_V2 = false;    // Phase 2 rerank
export const ELITE_SCORING_DEBUG = false;
```

### Hook gate logic
```typescript
// If V2 OR Phase0 flag is on → run hook. V2 flag → rerank inside.
if (ELITE_FLAGS.STUDIO || ELITE_FLAGS.STUDIO_V2) {
  const result = elitePostProcessOutfits(canonical, ctx, {
    mode: 'studio', requestId, rerank: ELITE_FLAGS.STUDIO_V2, debug: ELITE_FLAGS.DEBUG,
  });
}
```

## Expanded EliteEnv

```typescript
export type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
  rerank?: boolean;   // Phase 2: enable reranking
  debug?: boolean;    // Phase 2: enable debug output
};
```

## Scoring Function

```typescript
type OutfitScore = {
  score: number;       // unbounded, higher is better
  confidence: number;  // [0..1] — fraction of available signals that fired
  flags: string[];     // which signals contributed
};

function scoreOutfit(
  outfit: CanonicalOutfit,
  ctx: StyleContext,
  env: EliteEnv,
): OutfitScore;
```

### Signal Weights (per item in outfit)

| Signal | Available In | Positive | Negative | Condition |
|--------|-------------|----------|----------|-----------|
| Brand affinity | Studio | +10/item | -15/item | item.brand ∈ topBrands∪preferredBrands / avoidBrands |
| Color affinity | Studio, Trips | +5/item | -8/item | item.color matches topColors/avoidColors (case-insensitive substring) |
| Category affinity | Studio, Trips | +3/item | — | item.slot lowercase matches topCategories lowercase |
| Slot completeness | All | +5/outfit | — | tops+bottoms+shoes OR dress+shoes |

### Color Matching

Case-insensitive substring match: `"Navy Blue".lower().includes("navy")` → match. Handles common variations without a full color taxonomy.

```typescript
function colorMatches(itemColor: string, prefColor: string): boolean {
  const a = itemColor.toLowerCase();
  const b = prefColor.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}
```

### Confidence Calculation

```
confidence = signalsUsed / signalsAvailable
```

Where `signalsAvailable` counts how many signal categories (brand, color, category, slot) had data to compare against, and `signalsUsed` counts how many of those actually produced a non-zero contribution.

If `signalsAvailable === 0`, confidence = 0 and score = 0 (fail-open: original order preserved).

### Per-Surface Signal Availability

| Signal | Studio | Stylist | Trips |
|--------|--------|---------|-------|
| Brand affinity | item.brand + fashionState | — (no brand on items) | — (no brand on items) |
| Color affinity | item.color/color_family + fashionState | — (no color on items) | item.color + wardrobeStats.dominantColors |
| Category affinity | item.slot + fashionState.topCategories | item.slot + (fashionState if available) | item.slot + wardrobeStats.topCategories |
| Slot completeness | Always | Always | Always |

**Stylist**: Only slot completeness fires reliably. Category affinity fires if fashionState is loaded. Brand/color cannot fire (items lack those fields). This is by design — Stylist items are thin.

**Trips**: Uses `wardrobeStats.dominantColors` for color affinity and `wardrobeStats.topCategories` for category affinity (not fashionState, which is backend-only).

## Stable Sort with Deterministic Tie-Breaker

```typescript
function stableSortOutfits<T extends CanonicalOutfit>(
  outfits: T[],
  scores: Map<string, OutfitScore>,
): T[] {
  return [...outfits].sort((a, b) => {
    const sa = scores.get(a.id)?.score ?? 0;
    const sb = scores.get(b.id)?.score ?? 0;
    if (sa !== sb) return sb - sa; // descending
    return deterministicHash(a.id + ':' + a.items.map(i => i.id).sort().join(','))
         - deterministicHash(b.id + ':' + b.items.map(i => i.id).sort().join(','));
  });
}

function deterministicHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}
```

**Key**: `[...outfits]` creates a copy — original array is never mutated.

## Modified elitePostProcessOutfits

```typescript
export function elitePostProcessOutfits<T>(
  outfits: T[],
  ctx: StyleContext,
  env: EliteEnv,
): EliteResult<T> {
  // Phase 0/1 behavior: pass-through when rerank not enabled
  if (!env.rerank || outfits.length <= 1) {
    return { outfits, debug: {} };
  }

  // Cast to canonical (callers always pass normalized outfits)
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

## Per-Surface Hook Changes

### Studio (STD + FAST)
```typescript
// Gate: run hook if V2 OR Phase0 flag
if (ELITE_FLAGS.STUDIO || ELITE_FLAGS.STUDIO_V2) {
  const canonical = withIds.map(normalizeStudioOutfit);
  const result = elitePostProcessOutfits(canonical, eliteStyleContext, {
    mode: 'studio', requestId: request_id,
    rerank: ELITE_FLAGS.STUDIO_V2, debug: ELITE_FLAGS.DEBUG,
  });
  eliteOutfits = result.outfits.map(denormalizeStudioOutfit);
}
```

### Stylist
```typescript
if (ELITE_FLAGS.STYLIST || ELITE_FLAGS.STYLIST_V2) {
  const canonical = eliteOutfits.map(normalizeStylistOutfit);
  const result = elitePostProcessOutfits(canonical, eliteStyleContext, {
    mode: 'stylist', rerank: ELITE_FLAGS.STYLIST_V2, debug: ELITE_FLAGS.DEBUG,
  });
  eliteOutfits = result.outfits.map(denormalizeStylistOutfit);
}
```

### Trips (frontend)
```typescript
if (ELITE_SCORING_TRIPS || ELITE_SCORING_TRIPS_V2) {
  const canonical = outfits.map(normalizeTripsOutfit);
  const result = elitePostProcessOutfits(canonical, {presentation, wardrobeStats}, {
    mode: 'trips', requestId, rerank: ELITE_SCORING_TRIPS_V2, debug: ELITE_SCORING_DEBUG,
  });
  eliteOutfits = result.outfits.map(denormalizeTripsOutfit);
}
```

## Tests Required

1. **Identity test**: flags OFF → output order unchanged (same reference)
2. **No mutation test**: deepEqual items before/after rerank (only order changes)
3. **Deterministic test**: same inputs → same order across multiple runs
4. **Tie-breaker test**: equal scores → deterministic order by hash
5. **Rerank test**: outfit with brand/color hits sorted before outfit without
6. **Fail-open test**: empty StyleContext → original order preserved
7. **Debug output test**: debug=true → scores/flags/originalOrder in debug map
8. **Confidence test**: 0 signals available → confidence=0, no rerank effect

## Files Changed

| Action | File | What |
|---|---|---|
| MODIFY | `config/feature-flags.ts` | Add STUDIO_V2, STYLIST_V2 flags |
| MODIFY | `frontend/lib/elite/eliteFlags.ts` | Add TRIPS_V2 flag |
| MODIFY | `ai/elite/eliteScoring.ts` | Add scoreOutfit, stableSortOutfits, deterministicHash, colorMatches; modify elitePostProcessOutfits; expand EliteEnv |
| MODIFY | `frontend/lib/elite/eliteScoring.ts` | SYNC all scoring logic + EliteEnv expansion |
| MODIFY | `ai/elite/eliteScoring.spec.ts` | Phase 2 tests (8 test cases) |
| MODIFY | `wardrobe/wardrobe.service.ts` | Update Studio STD+FAST hook gates to pass rerank/debug |
| MODIFY | `ai/ai.service.ts` | Update Stylist hook gate to pass rerank/debug |
| MODIFY | `frontend/lib/trips/capsuleEngine.ts` | Update Trips hook gate to pass rerank/debug |

**Total: 8 files modified, 0 new files**

## Behavior Change Assessment

| Scenario | Behavior |
|---|---|
| All V2 flags OFF | Zero change — identical to Phase 1 |
| V2 ON + StyleContext populated | Outfits reordered by score; same items, same count |
| V2 ON + empty StyleContext | Fail-open: original order (score=0 for all, tie-breaker preserves order stability) |
| V2 ON + DEBUG ON | Reranked + debug map with scores/flags/reasons |
| V2 ON + only 1 outfit | No rerank (skip: `outfits.length <= 1`) |
| Cold start user | fashionState=null → brand/color/category signals unavailable → slot completeness only → minimal reranking |

## Investor Demo Safety Statement

Phase 2 reranking **never modifies outfit composition**. The post-processor receives a fully-assembled outfit array and returns it in a potentially different order. Item content (IDs, images, categories, names) is byte-for-byte identical. The `[...outfits]` copy ensures the original array is never mutated. All V2 flags default to OFF — zero behavior change until explicitly enabled.
