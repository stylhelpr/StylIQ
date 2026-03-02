# Recommended Buys Tier 4 Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the Recommended Buys scoring pipeline from Tier 2.5 to Tier 4 by adding a hard-veto layer and curator scoring signals, fully isolated from shared AI modules.

**Architecture:** Two new pure-function modules (`discover-veto.ts`, `discover-curator.ts`) plus orchestration changes in `discover.service.ts`. All functions are synchronous, deterministic, and stateless. Hard vetoes eliminate products before scoring. Curator signals add bounded score deltas (+/-15 max) after existing scoring.

**Tech Stack:** TypeScript, NestJS, Jest. No new dependencies.

**Design doc:** `docs/plans/2026-02-19-recommended-buys-tier4-design.md`

**HARD CONSTRAINTS:**
- DO NOT modify: styleJudge.ts, eliteScoring.ts, tasteValidator.ts, styleVeto.ts, wardrobe.service.ts
- DO NOT introduce: randomness, Date.now() in scoring, async in scoring functions, LLM calls in scoring
- All new files must be under `apps/backend-nest/src/services/`
- After every task: `git diff --name-only | grep -v 'discover' | grep -v 'docs/plans'` must return empty

---

## Task 1: Create discover-veto.ts with formality inference utilities

**Files:**
- Create: `apps/backend-nest/src/services/discover-veto.ts`
- Create: `apps/backend-nest/src/services/discover-veto.spec.ts`

**Step 1: Write the test file with formality inference tests**

Create `apps/backend-nest/src/services/discover-veto.spec.ts`:

```typescript
import {
  inferProductFormality,
  FORMALITY_RANK_MAP,
  normalizeForVeto,
} from './discover-veto';

describe('inferProductFormality', () => {
  it('returns 1 for athletic/gym items', () => {
    expect(inferProductFormality('Nike Athletic Training Shorts')).toBe(1);
    expect(inferProductFormality('Gym Workout Tank Top')).toBe(1);
  });

  it('returns 2 for casual/streetwear items', () => {
    expect(inferProductFormality('Casual Cotton Hoodie')).toBe(2);
    expect(inferProductFormality('Streetwear Graphic Tee')).toBe(2);
  });

  it('returns 4 for business casual items', () => {
    expect(inferProductFormality('Business Casual Chino Pants')).toBe(4);
  });

  it('returns 5 for business/professional items', () => {
    expect(inferProductFormality('Professional Dress Shirt')).toBe(5);
    expect(inferProductFormality('Business Wool Trousers')).toBe(5);
  });

  it('returns 7 for formal/evening items', () => {
    expect(inferProductFormality('Formal Evening Gown')).toBe(7);
    expect(inferProductFormality('Black Tie Tuxedo Jacket')).toBe(8);
  });

  it('returns null when no formality keywords match', () => {
    expect(inferProductFormality('Blue Cotton Thing')).toBeNull();
  });

  it('is deterministic', () => {
    const input = 'Casual Slim Fit Oxford Shirt';
    expect(inferProductFormality(input)).toBe(inferProductFormality(input));
  });
});

describe('FORMALITY_RANK_MAP', () => {
  it('maps formality_floor strings to rank numbers', () => {
    expect(FORMALITY_RANK_MAP['casual']).toBe(2);
    expect(FORMALITY_RANK_MAP['business casual']).toBe(4);
    expect(FORMALITY_RANK_MAP['formal']).toBe(7);
  });
});

describe('normalizeForVeto', () => {
  it('lowercases and strips special chars', () => {
    expect(normalizeForVeto('Casual-Fit!')).toBe('casualfit');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend-nest && npx jest discover-veto --no-coverage`
Expected: FAIL — module not found

**Step 3: Write the discover-veto.ts module with formality utilities**

Create `apps/backend-nest/src/services/discover-veto.ts`:

