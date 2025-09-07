// apps/backend-nest/src/wardrobe/logic/style.ts
export type UserStyle = {
  preferredColors?: string[]; // ['Brown','Navy']
  avoidColors?: string[]; // ['Black']
  preferredCategories?: string[]; // ['Tops','Outerwear','Shoes']
  avoidSubcategories?: string[]; // ['Jeans','Sneakers']
  favoriteBrands?: string[]; // ['Ferragamo','Pini Parma']
  dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
};

export type StyleWeights = {
  preferredColor: number;
  avoidColor: number;
  preferredCategory: number;
  avoidSubcategory: number;
  favoriteBrand: number;
  dressMatch: number;
};

export const DEFAULT_STYLE_WEIGHTS: StyleWeights = {
  preferredColor: 6,
  avoidColor: 8,
  preferredCategory: 4,
  avoidSubcategory: 7,
  favoriteBrand: 5,
  dressMatch: 5,
};

type Item = {
  main_category?: string;
  subcategory?: string;
  brand?: string;
  color?: string;
  color_family?: string;
  dress_code?: string;
  // NOTE: we don't require label, but if present we use it in debug logs.
  label?: string;
};

const t = (s: any) => (s ?? '').toString().trim().toLowerCase();
const STYLE_DEBUG = !!process.env.STYLE_DEBUG;

/**
 * Case-insensitive, tolerant color hit:
 *  - matches if itemColor includes pref (e.g., "light blue" ~ "blue")
 *  - or pref includes itemColor (e.g., "navy blue" ~ "navy")
 */
function colorHits(itemColorLc: string, prefLc: string) {
  if (!itemColorLc || !prefLc) return false;
  return itemColorLc.includes(prefLc) || prefLc.includes(itemColorLc);
}

export function scoreItemForStyle(
  item: Item,
  style: UserStyle | undefined,
  W: StyleWeights = DEFAULT_STYLE_WEIGHTS,
): number {
  if (!style) return 0;
  let score = 0;

  // Precompute normalized user prefs once
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

  // For human-friendly debug
  const reasons: string[] = [];

  // Preferred colors
  if (prefColors.length && color) {
    if (prefColors.some((c) => colorHits(color, c))) {
      score += W.preferredColor;
      reasons.push(`+${W.preferredColor} preferredColor:${color}`);
    }
  }

  // Avoid colors
  if (badColors.length && color) {
    if (badColors.some((c) => colorHits(color, c))) {
      score -= W.avoidColor;
      reasons.push(`-${W.avoidColor} avoidColor:${color}`);
    }
  }

  // Preferred categories
  if (prefCats.length && cat) {
    if (prefCats.includes(cat)) {
      score += W.preferredCategory;
      reasons.push(`+${W.preferredCategory} preferredCat:${cat}`);
    }
  }

  // Avoid subcategories
  if (badSubs.length && sub) {
    if (badSubs.includes(sub)) {
      score -= W.avoidSubcategory;
      reasons.push(`-${W.avoidSubcategory} avoidSub:${sub}`);
    }
  }

  // Favorite brands
  if (favBrands.length && brand) {
    if (favBrands.includes(brand)) {
      score += W.favoriteBrand;
      reasons.push(`+${W.favoriteBrand} brand:${brand}`);
    }
  }

  // Dress code bias
  if (dressBiasLc && dress && t(dress) === dressBiasLc) {
    score += W.dressMatch;
    reasons.push(`+${W.dressMatch} dressMatch:${dress}`);
  }

  if (STYLE_DEBUG) {
    const label =
      (item as any)?.label ||
      [item.main_category, item.subcategory].filter(Boolean).join(' / ') ||
      'Item';
    // Single concise line per item
    // Example: [STYLE] Black Leather Loafers — … → 6.00 (+5 brand:nike, +1 preferredCat:shoes)
    // (weights shown exactly from reasons list)
    // If no reasons → 'no-op'
    // Keep this log lightweight; [RERANK] stays in scoring.ts
    // eslint-disable-next-line no-console
    console.log(
      `[STYLE] ${label} → ${score.toFixed(2)} (${reasons.join(', ') || 'no-op'})`,
    );
  }

  return score;
}

/////////////////

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
// };

// const t = (s: any) => (s ?? '').toString().trim().toLowerCase();

// export function scoreItemForStyle(
//   item: Item,
//   style: UserStyle | undefined,
//   W: StyleWeights = DEFAULT_STYLE_WEIGHTS,
// ): number {
//   if (!style) return 0;
//   let score = 0;

//   const color = t(item.color) || t(item.color_family);
//   const cat = t(item.main_category);
//   const sub = t(item.subcategory);
//   const brand = t(item.brand);
//   const dress = t(item.dress_code);

//   if (style.preferredColors?.length && color) {
//     if (style.preferredColors.some((c) => color.includes(c.toLowerCase())))
//       score += W.preferredColor;
//   }
//   if (style.avoidColors?.length && color) {
//     if (style.avoidColors.some((c) => color.includes(c.toLowerCase())))
//       score -= W.avoidColor;
//   }
//   if (style.preferredCategories?.length && cat) {
//     if (style.preferredCategories.map(t).includes(cat))
//       score += W.preferredCategory;
//   }
//   if (style.avoidSubcategories?.length && sub) {
//     if (style.avoidSubcategories.map(t).includes(sub))
//       score -= W.avoidSubcategory;
//   }
//   if (style.favoriteBrands?.length && brand) {
//     if (style.favoriteBrands.map(t).includes(brand)) score += W.favoriteBrand;
//   }
//   if (style.dressBias && dress && t(dress) === t(style.dressBias)) {
//     score += W.dressMatch;
//   }
//   return score;
// }
