// apps/backend-nest/src/wardrobe/logic/scoring.ts
// scoring.ts — item scoring + reranking (constraints + user style + weather + feedback)

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

/** Map constraint dress intent to style.dressBias so style scoring can apply formality penalties */
function mapDressFromConstraints(
  d?: string,
): 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business' | undefined {
  if (!d) return undefined;
  const lc = d.toLowerCase();
  if (lc.includes('ultracasual')) return 'Casual';
  if (lc === 'casual') return 'Casual';
  if (lc === 'smartcasual' || lc === 'smart casual') return 'SmartCasual';
  if (lc === 'businesscasual' || lc === 'business casual')
    return 'BusinessCasual';
  if (lc === 'business') return 'Business';
  return undefined;
}

/** Infer a sensible dressBias when dressWanted is missing but other intent signals exist */
function inferBiasFromConstraints(c: ParsedConstraints) {
  const explicit = mapDressFromConstraints((c as any).dressWanted);
  if (explicit) return explicit;

  // Heuristics from other constraint signals
  if ((c as any).wantsBlazer) return 'BusinessCasual';
  if ((c as any).wantsLoafers) return 'SmartCasual';
  if ((c as any).wantsSneakers && !(c as any).wantsBlazer) return 'Casual';

  // Safe middle if we have nothing else
  return 'SmartCasual';
}

/** ─────────────────────────────────────────────────────────────
 * Constraints scorer
 * ──────────────────────────────────────────────────────────── */
