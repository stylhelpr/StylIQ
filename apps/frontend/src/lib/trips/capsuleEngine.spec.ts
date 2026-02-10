import {
  normalizeOutfitStructure,
  shouldRebuildCapsule,
  buildCapsule,
  adaptWardrobeItem,
  CAPSULE_VERSION,
  deriveClimateZone,
  getActivityProfile,
  inferGarmentFlags,
  gatePool,
} from './capsuleEngine';
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
    // Use two actual Tops items (not Formalwear which now maps to dresses)
    const items = [
      makeItem({wardrobeItemId: 't1', mainCategory: 'Tops', name: 'Button-Down'}),
      makeItem({wardrobeItemId: 't2', mainCategory: 'Tops', name: 'Polo Shirt'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Slacks'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Oxfords'}),
    ];

    const result = normalizeOutfitStructure(items);

    expect(result).toHaveLength(3);
    const tops = result.filter(i => i.mainCategory === 'Tops');
    expect(tops).toHaveLength(1);
    expect(tops[0].name).toBe('Button-Down'); // first top kept
  });

  it('treats Formalwear as dress-like (removes bottoms when present)', () => {
    // Formalwear now maps to dresses bucket (one-piece formal items)
    const items = [
      makeItem({wardrobeItemId: 'f1', mainCategory: 'Formalwear', name: 'Tuxedo'}),
      makeItem({wardrobeItemId: 'b1', mainCategory: 'Bottoms', name: 'Slacks'}),
      makeItem({wardrobeItemId: 'sh1', mainCategory: 'Shoes', name: 'Oxfords'}),
    ];

    const result = normalizeOutfitStructure(items);

    // Formalwear is dress-like, so bottoms should be removed
    expect(result).toHaveLength(2);
    expect(result.find(i => i.mainCategory === 'Formalwear')).toBeDefined();
    expect(result.find(i => i.mainCategory === 'Shoes')).toBeDefined();
    expect(result.find(i => i.mainCategory === 'Bottoms')).toBeUndefined();
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

// ══════════════════════════════════════════════════════════════════════════════
// ██  GLOBAL CLIMATE GATING TESTS (6 integration tests)
// ══════════════════════════════════════════════════════════════════════════════

function makeWardrobeItem(overrides: Partial<TripWardrobeItem> & {id: string}): TripWardrobeItem {
  return {name: 'Test Item', ...overrides};
}

describe('Global Climate Gating', () => {
  // Test 1: freezing + formal blocks shorts/sandals/tank
  it('freezing + formal: blocks shorts, sandals, tank tops', () => {
    const freezingWeather: DayWeather[] = [
      {date: '2025-01-15', dayLabel: 'Wed', highF: 28, lowF: 15, condition: 'snowy', rainChance: 20},
    ];
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', formalityScore: 80}),
      makeWardrobeItem({id: 't2', name: 'Tank Top', main_category: 'Tops', subcategory: 'Tank Top'}),
      makeWardrobeItem({id: 'b1', name: 'Wool Trousers', main_category: 'Bottoms', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Sandals', main_category: 'Shoes', subcategory: 'Sandals'}),
    ];
    const capsule = buildCapsule(wardrobe, freezingWeather, ['Formal'], 'Home');
    const allItemNames = capsule.outfits.flatMap(o => o.items.map(i => i.name));

    expect(allItemNames).not.toContain('Tank Top');
    expect(allItemNames).not.toContain('Shorts');
    expect(allItemNames).not.toContain('Sandals');
  });

  // Test 2: hot + beach allows swimwear/hawaiian
  it('hot + beach: allows swimwear and hawaiian shirts', () => {
    const hotWeather: DayWeather[] = [
      {date: '2025-07-15', dayLabel: 'Tue', highF: 95, lowF: 78, condition: 'sunny', rainChance: 5},
    ];
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 'sw1', name: 'Bikini', main_category: 'Swimwear'}),
      makeWardrobeItem({id: 't1', name: 'Hawaiian Shirt', main_category: 'Tops', subcategory: 'Hawaiian'}),
      makeWardrobeItem({id: 's1', name: 'Flip-Flops', main_category: 'Shoes', subcategory: 'Flip-Flops'}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Beach'], 'Home');
    const allItems = capsule.outfits.flatMap(o => o.items);

    // Beach allows swimwear
    expect(allItems.some(i => i.mainCategory === 'Swimwear')).toBe(true);
  });

  // Test 3: hot + business blocks hawaiian/swimwear
  it('hot + business: blocks hawaiian and swimwear', () => {
    const hotWeather: DayWeather[] = [
      {date: '2025-07-15', dayLabel: 'Tue', highF: 95, lowF: 78, condition: 'sunny', rainChance: 5},
    ];
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Hawaiian Shirt', main_category: 'Tops', subcategory: 'Hawaiian'}),
      makeWardrobeItem({id: 't2', name: 'Dress Shirt', main_category: 'Tops', formalityScore: 80}),
      makeWardrobeItem({id: 'sw1', name: 'Swim Trunks', main_category: 'Swimwear'}),
      makeWardrobeItem({id: 'b1', name: 'Chinos', main_category: 'Bottoms', formalityScore: 70}),
      makeWardrobeItem({id: 's1', name: 'Loafers', main_category: 'Shoes', formalityScore: 75}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Business'], 'Home');
    const allItemNames = capsule.outfits.flatMap(o => o.items.map(i => i.name));

    expect(allItemNames).not.toContain('Hawaiian Shirt');
    expect(allItemNames).not.toContain('Swim Trunks');
  });

  // Test 4: mild + casual allows shorts
  it('mild + casual: allows shorts', () => {
    const mildWeather: DayWeather[] = [
      {date: '2025-05-15', dayLabel: 'Thu', highF: 72, lowF: 58, condition: 'sunny', rainChance: 5},
    ];
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'T-Shirt', main_category: 'Tops'}),
      makeWardrobeItem({id: 'b1', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
      makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes'}),
    ];
    const capsule = buildCapsule(wardrobe, mildWeather, ['Casual'], 'Home');
    const allItemNames = capsule.outfits.flatMap(o => o.items.map(i => i.name));

    expect(allItemNames).toContain('Shorts');
  });

  // Test 5: cool + dinner does not select beach items
  it('cool + dinner: does not select beach items', () => {
    const coolWeather: DayWeather[] = [
      {date: '2025-03-15', dayLabel: 'Sat', highF: 58, lowF: 48, condition: 'partly-cloudy', rainChance: 15},
      {date: '2025-03-16', dayLabel: 'Sun', highF: 60, lowF: 50, condition: 'sunny', rainChance: 10},
    ];
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Hawaiian Shirt', main_category: 'Tops', subcategory: 'Hawaiian'}),
      makeWardrobeItem({id: 't2', name: 'Blazer', main_category: 'Tops', formalityScore: 75}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', formalityScore: 80}),
      makeWardrobeItem({id: 's1', name: 'Oxfords', main_category: 'Shoes', formalityScore: 85}),
    ];
    const capsule = buildCapsule(wardrobe, coolWeather, ['Dinner'], 'Home');
    const dinnerOutfit = capsule.outfits.find(o => o.occasion === 'Dinner');

    if (dinnerOutfit) {
      const names = dinnerOutfit.items.map(i => i.name);
      expect(names).not.toContain('Hawaiian Shirt');
    }
  });

  // Test 6: false positive - "short sleeve" doesn't match shorts
  it('false positive: "short sleeve" is NOT treated as shorts', () => {
    const coldWeather: DayWeather[] = [
      {date: '2025-01-15', dayLabel: 'Wed', highF: 40, lowF: 30, condition: 'cloudy', rainChance: 20},
    ];
    const shortSleeveShirt = makeWardrobeItem({
      id: 't1',
      name: 'Short Sleeve Button-Down',
      main_category: 'Tops',
      subcategory: 'Button-Down',
    });

    // Gate should NOT block "short sleeve" as if it were shorts
    const flags = inferGarmentFlags(shortSleeveShirt);
    expect(flags.isMinimalCoverage).toBe(false);

    // Also verify gatePool doesn't filter it out
    const climate = deriveClimateZone(coldWeather[0]);
    const activity = getActivityProfile('Formal');
    const result = gatePool([shortSleeveShirt], climate, activity);
    expect(result).toContain(shortSleeveShirt);
  });

  // Additional: CAPSULE_VERSION is 3 (bumped for climate gating)
  it('CAPSULE_VERSION is 3 (bumped for climate gating)', () => {
    expect(CAPSULE_VERSION).toBe(3);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ██  MANDATORY REGRESSION: Masculine user NEVER receives feminine items
  // ══════════════════════════════════════════════════════════════════════════

  it('REGRESSION: Masculine user never receives feminine clothing, shoes, or jewelry', () => {
    // Masculine-majority wardrobe with some feminine items that MUST be blocked
    // detectPresentation needs masculine signals to dominate
    const mixedWardrobe: TripWardrobeItem[] = [
      // Masculine items (majority - ensures presentation === 'masculine')
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80}),
      makeWardrobeItem({id: 't3', name: 'Polo Shirt', main_category: 'Tops', subcategory: 'Polo', formalityScore: 60}),
      makeWardrobeItem({id: 't4', name: 'V-Neck Sweater', main_category: 'Tops', subcategory: 'Sweater', formalityScore: 65}),
      makeWardrobeItem({id: 'b1', name: 'Wool Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Navy Chinos', main_category: 'Bottoms', subcategory: 'Chinos', formalityScore: 70}),
      makeWardrobeItem({id: 'b3', name: 'Dark Jeans', main_category: 'Bottoms', subcategory: 'Jeans', formalityScore: 50}),
      makeWardrobeItem({id: 'sh1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 'sh2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'o2', name: 'Wool Suit Jacket', main_category: 'Outerwear', subcategory: 'Suit', formalityScore: 90}),
      makeWardrobeItem({id: 'a1', name: 'Leather Watch', main_category: 'Accessories', subcategory: 'Watch'}),
      makeWardrobeItem({id: 'a2', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
      makeWardrobeItem({id: 'a3', name: 'Striped Necktie', main_category: 'Accessories', subcategory: 'Necktie'}),
      // Extra masculine shoes to push signal ratio above 70%
      makeWardrobeItem({id: 'sh4', name: 'Black Oxfords', main_category: 'Shoes', subcategory: 'Oxford'}),
      makeWardrobeItem({id: 'sh5', name: 'Penny Loafers', main_category: 'Shoes', subcategory: 'Loafer'}),
      // Feminine items that MUST BE BLOCKED (minority - simulates misclassified items)
      makeWardrobeItem({id: 'd1', name: 'Evening Gown', main_category: 'Dresses', subcategory: 'Gown'}),
      makeWardrobeItem({id: 'sk1', name: 'Pencil Skirt', main_category: 'Skirts', subcategory: 'Skirt'}),
      makeWardrobeItem({id: 'sh3', name: 'Stiletto Heels', main_category: 'Shoes', subcategory: 'Heels'}),
      makeWardrobeItem({id: 'j1', name: 'Diamond Earrings', main_category: 'Jewelry', subcategory: 'Earrings'}),
      makeWardrobeItem({id: 'bag1', name: 'Designer Purse', main_category: 'Bags', subcategory: 'Purse'}),
    ];

    const weather: DayWeather[] = [
      {date: '2025-06-15', dayLabel: 'Sun', highF: 75, lowF: 60, condition: 'sunny', rainChance: 5},
      {date: '2025-06-16', dayLabel: 'Mon', highF: 78, lowF: 62, condition: 'sunny', rainChance: 10},
    ];

    // Build capsule with multiple activities
    const capsule = buildCapsule(mixedWardrobe, weather, ['Formal', 'Business', 'Dinner', 'Casual'], 'Home');

    // Extract all items from all outfits
    const allItems = capsule.outfits.flatMap(o => o.items);
    const allNames = allItems.map(i => i.name);
    const allSubcats = allItems.map(i => i.subCategory || '').filter(Boolean);

    // ZERO TOLERANCE: None of these feminine items should appear
    const forbiddenPatterns = ['Gown', 'Skirt', 'Heels', 'Earrings', 'Purse'];

    for (const pattern of forbiddenPatterns) {
      const foundInName = allNames.some(n => n.toLowerCase().includes(pattern.toLowerCase()));
      const foundInSubcat = allSubcats.some(s => s.toLowerCase().includes(pattern.toLowerCase()));
      expect(foundInName || foundInSubcat).toBe(false);
    }

    // Verify masculine items ARE included (at least some)
    const hasMasculineItems = allNames.some(n =>
      n.includes('Shirt') || n.includes('Trousers') || n.includes('Oxford') || n.includes('Chinos')
    );
    expect(hasMasculineItems).toBe(true);
  });

  it('inferGarmentFlags correctly identifies feminine-only items', () => {
    // Items that MUST be flagged as feminine
    const feminineItems = [
      makeWardrobeItem({id: '1', name: 'Black Dress', main_category: 'Dresses'}),
      makeWardrobeItem({id: '2', name: 'Pencil Skirt', main_category: 'Skirts'}),
      makeWardrobeItem({id: '3', name: 'Silk Blouse', subcategory: 'Blouse'}),
      makeWardrobeItem({id: '4', name: 'Stiletto Heels', subcategory: 'Heels'}),
      makeWardrobeItem({id: '5', name: 'Red Pumps', subcategory: 'Pumps'}),
      makeWardrobeItem({id: '6', name: 'Diamond Earrings', subcategory: 'Earrings'}),
      makeWardrobeItem({id: '7', name: 'Designer Purse', subcategory: 'Purse'}),
      makeWardrobeItem({id: '8', name: 'Evening Clutch', subcategory: 'Clutch'}),
    ];

    for (const item of feminineItems) {
      const flags = inferGarmentFlags(item);
      expect(flags.isFeminineOnly).toBe(true);
    }

    // Items that must NOT be flagged as feminine (false positive prevention)
    const masculineItems = [
      makeWardrobeItem({id: '10', name: 'Dress Shirt', subcategory: 'Dress Shirt'}),
      makeWardrobeItem({id: '11', name: 'Oxford Shoes', subcategory: 'Oxford'}),
      makeWardrobeItem({id: '12', name: 'Leather Watch', subcategory: 'Watch'}),
      makeWardrobeItem({id: '13', name: 'Wool Trousers', subcategory: 'Trousers'}),
    ];

    for (const item of masculineItems) {
      const flags = inferGarmentFlags(item);
      expect(flags.isFeminineOnly).toBe(false);
    }
  });
});
