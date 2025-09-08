// apps/backend-nest/src/wardrobe/logic/style.ts

export type UserStyle = {
  preferredColors?: string[];
  avoidColors?: string[];
  preferredCategories?: string[];
  avoidSubcategories?: string[];
  favoriteBrands?: string[];
  dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
  genderPresentation?: 'male' | 'female';
};

export type StyleWeights = {
  preferredColor: number;
  avoidColor: number;
  preferredCategory: number;
  avoidSubcategory: number;
  favoriteBrand: number;
  dressMatch: number; // reward for matching dress bias
  dressProximity: number; // reward for being close
  dressPenalty: number; // penalty for being far off
};

export const DEFAULT_STYLE_WEIGHTS: StyleWeights = {
  preferredColor: 6,
  avoidColor: 8,
  preferredCategory: 4,
  avoidSubcategory: 7,
  favoriteBrand: 5,
  dressMatch: 6,
  dressProximity: 3,
  dressPenalty: 6,
};

type Item = {
  main_category?: string;
  subcategory?: string;
  brand?: string;
  color?: string;
  color_family?: string;
  dress_code?: string;
  label?: string;
};

const t = (s: any) => (s ?? '').toString().trim().toLowerCase();
const STYLE_DEBUG = !!process.env.STYLE_DEBUG;

/** Case-insensitive, tolerant color hit */
function colorHits(itemColorLc: string, prefLc: string) {
  if (!itemColorLc || !prefLc) return false;
  return itemColorLc.includes(prefLc) || prefLc.includes(itemColorLc);
}

/** Map dress codes to numeric ranks for proximity scoring */
const DRESS_RANK: Record<string, number> = {
  ultracasual: 1,
  casual: 2,
  smartcasual: 3,
  businesscasual: 4,
  business: 5,
  formal: 6,
};

export function scoreItemForStyle(
  item: Item,
  style: UserStyle | undefined,
  W: StyleWeights = DEFAULT_STYLE_WEIGHTS,
): number {
  if (!style) return 0;
  let rawScore = 0;
  let maxPossible = 0;

  const prefColors = (style.preferredColors ?? []).map(t);
  const badColors = (style.avoidColors ?? []).map(t);
  const prefCats = (style.preferredCategories ?? []).map(t);
  const badSubs = (style.avoidSubcategories ?? []).map(t);
  const favBrands = (style.favoriteBrands ?? []).map(t);
  const dressBiasLc = style.dressBias ? t(style.dressBias) : '';

  const color = t(item.color) || t(item.color_family);
  const cat = t(item.main_category);
  const sub = t(item.subcategory);
  const brand = t(item.brand);
  const dress = t(item.dress_code);

  const reasons: string[] = [];

  // Preferred colors
  if (prefColors.length && color) {
    maxPossible += W.preferredColor;
    if (prefColors.some((c) => colorHits(color, c))) {
      rawScore += W.preferredColor;
      reasons.push(`+${W.preferredColor} preferredColor:${color}`);
    }
  }

  // Avoid colors
  if (badColors.length && color) {
    maxPossible += W.avoidColor;
    if (badColors.some((c) => colorHits(color, c))) {
      rawScore -= W.avoidColor;
      reasons.push(`-${W.avoidColor} avoidColor:${color}`);
    }
  }

  // Preferred categories
  if (prefCats.length && cat) {
    maxPossible += W.preferredCategory;
    if (prefCats.includes(cat)) {
      rawScore += W.preferredCategory;
      reasons.push(`+${W.preferredCategory} preferredCat:${cat}`);
    }
  }

  // Avoid subcategories
  if (badSubs.length && sub) {
    maxPossible += W.avoidSubcategory;
    if (badSubs.includes(sub)) {
      rawScore -= W.avoidSubcategory;
      reasons.push(`-${W.avoidSubcategory} avoidSub:${sub}`);
    }
  }

  // Favorite brands
  if (favBrands.length && brand) {
    maxPossible += W.favoriteBrand;
    if (favBrands.includes(brand)) {
      rawScore += W.favoriteBrand;
      reasons.push(`+${W.favoriteBrand} brand:${brand}`);
    }
  }

  // Dress code bias with proximity + penalty
  if (dressBiasLc && dress) {
    const biasRank = DRESS_RANK[dressBiasLc] ?? 0;
    const itemRank = DRESS_RANK[t(dress)] ?? 0;
    if (biasRank && itemRank) {
      const dist = Math.abs(biasRank - itemRank);
      maxPossible += W.dressMatch;

      if (dist === 0) {
        rawScore += W.dressMatch;
        reasons.push(`+${W.dressMatch} dressMatch:${dress}`);
      } else if (dist === 1) {
        rawScore += W.dressProximity;
        maxPossible += W.dressProximity;
        reasons.push(`+${W.dressProximity} dressProximity:${dress}`);
      } else if (dist >= 3) {
        rawScore -= W.dressPenalty;
        maxPossible += W.dressPenalty;
        reasons.push(`-${W.dressPenalty} dressPenalty:${dress}`);
      }
    }
  }

  // Normalize: map rawScore into [0,1]
  let norm = 0;
  if (maxPossible > 0) {
    const range = maxPossible * 2;
    const shifted = rawScore + maxPossible;
    norm = Math.max(0, Math.min(1, shifted / range));
  }

  if (STYLE_DEBUG) {
    const label =
      item.label ||
      [item.main_category, item.subcategory].filter(Boolean).join(' / ') ||
      'Item';
    console.log(
      `[STYLE] ${label} raw=${rawScore.toFixed(2)} norm=${norm.toFixed(
        2,
      )} max=${maxPossible} (${reasons.join(', ') || 'no-op'})`,
    );
  }

  return norm;
}

