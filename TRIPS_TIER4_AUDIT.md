# StylIQ Trips / Capsule Packing Engine — Tier 4 Forensic Audit

**Date:** 2026-02-20
**Branch:** `2-20-26-trips-feature-update-mg1`
**Auditor:** Claude Opus 4.6

---

## 1. Executive Assessment

### Current Tier: **Tier 2** (Functional with Structural Gaps)

**Why not Tier 3:** The Trips capsule engine is a well-engineered, frontend-heavy system with solid activity gating, real weather integration, and deterministic seeded randomness for shuffling. However, it **bypasses 6 of 8 applicable shared Tier-4 modules**, has **5 determinism failures**, **no capsule-global coherence enforcement**, **no avoid_materials/avoid_patterns enforcement**, **no brand authority logic**, **no learning event emissions**, and **dead-code fashionState parameter**.

**Why not Tier 1:** The engine does have: real weather API integration, hard gates for open-toe footwear in cold, hard gates for casual items in formal activities, formality tier floors, seeded RNG for shuffle, item reuse cooldown penalties, and a partially-wired frontend eliteScoring reranker.

**Evidence summary:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| A) Tier level | **Tier 2** | Bypasses shared brain; soft-only fabric gating; no capsule coherence |
| B) Shared brain bypass | **YES — 6 of 8 bypassed** | Only frontend eliteScoring used; no tasteValidator, styleVeto, composition, styleJudge |
| C) Weather integration | **Partial** | Real API + hard footwear gate; fabric gating is soft penalty only |
| D) Formality mapping | **Strong upward** | Hard gates block casual→formal; no ceiling blocks formal→casual daily |
| E) Silhouette coherence | **Absent** | No body-type rules; per-outfit fit bonus only; no capsule direction |
| F) Color harmony | **Per-outfit only** | No capsule-global color family tracking; no drift detection |
| G) Avoid-lists | **Partial** | avoid_colors pre-filter exists; avoid_materials/patterns/coverage_no_go MISSING |
| H) Overpacking logic | **Naive** | Total cap only (4×days, max 30); subcategory dedup weak (-0.2 bonus) |
| I) Brand authority | **Absent** | No brand tier field; +0.6 preference bonus only |
| J) Learning feedback | **Not wired** | Zero event emissions; fashionState param is dead code |

---

## 2. System Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                    │
│  destination, dates, activities, closet location, style profile      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: DATA ASSEMBLY                                               │
│  CreateTripScreen.tsx                                                 │
│  ├─ useGeocodeSearch() → POST /trips/resolve-location                │
│  ├─ fetchRealWeather() → GET /weather (30-min cache)                 │
│  ├─ filterWardrobeByLocation() → wardrobeLocationFilter.ts:6         │
│  ├─ filterEligibleItems() → styleEligibility.ts:91 (presentation)    │
│  └─ useStyleProfile() → styleHints assembly                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: CAPSULE ENGINE (capsuleEngine.ts:3425 — buildCapsule)       │
│                                                                      │
│  ┌── CONSTRAINT LAYER (HARD GATES) ──────────────────────────────┐   │
│  │ isItemValidForActivity()          :684   ← formality floor    │   │
│  │ ├─ Rule 0: Cross-presentation     :700   ← HARD              │   │
│  │ ├─ Rule 1: Minimal coverage cold  :700   ← HARD              │   │
│  │ ├─ Rule 1b: Open-toe cold         :702   ← HARD              │   │
│  │ ├─ Rule 2: Beach items in formal  :704   ← HARD              │   │
│  │ ├─ Rule 3: Casual-only in formal  :706   ← HARD              │   │
│  │ ├─ Rule 4: Formality tier floor   :708   ← HARD              │   │
│  │ └─ Rule 5: Purpose compatibility  :712   ← HARD              │   │
│  │ gatePool()                        :718   ← per-activity       │   │
│  │ applyTasteGate()                  :1443  ← avoid_colors only  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── SCORING LAYER (SOFT SIGNALS) ───────────────────────────────┐   │
│  │ tripThermalMultiplier()           :504   ← fabric weight      │   │
│  │ tripPurposeMultiplier()           :458   ← activity match     │   │
│  │ activityPurposeBonus()            :642   ← formality bonus    │   │
│  │ aestheticBonus()                  :1602  ← per-outfit color   │   │
│  │ identityScore()                   :3015  ← brand/color/fabric │   │
│  │ tieredPick()                      :1498  ← PRIMARY/SECONDARY  │   │
│  │ weightedPick()                    :1378  ← cooldown + scoring │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── ASSEMBLY ───────────────────────────────────────────────────┐   │
│  │ Shoe selection + outerwear + buckets → outfit distribution    │   │
│  │ enforceItemCap()                  :3360  ← max items          │   │
│  │ validateOutfitComposition()       :1946  ← per-outfit rules   │   │
│  │ Reserve backup selection          :3595  ← 2 max diversified  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── PHASE 2: ELITE RERANK (CONDITIONAL) ────────────────────────┐   │
│  │ IF ELITE_SCORING_TRIPS flag:                                  │   │
│  │   normalizeTripsOutfit()          :eliteScoring.ts:521        │   │
│  │   elitePostProcessOutfits()       :eliteScoring.ts:658        │   │
│  │   denormalizeTripsOutfit()        :eliteScoring.ts:540        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ❌ NOT CALLED: tasteValidator, styleVeto, composition, styleJudge   │
│  ❌ NOT CALLED: stylistQualityGate (Stylist-only, N/A)               │
│  ❌ NOT CALLED: learning-events.service (zero emissions)             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OUTPUT: TripCapsule                                                 │
│  { outfits[], packingList[], warnings[], version, fingerprint }      │
│  validateCapsule()                   :4249                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Role | Lines |
|------|------|-------|
| `apps/frontend/src/lib/trips/capsuleEngine.ts` | Core engine | ~4,337 |
| `apps/frontend/src/lib/trips/styleEligibility.ts` | Gender/presentation filter | ~110 |
| `apps/frontend/src/lib/trips/weather/realWeather.ts` | Weather API + caching | ~350 |
| `apps/frontend/src/lib/elite/eliteScoring.ts` | Frontend elite reranker | ~700 |
| `apps/frontend/src/screens/Trips/TripCapsuleScreen.tsx` | Display + rebuild orchestration | ~200 |
| `apps/frontend/src/screens/Trips/CreateTripScreen.tsx` | Creation wizard | ~200 |
| `apps/frontend/src/lib/trips/tripsStorage.ts` | AsyncStorage CRUD | ~130 |
| `apps/frontend/src/lib/trips/wardrobeLocationFilter.ts` | Location-based wardrobe filter | ~23 |

