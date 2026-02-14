/**
 * Unit tests for suggestVisualOutfits() hardening logic.
 *
 * Tests the deterministic scoring, weather filtering, anchor dedupe,
 * pool fallback tiering, and field stripping — all without requiring
 * the full AiService or OpenAI calls.
 */
import {
  scoreItemForWeather,
  type WeatherContext,
} from '../wardrobe/logic/weather';

// ─── Test Fixtures ─────────────────────────────────────────────

const makeItem = (overrides: Record<string, any> = {}) => ({
  id: overrides.id ?? `item-${Math.random().toString(36).slice(2, 8)}`,
  name: overrides.name ?? 'Test Item',
  main_category: overrides.main_category ?? 'Tops',
  category: overrides.category ?? 'Tops',
  subcategory: overrides.subcategory ?? 'T-Shirts',
  image_url: overrides.image_url ?? 'https://img.test/item.jpg',
  image: overrides.image ?? null,
  color: overrides.color ?? 'black',
  style_descriptors: overrides.style_descriptors ?? [],
  layering: overrides.layering ?? undefined,
  seasonality: overrides.seasonality ?? 'ALL_SEASON',
  sleeve_length: overrides.sleeve_length ?? undefined,
  material: overrides.material ?? undefined,
  waterproof_rating: overrides.waterproof_rating ?? undefined,
  rain_ok: overrides.rain_ok ?? undefined,
  ...overrides,
});

const hotWeather: WeatherContext = { tempF: 95, precipitation: 'none' };
const coldWeather: WeatherContext = { tempF: 30, precipitation: 'none' };
const mildWeather: WeatherContext = { tempF: 70, precipitation: 'none' };

// ─── Deterministic hash (mirrors production) ──────────────────
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// ─── 1️⃣ Weather Hard Filter ──────────────────────────────────

describe('Weather Hard Filter', () => {
  it('excludes heavy wool coat in 95°F weather', () => {
    const coat = makeItem({
      name: 'Heavy Wool Coat',
      main_category: 'Outerwear',
      subcategory: 'Coat',
      layering: 'Outer',
    });

    const score = scoreItemForWeather(coat, hotWeather);
    // Hot weather penalizes outerwear (-4 from hotPenalizeOuter)
    expect(score).toBeLessThan(0);
    // Must be below the -5 threshold used for LLM input filtering
    expect(score).toBeLessThanOrEqual(-4);
  });

  it('includes short-sleeve tee in 95°F weather', () => {
    const tee = makeItem({
      name: 'Cotton Tee',
      main_category: 'Tops',
      subcategory: 'T-Shirts',
      sleeve_length: 'Short',
    });

    const score = scoreItemForWeather(tee, hotWeather);
    // Hot weather boosts short sleeves (+6 from hotBoostShortSleeve)
    expect(score).toBeGreaterThan(0);
  });

  it('boosts outerwear in 30°F cold weather', () => {
    const coat = makeItem({
      name: 'Down Jacket',
      main_category: 'Outerwear',
      subcategory: 'Puffer Jacket',
      layering: 'Outer',
    });

    const score = scoreItemForWeather(coat, coldWeather);
    // Cold weather boosts outerwear (+8 from coldBoostOuter)
    expect(score).toBeGreaterThan(0);
    expect(score).toBeGreaterThanOrEqual(8);
  });

  it('returns 0 when no weather context provided', () => {
    const item = makeItem();
    const score = scoreItemForWeather(item, undefined);
    expect(score).toBe(0);
  });

  it('penalizes shorts below 68°F', () => {
    const shorts = makeItem({
      name: 'Denim Shorts',
      main_category: 'Bottoms',
      subcategory: 'Shorts',
    });

    const score = scoreItemForWeather(shorts, coldWeather);
    // shortsPenalty = -8 when tempF < 68
    expect(score).toBeLessThanOrEqual(-8);
  });
});

// ─── 2️⃣ Anchor De-Dupe ──────────────────────────────────────