///////////////////

// // apps/backend-nest/src/wardrobe/logic/style.ts

// export type UserStyle = {
//   preferredColors?: string[];
//   avoidColors?: string[];
//   preferredCategories?: string[];
//   avoidSubcategories?: string[];
//   favoriteBrands?: string[];
//   dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
// };

// export type StyleWeights = {
//   preferredColor: number;
//   avoidColor: number;
//   preferredCategory: number;
//   avoidSubcategory: number;
//   favoriteBrand: number;
//   dressMatch: number; // reward for matching dress bias
//   dressProximity: number; // reward for being close
//   dressPenalty: number; // penalty for being far off
// };

// export const DEFAULT_STYLE_WEIGHTS: StyleWeights = {
//   preferredColor: 6,
//   avoidColor: 8,
//   preferredCategory: 4,
//   avoidSubcategory: 7,
//   favoriteBrand: 5,
//   dressMatch: 6,
//   dressProximity: 3,
//   dressPenalty: 6,
// };

// type Item = {
//   main_category?: string;
//   subcategory?: string;
//   brand?: string;
//   color?: string;
//   color_family?: string;
//   dress_code?: string;
//   label?: string;
// };

// const t = (s: any) => (s ?? '').toString().trim().toLowerCase();
// const STYLE_DEBUG = !!process.env.STYLE_DEBUG;

// /** Case-insensitive, tolerant color hit */
// function colorHits(itemColorLc: string, prefLc: string) {
//   if (!itemColorLc || !prefLc) return false;
//   return itemColorLc.includes(prefLc) || prefLc.includes(itemColorLc);
// }

// /** Map dress codes to numeric ranks for proximity scoring */
// const DRESS_RANK: Record<string, number> = {
//   ultracasual: 1,
//   casual: 2,
//   smartcasual: 3,
//   businesscasual: 4,
//   business: 5,
//   formal: 6,
// };

// export function scoreItemForStyle(
//   item: Item,
//   style: UserStyle | undefined,
//   W: StyleWeights = DEFAULT_STYLE_WEIGHTS,
// ): number {
//   if (!style) return 0;
//   let rawScore = 0;
//   let maxPossible = 0;

//   const prefColors = (style.preferredColors ?? []).map(t);
//   const badColors = (style.avoidColors ?? []).map(t);
//   const prefCats = (style.preferredCategories ?? []).map(t);
//   const badSubs = (style.avoidSubcategories ?? []).map(t);
//   const favBrands = (style.favoriteBrands ?? []).map(t);
//   const dressBiasLc = style.dressBias ? t(style.dressBias) : '';

//   const color = t(item.color) || t(item.color_family);
//   const cat = t(item.main_category);
//   const sub = t(item.subcategory);
//   const brand = t(item.brand);
//   const dress = t(item.dress_code);

//   const reasons: string[] = [];

//   // Preferred colors
//   if (prefColors.length && color) {
//     maxPossible += W.preferredColor;
//     if (prefColors.some((c) => colorHits(color, c))) {
//       rawScore += W.preferredColor;
//       reasons.push(`+${W.preferredColor} preferredColor:${color}`);
//     }
//   }