```typescript
/**
 * discover-veto.ts — Hard elimination gate for Recommended Buys (Tier 4)
 *
 * Pure function module. No DB, no LLM, no async, no state, no randomness.
 * Products violating P0 constraints are eliminated before scoring.
 *
 * ISOLATION: This file is local to the discover/ boundary.
 * It does NOT import from styleJudge, eliteScoring, tasteValidator, or styleVeto.
 */

// ==================== TYPES ====================

export interface VetoInput {
  title: string;
  blob: string;           // pre-normalized text blob (lowercase, no special chars)
  enrichedColor: string;  // pre-normalized
  price: number | null;
  brand: string | null;
}

export interface VetoProfile {
  avoidColors: Set<string>;
  avoidMaterials: Set<string>;
  avoidPatterns: Set<string>;
  dislikedStyles: Set<string>;
  fitPreferences: string[];
  coverageNoGo: string[];
  walkabilityRequirement: string | null;
  formalityFloor: string | null;
  climate: string | null;
}

export interface VetoResult {
  vetoed: boolean;
  reason: string | null;
  rule: string | null;  // grep-proof tag: VETO_COLOR, VETO_FORMALITY, etc.
}

// ==================== NORMALIZE ====================

/** Strip non-alphanumeric (except spaces), lowercase, collapse whitespace */
export function normalizeForVeto(str?: string | null): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-boundary-safe token match */
function wordBoundary(blob: string, token: string): boolean {
  return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(blob);
}

// ==================== FORMALITY INFERENCE ====================

/** Map formality_floor profile strings to rank numbers (1-9) */
export const FORMALITY_RANK_MAP: Record<string, number> = {
  athletic: 1,
  gym: 1,
  activewear: 1,
  casual: 2,
  streetwear: 2,
  lounge: 2,
  'smart casual': 3,
  weekend: 3,
  'business casual': 4,
  'office casual': 4,
  business: 5,
  professional: 5,
  'business formal': 6,
  cocktail: 6,
  formal: 7,
  evening: 7,
  gala: 7,
  'black tie': 8,
  'white tie': 9,
};

/** Keyword → formality rank for product title inference. Ordered most-specific-first. */
const FORMALITY_KEYWORDS: [RegExp, number][] = [
  [/\bwhite tie\b/, 9],
  [/\bblack tie\b/, 8],
  [/\btuxedo\b/, 8],
  [/\btux\b/, 8],
  [/\bgala\b/, 7],
  [/\bevening gown\b/, 7],
  [/\bformal\b/, 7],
  [/\bcocktail dress\b/, 6],
  [/\bcocktail\b/, 6],
  [/\bbusiness formal\b/, 6],
  [/\bprofessional\b/, 5],
  [/\bbusiness\b/, 5],
  [/\bdress shirt\b/, 5],
  [/\bsuit\b/, 5],
  [/\bblazer\b/, 5],
  [/\btrousers?\b/, 4],
  [/\boffice\b/, 4],
  [/\bbusiness casual\b/, 4],
  [/\boxford\b/, 4],
  [/\bchino\b/, 3],
  [/\bsmart casual\b/, 3],
  [/\bpolo\b/, 3],
  [/\bloafer\b/, 3],
  [/\bcasual\b/, 2],
  [/\bstreet\b/, 2],
  [/\bhoodie\b/, 2],
  [/\bjogger\b/, 2],
  [/\bsneaker\b/, 2],
  [/\btee\b/, 2],
  [/\bt shirt\b/, 2],
  [/\bjeans\b/, 2],
  [/\bathletic\b/, 1],
  [/\bgym\b/, 1],
  [/\bworkout\b/, 1],
  [/\bactivewear\b/, 1],
  [/\btraining\b/, 1],
  [/\byoga\b/, 1],
  [/\bsweatpants\b/, 1],
];

/** Infer product formality rank (1-9) from title. Returns null if no keywords match. */
export function inferProductFormality(title: string): number | null {
  const norm = normalizeForVeto(title);
  for (const [re, rank] of FORMALITY_KEYWORDS) {
    if (re.test(norm)) return rank;
  }
  return null;
}

// ==================== COVERAGE KEYWORDS ====================

const COVERAGE_KEYWORD_MAP: Record<string, RegExp[]> = {
  midriff: [/\bcrop top\b/, /\bcropped\b/, /\bmidriff\b/, /\bbelly\b/],
  leg: [/\bmini skirt\b/, /\bmicro\b/, /\bthigh.?high\b/, /\bhot pants\b/, /\bshort shorts\b/],
  shoulder: [/\bstrapless\b/, /\boff.?shoulder\b/, /\bone.?shoulder\b/],
  cleavage: [/\bplunging\b/, /\blow.?cut\b/, /\bdeep.?v\b/],
  back: [/\bbackless\b/, /\bopen.?back\b/],
  sheer: [/\bsheer\b/, /\btransparent\b/, /\bsee.?through\b/],
  spaghetti: [/\bspaghetti\b/, /\bthin.?strap\b/],
  halter: [/\bhalter\b/],
};

// ==================== CLIMATE KEYWORDS ====================

const HOT_CLIMATE_VETO_KEYWORDS = [
  /\bwool\b/, /\bfleece\b/, /\bdown\b/, /\bheavy\b/, /\bthermal\b/,
  /\binsulated\b/, /\bpuffer\b/, /\bsherpa\b/, /\bfur\b/,
];

const COLD_CLIMATE_VETO_KEYWORDS = [
  /\bmesh\b/, /\bsheer\b/, /\bopen.?toe\b/, /\bsandal\b/,
  /\btank top\b/, /\bsleeveless\b/,
];

// ==================== WALKABILITY KEYWORDS ====================

const STILETTO_RE = /\bstiletto\b/;
const PLATFORM_RE = /\bplatform\b/;
const HIGH_HEEL_RE = /\b(5.?inch|6.?inch|high.?heel)\b/;

// ==================== MATERIAL MIX KEYWORDS ====================

const ATHLETIC_MATERIAL_RE = /\b(nylon|polyester|spandex)\b/;
const FORMAL_ITEM_RE = /\b(formal|dress shirt|blazer|suit|tuxedo)\b/;

// ==================== LOOSE FIT TOKENS (mirrored from discover.service.ts) ====================

const LOOSE_FIT_TOKENS = [
  'oversized', 'boxy', 'baggy', 'wide', 'loose fit', 'dropped shoulder',
  'relaxed', 'relaxed fit', 'wide leg', 'wide fit',
];

// ==================== MAIN VETO FUNCTION ====================

/**
 * Apply hard-veto rules to a single product.
 * Returns { vetoed: true, reason, rule } if product should be eliminated.
 * Pure function — deterministic, no side effects.
 */
export function applyDiscoverVeto(
  product: VetoInput,
  profile: VetoProfile,
): VetoResult {
  const blob = product.blob;
  const enrichedColor = product.enrichedColor;

  // --- Existing vetoes (migrated from discover.service.ts inline logic) ---

  // VETO_FIT: loose-fit items when user prefers slim
  const userPrefersSlim = profile.fitPreferences.some(f => {
    const n = normalizeForVeto(f);
    return n === 'slim' || n === 'tailored' || n === 'fitted';
  });
  if (userPrefersSlim) {
    for (const t of LOOSE_FIT_TOKENS) {
      if (blob.includes(t)) {
        return { vetoed: true, reason: `Loose-fit token "${t}" conflicts with slim preference`, rule: 'VETO_FIT' };
      }
    }
  }

  // VETO_COLOR: avoid_colors word-boundary match
  for (const c of profile.avoidColors) {
    if (enrichedColor === c || wordBoundary(blob, c)) {
      return { vetoed: true, reason: `Avoid color "${c}" found`, rule: 'VETO_COLOR' };
    }
  }

  // VETO_MATERIAL: avoid_materials word-boundary match
  for (const m of profile.avoidMaterials) {
    if (wordBoundary(blob, m)) {
      return { vetoed: true, reason: `Avoid material "${m}" found`, rule: 'VETO_MATERIAL' };
    }
  }

  // VETO_PATTERN: avoid_patterns word-boundary match
  for (const p of profile.avoidPatterns) {
    if (wordBoundary(blob, p)) {
      return { vetoed: true, reason: `Avoid pattern "${p}" found`, rule: 'VETO_PATTERN' };
    }
  }

  // VETO_DISLIKED: disliked_styles word-boundary match
  for (const s of profile.dislikedStyles) {
    if (wordBoundary(blob, s)) {
      return { vetoed: true, reason: `Disliked style "${s}" found`, rule: 'VETO_DISLIKED' };
    }
  }

  // --- New Tier 4 vetoes ---

  // VETO_COVERAGE: coverage_no_go pattern match
  for (const noGo of profile.coverageNoGo) {
    const normNoGo = normalizeForVeto(noGo);
    const patterns = COVERAGE_KEYWORD_MAP[normNoGo];
    if (patterns) {
      for (const re of patterns) {
        if (re.test(blob)) {
          return { vetoed: true, reason: `Coverage no-go "${noGo}" matched`, rule: 'VETO_COVERAGE' };
        }
      }
    }
    // Fallback: direct word-boundary match on the no-go term itself
    if (wordBoundary(blob, normNoGo)) {
      return { vetoed: true, reason: `Coverage no-go "${noGo}" (direct match)`, rule: 'VETO_COVERAGE' };
    }
  }

  // VETO_WALKABILITY: stiletto/platform/high-heel based on requirement level
  if (profile.walkabilityRequirement) {
    const walkLevel = normalizeForVeto(profile.walkabilityRequirement);
    if (walkLevel === 'high') {
      if (STILETTO_RE.test(blob) || PLATFORM_RE.test(blob) || HIGH_HEEL_RE.test(blob)) {
        return { vetoed: true, reason: 'High walkability required; stiletto/platform/high-heel vetoed', rule: 'VETO_WALKABILITY' };
      }
    } else if (walkLevel === 'medium') {
      if (STILETTO_RE.test(blob)) {
        return { vetoed: true, reason: 'Medium walkability required; stiletto vetoed', rule: 'VETO_WALKABILITY' };
      }
    }
  }

  // VETO_FORMALITY: product formality 2+ ranks below user's floor
  if (profile.formalityFloor) {
    const floorRank = FORMALITY_RANK_MAP[normalizeForVeto(profile.formalityFloor)];
    if (typeof floorRank === 'number') {
      const productRank = inferProductFormality(product.title);
      if (productRank !== null && (floorRank - productRank) >= 2) {
        return {
          vetoed: true,
          reason: `Product formality ${productRank} is 2+ ranks below floor ${floorRank}`,
          rule: 'VETO_FORMALITY',
        };
      }
    }
  }

  // VETO_CLIMATE: inappropriate materials for climate
  if (profile.climate) {
    const normClimate = normalizeForVeto(profile.climate);
    if (normClimate === 'hot' || normClimate === 'tropical' || normClimate === 'warm') {
      for (const re of HOT_CLIMATE_VETO_KEYWORDS) {
        if (re.test(blob)) {
          return { vetoed: true, reason: `Hot climate conflict: ${re.source}`, rule: 'VETO_CLIMATE' };
        }
      }
    }
    if (normClimate === 'cold' || normClimate === 'freezing' || normClimate === 'winter') {
      for (const re of COLD_CLIMATE_VETO_KEYWORDS) {
        if (re.test(blob)) {
          return { vetoed: true, reason: `Cold climate conflict: ${re.source}`, rule: 'VETO_CLIMATE' };
        }
      }
    }
  }

  // VETO_MATERIAL_MIX: athletic materials in formal items
  if (FORMAL_ITEM_RE.test(blob) && ATHLETIC_MATERIAL_RE.test(blob)) {
    return { vetoed: true, reason: 'Athletic material in formal item', rule: 'VETO_MATERIAL_MIX' };
  }

  return { vetoed: false, reason: null, rule: null };
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend-nest && npx jest discover-veto --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend-nest/src/services/discover-veto.ts apps/backend-nest/src/services/discover-veto.spec.ts
git commit -m "feat(discover): add discover-veto.ts hard elimination gate (Tier 4)"
```