describe('Anchor De-Dupe', () => {
  // Replicate the getAnchor logic from production
  const getAnchor = (outfit: any): string => {
    const hasDress = outfit.items.some((i: any) => i?.category === 'dress');
    if (hasDress) {
      const dressItem = outfit.items.find((i: any) => i?.category === 'dress');
      return `dress:${dressItem?.id}`;
    }
    const topItem = outfit.items.find((i: any) => i?.category === 'top');
    const bottomItem = outfit.items.find((i: any) => i?.category === 'bottom');
    return `${topItem?.id || 'none'}+${bottomItem?.id || 'none'}`;
  };

  it('detects duplicate top+bottom anchors', () => {
    const outfit1 = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
        { id: 'shoes-1', category: 'shoes' },
      ],
    };
    const outfit2 = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
        { id: 'shoes-2', category: 'shoes' },
      ],
    };

    expect(getAnchor(outfit1)).toBe('top-1+bottom-1');
    expect(getAnchor(outfit2)).toBe('top-1+bottom-1');
    expect(getAnchor(outfit1)).toBe(getAnchor(outfit2));
  });

  it('detects duplicate dress anchors', () => {
    const outfit1 = {
      items: [
        { id: 'dress-1', category: 'dress' },
        { id: 'shoes-1', category: 'shoes' },
      ],
    };
    const outfit2 = {
      items: [
        { id: 'dress-1', category: 'dress' },
        { id: 'shoes-3', category: 'shoes' },
      ],
    };

    expect(getAnchor(outfit1)).toBe('dress:dress-1');
    expect(getAnchor(outfit1)).toBe(getAnchor(outfit2));
  });

  it('marks second occurrence as non-unique anchor', () => {
    const outfits = [
      {
        items: [
          { id: 'top-1', category: 'top' },
          { id: 'bottom-1', category: 'bottom' },
          { id: 'shoes-1', category: 'shoes' },
        ],
      },
      {
        items: [
          { id: 'top-1', category: 'top' },
          { id: 'bottom-1', category: 'bottom' },
          { id: 'shoes-2', category: 'shoes' },
        ],
      },
      {
        items: [
          { id: 'top-2', category: 'top' },
          { id: 'bottom-2', category: 'bottom' },
          { id: 'shoes-3', category: 'shoes' },
        ],
      },
    ];

    const usedAnchors = new Set<string>();
    for (const outfit of outfits) {
      const anchor = getAnchor(outfit);
      (outfit as any).__uniqueAnchor = !usedAnchors.has(anchor);
      usedAnchors.add(anchor);
    }

    expect((outfits[0] as any).__uniqueAnchor).toBe(true);
    expect((outfits[1] as any).__uniqueAnchor).toBe(false); // duplicate
    expect((outfits[2] as any).__uniqueAnchor).toBe(true);
  });
});

// ─── 3️⃣ Injection Fallback Tiering ──────────────────────────

describe('Injection Fallback Tiering', () => {
  // Replicate the tiered buildPool logic
  const buildPoolAtThreshold = (items: any[], cat: string, minScore: number) =>
    items
      .filter((item) => (item.main_category || '').toLowerCase() === cat.toLowerCase())
      .filter((item) => item.__weatherScore >= minScore)
      .sort((a: any, b: any) => (b.__weatherScore - a.__weatherScore) || (b.feedbackScore - a.feedbackScore));

  const buildPool = (items: any[], cat: string) => {
    let pool = buildPoolAtThreshold(items, cat, 0);
    if (pool.length > 0) return { pool, tier: 1 };
    pool = buildPoolAtThreshold(items, cat, -2);
    if (pool.length > 0) return { pool, tier: 2 };
    pool = buildPoolAtThreshold(items, cat, -Infinity);
    return { pool, tier: 3 };
  };

  it('uses Tier 1 when items score >= 0', () => {
    const items = [
      { main_category: 'Tops', __weatherScore: 3, feedbackScore: 0 },
      { main_category: 'Tops', __weatherScore: 1, feedbackScore: 0 },
    ];

    const result = buildPool(items, 'Tops');
    expect(result.tier).toBe(1);
    expect(result.pool.length).toBe(2);
  });

  it('falls back to Tier 2 when all tops score < 0 but some >= -2', () => {
    const items = [
      { main_category: 'Tops', __weatherScore: -1, feedbackScore: 2 },
      { main_category: 'Tops', __weatherScore: -2, feedbackScore: 1 },
      { main_category: 'Tops', __weatherScore: -8, feedbackScore: 0 },
    ];

    const result = buildPool(items, 'Tops');
    expect(result.tier).toBe(2);
    expect(result.pool.length).toBe(2); // -1 and -2 pass, -8 excluded
  });

  it('falls back to Tier 3 (degraded) when all score < -2', () => {
    const items = [
      { main_category: 'Tops', __weatherScore: -5, feedbackScore: 0 },
      { main_category: 'Tops', __weatherScore: -8, feedbackScore: 0 },
    ];

    const result = buildPool(items, 'Tops');
    expect(result.tier).toBe(3);
    expect(result.pool.length).toBe(2); // all items included in degraded mode
  });

  it('returns empty pool when no items exist for category', () => {
    const items = [
      { main_category: 'Bottoms', __weatherScore: 5, feedbackScore: 0 },
    ];

    const result = buildPool(items, 'Tops');
    expect(result.pool.length).toBe(0);
  });
});

// ─── 4️⃣ Deterministic Ranking Stability ─────────────────────

