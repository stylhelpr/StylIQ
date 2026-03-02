# Recommended Buys Tier 4 Upgrade — Design Document

**Date:** 2026-02-19
**Status:** Approved
**Scope:** Full Tier 4 parity (all 10 gaps)
**Isolation:** Strict — zero shared module changes

## 1. Objective

Upgrade the Recommended Buys engine (`discover.service.ts`) from Tier 2.5 to Tier 4 quality, achieving parity with the AI Stylist Suggestions engine without modifying any shared modules.

## 2. Current Tier Assessment: 2.5

**Existing strengths:**
- Brand authority tiers (5-tier system)
- Brand saturation penalty (deterministic)
- Semantic cluster caps (suit/athleisure/outerwear)
- Style vocabulary expansion (aesthetic + fit descriptors)
- Gap detection via category inference + body-type multiplier
- Color enrichment from thumbnails (sharp-based)
- Learned preference signals (fashion state affinity, bounded +/-6)
- Prestige descriptor elevation signal
- Fit conflict penalty
- Redundancy penalty (brand+category+style dedup)
- Diversity mix + coherence admission (4-phase relaxation)
- Debug logging (VETO, SCORE, COHERENCE tags)

**Critical gaps preventing Tier 4:**
1. No formality coherence
2. No hard-veto layer (coverage_no_go, walkability, formality_floor)
3. No climate awareness
4. No material hierarchy
5. No color harmony
6. No occasion context
7. No silhouette depth (binary fit penalty only)
8. No learning clamping
9. No confidence tracking
10. No determinism proof (no stable sort tie-breaking)

## 3. Architecture: Approach B — Local Module Extraction

```
discover.service.ts (orchestrator - enhanced)
  |-- Stage 1a: Candidate Generation (unchanged)
  |-- Stage 1b: Color Enrichment (unchanged)
  |-- Stage 1c: Hard Veto Filter (ENHANCED)
  |     \-- calls discover-veto.ts
  |-- Stage 2: Scoring (ENHANCED - 6 new curator dimensions)
  |     \-- calls discover-curator.ts
  |-- Stage 3: Diversity Mix (minor: stable sort)
  |-- Stage 4: Coherence Validator (minor: stable sort)
  \-- Debug layer (ENHANCED - confidence + signal tracking)

NEW FILES:
  |-- discover-veto.ts      (pure function, ~150 lines)
  \-- discover-curator.ts   (pure function, ~200 lines)
```

## 4. File 1: discover-veto.ts

**Location:** `apps/backend-nest/src/services/discover-veto.ts`
**Purpose:** Binary validity gate. Products violating P0 constraints are eliminated before scoring.
**Contract:** Pure function, no state, no async, no DB, no LLM.

### Veto Rules (priority order)

| # | Rule Tag | Logic | Precedent |
|---|----------|-------|-----------|
| 1 | VETO_COLOR | Existing avoid_colors word-boundary match | existing |
| 2 | VETO_MATERIAL | Existing avoid_materials word-boundary match | existing |
| 3 | VETO_PATTERN | Existing avoid_patterns word-boundary match | existing |
| 4 | VETO_DISLIKED | Existing disliked_styles word-boundary match | existing |
| 5 | VETO_FIT | Existing loose-fit token check when user prefers slim | existing |
| 6 | VETO_COVERAGE | coverage_no_go pattern match: midriff, crop top, plunging, backless, sheer, mini skirt, thigh-high, low cut, spaghetti strap, halter | tasteValidator |
| 7 | VETO_WALKABILITY | walkability=high: veto stiletto/platform/5-inch. walkability=medium: veto stiletto only | tasteValidator |
| 8 | VETO_FORMALITY | Infer product formality (1-9). If 2+ ranks below formality_floor -> hard veto. 1-rank tolerance. | tasteValidator |
| 9 | VETO_CLIMATE | Hot climate + wool/fleece/down/heavy/thermal -> veto. Cold climate + mesh/sheer/open-toe sandal -> veto | tasteValidator |
| 10 | VETO_MATERIAL_MIX | Athletic materials (nylon+mesh, polyester+mesh) in items titled "formal"/"dress shirt"/"blazer" -> veto | styleJudge |

### Formality Rank Map (for VETO_FORMALITY)

```
1: athletic, gym, workout, activewear
2: casual, streetwear, lounge
3: smart casual, weekend, brunch
4: business casual, office casual
5: business, professional
6: business formal, cocktail
7: formal, evening, gala
8: black tie
9: white tie
```

Product formality inferred from title keywords. Fail-open: if no keywords match, formality = null and rule is skipped.

## 5. File 2: discover-curator.ts

**Location:** `apps/backend-nest/src/services/discover-curator.ts`
**Purpose:** Returns additive score deltas for 6 curator dimensions.
**Contract:** Pure function, no state, no async, no DB, no LLM.
**Clamping:** Curator total clamped to [-15, +15].

### Scoring Dimensions