//   // Avoid colors
//   if (badColors.length && color) {
//     maxPossible += W.avoidColor;
//     if (badColors.some((c) => colorHits(color, c))) {
//       rawScore -= W.avoidColor;
//       reasons.push(`-${W.avoidColor} avoidColor:${color}`);
//     }
//   }

//   // Preferred categories
//   if (prefCats.length && cat) {
//     maxPossible += W.preferredCategory;
//     if (prefCats.includes(cat)) {
//       rawScore += W.preferredCategory;
//       reasons.push(`+${W.preferredCategory} preferredCat:${cat}`);
//     }
//   }

//   // Avoid subcategories
//   if (badSubs.length && sub) {
//     maxPossible += W.avoidSubcategory;
//     if (badSubs.includes(sub)) {
//       rawScore -= W.avoidSubcategory;
//       reasons.push(`-${W.avoidSubcategory} avoidSub:${sub}`);
//     }
//   }

//   // Favorite brands
//   if (favBrands.length && brand) {
//     maxPossible += W.favoriteBrand;
//     if (favBrands.includes(brand)) {
//       rawScore += W.favoriteBrand;
//       reasons.push(`+${W.favoriteBrand} brand:${brand}`);
//     }
//   }

//   // Dress code bias with proximity + penalty
//   if (dressBiasLc && dress) {
//     const biasRank = DRESS_RANK[dressBiasLc] ?? 0;
//     const itemRank = DRESS_RANK[t(dress)] ?? 0;
//     if (biasRank && itemRank) {
//       const dist = Math.abs(biasRank - itemRank);
//       maxPossible += W.dressMatch;

//       if (dist === 0) {
//         rawScore += W.dressMatch;
//         reasons.push(`+${W.dressMatch} dressMatch:${dress}`);
//       } else if (dist === 1) {
//         rawScore += W.dressProximity;
//         maxPossible += W.dressProximity;
//         reasons.push(`+${W.dressProximity} dressProximity:${dress}`);
//       } else if (dist >= 3) {
//         rawScore -= W.dressPenalty;
//         maxPossible += W.dressPenalty;
//         reasons.push(`-${W.dressPenalty} dressPenalty:${dress}`);
//       }
//     }
//   }

//   // Normalize: map rawScore into [0,1]
//   let norm = 0;
//   if (maxPossible > 0) {
//     const range = maxPossible * 2;
//     const shifted = rawScore + maxPossible;
//     norm = Math.max(0, Math.min(1, shifted / range));
//   }

//   if (STYLE_DEBUG) {
//     const label =
//       item.label ||
//       [item.main_category, item.subcategory].filter(Boolean).join(' / ') ||
//       'Item';
//     console.log(
//       `[STYLE] ${label} raw=${rawScore.toFixed(2)} norm=${norm.toFixed(
//         2,
//       )} max=${maxPossible} (${reasons.join(', ') || 'no-op'})`,
//     );
//   }

//   return norm;
// }

////////////////////

// // apps/backend-nest/src/wardrobe/logic/style.ts
// export type UserStyle = {
//   preferredColors?: string[];
//   avoidColors?: string[];
//   preferredCategories?: string[];
//   avoidSubcategories?: string[];
//   favoriteBrands?: string[];
//   dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
// };

// export type StyleWeights = {
//   preferredColor: number;
//   avoidColor: number;
//   preferredCategory: number;
//   avoidSubcategory: number;
//   favoriteBrand: number;
//   dressMatch: number;
// };

// export const DEFAULT_STYLE_WEIGHTS: StyleWeights = {
//   preferredColor: 6,
//   avoidColor: 8,
//   preferredCategory: 4,
//   avoidSubcategory: 7,
//   favoriteBrand: 5,
//   dressMatch: 5,
// };

// type Item = {
//   main_category?: string;
//   subcategory?: string;
//   brand?: string;
//   color?: string;
//   color_family?: string;
//   dress_code?: string;
//   label?: string;
// };

// const t = (s: any) => (s ?? '').toString().trim().toLowerCase();
// const STYLE_DEBUG = !!process.env.STYLE_DEBUG;

// function colorHits(itemColorLc: string, prefLc: string) {
//   if (!itemColorLc || !prefLc) return false;
//   return itemColorLc.includes(prefLc) || prefLc.includes(itemColorLc);
// }