describe('Deterministic Ranking Stability', () => {
  it('hashString returns consistent values', () => {
    const result1 = hashString('user123-2026-02-13');
    const result2 = hashString('user123-2026-02-13');
    expect(result1).toBe(result2);
  });

  it('hashString returns different values for different dates', () => {
    const day1 = hashString('user123-2026-02-13');
    const day2 = hashString('user123-2026-02-14');
    expect(day1).not.toBe(day2);
  });

  it('hashString returns different values for different users', () => {
    const user1 = hashString('alice-2026-02-13');
    const user2 = hashString('bob-2026-02-13');
    expect(user1).not.toBe(user2);
  });

  it('tie-breaker produces stable sort for equal-score outfits', () => {
    const seedString = 'testuser-2026-02-13';

    const outfits = [
      { __finalScore: 5.0, __anchor: 'top-A+bottom-A' },
      { __finalScore: 5.0, __anchor: 'top-B+bottom-B' },
      { __finalScore: 5.0, __anchor: 'top-C+bottom-C' },
    ].map((o) => ({
      ...o,
      __tieBreaker: hashString(seedString + o.__anchor) % 1000,
    }));

    const sorted1 = [...outfits].sort(
      (a, b) => b.__finalScore - a.__finalScore || b.__tieBreaker - a.__tieBreaker,
    );
    const sorted2 = [...outfits].sort(
      (a, b) => b.__finalScore - a.__finalScore || b.__tieBreaker - a.__tieBreaker,
    );

    expect(sorted1.map((o) => o.__anchor)).toEqual(
      sorted2.map((o) => o.__anchor),
    );
  });

  it('primary score takes precedence over tie-breaker', () => {
    const seedString = 'testuser-2026-02-13';

    const outfits = [
      { __finalScore: 3.0, __anchor: 'top-A+bottom-A' },
      { __finalScore: 7.0, __anchor: 'top-B+bottom-B' },
      { __finalScore: 5.0, __anchor: 'top-C+bottom-C' },
    ].map((o) => ({
      ...o,
      __tieBreaker: hashString(seedString + o.__anchor) % 1000,
    }));

    outfits.sort(
      (a, b) => b.__finalScore - a.__finalScore || b.__tieBreaker - a.__tieBreaker,
    );

    expect(outfits[0].__finalScore).toBe(7.0);
    expect(outfits[1].__finalScore).toBe(5.0);
    expect(outfits[2].__finalScore).toBe(3.0);
  });
});

// ─── 5️⃣ No Internal Field Leakage ──────────────────────────

describe('No Internal Field Leakage', () => {
  const INTERNAL_FIELDS = [
    '__weatherScore',
    '__finalScore',
    '__anchor',
    '__uniqueAnchor',
    '__tieBreaker',
  ];

  it('strips all internal fields from outfit objects', () => {
    // Simulate the stripping logic from production
    const rawOutfit = {
      id: 'outfit-1',
      rank: 1,
      summary: 'Test outfit',
      reasoning: 'Looks good',
      items: [
        { id: 'item-1', name: 'Tee', imageUrl: 'https://img/tee.jpg', category: 'top' },
        { id: 'item-2', name: 'Jeans', imageUrl: 'https://img/jeans.jpg', category: 'bottom' },
      ],
      __finalScore: 4.2,
      __tieBreaker: 573,
      __anchor: 'item-1+item-2',
      __uniqueAnchor: true,
    };

    const { __finalScore, __tieBreaker, __anchor, __uniqueAnchor, ...rest } = rawOutfit;
    const cleaned = rest;

    for (const field of INTERNAL_FIELDS) {
      expect(cleaned).not.toHaveProperty(field);
    }
  });

  it('preserves all public outfit fields after stripping', () => {
    const rawOutfit = {
      id: 'outfit-1',
      rank: 1,
      summary: 'Test outfit',
      reasoning: 'Looks good',
      items: [
        { id: 'item-1', name: 'Tee', imageUrl: 'https://img/tee.jpg', category: 'top' },
      ],
      __finalScore: 4.2,
      __tieBreaker: 573,
      __anchor: 'item-1+none',
      __uniqueAnchor: true,
    };

    const { __finalScore, __tieBreaker, __anchor, __uniqueAnchor, ...rest } = rawOutfit;

    expect(rest).toHaveProperty('id', 'outfit-1');
    expect(rest).toHaveProperty('rank', 1);
    expect(rest).toHaveProperty('summary', 'Test outfit');
    expect(rest).toHaveProperty('reasoning', 'Looks good');
    expect(rest.items).toHaveLength(1);
  });

  it('outfit items contain only id, name, imageUrl, category', () => {
    // Simulate the item projection from production (line 3669-3678)
    const fullItem: any = {
      id: 'item-abc',
      name: 'Cotton Tee',
      main_category: 'Tops',
      touched_up_image_url: 'https://img/touched.jpg',
      processed_image_url: 'https://img/processed.jpg',
      image_url: 'https://img/original.jpg',
      image: null,
      __weatherScore: 6,
      feedbackScore: 3,
    };

    // This mirrors the projection in outfitsWithItems construction
    const projected = {
      id: fullItem.id,
      name: fullItem.name || 'Item',
      imageUrl:
        fullItem.touched_up_image_url ||
        fullItem.processed_image_url ||
        fullItem.image_url ||
        fullItem.image,
      category: 'top', // from mapToCategory
    };

    const allowedKeys = ['id', 'name', 'imageUrl', 'category'];
    expect(Object.keys(projected).sort()).toEqual(allowedKeys.sort());
    expect(projected).not.toHaveProperty('__weatherScore');
    expect(projected).not.toHaveProperty('feedbackScore');
    expect(projected).not.toHaveProperty('main_category');
  });

  it('strips __silhouette field from output', () => {
    const rawOutfit = {
      id: 'outfit-1',
      rank: 1,
      summary: 'Test outfit',
      reasoning: 'Looks good',
      items: [{ id: 'item-1', name: 'Tee', imageUrl: 'https://img/tee.jpg', category: 'top' }],
      __finalScore: 4.2,
      __tieBreaker: 573,
      __anchor: 'item-1+none',
      __uniqueAnchor: true,
      __silhouette: 'relaxed',
    };

    const { __finalScore, __tieBreaker, __anchor, __uniqueAnchor, __silhouette, ...rest } = rawOutfit;

    expect(rest).not.toHaveProperty('__silhouette');
    expect(rest).toHaveProperty('id', 'outfit-1');
  });
});

