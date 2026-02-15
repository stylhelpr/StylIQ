/**
 * Elite Scoring — Phase 0 (NO-OP)
 *
 * Frontend stub for Trips Capsule surface.
 * Phase 0: returns outfits unchanged. Wired behind ELITE_SCORING_TRIPS flag.
 *
 * // SYNC: keep types in sync with apps/backend-nest/src/ai/elite/eliteScoring.ts
 */

import type {CapsuleOutfit, TripPackingItem} from '../../types/trips';

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
  return {outfits, debug: {}};
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
