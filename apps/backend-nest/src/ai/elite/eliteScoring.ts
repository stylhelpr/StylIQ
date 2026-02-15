/**
 * Elite Scoring — Phase 2 (Rerank)
 *
 * Shared post-processor for outfit quality scoring.
 * Phase 2: scores and reranks outfits based on style context signals.
 *
 * // SYNC: keep types in sync with apps/frontend/src/lib/elite/eliteScoring.ts
 */

import { randomUUID } from 'crypto';
import type { CreateLearningEventInput } from '../../learning/dto/learning-event.dto';

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
  /** Style profile fields for fit/fabric/budget/style scoring signals */
  styleProfile?: {
    fit_preferences: string[];
    fabric_preferences: string[];
    budget_min: number | null;
    budget_max: number | null;
    style_preferences?: string[];
    disliked_styles?: string[];
  } | null;
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

  // ── Fit preference (profile-driven) ──
  {
    const fitPrefs = ctx.styleProfile?.fit_preferences ?? [];
    if (fitPrefs.length > 0) {
      signalsAvailable++;
      let fitFired = false;
      const fitPrefsLower = fitPrefs.map(f => f.toLowerCase());
      for (const item of outfit.items) {
        const itemFit = ((item as any).fit ?? (item as any).fit_type) as string | undefined;
        if (!itemFit) continue;
        const itemFitLower = itemFit.toLowerCase();
        if (fitPrefsLower.some(f => itemFitLower.includes(f) || f.includes(itemFitLower))) {
          score += 4;
          fitFired = true;
        }
      }
      if (fitFired) {
        signalsUsed++;
        flags.push('fit');
      }
    }
  }

  // ── Fabric/material preference (profile-driven) ──
  {
    const fabricPrefs = ctx.styleProfile?.fabric_preferences ?? [];
    if (fabricPrefs.length > 0) {
      signalsAvailable++;
      let fabricFired = false;
      const fabricPrefsLower = fabricPrefs.map(f => f.toLowerCase());
      for (const item of outfit.items) {
        const itemMaterial = ((item as any).material ?? (item as any).fabric_blend) as string | undefined;
        if (!itemMaterial) continue;
        const itemMatLower = itemMaterial.toLowerCase();
        if (fabricPrefsLower.some(f => itemMatLower.includes(f) || f.includes(itemMatLower))) {
          score += 3;
          fabricFired = true;
        }
      }
      if (fabricFired) {
        signalsUsed++;
        flags.push('fabric');
      }
    }
  }

  // ── Style preferences (profile-driven, conservative) ──
  {
    const stylePrefs = ctx.styleProfile?.style_preferences ?? [];
    if (stylePrefs.length > 0) {
      signalsAvailable++;
      let prefFired = false;
      const prefsLower = stylePrefs.map(s => s.toLowerCase());
      for (const item of outfit.items) {
        const descriptors = (item as any).style_descriptors as string[] | undefined;
        const archetypes = (item as any).style_archetypes as string[] | undefined;
        const tokens: string[] = [
          ...(Array.isArray(descriptors) ? descriptors : []),
          ...(Array.isArray(archetypes) ? archetypes : []),
        ];
        for (const token of tokens) {
          if (prefsLower.includes(token.toLowerCase())) {
            score += 3;
            prefFired = true;
          }
        }
      }
      if (prefFired) {
        signalsUsed++;
        flags.push('style_preference');
      }
    }
  }

  // ── Disliked styles (profile-driven penalty, conservative) ──
  {
    const disliked = ctx.styleProfile?.disliked_styles ?? [];
    if (disliked.length > 0) {
      signalsAvailable++;
      let dislikedFired = false;
      const dislikedLower = disliked.map(s => s.toLowerCase());
      for (const item of outfit.items) {
        const descriptors = (item as any).style_descriptors as string[] | undefined;
        const archetypes = (item as any).style_archetypes as string[] | undefined;
        const tokens: string[] = [
          ...(Array.isArray(descriptors) ? descriptors : []),
          ...(Array.isArray(archetypes) ? archetypes : []),
        ];
        for (const token of tokens) {
          if (dislikedLower.includes(token.toLowerCase())) {
            score -= 6;
            dislikedFired = true;
          }
        }
      }
      if (dislikedFired) {
        signalsUsed++;
        flags.push('disliked_style');
      }
    }
  }

  // ── Dress-code coherence (extends formality — Studio only) ──
  if (env.mode === 'studio') {
    const dressCodes: string[] = [];
    for (const item of outfit.items) {
      const dc = (item as any).dress_code as string | undefined;
      if (dc) dressCodes.push(dc.toLowerCase());
    }
    if (dressCodes.length >= 2) {
      signalsAvailable++;
      const unique = new Set(dressCodes);
      if (unique.size === 1) {
        score += 3;
        signalsUsed++;
        flags.push('dress_code');
      } else if (unique.size >= 2) {
        // Penalize conflicting dress codes (e.g., "athletic" + "business")
        const CONFLICTING_PAIRS = [
          ['athletic', 'business'], ['athletic', 'formal'],
          ['casual', 'formal'], ['beach', 'business'],
        ];
        const codes = [...unique];
        const hasConflict = CONFLICTING_PAIRS.some(([a, b]) =>
          codes.includes(a) && codes.includes(b),
        );
        if (hasConflict) {
          score -= 5;
          signalsUsed++;
          flags.push('dress_code');
        }
      }
    }
  }

  // ── Budget range (profile-driven) ──
  {
    const budgetMin = ctx.styleProfile?.budget_min;
    const budgetMax = ctx.styleProfile?.budget_max;
    if (budgetMin != null || budgetMax != null) {
      signalsAvailable++;
      let budgetFired = false;
      for (const item of outfit.items) {
        const price = (item as any).price as number | undefined;
        if (typeof price !== 'number' || !isFinite(price)) continue;
        if (budgetMax != null && price > budgetMax * 1.5) {
          score -= 4;
          budgetFired = true;
        } else if (
          (budgetMin == null || price >= budgetMin) &&
          (budgetMax == null || price <= budgetMax)
        ) {
          score += 2;
          budgetFired = true;
        }
      }
      if (budgetFired) {
        signalsUsed++;
        flags.push('budget');
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

export function stableSortOutfits<T extends CanonicalOutfit>(
  outfits: T[],
  scores: Map<string, OutfitScore>,
): T[] {
  const indexed = outfits.map((o, i) => ({ o, i }));
  indexed.sort((a, b) => {
    const sa = scores.get(a.o.id)?.score ?? 0;
    const sb = scores.get(b.o.id)?.score ?? 0;
    if (sa !== sb) return sb - sa;
    return a.i - b.i; // preserve original order for ties
  });
  return indexed.map(({ o }) => o);
}

// ── Post-Processor (Phase 2: Rerank) ────────────────────────────────────────

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

  // Fail-open: if no style-profile signal fired, preserve original order.
  // slot_complete is structural (not profile-dependent) and must NOT cause reorder alone.
  const STYLE_FLAGS = ['brand', 'color', 'category', 'style', 'formality', 'presentation', 'fit', 'fabric', 'dress_code', 'budget', 'style_preference', 'disliked_style'];
  const hasStyleSignal = [...scores.values()].some(
    s => s.flags.some(f => STYLE_FLAGS.includes(f)),
  );
  if (!hasStyleSignal) {
    const debug: Record<string, unknown> = {};
    if (env.debug) {
      debug.scores = canonical.map(o => ({ outfitId: o.id, ...scores.get(o.id) }));
      debug.skipped = 'no_style_signals';
    }
    return { outfits, debug };
  }

  // Optimization: if all scores equal after style signals fired, preserve original order
  const scoreVals = [...scores.values()];
  const baseScore = scoreVals[0]?.score ?? 0;
  if (scoreVals.every(s => s.score === baseScore)) {
    const debug: Record<string, unknown> = {};
    if (env.debug) {
      debug.scores = canonical.map(o => ({ outfitId: o.id, ...scores.get(o.id) }));
      debug.skipped = 'all_scores_equal';
    }
    return { outfits, debug };
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

  return { outfits: reranked, debug };
}

// ── Exposure Event Builder ──────────────────────────────────────────────────

export function buildEliteExposureEvent(
  userId: string,
  outfits: CanonicalOutfit[],
  env: EliteEnv,
): CreateLearningEventInput {
  const allItemIds = outfits.flatMap(o => o.items.map(i => i.id));
  const canonicalSlots = outfits.flatMap(o => o.items.map(i => i.slot));

  return {
    userId,
    eventType: 'ELITE_SUGGESTION_SERVED',
    entityType: 'outfit',
    entityId: env.requestId ?? randomUUID(),
    signalPolarity: 0,
    signalWeight: 0,
    sourceFeature: 'elite_scoring',
    extractedFeatures: {
      categories: canonicalSlots,
      item_ids: allItemIds,
    },
    context: {
      occasion: env.mode,
      temp_f: typeof env.weather === 'object' && env.weather !== null
        ? (env.weather as { temp?: number }).temp
        : undefined,
      schema_version: 1,
      pipeline_version: 1,
    },
  };
}

// ── Stylist Adapters ─────────────────────────────────────────────────────────
// Stylist items use: { id, name, imageUrl, category: 'top'|'bottom'|'shoes'|... }

const STYLIST_TO_CANONICAL: Record<string, CanonicalSlot> = {
  top: 'tops',
  bottom: 'bottoms',
  shoes: 'shoes',
  outerwear: 'outerwear',
  dress: 'dresses',
  accessory: 'accessories',
  activewear: 'activewear',
  swimwear: 'swimwear',
};

const CANONICAL_TO_STYLIST: Record<CanonicalSlot, string> = {
  tops: 'top',
  bottoms: 'bottom',
  shoes: 'shoes',
  outerwear: 'outerwear',
  dresses: 'dress',
  accessories: 'accessory',
  activewear: 'activewear',
  swimwear: 'swimwear',
};

export function normalizeStylistOutfit(outfit: any): CanonicalOutfit {
  return {
    ...outfit,
    items: (outfit.items ?? []).map((item: any) => ({
      ...item,
      slot: STYLIST_TO_CANONICAL[item.category] ?? 'accessories',
    })),
  };
}

export function denormalizeStylistOutfit(outfit: CanonicalOutfit): any {
  const { items, ...rest } = outfit;
  return {
    ...rest,
    items: items.map(({ slot, ...item }) => ({
      ...item,
      category: CANONICAL_TO_STYLIST[slot] ?? 'accessory',
    })),
  };
}

// ── Studio Adapters ──────────────────────────────────────────────────────────
// Studio items use: { id, label, main_category: 'Tops'|'Bottoms'|..., ... }
// Studio outfit: { outfit_id, title, items, why, missing? }

const STUDIO_MAIN_CAT_TO_CANONICAL: Record<string, CanonicalSlot> = {
  Tops: 'tops',
  Bottoms: 'bottoms',
  Shoes: 'shoes',
  Outerwear: 'outerwear',
  Dresses: 'dresses',
  Accessories: 'accessories',
  Activewear: 'activewear',
  Swimwear: 'swimwear',
  Skirts: 'bottoms',
  Bags: 'accessories',
  Headwear: 'accessories',
  Jewelry: 'accessories',
  Formalwear: 'dresses',
  TraditionalWear: 'dresses',
  Loungewear: 'tops',
  Sleepwear: 'tops',
  Maternity: 'tops',
  Unisex: 'tops',
  Costumes: 'tops',
  Undergarments: 'accessories',
};

export function normalizeStudioOutfit(outfit: any): CanonicalOutfit {
  return {
    ...outfit,
    id: outfit.outfit_id ?? outfit.id,
    items: (outfit.items ?? []).map((item: any) => ({
      ...item,
      slot: STUDIO_MAIN_CAT_TO_CANONICAL[item.main_category] ?? 'accessories',
    })),
  };
}

export function denormalizeStudioOutfit(outfit: CanonicalOutfit): any {
  const { slot: _unusedSlot, items, id, ...rest } = outfit as any;
  return {
    ...rest,
    id,
    outfit_id: rest.outfit_id ?? id,
    items: items.map(({ slot, ...item }: any) => item),
  };
}