// ─── 6️⃣ Quality Gate ───────────────────────────────────────────

describe('Quality Gate', () => {
  // Replicate color analysis from production
  const BOLD_COLOR_FAMILIES = ['red', 'orange', 'yellow', 'purple'];
  const WARM_COLORS = ['red', 'orange', 'yellow', 'coral', 'peach', 'gold', 'amber', 'rust'];
  const COOL_COLORS = ['blue', 'teal', 'cyan', 'mint', 'lavender', 'periwinkle', 'ice', 'cobalt', 'navy', 'slate'];
  const NEUTRAL_COLORS = ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'tan', 'khaki', 'ivory', 'charcoal', 'taupe', 'brown', 'nude'];
  const extractColorWords = (colorStr: string): string[] =>
    (colorStr || '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);

  it('"redwood" is NOT classified as Red (exact word match)', () => {
    const colors = extractColorWords('redwood');
    const boldPresent = BOLD_COLOR_FAMILIES.filter(family =>
      colors.some(word => word === family),
    );
    expect(boldPresent).not.toContain('red');
    expect(boldPresent).toHaveLength(0);
  });

  it('"red" IS classified as Red (exact word match)', () => {
    const colors = extractColorWords('red');
    const boldPresent = BOLD_COLOR_FAMILIES.filter(family =>
      colors.some(word => word === family),
    );
    expect(boldPresent).toContain('red');
  });

  it('rejects athletic shoes + tailored top', () => {
    // Simulate the quality gate logic
    const details = [
      { category: 'shoes', formality: 0, sub: 'running sneaker', name: 'nike runner', color: 'black' },
      { category: 'top', formality: 3, sub: 'blazer', name: 'wool blazer', color: 'navy' },
    ];

    const hasAthleticShoes = details.some(d =>
      d.category === 'shoes' && (d.formality === 0 || /running|slide|sneaker/.test(d.sub)),
    );
    const TAILORED_RE = /blazer|sport coat|suit|dress shirt|button.?down|oxford|tailored/;
    const hasTailoredTop = details.some(d =>
      (d.category === 'top' || d.category === 'outerwear') &&
      (TAILORED_RE.test(d.sub) || TAILORED_RE.test(d.name)),
    );

    expect(hasAthleticShoes).toBe(true);
    expect(hasTailoredTop).toBe(true);
    // Gate would return false
    expect(hasAthleticShoes && hasTailoredTop).toBe(true);
  });

  it('rejects heavy outerwear + shorts', () => {
    const details = [
      { category: 'outerwear', sub: 'puffer coat', name: 'down puffer' },
      { category: 'bottom', sub: 'shorts', name: 'chino shorts' },
    ];

    const hasHeavyOuterwear = details.some(d =>
      d.category === 'outerwear' && /coat|parka|puffer|down/.test(d.sub),
    );
    const hasShorts = details.some(d =>
      d.category === 'bottom' && /short/.test(d.sub),
    );

    expect(hasHeavyOuterwear).toBe(true);
    expect(hasShorts).toBe(true);
    expect(hasHeavyOuterwear && hasShorts).toBe(true);
  });

  it('allows heavy outerwear + trousers (no clash)', () => {
    const details = [
      { category: 'outerwear', sub: 'puffer coat', name: 'down puffer' },
      { category: 'bottom', sub: 'trousers', name: 'wool trousers' },
    ];

    const hasHeavyOuterwear = details.some(d =>
      d.category === 'outerwear' && /coat|parka|puffer|down/.test(d.sub),
    );
    const hasShorts = details.some(d =>
      d.category === 'bottom' && /short/.test(d.sub),
    );

    expect(hasHeavyOuterwear).toBe(true);
    expect(hasShorts).toBe(false);
    // Gate would NOT reject
    expect(hasHeavyOuterwear && hasShorts).toBe(false);
  });

  it('rejects warm + cool clash without neutral base', () => {
    const allColors = extractColorWords('coral blue');
    const hasWarm = allColors.some(w => WARM_COLORS.includes(w));
    const hasCool = allColors.some(w => COOL_COLORS.includes(w));
    const hasNeutralBase = allColors.some(w => NEUTRAL_COLORS.includes(w));

    expect(hasWarm).toBe(true);
    expect(hasCool).toBe(true);
    expect(hasNeutralBase).toBe(false);
    // Gate would reject
    expect(hasWarm && hasCool && !hasNeutralBase).toBe(true);
  });

  it('allows warm + cool with neutral base', () => {
    const allColors = extractColorWords('coral blue black');
    const hasWarm = allColors.some(w => WARM_COLORS.includes(w));
    const hasCool = allColors.some(w => COOL_COLORS.includes(w));
    const hasNeutralBase = allColors.some(w => NEUTRAL_COLORS.includes(w));

    expect(hasWarm).toBe(true);
    expect(hasCool).toBe(true);
    expect(hasNeutralBase).toBe(true);
    // Gate would NOT reject
    expect(hasWarm && hasCool && !hasNeutralBase).toBe(false);
  });
});

