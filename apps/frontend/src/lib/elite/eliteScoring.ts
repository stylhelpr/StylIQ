/**
 * Elite Scoring — Phase 2 (Rerank)
 *
 * Frontend stub for Trips Capsule surface.
 * Phase 2: scores and reranks outfits based on style context signals.
 *
 * // SYNC: keep types in sync with apps/backend-nest/src/ai/elite/eliteScoring.ts
 */

import type {CapsuleOutfit, TripPackingItem, TripWardrobeItem} from '../../types/trips';

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
  fashionState?: {
    topBrands: string[];
    avoidBrands: string[];
    topColors: string[];
    avoidColors: string[];
    topStyles?: string[];
    avoidStyles?: string[];
    topCategories: string[];
    priceBracket: string | null;
    isColdStart: boolean;
  } | null;
  wardrobeStats?: {
    dominantColors: string[];
    topCategories: string[];
    topBrands: string[];
    totalItems: number;
  };
  preferredBrands?: string[];
};

export type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
  rerank?: boolean;
  debug?: boolean;
};

export type EliteResult<T> = {
  outfits: T[];
  debug: Record<string, unknown>;
};

export type OutfitScore = {
  score: number;
  confidence: number;
  flags: string[];
};

// ── Scoring Helpers (Phase 2) ───────────────────────────────────────────────

