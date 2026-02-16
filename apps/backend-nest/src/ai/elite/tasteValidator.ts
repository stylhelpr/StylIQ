/**
 * Taste / Coherence Validator — Pure deterministic functions.
 *
 * Zero DB calls, zero async, zero IO. Used by Stylist, Studio, and (type-only) Trips.
 * Fail-open: missing metadata ⇒ skip that check, never block.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type ValidatorSlot =
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'outerwear'
  | 'dresses'
  | 'accessories'
  | 'activewear'
  | 'swimwear';

export type ValidatorItem = {
  id: string;
  slot: ValidatorSlot;
  name?: string;
  subcategory?: string;
  color?: string;
  material?: string;
  fit?: string;
  formality_score?: number;
  dress_code?: string;
  style_descriptors?: string[];
  style_archetypes?: string[];
  price?: number;
  presentation_code?: string;
};

export type ValidatorContext = {
  userPresentation?: 'masculine' | 'feminine' | 'mixed';
  climateZone?: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot';
  requestedDressCode?: string;
  styleProfile?: {
    fit_preferences?: string[];
    fabric_preferences?: string[];
    style_preferences?: string[];
    disliked_styles?: string[];
    // P0 hard vetoes
    coverage_no_go?: string[];
    avoid_colors?: string[];
    avoid_materials?: string[];
    formality_floor?: string | null;
    walkability_requirement?: string | null;
    // P1 soft preferences
    avoid_patterns?: string[];
    silhouette_preference?: string | null;
  } | null;
};

export type ValidationResult = {
  valid: boolean;
  hardFails: string[];
  softPenalties: string[];
  totalPenalty: number;
  coherenceScore: number;
};

export type BatchValidationResult = {
  results: Array<{ outfitId: string; validation: ValidationResult }>;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Detect open footwear by name/subcategory tokens (case-insensitive). */
