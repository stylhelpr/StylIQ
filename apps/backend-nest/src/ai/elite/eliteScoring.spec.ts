/**
 * Elite Scoring Phase 0 — NO-OP invariance tests.
 *
 * Proves:
 * 1. elitePostProcessOutfits returns outfits unchanged
 * 2. Stylist normalize/denormalize round-trips to original
 * 3. Studio normalize/denormalize round-trips to original
 */
import {
  elitePostProcessOutfits,
  buildEliteExposureEvent,
  normalizeStylistOutfit,
  denormalizeStylistOutfit,
  normalizeStudioOutfit,
  denormalizeStudioOutfit,
  colorMatches,
  deterministicHash,
  scoreOutfit,
  stableSortOutfits,
} from './eliteScoring';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const stylistOutfit = {
  id: 'outfit-1',
  rank: 1,
  summary: 'A casual look',
  items: [
    { id: 'item-1', name: 'White Tee', imageUrl: 'https://img/1.jpg', category: 'top' },
    { id: 'item-2', name: 'Blue Jeans', imageUrl: 'https://img/2.jpg', category: 'bottom' },
    { id: 'item-3', name: 'Sneakers', imageUrl: 'https://img/3.jpg', category: 'shoes' },
  ],
  fashionContext: {
    weatherFit: 'optimal',
    silhouette: 'relaxed',
    colorStrategy: 'neutral palette',
    confidenceLevel: 0.82,
  },
};