---

## Task 2: Add comprehensive veto tests

**Files:**
- Modify: `apps/backend-nest/src/services/discover-veto.spec.ts`

**Step 1: Add tests for all 10 veto rules**

Append to `apps/backend-nest/src/services/discover-veto.spec.ts`:

```typescript
import { applyDiscoverVeto, VetoInput, VetoProfile } from './discover-veto';

// Helper: build minimal product
function makeProduct(overrides: Partial<VetoInput> = {}): VetoInput {
  return {
    title: overrides.title ?? 'Test Product',
    blob: (overrides.blob ?? overrides.title ?? 'test product').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
    enrichedColor: overrides.enrichedColor ?? '',
    price: overrides.price ?? 50,
    brand: overrides.brand ?? null,
  };
}

// Helper: build minimal profile
function makeProfile(overrides: Partial<VetoProfile> = {}): VetoProfile {
  return {
    avoidColors: overrides.avoidColors ?? new Set(),
    avoidMaterials: overrides.avoidMaterials ?? new Set(),
    avoidPatterns: overrides.avoidPatterns ?? new Set(),
    dislikedStyles: overrides.dislikedStyles ?? new Set(),
    fitPreferences: overrides.fitPreferences ?? [],
    coverageNoGo: overrides.coverageNoGo ?? [],
    walkabilityRequirement: overrides.walkabilityRequirement ?? null,
    formalityFloor: overrides.formalityFloor ?? null,
    climate: overrides.climate ?? null,
  };
}

describe('applyDiscoverVeto — existing rules', () => {
  it('VETO_FIT: blocks oversized when user prefers slim', () => {
    const product = makeProduct({ title: 'Oversized Boxy Hoodie' });
    const profile = makeProfile({ fitPreferences: ['slim'] });
    const result = applyDiscoverVeto(product, profile);
    expect(result.vetoed).toBe(true);
    expect(result.rule).toBe('VETO_FIT');
  });

  it('VETO_FIT: does NOT block slim items when user prefers slim', () => {
    const product = makeProduct({ title: 'Slim Fit Cotton Shirt' });
    const profile = makeProfile({ fitPreferences: ['slim'] });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  it('VETO_COLOR: blocks avoid color', () => {
    const product = makeProduct({ title: 'Red Leather Jacket', enrichedColor: 'red' });
    const profile = makeProfile({ avoidColors: new Set(['red']) });
    const result = applyDiscoverVeto(product, profile);
    expect(result.vetoed).toBe(true);
    expect(result.rule).toBe('VETO_COLOR');
  });

  it('VETO_COLOR: does NOT false-positive "tired" for "red"', () => {
    const product = makeProduct({ title: 'Tired Man Sweater' });
    const profile = makeProfile({ avoidColors: new Set(['red']) });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  it('VETO_MATERIAL: blocks avoid material', () => {
    const product = makeProduct({ title: 'Leather Biker Jacket' });
    const profile = makeProfile({ avoidMaterials: new Set(['leather']) });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(true);
  });

  it('VETO_PATTERN: blocks avoid pattern', () => {
    const product = makeProduct({ title: 'Floral Print Dress' });
    const profile = makeProfile({ avoidPatterns: new Set(['floral']) });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(true);
  });

  it('VETO_DISLIKED: blocks disliked style', () => {
    const product = makeProduct({ title: 'Bohemian Flowy Dress' });
    const profile = makeProfile({ dislikedStyles: new Set(['bohemian']) });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(true);
  });
});

describe('applyDiscoverVeto — new Tier 4 rules', () => {
  // VETO_COVERAGE
  it('VETO_COVERAGE: blocks crop top when midriff is no-go', () => {
    const product = makeProduct({ title: 'Cropped Cotton Tank Top' });
    const profile = makeProfile({ coverageNoGo: ['midriff'] });
    const result = applyDiscoverVeto(product, profile);
    expect(result.vetoed).toBe(true);
    expect(result.rule).toBe('VETO_COVERAGE');
  });

  it('VETO_COVERAGE: blocks plunging neckline when cleavage is no-go', () => {
    const product = makeProduct({ title: 'Plunging V-Neck Evening Dress' });
    const profile = makeProfile({ coverageNoGo: ['cleavage'] });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(true);
  });

  it('VETO_COVERAGE: blocks backless when back is no-go', () => {
    const product = makeProduct({ title: 'Backless Satin Gown' });
    const profile = makeProfile({ coverageNoGo: ['back'] });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(true);
  });

  it('VETO_COVERAGE: does NOT block regular tops when midriff is no-go', () => {
    const product = makeProduct({ title: 'Classic Button Down Shirt' });
    const profile = makeProfile({ coverageNoGo: ['midriff'] });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  // VETO_WALKABILITY
  it('VETO_WALKABILITY: blocks stiletto when walkability is high', () => {
    const product = makeProduct({ title: 'Stiletto High Heel Pumps' });
    const profile = makeProfile({ walkabilityRequirement: 'high' });
    const result = applyDiscoverVeto(product, profile);
    expect(result.vetoed).toBe(true);
    expect(result.rule).toBe('VETO_WALKABILITY');
  });

  it('VETO_WALKABILITY: blocks platform when walkability is high', () => {
    const product = makeProduct({ title: 'Platform Wedge Sandals' });
    const profile = makeProfile({ walkabilityRequirement: 'high' });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(true);
  });

  it('VETO_WALKABILITY: blocks stiletto but NOT platform when walkability is medium', () => {
    const stiletto = makeProduct({ title: 'Stiletto Heel Boots' });
    const platform = makeProduct({ title: 'Platform Sneakers' });
    const profile = makeProfile({ walkabilityRequirement: 'medium' });
    expect(applyDiscoverVeto(stiletto, profile).vetoed).toBe(true);
    expect(applyDiscoverVeto(platform, profile).vetoed).toBe(false);
  });

  it('VETO_WALKABILITY: does NOT block flat shoes when walkability is high', () => {
    const product = makeProduct({ title: 'Classic Flat Loafers' });
    const profile = makeProfile({ walkabilityRequirement: 'high' });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  // VETO_FORMALITY
  it('VETO_FORMALITY: blocks athletic item when floor is business casual', () => {
    const product = makeProduct({ title: 'Athletic Training Shorts' });
    const profile = makeProfile({ formalityFloor: 'business casual' });
    const result = applyDiscoverVeto(product, profile);
    expect(result.vetoed).toBe(true);
    expect(result.rule).toBe('VETO_FORMALITY');
  });

  it('VETO_FORMALITY: allows business item when floor is business casual', () => {
    const product = makeProduct({ title: 'Professional Dress Shirt' });
    const profile = makeProfile({ formalityFloor: 'business casual' });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  it('VETO_FORMALITY: allows 1-rank-below (tolerance)', () => {
    const product = makeProduct({ title: 'Smart Casual Polo Shirt' });
    const profile = makeProfile({ formalityFloor: 'business casual' }); // floor=4, product=3: only 1 below
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  it('VETO_FORMALITY: skips when no keywords match (fail-open)', () => {
    const product = makeProduct({ title: 'Blue Cotton Thing' });
    const profile = makeProfile({ formalityFloor: 'business' });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  // VETO_CLIMATE
  it('VETO_CLIMATE: blocks wool in hot climate', () => {
    const product = makeProduct({ title: 'Heavy Wool Overcoat' });
    const profile = makeProfile({ climate: 'hot' });
    const result = applyDiscoverVeto(product, profile);
    expect(result.vetoed).toBe(true);
    expect(result.rule).toBe('VETO_CLIMATE');
  });

  it('VETO_CLIMATE: blocks sandals in cold climate', () => {
    const product = makeProduct({ title: 'Open Toe Leather Sandal' });
    const profile = makeProfile({ climate: 'cold' });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(true);
  });

  it('VETO_CLIMATE: allows cotton in hot climate', () => {
    const product = makeProduct({ title: 'Light Cotton Shirt' });
    const profile = makeProfile({ climate: 'hot' });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  it('VETO_CLIMATE: allows wool boots in cold climate', () => {
    const product = makeProduct({ title: 'Wool Lined Winter Boot' });
    const profile = makeProfile({ climate: 'cold' });
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });

  // VETO_MATERIAL_MIX
  it('VETO_MATERIAL_MIX: blocks polyester formal suit', () => {
    const product = makeProduct({ title: 'Formal Polyester Suit Jacket' });
    const profile = makeProfile();
    const result = applyDiscoverVeto(product, profile);
    expect(result.vetoed).toBe(true);
    expect(result.rule).toBe('VETO_MATERIAL_MIX');
  });

  it('VETO_MATERIAL_MIX: allows polyester athletic shorts', () => {
    const product = makeProduct({ title: 'Polyester Athletic Shorts' });
    const profile = makeProfile();
    expect(applyDiscoverVeto(product, profile).vetoed).toBe(false);
  });
});

describe('applyDiscoverVeto — determinism', () => {
  it('same input produces same output across multiple calls', () => {
    const product = makeProduct({ title: 'Casual Cropped Hoodie' });
    const profile = makeProfile({ coverageNoGo: ['midriff'], fitPreferences: ['slim'] });
    const r1 = applyDiscoverVeto(product, profile);
    const r2 = applyDiscoverVeto(product, profile);
    expect(r1).toEqual(r2);
  });
});
```