export function isOpenFootwear(item: {
  name?: string;
  subcategory?: string;
}): boolean {
  const text = `${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
  return /\b(sandals?|flip[- ]?flops?|slides?|thongs?)\b/.test(text);
}

function lc(s: string | undefined | null): string {
  return (s ?? '').toLowerCase();
}

function intersects(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const bLower = new Set(b.map((s) => s.toLowerCase()));
  return a.some((s) => bLower.has(s.toLowerCase()));
}

function getNum(v: unknown): number | undefined {
  return typeof v === 'number' && isFinite(v) ? v : undefined;
}

// ── Hard Fail Checks ────────────────────────────────────────────────────────

function checkCrossPresentation(
  items: ValidatorItem[],
  pres: string | undefined,
): string | null {
  if (!pres || pres === 'mixed') return null;
  for (const item of items) {
    if (!item.presentation_code) continue;
    if (
      (pres === 'masculine' && item.presentation_code === 'feminine') ||
      (pres === 'feminine' && item.presentation_code === 'masculine')
    ) {
      return `CROSS_PRESENTATION: item ${item.id} is "${item.presentation_code}" but user is "${pres}"`;
    }
  }
  return null;
}

function checkWeatherContradiction(
  items: ValidatorItem[],
  zone: string | undefined,
): string | null {
  if (!zone) return null;
  const isColdOrFreezing = zone === 'freezing' || zone === 'cold';
  if (isColdOrFreezing) {
    for (const item of items) {
      if (item.slot !== 'shoes') continue;
      if (isOpenFootwear(item)) {
        return `EXTREME_WEATHER_CONTRADICTION: open footwear "${item.name ?? item.subcategory ?? item.id}" in ${zone}`;
      }
    }
  }
  // Conservative: heavy outerwear in hot — only if material is clearly heavy
  if (zone === 'hot') {
    const heavyFabrics = ['wool', 'down', 'sherpa', 'fleece'];
    for (const item of items) {
      if (item.slot !== 'outerwear') continue;
      const mat = lc(item.material);
      if (mat && heavyFabrics.some((f) => mat.includes(f))) {
        return `EXTREME_WEATHER_CONTRADICTION: heavy outerwear "${mat}" in hot climate`;
      }
    }
  }
  return null;
}

function checkDressCodeMismatch(
  items: ValidatorItem[],
  requestedDressCode: string | undefined,
): string | null {
  if (!requestedDressCode) return null;
  const req = requestedDressCode.toLowerCase();
  // Only enforce for formal/business/black-tie requests
  const formalCodes = [
    'business',
    'businesscasual',
    'business casual',
    'formal',
    'blacktie',
    'black tie',
    'black-tie',
  ];
  if (!formalCodes.some((f) => req.includes(f))) return null;

  const casualCodes = ['ultracasual', 'ultra casual', 'athletic'];
  for (const item of items) {
    const dc = lc(item.dress_code);
    if (!dc) continue;
    if (casualCodes.some((c) => dc.includes(c))) {
      return `DRESS_CODE_MISMATCH: item ${item.id} dress_code "${item.dress_code}" incompatible with "${requestedDressCode}"`;
    }
  }
  return null;
}

/**
 * Mirror existing validateOutfitCore from finalize.ts EXACTLY:
 * - swimwear alone passes (shoes optional)
 * - activewear needs shoes
 * - dress/one-piece needs shoes
 * - separates need tops + bottoms + shoes
 */
function checkRequiredSlots(items: ValidatorItem[]): string | null {
  if (items.length === 0) return 'MISSING_REQUIRED_SLOTS: no items';

  const slots = new Set(items.map((i) => i.slot));
  const hasTop = slots.has('tops');
  const hasBottom = slots.has('bottoms');
  const hasShoes = slots.has('shoes');
  const hasDress = slots.has('dresses');
  const hasActivewear = slots.has('activewear');
  const hasSwimwear = slots.has('swimwear');

  // Swimwear — shoes optional
  if (hasSwimwear) return null;
  // Activewear — needs shoes
  if (hasActivewear) {
    if (hasShoes) return null;
    return 'MISSING_REQUIRED_SLOTS: activewear missing shoes';
  }
  // One-piece (dress) — needs shoes
  if (hasDress) {
    if (hasShoes) return null;
    return 'MISSING_REQUIRED_SLOTS: dress missing shoes';
  }
  // Separates — tops + bottoms + shoes
  if (hasTop && hasBottom && hasShoes) return null;

  const missing: string[] = [];
  if (!hasTop) missing.push('tops');
  if (!hasBottom) missing.push('bottoms');
  if (!hasShoes) missing.push('shoes');
  return `MISSING_REQUIRED_SLOTS: separates missing ${missing.join(', ')}`;
}

// ── P0 Hard Fail: Profile Vetoes ─────────────────────────────────────────────

const COVERAGE_PATTERNS: Record<string, RegExp> = {
  'No midriff exposure': /crop.?top|bralette|bustier/i,
  'No leg exposure above knee': /mini.?skirt|short shorts|micro/i,
  'No shoulder exposure': /strapless|tube top|off.?shoulder/i,
  'No cleavage': /deep.?v|plunging/i,
};

function checkCoverageNoGo(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const noGo = ctx.styleProfile?.coverage_no_go;
  if (!noGo || noGo.length === 0) return null;
  for (const rule of noGo) {
    const pattern = COVERAGE_PATTERNS[rule];
    if (!pattern) continue;
    for (const item of items) {
      const text = `${item.subcategory ?? ''} ${item.name ?? ''}`;
      if (pattern.test(text)) {
        return `COVERAGE_NO_GO: "${rule}" violated by item ${item.id} ("${text.trim()}")`;
      }
    }
  }
  return null;
}

// ── Navy synonym normalization ─────────────────────────────────────────────
const COLOR_SYNONYMS: Record<string, string[]> = {
  navy: ['navy blue', 'dark navy', 'midnight', 'ink'],
};

/** Extract all color strings from an item, normalized + de-duped. */
export function extractItemColors(item: ValidatorItem): string[] {
  // Prefer pre-hydrated canonical colors if available
  const a = item as any;
  if (Array.isArray(a.__canonicalColors) && a.__canonicalColors.length > 0)
    return a.__canonicalColors;
  const raw: string[] = [];
  if (item.color) raw.push(item.color);
  // Safety net: enriched items may carry extra color fields
  if (Array.isArray(a.colors)) raw.push(...a.colors);
  if (typeof a.metadata?.color === 'string') raw.push(a.metadata.color);
  if (Array.isArray(a.metadata?.colors)) raw.push(...a.metadata.colors);
  if (typeof a.enrichment?.color === 'string') raw.push(a.enrichment.color);
  if (Array.isArray(a.enrichment?.colors)) raw.push(...a.enrichment.colors);
  // Normalize + dedupe
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of raw) {
    if (typeof c !== 'string') continue;
    const n = c.trim().toLowerCase();
    if (n && !seen.has(n)) {
      seen.add(n);
      result.push(n);
    }
  }
  return result;
}

/** Expand avoided colors with known synonyms (bidirectional). */
export function expandAvoidColors(avoid: string[]): string[] {
  const expanded = new Set<string>();
  for (const c of avoid) {
    const norm = c.trim().toLowerCase();
    if (!norm) continue;
    expanded.add(norm);
    for (const [canonical, synonyms] of Object.entries(COLOR_SYNONYMS)) {
      if (norm === canonical) synonyms.forEach((s) => expanded.add(s));
      if (synonyms.includes(norm)) expanded.add(canonical);
    }
  }
  return [...expanded];
}

/**
 * Token-safe color match: does item color `ic` match avoided color `ac`?
 *
 * Rules:
 * 1. Exact normalized match → true
 * 2. Multi-word avoid phrase: one-way containment icNorm.includes(acNorm) → true
 *    (NEVER reverse: "dark blue".includes("blue") must NOT trigger when avoid="navy")
 * 3. Single-token avoid: match only if that token appears as a full token in item color
 *    e.g. avoid "navy" matches "navy blue" (token "navy" present)
 *         avoid "navy" does NOT match "blue" (token "navy" absent)
 */
export function colorMatchesSafe(ic: string, ac: string): boolean {
  const icNorm = ic.trim().toLowerCase().replace(/\s+/g, ' ');
  const acNorm = ac.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!icNorm || !acNorm) return false;

  // 1. Exact match
  if (icNorm === acNorm) return true;

  // 2. Multi-word avoid: check if item color contains the full phrase
  if (acNorm.includes(' ')) {
    return icNorm.includes(acNorm);
  }

  // 3. Single-token avoid: must appear as a full token in item color
  const icTokens = icNorm.split(/[^a-z]+/).filter(Boolean);
  return icTokens.includes(acNorm);
}

function checkAvoidColors(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const avoid = ctx.styleProfile?.avoid_colors;
  if (!avoid || avoid.length === 0) return null;
  const expandedAvoid = expandAvoidColors(avoid);
  for (const item of items) {
    const itemColors = extractItemColors(item);
    for (const ic of itemColors) {
      for (const ac of expandedAvoid) {
        if (colorMatchesSafe(ic, ac)) {
          return `AVOID_COLOR: item ${item.id} color "${ic}" matches avoided "${ac}"`;
        }
      }
    }
  }
  return null;
}

function checkAvoidMaterials(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const avoid = ctx.styleProfile?.avoid_materials;
  if (!avoid || avoid.length === 0) return null;
  for (const item of items) {
    if (!item.material) continue;
    const matLower = item.material.toLowerCase();
    for (const am of avoid) {
      if (matLower.includes(am.toLowerCase())) {
        return `AVOID_MATERIAL: item ${item.id} material "${item.material}" matches avoided "${am}"`;
      }
    }
  }
  return null;
}

const FORMALITY_RANKS = [
  'Casual',
  'Smart Casual',
  'Business Casual',
  'Business Formal',
  'Black Tie',
];

function checkFormalityFloor(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const floor = ctx.styleProfile?.formality_floor;
  if (!floor || floor === 'No minimum') return null;
  const floorIdx = FORMALITY_RANKS.indexOf(floor);
  if (floorIdx < 0) return null;
  for (const item of items) {
    // Estimate item formality from dress_code or formality_score
    let itemIdx = -1;
    if (item.dress_code) {
      const dc = item.dress_code;
      const dcIdx = FORMALITY_RANKS.findIndex(
        (r) => r.toLowerCase() === dc.toLowerCase(),
      );
      if (dcIdx >= 0) itemIdx = dcIdx;
    }
    if (itemIdx < 0 && item.formality_score != null) {
      // Map 1-10 score → 0-4 rank
      itemIdx = Math.min(
        4,
        Math.max(0, Math.round((item.formality_score / 10) * 4)),
      );
    }
    if (itemIdx < 0) continue; // no formality data → fail-open
    // 2+ ranks below floor → hard fail (1-step tolerance)
    if (floorIdx - itemIdx >= 2) {
      return `FORMALITY_FLOOR: item ${item.id} formality rank ${FORMALITY_RANKS[itemIdx] ?? itemIdx} is 2+ below floor "${floor}"`;
    }
  }
  return null;
}

function checkWalkability(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const req = ctx.styleProfile?.walkability_requirement;
  if (!req || req === 'Low') return null;
  for (const item of items) {
    if (item.slot !== 'shoes') continue;
    const text = `${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
    if (req === 'High' && /stiletto|platform heel|sky.?high/i.test(text)) {
      return `WALKABILITY: item ${item.id} ("${text.trim()}") incompatible with High walkability`;
    }
    if (req === 'Medium' && /stiletto/i.test(text)) {
      return `WALKABILITY: item ${item.id} ("${text.trim()}") incompatible with Medium walkability`;
    }
  }
  return null;
}