| Dimension | Range | Logic |
|-----------|-------|-------|
| Formality coherence | -8 to +4 | Infer product formality (1-9), compare to profile formalityFloor. Within 1 rank: +4. Within 2: +2. 3+ below: -8. No floor set: 0. |
| Color harmony | -4 to +3 | Classify enriched_color into family (neutral/warm/cool/earth/neon/pastel). Neutral+single-accent user profile: +3. Neon when profile says classic/elegant: -4. No enriched color: 0. |
| Occasion bonus | 0 to +3 | If user style_keywords include formal/business/elegant AND product matches occasion descriptors (tailored, dress, blazer, oxford, loafer): +3. |
| Silhouette depth | -4 to +4 | Graduated fit scoring. Exact match (user:slim, product:slim): +4. Adjacent (user:slim, product:tailored): +2. Conflict (user:slim, product:oversized): -4. Replaces existing -12 binary penalty. |
| Material elevation | -3 to +3 | Premium materials (silk, cashmere, wool, linen, leather, suede) when user profile is luxury/elegant/sophisticated: +3. Athletic materials (polyester, nylon, spandex) in same context: -3. Neutral profile: 0. |
| Confidence | 0.0 to 1.0 | signalsUsed / signalsAvailable. Not added to score. For debug and future learning integration. |

### Color Family Classification

```
neutral: black, white, gray, cream, beige, ivory, charcoal, taupe
warm: red, orange, coral, terracotta, rust, gold, amber, burgundy
cool: blue, navy, teal, turquoise, lavender, periwinkle
earth: brown, olive, khaki, tan, sage, forest, moss
neon: neon green, neon pink, neon yellow, electric blue, hot pink
pastel: blush, baby blue, mint, lilac, peach, powder
```

## 6. Changes to discover.service.ts

### 6a. Import new modules
Lines 1-8 area. Add imports for discover-veto and discover-curator.

### 6b. Stage 1c: Replace inline veto with discover-veto call
Lines 979-1019. Build VetoProfile from UserProfile. Replace inline for-loops with `applyDiscoverVeto()` call. Keep veto stats tracking.

### 6c. Stage 2: Add curator signals to scoring
Lines 1143-1451. After existing score computation, call `computeCuratorSignals()`. Add `curatorTotal` to final score formula. Add curator breakdown fields.

### 6d. Silhouette depth replaces binary fit penalty
Lines 1349-1354. Remove the existing `-12` fitConflictPenalty. Curator's silhouetteDepth (-4 to +4) replaces it with graduated scoring.

### 6e. Learning clamping
Lines 1378-1391. Track `fashionStateBonus` as distinct `learningScore` in breakdown. Existing +/-6 clamp stays. Add `learningScore` field to breakdown for debug.

### 6f. Stable sort tie-breaking
Lines 1453 and 1479. Change `sort((a, b) => b.score - a.score)` to `sort((a, b) => b.score - a.score || a.idx - b.idx)` where idx = original index in array.

### 6g. Enhanced debug output
Add curator breakdown, confidence score, and signal tracking to existing DEBUG_RECOMMENDED_BUYS logs.

## 7. Isolation Proof

```
Files MODIFIED:
  apps/backend-nest/src/services/discover.service.ts

Files CREATED:
  apps/backend-nest/src/services/discover-veto.ts
  apps/backend-nest/src/services/discover-curator.ts

Files NOT TOUCHED (verified by design):
  - styleJudge.ts
  - eliteScoring.ts
  - tasteValidator.ts
  - styleVeto.ts
  - wardrobe.service.ts
  - Any Trips engine file
  - Any AI Stylist Suggestions file
  - Any Ask Styla Chat file
```

Grep proof: `git diff --name-only | grep -v 'discover'` must return empty.

## 8. Determinism Proof

| Property | Guarantee |
|----------|-----------|
| Same input -> same output | All new functions are pure |
| Sort stability | Tie-breaking by original index |
| No randomness | No Math.random(), no Date.now() in scoring |
| No async in scoring | All scoring functions are synchronous |
| No LLM in scoring | All scoring is rule-based |
| Reproducible | Same profile + same candidates = identical output |

## 9. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-vetoing (thin pool) | Medium | Veto runs before broadening search. Fallback path unchanged. |
| Score inflation from curator | Low | Curator total clamped +/-15 out of ~70 max score. |
| Noisy formality inference | Low | Fail-open: no keywords -> signal returns 0 (neutral). |
| Coverage no-go false positives | Low | Word-boundary matching only. "crop" won't match "microphone". |
| Existing test breakage | Low | Tests updated alongside implementation. |

## 10. Estimated Changes

- `discover-veto.ts`: ~150 lines (new)
- `discover-curator.ts`: ~200 lines (new)
- `discover.service.ts`: ~80 lines modified, ~20 lines removed (net ~+60)
- `discover.service.spec.ts`: ~100 lines added for new dimensions
- **Total new/modified:** ~510 lines