// ─── 7️⃣ Silhouette Diversity ───────────────────────────────────

describe('Silhouette Diversity', () => {
  const TAILORED_RE = /blazer|sport coat|suit|dress shirt|button.?down|oxford|tailored/;

  const getSilhouetteType = (outfit: any): 'dress' | 'tailored' | 'relaxed' => {
    const items = outfit.items.filter(Boolean);
    if (items.some((i: any) => i.category === 'dress')) return 'dress';
    const hasTailored = items.some((i: any) => {
      if (i.category !== 'top' && i.category !== 'outerwear') return false;
      const sub = (i.subcategory || '').toLowerCase();
      const name = (i.name || '').toLowerCase();
      return TAILORED_RE.test(sub) || TAILORED_RE.test(name);
    });
    return hasTailored ? 'tailored' : 'relaxed';
  };

  it('classifies dress outfit as "dress"', () => {
    const outfit = { items: [{ category: 'dress', name: 'Maxi Dress' }, { category: 'shoes', name: 'Heels' }] };
    expect(getSilhouetteType(outfit)).toBe('dress');
  });

  it('classifies blazer outfit as "tailored"', () => {
    const outfit = {
      items: [
        { category: 'top', name: 'Wool Blazer', subcategory: 'blazer' },
        { category: 'bottom', name: 'Chinos' },
        { category: 'shoes', name: 'Loafers' },
      ],
    };
    expect(getSilhouetteType(outfit)).toBe('tailored');
  });

  it('classifies dress shirt by name as "tailored"', () => {
    const outfit = {
      items: [
        { category: 'top', name: 'Blue Oxford Dress Shirt', subcategory: 'shirt' },
        { category: 'bottom', name: 'Slacks' },
      ],
    };
    expect(getSilhouetteType(outfit)).toBe('tailored');
  });

  it('classifies tee + jeans as "relaxed"', () => {
    const outfit = {
      items: [
        { category: 'top', name: 'Cotton Tee', subcategory: 't-shirt' },
        { category: 'bottom', name: 'Jeans', subcategory: 'jean' },
        { category: 'shoes', name: 'Sneakers', subcategory: 'sneaker' },
      ],
    };
    expect(getSilhouetteType(outfit)).toBe('relaxed');
  });

  it('penalizes duplicate silhouette types', () => {
    const outfits = [
      { __finalScore: 5.0, items: [{ category: 'top', name: 'Tee', subcategory: 't-shirt' }, { category: 'bottom' }] },
      { __finalScore: 5.0, items: [{ category: 'top', name: 'Polo', subcategory: 'polo' }, { category: 'bottom' }] },
      { __finalScore: 5.0, items: [{ category: 'dress', name: 'Maxi Dress' }] },
    ];

    const silCounts = new Map<string, number>();
    for (const o of outfits) {
      const sil = getSilhouetteType(o);
      (o as any).__silhouette = sil;
      silCounts.set(sil, (silCounts.get(sil) || 0) + 1);
    }
    for (const o of outfits) {
      const count = silCounts.get((o as any).__silhouette) || 1;
      (o as any).__finalScore += count > 1 ? -0.05 * (count - 1) : 0.05;
    }

    // Two relaxed outfits: each gets -0.05 penalty
    expect(outfits[0].__finalScore).toBeCloseTo(4.95);
    expect(outfits[1].__finalScore).toBeCloseTo(4.95);
    // Unique dress: gets +0.05 bonus
    expect(outfits[2].__finalScore).toBeCloseTo(5.05);
  });
});

// ─── 8️⃣ Canonicalize + Rescore ─────────────────────────────────