// ── Soft Penalty Checks ─────────────────────────────────────────────────────

function penaltyFormalityIncoherence(items: ValidatorItem[]): string | null {
  const scores = items
    .map((i) => getNum(i.formality_score))
    .filter((s): s is number => s != null);
  if (scores.length < 2) return null;
  const range = Math.max(...scores) - Math.min(...scores);
  if (range > 4) return 'FORMALITY_INCOHERENCE';
  return null;
}

function penaltyFitMismatch(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const prefs = ctx.styleProfile?.fit_preferences;
  if (!prefs || prefs.length === 0) return null;
  const prefsLower = prefs.map((p) => p.toLowerCase());
  for (const item of items) {
    if (!item.fit) continue;
    const fitLower = item.fit.toLowerCase();
    // Penalize if user wants slim and item is oversized (or vice versa)
    if (prefsLower.includes('slim') && fitLower.includes('oversized'))
      return 'FIT_PREFERENCE_MISMATCH';
    if (prefsLower.includes('oversized') && fitLower.includes('slim'))
      return 'FIT_PREFERENCE_MISMATCH';
  }
  return null;
}

function penaltyFabricClimate(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  if (!ctx.climateZone) return null;
  const zone = ctx.climateZone;
  const isHot = zone === 'hot' || zone === 'warm';
  const isCold = zone === 'cold' || zone === 'freezing';
  const hotBad = ['wool', 'cashmere', 'fleece', 'down', 'velvet', 'corduroy'];
  const coldBad = ['linen', 'chiffon', 'mesh'];

  for (const item of items) {
    const mat = lc(item.material);
    if (!mat) continue;
    if (isHot && hotBad.some((f) => mat.includes(f)))
      return 'FABRIC_CLIMATE_MISMATCH';
    if (isCold && coldBad.some((f) => mat.includes(f)))
      return 'FABRIC_CLIMATE_MISMATCH';
  }
  return null;
}

