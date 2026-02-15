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

  // ── Brand affinity (Studio only: items have brand field) ──
  if (env.mode === 'studio' && fs) {
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

  // ── Color affinity ──
  {
    const topColors = env.mode === 'studio'
      ? (fs?.topColors ?? [])
      : env.mode === 'trips'
        ? (ws?.dominantColors ?? [])
        : [];
    const avoidColors = env.mode === 'studio' ? (fs?.avoidColors ?? []) : [];

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
  return [...outfits].sort((a, b) => {
    const sa = scores.get(a.id)?.score ?? 0;
    const sb = scores.get(b.id)?.score ?? 0;
    if (sa !== sb) return sb - sa;
    return deterministicHash(a.id + ':' + a.items.map(i => i.id).sort().join(','))
         - deterministicHash(b.id + ':' + b.items.map(i => i.id).sort().join(','));
  });
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
