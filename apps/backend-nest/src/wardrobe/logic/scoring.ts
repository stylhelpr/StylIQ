// scoring.ts — item scoring + reranking (moved from service)
import type { ParsedConstraints } from './constraints';

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
};

const text = (val: any) => (val ?? '').toString().trim();

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