const studioOutfit = {
  outfit_id: 'studio-1',
  title: 'Business Casual',
  why: 'Smart pairing for the office',
  missing: null,
  items: [
    { id: 'w-1', label: 'Oxford Shirt', main_category: 'Tops', subcategory: 'Oxford Shirt', color: 'white' },
    { id: 'w-2', label: 'Chinos', main_category: 'Bottoms', subcategory: 'Chinos', color: 'khaki' },
    { id: 'w-3', label: 'Loafers', main_category: 'Shoes', subcategory: 'Loafers', color: 'brown' },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('elitePostProcessOutfits (Phase 0 NO-OP)', () => {
  it('returns outfits array unchanged', () => {
    const input = [stylistOutfit, { ...stylistOutfit, id: 'outfit-2' }];
    const result = elitePostProcessOutfits(
      input,
      { presentation: 'mixed' },
      { mode: 'stylist', requestId: 'test-1' },
    );
    expect(result.outfits).toBe(input); // same reference
    expect(result.debug).toEqual({});
  });

  it('returns empty array unchanged', () => {
    const result = elitePostProcessOutfits(
      [],
      { presentation: 'masculine' },
      { mode: 'studio' },
    );
    expect(result.outfits).toEqual([]);
    expect(result.debug).toEqual({});
  });
});

describe('Stylist adapter round-trip', () => {
  it('normalize then denormalize produces original shape', () => {
    const normalized = normalizeStylistOutfit(stylistOutfit);

    // Verify canonical slots assigned
    expect(normalized.items[0].slot).toBe('tops');
    expect(normalized.items[1].slot).toBe('bottoms');
    expect(normalized.items[2].slot).toBe('shoes');

    const restored = denormalizeStylistOutfit(normalized);

    // Verify original category values restored
    expect(restored.items[0].category).toBe('top');
    expect(restored.items[1].category).toBe('bottom');
    expect(restored.items[2].category).toBe('shoes');

    // Verify all other fields preserved
    expect(restored.id).toBe(stylistOutfit.id);
    expect(restored.rank).toBe(stylistOutfit.rank);
    expect(restored.summary).toBe(stylistOutfit.summary);
    expect(restored.items[0].id).toBe('item-1');
    expect(restored.items[0].name).toBe('White Tee');
    expect(restored.fashionContext).toEqual(stylistOutfit.fashionContext);
  });

  it('handles dress slot', () => {
    const dressOutfit = {
      id: 'dress-1',
      items: [
        { id: 'd-1', category: 'dress' },
        { id: 'd-2', category: 'shoes' },
        { id: 'd-3', category: 'accessory' },
      ],
    };
    const normalized = normalizeStylistOutfit(dressOutfit);
    expect(normalized.items[0].slot).toBe('dresses');
    expect(normalized.items[2].slot).toBe('accessories');

    const restored = denormalizeStylistOutfit(normalized);
    expect(restored.items[0].category).toBe('dress');
    expect(restored.items[2].category).toBe('accessory');
  });
});

describe('Studio adapter round-trip', () => {
  it('normalize then denormalize preserves outfit structure', () => {
    const normalized = normalizeStudioOutfit(studioOutfit);

    // Verify canonical slots assigned
    expect(normalized.items[0].slot).toBe('tops');
    expect(normalized.items[1].slot).toBe('bottoms');
    expect(normalized.items[2].slot).toBe('shoes');
    expect(normalized.id).toBe('studio-1');

    const restored = denormalizeStudioOutfit(normalized);

    // Verify original main_category values preserved (not stripped)
    expect(restored.items[0].main_category).toBe('Tops');
    expect(restored.items[1].main_category).toBe('Bottoms');
    expect(restored.items[2].main_category).toBe('Shoes');

    // Verify other fields preserved
    expect(restored.outfit_id).toBe('studio-1');
    expect(restored.title).toBe('Business Casual');
    expect(restored.why).toBe('Smart pairing for the office');
  });

  it('handles extended category mappings', () => {
    const formalOutfit = {
      outfit_id: 'formal-1',
      items: [
        { id: 'f-1', main_category: 'Formalwear' },
        { id: 'f-2', main_category: 'Jewelry' },
        { id: 'f-3', main_category: 'Bags' },
      ],
    };
    const normalized = normalizeStudioOutfit(formalOutfit);
    expect(normalized.items[0].slot).toBe('dresses');
    expect(normalized.items[1].slot).toBe('accessories');
    expect(normalized.items[2].slot).toBe('accessories');
  });
});

describe('Full pipeline: normalize → elitePostProcess → denormalize', () => {
  it('Stylist pipeline returns equivalent output', () => {
    const canonical = normalizeStylistOutfit(stylistOutfit);
    const result = elitePostProcessOutfits(
      [canonical],
      { presentation: 'mixed' },
      { mode: 'stylist' },
    );
    const restored = denormalizeStylistOutfit(result.outfits[0]);
    expect(restored.items[0].category).toBe('top');
    expect(restored.items.length).toBe(stylistOutfit.items.length);
  });

  it('Studio pipeline returns equivalent output', () => {
    const canonical = normalizeStudioOutfit(studioOutfit);
    const result = elitePostProcessOutfits(
      [canonical],
      { presentation: 'masculine' },
      { mode: 'studio' },
    );
    const restored = denormalizeStudioOutfit(result.outfits[0]);
    expect(restored.items[0].main_category).toBe('Tops');
    expect(restored.outfit_id).toBe('studio-1');
  });
});

// ── Phase 1 Tests ───────────────────────────────────────────────────────────

describe('buildEliteExposureEvent', () => {
  it('produces correct shape with neutral signal', () => {
    const outfits = [
      {
        id: 'o-1',
        items: [
          { id: 'item-1', slot: 'tops' as const },
          { id: 'item-2', slot: 'bottoms' as const },
          { id: 'item-3', slot: 'shoes' as const },
        ],
      },
    ];
    const event = buildEliteExposureEvent('user-123', outfits, {
      mode: 'stylist',
      requestId: 'req-abc',
    });

    expect(event.eventType).toBe('ELITE_SUGGESTION_SERVED');
    expect(event.entityType).toBe('outfit');
    expect(event.entityId).toBe('req-abc');
    expect(event.signalPolarity).toBe(0);
    expect(event.signalWeight).toBe(0);
    expect(event.sourceFeature).toBe('elite_scoring');
    expect(event.userId).toBe('user-123');
    expect(event.extractedFeatures.item_ids).toEqual([
      'item-1',
      'item-2',
      'item-3',
    ]);
    expect(event.extractedFeatures.categories).toEqual([
      'tops',
      'bottoms',
      'shoes',
    ]);
    expect(event.context?.occasion).toBe('stylist');
    expect(event.context?.schema_version).toBe(1);
    expect(event.context?.pipeline_version).toBe(1);
  });

  it('generates entityId when requestId is missing', () => {
    const event = buildEliteExposureEvent(
      'user-123',
      [{ id: 'o-1', items: [] }],
      { mode: 'studio' },
    );

    expect(event.entityId).toBeDefined();
    expect(event.entityId!.length).toBeGreaterThan(0);
    expect(event.context?.occasion).toBe('studio');
  });

  it('includes temp_f from weather when provided', () => {
    const event = buildEliteExposureEvent(
      'user-123',
      [{ id: 'o-1', items: [] }],
      { mode: 'stylist', weather: { temp: 72 } },
    );

    expect(event.context?.temp_f).toBe(72);
  });

  it('omits temp_f when weather is null', () => {
    const event = buildEliteExposureEvent(
      'user-123',
      [{ id: 'o-1', items: [] }],
      { mode: 'stylist', weather: null },
    );

    expect(event.context?.temp_f).toBeUndefined();
  });
});

describe('Expanded StyleContext acceptance', () => {
  it('elitePostProcessOutfits accepts full StyleContext without error', () => {
    const fullContext = {
      presentation: 'feminine' as const,
      fashionState: {
        topBrands: ['Nike', 'Zara'],
        avoidBrands: ['Gucci'],
        topColors: ['black', 'white'],
        avoidColors: ['neon green'],
        topCategories: ['Tops', 'Dresses'],
        priceBracket: 'mid',
        isColdStart: false,
      },
      wardrobeStats: {
        dominantColors: ['blue', 'black'],
        topCategories: ['Tops', 'Bottoms'],
        topBrands: [] as string[],
        totalItems: 42,
      },
      preferredBrands: ['Nike', 'Adidas'],
    };

    const result = elitePostProcessOutfits(
      [stylistOutfit],
      fullContext,
      { mode: 'stylist' },
    );

    // Phase 1: still returns unchanged
    expect(result.outfits).toEqual([stylistOutfit]);
    expect(result.debug).toEqual({});
  });

  it('accepts null fashionState (cold start / timeout)', () => {
    const result = elitePostProcessOutfits(
      [stylistOutfit],
      { presentation: 'mixed', fashionState: null },
      { mode: 'stylist' },
    );

    expect(result.outfits).toEqual([stylistOutfit]);
  });
});

// ── Phase 2 Tests ───────────────────────────────────────────────────────────

describe('colorMatches', () => {
  it('matches exact (case-insensitive)', () => {
    expect(colorMatches('Navy Blue', 'navy blue')).toBe(true);
  });

  it('matches substring (item includes pref)', () => {
    expect(colorMatches('Navy Blue', 'navy')).toBe(true);
  });

  it('matches substring (pref includes item)', () => {
    expect(colorMatches('blue', 'Navy Blue')).toBe(true);
  });

  it('rejects non-match', () => {
    expect(colorMatches('red', 'blue')).toBe(false);
  });
});

describe('deterministicHash', () => {
  it('returns same value for same input', () => {
    expect(deterministicHash('abc')).toBe(deterministicHash('abc'));
  });

  it('returns different values for different inputs', () => {
    expect(deterministicHash('abc')).not.toBe(deterministicHash('xyz'));
  });
});

describe('scoreOutfit (Phase 2)', () => {
  const makeOutfit = (id: string, items: Array<{id: string; slot: any; brand?: string; color?: string}>): any => ({
    id,
    items: items.map(i => ({ ...i })),
  });

  it('scores brand affinity in studio mode', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', brand: 'Nike', color: 'white' },
      { id: 'i2', slot: 'bottoms', brand: 'Zara', color: 'blue' },
      { id: 'i3', slot: 'shoes', brand: 'Gucci', color: 'black' },
    ]);
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'],
        avoidBrands: ['Gucci'],
        topColors: [],
        avoidColors: [],
        topCategories: [],
        priceBracket: null,
        isColdStart: false,
      },
      preferredBrands: [],
    };
    const result = scoreOutfit(outfit, ctx, { mode: 'studio', rerank: true });
    // Nike: +10, Gucci: -15, slot complete: +5 = 0
    expect(result.score).toBe(0);
    expect(result.flags).toContain('brand');
    expect(result.flags).toContain('slot_complete');
  });

  it('scores color affinity in studio mode', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', color: 'Navy Blue' },
      { id: 'i2', slot: 'bottoms', color: 'Black' },
      { id: 'i3', slot: 'shoes', color: 'Brown' },
    ]);
    const ctx: any = {
      fashionState: {
        topBrands: [],
        avoidBrands: [],
        topColors: ['navy', 'black'],
        avoidColors: ['brown'],
        topCategories: [],
        priceBracket: null,
        isColdStart: false,
      },
    };
    const result = scoreOutfit(outfit, ctx, { mode: 'studio', rerank: true });
    // navy blue matches navy: +5, black matches black: +5, brown matches brown: -8, slot: +5 = 7
    expect(result.score).toBe(7);
    expect(result.flags).toContain('color');
  });

  it('returns zero score with empty StyleContext (fail-open)', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops' },
    ]);
    const result = scoreOutfit(outfit, {}, { mode: 'studio', rerank: true });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('only uses wardrobeStats for trips mode color', () => {
    const outfit = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', color: 'blue' },
      { id: 'i2', slot: 'bottoms', color: 'red' },
      { id: 'i3', slot: 'shoes', color: 'black' },
    ]);
    const ctx: any = {
      wardrobeStats: {
        dominantColors: ['blue', 'black'],
        topCategories: ['tops'],
        topBrands: [],
        totalItems: 10,
      },
    };
    const result = scoreOutfit(outfit, ctx, { mode: 'trips', rerank: true });
    // blue: +5, black: +5, category tops: +3, slot: +5 = 18
    expect(result.score).toBe(18);
    expect(result.flags).toContain('color');
    expect(result.flags).toContain('category');
    expect(result.flags).toContain('slot_complete');
  });
});

