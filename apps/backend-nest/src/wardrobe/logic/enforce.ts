// enforce.ts — hard constraints after LLM (moved from service)
import { parseConstraints } from './constraints';

type CatalogItemLite = {
  main_category?: string;
  subcategory?: string;
  shoe_style?: string;
};

export function enforceConstraintsOnOutfits(
  outfits: Array<{
    title: string;
    items: any[];
    why: string;
    missing?: string;
  }>,
  catalog: Array<any>,
  q: string,
) {
  const c = parseConstraints(q);
  if (!c.wantsLoafers) return outfits;

  const bestLoafer = catalog.find(
    (x) =>
      x.main_category === 'Shoes' &&
      (x.subcategory === 'Loafers' || x.shoe_style === 'Loafer'),
  );

  return outfits.map((o) => {
    const hasLoafer = (o.items || []).some(
      (x: CatalogItemLite) =>
        x?.main_category === 'Shoes' &&
        (x?.subcategory === 'Loafers' || x?.shoe_style === 'Loafer'),
    );

    if (hasLoafer) return o;

    if (bestLoafer) {
      const idx = (o.items || []).findIndex(
        (x: CatalogItemLite) => x?.main_category === 'Shoes',
      );
      if (idx >= 0) {
        const newItems = [...o.items];
        newItems[idx] = bestLoafer;
        return { ...o, items: newItems };
      }
      return { ...o, items: [...(o.items || []), bestLoafer] };
    }

    return { ...o, missing: o.missing ? o.missing : 'Brown loafers' };
  });
}
