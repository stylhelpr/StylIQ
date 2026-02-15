# Elite Scoring Phase 0 — NO-OP Integration Design

**Date:** 2026-02-14
**Status:** Approved
**Phase:** 0 (zero behavior change)

## Objective

Add a shared `elitePostProcessOutfits()` post-processor that can be called by 3 independent surfaces (AI Stylist, Outfit Studio, Trips Capsule). Phase 0 is a NO-OP: the function returns outfits unchanged, wired behind feature flags that default OFF.

## Architecture

### Dual Stubs (Backend + Frontend)

- **Backend stub:** `apps/backend-nest/src/ai/elite/eliteScoring.ts` — used by Stylist + Studio
- **Frontend stub:** `apps/frontend/src/lib/elite/eliteScoring.ts` — used by Trips (capsuleEngine.ts runs client-side)
- **Frontend flags:** `apps/frontend/src/lib/elite/eliteFlags.ts`
- Types are duplicated (~30 lines each) with `// SYNC` comments linking them

No `packages/` workspace, no build changes, no cross-boundary imports.

### Canonical Slot Taxonomy

All surfaces normalize to 8 lowercase slots before calling `elitePostProcessOutfits`:

| Canonical Slot | Stylist uses | Studio uses | Trips uses |
|---|---|---|---|
| `tops` | `'top'` | `'tops'` | `'Tops'` |
| `bottoms` | `'bottom'` | `'bottoms'` | `'Bottoms'` |
| `shoes` | `'shoes'` | `'shoes'` | `'Shoes'` |
| `outerwear` | `'outerwear'` | `'outerwear'` | `'Outerwear'` |
| `dresses` | `'dress'` | `'dresses'` | `'Dresses'` |
| `accessories` | `'accessory'` | `'accessories'` | `'Accessories'` |
| `activewear` | `'activewear'` | `'activewear'` | `'Activewear'` |
| `swimwear` | `'swimwear'` | `'swimwear'` | `'Swimwear'` |

Each hook uses tiny pure adapter functions: `normalizeOutfitToCanonical()` / `denormalizeOutfitFromCanonical()`.

## Hook Points (Verified)

| Surface | File | Line | Function | Context |
|---|---|---|---|---|
| Stylist | `ai/ai.service.ts` | 4484 | `suggestVisualOutfits()` | After `finalOutfits` assembly + variety cache, before `return { weatherSummary, outfits }` |
| Studio STD | `wardrobe/wardrobe.service.ts` | 1781 | `generateOutfits()` | After `withIds` assembly + pref scoring, before `return { request_id, ... outfits: withIds }` |
| Studio FAST | `wardrobe/wardrobe.service.ts` | 2787 | `generateOutfitsFast()` | After `logOutput`, before `return { request_id, ... outfits }` |
| Trips | `lib/trips/capsuleEngine.ts` | 2023 | `buildCapsule()` | After `logOutput` + fingerprint, before `return { build_id, outfits, ... }` |

## Shared Types

```typescript
type CanonicalSlot = 'tops' | 'bottoms' | 'shoes' | 'outerwear' | 'dresses' | 'accessories' | 'activewear' | 'swimwear';

type CanonicalItem = {
  id: string;
  slot: CanonicalSlot;
  [key: string]: unknown;  // pass-through for surface-specific fields
};

type CanonicalOutfit = {
  id: string;
  items: CanonicalItem[];
  [key: string]: unknown;  // pass-through
};

type StyleContext = {
  presentation?: 'masculine' | 'feminine' | 'mixed';
  // Future: style profile, feedback, learned prefs
};

type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
};

type EliteResult<T> = {
  outfits: T[];
  debug: Record<string, unknown>;
};
```

## Feature Flags

**Backend** — extend existing `config/feature-flags.ts`:
```typescript
export const ELITE_FLAGS = {
  STYLIST: getFlag('ELITE_SCORING_STYLIST', false),
  STUDIO:  getFlag('ELITE_SCORING_STUDIO', false),
  DEBUG:   getFlag('ELITE_SCORING_DEBUG', false),
};
```

**Frontend** — new `apps/frontend/src/lib/elite/eliteFlags.ts`:
```typescript
export const ELITE_SCORING_TRIPS = false;
export const ELITE_SCORING_DEBUG = false;
```

## NO-OP Implementation

```typescript
function elitePostProcessOutfits<T>(
  outfits: T[],
  ctx: StyleContext,
  env: EliteEnv,
): EliteResult<T> {
  // Phase 0: pass-through, no scoring
  return { outfits, debug: {} };
}
```

## Wiring Pattern (all 4 hooks identical)

```typescript
// At each hook point:
if (ELITE_FLAGS.STUDIO) {
  const canonical = outfits.map(normalizeOutfitToCanonical);
  const result = elitePostProcessOutfits(canonical, ctx, env);
  outfits = result.outfits.map(denormalizeOutfitFromCanonical);
}
return { ... outfits ... };
```

## Files Changed

| Action | File | What |
|---|---|---|
| CREATE | `apps/backend-nest/src/ai/elite/eliteScoring.ts` | Types + NO-OP + adapters (backend) |
| CREATE | `apps/frontend/src/lib/elite/eliteScoring.ts` | Types + NO-OP + adapters (frontend) |
| CREATE | `apps/frontend/src/lib/elite/eliteFlags.ts` | Frontend feature flags |
| MODIFY | `apps/backend-nest/src/config/feature-flags.ts` | Add `ELITE_FLAGS` |
| MODIFY | `apps/backend-nest/src/ai/ai.service.ts` | Wire stylist hook (~4 lines) |
| MODIFY | `apps/backend-nest/src/wardrobe/wardrobe.service.ts` | Wire studio STD + FAST hooks (~8 lines) |
| MODIFY | `apps/frontend/src/lib/trips/capsuleEngine.ts` | Wire trips hook (~4 lines) |
| CREATE | `apps/backend-nest/src/ai/elite/eliteScoring.spec.ts` | NO-OP invariance tests |

## Tests

Backend `eliteScoring.spec.ts`:
1. Flag OFF: output exactly equals input (function not called)
2. Flag ON + NO-OP: output equals input (function called, returns unchanged)
3. Adapters: `normalize` then `denormalize` round-trips to original

## Zero Behavior Change Proof

1. All flags default `false`
2. `elitePostProcessOutfits()` returns `{ outfits, debug: {} }` unchanged
3. Each hook: `if (!flag) skip entirely` — original code path untouched
4. Backend build + tests pass
5. Frontend capsule tests pass

## Style Profile & Learning Entrypoints (Reference)

For future phases — no changes in Phase 0:

| Data | Service | Method | Table |
|---|---|---|---|
| Style profile | `style-profile.service.ts` | `getProfile(userId)` | `style_profiles` |
| Fashion state | `fashion-state.service.ts` | `getStateWithFallback(userId)` | `user_fashion_state` |
| Outfit feedback | `wardrobe.service.ts` | `fetchFeedbackRows(userId)` | `outfit_feedback` |
| Per-item prefs | `wardrobe.service.ts` | query | `user_pref_item` |
| Look history | `look-memory.service.ts` | `getLookMemory(userId)` | `look_memories` |
| Outfit history | `outfit.service.ts` | `getSuggestions(userId)` | `outfit_suggestions` |

## Risks

1. **Type drift** between FE/BE stubs — mitigated by `// SYNC` comments and small surface
2. **Line number shifts** if other PRs land first — verify before merge
3. **Import cost on frontend** — trivial for NO-OP; zero runtime cost when flag OFF