describe('elitePostProcessOutfits (Phase 2 rerank)', () => {
  const makeOutfit = (id: string, items: Array<{id: string; slot: any; brand?: string; color?: string}>): any => ({
    id,
    items: items.map(i => ({ ...i })),
  });

  it('identity: rerank=false → output order unchanged (same reference)', () => {
    const input = [
      makeOutfit('o1', [{ id: 'i1', slot: 'tops' }]),
      makeOutfit('o2', [{ id: 'i2', slot: 'bottoms' }]),
    ];
    const result = elitePostProcessOutfits(input, {}, { mode: 'studio' });
    expect(result.outfits).toBe(input);
    expect(result.debug).toEqual({});
  });

  it('no mutation: items are byte-identical before/after rerank', () => {
    const o1 = makeOutfit('o1', [
      { id: 'i1', slot: 'tops', brand: 'Nike', color: 'white' },
      { id: 'i2', slot: 'bottoms', color: 'blue' },
      { id: 'i3', slot: 'shoes', color: 'black' },
    ]);
    const o2 = makeOutfit('o2', [
      { id: 'i4', slot: 'tops', brand: 'Gucci', color: 'red' },
      { id: 'i5', slot: 'bottoms', color: 'green' },
    ]);
    const inputCopy = JSON.parse(JSON.stringify([o1, o2]));
    const result = elitePostProcessOutfits(
      [o1, o2],
      {
        fashionState: {
          topBrands: ['Nike'], avoidBrands: [], topColors: [],
          avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
        },
      },
      { mode: 'studio', rerank: true },
    );
    for (const outfit of result.outfits) {
      const original = inputCopy.find((o: any) => o.id === (outfit as any).id);
      expect((outfit as any).items).toEqual(original.items);
    }
    expect(result.outfits.length).toBe(2);
  });

  it('deterministic: same inputs → same order across multiple runs', () => {
    const outfits = [
      makeOutfit('o1', [{ id: 'i1', slot: 'tops', brand: 'Nike' }, { id: 'i2', slot: 'bottoms' }, { id: 'i3', slot: 'shoes' }]),
      makeOutfit('o2', [{ id: 'i4', slot: 'tops', brand: 'Zara' }, { id: 'i5', slot: 'bottoms' }, { id: 'i6', slot: 'shoes' }]),
    ];
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'], avoidBrands: [], topColors: [],
        avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
      },
    };
    const env: any = { mode: 'studio', rerank: true };

    const r1 = elitePostProcessOutfits(outfits, ctx, env);
    const r2 = elitePostProcessOutfits(outfits, ctx, env);
    const r3 = elitePostProcessOutfits(outfits, ctx, env);

    const ids1 = r1.outfits.map((o: any) => o.id);
    const ids2 = r2.outfits.map((o: any) => o.id);
    const ids3 = r3.outfits.map((o: any) => o.id);

    expect(ids1).toEqual(ids2);
    expect(ids2).toEqual(ids3);
  });

  it('tie-breaker: equal scores → deterministic order by hash', () => {
    const outfits = [
      makeOutfit('o-zzz', [{ id: 'i1', slot: 'tops' }]),
      makeOutfit('o-aaa', [{ id: 'i2', slot: 'tops' }]),
    ];
    const env: any = { mode: 'studio', rerank: true };

    const r1 = elitePostProcessOutfits(outfits, {}, env);
    const r2 = elitePostProcessOutfits(outfits, {}, env);

    expect(r1.outfits.map((o: any) => o.id)).toEqual(r2.outfits.map((o: any) => o.id));
  });

  it('rerank: outfit with brand/color hits sorted before outfit without', () => {
    const loser = makeOutfit('loser', [
      { id: 'i1', slot: 'tops', brand: 'Unknown' },
      { id: 'i2', slot: 'bottoms' },
      { id: 'i3', slot: 'shoes' },
    ]);
    const winner = makeOutfit('winner', [
      { id: 'i4', slot: 'tops', brand: 'Nike', color: 'black' },
      { id: 'i5', slot: 'bottoms', color: 'blue' },
      { id: 'i6', slot: 'shoes' },
    ]);
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'], avoidBrands: [], topColors: ['black'],
        avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
      },
    };

    const result = elitePostProcessOutfits(
      [loser, winner], ctx, { mode: 'studio', rerank: true },
    );
    expect((result.outfits[0] as any).id).toBe('winner');
  });

  it('fail-open: empty StyleContext → original order preserved', () => {
    const outfits = [
      makeOutfit('first', [{ id: 'i1', slot: 'tops' }]),
      makeOutfit('second', [{ id: 'i2', slot: 'bottoms' }]),
    ];
    const result = elitePostProcessOutfits(outfits, {}, { mode: 'studio', rerank: true });
    expect(result.outfits.length).toBe(2);
    const ids = new Set(result.outfits.map((o: any) => o.id));
    expect(ids).toEqual(new Set(['first', 'second']));
  });

  it('debug output: debug=true → scores/flags/originalOrder in debug map', () => {
    const outfits = [
      makeOutfit('o1', [{ id: 'i1', slot: 'tops', brand: 'Nike' }, { id: 'i2', slot: 'bottoms' }, { id: 'i3', slot: 'shoes' }]),
      makeOutfit('o2', [{ id: 'i4', slot: 'tops' }]),
    ];
    const ctx: any = {
      fashionState: {
        topBrands: ['Nike'], avoidBrands: [], topColors: [],
        avoidColors: [], topCategories: [], priceBracket: null, isColdStart: false,
      },
    };
    const result = elitePostProcessOutfits(
      outfits, ctx, { mode: 'studio', rerank: true, debug: true },
    );

    expect(result.debug.scores).toBeDefined();
    expect(result.debug.originalOrder).toEqual(['o1', 'o2']);
    expect(result.debug.rerankedOrder).toBeDefined();
    expect(Array.isArray(result.debug.scores)).toBe(true);
    expect((result.debug.scores as any[]).length).toBe(2);
    expect((result.debug.scores as any[])[0].outfitId).toBeDefined();
    expect((result.debug.scores as any[])[0].flags).toBeDefined();
  });

  it('confidence: single incomplete outfit in stylist mode → confidence=0', () => {
    const outfit = makeOutfit('o1', [{ id: 'i1', slot: 'tops' }]);
    const result = scoreOutfit(outfit, {}, { mode: 'stylist', rerank: true });
    expect(result.confidence).toBe(0);
    expect(result.score).toBe(0);
  });
});

describe('stableSortOutfits', () => {
  it('preserves item identity (no swaps/drops)', () => {
    const o1: any = { id: 'o1', items: [{ id: 'i1', slot: 'tops' }] };
    const o2: any = { id: 'o2', items: [{ id: 'i2', slot: 'bottoms' }] };

    const scores = new Map<string, any>();
    scores.set('o1', { score: 10, confidence: 1, flags: ['brand'] });
    scores.set('o2', { score: 20, confidence: 1, flags: ['color'] });

    const sorted = stableSortOutfits([o1, o2], scores);

    expect(sorted.length).toBe(2);
    expect(sorted[0].id).toBe('o2');
    expect(sorted[1].id).toBe('o1');
    expect(sorted[0].items).toEqual(o2.items);
    expect(sorted[1].items).toEqual(o1.items);
  });
});