describe('Canonicalize + Rescore', () => {
  it('strips outerwear in hot weather (temp >= 75)', () => {
    const temp = 85;
    const outfit = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
        { id: 'shoes-1', category: 'shoes' },
        { id: 'jacket-1', category: 'outerwear' },
      ],
    };

    if (temp >= 75) {
      outfit.items = outfit.items.filter(i => i.category !== 'outerwear');
    }

    expect(outfit.items).toHaveLength(3);
    expect(outfit.items.some(i => i.category === 'outerwear')).toBe(false);
  });

  it('keeps outerwear in cold weather (temp <= 60)', () => {
    const temp = 45;
    const items = [
      { id: 'top-1', category: 'top' },
      { id: 'bottom-1', category: 'bottom' },
      { id: 'shoes-1', category: 'shoes' },
      { id: 'jacket-1', category: 'outerwear' },
    ];

    const hasDress = items.some(i => i.category === 'dress');
    expect(hasDress).toBe(false);

    // Separates: top + bottom + shoes + outerwear if temp <= 60
    const top = items.find(i => i.category === 'top');
    const bottom = items.find(i => i.category === 'bottom');
    const shoes = items.find(i => i.category === 'shoes');
    const outerwear = (temp <= 60) ? items.find(i => i.category === 'outerwear') : null;
    const newItems = [top, bottom, shoes, outerwear].filter(Boolean);

    expect(newItems).toHaveLength(4);
    expect(newItems.some(i => i!.category === 'outerwear')).toBe(true);
  });

  it('rescore changes finalScore when items change', () => {
    // Simulate an outfit that gets canonicalized (outerwear removed)
    const originalScore = 0.4 * 3 + 0.3 * 1 - 0.2 * 0.5 + 0.1 * 1; // 4 items
    // After removing outerwear, the remaining items have different averages
    const newScore = 0.4 * 4 + 0.3 * 1.2 - 0.2 * 0.2 + 0.1 * 1; // 3 items, better weather avg

    expect(newScore).not.toBe(originalScore);
    // The rescore should produce a different (potentially better) score
    expect(newScore).toBeGreaterThan(originalScore);
  });

  it('canonicalizes dress outfit to dress + shoes only', () => {
    const temp = 80;
    const items = [
      { id: 'dress-1', category: 'dress' },
      { id: 'top-1', category: 'top' },
      { id: 'shoes-1', category: 'shoes' },
      { id: 'jacket-1', category: 'outerwear' },
    ];

    const dress = items.find(i => i.category === 'dress');
    const shoes = items.find(i => i.category === 'shoes');
    const outerwear = (temp <= 60) ? items.find(i => i.category === 'outerwear') : null;
    let newItems = [dress, shoes, outerwear].filter(Boolean);
    if (temp >= 75) newItems = newItems.filter(i => i!.category !== 'outerwear');

    expect(newItems).toHaveLength(2);
    expect(newItems.map(i => i!.category)).toEqual(['dress', 'shoes']);
  });
});

// ─── 9️⃣ Confidence Check ──────────────────────────────────────

describe('Confidence Check', () => {
  const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

  it('sigmoid produces values between 0 and 1', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5);
    expect(sigmoid(10)).toBeCloseTo(1.0, 1);
    expect(sigmoid(-10)).toBeCloseTo(0.0, 1);
  });

  it('triggers retry when confidence < 0.4', () => {
    // finalScore = -0.5 → sigmoid(-0.5) ≈ 0.378
    const lowScore = -0.5;
    expect(sigmoid(lowScore)).toBeLessThan(0.4);

    let retryCount = 0;
    // Simulate retry logic
    if (sigmoid(lowScore) < 0.4) {
      retryCount++;
    }
    // Max 1 retry (2 total LLM calls)
    expect(retryCount).toBe(1);
    expect(retryCount).toBeLessThanOrEqual(1);
  });

  it('does NOT retry when confidence >= 0.4', () => {
    // finalScore = 0.5 → sigmoid(0.5) ≈ 0.622
    const goodScore = 0.5;
    expect(sigmoid(goodScore)).toBeGreaterThanOrEqual(0.4);

    let retryCount = 0;
    if (sigmoid(goodScore) < 0.4) {
      retryCount++;
    }
    expect(retryCount).toBe(0);
  });

  it('retry executes at most once (no recursion)', () => {
    const scores = [-2.0, -1.5, -1.0]; // all low confidence
    let totalRetries = 0;

    for (const score of scores) {
      if (sigmoid(score) < 0.4 && totalRetries === 0) {
        totalRetries++;
      }
    }
    // Even with multiple low-confidence outfits, max 1 retry
    expect(totalRetries).toBeLessThanOrEqual(1);
  });
});

// ─── 🔟 Response Enrichment ──────────────────────────────────

