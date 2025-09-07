// apps/backend-nest/src/wardrobe/logic/scoring.ts
// scoring.ts — item scoring + reranking (constraints + user style + weather)

import type { ParsedConstraints } from './constraints';
import { scoreItemForStyle, type UserStyle } from './style';
import { scoreItemForWeather, type WeatherContext } from './weather';

type CatalogItemLite = {
  index: number;
  main_category?: string;
  subcategory?: string;
  shoe_style?: string;
  dress_code?: string;
  color?: string;
  color_family?: string;
  formality_score?: number;

  // carry-through fields preserved during mapping
  id?: string;
  label?: string;
  image_url?: string;

  // optional extras used by weather/style scorers
  brand?: string;
  material?: string;
  sleeve_length?: string;
  layering?: string;
  waterproof_rating?: number | string;
  rain_ok?: boolean;
};

const text = (val: any) => (val ?? '').toString().trim();

/** ───────────────────────────────────────────────────────────────────────────
 * ORIGINAL constraint-based scorer (unchanged)
 * ---------------------------------------------------------------------------
 */
export function scoreItemForConstraints(
  item: CatalogItemLite,
  c: ParsedConstraints,
  baseBias: number,
): number {
  let score = baseBias;
  const cat = text(item.main_category);
  const sub = text(item.subcategory);
  const shoe = text(item.shoe_style);
  const dress = text(item.dress_code);
  const color = (text(item.color) || text(item.color_family)).toLowerCase();
  const f = Number(item.formality_score ?? NaN);

  // hard negatives
  if (c.excludeLoafers && (sub === 'Loafers' || shoe === 'Loafer')) score -= 50;
  if (c.excludeSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
    score -= 40;
  if (c.excludeBoots && (sub === 'Boots' || shoe === 'Boot')) score -= 40;
  if (c.excludeBrown && color.includes('brown')) score -= 12;

  // positives
  if (c.wantsLoafers) {
    if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
    if (c.wantsBrown && color.includes('brown')) score += 10;
    if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
      score -= 15;
  }
  if (c.wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
    score += 35;
  if (c.wantsBoots && (sub === 'Boots' || shoe === 'Boot')) score += 35;

  if (c.wantsBlazer) {
    if (sub === 'Blazer' || sub === 'Sport Coat') {
      score += 40;
      if (c.colorWanted === 'Blue' && color.includes('blue')) score += 12;
    } else if (cat === 'Outerwear') {
      score -= 12;
    }
  }

  if (c.colorWanted && color.includes(c.colorWanted.toLowerCase())) score += 10;

  // dress code bias + formality proximity
  if (c.dressWanted) {
    if (dress === c.dressWanted) score += 10;
    if (c.dressWanted === 'BusinessCasual' && sub === 'Sneakers') score -= 8;
    if (c.dressWanted === 'BusinessCasual' && sub === 'Jeans') score -= 6;
  }
  if (c.dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
    const dist = Math.abs(f - 7); // prefer 6–8
    score += Math.max(0, 10 - 3 * dist);
  }
  return score;
}

/** Basic constraints-only reranker (kept for compatibility) */
export function rerankCatalog<T extends CatalogItemLite>(
  catalog: T[],
  c: ParsedConstraints,
): T[] {
  const scored = catalog.map((item, i) => ({
    item,
    score: scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
}

/** ───────────────────────────────────────────────────────────────────────────
 * NEW: Context blend (constraints + user style + weather)
 * ---------------------------------------------------------------------------
 */

export type ContextWeights =
  | { constraintsWeight: number; styleWeight: number; weatherWeight: number } // new shape
  | { constraints: number; style: number; weather: number }; // legacy shape

export const DEFAULT_CONTEXT_WEIGHTS: {
  constraintsWeight: number;
  styleWeight: number;
  weatherWeight: number;
} = {
  constraintsWeight: 1.0, // always honor query intent
  styleWeight: 1.2, // push more toward user prefs
  weatherWeight: 0.8, // weather is nudging, not overriding
};

function normalizeWeights(w?: ContextWeights): {
  constraintsWeight: number;
  styleWeight: number;
  weatherWeight: number;
} {
  if (!w) return DEFAULT_CONTEXT_WEIGHTS;
  if ('constraints' in w) {
    return {
      constraintsWeight: w.constraints,
      styleWeight: w.style,
      weatherWeight: w.weather,
    };
  }
  return w;
}

/**
 * Drop-in replacement that adds style + weather influence.
 */
export function rerankCatalogWithContext<T extends CatalogItemLite>(
  catalog: T[],
  c: ParsedConstraints,
  opts?: {
    userStyle?: UserStyle;
    weather?: WeatherContext;
    weights?: ContextWeights;
    useWeather?: boolean; // make explicit
  },
): T[] {
  const W = normalizeWeights(opts?.weights);

  const scored = catalog.map((item, i) => {
    const baseBias = (catalog.length - i) * 0.01;

    const constraintsScore = scoreItemForConstraints(item, c, baseBias);
    const styleScore = scoreItemForStyle(item as any, opts?.userStyle);

    const weatherScore =
      opts?.useWeather && opts?.weather
        ? scoreItemForWeather(item as any, opts.weather)
        : 0;

    const total =
      W.constraintsWeight * constraintsScore +
      W.styleWeight * styleScore +
      W.weatherWeight * weatherScore;

    // 🪵 Debug log
    console.log(
      `[RERANK] ${item.label}`,
      `constraints=${constraintsScore.toFixed(2)}`,
      `style=${styleScore.toFixed(2)}`,
      `weather=${weatherScore.toFixed(2)}`,
      `→ total=${total.toFixed(2)}`,
      `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
    );

    return { item, score: total };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
}