**Step 2: Run tests**

Run: `cd apps/backend-nest && npx jest discover-veto --no-coverage`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add apps/backend-nest/src/services/discover-veto.spec.ts
git commit -m "test(discover): comprehensive veto tests for all 10 rules"
```

---

## Task 3: Create discover-curator.ts with color family and formality scoring

**Files:**
- Create: `apps/backend-nest/src/services/discover-curator.ts`
- Create: `apps/backend-nest/src/services/discover-curator.spec.ts`

**Step 1: Write the test file**

Create `apps/backend-nest/src/services/discover-curator.spec.ts`:

```typescript
import {
  computeCuratorSignals,
  classifyColorFamily,
  CuratorInput,
  CuratorProfile,
} from './discover-curator';

function makeInput(overrides: Partial<CuratorInput> = {}): CuratorInput {
  return {
    title: overrides.title ?? 'Test Product',
    blob: (overrides.blob ?? overrides.title ?? 'test product').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
    enrichedColor: overrides.enrichedColor ?? '',
    price: overrides.price ?? 50,
    brand: overrides.brand ?? null,
    inferredCategory: overrides.inferredCategory ?? null,
    existingScore: overrides.existingScore ?? 20,
    existingBreakdown: overrides.existingBreakdown ?? {},
  };
}

function makeProfile(overrides: Partial<CuratorProfile> = {}): CuratorProfile {
  return {
    styleKeywords: overrides.styleKeywords ?? [],
    formalityFloor: overrides.formalityFloor ?? null,
    silhouettePreference: overrides.silhouettePreference ?? null,
    climate: overrides.climate ?? null,
    colorPreferences: overrides.colorPreferences ?? [],
    fitPreferences: overrides.fitPreferences ?? [],
  };
}

describe('classifyColorFamily', () => {
  it('classifies black as neutral', () => {
    expect(classifyColorFamily('black')).toBe('neutral');
  });
  it('classifies navy as cool', () => {
    expect(classifyColorFamily('navy')).toBe('cool');
  });
  it('classifies red as warm', () => {
    expect(classifyColorFamily('red')).toBe('warm');
  });
  it('classifies brown as earth', () => {
    expect(classifyColorFamily('brown')).toBe('earth');
  });
  it('returns null for empty string', () => {
    expect(classifyColorFamily('')).toBeNull();
  });
});