function penaltyDislikedStyle(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const disliked = ctx.styleProfile?.disliked_styles;
  if (!disliked || disliked.length === 0) return null;
  for (const item of items) {
    const tokens = [
      ...(item.style_descriptors ?? []),
      ...(item.style_archetypes ?? []),
    ];
    if (tokens.length === 0) continue;
    if (intersects(tokens, disliked)) return 'DISLIKED_STYLE_MATCH';
  }
  return null;
}

function penaltyStylePreference(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const prefs = ctx.styleProfile?.style_preferences;
  if (!prefs || prefs.length === 0) return null;
  for (const item of items) {
    const tokens = [
      ...(item.style_descriptors ?? []),
      ...(item.style_archetypes ?? []),
    ];
    if (tokens.length === 0) continue;
    if (intersects(tokens, prefs)) return null; // match is GOOD — no penalty
  }
  // No items matched any style preference
  return 'STYLE_PREFERENCE_MISMATCH';
}

function penaltyAvoidPatterns(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const avoid = ctx.styleProfile?.avoid_patterns;
  if (!avoid || avoid.length === 0) return null;
  for (const item of items) {
    const descriptors = item.style_descriptors ?? [];
    if (descriptors.length === 0) continue;
    if (intersects(descriptors, avoid)) return 'AVOID_PATTERN_MATCH';
  }
  return null;
}