// /**
//  * Returns a normalized style score in [0,1].
//  */
// export function scoreItemForStyle(
//   item: Item,
//   style: UserStyle | undefined,
//   W: StyleWeights = DEFAULT_STYLE_WEIGHTS,
// ): number {
//   if (!style) return 0;
//   let rawScore = 0;
//   let maxPossible = 0;

//   const prefColors = (style.preferredColors ?? []).map(t);
//   const badColors = (style.avoidColors ?? []).map(t);
//   const prefCats = (style.preferredCategories ?? []).map(t);
//   const badSubs = (style.avoidSubcategories ?? []).map(t);
//   const favBrands = (style.favoriteBrands ?? []).map(t);
//   const dressBiasLc = style.dressBias ? t(style.dressBias) : '';

//   const color = t(item.color) || t(item.color_family);
//   const cat = t(item.main_category);
//   const sub = t(item.subcategory);
//   const brand = t(item.brand);
//   const dress = t(item.dress_code);

//   const reasons: string[] = [];

//   // Preferred colors
//   if (prefColors.length && color) {
//     maxPossible += W.preferredColor;
//     if (prefColors.some((c) => colorHits(color, c))) {
//       rawScore += W.preferredColor;
//       reasons.push(`+${W.preferredColor} preferredColor:${color}`);
//     }
//   }

//   // Avoid colors
//   if (badColors.length && color) {
//     maxPossible += W.avoidColor;
//     if (badColors.some((c) => colorHits(color, c))) {
//       rawScore -= W.avoidColor;
//       reasons.push(`-${W.avoidColor} avoidColor:${color}`);
//     }
//   }

//   // Preferred categories
//   if (prefCats.length && cat) {
//     maxPossible += W.preferredCategory;
//     if (prefCats.includes(cat)) {
//       rawScore += W.preferredCategory;
//       reasons.push(`+${W.preferredCategory} preferredCat:${cat}`);
//     }
//   }

//   // Avoid subcategories
//   if (badSubs.length && sub) {
//     maxPossible += W.avoidSubcategory;
//     if (badSubs.includes(sub)) {
//       rawScore -= W.avoidSubcategory;
//       reasons.push(`-${W.avoidSubcategory} avoidSub:${sub}`);
//     }
//   }

//   // Favorite brands
//   if (favBrands.length && brand) {
//     maxPossible += W.favoriteBrand;
//     if (favBrands.includes(brand)) {
//       rawScore += W.favoriteBrand;
//       reasons.push(`+${W.favoriteBrand} brand:${brand}`);
//     }
//   }

//   // Dress code bias
//   if (dressBiasLc && dress) {
//     maxPossible += W.dressMatch;
//     if (t(dress) === dressBiasLc) {
//       rawScore += W.dressMatch;
//       reasons.push(`+${W.dressMatch} dressMatch:${dress}`);
//     }
//   }

//   // Normalize: map rawScore into [0,1]
//   let norm = 0;
//   if (maxPossible > 0) {
//     // rawScore could be negative if many avoid matches → map -max..+max → 0..1
//     const range = maxPossible * 2;
//     const shifted = rawScore + maxPossible;
//     norm = Math.max(0, Math.min(1, shifted / range));
//   }

//   if (STYLE_DEBUG) {
//     const label =
//       item.label ||
//       [item.main_category, item.subcategory].filter(Boolean).join(' / ') ||
//       'Item';
//     console.log(
//       `[STYLE] ${label} raw=${rawScore.toFixed(2)} norm=${norm.toFixed(
//         2,
//       )} max=${maxPossible} (${reasons.join(', ') || 'no-op'})`,
//     );
//   }

//   return norm;
// }

///////////////////////

// // apps/backend-nest/src/wardrobe/logic/style.ts
// export type UserStyle = {
//   preferredColors?: string[]; // ['Brown','Navy']
//   avoidColors?: string[]; // ['Black']
//   preferredCategories?: string[]; // ['Tops','Outerwear','Shoes']
//   avoidSubcategories?: string[]; // ['Jeans','Sneakers']
//   favoriteBrands?: string[]; // ['Ferragamo','Pini Parma']
//   dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
// };

// export type StyleWeights = {
//   preferredColor: number;
//   avoidColor: number;
//   preferredCategory: number;
//   avoidSubcategory: number;
//   favoriteBrand: number;
//   dressMatch: number;
// };