describe('computeCuratorSignals — formality coherence', () => {
  it('gives +4 when product matches formality floor', () => {
    const input = makeInput({ title: 'Professional Dress Shirt' });
    const profile = makeProfile({ formalityFloor: 'business' });
    const result = computeCuratorSignals(input, profile);
    expect(result.formalityCoherence).toBe(4);
  });

  it('gives -8 when product is 3+ ranks below formality floor', () => {
    // This product would have passed veto (only 2+ rank gap vetoed there),
    // but here we test the scorer for products that slip through
    const input = makeInput({ title: 'Casual Streetwear Hoodie' }); // rank 2
    const profile = makeProfile({ formalityFloor: 'business' }); // rank 5 → gap = 3
    const result = computeCuratorSignals(input, profile);
    expect(result.formalityCoherence).toBe(-8);
  });

  it('gives 0 when no formality floor set', () => {
    const input = makeInput({ title: 'Athletic Shorts' });
    const profile = makeProfile({ formalityFloor: null });
    expect(computeCuratorSignals(input, profile).formalityCoherence).toBe(0);
  });

  it('gives 0 when product formality cannot be inferred', () => {
    const input = makeInput({ title: 'Blue Cotton Thing' });
    const profile = makeProfile({ formalityFloor: 'business' });
    expect(computeCuratorSignals(input, profile).formalityCoherence).toBe(0);
  });
});

describe('computeCuratorSignals — silhouette depth', () => {
  it('gives +4 for exact match (slim→slim)', () => {
    const input = makeInput({ title: 'Slim Fit Cotton Shirt' });
    const profile = makeProfile({ silhouettePreference: 'structured', fitPreferences: ['slim'] });
    const result = computeCuratorSignals(input, profile);
    expect(result.silhouetteDepth).toBe(4);
  });

  it('gives -4 for conflict (slim pref → oversized product)', () => {
    const input = makeInput({ title: 'Oversized Boxy Hoodie' });
    const profile = makeProfile({ silhouettePreference: 'structured', fitPreferences: ['slim'] });
    const result = computeCuratorSignals(input, profile);
    expect(result.silhouetteDepth).toBe(-4);
  });

  it('gives 0 when no silhouette preference set', () => {
    const input = makeInput({ title: 'Regular Fit Pants' });
    const profile = makeProfile({ silhouettePreference: null, fitPreferences: [] });
    expect(computeCuratorSignals(input, profile).silhouetteDepth).toBe(0);
  });
});

describe('computeCuratorSignals — material elevation', () => {
  it('gives +3 for silk when user is luxury', () => {
    const input = makeInput({ title: 'Silk Evening Blouse' });
    const profile = makeProfile({ styleKeywords: ['luxury'] });
    const result = computeCuratorSignals(input, profile);
    expect(result.materialElevation).toBe(3);
  });

  it('gives -3 for polyester when user is luxury', () => {
    const input = makeInput({ title: 'Polyester Stretch Top' });
    const profile = makeProfile({ styleKeywords: ['luxury'] });
    const result = computeCuratorSignals(input, profile);
    expect(result.materialElevation).toBe(-3);
  });

  it('gives 0 for polyester when user is casual', () => {
    const input = makeInput({ title: 'Polyester Stretch Top' });
    const profile = makeProfile({ styleKeywords: ['casual'] });
    expect(computeCuratorSignals(input, profile).materialElevation).toBe(0);
  });
});

describe('computeCuratorSignals — clamping', () => {
  it('curatorTotal is clamped to [-15, +15]', () => {
    // Construct a scenario that would exceed +15 unclamped
    const input = makeInput({ title: 'Professional Silk Dress Shirt Slim Fit' });
    const profile = makeProfile({
      formalityFloor: 'business',
      styleKeywords: ['luxury', 'elegant'],
      silhouettePreference: 'structured',
      fitPreferences: ['slim'],
      colorPreferences: ['white'],
    });
    const result = computeCuratorSignals(input, profile);
    expect(result.curatorTotal).toBeLessThanOrEqual(15);
    expect(result.curatorTotal).toBeGreaterThanOrEqual(-15);
  });
});

describe('computeCuratorSignals — confidence', () => {
  it('returns confidence between 0 and 1', () => {
    const input = makeInput({ title: 'Casual Hoodie' });
    const profile = makeProfile({ formalityFloor: 'casual', styleKeywords: ['casual'] });
    const result = computeCuratorSignals(input, profile);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
    expect(result.signalsUsed).toBeLessThanOrEqual(result.signalsAvailable);
  });
});