### Shared Tier-4 Modules (LOCKED)

| Module | Location | Trips Integration |
|--------|----------|-------------------|
| `styleJudge.ts` | `backend/src/ai/styleJudge.ts` | **NOT CALLED** |
| `eliteScoring.ts` (backend) | `backend/src/ai/elite/eliteScoring.ts` | **NOT CALLED** (frontend stub used instead) |
| `eliteScoring.ts` (frontend) | `frontend/src/lib/elite/eliteScoring.ts` | **CALLED** (simplified, fewer signals) |
| `tasteValidator.ts` | `backend/src/ai/elite/tasteValidator.ts` | **NOT CALLED** |
| `styleVeto.ts` | `backend/src/ai/styleVeto.ts` | **NOT CALLED** |
| `stylistQualityGate.ts` | `backend/src/ai/stylistQualityGate.ts` | N/A (Stylist-only) |
| `composition.ts` | `backend/src/ai/composition.ts` | **NOT CALLED** |
| `discover-veto.ts` | `backend/src/services/discover-veto.ts` | N/A (Recommended Buys only) |
| `discover-curator.ts` | `backend/src/services/discover-curator.ts` | N/A (Recommended Buys only) |
| `learning-events.service.ts` | `backend/src/learning/learning-events.service.ts` | **NOT CALLED** (zero emissions) |

---

## 3. Gap List

### Critical (Blocks Tier 4)

| ID | Gap | Maps To | Evidence |
|----|-----|---------|----------|
| **C1** | **Shared brain bypass**: tasteValidator, styleVeto, composition, styleJudge not called | B, J | capsuleEngine.ts has zero imports from shared modules; reimplements parallel formality/gating logic |
| **C2** | **Fabric-climate gating is SOFT only**: Linen in freezing, wool in hot are scored lower (-0.4) but NOT structurally prevented | C | capsuleEngine.ts:666-667 — `bonus -= 0.4` is a scoring penalty, not `return false` |
| **C3** | **avoid_materials NOT implemented**: No material avoidance logic anywhere in Trips | G | Zero occurrences of `avoid_materials` in capsuleEngine.ts |
| **C4** | **avoid_patterns NOT implemented**: No pattern avoidance logic | G | Zero occurrences of `avoid_patterns` in capsuleEngine.ts |
| **C5** | **coverage_no_go NOT implemented**: No coverage rule enforcement | G | Zero occurrences of `coverage_no_go` in capsuleEngine.ts |
| **C6** | **Learning events NOT emitted**: Zero calls to learning-events.service.ts from any Trips path | J | No `logEvent`, no `/learning/` POST calls in TripCapsuleScreen.tsx or capsuleEngine.ts |
| **C7** | **fashionState parameter is dead code**: Accepted by buildCapsule() but never referenced in function body | J | capsuleEngine.ts:3425 — parameter exists; body never reads it |
| **C8** | **No capsule-global color coherence**: Color harmony measured per-outfit only; no inter-outfit drift control | F | aestheticBonus() at :1602 takes `existingItems` (outfit), never capsule-wide items |