export function colorMatches(itemColor: string, prefColor: string): boolean {
  const a = itemColor.toLowerCase();
  const b = prefColor.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export function deterministicHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

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

  // ── Brand affinity (skip gracefully when items lack brand) ──
  if (fs) {
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

  // ── Color affinity (merge fashionState + wardrobeStats sources) ──
  {
    const topColors = [
      ...(fs?.topColors ?? []),
      ...(ws?.dominantColors ?? []),
    ];
    const avoidColors = fs?.avoidColors ?? [];

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

  // ── Style affinity (items may have style_descriptors[] and/or style_archetypes[]) ──
  {
    const topStyles = fs?.topStyles ?? [];
    const avoidStyles = fs?.avoidStyles ?? [];
    if (topStyles.length > 0 || avoidStyles.length > 0) {
      signalsAvailable++;
      let styleFired = false;
      const topLower = topStyles.map(s => s.toLowerCase());
      const avoidLower = avoidStyles.map(s => s.toLowerCase());
      for (const item of outfit.items) {
        const descriptors = (item as any).style_descriptors as string[] | undefined;
        const archetypes = (item as any).style_archetypes as string[] | undefined;
        const tokens: string[] = [
          ...(Array.isArray(descriptors) ? descriptors : []),
          ...(Array.isArray(archetypes) ? archetypes : []),
        ];
        if (tokens.length === 0) continue;
        for (const token of tokens) {
          const tLower = token.toLowerCase();
          if (topLower.includes(tLower)) {
            score += 5;
            styleFired = true;
          }
          if (avoidLower.includes(tLower)) {
            score -= 8;
            styleFired = true;
          }
        }
      }
      if (styleFired) {
        signalsUsed++;
        flags.push('style');
      }
    }
  }

  // ── Presentation safety (penalize cross-presentation items) ──
  if (ctx.presentation === 'masculine' || ctx.presentation === 'feminine') {
    let presentationFired = false;
    for (const item of outfit.items) {
      const itemPres = (item as any).presentation_code as string | undefined;
      if (!itemPres) continue;
      if (
        (ctx.presentation === 'masculine' && itemPres === 'feminine') ||
        (ctx.presentation === 'feminine' && itemPres === 'masculine')
      ) {
        score -= 15;
        presentationFired = true;
      }
    }
    if (presentationFired) {
      signalsAvailable++;
      signalsUsed++;
      flags.push('presentation');
    }
  }

  // ── Formality coherence (Studio only: items have formality_score) ──
  if (env.mode === 'studio') {
    const fScores: number[] = [];
    for (const item of outfit.items) {
      const f = (item as any).formality_score;
      if (typeof f === 'number' && isFinite(f)) fScores.push(f);
    }
    if (fScores.length >= 2) {
      signalsAvailable++;
      const range = Math.max(...fScores) - Math.min(...fScores);
      if (range <= 1) {
        score += 4;
        signalsUsed++;
        flags.push('formality');
      } else if (range <= 2) {
        score += 2;
        signalsUsed++;
        flags.push('formality');
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

  return {score, confidence, flags};
}

export function stableSortOutfits<T extends CanonicalOutfit>(
  outfits: T[],
  scores: Map<string, OutfitScore>,
): T[] {
  const indexed = outfits.map((o, i) => ({o, i}));
  indexed.sort((a, b) => {
    const sa = scores.get(a.o.id)?.score ?? 0;
    const sb = scores.get(b.o.id)?.score ?? 0;
    if (sa !== sb) return sb - sa;
    return a.i - b.i; // preserve original order for ties
  });
  return indexed.map(({o}) => o);
}

// ── Post-Processor (Phase 2: Rerank) ────────────────────────────────────────

export function elitePostProcessOutfits<T>(
  outfits: T[],
  ctx: StyleContext,
  env: EliteEnv,
): EliteResult<T> {
  // Pass-through when rerank not enabled or <=1 outfit
  if (!env.rerank || outfits.length <= 1) {
    return {outfits, debug: {}};
  }

  const canonical = outfits as unknown as CanonicalOutfit[];

  // Score each outfit
  const scores = new Map<string, OutfitScore>();
  for (const outfit of canonical) {
    scores.set(outfit.id, scoreOutfit(outfit, ctx, env));
  }

  // Fail-open: if no style-profile signal fired, preserve original order.
  // slot_complete is structural (not profile-dependent) and must NOT cause reorder alone.
  const STYLE_FLAGS = ['brand', 'color', 'category', 'style', 'formality', 'presentation'];
  const hasStyleSignal = [...scores.values()].some(
    s => s.flags.some(f => STYLE_FLAGS.includes(f)),
  );
  if (!hasStyleSignal) {
    const debug: Record<string, unknown> = {};
    if (env.debug) {
      debug.scores = canonical.map(o => ({outfitId: o.id, ...scores.get(o.id)}));
      debug.skipped = 'no_style_signals';
    }
    return {outfits, debug};
  }

  // Optimization: if all scores equal after style signals fired, preserve original order
  const scoreVals = [...scores.values()];
  const baseScore = scoreVals[0]?.score ?? 0;
  if (scoreVals.every(s => s.score === baseScore)) {
    const debug: Record<string, unknown> = {};
    if (env.debug) {
      debug.scores = canonical.map(o => ({outfitId: o.id, ...scores.get(o.id)}));
      debug.skipped = 'all_scores_equal';
    }
    return {outfits, debug};
  }

  // Stable sort by score descending (originalIndex tie-break)
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

  return {outfits: reranked, debug};
}

// ── Wardrobe Stats Derivation (Trips) ───────────────────────────────────────

export function deriveWardrobeStats(
  items: TripWardrobeItem[],
): NonNullable<StyleContext['wardrobeStats']> {
  if (items.length === 0) {
    return {dominantColors: [], topCategories: [], topBrands: [], totalItems: 0};
  }

  const colorCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const item of items) {
    if (item.color) {
      colorCounts.set(item.color, (colorCounts.get(item.color) || 0) + 1);
    }
    if (item.main_category) {
      categoryCounts.set(
        item.main_category,
        (categoryCounts.get(item.main_category) || 0) + 1,
      );
    }
  }

  const topN = (map: Map<string, number>, n: number): string[] =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);

  return {
    dominantColors: topN(colorCounts, 5),
    topCategories: topN(categoryCounts, 5),
    topBrands: [], // TripWardrobeItem has no brand field
    totalItems: items.length,
  };
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