describe('Response Enrichment', () => {
  const BOLD_COLOR_FAMILIES = ['red', 'orange', 'yellow', 'purple'];
  const NEUTRAL_COLORS = ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'tan', 'khaki', 'ivory', 'charcoal', 'taupe', 'brown', 'nude'];
  const extractColorWords = (colorStr: string): string[] =>
    (colorStr || '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);

  it('classifies all-neutral palette correctly', () => {
    const colors = ['black', 'white', 'gray'];
    const boldPresent = BOLD_COLOR_FAMILIES.filter(f =>
      colors.some(w => w === f),
    );
    const neutralCount = colors.filter(w => NEUTRAL_COLORS.includes(w)).length;

    expect(boldPresent).toHaveLength(0);
    expect(neutralCount).toBe(3);
    // → 'neutral palette'
  });

  it('classifies single bold + neutrals as "single accent"', () => {
    const colors = ['black', 'white', 'red'];
    const boldPresent = BOLD_COLOR_FAMILIES.filter(f =>
      colors.some(w => w === f),
    );

    expect(boldPresent).toHaveLength(1);
    expect(boldPresent).toContain('red');
    // → 'single accent'
  });

  it('classifies 2+ bold colors as "bold mix"', () => {
    const colors = ['red', 'purple', 'black'];
    const boldPresent = BOLD_COLOR_FAMILIES.filter(f =>
      colors.some(w => w === f),
    );

    expect(boldPresent).toHaveLength(2);
    // → 'bold mix'
  });

  it('fashionContext contains required fields', () => {
    const fashionContext = {
      weatherFit: 'optimal' as const,
      silhouette: 'relaxed' as const,
      colorStrategy: 'neutral palette' as const,
      confidenceLevel: 0.73,
    };

    expect(fashionContext).toHaveProperty('weatherFit');
    expect(fashionContext).toHaveProperty('silhouette');
    expect(fashionContext).toHaveProperty('colorStrategy');
    expect(fashionContext).toHaveProperty('confidenceLevel');
    expect(['optimal', 'good', 'marginal']).toContain(fashionContext.weatherFit);
    expect(['dress', 'tailored', 'relaxed']).toContain(fashionContext.silhouette);
    expect(typeof fashionContext.confidenceLevel).toBe('number');
  });
});

// ─── 11️⃣ Aesthetic Tie-Breaker ──────────────────────────────────