### High

| ID | Gap | Maps To | Evidence |
|----|-----|---------|----------|
| **H1** | **Math.random() in buildId/requestId**: Non-deterministic output identity | Determinism | capsuleEngine.ts:3422, :3449 — `Math.random().toString(36)` |
| **H2** | **Neutral color sort missing tiebreaker**: Unstable when equal frequency | Determinism | capsuleEngine.ts:2280 — `sort((a,b) => b[1]-a[1])` without secondary comparator |
| **H3** | **Map iteration non-determinism in weather**: condCounts max-tie resolution depends on insertion order | Determinism | realWeather.ts:186 — `for (const [cond, count] of condCounts)` |
| **H4** | **No body-type structural logic**: Rectangle, pear, hourglass balancing absent | E | Zero references to body type, rectangle, proportions in capsuleEngine.ts |
| **H5** | **Silhouette direction not enforced**: silhouetteBias only affects shoes (+0.4), not tops/bottoms | E | capsuleEngine.ts:3025-3027 — shoe-only application |
| **H6** | **No formality ceiling**: Tuxedo can appear in casual daily context | D | PURPOSE_COMPATIBILITY 'daily' includes 'formal'; no ceiling check |
| **H7** | **Redundancy detection is subcategory-only**: 4 blue Oxford shirts could pass | H | capsuleEngine.ts:1674 — only checks `subcategory` match, not color+subcategory |
| **H8** | **No brand authority / luxury tier**: No brand-tier metadata; +0.6 preference bonus only | I | TripWardrobeItem has `brand: string` but no tier/authority field |
| **H9** | **avoid_colors has no family expansion**: "red" won't catch "maroon" or "crimson" | G | colorMatches() uses substring only — capsuleEngine.ts:1443 via eliteScoring.ts:96 |

### Medium

| ID | Gap | Maps To | Evidence |
|----|-----|---------|----------|
| **M1** | **Activity frequency sort unstable**: Tie at line 3931 unresolved | Determinism | capsuleEngine.ts:3931 — `.sort((a,b) => b[1]-a[1])[0]` |
| **M2** | **Bucket sort potentially unstable**: bucketSortScore ties at line 3536 | Determinism | capsuleEngine.ts:3536 — sort by score only |
| **M3** | **Heavy boots NOT blocked in hot weather**: Soft penalty only | C | No hard gate for heavy footwear in hot; only -0.25 override |
| **M4** | **No layering requirement for freezing**: Advisory layer names, not structural stacking | C | No base+mid+outer enforcement; outerwear optional if bucket empty |
| **M5** | **Elite reranker conditional on flag**: ELITE_SCORING_TRIPS flag must be enabled | B | capsuleEngine.ts:4178 — `if (ELITE_SCORING_TRIPS || ELITE_SCORING_TRIPS_V2)` |
| **M6** | **avoidBrands hardcoded empty**: getFashionStateSummary ignores API data | J | TripCapsuleScreen.tsx:55 — `avoidBrands: []` always |

---

## 4. Minimal Upgrade Plan

### Architecture: Trips-Scoped Adapter Pattern

Since the shared brain modules live on the **backend** and Trips runs **frontend-only**, the upgrade requires either:
- **Option A (Recommended):** Port key validation logic to a Trips-scoped frontend adapter that mirrors the shared modules' behavioral contracts
- **Option B:** Move capsule generation to a backend endpoint that calls shared modules directly

**Option A is minimal-diff.** Option B is a larger architectural change. This plan follows Option A.

---

### Phase 1: Determinism Fixes (5 changes)

#### Fix 1.1: Replace Math.random() in buildId/requestId
**File:** `capsuleEngine.ts`
**Lines:** 3422, 3449
**Diff:**
```typescript
// BEFORE (line 3422):
return `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// AFTER:
return `build_${hashString(fingerprint).toString(36)}`;