function penaltySilhouetteMismatch(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const pref = ctx.styleProfile?.silhouette_preference;
  if (!pref || pref === 'Mix of both') return null;
  for (const item of items) {
    if (!item.fit) continue;
    const fitLower = item.fit.toLowerCase();
    if (pref === 'Structured' && /oversized|relaxed|loose/i.test(fitLower)) {
      return 'SILHOUETTE_MISMATCH';
    }
    if (pref === 'Relaxed' && /slim|tailored|structured/i.test(fitLower)) {
      return 'SILHOUETTE_MISMATCH';
    }
  }
  return null;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function validateOutfit(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): ValidationResult {
  // ALWAYS-ON: prove what avoid_colors + item colors the validator sees
  console.log(
    JSON.stringify({
      _tag: 'AVOID_COLOR_INPUT_PROOF',
      avoid: ctx?.styleProfile?.avoid_colors ?? null,
      firstItemId: items?.[0]?.id ?? null,
      firstItemColors: extractItemColors(items?.[0] ?? ({} as ValidatorItem)),
    }),
  );

  const hardFails: string[] = [];
  const softPenalties: string[] = [];

  // Hard fails
  const pres = checkCrossPresentation(items, ctx.userPresentation);
  if (pres) hardFails.push(pres);

  const weather = checkWeatherContradiction(items, ctx.climateZone);
  if (weather) hardFails.push(weather);

  const dc = checkDressCodeMismatch(items, ctx.requestedDressCode);
  if (dc) hardFails.push(dc);

  const slots = checkRequiredSlots(items);
  if (slots) hardFails.push(slots);

  // P0 profile vetoes (hard fails)
  const coverage = checkCoverageNoGo(items, ctx);
  if (coverage) hardFails.push(coverage);

  const avoidCol = checkAvoidColors(items, ctx);
  if (avoidCol) hardFails.push(avoidCol);

  // AVOID_COLOR_PROOF: low-volume proof log when avoid_colors is active
  if (ctx.styleProfile?.avoid_colors?.length) {
    const expanded = expandAvoidColors(ctx.styleProfile.avoid_colors);
    console.log(
      JSON.stringify({
        _tag: 'AVOID_COLOR_PROOF',
        avoidList: ctx.styleProfile.avoid_colors,
        expandedAvoidList: expanded,
        items: items.map((it) => {
          const colors = extractItemColors(it);
          return {
            id: it.id,
            name: it.name,
            slot: it.slot,
            extractedColors: colors,
            matched: colors.some((ic) =>
              expanded.some((ac) => colorMatchesSafe(ic, ac)),
            ),
          };
        }),
      }),
    );
  }

  const avoidMat = checkAvoidMaterials(items, ctx);
  if (avoidMat) hardFails.push(avoidMat);

  const formalFloor = checkFormalityFloor(items, ctx);
  if (formalFloor) hardFails.push(formalFloor);

  const walkable = checkWalkability(items, ctx);
  if (walkable) hardFails.push(walkable);

  // Soft penalties (skip if already hard-failed for efficiency)
  if (hardFails.length === 0) {
    const formality = penaltyFormalityIncoherence(items);
    if (formality) softPenalties.push(formality);

    const fit = penaltyFitMismatch(items, ctx);
    if (fit) softPenalties.push(fit);

    const fabric = penaltyFabricClimate(items, ctx);
    if (fabric) softPenalties.push(fabric);

    const disliked = penaltyDislikedStyle(items, ctx);
    if (disliked) softPenalties.push(disliked);

    const stylePref = penaltyStylePreference(items, ctx);
    if (stylePref) softPenalties.push(stylePref);

    const avoidPat = penaltyAvoidPatterns(items, ctx);
    if (avoidPat) softPenalties.push(avoidPat);

    const silhouette = penaltySilhouetteMismatch(items, ctx);
    if (silhouette) softPenalties.push(silhouette);
  }

  const totalPenalty = softPenalties.length * -3;
  const coherenceScore =
    hardFails.length > 0 ? 0 : Math.max(0, 100 + totalPenalty);

  return {
    valid: hardFails.length === 0,
    hardFails,
    softPenalties,
    totalPenalty,
    coherenceScore,
  };
}

export function validateOutfits(
  outfits: Array<{ outfitId: string; items: ValidatorItem[] }>,
  ctx: ValidatorContext,
): BatchValidationResult {
  return {
    results: outfits.map((o) => ({
      outfitId: o.outfitId,
      validation: validateOutfit(o.items, ctx),
    })),
  };
}

/**
 * Temperature to climate zone helper (pure).
 */
export function tempToClimateZone(
  tempF: number | undefined | null,
): ValidatorContext['climateZone'] | undefined {
  if (tempF == null) return undefined;
  if (tempF < 32) return 'freezing';
  if (tempF < 45) return 'cold';
  if (tempF < 55) return 'cool';
  if (tempF < 65) return 'mild';
  if (tempF < 85) return 'warm';
  return 'hot';
}
