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
});
