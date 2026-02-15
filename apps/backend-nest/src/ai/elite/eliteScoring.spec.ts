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
