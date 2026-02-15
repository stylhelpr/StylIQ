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
    budget_min?: number | null;
    budget_max?: number | null;
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
export function isOpenFootwear(item: { name?: string; subcategory?: string }): boolean {
  const text = `${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
  return /\b(sandals?|flip[- ]?flops?|slides?|thongs?)\b/.test(text);
}

function lc(s: string | undefined | null): string {
  return (s ?? '').toLowerCase();
}

function intersects(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const bLower = new Set(b.map(s => s.toLowerCase()));
  return a.some(s => bLower.has(s.toLowerCase()));
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
      if (mat && heavyFabrics.some(f => mat.includes(f))) {
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
  const formalCodes = ['business', 'businesscasual', 'business casual', 'formal', 'blacktie', 'black tie', 'black-tie'];
  if (!formalCodes.some(f => req.includes(f))) return null;

  const casualCodes = ['ultracasual', 'ultra casual', 'athletic'];
  for (const item of items) {
    const dc = lc(item.dress_code);
    if (!dc) continue;
    if (casualCodes.some(c => dc.includes(c))) {
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

  const slots = new Set(items.map(i => i.slot));
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

// ── Soft Penalty Checks ─────────────────────────────────────────────────────

function penaltyFormalityIncoherence(items: ValidatorItem[]): string | null {
  const scores = items
    .map(i => getNum(i.formality_score))
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
  const prefsLower = prefs.map(p => p.toLowerCase());
  for (const item of items) {
    if (!item.fit) continue;
    const fitLower = item.fit.toLowerCase();
    // Penalize if user wants slim and item is oversized (or vice versa)
    if (prefsLower.includes('slim') && fitLower.includes('oversized')) return 'FIT_PREFERENCE_MISMATCH';
    if (prefsLower.includes('oversized') && fitLower.includes('slim')) return 'FIT_PREFERENCE_MISMATCH';
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
    if (isHot && hotBad.some(f => mat.includes(f))) return 'FABRIC_CLIMATE_MISMATCH';
    if (isCold && coldBad.some(f => mat.includes(f))) return 'FABRIC_CLIMATE_MISMATCH';
  }
  return null;
}

function penaltyBudget(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): string | null {
  const max = ctx.styleProfile?.budget_max;
  if (max == null) return null;
  for (const item of items) {
    const price = getNum(item.price);
    if (price != null && price > max * 2) return 'BUDGET_MISALIGNMENT';
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

// ── Public API ──────────────────────────────────────────────────────────────

export function validateOutfit(
  items: ValidatorItem[],
  ctx: ValidatorContext,
): ValidationResult {
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

  // Soft penalties (skip if already hard-failed for efficiency)
  if (hardFails.length === 0) {
    const formality = penaltyFormalityIncoherence(items);
    if (formality) softPenalties.push(formality);

    const fit = penaltyFitMismatch(items, ctx);
    if (fit) softPenalties.push(fit);

    const fabric = penaltyFabricClimate(items, ctx);
    if (fabric) softPenalties.push(fabric);

    const budget = penaltyBudget(items, ctx);
    if (budget) softPenalties.push(budget);

    const disliked = penaltyDislikedStyle(items, ctx);
    if (disliked) softPenalties.push(disliked);

    const stylePref = penaltyStylePreference(items, ctx);
    if (stylePref) softPenalties.push(stylePref);
  }

  const totalPenalty = softPenalties.length * -3;
  const coherenceScore = hardFails.length > 0
    ? 0
    : Math.max(0, 100 + totalPenalty);

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
    results: outfits.map(o => ({
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