// export const DEFAULT_STYLE_WEIGHTS: StyleWeights = {
//   preferredColor: 6,
//   avoidColor: 8,
//   preferredCategory: 4,
//   avoidSubcategory: 7,
//   favoriteBrand: 5,
//   dressMatch: 5,
// };

// type Item = {
//   main_category?: string;
//   subcategory?: string;
//   brand?: string;
//   color?: string;
//   color_family?: string;
//   dress_code?: string;
//   // NOTE: we don't require label, but if present we use it in debug logs.
//   label?: string;
// };

// const t = (s: any) => (s ?? '').toString().trim().toLowerCase();
// const STYLE_DEBUG = !!process.env.STYLE_DEBUG;

// /**
//  * Case-insensitive, tolerant color hit:
//  *  - matches if itemColor includes pref (e.g., "light blue" ~ "blue")
//  *  - or pref includes itemColor (e.g., "navy blue" ~ "navy")
//  */
// function colorHits(itemColorLc: string, prefLc: string) {
//   if (!itemColorLc || !prefLc) return false;
//   return itemColorLc.includes(prefLc) || prefLc.includes(itemColorLc);
// }

// export function scoreItemForStyle(
//   item: Item,
//   style: UserStyle | undefined,
//   W: StyleWeights = DEFAULT_STYLE_WEIGHTS,
// ): number {
//   if (!style) return 0;
//   let score = 0;

//   // Precompute normalized user prefs once
//   const prefColors = (style.preferredColors ?? []).map(t);
//   const badColors = (style.avoidColors ?? []).map(t);
//   const prefCats = (style.preferredCategories ?? []).map(t);
//   const badSubs = (style.avoidSubcategories ?? []).map(t);
//   const favBrands = (style.favoriteBrands ?? []).map(t);
//   const dressBiasLc = style.dressBias ? t(style.dressBias) : '';

//   const color = t(item.color) || t(item.color_family);
//   const cat = t(item.main_category);
//   const sub = t(item.subcategory);
//   const brand = t(item.brand);
//   const dress = t(item.dress_code);

//   // For human-friendly debug
//   const reasons: string[] = [];

//   // Preferred colors
//   if (prefColors.length && color) {
//     if (prefColors.some((c) => colorHits(color, c))) {
//       score += W.preferredColor;
//       reasons.push(`+${W.preferredColor} preferredColor:${color}`);
//     }
//   }

//   // Avoid colors
//   if (badColors.length && color) {
//     if (badColors.some((c) => colorHits(color, c))) {
//       score -= W.avoidColor;
//       reasons.push(`-${W.avoidColor} avoidColor:${color}`);
//     }
//   }

//   // Preferred categories
//   if (prefCats.length && cat) {
//     if (prefCats.includes(cat)) {
//       score += W.preferredCategory;
//       reasons.push(`+${W.preferredCategory} preferredCat:${cat}`);
//     }
//   }

//   // Avoid subcategories
//   if (badSubs.length && sub) {
//     if (badSubs.includes(sub)) {
//       score -= W.avoidSubcategory;
//       reasons.push(`-${W.avoidSubcategory} avoidSub:${sub}`);
//     }
//   }

//   // Favorite brands
//   if (favBrands.length && brand) {
//     if (favBrands.includes(brand)) {
//       score += W.favoriteBrand;
//       reasons.push(`+${W.favoriteBrand} brand:${brand}`);
//     }
//   }

//   // Dress code bias
//   if (dressBiasLc && dress && t(dress) === dressBiasLc) {
//     score += W.dressMatch;
//     reasons.push(`+${W.dressMatch} dressMatch:${dress}`);
//   }

//   if (STYLE_DEBUG) {
//     const label =
//       (item as any)?.label ||
//       [item.main_category, item.subcategory].filter(Boolean).join(' / ') ||
//       'Item';
//     // Single concise line per item
//     // Example: [STYLE] Black Leather Loafers — … → 6.00 (+5 brand:nike, +1 preferredCat:shoes)
//     // (weights shown exactly from reasons list)
//     // If no reasons → 'no-op'
//     // Keep this log lightweight; [RERANK] stays in scoring.ts
//     // eslint-disable-next-line no-console
//     console.log(
//       `[STYLE] ${label} → ${score.toFixed(2)} (${reasons.join(', ') || 'no-op'})`,
//     );
//   }

//   return score;
// }
