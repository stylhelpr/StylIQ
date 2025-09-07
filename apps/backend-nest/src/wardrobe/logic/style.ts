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
};

const t = (s: any) => (s ?? '').toString().trim().toLowerCase();

export function scoreItemForStyle(
  item: Item,
  style: UserStyle | undefined,
  W: StyleWeights = DEFAULT_STYLE_WEIGHTS,
): number {
  if (!style) return 0;
  let score = 0;

  const color = t(item.color) || t(item.color_family);
  const cat = t(item.main_category);
  const sub = t(item.subcategory);
  const brand = t(item.brand);
  const dress = t(item.dress_code);

  if (style.preferredColors?.length && color) {
    if (style.preferredColors.some((c) => color.includes(c.toLowerCase())))
      score += W.preferredColor;
  }
  if (style.avoidColors?.length && color) {
    if (style.avoidColors.some((c) => color.includes(c.toLowerCase())))
      score -= W.avoidColor;
  }
  if (style.preferredCategories?.length && cat) {
    if (style.preferredCategories.map(t).includes(cat))
      score += W.preferredCategory;
  }
  if (style.avoidSubcategories?.length && sub) {
    if (style.avoidSubcategories.map(t).includes(sub))
      score -= W.avoidSubcategory;
  }
  if (style.favoriteBrands?.length && brand) {
    if (style.favoriteBrands.map(t).includes(brand)) score += W.favoriteBrand;
  }
  if (style.dressBias && dress && t(dress) === t(style.dressBias)) {
    score += W.dressMatch;
  }
  return score;
}