// BEFORE (line 3449):
const requestId = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// AFTER:
const requestId = `trip_${hashString(fingerprint + activities.join(',')).toString(36)}`;
```
**Why:** Eliminates 2 Critical non-determinism sources. hashString() already exists in the file.

#### Fix 1.2: Add tiebreaker to neutral color sort
**File:** `capsuleEngine.ts`
**Line:** 2280
**Diff:**
```typescript
// BEFORE:
.sort((a, b) => b[1] - a[1])
// AFTER:
.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
```
**Why:** Prevents unstable palette anchor selection.

#### Fix 1.3: Fix Map iteration in weather condition resolution
**File:** `realWeather.ts`
**Line:** ~186
**Diff:**
```typescript
// BEFORE:
for (const [cond, count] of condCounts) {
  if (count > maxCount) { maxCount = count; commonCondition = cond; }
}
// AFTER:
const sorted = [...condCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
if (sorted.length > 0) commonCondition = sorted[0][0];
```
**Why:** Deterministic condition selection when counts tie.

#### Fix 1.4: Add tiebreaker to activity frequency sort
**File:** `capsuleEngine.ts`
**Line:** 3931
**Diff:**
```typescript
// BEFORE:
.sort((a, b) => b[1] - a[1])[0]
// AFTER:
.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
```

#### Fix 1.5: Add tiebreaker to bucketSortScore
**File:** `capsuleEngine.ts`
**Line:** ~3536
**Diff:**
```typescript
// BEFORE:
.sort((a, b) => bucketSortScore(b) - bucketSortScore(a))
// AFTER:
.sort((a, b) => bucketSortScore(b) - bucketSortScore(a) || a.id.localeCompare(b.id))
```

---

### Phase 2: Hard Climate Gates (2 changes)

#### Fix 2.1: Hard-gate lightweight fabrics in cold/freezing
**File:** `capsuleEngine.ts`
**Where:** Inside `isItemValidForActivity()` (after line 702)
**Diff:**
```typescript
// ADD after Rule 1b (line 702):
// Rule 1c: Block lightweight-only fabrics in cold/freezing (non-layering items)
if (isColdOrFreezing && isLightweightFabricOnly(item) && !isLayeringBase(item)) return false;
```
Plus helper function (pure, ~10 lines):
```typescript
function isLightweightFabricOnly(item: TripWardrobeItem): boolean {
  if (!item.material) return false;
  const mat = item.material.toLowerCase();
  return /\b(linen|chiffon|mesh|gauze|voile|seersucker)\b/.test(mat)
    && !/\b(wool|fleece|cashmere|down|quilted|flannel)\b/.test(mat);
}
function isLayeringBase(item: TripWardrobeItem): boolean {
  return item.layering === 'base' || item.layering === 'mid';
}
```
**Why:** Prevents "linen dress in freezing NYC" structurally. Layering bases are exempted (a silk base layer is fine under wool).

#### Fix 2.2: Hard-gate heavy insulating fabrics in hot
**File:** `capsuleEngine.ts`
**Where:** Inside `isItemValidForActivity()` (after Rule 1c)
**Diff:**
```typescript
// Rule 1d: Block heavy insulating fabrics in hot weather
const isHot = climateZone === 'hot';
if (isHot && isHeavyInsulatingOnly(item)) return false;
```
Plus helper (~5 lines):
```typescript
function isHeavyInsulatingOnly(item: TripWardrobeItem): boolean {
  if (!item.material) return false;
  const mat = item.material.toLowerCase();
  return /\b(wool|fleece|sherpa|shearling|down|quilted|neoprene)\b/.test(mat)
    && !/\b(lightweight|tropical|summer)\b/.test(mat);
}
```
**Why:** Prevents "wool overcoat in Miami summer" structurally.

---

### Phase 3: Avoid-List Enforcement (1 new file + 2 changes)

#### Fix 3.1: Create Trips-scoped taste gate adapter
**New file:** `apps/frontend/src/lib/trips/tripsTasteGate.ts` (~80 lines)

This adapter mirrors the behavioral contracts of `tasteValidator.ts` and `styleVeto.ts` without importing backend modules:

```typescript
// tripsTasteGate.ts — Trips-scoped adapter for shared brain avoid-list contracts
// Mirrors: tasteValidator.ts avoid_colors (P0), avoid_materials (P0),
//          avoid_patterns (P0), coverage_no_go (P0)

export interface TripsTasteProfile {
  avoid_colors: string[];
  avoid_materials: string[];
  avoid_patterns: string[];
  coverage_no_go: string[];
}

// Color family expansion (mirrors stylistQualityGate.expandStylistAvoidColors)
const COLOR_FAMILIES: Record<string, string[]> = {
  red: ['red', 'crimson', 'scarlet', 'burgundy', 'maroon', 'wine', 'brick', 'rust', 'cherry'],
  blue: ['blue', 'navy', 'cobalt', 'indigo', 'sapphire', 'teal', 'cerulean', 'azure'],
  green: ['green', 'olive', 'sage', 'forest', 'emerald', 'moss', 'hunter', 'lime'],
  pink: ['pink', 'blush', 'rose', 'fuchsia', 'magenta', 'mauve', 'coral', 'salmon'],
  purple: ['purple', 'plum', 'violet', 'lavender', 'lilac', 'eggplant', 'amethyst'],
  orange: ['orange', 'tangerine', 'peach', 'apricot', 'amber', 'copper'],
  yellow: ['yellow', 'gold', 'mustard', 'lemon', 'saffron', 'honey'],
  brown: ['brown', 'tan', 'chocolate', 'camel', 'khaki', 'sienna', 'taupe', 'espresso'],
  white: ['white', 'ivory', 'cream', 'off-white', 'snow', 'pearl', 'alabaster'],
  black: ['black', 'charcoal', 'jet', 'onyx', 'ebony'],
  grey: ['grey', 'gray', 'silver', 'slate', 'ash', 'pewter', 'stone'],
  beige: ['beige', 'nude', 'oatmeal', 'sand', 'champagne'],
};

export function expandAvoidColors(avoidColors: string[]): string[] {
  const expanded = new Set<string>();
  for (const c of avoidColors) {
    const cl = c.toLowerCase().trim();
    expanded.add(cl);
    for (const [family, members] of Object.entries(COLOR_FAMILIES)) {
      if (members.includes(cl) || cl === family) {
        members.forEach(m => expanded.add(m));
      }
    }
  }
  return [...expanded];
}

// Coverage keyword map (mirrors tasteValidator.ts COVERAGE_MAP)
const COVERAGE_MAP: Record<string, string[]> = {
  'no midriff exposure': ['crop', 'cropped', 'crop top', 'midriff'],
  'no leg exposure': ['shorts', 'mini', 'micro', 'short shorts'],
  'no shoulder exposure': ['strapless', 'off-shoulder', 'off shoulder', 'one shoulder', 'spaghetti'],
  'no cleavage': ['low cut', 'plunge', 'deep v', 'deep-v'],
  'no back exposure': ['backless', 'open back', 'open-back'],
  'no sheer': ['sheer', 'see-through', 'see through', 'mesh', 'transparent'],
};

export function tripsTasteGate(
  item: { name?: string; color?: string; material?: string; subcategory?: string },
  profile: TripsTasteProfile,
): { blocked: boolean; reason?: string } {
  const text = `${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
  const mat = (item.material ?? '').toLowerCase();
  const colors = (item.color ?? '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);

  // P0: Avoid colors (expanded)
  const expandedColors = expandAvoidColors(profile.avoid_colors);
  for (const ic of colors) {
    if (expandedColors.some(ac => ic === ac || ic.includes(ac) || ac.includes(ic))) {
      return { blocked: true, reason: `VETO_COLOR: ${ic}` };
    }
  }

  // P0: Avoid materials
  for (const am of profile.avoid_materials) {
    if (mat.includes(am.toLowerCase())) {
      return { blocked: true, reason: `VETO_MATERIAL: ${am}` };
    }
  }

  // P0: Avoid patterns
  for (const ap of profile.avoid_patterns) {
    if (text.includes(ap.toLowerCase()) || mat.includes(ap.toLowerCase())) {
      return { blocked: true, reason: `VETO_PATTERN: ${ap}` };
    }
  }

  // P0: Coverage no-go
  for (const rule of profile.coverage_no_go) {
    const keywords = COVERAGE_MAP[rule.toLowerCase()] ?? [rule.toLowerCase()];
    if (keywords.some(kw => text.includes(kw))) {
      return { blocked: true, reason: `VETO_COVERAGE: ${rule}` };
    }
  }

  return { blocked: false };
}
```

#### Fix 3.2: Wire tripsTasteGate into gatePool()
**File:** `capsuleEngine.ts`
**Where:** Inside `gatePool()` (line ~725), before scoring
**Diff:**
```typescript
// ADD import at top:
import { tripsTasteGate, TripsTasteProfile } from './tripsTasteGate';

// ADD in gatePool(), after isItemValidForActivity check:
if (tasteProfile) {
  const veto = tripsTasteGate(item, tasteProfile);
  if (veto.blocked) { traceCollector?.push(`[TASTE] ${item.id} blocked: ${veto.reason}`); continue; }
}
```

#### Fix 3.3: Pass tasteProfile through buildCapsule
**File:** `capsuleEngine.ts`
**Where:** buildCapsule signature (line 3425) + CreateTripScreen assembly
**Diff:** Add `tasteProfile?: TripsTasteProfile` parameter, populate from styleProfile's avoid_colors, avoid_materials, avoid_patterns, coverage_no_go fields.

---

### Phase 4: Capsule-Global Coherence Layer (1 new file + 1 change)

#### Fix 4.1: Create capsule coherence tracker
**New file:** `apps/frontend/src/lib/trips/capsuleCoherence.ts` (~60 lines)

```typescript
// capsuleCoherence.ts — Capsule-level state tracker for color + silhouette drift

export interface CapsuleCoherenceState {
  colorFamilyCounts: Map<string, number>;  // warm/cool/neutral/earth family usage
  silhouetteDirection: 'structured' | 'relaxed' | 'mixed' | null;
  formalityRange: [min: number, max: number];
  totalOutfits: number;
}

export function createCoherenceState(): CapsuleCoherenceState { ... }

export function updateCoherence(state: CapsuleCoherenceState, outfitItems: Item[]): void { ... }

// Returns penalty [-1, 0] for capsule drift
export function capsuleDriftPenalty(
  candidateItem: Item,
  state: CapsuleCoherenceState,
): number {
  // Penalize: >60% of outfits use one color temp but candidate uses opposite
  // Penalize: silhouette direction established but candidate contradicts
  // Penalize: formality range exceeds 2 tiers (beyond what activities require)
}
```

#### Fix 4.2: Wire coherence into outfit assembly loop
**File:** `capsuleEngine.ts`
**Where:** In the main outfit-building loop (after each outfit is assembled)
**Diff:** Call `updateCoherence()` after each outfit; pass `capsuleDriftPenalty()` into `tieredPick()` scoring.

---

### Phase 5: Redundancy + Brand Authority (2 changes)

#### Fix 5.1: Enhanced redundancy detection
**File:** `capsuleEngine.ts`
**Where:** `aestheticBonus()` (line 1674)
**Diff:**
```typescript
// BEFORE: subcategory-only dedup (-0.2)
// AFTER: subcategory + color combo dedup (-0.5 for color+subcat duplicate)
const existingSignatures = existingItems.map(pi => {
  const full = itemLookup.get(pi.wardrobeItemId);
  return `${(full?.subcategory || '').toLowerCase()}|${(full?.color || '').toLowerCase()}`;
});
const candidateSig = `${sub}|${(candidate.color || '').toLowerCase()}`;
if (existingSignatures.includes(candidateSig)) bonus -= 0.5;  // near-duplicate
else if (subs.includes(sub)) bonus -= 0.2;  // same subcategory, different color
```

#### Fix 5.2: Brand authority scoring boost
**File:** `capsuleEngine.ts`
**Where:** `identityScore()` (after line 3019)
**Diff:**
```typescript
// ADD: Brand authority bonus from elite scoring brand signal
// Uses fashionState.topBrands (previously dead) for authority weighting
if (fashionState?.topBrands?.length && item.brand) {
  const brandLower = item.brand.toLowerCase();
  if (fashionState.topBrands.some(b => brandLower.includes(b.toLowerCase()))) {
    score += 0.8;  // Authority bonus (higher than generic +0.6 preference)
  }
}
```

---

### Phase 6: Learning System Wiring (2 changes)

#### Fix 6.1: Emit capsule-generated learning event
**File:** `TripCapsuleScreen.tsx`
**Where:** After successful buildCapsule() call
**Diff:**
```typescript
// POST to /learning/events with capsule data
try {
  await apiClient.post('/learning/events', {
    eventType: 'TRIP_CAPSULE_GENERATED',
    entityType: 'trip_capsule',
    entityId: capsule.build_id,
    extractedFeatures: {
      item_ids: capsule.packingList.flatMap(g => g.items.map(i => i.wardrobeItemId)),
      categories: [...new Set(capsule.packingList.map(g => g.category))],
      activities: trip.activities,
    },
    sourceFeature: 'trips',
  });
} catch {} // fire-and-forget
```

#### Fix 6.2: Emit item-replaced learning event
**File:** `TripCapsuleScreen.tsx`
**Where:** In `onReplaceItem()` handler
**Diff:**
```typescript
try {
  await apiClient.post('/learning/events', {
    eventType: 'TRIP_ITEM_REPLACED',
    entityType: 'wardrobe_item',
    entityId: newItemId,
    extractedFeatures: { replaced_item_id: oldItemId, category, trip_id: trip.id },
    sourceFeature: 'trips',
  });
} catch {} // fire-and-forget
```

#### Fix 6.3: Activate fashionState parameter
**File:** `capsuleEngine.ts`
**Where:** buildCapsule() body
**Diff:** Wire `fashionState` into `identityScore()` calls (see Fix 5.2) and pass to coherence tracker for brand authority weighting.

---

### Phase 7: Formality Ceiling (1 change)

#### Fix 7.1: Add formality ceiling for casual activities
**File:** `capsuleEngine.ts`
**Where:** Inside `isItemValidForActivity()` (after Rule 5)
**Diff:**
```typescript
// Rule 6: Formality ceiling — prevent tuxedo for brunch
if (activityProfile.formality <= 0 && activityProfile.context !== 'city') {
  const itemTier = getFormalityTier(item);
  if (itemTier >= 3) return false;  // Block black-tie items in casual non-city contexts
}
```
**Why:** Prevents evening gowns/tuxedos in Beach/Active/Casual contexts. City-casual still allows formal items (reasonable for a casual dinner in NYC).

---

### Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `capsuleEngine.ts` | Edit (7 surgical diffs) | 1, 2, 3, 5, 6, 7 |
| `realWeather.ts` | Edit (1 diff) | 1 |
| `tripsTasteGate.ts` | **NEW** (~80 lines) | 3 |
| `capsuleCoherence.ts` | **NEW** (~60 lines) | 4 |
| `TripCapsuleScreen.tsx` | Edit (2 diffs) | 6 |
| `CreateTripScreen.tsx` | Edit (1 diff — pass tasteProfile) | 3 |

**Total new files:** 2
**Total files edited:** 4
**Estimated diff size:** ~250 lines added, ~20 lines modified

---

## 5. Regression Risk Analysis

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Determinism fixes change existing output** | **Certain** — buildId/requestId will differ | Bump `CAPSULE_VERSION` to force rebuild. Output hash will change but become stable. No user-visible regression. |
| **Hard fabric gates exclude items that previously appeared** | **Medium** — users may notice missing items | Gate only targets clearly inappropriate fabrics (linen in freezing). Emergency fallback: if pool empties after gate, log warning and relax to soft penalty. Mirror `applyTasteGate()` fallback pattern. |
| **Taste gate blocks too aggressively** | **Low** — mirrors production tasteValidator contracts | Color family expansion is conservative (12 families). P0 vetoes are user-declared preferences. Fallback: if entire category gated to 0, warn and relax. |
| **Coherence penalty changes outfit selection** | **Medium** — reranking shifts | Penalty is capped at [-1, 0] and multiplied by 0.3 weight. Only nudges, doesn't veto. |
| **Learning event POST fails** | **None** — fire-and-forget with try/catch | Mirrors learning-events.service.ts contract: never blocks, never throws. |
| **Shared module regressions** | **None** — NO shared modules are edited | All changes are Trips-scoped. Shared modules remain LOCKED. |
| **Other feature regressions (Stylist, Buys, Studio, Styla)** | **None** — no shared code touched | All 6 files changed are in Trips-only paths. |

---

## 6. Determinism Proof Checklist

### Current State (BEFORE fixes)

| Check | Result | Evidence |
|-------|--------|----------|
| Math.random() | **FAIL** | capsuleEngine.ts:3422, :3449 |
| Stable sort (all comparators) | **FAIL** | capsuleEngine.ts:2280, :3931, :3536 — missing tiebreakers |
| Map iteration | **FAIL** | realWeather.ts:186 — condCounts tie resolution |
| Set iteration | **PASS** | All Set uses are for membership checks (.has, .size) |
| Object.keys iteration | **PASS** | Fixed enum keys in CategoryBucket |
| Seeded RNG | **PASS** | capsuleEngine.ts:1038 — xorshift32 with hashString seed |
| Time-based decisions | **PASS** (for output) | Date.now() only in IDs (fixed by Phase 1) |
| Promise.all races | **PASS** | No async in capsule engine core |
| Tie-breakers (main sorts) | **PASS** (7 of 10) | 7 sorts have `.localeCompare(b.id)` tiebreak; 3 missing |

### Projected State (AFTER fixes)

| Check | Result | Evidence |
|-------|--------|----------|
| Math.random() | **PASS** | Replaced with hashString-based deterministic IDs |
| Stable sort (all comparators) | **PASS** | All 3 missing tiebreakers added (localeCompare) |
| Map iteration | **PASS** | Sorted to array with lexicographic tiebreak |
| All other checks | **PASS** | Unchanged from current passing state |

### Required Determinism Snapshot Test

```typescript
describe('Capsule Determinism', () => {
  const FIXED_INPUT = { /* wardrobe, weather, activities, styleHints */ };

  it('produces identical output across 50 runs', () => {
    const outputs = Array.from({ length: 50 }, () => {
      const capsule = buildCapsule(FIXED_INPUT);
      // Strip volatile fields (build_id is now deterministic)
      return JSON.stringify(capsule);
    });
    const unique = new Set(outputs);
    expect(unique.size).toBe(1);
  });
});
```

---

## 7. Final Projected Tier Level After Fixes

### Projected: **Tier 4** (with frontend adapter pattern)

| Tier 4 Requirement | After-Fix Status | Certification Evidence |
|---------------------|-----------------|----------------------|
| 1. Determinism | **PASS** | 50-run snapshot test; all sorts stable; no Math.random |
| 2. Real forecast integration | **PASS** | Hard fabric gates + existing footwear gates + outerwear conditional |
| 3. Formality alignment | **PASS** | Hard floor (existing) + hard ceiling (Fix 7.1) + tiered gating |
| 4. Capsule coherence | **PASS** | capsuleCoherence.ts drift penalty + per-outfit aestheticBonus |
| 5. Avoid-list enforcement | **PASS** | tripsTasteGate.ts: colors (expanded), materials, patterns, coverage — all hard P0 gates |
| 6. Body-type structural logic | **PARTIAL** | silhouetteBias exists; body-type proportioning deferred (requires user body-type data not currently collected) |
| 7. Packing control | **PASS** | enforceItemCap (existing) + enhanced redundancy (color+subcat dedup) |
| 8. Redundancy elimination | **PASS** | Functional uniqueness via color+subcategory signature; cooldown penalty |
| 9. Brand authority bias | **PASS** | fashionState.topBrands activated; +0.8 authority bonus |
| 10. Shared brain enforcement | **PASS (adapted)** | tripsTasteGate mirrors tasteValidator P0 contracts; frontend eliteScoring mirrors scoring; capsuleCoherence mirrors composition coherence |

**Caveat on requirement 6 (Body-type):** Full body-type proportioning (rectangle balancing, pear volume) requires body-type data that the app collects via ARKit but doesn't currently pass to Trips. This is a **data pipeline gap**, not a logic gap. The coherence tracker's silhouette direction partially addresses this. Full body-type logic can be added when the data is wired through.

**Caveat on shared brain:** The frontend adapter pattern mirrors behavioral contracts but runs client-side (not the actual backend modules). This is architecturally sound for a frontend-heavy feature but means the Trips validation is a **faithful reimplementation**, not a direct call. The shared modules themselves remain LOCKED and unmodified.

---

## Appendix: Test Plan

### Required Test Files (Trips-scoped only)

**New:** `apps/frontend/src/lib/trips/tripsTasteGate.spec.ts`
**New:** `apps/frontend/src/lib/trips/capsuleCoherence.spec.ts`
**Extend:** `apps/frontend/src/lib/trips/capsuleEngine.spec.ts`

### Test Scenarios

#### 1. Determinism Snapshot Test
- Same inputs × 50 runs → identical JSON output hash

#### 2. Weather Scenario Tests
```
cold_trip_forbids_linen:     climate=freezing, material=linen    → item EXCLUDED
cold_trip_allows_wool:       climate=freezing, material=wool     → item INCLUDED
hot_trip_forbids_wool:       climate=hot, material=wool          → item EXCLUDED
hot_trip_allows_linen:       climate=hot, material=linen         → item INCLUDED
cold_trip_allows_silk_base:  climate=cold, material=silk, layering=base → item INCLUDED
```

#### 3. Formality Scenario Tests
```
formal_forbids_hoodie:       activity=Formal, subcategory=hoodie    → item EXCLUDED
formal_forbids_sneakers:     activity=Formal, subcategory=sneaker   → item EXCLUDED
casual_forbids_tuxedo:       activity=Beach, formalityScore=90      → item EXCLUDED
business_allows_blazer:      activity=Business, formalityScore=70   → item INCLUDED
casual_allows_tshirt:        activity=Casual, subcategory=t-shirt   → item INCLUDED
```

#### 4. Avoid-List Scenario Tests
```
avoid_red_blocks_crimson:    avoid_colors=[red], item.color=crimson     → BLOCKED
avoid_red_blocks_burgundy:   avoid_colors=[red], item.color=burgundy    → BLOCKED
avoid_red_allows_blue:       avoid_colors=[red], item.color=blue        → ALLOWED
avoid_polyester_blocks:      avoid_materials=[polyester], material=poly  → BLOCKED
avoid_animal_print_blocks:   avoid_patterns=[animal], name=leopard top  → BLOCKED
coverage_nogo_blocks_crop:   coverage_no_go=[no midriff], sub=crop top  → BLOCKED
```

#### 5. Capsule Coherence Tests
```
warm_capsule_penalizes_neon:      5 warm-toned outfits, then neon candidate → penalty applied
structured_capsule_penalizes_baggy: 4 structured outfits, then oversized   → penalty applied
mixed_capsule_no_penalty:          varied styles, mixed candidate           → no penalty
```

#### 6. Packing Redundancy Tests
```
no_4_identical_oxfords:      4 blue Oxford shirts available → max 2 selected (color+subcat dedup)
different_color_oxfords_ok:  blue Oxford + white Oxford     → both allowed (different signature)
alternates_cross_compatible: reserve items work across multiple outfits
```

---

*End of audit report.*