export function scoreItemForConstraints(
  item: CatalogItemLite,
  c: ParsedConstraints,
  baseBias: number,
): number {
  let score = baseBias;
  const cat = text(item.main_category).toLowerCase();
  const sub = text(item.subcategory).toLowerCase();
  const shoe = text(item.shoe_style).toLowerCase();
  const dress = text(item.dress_code);
  const color = (text(item.color) || text(item.color_family)).toLowerCase();
  const label = (item.label ?? '').toLowerCase();
  const f = Number(item.formality_score ?? NaN);

  // hard negatives
  if ((c as any).excludeLoafers && (sub === 'loafers' || shoe === 'loafer'))
    score -= 50;
  if ((c as any).excludeSneakers && (sub === 'sneakers' || shoe === 'sneaker'))
    score -= 40;
  if ((c as any).excludeBoots && (sub === 'boots' || shoe === 'boot'))
    score -= 40;
  if ((c as any).excludeBrown && color.includes('brown')) score -= 12;

  // positives
  if ((c as any).wantsLoafers) {
    if (sub === 'loafers' || shoe === 'loafer') score += 50;
    if ((c as any).wantsBrown && color.includes('brown')) score += 10;
    if (cat === 'shoes' && !(sub === 'loafers' || shoe === 'loafer'))
      score -= 15;
  }
  if ((c as any).wantsSneakers && (sub === 'sneakers' || shoe === 'sneaker'))
    score += 35;
  if ((c as any).wantsBoots && (sub === 'boots' || shoe === 'boot'))
    score += 35;

  if ((c as any).wantsBlazer) {
    if (sub === 'blazer' || sub === 'sport coat') {
      score += 40;
      if ((c as any).colorWanted === 'Blue' && color.includes('blue'))
        score += 12;
    } else if (cat === 'outerwear') {
      score -= 12;
    }
  }

  if (
    (c as any).colorWanted &&
    color.includes((c as any).colorWanted.toLowerCase())
  )
    score += 10;

  // dress code bias + formality proximity
  if ((c as any).dressWanted) {
    if (dress === (c as any).dressWanted) score += 10;
    if ((c as any).dressWanted === 'BusinessCasual' && sub === 'sneakers')
      score -= 8;
    if ((c as any).dressWanted === 'BusinessCasual' && sub === 'jeans')
      score -= 6;
  }
  if ((c as any).dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
    const dist = Math.abs(f - 7); // prefer 6–8
    score += Math.max(0, 10 - 3 * dist);
  }

  // soft guardrails on upscale intents
  const upscale =
    (c as any).dressWanted &&
    ['BusinessCasual', 'Business'].includes((c as any).dressWanted);
  if (upscale) {
    if (sub === 'hoodie') score -= 20;
    if (sub === 'windbreaker') score -= 15;
    if (cat === 'shorts') score -= 20;
    if ((c as any).dressWanted === 'Business' && sub === 'sneakers')
      score -= 12;
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

/** ─────────────────────────────────────────────────────────────
 * Context blend (constraints + style + weather + feedback)
 * ──────────────────────────────────────────────────────────── */

export type ContextWeights =
  | {
      constraintsWeight: number;
      styleWeight: number;
      weatherWeight: number;
      feedbackWeight?: number;
    }
  | { constraints: number; style: number; weather: number; feedback?: number };

export const DEFAULT_CONTEXT_WEIGHTS = {
  constraintsWeight: 2.0, // strong anchor
  styleWeight: 1.0, // direct [0..1] style score
  weatherWeight: 0.8, // gentle nudge
  feedbackWeight: 1.0, // ±0.2 cap
};

function normalizeWeights(w?: ContextWeights) {
  if (!w) return DEFAULT_CONTEXT_WEIGHTS;
  if ('constraints' in w) {
    return {
      constraintsWeight: (w as any).constraints,
      styleWeight: (w as any).style,
      weatherWeight: (w as any).weather,
      feedbackWeight:
        (w as any).feedback ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
    };
  }
  return {
    constraintsWeight: (w as any).constraintsWeight,
    styleWeight: (w as any).styleWeight,
    weatherWeight: (w as any).weatherWeight,
    feedbackWeight:
      (w as any).feedbackWeight ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
  };
}

/**
 * Main reranker
 */
export function rerankCatalogWithContext<T extends CatalogItemLite>(
  catalog: T[],
  c: ParsedConstraints,
  opts?: {
    userStyle?: UserStyle;
    weather?: WeatherContext;
    weights?: ContextWeights;
    useWeather?: boolean;
    userPrefs?: Map<string, number>;
  },
): T[] {
  const W = normalizeWeights(opts?.weights);

  const scored = catalog
    .map((item, i) => {
      const baseBias = (catalog.length - i) * 0.01;

      const constraintsScore = scoreItemForConstraints(item, c, baseBias);

      // 🚫 If scoreItemForConstraints killed it, skip from results
      if (constraintsScore <= -9999) return null;

      // bridge constraint intent into style if needed
      const inferredBias = inferBiasFromConstraints(c);
      const effectiveStyle: UserStyle | undefined = opts?.userStyle
        ? {
            ...opts.userStyle,
            dressBias: (opts.userStyle.dressBias ?? inferredBias) as any,
          }
        : ({ dressBias: inferredBias } as UserStyle);

      const styleScoreNorm = scoreItemForStyle(item as any, effectiveStyle);

      const weatherScore =
        opts?.useWeather && opts?.weather
          ? scoreItemForWeather(item as any, opts.weather)
          : 0;

      const feedbackRaw = opts?.userPrefs?.get(item.id ?? '') ?? 0;
      const feedbackNorm = Math.max(-1, Math.min(1, feedbackRaw / 5));
      const feedbackScaled = feedbackNorm * 0.2;

      const total =
        W.constraintsWeight * constraintsScore +
        W.styleWeight * styleScoreNorm +
        W.weatherWeight * weatherScore +
        (W.feedbackWeight ?? 1) * feedbackScaled;

      console.log(
        `[RERANK] ${item.label}`,
        `constraints=${constraintsScore.toFixed(2)}`,
        `style=${styleScoreNorm.toFixed(2)}`,
        `weather=${weatherScore.toFixed(2)}`,
        `feedbackRaw=${feedbackRaw}`,
        `feedbackScaled=${feedbackScaled.toFixed(2)}`,
        `→ total=${total.toFixed(2)}`,
        `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
      );

      return { item, score: total };
    })
    .filter((s): s is { item: T; score: number } => s !== null);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
}

///////////////////

// // apps/backend-nest/src/wardrobe/logic/scoring.ts
// // scoring.ts — item scoring + reranking (constraints + user style + weather + feedback)

// import type { ParsedConstraints } from './constraints';
// import { scoreItemForStyle, type UserStyle } from './style';
// import { scoreItemForWeather, type WeatherContext } from './weather';

// type CatalogItemLite = {
//   index: number;
//   main_category?: string;
//   subcategory?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   color?: string;
//   color_family?: string;
//   formality_score?: number;

//   // carry-through fields preserved during mapping
//   id?: string;
//   label?: string;
//   image_url?: string;

//   // optional extras used by weather/style scorers
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string;
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// const text = (val: any) => (val ?? '').toString().trim();

// /** Map constraint dress intent to style.dressBias so style scoring can apply formality penalties */
// function mapDressFromConstraints(
//   d?: string,
// ): 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business' | undefined {
//   if (!d) return undefined;
//   const lc = d.toLowerCase();
//   if (lc.includes('ultracasual')) return 'Casual';
//   if (lc === 'casual') return 'Casual';
//   if (lc === 'smartcasual' || lc === 'smart casual') return 'SmartCasual';
//   if (lc === 'businesscasual' || lc === 'business casual')
//     return 'BusinessCasual';
//   if (lc === 'business') return 'Business';
//   return undefined;
// }

// /** Infer a sensible dressBias when dressWanted is missing but other intent signals exist */
// function inferBiasFromConstraints(c: ParsedConstraints) {
//   const explicit = mapDressFromConstraints((c as any).dressWanted);
//   if (explicit) return explicit;

//   // Heuristics from other constraint signals
//   if ((c as any).wantsBlazer) return 'BusinessCasual';
//   if ((c as any).wantsLoafers) return 'SmartCasual';
//   if ((c as any).wantsSneakers && !(c as any).wantsBlazer) return 'Casual';

//   // Safe middle if we have nothing else
//   return 'SmartCasual';
// }

// /** ─────────────────────────────────────────────────────────────
//  * Constraints scorer
//  * ──────────────────────────────────────────────────────────── */
// export function scoreItemForConstraints(
//   item: CatalogItemLite,
//   c: ParsedConstraints,
//   baseBias: number,
// ): number {
//   let score = baseBias;
//   const cat = text(item.main_category);
//   const sub = text(item.subcategory);
//   const shoe = text(item.shoe_style);
//   const dress = text(item.dress_code);
//   const color = (text(item.color) || text(item.color_family)).toLowerCase();
//   const f = Number(item.formality_score ?? NaN);

//   // 🚫 HARD FILTER: remove heels for male users
//   if ((c as any).userGender === 'male') {
//     if (sub.toLowerCase().includes('heel') || shoe?.toLowerCase() === 'heel') {
//       return -9999; // kill the score completely
//     }
//   }

//   // hard negatives
//   if ((c as any).excludeLoafers && (sub === 'Loafers' || shoe === 'Loafer'))
//     score -= 50;
//   if ((c as any).excludeSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score -= 40;
//   if ((c as any).excludeBoots && (sub === 'Boots' || shoe === 'Boot'))
//     score -= 40;
//   if ((c as any).excludeBrown && color.includes('brown')) score -= 12;

//   // positives
//   if ((c as any).wantsLoafers) {
//     if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
//     if ((c as any).wantsBrown && color.includes('brown')) score += 10;
//     if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
//       score -= 15;
//   }
//   if ((c as any).wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score += 35;
//   if ((c as any).wantsBoots && (sub === 'Boots' || shoe === 'Boot'))
//     score += 35;

//   if ((c as any).wantsBlazer) {
//     if (sub === 'Blazer' || sub === 'Sport Coat') {
//       score += 40;
//       if ((c as any).colorWanted === 'Blue' && color.includes('blue'))
//         score += 12;
//     } else if (cat === 'Outerwear') {
//       score -= 12;
//     }
//   }

//   if (
//     (c as any).colorWanted &&
//     color.includes((c as any).colorWanted.toLowerCase())
//   )
//     score += 10;

//   // dress code bias + formality proximity
//   if ((c as any).dressWanted) {
//     if (dress === (c as any).dressWanted) score += 10;
//     if ((c as any).dressWanted === 'BusinessCasual' && sub === 'Sneakers')
//       score -= 8;
//     if ((c as any).dressWanted === 'BusinessCasual' && sub === 'Jeans')
//       score -= 6;
//   }
//   if ((c as any).dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
//     const dist = Math.abs(f - 7); // prefer 6–8
//     score += Math.max(0, 10 - 3 * dist);
//   }

//   // soft guardrails on upscale intents
//   const upscale =
//     (c as any).dressWanted &&
//     ['BusinessCasual', 'Business'].includes((c as any).dressWanted);
//   if (upscale) {
//     if (sub === 'Hoodie') score -= 20;
//     if (sub === 'Windbreaker') score -= 15;
//     if (cat === 'Shorts') score -= 20;
//     if ((c as any).dressWanted === 'Business' && sub === 'Sneakers')
//       score -= 12;
//   }

//   return score;
// }

// /** Basic constraints-only reranker (kept for compatibility) */
// export function rerankCatalog<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
// ): T[] {
//   const scored = catalog.map((item, i) => ({
//     item,
//     score: scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
//   }));
//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
// }

// /** ─────────────────────────────────────────────────────────────
//  * Context blend (constraints + style + weather + feedback)
//  * ──────────────────────────────────────────────────────────── */

// export type ContextWeights =
//   | {
//       constraintsWeight: number;
//       styleWeight: number;
//       weatherWeight: number;
//       feedbackWeight?: number;
//     }
//   | { constraints: number; style: number; weather: number; feedback?: number };

// export const DEFAULT_CONTEXT_WEIGHTS = {
//   constraintsWeight: 2.0, // strong anchor
//   styleWeight: 1.0, // direct [0..1] style score
//   weatherWeight: 0.8, // gentle nudge
//   feedbackWeight: 1.0, // ±0.2 cap
// };

// function normalizeWeights(w?: ContextWeights) {
//   if (!w) return DEFAULT_CONTEXT_WEIGHTS;
//   if ('constraints' in w) {
//     return {
//       constraintsWeight: (w as any).constraints,
//       styleWeight: (w as any).style,
//       weatherWeight: (w as any).weather,
//       feedbackWeight:
//         (w as any).feedback ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//     };
//   }
//   return {
//     constraintsWeight: (w as any).constraintsWeight,
//     styleWeight: (w as any).styleWeight,
//     weatherWeight: (w as any).weatherWeight,
//     feedbackWeight:
//       (w as any).feedbackWeight ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//   };
// }

// /**
//  * Main reranker
//  */
// export function rerankCatalogWithContext<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
//   opts?: {
//     userStyle?: UserStyle;
//     weather?: WeatherContext;
//     weights?: ContextWeights;
//     useWeather?: boolean;
//     userPrefs?: Map<string, number>;
//   },
// ): T[] {
//   const W = normalizeWeights(opts?.weights);

//   const scored = catalog
//     .map((item, i) => {
//       const baseBias = (catalog.length - i) * 0.01;

//       const constraintsScore = scoreItemForConstraints(item, c, baseBias);

//       // 🚫 If scoreItemForConstraints killed it, skip from results
//       if (constraintsScore <= -9999) return null;

//       // bridge constraint intent into style if needed
//       const inferredBias = inferBiasFromConstraints(c);
//       const effectiveStyle: UserStyle | undefined = opts?.userStyle
//         ? {
//             ...opts.userStyle,
//             dressBias: (opts.userStyle.dressBias ?? inferredBias) as any,
//           }
//         : ({ dressBias: inferredBias } as UserStyle);

//       const styleScoreNorm = scoreItemForStyle(item as any, effectiveStyle);

//       const weatherScore =
//         opts?.useWeather && opts?.weather
//           ? scoreItemForWeather(item as any, opts.weather)
//           : 0;

//       const feedbackRaw = opts?.userPrefs?.get(item.id ?? '') ?? 0;
//       const feedbackNorm = Math.max(-1, Math.min(1, feedbackRaw / 5));
//       const feedbackScaled = feedbackNorm * 0.2;

//       const total =
//         W.constraintsWeight * constraintsScore +
//         W.styleWeight * styleScoreNorm +
//         W.weatherWeight * weatherScore +
//         (W.feedbackWeight ?? 1) * feedbackScaled;

//       console.log(
//         `[RERANK] ${item.label}`,
//         `constraints=${constraintsScore.toFixed(2)}`,
//         `style=${styleScoreNorm.toFixed(2)}`,
//         `weather=${weatherScore.toFixed(2)}`,
//         `feedbackRaw=${feedbackRaw}`,
//         `feedbackScaled=${feedbackScaled.toFixed(2)}`,
//         `→ total=${total.toFixed(2)}`,
//         `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
//       );

//       return { item, score: total };
//     })
//     .filter((s): s is { item: T; score: number } => s !== null);

//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
// }

///////////////////////

// // apps/backend-nest/src/wardrobe/logic/scoring.ts
// // scoring.ts — item scoring + reranking (constraints + user style + weather + feedback)

// import type { ParsedConstraints } from './constraints';
// import { scoreItemForStyle, type UserStyle } from './style';
// import { scoreItemForWeather, type WeatherContext } from './weather';

// type CatalogItemLite = {
//   index: number;
//   main_category?: string;
//   subcategory?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   color?: string;
//   color_family?: string;
//   formality_score?: number;

//   // carry-through fields preserved during mapping
//   id?: string;
//   label?: string;
//   image_url?: string;

//   // optional extras used by weather/style scorers
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string;
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// const text = (val: any) => (val ?? '').toString().trim();

// /** Map constraint dress intent to style.dressBias so style scoring can apply formality penalties */
// function mapDressFromConstraints(
//   d?: string,
// ): 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business' | undefined {
//   if (!d) return undefined;
//   const lc = d.toLowerCase();
//   if (lc.includes('ultracasual')) return 'Casual';
//   if (lc === 'casual') return 'Casual';
//   if (lc === 'smartcasual' || lc === 'smart casual') return 'SmartCasual';
//   if (lc === 'businesscasual' || lc === 'business casual')
//     return 'BusinessCasual';
//   if (lc === 'business') return 'Business';
//   return undefined;
// }

// /** Infer a sensible dressBias when dressWanted is missing but other intent signals exist */
// function inferBiasFromConstraints(c: ParsedConstraints) {
//   const explicit = mapDressFromConstraints((c as any).dressWanted);
//   if (explicit) return explicit;

//   // Heuristics from other constraint signals
//   if ((c as any).wantsBlazer) return 'BusinessCasual';
//   if ((c as any).wantsLoafers) return 'SmartCasual';
//   if ((c as any).wantsSneakers && !(c as any).wantsBlazer) return 'Casual';

//   // Safe middle if we have nothing else
//   return 'SmartCasual';
// }

// /** ─────────────────────────────────────────────────────────────
//  * Constraints scorer
//  * ──────────────────────────────────────────────────────────── */
// export function scoreItemForConstraints(
//   item: CatalogItemLite,
//   c: ParsedConstraints,
//   baseBias: number,
// ): number {
//   let score = baseBias;
//   const cat = text(item.main_category);
//   const sub = text(item.subcategory);
//   const shoe = text(item.shoe_style);
//   const dress = text(item.dress_code);
//   const color = (text(item.color) || text(item.color_family)).toLowerCase();
//   const f = Number(item.formality_score ?? NaN);

//   // hard negatives
//   if ((c as any).excludeLoafers && (sub === 'Loafers' || shoe === 'Loafer'))
//     score -= 50;
//   if ((c as any).excludeSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score -= 40;
//   if ((c as any).excludeBoots && (sub === 'Boots' || shoe === 'Boot'))
//     score -= 40;
//   if ((c as any).excludeBrown && color.includes('brown')) score -= 12;

//   // positives
//   if ((c as any).wantsLoafers) {
//     if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
//     if ((c as any).wantsBrown && color.includes('brown')) score += 10;
//     if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
//       score -= 15;
//   }
//   if ((c as any).wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score += 35;
//   if ((c as any).wantsBoots && (sub === 'Boots' || shoe === 'Boot'))
//     score += 35;

//   if ((c as any).wantsBlazer) {
//     if (sub === 'Blazer' || sub === 'Sport Coat') {
//       score += 40;
//       if ((c as any).colorWanted === 'Blue' && color.includes('blue'))
//         score += 12;
//     } else if (cat === 'Outerwear') {
//       score -= 12;
//     }
//   }

//   if (
//     (c as any).colorWanted &&
//     color.includes((c as any).colorWanted.toLowerCase())
//   )
//     score += 10;

//   // dress code bias + formality proximity
//   if ((c as any).dressWanted) {
//     if (dress === (c as any).dressWanted) score += 10;
//     if ((c as any).dressWanted === 'BusinessCasual' && sub === 'Sneakers')
//       score -= 8;
//     if ((c as any).dressWanted === 'BusinessCasual' && sub === 'Jeans')
//       score -= 6;
//   }
//   if ((c as any).dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
//     const dist = Math.abs(f - 7); // prefer 6–8
//     score += Math.max(0, 10 - 3 * dist);
//   }

//   // soft guardrails on upscale intents
//   const upscale =
//     (c as any).dressWanted &&
//     ['BusinessCasual', 'Business'].includes((c as any).dressWanted);
//   if (upscale) {
//     if (sub === 'Hoodie') score -= 20;
//     if (sub === 'Windbreaker') score -= 15;
//     if (cat === 'Shorts') score -= 20;
//     if ((c as any).dressWanted === 'Business' && sub === 'Sneakers')
//       score -= 12;
//   }

//   return score;
// }

// /** Basic constraints-only reranker (kept for compatibility) */
// export function rerankCatalog<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
// ): T[] {
//   const scored = catalog.map((item, i) => ({
//     item,
//     score: scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
//   }));
//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
// }

// /** ─────────────────────────────────────────────────────────────
//  * Context blend (constraints + style + weather + feedback)
//  * ──────────────────────────────────────────────────────────── */

// export type ContextWeights =
//   | {
//       constraintsWeight: number;
//       styleWeight: number;
//       weatherWeight: number;
//       feedbackWeight?: number;
//     }
//   | { constraints: number; style: number; weather: number; feedback?: number };

// export const DEFAULT_CONTEXT_WEIGHTS = {
//   constraintsWeight: 2.0, // strong anchor
//   styleWeight: 1.0, // direct [0..1] style score
//   weatherWeight: 0.8, // gentle nudge
//   feedbackWeight: 1.0, // ±0.2 cap
// };

// function normalizeWeights(w?: ContextWeights) {
//   if (!w) return DEFAULT_CONTEXT_WEIGHTS;
//   if ('constraints' in w) {
//     return {
//       constraintsWeight: (w as any).constraints,
//       styleWeight: (w as any).style,
//       weatherWeight: (w as any).weather,
//       feedbackWeight:
//         (w as any).feedback ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//     };
//   }
//   return {
//     constraintsWeight: (w as any).constraintsWeight,
//     styleWeight: (w as any).styleWeight,
//     weatherWeight: (w as any).weatherWeight,
//     feedbackWeight:
//       (w as any).feedbackWeight ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//   };
// }

// /**
//  * Main reranker
//  */
// export function rerankCatalogWithContext<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
//   opts?: {
//     userStyle?: UserStyle;
//     weather?: WeatherContext;
//     weights?: ContextWeights;
//     useWeather?: boolean;
//     userPrefs?: Map<string, number>;
//   },
// ): T[] {
//   const W = normalizeWeights(opts?.weights);

//   const scored = catalog.map((item, i) => {
//     const baseBias = (catalog.length - i) * 0.01;

//     const constraintsScore = scoreItemForConstraints(item, c, baseBias);

//     // bridge constraint intent into style if needed
//     const inferredBias = inferBiasFromConstraints(c);
//     const effectiveStyle: UserStyle | undefined = opts?.userStyle
//       ? {
//           ...opts.userStyle,
//           dressBias: (opts.userStyle.dressBias ?? inferredBias) as any,
//         }
//       : ({ dressBias: inferredBias } as UserStyle);

//     const styleScoreNorm = scoreItemForStyle(item as any, effectiveStyle);

//     const weatherScore =
//       opts?.useWeather && opts?.weather
//         ? scoreItemForWeather(item as any, opts.weather)
//         : 0;

//     const feedbackRaw = opts?.userPrefs?.get(item.id ?? '') ?? 0;
//     const feedbackNorm = Math.max(-1, Math.min(1, feedbackRaw / 5));
//     const feedbackScaled = feedbackNorm * 0.2;

//     const total =
//       W.constraintsWeight * constraintsScore +
//       W.styleWeight * styleScoreNorm +
//       W.weatherWeight * weatherScore +
//       (W.feedbackWeight ?? 1) * feedbackScaled;

//     console.log(
//       `[RERANK] ${item.label}`,
//       `constraints=${constraintsScore.toFixed(2)}`,
//       `style=${styleScoreNorm.toFixed(2)}`,
//       `weather=${weatherScore.toFixed(2)}`,
//       `feedbackRaw=${feedbackRaw}`,
//       `feedbackScaled=${feedbackScaled.toFixed(2)}`,
//       `→ total=${total.toFixed(2)}`,
//       `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
//     );

//     return { item, score: total };
//   });

//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
// }

///////////////////

// // apps/backend-nest/src/wardrobe/logic/scoring.ts
// // scoring.ts — item scoring + reranking (constraints + user style + weather + feedback)

// import type { ParsedConstraints } from './constraints';
// import { scoreItemForStyle, type UserStyle } from './style';
// import { scoreItemForWeather, type WeatherContext } from './weather';

// type CatalogItemLite = {
//   index: number;
//   main_category?: string;
//   subcategory?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   color?: string;
//   color_family?: string;
//   formality_score?: number;

//   // carry-through fields preserved during mapping
//   id?: string;
//   label?: string;
//   image_url?: string;

//   // optional extras used by weather/style scorers
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string;
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// const text = (val: any) => (val ?? '').toString().trim();

// /** Map constraint dress intent to style.dressBias so style scoring can apply formality penalties */
// function mapDressFromConstraints(
//   d?: string,
// ): 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business' | undefined {
//   if (!d) return undefined;
//   const lc = d.toLowerCase();
//   if (lc.includes('ultracasual')) return 'Casual';
//   if (lc === 'casual') return 'Casual';
//   if (lc === 'smartcasual' || lc === 'smart casual') return 'SmartCasual';
//   if (lc === 'businesscasual' || lc === 'business casual')
//     return 'BusinessCasual';
//   if (lc === 'business') return 'Business';
//   return undefined;
// }

// /** Infer a sensible dressBias when dressWanted is missing but other intent signals exist */
// function inferBiasFromConstraints(c: ParsedConstraints) {
//   const explicit = mapDressFromConstraints((c as any).dressWanted);
//   if (explicit) return explicit;

//   // Heuristics from other constraint signals
//   if ((c as any).wantsBlazer) return 'BusinessCasual';
//   if ((c as any).wantsLoafers) return 'SmartCasual';
//   if ((c as any).wantsSneakers && !(c as any).wantsBlazer) return 'Casual';

//   // Safe middle if we have nothing else
//   return 'SmartCasual';
// }

// /** ─────────────────────────────────────────────────────────────
//  * Constraints scorer (same as before)
//  * ──────────────────────────────────────────────────────────── */
// export function scoreItemForConstraints(
//   item: CatalogItemLite,
//   c: ParsedConstraints,
//   baseBias: number,
// ): number {
//   let score = baseBias;
//   const cat = text(item.main_category);
//   const sub = text(item.subcategory);
//   const shoe = text(item.shoe_style);
//   const dress = text(item.dress_code);
//   const color = (text(item.color) || text(item.color_family)).toLowerCase();
//   const f = Number(item.formality_score ?? NaN);

//   // hard negatives
//   if ((c as any).excludeLoafers && (sub === 'Loafers' || shoe === 'Loafer'))
//     score -= 50;
//   if ((c as any).excludeSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score -= 40;
//   if ((c as any).excludeBoots && (sub === 'Boots' || shoe === 'Boot'))
//     score -= 40;
//   if ((c as any).excludeBrown && color.includes('brown')) score -= 12;

//   // positives
//   if ((c as any).wantsLoafers) {
//     if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
//     if ((c as any).wantsBrown && color.includes('brown')) score += 10;
//     if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
//       score -= 15;
//   }
//   if ((c as any).wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score += 35;
//   if ((c as any).wantsBoots && (sub === 'Boots' || shoe === 'Boot'))
//     score += 35;

//   if ((c as any).wantsBlazer) {
//     if (sub === 'Blazer' || sub === 'Sport Coat') {
//       score += 40;
//       if ((c as any).colorWanted === 'Blue' && color.includes('blue'))
//         score += 12;
//     } else if (cat === 'Outerwear') {
//       score -= 12;
//     }
//   }

//   if (
//     (c as any).colorWanted &&
//     color.includes((c as any).colorWanted.toLowerCase())
//   )
//     score += 10;

//   // dress code bias + formality proximity
//   if ((c as any).dressWanted) {
//     if (dress === (c as any).dressWanted) score += 10;
//     if ((c as any).dressWanted === 'BusinessCasual' && sub === 'Sneakers')
//       score -= 8;
//     if ((c as any).dressWanted === 'BusinessCasual' && sub === 'Jeans')
//       score -= 6;
//   }
//   if ((c as any).dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
//     const dist = Math.abs(f - 7); // prefer 6–8
//     score += Math.max(0, 10 - 3 * dist);
//   }
//   return score;
// }

// /** Basic constraints-only reranker (kept for compatibility) */
// export function rerankCatalog<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
// ): T[] {
//   const scored = catalog.map((item, i) => ({
//     item,
//     score: scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
//   }));
//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
// }

// /** ─────────────────────────────────────────────────────────────
//  * Context blend (constraints + style + weather + feedback)
//  * ──────────────────────────────────────────────────────────── */

// export type ContextWeights =
//   | {
//       constraintsWeight: number;
//       styleWeight: number;
//       weatherWeight: number;
//       feedbackWeight?: number;
//     }
//   | { constraints: number; style: number; weather: number; feedback?: number };

// export const DEFAULT_CONTEXT_WEIGHTS = {
//   constraintsWeight: 2.0, // stronger anchor for query intent
//   styleWeight: 1.0, // personalization (normalized [0..1])
//   weatherWeight: 0.8, // gentle nudge
//   feedbackWeight: 1.0, // light preference bias (±0.2 cap below)
// };

// function normalizeWeights(w?: ContextWeights) {
//   if (!w) return DEFAULT_CONTEXT_WEIGHTS;
//   if ('constraints' in w) {
//     return {
//       constraintsWeight: (w as any).constraints,
//       styleWeight: (w as any).style,
//       weatherWeight: (w as any).weather,
//       feedbackWeight:
//         (w as any).feedback ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//     };
//   }
//   return {
//     constraintsWeight: (w as any).constraintsWeight,
//     styleWeight: (w as any).styleWeight,
//     weatherWeight: (w as any).weatherWeight,
//     feedbackWeight:
//       (w as any).feedbackWeight ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//   };
// }

// /**
//  * Main reranker
//  */
// export function rerankCatalogWithContext<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
//   opts?: {
//     userStyle?: UserStyle;
//     weather?: WeatherContext;
//     weights?: ContextWeights;
//     useWeather?: boolean;
//     userPrefs?: Map<string, number>; // raw feedback scores from DB ([-5, 5])
//   },
// ): T[] {
//   const W = normalizeWeights(opts?.weights);

//   const scored = catalog.map((item, i) => {
//     const baseBias = (catalog.length - i) * 0.01;

//     const constraintsScore = scoreItemForConstraints(item, c, baseBias);

//     // Bridge constraint intent into style if user style lacks dressBias; also infer when dressWanted is absent
//     const inferredBias = inferBiasFromConstraints(c);
//     const effectiveStyle: UserStyle | undefined = opts?.userStyle
//       ? {
//           ...opts.userStyle,
//           dressBias: (opts.userStyle.dressBias ?? inferredBias) as any,
//         }
//       : ({ dressBias: inferredBias } as UserStyle);

//     // style.ts returns normalized [0..1]
//     const styleScoreNorm = scoreItemForStyle(item as any, effectiveStyle);

//     const weatherScore =
//       opts?.useWeather && opts?.weather
//         ? scoreItemForWeather(item as any, opts.weather)
//         : 0;

//     // Feedback normalization → gentle nudge only
//     const feedbackRaw = opts?.userPrefs?.get(item.id ?? '') ?? 0; // [-5, 5]
//     const feedbackNorm = Math.max(-1, Math.min(1, feedbackRaw / 5)); // [-1, 1]
//     const feedbackScaled = feedbackNorm * 0.2; // ±0.2 max effect

//     const total =
//       W.constraintsWeight * constraintsScore +
//       W.styleWeight * styleScoreNorm +
//       W.weatherWeight * weatherScore +
//       (W.feedbackWeight ?? 1) * feedbackScaled;

//     // Debug log
//     console.log(
//       `[RERANK] ${item.label}`,
//       `constraints=${constraintsScore.toFixed(2)}`,
//       `style=${styleScoreNorm.toFixed(2)}`,
//       `weather=${weatherScore.toFixed(2)}`,
//       `feedbackRaw=${feedbackRaw}`,
//       `feedbackScaled=${feedbackScaled.toFixed(2)}`,
//       `→ total=${total.toFixed(2)}`,
//       `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
//     );

//     return { item, score: total };
//   });

//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
// }

////////////////////

// // apps/backend-nest/src/wardrobe/logic/scoring.ts
// // scoring.ts — item scoring + reranking (constraints + user style + weather + feedback)

// import type { ParsedConstraints } from './constraints';
// import { scoreItemForStyle, type UserStyle } from './style';
// import { scoreItemForWeather, type WeatherContext } from './weather';

// type CatalogItemLite = {
//   index: number;
//   main_category?: string;
//   subcategory?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   color?: string;
//   color_family?: string;
//   formality_score?: number;

//   // carry-through fields preserved during mapping
//   id?: string;
//   label?: string;
//   image_url?: string;

//   // optional extras used by weather/style scorers
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string;
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// const text = (val: any) => (val ?? '').toString().trim();

// /** ─────────────────────────────────────────────────────────────
//  * Constraints scorer (unchanged)
//  * ──────────────────────────────────────────────────────────── */
// export function scoreItemForConstraints(
//   item: CatalogItemLite,
//   c: ParsedConstraints,
//   baseBias: number,
// ): number {
//   let score = baseBias;
//   const cat = text(item.main_category);
//   const sub = text(item.subcategory);
//   const shoe = text(item.shoe_style);
//   const dress = text(item.dress_code);
//   const color = (text(item.color) || text(item.color_family)).toLowerCase();
//   const f = Number(item.formality_score ?? NaN);

//   // hard negatives
//   if (c.excludeLoafers && (sub === 'Loafers' || shoe === 'Loafer')) score -= 50;
//   if (c.excludeSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score -= 40;
//   if (c.excludeBoots && (sub === 'Boots' || shoe === 'Boot')) score -= 40;
//   if (c.excludeBrown && color.includes('brown')) score -= 12;

//   // positives
//   if (c.wantsLoafers) {
//     if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
//     if (c.wantsBrown && color.includes('brown')) score += 10;
//     if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
//       score -= 15;
//   }
//   if (c.wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score += 35;
//   if (c.wantsBoots && (sub === 'Boots' || shoe === 'Boot')) score += 35;

//   if (c.wantsBlazer) {
//     if (sub === 'Blazer' || sub === 'Sport Coat') {
//       score += 40;
//       if (c.colorWanted === 'Blue' && color.includes('blue')) score += 12;
//     } else if (cat === 'Outerwear') {
//       score -= 12;
//     }
//   }

//   if (c.colorWanted && color.includes(c.colorWanted.toLowerCase())) score += 10;

//   // dress code bias + formality proximity
//   if (c.dressWanted) {
//     if (dress === c.dressWanted) score += 10;
//     if (c.dressWanted === 'BusinessCasual' && sub === 'Sneakers') score -= 8;
//     if (c.dressWanted === 'BusinessCasual' && sub === 'Jeans') score -= 6;
//   }
//   if (c.dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
//     const dist = Math.abs(f - 7); // prefer 6–8
//     score += Math.max(0, 10 - 3 * dist);
//   }
//   return score;
// }

// /** Basic constraints-only reranker (kept for compatibility) */
// export function rerankCatalog<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
// ): T[] {
//   const scored = catalog.map((item, i) => ({
//     item,
//     score: scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
//   }));
//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
// }

// /** ─────────────────────────────────────────────────────────────
//  * Context blend (constraints + user style + weather + feedback)
//  * ──────────────────────────────────────────────────────────── */

// export type ContextWeights =
//   | {
//       constraintsWeight: number;
//       styleWeight: number;
//       weatherWeight: number;
//       feedbackWeight?: number;
//     }
//   | { constraints: number; style: number; weather: number; feedback?: number };

// export const DEFAULT_CONTEXT_WEIGHTS = {
//   constraintsWeight: 1.0, // query intent
//   styleWeight: 1.2, // user style
//   weatherWeight: 0.8, // weather nudge
//   feedbackWeight: 1.0, // per-item like/dislike (from DB)
// };

// function normalizeWeights(w?: ContextWeights) {
//   if (!w) return DEFAULT_CONTEXT_WEIGHTS;
//   if ('constraints' in w) {
//     return {
//       constraintsWeight: w.constraints,
//       styleWeight: w.style,
//       weatherWeight: w.weather,
//       feedbackWeight:
//         (w as any).feedback ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//     };
//   }
//   return {
//     constraintsWeight: w.constraintsWeight,
//     styleWeight: w.styleWeight,
//     weatherWeight: w.weatherWeight,
//     feedbackWeight:
//       (w as any).feedbackWeight ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//   };
// }

// /**
//  * Reranker that blends constraints + style + (optional) weather + feedback.
//  */
// export function rerankCatalogWithContext<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
//   opts?: {
//     userStyle?: UserStyle;
//     weather?: WeatherContext;
//     weights?: ContextWeights;
//     useWeather?: boolean;
//     userPrefs?: Map<string, number>; // raw feedback scores from DB ([-5, 5])
//   },
// ): T[] {
//   const W = normalizeWeights(opts?.weights);

//   const scored = catalog.map((item, i) => {
//     const baseBias = (catalog.length - i) * 0.01;

//     const constraintsScore = scoreItemForConstraints(item, c, baseBias);
//     const styleScore = scoreItemForStyle(item as any, opts?.userStyle);
//     const weatherScore =
//       opts?.useWeather && opts?.weather
//         ? scoreItemForWeather(item as any, opts.weather)
//         : 0;

//     // --- Feedback normalization + scaling ---
//     const feedbackRaw = opts?.userPrefs?.get(item.id ?? '') ?? 0; // DB value [-5, 5]
//     const feedbackNorm = Math.max(-1, Math.min(1, feedbackRaw / 5)); // [-1, 1]
//     const feedbackScaled = feedbackNorm * 0.2; // cap influence to ±0.2

//     const total =
//       W.constraintsWeight * constraintsScore +
//       W.styleWeight * styleScore +
//       W.weatherWeight * weatherScore +
//       (W.feedbackWeight ?? 1) * feedbackScaled;

//     // 🪵 Debug log with feedback normalization
//     console.log(
//       `[RERANK] ${item.label}`,
//       `constraints=${constraintsScore.toFixed(2)}`,
//       `style=${styleScore.toFixed(2)}`,
//       `weather=${weatherScore.toFixed(2)}`,
//       `feedbackRaw=${feedbackRaw}`,
//       `feedbackScaled=${feedbackScaled.toFixed(2)}`,
//       `→ total=${total.toFixed(2)}`,
//       `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
//     );

//     return { item, score: total };
//   });

//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
// }

///////////////////

// // apps/backend-nest/src/wardrobe/logic/scoring.ts
// // scoring.ts — item scoring + reranking (constraints + user style + weather + feedback)

// import type { ParsedConstraints } from './constraints';
// import { scoreItemForStyle, type UserStyle } from './style';
// import { scoreItemForWeather, type WeatherContext } from './weather';

// type CatalogItemLite = {
//   index: number;
//   main_category?: string;
//   subcategory?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   color?: string;
//   color_family?: string;
//   formality_score?: number;

//   // carry-through fields preserved during mapping
//   id?: string;
//   label?: string;
//   image_url?: string;

//   // optional extras used by weather/style scorers
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string;
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// const text = (val: any) => (val ?? '').toString().trim();

// /** ─────────────────────────────────────────────────────────────
//  * Constraints scorer (unchanged)
//  * ──────────────────────────────────────────────────────────── */
// export function scoreItemForConstraints(
//   item: CatalogItemLite,
//   c: ParsedConstraints,
//   baseBias: number,
// ): number {
//   let score = baseBias;
//   const cat = text(item.main_category);
//   const sub = text(item.subcategory);
//   const shoe = text(item.shoe_style);
//   const dress = text(item.dress_code);
//   const color = (text(item.color) || text(item.color_family)).toLowerCase();
//   const f = Number(item.formality_score ?? NaN);

//   // hard negatives
//   if (c.excludeLoafers && (sub === 'Loafers' || shoe === 'Loafer')) score -= 50;
//   if (c.excludeSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score -= 40;
//   if (c.excludeBoots && (sub === 'Boots' || shoe === 'Boot')) score -= 40;
//   if (c.excludeBrown && color.includes('brown')) score -= 12;

//   // positives
//   if (c.wantsLoafers) {
//     if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
//     if (c.wantsBrown && color.includes('brown')) score += 10;
//     if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
//       score -= 15;
//   }
//   if (c.wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score += 35;
//   if (c.wantsBoots && (sub === 'Boots' || shoe === 'Boot')) score += 35;

//   if (c.wantsBlazer) {
//     if (sub === 'Blazer' || sub === 'Sport Coat') {
//       score += 40;
//       if (c.colorWanted === 'Blue' && color.includes('blue')) score += 12;
//     } else if (cat === 'Outerwear') {
//       score -= 12;
//     }
//   }

//   if (c.colorWanted && color.includes(c.colorWanted.toLowerCase())) score += 10;

//   // dress code bias + formality proximity
//   if (c.dressWanted) {
//     if (dress === c.dressWanted) score += 10;
//     if (c.dressWanted === 'BusinessCasual' && sub === 'Sneakers') score -= 8;
//     if (c.dressWanted === 'BusinessCasual' && sub === 'Jeans') score -= 6;
//   }
//   if (c.dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
//     const dist = Math.abs(f - 7); // prefer 6–8
//     score += Math.max(0, 10 - 3 * dist);
//   }
//   return score;
// }

// /** Basic constraints-only reranker (kept for compatibility) */
// export function rerankCatalog<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
// ): T[] {
//   const scored = catalog.map((item, i) => ({
//     item,
//     score: scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
//   }));
//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
// }

// /** ─────────────────────────────────────────────────────────────
//  * NEW: Context blend (constraints + user style + weather + feedback)
//  * ──────────────────────────────────────────────────────────── */

// export type ContextWeights =
//   | {
//       constraintsWeight: number;
//       styleWeight: number;
//       weatherWeight: number;
//       feedbackWeight?: number;
//     } // new shape
//   | { constraints: number; style: number; weather: number; feedback?: number }; // legacy shape

// export const DEFAULT_CONTEXT_WEIGHTS = {
//   constraintsWeight: 1.0, // query intent
//   styleWeight: 1.2, // user style
//   weatherWeight: 0.8, // weather nudge
//   feedbackWeight: 1.0, // per-item like/dislike (from DB)
// };

// function normalizeWeights(w?: ContextWeights) {
//   if (!w) return DEFAULT_CONTEXT_WEIGHTS;
//   if ('constraints' in w) {
//     return {
//       constraintsWeight: w.constraints,
//       styleWeight: w.style,
//       weatherWeight: w.weather,
//       feedbackWeight:
//         (w as any).feedback ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//     };
//   }
//   return {
//     constraintsWeight: w.constraintsWeight,
//     styleWeight: w.styleWeight,
//     weatherWeight: w.weatherWeight,
//     feedbackWeight:
//       (w as any).feedbackWeight ?? DEFAULT_CONTEXT_WEIGHTS.feedbackWeight,
//   };
// }

// /**
//  * Reranker that blends constraints + style + (optional) weather + feedback.
//  */
// export function rerankCatalogWithContext<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
//   opts?: {
//     userStyle?: UserStyle;
//     weather?: WeatherContext;
//     weights?: ContextWeights;
//     useWeather?: boolean;
//     userPrefs?: Map<string, number>; // 👈 NEW
//   },
// ): T[] {
//   const W = normalizeWeights(opts?.weights);

//   const scored = catalog.map((item, i) => {
//     const baseBias = (catalog.length - i) * 0.01;

//     const constraintsScore = scoreItemForConstraints(item, c, baseBias);
//     const styleScore = scoreItemForStyle(item as any, opts?.userStyle);
//     const weatherScore =
//       opts?.useWeather && opts?.weather
//         ? scoreItemForWeather(item as any, opts.weather)
//         : 0;

//     // NEW: per-item feedback score (already clamped in DB to [-5, 5])
//     const feedbackScore = opts?.userPrefs?.get(item.id ?? '') ?? 0;

//     const total =
//       W.constraintsWeight * constraintsScore +
//       W.styleWeight * styleScore +
//       W.weatherWeight * weatherScore +
//       W.feedbackWeight * feedbackScore;

//     // 🪵 Debug log now includes feedback
//     console.log(
//       `[RERANK] ${item.label}`,
//       `constraints=${constraintsScore.toFixed(2)}`,
//       `style=${styleScore.toFixed(2)}`,
//       `weather=${weatherScore.toFixed(2)}`,
//       `feedback=${feedbackScore.toFixed(2)}`,
//       `→ total=${total.toFixed(2)}`,
//       `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
//     );

//     return { item, score: total };
//   });

//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
// }

////////////////////

// // apps/backend-nest/src/wardrobe/logic/scoring.ts
// // scoring.ts — item scoring + reranking (constraints + user style + weather)

// import type { ParsedConstraints } from './constraints';
// import { scoreItemForStyle, type UserStyle } from './style';
// import { scoreItemForWeather, type WeatherContext } from './weather';

// type CatalogItemLite = {
//   index: number;
//   main_category?: string;
//   subcategory?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   color?: string;
//   color_family?: string;
//   formality_score?: number;

//   // carry-through fields preserved during mapping
//   id?: string;
//   label?: string;
//   image_url?: string;

//   // optional extras used by weather/style scorers
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string;
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// const text = (val: any) => (val ?? '').toString().trim();

// /** ───────────────────────────────────────────────────────────────────────────
//  * ORIGINAL constraint-based scorer (unchanged)
//  * ---------------------------------------------------------------------------
//  */
// export function scoreItemForConstraints(
//   item: CatalogItemLite,
//   c: ParsedConstraints,
//   baseBias: number,
// ): number {
//   let score = baseBias;
//   const cat = text(item.main_category);
//   const sub = text(item.subcategory);
//   const shoe = text(item.shoe_style);
//   const dress = text(item.dress_code);
//   const color = (text(item.color) || text(item.color_family)).toLowerCase();
//   const f = Number(item.formality_score ?? NaN);

//   // hard negatives
//   if (c.excludeLoafers && (sub === 'Loafers' || shoe === 'Loafer')) score -= 50;
//   if (c.excludeSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score -= 40;
//   if (c.excludeBoots && (sub === 'Boots' || shoe === 'Boot')) score -= 40;
//   if (c.excludeBrown && color.includes('brown')) score -= 12;

//   // positives
//   if (c.wantsLoafers) {
//     if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
//     if (c.wantsBrown && color.includes('brown')) score += 10;
//     if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
//       score -= 15;
//   }
//   if (c.wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
//     score += 35;
//   if (c.wantsBoots && (sub === 'Boots' || shoe === 'Boot')) score += 35;

//   if (c.wantsBlazer) {
//     if (sub === 'Blazer' || sub === 'Sport Coat') {
//       score += 40;
//       if (c.colorWanted === 'Blue' && color.includes('blue')) score += 12;
//     } else if (cat === 'Outerwear') {
//       score -= 12;
//     }
//   }

//   if (c.colorWanted && color.includes(c.colorWanted.toLowerCase())) score += 10;

//   // dress code bias + formality proximity
//   if (c.dressWanted) {
//     if (dress === c.dressWanted) score += 10;
//     if (c.dressWanted === 'BusinessCasual' && sub === 'Sneakers') score -= 8;
//     if (c.dressWanted === 'BusinessCasual' && sub === 'Jeans') score -= 6;
//   }
//   if (c.dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
//     const dist = Math.abs(f - 7); // prefer 6–8
//     score += Math.max(0, 10 - 3 * dist);
//   }
//   return score;
// }

// /** Basic constraints-only reranker (kept for compatibility) */
// export function rerankCatalog<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
// ): T[] {
//   const scored = catalog.map((item, i) => ({
//     item,
//     score: scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
//   }));
//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
// }

// /** ───────────────────────────────────────────────────────────────────────────
//  * NEW: Context blend (constraints + user style + weather)
//  * ---------------------------------------------------------------------------
//  */

// export type ContextWeights =
//   | { constraintsWeight: number; styleWeight: number; weatherWeight: number } // new shape
//   | { constraints: number; style: number; weather: number }; // legacy shape

// export const DEFAULT_CONTEXT_WEIGHTS: {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// } = {
//   constraintsWeight: 1.0, // always honor query intent
//   styleWeight: 1.2, // push more toward user prefs
//   weatherWeight: 0.8, // weather is nudging, not overriding
// };

// function normalizeWeights(w?: ContextWeights): {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// } {
//   if (!w) return DEFAULT_CONTEXT_WEIGHTS;
//   if ('constraints' in w) {
//     return {
//       constraintsWeight: w.constraints,
//       styleWeight: w.style,
//       weatherWeight: w.weather,
//     };
//   }
//   return w;
// }

// /**
//  * Drop-in replacement that adds style + weather influence.
//  */
// export function rerankCatalogWithContext<T extends CatalogItemLite>(
//   catalog: T[],
//   c: ParsedConstraints,
//   opts?: {
//     userStyle?: UserStyle;
//     weather?: WeatherContext;
//     weights?: ContextWeights;
//     useWeather?: boolean; // make explicit
//   },
// ): T[] {
//   const W = normalizeWeights(opts?.weights);

//   const scored = catalog.map((item, i) => {
//     const baseBias = (catalog.length - i) * 0.01;

//     const constraintsScore = scoreItemForConstraints(item, c, baseBias);
//     const styleScore = scoreItemForStyle(item as any, opts?.userStyle);

//     const weatherScore =
//       opts?.useWeather && opts?.weather
//         ? scoreItemForWeather(item as any, opts.weather)
//         : 0;

//     const total =
//       W.constraintsWeight * constraintsScore +
//       W.styleWeight * styleScore +
//       W.weatherWeight * weatherScore;

//     // 🪵 Debug log
//     console.log(
//       `[RERANK] ${item.label}`,
//       `constraints=${constraintsScore.toFixed(2)}`,
//       `style=${styleScore.toFixed(2)}`,
//       `weather=${weatherScore.toFixed(2)}`,
//       `→ total=${total.toFixed(2)}`,
//       `useWeather=${opts?.useWeather ? 'ON' : 'OFF'}`,
//     );

//     return { item, score: total };
//   });

//   scored.sort((a, b) => b.score - a.score);
//   return scored.map((s, i2) => ({ ...s.item, index: i2 + 1 }));
// }
