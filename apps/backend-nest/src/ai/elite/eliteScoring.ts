/**
 * Elite Scoring — Phase 0 (NO-OP)
 *
 * Shared post-processor for outfit quality scoring.
 * Phase 0: returns outfits unchanged. Wired behind feature flags.
 *
 * // SYNC: keep types in sync with apps/frontend/src/lib/elite/eliteScoring.ts
 */

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
};

export type EliteEnv = {
  mode: 'stylist' | 'trips' | 'studio';
  weather?: unknown;
  activities?: unknown;
  requestId?: string;
};

export type EliteResult<T> = {
  outfits: T[];
  debug: Record<string, unknown>;
};

// ── NO-OP Post-Processor ─────────────────────────────────────────────────────

export function elitePostProcessOutfits<T>(
  outfits: T[],
  _ctx: StyleContext,
  _env: EliteEnv,
): EliteResult<T> {
  // Phase 0: pass-through, no scoring
  return { outfits, debug: {} };
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
