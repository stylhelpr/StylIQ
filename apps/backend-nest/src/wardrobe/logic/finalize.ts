// finalize.ts — post-LLM slot enforcement + backfill (moved from service)
import { parseConstraints } from './constraints';

type CatalogItemLite = {
  index: number;
  id: string;
  label: string;
  image_url?: string;
  main_category?: string;
  subcategory?: string;
  color?: string;
  color_family?: string;
  shoe_style?: string;
  dress_code?: string;
  formality_score?: number;
};

export function finalizeOutfitSlots(
  outfit: {
    title: string;
    items: CatalogItemLite[];
    why: string;
    missing?: string;
  },
  catalog: CatalogItemLite[],
  q: string,
) {
  const c = parseConstraints(q);
  const items = [...(outfit.items || [])];

  const ql = (q || '').toLowerCase();
  const excludeLoafers = /\b(no|without|exclude|avoid)\s+loafers?\b/.test(ql);
  const excludeSneakers = /\b(no|without|exclude|avoid)\s+sneakers?\b/.test(ql);
  const excludeBoots = /\b(no|without|exclude|avoid)\s+boots?\b/.test(ql);
  const excludeBrown = /\b(no|without|exclude|avoid)\s+brown\b/.test(ql);
  const userExcludedAllShoes =
    excludeLoafers && excludeSneakers && excludeBoots;
  const modelSaysNoFootwear =
    /\b(no suitable .*footwear|no appropriate .*footwear|footwear.*unavailable|no .*shoe)/i.test(
      outfit.missing || '',
    );

  const appendMissing = (msg: string) => {
    outfit.missing = outfit.missing ? outfit.missing : msg;
  };

  const subOf = (x: CatalogItemLite) => (x.subcategory ?? '').toLowerCase();
  const styleOf = (x: CatalogItemLite) => (x.shoe_style ?? '').toLowerCase();

  const isLoafer = (x: CatalogItemLite) =>
    subOf(x).includes('loafer') || styleOf(x).includes('loafer');
  const isSneaker = (x: CatalogItemLite) =>
    subOf(x).includes('sneaker') || styleOf(x).includes('sneaker');
  const isBoot = (x: CatalogItemLite) =>
    subOf(x).includes('boot') || styleOf(x).includes('boot');
  const isFootwear = (x: CatalogItemLite) =>
    x.main_category === 'Shoes' ||
    [
      'loafer',
      'sneaker',
      'boot',
      'heel',
      'pump',
      'oxford',
      'derby',
      'dress shoe',
      'sandal',
    ].some((k) => subOf(x).includes(k));

  const isBrownish = (x: CatalogItemLite) => {
    const a = (x.color ?? '').toLowerCase();
    const b = (x.color_family ?? '').toLowerCase();
    return (
      a.includes('brown') ||
      b === 'brown' ||
      a.includes('tan') ||
      a.includes('cognac')
    );
  };

  // De-dup outerwear (prefer blazer/sport coat)
  const outers = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.main_category === 'Outerwear');
  if (outers.length > 1) {
    outers.sort((a, b) => {
      const ap =
        a.it.subcategory === 'Blazer' || a.it.subcategory === 'Sport Coat'
          ? 0
          : 1;
      const bp =
        b.it.subcategory === 'Blazer' || b.it.subcategory === 'Sport Coat'
          ? 0
          : 1;
      return ap - bp || (a.it.index ?? 999) - (b.it.index ?? 999);
    });
    const keep = outers[0].i;
    for (let k = outers.length - 1; k >= 0; k--) {
      if (outers[k].i !== keep) items.splice(outers[k].i, 1);
    }
  }

  const pruneToOne = (
    pred: (x: CatalogItemLite) => boolean,
    prefer?: (A: CatalogItemLite, B: CatalogItemLite) => number,
  ) => {
    const matches = items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => pred(it));
    if (matches.length <= 1) return;
    matches.sort((a, b) =>
      prefer ? prefer(a.it, b.it) : (a.it.index ?? 999) - (b.it.index ?? 999),
    );
    const keep = matches[0].i;
    for (let k = matches.length - 1; k >= 0; k--) {
      if (matches[k].i !== keep) items.splice(matches[k].i, 1);
    }
  };

  const preferBottoms = (A: CatalogItemLite, B: CatalogItemLite) => {
    const aJeans = subOf(A) === 'jeans';
    const bJeans = subOf(B) === 'jeans';
    if (c.dressWanted === 'BusinessCasual') {
      if (aJeans && !bJeans) return 1;
      if (bJeans && !aJeans) return -1;
    }
    return (A.index ?? 999) - (B.index ?? 999);
  };

  const isExcludedShoe = (x: CatalogItemLite) =>
    (excludeLoafers && isLoafer(x)) ||
    (excludeSneakers && isSneaker(x)) ||
    (excludeBoots && isBoot(x)) ||
    (excludeBrown && isBrownish(x));

  const preferShoes = (A: CatalogItemLite, B: CatalogItemLite) => {
    const aExcluded = isExcludedShoe(A);
    const bExcluded = isExcludedShoe(B);
    if (aExcluded !== bExcluded) return aExcluded ? 1 : -1;

    const aLoafer = isLoafer(A),
      bLoafer = isLoafer(B);
    if (c.wantsLoafers && !excludeLoafers && aLoafer !== bLoafer)
      return aLoafer ? -1 : 1;

    const aBrown = isBrownish(A),
      bBrown = isBrownish(B);
    if (c.wantsBrown && !excludeBrown && aBrown !== bBrown)
      return aBrown ? -1 : 1;

    return (A.index ?? 999) - (B.index ?? 999);
  };

  pruneToOne((x) => x.main_category === 'Tops');
  pruneToOne((x) => x.main_category === 'Bottoms', preferBottoms);
  pruneToOne((x) => isFootwear(x), preferShoes);

  const hasTop = items.some((x) => x.main_category === 'Tops');
  const hasBottom = items.some((x) => x.main_category === 'Bottoms');
  const hasFootwear = items.some((x) => isFootwear(x));

  const pickBest = (
    pred: (x: CatalogItemLite) => boolean,
    prefer?: (A: CatalogItemLite, B: CatalogItemLite) => number,
  ) => {
    const pool = catalog.filter(pred);
    if (!pool.length) return undefined;
    if (!prefer) return pool[0];
    return pool.slice().sort(prefer)[0];
  };

  if (!hasTop) {
    const top = pickBest((x) => x.main_category === 'Tops');
    if (top) items.push(top);
    else appendMissing('A shirt');
  }

  if (!hasBottom) {
    const bottom = pickBest(
      (x) => x.main_category === 'Bottoms' && subOf(x) !== 'shorts',
      preferBottoms,
    );
    if (bottom) items.push(bottom);
    else appendMissing('Dress trousers');
  }

  const currentlyHasLoafer = items.some(isLoafer);
  if (userExcludedAllShoes || modelSaysNoFootwear) {
    if (!hasFootwear) appendMissing('Footwear');
  } else if (c.wantsLoafers && !excludeLoafers) {
    if (!currentlyHasLoafer) {
      const loafer =
        (c.wantsBrown &&
          !excludeBrown &&
          pickBest((x) => isLoafer(x) && isBrownish(x))) ||
        pickBest((x) => isLoafer(x));
      if (loafer) {
        const idx = items.findIndex(isFootwear);
        if (idx >= 0) items[idx] = loafer;
        else items.push(loafer);
        if (c.wantsBrown && !excludeBrown && !isBrownish(loafer))
          appendMissing('Brown loafers');
      } else {
        const alt = pickBest(
          (x) => isFootwear(x) && !isExcludedShoe(x),
          preferShoes,
        );
        if (alt) {
          const idx = items.findIndex(isFootwear);
          if (idx >= 0) items[idx] = alt;
          else items.push(alt);
        }
        appendMissing(
          c.wantsBrown && !excludeBrown ? 'Brown loafers' : 'Loafers',
        );
      }
    } else if (c.wantsBrown && !excludeBrown) {
      const idx = items.findIndex(isLoafer);
      if (idx >= 0 && !isBrownish(items[idx])) {
        const brownLoafer = pickBest((x) => isLoafer(x) && isBrownish(x));
        if (brownLoafer) items[idx] = brownLoafer;
        else appendMissing('Brown loafers');
      }
    }
  } else if (!hasFootwear) {
    const shoe = pickBest(
      (x) => isFootwear(x) && !isExcludedShoe(x),
      preferShoes,
    );
    if (shoe) items.push(shoe);
    else appendMissing('Footwear');
  }

  return { ...outfit, items };
}