describe('computeCuratorSignals — determinism', () => {
  it('same input produces same output across multiple calls', () => {
    const input = makeInput({ title: 'Silk Evening Gown' });
    const profile = makeProfile({ formalityFloor: 'formal', styleKeywords: ['elegant'], silhouettePreference: 'relaxed' });
    const r1 = computeCuratorSignals(input, profile);
    const r2 = computeCuratorSignals(input, profile);
    expect(r1).toEqual(r2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend-nest && npx jest discover-curator --no-coverage`
Expected: FAIL — module not found

**Step 3: Write the discover-curator.ts module**

Create `apps/backend-nest/src/services/discover-curator.ts`:

```typescript
/**
 * discover-curator.ts — Curator scoring signals for Recommended Buys (Tier 4)
 *
 * Pure function module. No DB, no LLM, no async, no state, no randomness.
 * Returns additive score deltas for 6 curator dimensions.
 * Curator total clamped to [-15, +15].
 *
 * ISOLATION: This file is local to the discover/ boundary.
 * It does NOT import from styleJudge, eliteScoring, tasteValidator, or styleVeto.
 */

import { inferProductFormality, FORMALITY_RANK_MAP } from './discover-veto';

// ==================== TYPES ====================

export interface CuratorInput {
  title: string;
  blob: string;
  enrichedColor: string;
  price: number | null;
  brand: string | null;
  inferredCategory: string | null;
  existingScore: number;
  existingBreakdown: Record<string, number>;
}

export interface CuratorProfile {
  styleKeywords: string[];
  formalityFloor: string | null;
  silhouettePreference: string | null;
  climate: string | null;
  colorPreferences: string[];
  fitPreferences: string[];
}

export interface CuratorResult {
  formalityCoherence: number;   // -8 to +4
  colorHarmony: number;         // -4 to +3
  occasionBonus: number;        // 0 to +3
  silhouetteDepth: number;      // -4 to +4
  materialElevation: number;    // -3 to +3
  confidenceScore: number;      // 0.0 to 1.0
  signalsUsed: number;
  signalsAvailable: number;
  curatorTotal: number;         // sum, clamped [-15, +15]
  debugTags: string[];
}

// ==================== COLOR FAMILY CLASSIFICATION ====================

const COLOR_FAMILIES: Record<string, string[]> = {
  neutral: ['black', 'white', 'gray', 'grey', 'cream', 'beige', 'ivory', 'charcoal', 'taupe'],
  warm: ['red', 'orange', 'coral', 'terracotta', 'rust', 'gold', 'amber', 'burgundy'],
  cool: ['blue', 'navy', 'teal', 'turquoise', 'lavender', 'periwinkle'],
  earth: ['brown', 'olive', 'khaki', 'tan', 'sage', 'forest', 'moss'],
  neon: ['neon', 'electric', 'hot pink', 'fluorescent'],
  pastel: ['blush', 'baby blue', 'mint', 'lilac', 'peach', 'powder'],
};

/** Classify a color into a family. Returns null if unknown. */
export function classifyColorFamily(color: string): string | null {
  if (!color) return null;
  const norm = color.toLowerCase().trim();
  for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
    if (colors.some(c => norm === c || norm.includes(c))) return family;
  }
  return null;
}

// ==================== FIT / SILHOUETTE CLASSIFICATION ====================

const SLIM_TOKENS = ['slim', 'slim fit', 'skinny', 'fitted', 'tailored', 'tapered', 'form fitting'];
const LOOSE_TOKENS = ['oversized', 'boxy', 'baggy', 'wide', 'loose', 'relaxed', 'dropped shoulder', 'wide leg'];
const ADJACENT_SLIM = ['regular', 'straight', 'classic fit'];

function classifyFit(blob: string): 'slim' | 'loose' | 'neutral' {
  for (const t of SLIM_TOKENS) {
    if (blob.includes(t)) return 'slim';
  }
  for (const t of LOOSE_TOKENS) {
    if (blob.includes(t)) return 'loose';
  }
  return 'neutral';
}

function getUserFitPref(fitPreferences: string[], silhouettePreference: string | null): 'slim' | 'loose' | null {
  const allTokens = [...fitPreferences];
  if (silhouettePreference) allTokens.push(silhouettePreference);
  const norm = allTokens.map(t => t.toLowerCase().trim());
  if (norm.some(t => t === 'slim' || t === 'tailored' || t === 'fitted' || t === 'structured')) return 'slim';
  if (norm.some(t => t === 'oversized' || t === 'relaxed' || t === 'loose' || t === 'boxy')) return 'loose';
  return null;
}

// ==================== MATERIAL CLASSIFICATION ====================

const PREMIUM_MATERIALS = /\b(silk|cashmere|wool|linen|leather|suede|merino|velvet|satin)\b/;
const ATHLETIC_MATERIALS = /\b(polyester|nylon|spandex|elastane|mesh|lycra)\b/;
const LUXURY_STYLE_KEYWORDS = ['luxury', 'elegant', 'sophisticated', 'elevated', 'refined', 'premium'];

// ==================== OCCASION DESCRIPTORS ====================

const OCCASION_PRODUCT_KEYWORDS = /\b(tailored|dress|blazer|oxford|loafer|formal|evening|cocktail|suit|tuxedo)\b/;
const OCCASION_STYLE_KEYWORDS = ['formal', 'business', 'elegant', 'sophisticated', 'black tie', 'cocktail'];

// ==================== MAIN CURATOR FUNCTION ====================

/**
 * Compute curator scoring signals for a single product.
 * Returns additive score deltas clamped to [-15, +15] total.
 * Pure function — deterministic, no side effects.
 */
export function computeCuratorSignals(
  product: CuratorInput,
  profile: CuratorProfile,
): CuratorResult {
  const blob = product.blob;
  const debugTags: string[] = [];
  let signalsAvailable = 0;
  let signalsUsed = 0;

  // ── 1. Formality Coherence (-8 to +4) ──
  let formalityCoherence = 0;
  if (profile.formalityFloor) {
    signalsAvailable++;
    const floorNorm = profile.formalityFloor.toLowerCase().trim();
    const floorRank = FORMALITY_RANK_MAP[floorNorm];
    if (typeof floorRank === 'number') {
      const productRank = inferProductFormality(product.title);
      if (productRank !== null) {
        signalsUsed++;
        const gap = floorRank - productRank;
        if (gap <= 0) {
          formalityCoherence = 4; // at or above floor
          debugTags.push(`CURATOR_FORMALITY:+4(at_floor)`);
        } else if (gap === 1) {
          formalityCoherence = 2; // 1 rank below — tolerated
          debugTags.push(`CURATOR_FORMALITY:+2(1_below)`);
        } else if (gap === 2) {
          formalityCoherence = 0; // 2 below — neutral (veto catches 2+ in strict mode)
          debugTags.push(`CURATOR_FORMALITY:0(2_below)`);
        } else {
          formalityCoherence = -8; // 3+ below
          debugTags.push(`CURATOR_FORMALITY:-8(3+_below)`);
        }
      }
    }
  }

  // ── 2. Color Harmony (-4 to +3) ──
  let colorHarmony = 0;
  if (product.enrichedColor && profile.colorPreferences.length > 0) {
    signalsAvailable++;
    const productFamily = classifyColorFamily(product.enrichedColor);
    if (productFamily) {
      signalsUsed++;
      const userFamilies = new Set(
        profile.colorPreferences
          .map(c => classifyColorFamily(c.toLowerCase().trim()))
          .filter(Boolean) as string[],
      );

      // Bonus: neutral product color when user prefers neutrals
      if (productFamily === 'neutral' && userFamilies.has('neutral')) {
        colorHarmony = 3;
        debugTags.push('CURATOR_COLOR:+3(neutral_match)');
      }
      // Bonus: product family matches a user family
      else if (userFamilies.has(productFamily)) {
        colorHarmony = 2;
        debugTags.push(`CURATOR_COLOR:+2(family_match:${productFamily})`);
      }
      // Penalty: neon product when user prefers classic/elegant
      else if (productFamily === 'neon') {
        const userStyleNorm = profile.styleKeywords.map(k => k.toLowerCase().trim());
        if (userStyleNorm.some(k => k === 'classic' || k === 'elegant' || k === 'sophisticated')) {
          colorHarmony = -4;
          debugTags.push('CURATOR_COLOR:-4(neon_vs_classic)');
        }
      }
    }
  }

  // ── 3. Occasion Bonus (0 to +3) ──
  let occasionBonus = 0;
  if (profile.styleKeywords.length > 0) {
    signalsAvailable++;
    const userStyleNorm = profile.styleKeywords.map(k => k.toLowerCase().trim());
    const userWantsOccasion = userStyleNorm.some(k => OCCASION_STYLE_KEYWORDS.includes(k));
    if (userWantsOccasion && OCCASION_PRODUCT_KEYWORDS.test(blob)) {
      signalsUsed++;
      occasionBonus = 3;
      debugTags.push('CURATOR_OCCASION:+3(match)');
    }
  }

  // ── 4. Silhouette Depth (-4 to +4) ──
  let silhouetteDepth = 0;
  const userFitPref = getUserFitPref(profile.fitPreferences, profile.silhouettePreference);
  if (userFitPref) {
    signalsAvailable++;
    const productFit = classifyFit(blob);
    if (productFit !== 'neutral') {
      signalsUsed++;
      if (userFitPref === productFit) {
        silhouetteDepth = 4; // exact match
        debugTags.push(`CURATOR_SILHOUETTE:+4(exact:${productFit})`);
      } else {
        silhouetteDepth = -4; // conflict
        debugTags.push(`CURATOR_SILHOUETTE:-4(conflict:user=${userFitPref},product=${productFit})`);
      }
    } else {
      // Product is neutral fit — check for adjacent tokens
      const isAdjacent = ADJACENT_SLIM.some(t => blob.includes(t));
      if (isAdjacent && userFitPref === 'slim') {
        signalsUsed++;
        silhouetteDepth = 2; // adjacent
        debugTags.push('CURATOR_SILHOUETTE:+2(adjacent_slim)');
      }
    }
  }

  // ── 5. Material Elevation (-3 to +3) ──
  let materialElevation = 0;
  const userStyleNorm = profile.styleKeywords.map(k => k.toLowerCase().trim());
  const userIsLuxury = userStyleNorm.some(k => LUXURY_STYLE_KEYWORDS.includes(k));
  if (userIsLuxury) {
    signalsAvailable++;
    if (PREMIUM_MATERIALS.test(blob)) {
      signalsUsed++;
      materialElevation = 3;
      debugTags.push('CURATOR_MATERIAL:+3(premium)');
    } else if (ATHLETIC_MATERIALS.test(blob)) {
      signalsUsed++;
      materialElevation = -3;
      debugTags.push('CURATOR_MATERIAL:-3(athletic_in_luxury)');
    }
  }

  // ── 6. Confidence Score ──
  // Always count base available signals
  if (signalsAvailable === 0) signalsAvailable = 1; // prevent div by 0
  const confidenceScore = Math.min(1, signalsUsed / signalsAvailable);

  // ── Aggregate & clamp ──
  const rawTotal = formalityCoherence + colorHarmony + occasionBonus + silhouetteDepth + materialElevation;
  const curatorTotal = Math.max(-15, Math.min(15, rawTotal));

  return {
    formalityCoherence,
    colorHarmony,
    occasionBonus,
    silhouetteDepth,
    materialElevation,
    confidenceScore: +confidenceScore.toFixed(2),
    signalsUsed,
    signalsAvailable,
    curatorTotal,
    debugTags,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend-nest && npx jest discover-curator --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add apps/backend-nest/src/services/discover-curator.ts apps/backend-nest/src/services/discover-curator.spec.ts
git commit -m "feat(discover): add discover-curator.ts scoring signals (Tier 4)"
```

---

## Task 4: Integrate discover-veto into discover.service.ts Stage 1c

**Files:**
- Modify: `apps/backend-nest/src/services/discover.service.ts` (lines ~979-1019)

**Step 1: Add imports at top of file**

At line 8 (after existing imports), add:

```typescript
import { applyDiscoverVeto, type VetoProfile, type VetoResult } from './discover-veto';
```

**Step 2: Replace inline veto logic in Stage 1c**

Replace lines 979-1019 (the entire `// --- Stage 1c: Hard Veto Filter ---` block) with:

```typescript
    // --- Stage 1c: Hard Veto Filter (Tier 4 — uses discover-veto.ts) ---
    const vetoProfile: VetoProfile = {
      avoidColors: vetoCtx.avoidColorsSet,
      avoidMaterials: vetoCtx.avoidMaterialsSet,
      avoidPatterns: vetoCtx.avoidPatternsSet,
      dislikedStyles: vetoCtx.dislikedStylesSet,
      fitPreferences: profile.fit_preferences,
      coverageNoGo: profile.coverage_no_go,
      walkabilityRequirement: profile.walkability_requirement,
      formalityFloor: profile.formality_floor,
      climate: profile.climate,
    };

    const vetoStats = { avoidColor: 0, avoidMaterial: 0, avoidPattern: 0, disliked: 0, fitVeto: 0, coverage: 0, walkability: 0, formality: 0, climate: 0, materialMix: 0 };
    const vetoPassed: any[] = [];

    for (const raw of allProducts) {
      const textParts: string[] = [
        raw.title, raw.snippet, raw.source, raw.description,
        ...(Array.isArray(raw.extensions) ? raw.extensions.map(String) : []),
      ].filter(Boolean);
      const blob = normalize(textParts.join(' '));
      const enrichedColor = raw.enriched_color ? normalize(raw.enriched_color) : '';

      const vetoResult: VetoResult = applyDiscoverVeto(
        { title: raw.title || '', blob, enrichedColor, price: raw.extracted_price ?? null, brand: raw.source ?? null },
        vetoProfile,
      );

      if (vetoResult.vetoed) {
        // Track stats by rule tag
        const ruleKey = (vetoResult.rule || '').replace('VETO_', '').toLowerCase();
        const statMap: Record<string, keyof typeof vetoStats> = {
          color: 'avoidColor', material: 'avoidMaterial', pattern: 'avoidPattern',
          disliked: 'disliked', fit: 'fitVeto', coverage: 'coverage',
          walkability: 'walkability', formality: 'formality', climate: 'climate',
          material_mix: 'materialMix',
        };
        const statKey = statMap[ruleKey];
        if (statKey) vetoStats[statKey]++;
        continue;
      }

      vetoPassed.push(raw);
    }
```

**Step 3: Remove the now-unused `userPrefersSlimVeto` variable**

Delete lines 984-988 (the `const userPrefersSlimVeto = ...` block that was above the old veto loop).

**Step 4: Run existing tests to verify no regression**

Run: `cd apps/backend-nest && npx jest discover --no-coverage`
Expected: ALL PASS (existing tests + new veto tests)

**Step 5: Run isolation check**

Run: `git diff --name-only | grep -v 'discover' | grep -v 'docs/plans'`
Expected: Empty output

**Step 6: Commit**

```bash
git add apps/backend-nest/src/services/discover.service.ts
git commit -m "feat(discover): integrate discover-veto hard elimination gate into Stage 1c"
```

---

## Task 5: Integrate discover-curator into discover.service.ts Stage 2

**Files:**
- Modify: `apps/backend-nest/src/services/discover.service.ts` (lines ~1143-1451)

**Step 1: Add curator import**

At the top imports (near the discover-veto import added in Task 4), add:

```typescript
import { computeCuratorSignals, type CuratorProfile, type CuratorResult } from './discover-curator';
```

**Step 2: Build CuratorProfile before scoring loop**

After line ~1100 (after the `fitTokens` and `negativeTokens` declarations), add:

```typescript
    const curatorProfile: CuratorProfile = {
      styleKeywords: profile.style_keywords,
      formalityFloor: profile.formality_floor,
      silhouettePreference: profile.silhouette_preference,
      climate: profile.climate,
      colorPreferences: effectiveFavoriteColors,
      fitPreferences: profile.fit_preferences,
    };
```

**Step 3: Add original index tracking to scored map**

In the `const scored = transformed.map((p, idx) => {` block (line ~1143), ensure each item has `idx` preserved. Add to the return object (line ~1450):

Change:
```typescript
      return { product: { ...p, score_total: +score.toFixed(2), score_breakdown: breakdown, match_reasons: reasons }, score, breakdown };
```

To:
```typescript
      // --- CURATOR SIGNALS (Tier 4) ---
      const curatorResult: CuratorResult = computeCuratorSignals(
        {
          title: p.title,
          blob: normProductText,
          enrichedColor: normalize(p.enriched_color || ''),
          price: p.price,
          brand: p.brand,
          inferredCategory,
          existingScore: score,
          existingBreakdown: breakdown,
        },
        curatorProfile,
      );

      const finalScore = score + curatorResult.curatorTotal;

      // Add curator signals to breakdown
      (breakdown as any).curatorFormality = curatorResult.formalityCoherence;
      (breakdown as any).curatorColor = curatorResult.colorHarmony;
      (breakdown as any).curatorOccasion = curatorResult.occasionBonus;
      (breakdown as any).curatorSilhouette = curatorResult.silhouetteDepth;
      (breakdown as any).curatorMaterial = curatorResult.materialElevation;
      (breakdown as any).curatorTotal = curatorResult.curatorTotal;
      (breakdown as any).confidence = curatorResult.confidenceScore;
      (breakdown as any).learningScore = fashionStateBonus;

      if (curatorResult.curatorTotal !== 0 && DEBUG_RECOMMENDED_BUYS) {
        console.log('🎨 CURATOR DEBUG', {
          title: p.title,
          ...curatorResult,
        });
      }

      return { product: { ...p, score_total: +finalScore.toFixed(2), score_breakdown: breakdown, match_reasons: reasons }, score: finalScore, breakdown, idx };
```

**Step 4: Remove the old binary fitConflictPenalty**

Find the `fitConflictPenalty` computation block (~lines 1349-1354) and the `fitConflictPenalty` addition in the score formula (~line 1408). Remove both — curator's `silhouetteDepth` replaces this.

Specifically:
- Delete the `let fitConflictPenalty = 0; if (userPrefersSlim) { ... }` block
- Remove `+ fitConflictPenalty` from the score formula
- Remove `(breakdown as any).fitConflict = fitConflictPenalty;` line

**Step 5: Add stable sort tie-breaking**

Change line ~1453 from:
```typescript
    scored.sort((a, b) => b.score - a.score);
```
To:
```typescript
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
```

Do the same for the sort at line ~1479.

**Step 6: Run all tests**

Run: `cd apps/backend-nest && npx jest discover --no-coverage`
Expected: ALL PASS

**Step 7: Run isolation check**

Run: `git diff --name-only | grep -v 'discover' | grep -v 'docs/plans'`
Expected: Empty output

**Step 8: Commit**

```bash
git add apps/backend-nest/src/services/discover.service.ts
git commit -m "feat(discover): integrate curator scoring + stable sort + remove binary fit penalty (Tier 4)"
```

---

## Task 6: Update existing spec + add integration-level tests

**Files:**
- Modify: `apps/backend-nest/src/services/discover.service.spec.ts`

**Step 1: Update existing tests to use new exports if needed**

The existing tests import from `__test__` and should still work. Add new tests:

```typescript
// Append to existing discover.service.spec.ts

// ── Tier 4 integration: veto + curator pipeline ─────────────────────

describe('Tier 4 integration: discover-veto exports work', () => {
  // Smoke test: ensure the veto module can be imported alongside discover.service
  it('discover-veto module is importable', () => {
    const veto = require('./discover-veto');
    expect(typeof veto.applyDiscoverVeto).toBe('function');
    expect(typeof veto.inferProductFormality).toBe('function');
  });
});

describe('Tier 4 integration: discover-curator exports work', () => {
  it('discover-curator module is importable', () => {
    const curator = require('./discover-curator');
    expect(typeof curator.computeCuratorSignals).toBe('function');
    expect(typeof curator.classifyColorFamily).toBe('function');
  });
});
```

**Step 2: Run all discover tests**

Run: `cd apps/backend-nest && npx jest discover --no-coverage`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add apps/backend-nest/src/services/discover.service.spec.ts
git commit -m "test(discover): add Tier 4 integration smoke tests"
```

---

## Task 7: Final isolation verification + cleanup

**Files:**
- No new files. Verification only.

**Step 1: Run full isolation grep proof**

```bash
cd /Users/giffinmike/Git/StylIQ
git diff main --name-only | grep -v 'discover' | grep -v 'docs/plans'
```
Expected: Empty output (only discover files and docs/plans modified)

**Step 2: Run full test suite**

```bash
cd apps/backend-nest && npx jest --no-coverage
```
Expected: ALL PASS

**Step 3: Verify no shared module imports in new files**

```bash
grep -rn 'styleJudge\|eliteScoring\|tasteValidator\|styleVeto\|wardrobe.service' apps/backend-nest/src/services/discover-veto.ts apps/backend-nest/src/services/discover-curator.ts
```
Expected: No output (no shared module references)

**Step 4: Verify determinism properties**

```bash
grep -n 'Math.random\|Date.now\|new Date()\|setTimeout\|setInterval' apps/backend-nest/src/services/discover-veto.ts apps/backend-nest/src/services/discover-curator.ts
```
Expected: No output (no non-deterministic calls)

**Step 5: Commit design doc**

```bash
git add docs/plans/2026-02-19-recommended-buys-tier4-design.md docs/plans/2026-02-19-recommended-buys-tier4-plan.md
git commit -m "docs: add Tier 4 recommended buys design and implementation plan"
```

---

## Summary

| Task | Description | Files | Est. Lines |
|------|-------------|-------|------------|
| 1 | Create discover-veto.ts | 2 new files | ~150 |
| 2 | Comprehensive veto tests | modify spec | ~120 |
| 3 | Create discover-curator.ts | 2 new files | ~200 |
| 4 | Integrate veto into Stage 1c | modify discover.service.ts | ~40 changed |
| 5 | Integrate curator into Stage 2 | modify discover.service.ts | ~50 changed |
| 6 | Integration smoke tests | modify spec | ~20 |
| 7 | Isolation verification | no files | verification only |
| **Total** | | 4 new + 2 modified | ~580 lines |
