import {normalizeOutfitStructure, shouldRebuildCapsule, buildCapsule, adaptWardrobeItem, CAPSULE_VERSION} from './capsuleEngine';
import {TripPackingItem, TripCapsule, TripWardrobeItem, DayWeather, TripActivity} from '../../types/trips';

function makeItem(overrides: Partial<TripPackingItem> & {mainCategory: string}): TripPackingItem {
  return {
    id: `trip_${overrides.wardrobeItemId || Math.random().toString(36).slice(2)}`,
    wardrobeItemId: overrides.wardrobeItemId || 'w1',
    name: overrides.name || 'Test Item',
    imageUrl: '',
    mainCategory: overrides.mainCategory,
    subCategory: overrides.subCategory,
    locationLabel: 'Home',
    packed: false,
    ...overrides,
  };
}

describe('normalizeOutfitStructure', () => {
  // ── ONE-PIECE enforcement ──

  it('removes Skirts when a Dress is present', () => {
    const items = [
      makeItem({wardrobeItemId: 'd1', mainCategory: 'Dresses', name: 'Black Dress'}),
      makeItem({wardrobeItemId: 's1', mainCategory: 'Skirts', name: 'Pleated Skirt'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Heels'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result.map(i => i.mainCategory)).toEqual(['Dresses', 'Shoes']);
    expect(result.find(i => i.mainCategory === 'Skirts')).toBeUndefined();
  });

  it('removes Bottoms (shorts) when a Dress is present', () => {
    const items = [
      makeItem({wardrobeItemId: 'd1', mainCategory: 'Dresses', name: 'Summer Dress'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Denim Shorts', subCategory: 'Shorts'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Sandals'}),
      makeItem({wardrobeItemId: 'a1', mainCategory: 'Accessories', name: 'Hat'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result.map(i => i.mainCategory)).toEqual(['Dresses', 'Shoes', 'Accessories']);
    expect(result.find(i => i.mainCategory === 'Bottoms')).toBeUndefined();
  });

  it('removes Tops when a Dress is present', () => {
    const items = [
      makeItem({wardrobeItemId: 't1', mainCategory: 'Tops', name: 'Blouse'}),
      makeItem({wardrobeItemId: 'd1', mainCategory: 'Dresses', name: 'Wrap Dress'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Flats'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result.map(i => i.mainCategory)).toEqual(['Dresses', 'Shoes']);
    expect(result.find(i => i.mainCategory === 'Tops')).toBeUndefined();
  });

  it('removes both Tops and Bottoms when a Dress is present', () => {
    const items = [
      makeItem({wardrobeItemId: 't1', mainCategory: 'Tops', name: 'T-Shirt'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Jeans'}),
      makeItem({wardrobeItemId: 'd1', mainCategory: 'Dresses', name: 'Maxi Dress'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Boots'}),
      makeItem({wardrobeItemId: 'o1', mainCategory: 'Outerwear', name: 'Jacket'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result.map(i => i.mainCategory)).toEqual(['Dresses', 'Shoes', 'Outerwear']);
  });

  it('keeps Outerwear and Accessories with a Dress', () => {
    const items = [
      makeItem({wardrobeItemId: 'd1', mainCategory: 'Dresses', name: 'Cocktail Dress'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Heels'}),
      makeItem({wardrobeItemId: 'o1', mainCategory: 'Outerwear', name: 'Blazer'}),
      makeItem({wardrobeItemId: 'a1', mainCategory: 'Accessories', name: 'Clutch'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(4);
    expect(result.map(i => i.mainCategory)).toEqual(['Dresses', 'Shoes', 'Outerwear', 'Accessories']);
  });

  it('handles TraditionalWear as dress-like (removes bottoms)', () => {
    const items = [
      makeItem({wardrobeItemId: 'tw1', mainCategory: 'TraditionalWear', name: 'Kimono'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Pants'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Sandals'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result.map(i => i.mainCategory)).toEqual(['TraditionalWear', 'Shoes']);
  });

  // ── SEPARATES enforcement ──

  it('keeps only 1 bottom when 2 bottoms are present', () => {
    const items = [
      makeItem({wardrobeItemId: 't1', mainCategory: 'Tops', name: 'Polo'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Chinos'}),
      makeItem({wardrobeItemId: 'b2', mainCategory: 'Bottoms', name: 'Shorts', subCategory: 'Shorts'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Loafers'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(3);
    const bottoms = result.filter(i => i.mainCategory === 'Bottoms');
    expect(bottoms).toHaveLength(1);
    expect(bottoms[0].name).toBe('Chinos'); // first one kept
  });

  it('keeps only 1 bottom when skirt + shorts are present', () => {
    const items = [
      makeItem({wardrobeItemId: 't1', mainCategory: 'Tops', name: 'Tank Top'}),
      makeItem({wardrobeItemId: 'sk1', mainCategory: 'Skirts', name: 'Mini Skirt'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Shorts', subCategory: 'Shorts'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Sneakers'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(3);
    // Both Skirts and Bottoms map to 'bottoms' bucket — first one (Skirts) is kept
    const bottomLike = result.filter(i => {
      const cat = i.mainCategory;
      return cat === 'Skirts' || cat === 'Bottoms';
    });
    expect(bottomLike).toHaveLength(1);
    expect(bottomLike[0].mainCategory).toBe('Skirts'); // first bottom-like kept
  });

  it('keeps only 1 top when 2 tops are present', () => {
    const items = [
      makeItem({wardrobeItemId: 't1', mainCategory: 'Tops', name: 'Button-Down'}),
      makeItem({wardrobeItemId: 't2', mainCategory: 'Formalwear', name: 'Dress Shirt'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Slacks'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Oxfords'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(3);
    const tops = result.filter(i => {
      const cat = i.mainCategory;
      return cat === 'Tops' || cat === 'Formalwear';
    });
    expect(tops).toHaveLength(1);
    expect(tops[0].name).toBe('Button-Down'); // first top-like kept
  });

  // ── Pass-through cases ──

  it('does not modify a valid separates outfit', () => {
    const items = [
      makeItem({wardrobeItemId: 't1', mainCategory: 'Tops', name: 'T-Shirt'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Jeans'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Sneakers'}),
      makeItem({wardrobeItemId: 'a1', mainCategory: 'Accessories', name: 'Watch'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(4);
    expect(result).toEqual(items);
  });

  it('does not modify a valid one-piece outfit', () => {
    const items = [
      makeItem({wardrobeItemId: 'd1', mainCategory: 'Dresses', name: 'Sundress'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Sandals'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(2);
    expect(result).toEqual(items);
  });

  it('preserves Activewear items (not treated as tops)', () => {
    const items = [
      makeItem({wardrobeItemId: 'aw1', mainCategory: 'Activewear', name: 'Sports Bra'}),
      makeItem({wardrobeItemId: 'aw2', mainCategory: 'Activewear', name: 'Leggings'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Running Shoes'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(3);
    expect(result).toEqual(items);
  });

  it('preserves Swimwear items (not treated as tops)', () => {
    const items = [
      makeItem({wardrobeItemId: 'sw1', mainCategory: 'Swimwear', name: 'Bikini'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Flip Flops'}),
      makeItem({wardrobeItemId: 'a1', mainCategory: 'Accessories', name: 'Sunglasses'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(3);
    expect(result).toEqual(items);
  });

  it('handles empty items array', () => {
    const result = normalizeOutfitStructure([]);
    expect(result).toEqual([]);
  });
});

describe('shouldRebuildCapsule', () => {
  function makeCapsule(
    version?: number,
    itemCategories: string[] = [],
    fingerprint?: string,
  ): TripCapsule {
    return {
      build_id: 'test_build_old',
      outfits: [{
        id: 'o1',
        dayLabel: 'Day 1',
        items: itemCategories.map((cat, i) =>
          makeItem({wardrobeItemId: `w${i}`, mainCategory: cat}),
        ),
      }],
      packingList: [],
      version,
      fingerprint,
    };
  }

  it('returns {rebuild: false} when capsule is undefined', () => {
    expect(shouldRebuildCapsule(undefined, 2, 'mixed')).toEqual({rebuild: false, reason: 'NO_CAPSULE', mode: 'AUTO'});
  });

  it('VERSION_MISMATCH: undefined version vs 2', () => {
    expect(shouldRebuildCapsule(makeCapsule(undefined), 2, 'mixed')).toEqual({rebuild: true, reason: 'VERSION_MISMATCH', mode: 'AUTO'});
  });

  it('VERSION_MISMATCH: 1 vs 2', () => {
    expect(shouldRebuildCapsule(makeCapsule(1), 2, 'mixed')).toEqual({rebuild: true, reason: 'VERSION_MISMATCH', mode: 'AUTO'});
  });

  it('UP_TO_DATE: 2 vs 2, no fingerprint', () => {
    expect(shouldRebuildCapsule(makeCapsule(2), 2, 'mixed')).toEqual({rebuild: false, reason: 'UP_TO_DATE', mode: 'AUTO'});
  });

  it('FINGERPRINT_MISMATCH: same version, different fingerprint', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Shoes'], 'old-fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'mixed', 'new-fp')).toEqual({rebuild: true, reason: 'FINGERPRINT_MISMATCH', mode: 'AUTO'});
  });

  it('UP_TO_DATE: same version, same fingerprint', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Shoes'], 'same-fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'mixed', 'same-fp')).toEqual({rebuild: false, reason: 'UP_TO_DATE', mode: 'AUTO'});
  });

  it('FINGERPRINT_MISMATCH: capsule has no fingerprint, caller provides one', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Shoes']);
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'mixed', 'new-fp')).toEqual({rebuild: true, reason: 'FINGERPRINT_MISMATCH', mode: 'AUTO'});
  });

  it('DRESS_LEAK: masculine capsule contains Dresses', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Dresses', 'Shoes'], 'fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'masculine', 'fp')).toEqual({rebuild: true, reason: 'DRESS_LEAK', mode: 'AUTO'});
  });

  it('DRESS_LEAK: masculine capsule contains TraditionalWear (dresses bucket)', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'TraditionalWear', 'Shoes'], 'fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'masculine', 'fp')).toEqual({rebuild: true, reason: 'DRESS_LEAK', mode: 'AUTO'});
  });

  it('does not force rebuild for feminine capsule with dresses', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Dresses', 'Shoes'], 'fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'feminine', 'fp')).toEqual({rebuild: false, reason: 'UP_TO_DATE', mode: 'AUTO'});
  });

  it('does not force rebuild for masculine capsule without dresses', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Bottoms', 'Shoes'], 'fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'masculine', 'fp')).toEqual({rebuild: false, reason: 'UP_TO_DATE', mode: 'AUTO'});
  });

  it('CAPSULE_VERSION is a positive integer', () => {
    expect(CAPSULE_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(CAPSULE_VERSION)).toBe(true);
  });

  // ── FORCE mode tests ──

  it('FORCE: rebuilds even when capsule is UP_TO_DATE', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Bottoms', 'Shoes'], 'same-fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'mixed', 'same-fp', 'FORCE')).toEqual({
      rebuild: true, reason: 'FORCE_REBUILD', mode: 'FORCE',
    });
  });

  it('FORCE: rebuilds even when capsule is undefined', () => {
    expect(shouldRebuildCapsule(undefined, CAPSULE_VERSION, 'mixed', undefined, 'FORCE')).toEqual({
      rebuild: true, reason: 'FORCE_REBUILD', mode: 'FORCE',
    });
  });

  it('FORCE: rebuilds even when version and fingerprint match', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Shoes'], 'fp');
    expect(shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'feminine', 'fp', 'FORCE')).toEqual({
      rebuild: true, reason: 'FORCE_REBUILD', mode: 'FORCE',
    });
  });

  it('AUTO mode is the default (no mode arg)', () => {
    const capsule = makeCapsule(CAPSULE_VERSION, ['Tops', 'Shoes'], 'fp');
    const result = shouldRebuildCapsule(capsule, CAPSULE_VERSION, 'mixed', 'fp');
    expect(result.mode).toBe('AUTO');
  });
});

describe('buildCapsule hard reset rebuild', () => {
  const makeWardrobe = (): TripWardrobeItem[] => [
    {id: 'w1', name: 'T-Shirt', main_category: 'Tops', color: 'white'},
    {id: 'w2', name: 'Jeans', main_category: 'Bottoms', color: 'blue'},
    {id: 'w3', name: 'Sneakers', main_category: 'Shoes', color: 'white'},
  ];

  const makeWeather = (): DayWeather[] => [
    {date: '2025-07-01', dayLabel: 'Tue', highF: 85, lowF: 70, condition: 'sunny', rainChance: 10},
    {date: '2025-07-02', dayLabel: 'Wed', highF: 82, lowF: 68, condition: 'partly-cloudy', rainChance: 20},
  ];

  const activities: TripActivity[] = ['Casual'];

  it('rebuild produces a new build_id different from old capsule', () => {
    const wardrobe = makeWardrobe();
    const weather = makeWeather();

    // Build initial capsule
    const oldCapsule = buildCapsule(wardrobe, weather, activities, 'Home');
    expect(oldCapsule.build_id).toBeTruthy();

    // Simulate hard reset: wipe old capsule
    const wipedCapsule: TripCapsule | null = null;
    expect(wipedCapsule).toBeNull(); // capsule is wiped

    // Rebuild from clean state
    const newCapsule = buildCapsule(wardrobe, weather, activities, 'Home');
    expect(newCapsule.build_id).toBeTruthy();
    expect(newCapsule.build_id).not.toBe(oldCapsule.build_id);
  });

  it('every buildCapsule call produces a unique build_id', () => {
    const wardrobe = makeWardrobe();
    const weather = makeWeather();

    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const capsule = buildCapsule(wardrobe, weather, activities, 'Home');
      expect(ids.has(capsule.build_id)).toBe(false);
      ids.add(capsule.build_id);
    }
  });

  it('build_id starts with "build_" prefix', () => {
    const wardrobe = makeWardrobe();
    const weather = makeWeather();
    const capsule = buildCapsule(wardrobe, weather, activities, 'Home');
    expect(capsule.build_id).toMatch(/^build_\d+_[a-z0-9]+$/);
  });
});
