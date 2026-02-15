# Elite Scoring Phase 1 — StyleContext Plumbing + Event Writes

**Date:** 2026-02-14
**Status:** Approved
**Phase:** 1 (context plumbing, no ranking changes)
**Depends on:** Phase 0 (complete)

## Objective

Populate `StyleContext` with real user data at each hook point and log `ELITE_SUGGESTION_SERVED` exposure events. Outfits still returned unchanged — no ranking changes.

## Key Design Decisions

1. **Event writes NOT gated by ELITE_FLAGS** — gated only by `LEARNING_FLAGS.EVENTS_ENABLED` + consent + circuit breaker. Baseline exposure data collected even when elite scoring is OFF.
2. **Drop styleScores** — `extracted_features.styles` is not populated by any event producer. Cannot rely on it. Use `fashionState.topBrands/topColors/topCategories` which ARE populated.
3. **Exposure event is neutral** — `signalPolarity=0`, `signalWeight=0`. Never accidentally train preference from suggestion exposure.
4. **Trips exposure NOT captured in Phase 1** — capsules are 100% client-side (AsyncStorage only). No backend call exists to attach an event. Document as future work.
5. **Narrow DI** — provide `LearningEventsService` and `FashionStateService` directly (they only depend on `ConsentCache` + `pool`). Avoid importing full `LearningModule` which pulls `ScheduleModule.forRoot()`.
6. **FashionState fetch is non-blocking** — existing `getStateWithFallback()` has 100ms timeout with `Promise.race()`, returns `null` on timeout/error/cold-start. No caching layer (direct DB query), but query is simple indexed lookup.

## Expanded StyleContext Type

```typescript
type StyleContext = {
  presentation?: 'masculine' | 'feminine' | 'mixed';
  fashionState?: {
    topBrands: string[];      // top 5 positive brand scores
    avoidBrands: string[];    // top 3 negative brand scores
    topColors: string[];      // top 5 positive color scores
    avoidColors: string[];    // top 3 negative color scores
    topCategories: string[];  // top 5 positive category scores
    priceBracket: string | null;
    isColdStart: boolean;
  } | null;
  wardrobeStats?: {           // derived client-side (Trips only)
    dominantColors: string[];
    topCategories: string[];
    topBrands: string[];
    totalItems: number;
  };
  preferredBrands?: string[];  // from style_profiles table
};
```

## ELITE_SUGGESTION_SERVED Event

```typescript
{
  eventType: 'ELITE_SUGGESTION_SERVED',
  entityType: 'outfit',
  entityId: requestId || randomUUID(),
  signalPolarity: 0,           // neutral — exposure only
  signalWeight: 0,             // zero weight — never influences scoring
  sourceFeature: 'elite_scoring',
  extractedFeatures: {
    categories: canonicalSlots, // e.g. ['tops','bottoms','shoes','tops','bottoms','shoes',...]
    item_ids: allItemIds,
  },
  context: {
    occasion: env.mode,         // 'stylist' | 'studio'
    temp_f: weather?.temp,
    schema_version: 1,
    pipeline_version: 1,        // bump when scoring logic changes
  },
}
```

**Gating:** `LEARNING_FLAGS.EVENTS_ENABLED` + consent + circuit breaker. NOT gated by ELITE_FLAGS.

## Per-Surface Behavior

### Stylist (backend)
- Load `FashionStateSummary` via `FashionStateService.getStateWithFallback(userId)`
- Load `preferredBrands` via existing `StyleProfileService.getPreferredBrands(userId)`
- Populate `StyleContext.fashionState` + `StyleContext.preferredBrands`
- Fire `ELITE_SUGGESTION_SERVED` after hook (fire-and-forget)

### Studio STD + FAST (backend)
- Same as Stylist: load fashion state + preferred brands
- Fire `ELITE_SUGGESTION_SERVED` after hook
- Both STD and FAST paths share the same event logic

### Trips (frontend)
- Derive `wardrobeStats` from `TripWardrobeItem[]` already in memory:
  - `dominantColors`: top 5 colors by frequency
  - `topCategories`: top 5 mainCategory values by count
  - `topBrands`: top 5 brands by frequency (filter nulls)
  - `totalItems`: array length
- Pass `{ presentation, wardrobeStats }` as StyleContext
- **No event write** — no backend call exists. Documented as Phase 2+ work.

## Dependency Injection Strategy

Instead of importing the full `LearningModule` (which pulls `ScheduleModule.forRoot()` + `LearningCronService`), provide the needed services directly:

**Option chosen:** Import `LearningModule` as-is. It's already imported by `OutfitModule` and `SavedLookModule` without issues. `ScheduleModule.forRoot()` is idempotent (NestJS deduplicates). No circular deps — verified by existing usage.

If this causes any issue during implementation, fall back to extracting a `LearningCoreModule`.

## Files Changed

| Action | File | What |
|---|---|---|
| MODIFY | `ai/elite/eliteScoring.ts` | Expand `StyleContext`, add `buildEliteExposureEvent()` helper |
| MODIFY | `frontend/lib/elite/eliteScoring.ts` | Expand `StyleContext` (SYNC), add `deriveWardrobeStats()` |
| MODIFY | `learning/dto/learning-event.dto.ts` | Add `ELITE_SUGGESTION_SERVED` to event type union + signal defaults |
| MODIFY | `ai/ai.module.ts` | Import `LearningModule` |
| MODIFY | `ai/ai.service.ts` | Inject services, populate StyleContext, fire event |
| MODIFY | `wardrobe/wardrobe.module.ts` | Import `LearningModule` |
| MODIFY | `wardrobe/wardrobe.service.ts` | Inject services, populate StyleContext, fire event (STD + FAST) |
| MODIFY | `frontend/lib/trips/capsuleEngine.ts` | Compute wardrobeStats, pass enriched StyleContext |
| MODIFY | `ai/elite/eliteScoring.spec.ts` | Add tests for expanded StyleContext, event builder, wardrobeStats |

**Total: 9 files modified, 0 new files**

## Behavior Change Assessment

| Scenario | Behavior |
|---|---|
| All flags OFF | Zero change — StyleContext populated but unused, no events |
| ELITE_FLAG ON + LEARNING_EVENTS OFF | StyleContext flows through NO-OP, no events written |
| ELITE_FLAG OFF + LEARNING_EVENTS ON | Exposure events still fire (desired for baseline data) |
| ELITE_FLAG ON + LEARNING_EVENTS ON + consent | Full pipeline: context loaded, outfits unchanged, event logged |
| FashionState slow (>100ms) | Returns null, StyleContext.fashionState = null, no latency impact |
| User no consent | Event write silently skipped (existing ConsentCache behavior) |

## Trips Exposure Gap (Documented)

Trip capsule builds are 100% client-side with AsyncStorage-only persistence. No backend endpoint exists for trip save/update. Exposure logging for Trips requires either:
- A) Moving capsule builds server-side (future)
- B) Adding a lightweight `POST /api/trips/exposure` endpoint (future)
- C) Logging from frontend via a thin analytics endpoint (future)

**Phase 1 decision: not captured. Revisit in Phase 2.**

## Tests

1. `buildEliteExposureEvent()` produces correct shape with `signalPolarity=0`, `signalWeight=0`
2. `deriveWardrobeStats()` computes correct top-5 from sample wardrobe
3. Expanded `StyleContext` accepted by `elitePostProcessOutfits()`
4. Event type union includes `ELITE_SUGGESTION_SERVED`
5. Round-trip adapter tests still pass with enriched context
