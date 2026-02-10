// enforce.ts — hard constraints after LLM (moved from service)
import { parseConstraints } from './constraints';
import { isSlot } from './categoryMapping';

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

  // Use canonical slot mapping for shoe detection
  const isLoaferItem = (x: CatalogItemLite) =>
    x.subcategory === 'Loafers' || x.shoe_style === 'Loafer';

  const bestLoafer = catalog.find(
    (x) => isSlot(x, 'shoes') && isLoaferItem(x),
  );

  return outfits.map((o) => {
    const hasLoafer = (o.items || []).some(
      (x: CatalogItemLite) => isSlot(x, 'shoes') && isLoaferItem(x),
    );

    if (hasLoafer) return o;

    if (bestLoafer) {
      const idx = (o.items || []).findIndex((x: CatalogItemLite) =>
        isSlot(x, 'shoes'),
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