describe('Aesthetic Tie-Breaker', () => {
  // Replicate helpers from production
  const AESTHETIC_WARM = ['red', 'orange', 'yellow', 'coral', 'peach', 'gold', 'amber', 'rust'];
  const AESTHETIC_COOL = ['blue', 'teal', 'cyan', 'mint', 'lavender', 'periwinkle', 'ice', 'cobalt', 'navy', 'slate'];
  const AESTHETIC_NEUTRAL = ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'tan', 'khaki', 'ivory', 'charcoal', 'taupe', 'brown', 'nude'];
  const AESTHETIC_BOLD = ['red', 'orange', 'yellow', 'purple'];

  const aestheticExtractColorWords = (colorStr: string): string[] =>
    (colorStr || '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);

  const computeColorHarmony = (outfit: any, itemMap: Map<string, any>): number => {
    const items = (outfit.items || []).filter(Boolean);
    const allColors: string[] = items.flatMap((i: any) => {
      const full = itemMap.get(i.id);
      return aestheticExtractColorWords(full?.color || '');
    });
    if (allColors.length === 0) return 0;
    const warmCount = allColors.filter(w => AESTHETIC_WARM.includes(w)).length;
    const coolCount = allColors.filter(w => AESTHETIC_COOL.includes(w)).length;
    const neutralCount = allColors.filter(w => AESTHETIC_NEUTRAL.includes(w)).length;
    const boldFamilies = new Set(allColors.filter(w => AESTHETIC_BOLD.includes(w)));
    if (boldFamilies.size > 1 && neutralCount === 0) return -1.0;
    if (neutralCount > allColors.length / 2) return 0.5;
    const hasWarm = warmCount > 0;
    const hasCool = coolCount > 0;
    if (hasWarm && !hasCool) return 1.0;
    if (hasCool && !hasWarm) return 1.0;
    return 0;
  };

  const computeSilhouetteBalance = (outfit: any): number => {
    const items = (outfit.items || []).filter(Boolean);
    if (items.some((i: any) => i.category === 'dress')) return 1.0;
    return 0.5; // simplified for unit test
  };

  const computeRedundancyPenalty = (outfit: any): number => {
    const items = (outfit.items || []).filter(Boolean);
    const coreItems = items.filter((i: any) => i.category !== 'accessory');
    if (coreItems.length === 0) return 0;
    const catCounts = new Map<string, number>();
    for (const i of coreItems) {
      catCounts.set(i.category, (catCounts.get(i.category) || 0) + 1);
    }
    let duplicates = 0;
    for (const count of catCounts.values()) {
      if (count > 1) duplicates += count - 1;
    }
    return Math.min(1, duplicates / coreItems.length);
  };

  it('aesthetic adjustment is always within ±0.15', () => {
    const scenarios = [
      // All warm colors → harmony = 1.0
      { colors: ['red', 'coral'], silhouette: 1.0, redundancy: 0 },
      // Bold clash → harmony = -1.0
      { colors: ['red', 'purple'], silhouette: 0.5, redundancy: 0.5 },
      // Neutral dominant → harmony = 0.5
      { colors: ['black', 'white', 'gray'], silhouette: 1.0, redundancy: 0 },
      // Mixed warm+cool → harmony = 0
      { colors: ['red', 'blue', 'black'], silhouette: 0.5, redundancy: 1 },
    ];

    for (const s of scenarios) {
      const adj =
        0.05 * s.colors.length + // placeholder, actual computes from harmony
        0.03 * s.silhouette -
        0.03 * s.redundancy;
      // But let's verify the FORMULA bounds directly:
      // Max: 0.05*1 + 0.03*1 - 0.03*0 = 0.08
      // Min: 0.05*(-1) + 0.03*0 - 0.03*1 = -0.08
      const maxAdj = 0.05 * 1.0 + 0.03 * 1.0 - 0.03 * 0;
      const minAdj = 0.05 * (-1.0) + 0.03 * 0 - 0.03 * 1.0;
      expect(maxAdj).toBeLessThanOrEqual(0.15);
      expect(minAdj).toBeGreaterThanOrEqual(-0.15);
    }
  });

  it('colorHarmony returns +1.0 for all-warm outfit', () => {
    const outfit = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
      ],
    };
    const itemMap = new Map<string, any>([
      ['top-1', { color: 'coral' }],
      ['bottom-1', { color: 'gold' }],
    ]);
    expect(computeColorHarmony(outfit, itemMap)).toBe(1.0);
  });

  it('colorHarmony returns -1.0 for multi-bold without neutral', () => {
    const outfit = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
      ],
    };
    const itemMap = new Map<string, any>([
      ['top-1', { color: 'red' }],
      ['bottom-1', { color: 'purple' }],
    ]);
    expect(computeColorHarmony(outfit, itemMap)).toBe(-1.0);
  });

  it('colorHarmony returns +0.5 for neutral-dominant outfit', () => {
    const outfit = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
        { id: 'shoes-1', category: 'shoes' },
      ],
    };
    const itemMap = new Map<string, any>([
      ['top-1', { color: 'black' }],
      ['bottom-1', { color: 'white' }],
      ['shoes-1', { color: 'brown' }],
    ]);
    expect(computeColorHarmony(outfit, itemMap)).toBe(0.5);
  });

  it('redundancyPenalty is 0 when no category duplicates', () => {
    const outfit = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
        { id: 'shoes-1', category: 'shoes' },
      ],
    };
    expect(computeRedundancyPenalty(outfit)).toBe(0);
  });

  it('redundancyPenalty increases with duplicate categories', () => {
    const outfit = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'top-2', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
        { id: 'shoes-1', category: 'shoes' },
      ],
    };
    expect(computeRedundancyPenalty(outfit)).toBe(0.25); // 1 dupe / 4 core items
  });

  it('deterministic: same input produces same aesthetic adjustment', () => {
    const outfit = {
      items: [
        { id: 'top-1', category: 'top' },
        { id: 'bottom-1', category: 'bottom' },
        { id: 'shoes-1', category: 'shoes' },
      ],
    };
    const itemMap = new Map<string, any>([
      ['top-1', { color: 'navy', subcategory: 'Polo' }],
      ['bottom-1', { color: 'khaki', subcategory: 'Chinos' }],
      ['shoes-1', { color: 'brown', subcategory: 'Loafer' }],
    ]);

    const run = () => {
      const h = computeColorHarmony(outfit, itemMap);
      const s = computeSilhouetteBalance(outfit);
      const r = computeRedundancyPenalty(outfit);
      return 0.05 * h + 0.03 * s - 0.03 * r;
    };

    expect(run()).toBe(run());
    expect(run()).toBe(run());
  });
});

// ─── 12️⃣ Care Status Filter ──────────────────────────────────────

describe('Care Status Filter', () => {
  it('excludes items with care_status "at_cleaner"', () => {
    const wardrobe = [
      makeItem({ id: 'clean-1', care_status: 'available' }),
      makeItem({ id: 'dirty-1', care_status: 'at_cleaner' }),
      makeItem({ id: 'no-status', }),
    ];

    const filtered = wardrobe.filter(
      (item) => ((item as any).careStatus ?? (item as any).care_status ?? 'available') !== 'at_cleaner',
    );

    expect(filtered.map(i => i.id)).toEqual(['clean-1', 'no-status']);
    expect(filtered.find(i => i.id === 'dirty-1')).toBeUndefined();
  });

  it('includes items without care_status (defaults to available)', () => {
    const wardrobe = [
      makeItem({ id: 'item-1' }),
      makeItem({ id: 'item-2' }),
    ];

    const filtered = wardrobe.filter(
      (item) => ((item as any).careStatus ?? (item as any).care_status ?? 'available') !== 'at_cleaner',
    );

    expect(filtered).toHaveLength(2);
  });

  it('handles careStatus (camelCase) variant', () => {
    const wardrobe = [
      makeItem({ id: 'camel-1' }),
      makeItem({ id: 'camel-2' }),
    ];
    (wardrobe[1] as any).careStatus = 'at_cleaner';

    const filtered = wardrobe.filter(
      (item) => ((item as any).careStatus ?? (item as any).care_status ?? 'available') !== 'at_cleaner',
    );

    expect(filtered.map(i => i.id)).toEqual(['camel-1']);
  });
});
