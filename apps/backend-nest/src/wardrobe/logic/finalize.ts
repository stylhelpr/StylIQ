import { parseConstraints } from './constraints';

export type CatalogItemLite = {
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

/**
 * Post-LLM slot enforcement + backfill
 * - De-dupes to one Top/Bottom/Shoes (with sensible prefs)
 * - Honors explicit user excludes (no loafers/sneakers/boots/brown)
 * - Ensures core slots exist; sets `missing` hints when not possible
 */
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
    outfit.missing = outfit.missing ? `${outfit.missing}; ${msg}` : msg;
  };

  const lc = (s?: string) => (s ?? '').toLowerCase();
  const subOf = (x: CatalogItemLite) => lc(x.subcategory);
  const styleOf = (x: CatalogItemLite) => lc(x.shoe_style);

  const isLoafer = (x: CatalogItemLite) =>
    /loafer/.test(subOf(x)) || /loafer/.test(styleOf(x));
  const isSneaker = (x: CatalogItemLite) =>
    /(sneaker|trainer)/.test(subOf(x)) || /(sneaker|trainer)/.test(styleOf(x));
  const isBoot = (x: CatalogItemLite) =>
    /boot/.test(subOf(x)) || /boot/.test(styleOf(x));
  const isFootwear = (x: CatalogItemLite) =>
    lc(x.main_category) === 'shoes' ||
    [
      'loafer',
      'sneaker',
      'trainer',
      'boot',
      'heel',
      'pump',
      'oxford',
      'derby',
      'dress shoe',
      'sandal',
    ].some((k) => subOf(x).includes(k));

  const isBrownish = (x: CatalogItemLite) => {
    const a = lc(x.color);
    const b = lc(x.color_family);
    const lbl = lc(x.label);
    return (
      a.includes('brown') ||
      b === 'brown' ||
      a.includes('tan') ||
      a.includes('cognac') ||
      lbl.includes('brown') ||
      lbl.includes('tan') ||
      lbl.includes('cognac')
    );
  };

  // De-dup outerwear (prefer blazer/sport coat)
  const outers = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => lc(it.main_category) === 'outerwear');
  if (outers.length > 1) {
    const prefScore = (s?: string) =>
      /\b(blazer|sport\s*coat)\b/i.test(lc(s)) ? 0 : 1;
    outers.sort(
      (a, b) =>
        prefScore(a.it.subcategory) - prefScore(b.it.subcategory) ||
        (a.it.index ?? 999) - (b.it.index ?? 999),
    );
    const keep = outers[0].i;
    const toRemove = outers
      .map((x) => x.i)
      .filter((i) => i !== keep)
      .sort((a, b) => b - a);
    for (const i of toRemove) items.splice(i, 1);
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
    const toRemove = matches
      .map((m) => m.i)
      .filter((i) => i !== keep)
      .sort((a, b) => b - a);
    for (const i of toRemove) items.splice(i, 1);
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

  const isTop = (x: CatalogItemLite) => lc(x.main_category) === 'tops';
  const isBottom = (x: CatalogItemLite) => lc(x.main_category) === 'bottoms';

  pruneToOne(isTop);
  pruneToOne(isBottom, preferBottoms);
  pruneToOne((x) => isFootwear(x), preferShoes);

  const hasTop = items.some(isTop);
  const hasBottom = items.some(isBottom);
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
    const top = pickBest((x) => isTop(x));
    if (top) items.push(top);
    else appendMissing('A shirt');
  }

  if (!hasBottom) {
    const bottom = pickBest(
      (x) => isBottom(x) && subOf(x) !== 'shorts',
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
        const idx = items.findIndex((x) => isFootwear(x));
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
          const idx = items.findIndex((x) => isFootwear(x));
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

/**
 * Post-LLM validator + array-level fallback
 * - Applies intent guards (gym/beach/wedding/black-tie)
 * - Drops/repairs items that violate the context
 * - If LLM returned zero/empty outfits, builds a deterministic fallback outfit
 */
export function validateOutfits(
  query: string,
  catalog: CatalogItemLite[],
  outfits: Array<{
    title: string;
    items: CatalogItemLite[];
    why: string;
    missing?: string;
  }>,
) {
  const q = (query || '').toLowerCase();
  const gym =
    /\b(gym|work\s?out|workout|training|exercise|hiit|running)\b/.test(q);
  const beach = /\b(beach|pool|swim|resort|vacation|cruise)\b/.test(q);
  const wedding = /\b(wedding|ceremony|reception)\b/.test(q);
  const blackTie = /\b(black\s*tie|white\s*tie|tux(edo)?)\b/.test(q);

  const lc = (s?: string) => (s ?? '').toLowerCase();
  const isBottom = (x?: CatalogItemLite) =>
    !!x &&
    (lc(x.main_category) === 'bottoms' ||
      /\b(shorts|trouser|pants|jeans|chinos|joggers?|sweatpants?|track)\b/i.test(
        lc(x.subcategory),
      ));

  const isShoes = (x?: CatalogItemLite) =>
    !!x && lc(x.main_category) === 'shoes';
  const isSneaker = (x?: CatalogItemLite) =>
    !!x &&
    /\b(sneakers?|trainers?|running|athletic)\b/i.test(lc(x.subcategory));
  const isDressShoe = (x?: CatalogItemLite) =>
    !!x &&
    /\b(oxfords?|derbys?|monks?|dress\s*shoes?|loafers?)\b/i.test(
      lc(x.subcategory),
    );
  const isShort = (x?: CatalogItemLite) =>
    !!x && /\bshorts?\b/i.test(lc(x.subcategory));
  const isHoodie = (x?: CatalogItemLite) =>
    !!x && /\bhoodie\b/i.test(lc(x.subcategory));
  const isOuter = (x?: CatalogItemLite) =>
    !!x && lc(x.main_category) === 'outerwear';

  const orderRank = (c: CatalogItemLite) =>
    lc(c.main_category) === 'tops'
      ? 1
      : isBottom(c)
        ? 2
        : isShoes(c)
          ? 3
          : isOuter(c)
            ? 4
            : 5;

  const pickFirst = (
    pool: CatalogItemLite[],
    pred: (x: CatalogItemLite) => boolean,
  ) => pool.find(pred);

  const applyContextGuards = (itemsIn: CatalogItemLite[]) => {
    let items = [...itemsIn];

    if (gym && !items.some(isSneaker)) {
      const snk = pickFirst(catalog, isSneaker);
      if (snk) items.push(snk);
    }

    if (wedding || blackTie) {
      items = items.filter((x) => !(isShort(x) || isHoodie(x) || isSneaker(x)));
      if (!items.some(isDressShoe)) {
        const ds = pickFirst(catalog, isDressShoe);
        if (ds) {
          const shoeIdx = items.findIndex(isShoes);
          if (shoeIdx >= 0) items[shoeIdx] = ds;
          else items.push(ds);
        }
      }
    }

    if (beach) {
      const heavyOuterIdx = items.findIndex(
        (x) =>
          isOuter(x) &&
          !/\b(linen|lightweight|unstructured)\b/i.test(x.label || ''),
      );
      if (heavyOuterIdx >= 0) items.splice(heavyOuterIdx, 1);
    }

    return items.sort((a, b) => orderRank(a) - orderRank(b)).slice(0, 6);
  };

  let out = outfits.map((o) => ({
    ...o,
    items: applyContextGuards(o.items || []),
  }));

  // Array-level fallback if LLM produced nothing useful
  if (out.length === 0 || out.every((o) => (o.items || []).length === 0)) {
    const tops = catalog.filter((x) => lc(x.main_category) === 'tops');
    const bottoms = catalog.filter(isBottom);
    const sneakers = catalog.filter(isSneaker);
    const dressShoes = catalog.filter(isDressShoe);
    const anyShoes = catalog.filter(isShoes);

    const top = tops[0];
    const bottom =
      (gym &&
        bottoms.find((b) =>
          /\b(shorts|joggers?|track|sweatpants?)\b/i.test(lc(b.subcategory)),
        )) ||
      (beach && bottoms.find((b) => /\bshorts?\b/i.test(lc(b.subcategory)))) ||
      ((wedding || blackTie) &&
        bottoms.find((b) =>
          /\b(trousers?|dress|suit)\b/i.test(lc(b.subcategory)),
        )) ||
      bottoms[0];

    const shoe =
      (gym && (sneakers[0] ?? anyShoes[0])) ||
      ((wedding || blackTie) && (dressShoes[0] ?? anyShoes[0])) ||
      anyShoes[0];

    const items = [top, bottom, shoe].filter(Boolean) as CatalogItemLite[];
    if (items.length) {
      out = [
        {
          title:
            (beach && 'Beach Fallback') ||
            (wedding && 'Wedding Fallback') ||
            (blackTie && 'Black Tie Fallback') ||
            (gym && 'Gym Fallback') ||
            'Smart Fallback',
          items,
          why: 'Auto-constructed from top-ranked catalog to satisfy context and slot coverage.',
        },
      ];
    }
  }

  return out;
}
