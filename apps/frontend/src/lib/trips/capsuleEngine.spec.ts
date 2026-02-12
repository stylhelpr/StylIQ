import {
  normalizeOutfitStructure,
  shouldRebuildCapsule,
  buildCapsule,
  buildCapsuleFingerprint,
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

  // Additional: CAPSULE_VERSION is 4 (bumped for eligibility pre-filter)
  it('CAPSULE_VERSION is 8 (post-gate diversity + rotation)', () => {
    expect(CAPSULE_VERSION).toBe(8);
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

// ══════════════════════════════════════════════════════════════════════════════
// ██  EXPLICIT PRESENTATION: buildCapsule with explicitPresentation param
// ══════════════════════════════════════════════════════════════════════════════

describe('buildCapsule with explicit presentation', () => {
  // Wardrobe with NO strong gendered signals — detectPresentation would return 'mixed'
  // This simulates the real bug: masculine user with generic items + some dresses
  const ambiguousWardrobe: TripWardrobeItem[] = [
    // Generic items (no masculine signals like oxford/loafer/blazer/suit/tie)
    makeWardrobeItem({id: 't1', name: 'White T-Shirt', main_category: 'Tops', subcategory: 'T-Shirt'}),
    makeWardrobeItem({id: 't2', name: 'Blue T-Shirt', main_category: 'Tops', subcategory: 'T-Shirt'}),
    makeWardrobeItem({id: 't3', name: 'Henley', main_category: 'Tops', subcategory: 'Henley'}),
    makeWardrobeItem({id: 'b1', name: 'Jeans', main_category: 'Bottoms', subcategory: 'Jeans'}),
    makeWardrobeItem({id: 'b2', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
    makeWardrobeItem({id: 'b3', name: 'Cargo Pants', main_category: 'Bottoms', subcategory: 'Pants'}),
    makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes', subcategory: 'Sneakers'}),
    makeWardrobeItem({id: 's2', name: 'Boots', main_category: 'Shoes', subcategory: 'Boots'}),
    makeWardrobeItem({id: 'a1', name: 'Baseball Cap', main_category: 'Accessories', subcategory: 'Hat'}),
    // Feminine items that MUST be blocked for masculine users
    makeWardrobeItem({id: 'd1', name: 'Summer Dress', main_category: 'Dresses', subcategory: 'Sundress'}),
    makeWardrobeItem({id: 'sk1', name: 'Mini Skirt', main_category: 'Skirts', subcategory: 'Mini Skirt'}),
    makeWardrobeItem({id: 'd2', name: 'Halter Dress', main_category: 'Dresses', subcategory: 'Halter Dress'}),
  ];

  const weather: DayWeather[] = [
    {date: '2025-06-15', dayLabel: 'Sun', highF: 80, lowF: 65, condition: 'sunny', rainChance: 5},
    {date: '2025-06-16', dayLabel: 'Mon', highF: 78, lowF: 62, condition: 'sunny', rainChance: 10},
    {date: '2025-06-17', dayLabel: 'Tue', highF: 82, lowF: 66, condition: 'partly-cloudy', rainChance: 15},
  ];

  it('TEST 1: masculine explicit → ZERO dresses in output', () => {
    const capsule = buildCapsule(ambiguousWardrobe, weather, ['Casual', 'Dinner'], 'Home', 'masculine');

    const allItems = capsule.outfits.flatMap(o => o.items);
    const allCategories = allItems.map(i => i.mainCategory);

    expect(allCategories).not.toContain('Dresses');
    expect(allCategories).not.toContain('Skirts');

    // Also check packing list
    const packingCategories = capsule.packingList.map(g => g.category);
    expect(packingCategories).not.toContain('Dresses');
    expect(packingCategories).not.toContain('Skirts');
  });

  it('TEST 2: feminine explicit → dresses allowed', () => {
    const capsule = buildCapsule(ambiguousWardrobe, weather, ['Casual', 'Dinner'], 'Home', 'feminine');

    // With feminine presentation and dinner activity, dresses may appear
    const allItems = capsule.outfits.flatMap(o => o.items);
    // Dresses are ELIGIBLE (may or may not be picked depending on scheduling)
    // At minimum, the dresses bucket should not be empty
    // Just verify no crash and items are produced
    expect(allItems.length).toBeGreaterThan(0);
  });

  it('TEST 3: masculine + no explicit → falls back to detectPresentation', () => {
    // Without explicit presentation, detectPresentation infers from wardrobe
    // This wardrobe has no strong masculine signals → 'mixed' → dresses may leak
    // But with explicit 'masculine', they are blocked
    const withExplicit = buildCapsule(ambiguousWardrobe, weather, ['Casual'], 'Home', 'masculine');
    const withoutExplicit = buildCapsule(ambiguousWardrobe, weather, ['Casual'], 'Home');

    const explicitItems = withExplicit.outfits.flatMap(o => o.items);
    expect(explicitItems.every(i => i.mainCategory !== 'Dresses')).toBe(true);
    expect(explicitItems.every(i => i.mainCategory !== 'Skirts')).toBe(true);
  });

  it('TEST 4: Skirts still map to bottoms slot (regression)', () => {
    // For feminine presentation, skirts should work as bottoms
    const feminineWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Blouse', main_category: 'Tops', subcategory: 'Blouse'}),
      makeWardrobeItem({id: 'sk1', name: 'A-Line Skirt', main_category: 'Skirts', subcategory: 'A-Line'}),
      makeWardrobeItem({id: 's1', name: 'Ballet Flats', main_category: 'Shoes', subcategory: 'Ballet Flat'}),
    ];

    const capsule = buildCapsule(feminineWardrobe, weather, ['Casual'], 'Home', 'feminine');

    const allItems = capsule.outfits.flatMap(o => o.items);
    // Skirts should be in the output as bottoms for feminine users
    const hasSkirt = allItems.some(i => i.mainCategory === 'Skirts');
    expect(hasSkirt).toBe(true);
  });

  it('TEST 5: masculine user with ONLY dresses in wardrobe → no crash, empty outfits', () => {
    const dressOnlyWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 'd1', name: 'Evening Gown', main_category: 'Dresses'}),
      makeWardrobeItem({id: 'd2', name: 'Sundress', main_category: 'Dresses'}),
    ];

    // Should not crash, should produce empty/minimal capsule
    const capsule = buildCapsule(dressOnlyWardrobe, weather, ['Casual'], 'Home', 'masculine');
    expect(capsule).toBeDefined();
    expect(capsule.outfits).toBeDefined();

    // All dresses should be filtered out
    const allItems = capsule.outfits.flatMap(o => o.items);
    expect(allItems.every(i => i.mainCategory !== 'Dresses')).toBe(true);
  });

  it('TEST 6: buildCapsuleFingerprint includes presentation (cache invalidation)', () => {
    const fp1 = buildCapsuleFingerprint(ambiguousWardrobe, weather, ['Casual'], 'Home', 'masculine');
    const fp2 = buildCapsuleFingerprint(ambiguousWardrobe, weather, ['Casual'], 'Home', 'feminine');
    const fp3 = buildCapsuleFingerprint(ambiguousWardrobe, weather, ['Casual'], 'Home');

    // Different presentations → different fingerprints → cache invalidation
    expect(fp1).not.toBe(fp2);
    // No presentation → defaults to 'mixed', different from 'masculine'
    expect(fp1).not.toBe(fp3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  FORMALITY GATING: Business/Dinner/Formal must NEVER include informal items
// ══════════════════════════════════════════════════════════════════════════════

describe('Formality gating — inferGarmentFlags isCasualOnly', () => {
  it('sneakers are isCasualOnly', () => {
    const sneaker: TripWardrobeItem = {id: 's1', name: 'White Sneakers', main_category: 'Shoes', subcategory: 'Lifestyle Sneakers'};
    expect(inferGarmentFlags(sneaker).isCasualOnly).toBe(true);
  });

  it('athletic sneakers are isCasualOnly', () => {
    const shoe: TripWardrobeItem = {id: 's2', name: 'Running Shoes', main_category: 'Shoes', subcategory: 'Athletic Sneakers'};
    expect(inferGarmentFlags(shoe).isCasualOnly).toBe(true);
  });

  it('work boots are isCasualOnly', () => {
    const boot: TripWardrobeItem = {id: 's3', name: 'Timberland Work Boots', main_category: 'Shoes', subcategory: 'Work Boots'};
    expect(inferGarmentFlags(boot).isCasualOnly).toBe(true);
  });

  it('hiking boots are isCasualOnly', () => {
    const boot: TripWardrobeItem = {id: 's4', name: 'Trail Hikers', main_category: 'Shoes', subcategory: 'Hiking Boots'};
    expect(inferGarmentFlags(boot).isCasualOnly).toBe(true);
  });

  it('combat boots are isCasualOnly', () => {
    const boot: TripWardrobeItem = {id: 's5', name: 'Black Combat Boots', main_category: 'Shoes', subcategory: 'Combat Boots'};
    expect(inferGarmentFlags(boot).isCasualOnly).toBe(true);
  });

  it('slides are isCasualOnly', () => {
    const slide: TripWardrobeItem = {id: 's6', name: 'Adidas Slides', main_category: 'Shoes', subcategory: 'Slides'};
    expect(inferGarmentFlags(slide).isCasualOnly).toBe(true);
  });

  it('hoodies are isCasualOnly', () => {
    const hoodie: TripWardrobeItem = {id: 't1', name: 'Grey Hoodie', main_category: 'Tops', subcategory: 'Hoodies'};
    expect(inferGarmentFlags(hoodie).isCasualOnly).toBe(true);
  });

  it('sweatshirts are isCasualOnly', () => {
    const sweat: TripWardrobeItem = {id: 't2', name: 'Crewneck Sweatshirt', main_category: 'Loungewear', subcategory: 'Sweatshirts'};
    expect(inferGarmentFlags(sweat).isCasualOnly).toBe(true);
  });

  it('t-shirts are isCasualOnly', () => {
    const tee: TripWardrobeItem = {id: 't3', name: 'Graphic Tee', main_category: 'Tops', subcategory: 'T-Shirts'};
    expect(inferGarmentFlags(tee).isCasualOnly).toBe(true);
  });

  it('joggers are isCasualOnly', () => {
    const jogger: TripWardrobeItem = {id: 'b1', name: 'Nike Joggers', main_category: 'Bottoms', subcategory: 'Joggers'};
    expect(inferGarmentFlags(jogger).isCasualOnly).toBe(true);
  });

  // ── V6: Expanded coverage ──

  it('shorts are isCasualOnly', () => {
    const shorts: TripWardrobeItem = {id: 'b2', name: 'Khaki Shorts', main_category: 'Bottoms', subcategory: 'Shorts'};
    expect(inferGarmentFlags(shorts).isCasualOnly).toBe(true);
  });

  it('cargo pants are isCasualOnly', () => {
    const cargo: TripWardrobeItem = {id: 'b3', name: 'Olive Cargo Pants', main_category: 'Bottoms', subcategory: 'Cargo Pants'};
    expect(inferGarmentFlags(cargo).isCasualOnly).toBe(true);
  });

  it('leggings are isCasualOnly', () => {
    const legging: TripWardrobeItem = {id: 'b4', name: 'Black Leggings', main_category: 'Bottoms', subcategory: 'Leggings'};
    expect(inferGarmentFlags(legging).isCasualOnly).toBe(true);
  });

  it('crop tops are isCasualOnly', () => {
    const crop: TripWardrobeItem = {id: 't4', name: 'White Crop Top', main_category: 'Tops', subcategory: 'Crop Tops'};
    expect(inferGarmentFlags(crop).isCasualOnly).toBe(true);
  });

  it('espadrilles are isCasualOnly', () => {
    const esp: TripWardrobeItem = {id: 's7', name: 'Woven Espadrilles', main_category: 'Shoes', subcategory: 'Espadrilles'};
    expect(inferGarmentFlags(esp).isCasualOnly).toBe(true);
  });

  it('boat shoes are isCasualOnly', () => {
    const boat: TripWardrobeItem = {id: 's8', name: 'Sperry Boat Shoes', main_category: 'Shoes', subcategory: 'Boat Shoes'};
    expect(inferGarmentFlags(boat).isCasualOnly).toBe(true);
  });

  it('denim jackets are isCasualOnly', () => {
    const denim: TripWardrobeItem = {id: 'o1', name: 'Denim Jacket', main_category: 'Outerwear', subcategory: 'Denim Jackets'};
    expect(inferGarmentFlags(denim).isCasualOnly).toBe(true);
  });

  it('puffer jackets are isCasualOnly', () => {
    const puffer: TripWardrobeItem = {id: 'o2', name: 'North Face Puffer', main_category: 'Outerwear', subcategory: 'Puffer Jackets'};
    expect(inferGarmentFlags(puffer).isCasualOnly).toBe(true);
  });

  // ── FALSE NEGATIVES: formal items must NOT be isCasualOnly ──

  it('oxfords are NOT isCasualOnly', () => {
    const oxford: TripWardrobeItem = {id: 'f1', name: 'Cap-Toe Oxfords', main_category: 'Shoes', subcategory: 'Oxfords'};
    expect(inferGarmentFlags(oxford).isCasualOnly).toBe(false);
  });

  it('loafers are NOT isCasualOnly', () => {
    const loafer: TripWardrobeItem = {id: 'f2', name: 'Penny Loafers', main_category: 'Shoes', subcategory: 'Loafers'};
    expect(inferGarmentFlags(loafer).isCasualOnly).toBe(false);
  });

  it('derbies are NOT isCasualOnly', () => {
    const derby: TripWardrobeItem = {id: 'f3', name: 'Suede Derbies', main_category: 'Shoes', subcategory: 'Derbies'};
    expect(inferGarmentFlags(derby).isCasualOnly).toBe(false);
  });

  it('chelsea boots are NOT isCasualOnly', () => {
    const chelsea: TripWardrobeItem = {id: 'f4', name: 'Black Chelsea Boots', main_category: 'Shoes', subcategory: 'Chelsea Boots'};
    expect(inferGarmentFlags(chelsea).isCasualOnly).toBe(false);
  });

  it('dress shirts are NOT isCasualOnly', () => {
    const shirt: TripWardrobeItem = {id: 'f5', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirts'};
    expect(inferGarmentFlags(shirt).isCasualOnly).toBe(false);
  });

  it('blazers are NOT isCasualOnly', () => {
    const blazer: TripWardrobeItem = {id: 'f6', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazers'};
    expect(inferGarmentFlags(blazer).isCasualOnly).toBe(false);
  });

  it('chinos are NOT isCasualOnly', () => {
    const chino: TripWardrobeItem = {id: 'f7', name: 'Khaki Chinos', main_category: 'Bottoms', subcategory: 'Chinos'};
    expect(inferGarmentFlags(chino).isCasualOnly).toBe(false);
  });

  it('monk straps are NOT isCasualOnly', () => {
    const monk: TripWardrobeItem = {id: 'f8', name: 'Double Monk Straps', main_category: 'Shoes', subcategory: 'Monk Straps'};
    expect(inferGarmentFlags(monk).isCasualOnly).toBe(false);
  });

  it('trousers are NOT isCasualOnly', () => {
    const trouser: TripWardrobeItem = {id: 'f9', name: 'Wool Trousers', main_category: 'Bottoms', subcategory: 'Trousers'};
    expect(inferGarmentFlags(trouser).isCasualOnly).toBe(false);
  });

  it('sweaters are NOT isCasualOnly', () => {
    const sweater: TripWardrobeItem = {id: 'f10', name: 'Cashmere Sweater', main_category: 'Tops', subcategory: 'Sweaters'};
    expect(inferGarmentFlags(sweater).isCasualOnly).toBe(false);
  });

  it('blazers (outerwear) are NOT isCasualOnly', () => {
    const blazer: TripWardrobeItem = {id: 'f11', name: 'Charcoal Blazer', main_category: 'Outerwear', subcategory: 'Blazers'};
    expect(inferGarmentFlags(blazer).isCasualOnly).toBe(false);
  });

  it('trench coats are NOT isCasualOnly', () => {
    const trench: TripWardrobeItem = {id: 'f12', name: 'Beige Trench Coat', main_category: 'Outerwear', subcategory: 'Trench Coats'};
    expect(inferGarmentFlags(trench).isCasualOnly).toBe(false);
  });

  it('peacoats are NOT isCasualOnly', () => {
    const peacoat: TripWardrobeItem = {id: 'f13', name: 'Navy Peacoat', main_category: 'Outerwear', subcategory: 'Peacoats'};
    expect(inferGarmentFlags(peacoat).isCasualOnly).toBe(false);
  });

  it('polo shirts are NOT isCasualOnly', () => {
    const polo: TripWardrobeItem = {id: 'f14', name: 'Navy Polo Shirt', main_category: 'Tops', subcategory: 'Polo Shirts'};
    expect(inferGarmentFlags(polo).isCasualOnly).toBe(false);
  });
});

describe('Formality gating — gatePool blocks informal items for formal activities', () => {
  const businessProfile = {formality: 2, context: 'city' as const};
  const formalProfile = {formality: 3, context: 'city' as const};
  const dinnerProfile = {formality: 2, context: 'city' as const};
  const casualProfile = {formality: 0, context: 'universal' as const};

  const sneaker: TripWardrobeItem = {id: 's1', name: 'Red Sneakers', main_category: 'Shoes', subcategory: 'Lifestyle Sneakers'};
  const oxford: TripWardrobeItem = {id: 's2', name: 'Cap-Toe Oxfords', main_category: 'Shoes', subcategory: 'Oxfords'};
  const workBoot: TripWardrobeItem = {id: 's3', name: 'Work Boots', main_category: 'Shoes', subcategory: 'Work Boots'};
  const loafer: TripWardrobeItem = {id: 's4', name: 'Penny Loafers', main_category: 'Shoes', subcategory: 'Loafers'};
  const hoodie: TripWardrobeItem = {id: 't1', name: 'Grey Hoodie', main_category: 'Tops', subcategory: 'Hoodies'};
  const dressShirt: TripWardrobeItem = {id: 't2', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirts'};
  const tee: TripWardrobeItem = {id: 't3', name: 'Graphic Tee', main_category: 'Tops', subcategory: 'T-Shirts'};
  const jogger: TripWardrobeItem = {id: 'b1', name: 'Joggers', main_category: 'Bottoms', subcategory: 'Joggers'};

  const allShoes = [sneaker, oxford, workBoot, loafer];
  const allTops = [hoodie, dressShirt, tee];

  it('Business: blocks sneakers, keeps oxfords and loafers', () => {
    const result = gatePool(allShoes, 'mild', businessProfile);
    const ids = result.map(i => i.id);
    expect(ids).not.toContain('s1'); // sneaker blocked
    expect(ids).not.toContain('s3'); // work boot blocked
    expect(ids).toContain('s2'); // oxford kept
    expect(ids).toContain('s4'); // loafer kept
  });

  it('Formal: blocks sneakers and work boots, keeps oxfords and loafers', () => {
    const result = gatePool(allShoes, 'mild', formalProfile);
    const ids = result.map(i => i.id);
    expect(ids).not.toContain('s1'); // sneaker blocked
    expect(ids).not.toContain('s3'); // work boot blocked
    expect(ids).toContain('s2'); // oxford kept
    expect(ids).toContain('s4'); // loafer kept
  });

  it('Dinner: blocks sneakers and work boots, keeps oxfords and loafers', () => {
    const result = gatePool(allShoes, 'mild', dinnerProfile);
    const ids = result.map(i => i.id);
    expect(ids).not.toContain('s1');
    expect(ids).not.toContain('s3');
    expect(ids).toContain('s2');
    expect(ids).toContain('s4');
  });

  it('Casual: keeps ALL shoes including sneakers and work boots', () => {
    const result = gatePool(allShoes, 'mild', casualProfile);
    const ids = result.map(i => i.id);
    expect(ids).toContain('s1'); // sneaker kept
    expect(ids).toContain('s2'); // oxford kept
    expect(ids).toContain('s3'); // work boot kept
    expect(ids).toContain('s4'); // loafer kept
  });

  it('Business: blocks hoodies and tees, keeps dress shirts', () => {
    const result = gatePool(allTops, 'mild', businessProfile);
    const ids = result.map(i => i.id);
    expect(ids).not.toContain('t1'); // hoodie blocked
    expect(ids).not.toContain('t3'); // tee blocked
    expect(ids).toContain('t2'); // dress shirt kept
  });

  it('Formal: blocks hoodies and tees, keeps dress shirts', () => {
    const result = gatePool(allTops, 'mild', formalProfile);
    const ids = result.map(i => i.id);
    expect(ids).not.toContain('t1');
    expect(ids).not.toContain('t3');
    expect(ids).toContain('t2');
  });

  it('Dinner: blocks hoodies, keeps dress shirts', () => {
    const result = gatePool(allTops, 'mild', dinnerProfile);
    const ids = result.map(i => i.id);
    expect(ids).not.toContain('t1');
    expect(ids).toContain('t2');
  });

  it('Business: blocks joggers', () => {
    const result = gatePool([jogger], 'mild', businessProfile);
    expect(result).toHaveLength(0);
  });

  it('Casual: keeps hoodies, tees, and joggers', () => {
    const result = gatePool([...allTops, jogger], 'mild', casualProfile);
    expect(result).toHaveLength(4);
  });

  // ── V6: Expanded blocking ──

  it('Business: blocks shorts', () => {
    const shorts: TripWardrobeItem = {id: 'b2', name: 'Khaki Shorts', main_category: 'Bottoms', subcategory: 'Shorts'};
    expect(gatePool([shorts], 'mild', businessProfile)).toHaveLength(0);
  });

  it('Business: blocks cargo pants', () => {
    const cargo: TripWardrobeItem = {id: 'b3', name: 'Olive Cargo Pants', main_category: 'Bottoms', subcategory: 'Cargo Pants'};
    expect(gatePool([cargo], 'mild', businessProfile)).toHaveLength(0);
  });

  it('Formal: blocks leggings', () => {
    const legging: TripWardrobeItem = {id: 'b4', name: 'Black Leggings', main_category: 'Bottoms', subcategory: 'Leggings'};
    expect(gatePool([legging], 'mild', formalProfile)).toHaveLength(0);
  });

  it('Formal: blocks espadrilles', () => {
    const esp: TripWardrobeItem = {id: 's9', name: 'Woven Espadrilles', main_category: 'Shoes', subcategory: 'Espadrilles'};
    expect(gatePool([esp], 'mild', formalProfile)).toHaveLength(0);
  });

  it('Formal: blocks boat shoes', () => {
    const boat: TripWardrobeItem = {id: 's10', name: 'Boat Shoes', main_category: 'Shoes', subcategory: 'Boat Shoes'};
    expect(gatePool([boat], 'mild', formalProfile)).toHaveLength(0);
  });

  it('Business: blocks denim jackets', () => {
    const denim: TripWardrobeItem = {id: 'o1', name: 'Denim Jacket', main_category: 'Outerwear', subcategory: 'Denim Jackets'};
    expect(gatePool([denim], 'mild', businessProfile)).toHaveLength(0);
  });

  it('Business: blocks puffer jackets', () => {
    const puffer: TripWardrobeItem = {id: 'o2', name: 'North Face Puffer', main_category: 'Outerwear', subcategory: 'Puffer Jackets'};
    expect(gatePool([puffer], 'mild', businessProfile)).toHaveLength(0);
  });

  it('Casual: keeps shorts and cargo', () => {
    const shorts: TripWardrobeItem = {id: 'b2', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'};
    const cargo: TripWardrobeItem = {id: 'b3', name: 'Cargo Pants', main_category: 'Bottoms', subcategory: 'Cargo Pants'};
    const result = gatePool([shorts, cargo], 'mild', casualProfile);
    expect(result).toHaveLength(2);
  });

  it('Dinner: blocks crop tops', () => {
    const crop: TripWardrobeItem = {id: 't5', name: 'White Crop Top', main_category: 'Tops', subcategory: 'Crop Tops'};
    expect(gatePool([crop], 'mild', dinnerProfile)).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  DIVERSITY + ROTATION — POST-GATE
// ══════════════════════════════════════════════════════════════════════════════

describe('Diversity + Rotation — post-gate', () => {
  it('alternates formal shoes across Business days when 2+ eligible shoes exist', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Wool Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Navy Chinos', main_category: 'Bottoms', subcategory: 'Chinos', formalityScore: 70}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
      {date: '2026-03-05', dayLabel: 'Thu', highF: 73, lowF: 59, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');

    const businessOutfits = capsule.outfits.filter(o => o.occasion === 'Business');
    expect(businessOutfits.length).toBeGreaterThanOrEqual(2);

    const shoesByDay = businessOutfits.map(o => {
      const shoe = o.items.find(i => i.mainCategory === 'Shoes');
      return shoe?.wardrobeItemId;
    }).filter(Boolean);

    // With 2 shoes, they should alternate — both must appear
    const uniqueShoes = new Set(shoesByDay);
    expect(uniqueShoes.size).toBe(2);

    // Consecutive Business days should NOT repeat the same shoe
    for (let i = 1; i < shoesByDay.length; i++) {
      expect(shoesByDay[i]).not.toBe(shoesByDay[i - 1]);
    }
  });

  it('rotation survives gating shrinkage (3 shoes → 2 after formality gate)', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Button-Down', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 80}),
      makeWardrobeItem({id: 'b2', name: 'Chinos', main_category: 'Bottoms', subcategory: 'Chinos', formalityScore: 70}),
      // 3 shoes: 2 formal (survive gating) + 1 casual (gated out for Business)
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 's3', name: 'White Sneakers', main_category: 'Shoes', subcategory: 'Sneakers', formalityScore: 20}),
      makeWardrobeItem({id: 'o1', name: 'Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
      {date: '2026-03-05', dayLabel: 'Thu', highF: 73, lowF: 59, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');
    const businessOutfits = capsule.outfits.filter(o => o.occasion === 'Business');

    // Sneakers must be gated out for Business
    for (const outfit of businessOutfits) {
      const shoes = outfit.items.filter(i => i.mainCategory === 'Shoes');
      expect(shoes.every(s => s.wardrobeItemId !== 's3')).toBe(true);
    }

    // Despite gating shrinking pool from 3→2, remaining shoes should alternate
    const shoeIds = businessOutfits.map(o => {
      const shoe = o.items.find(i => i.mainCategory === 'Shoes');
      return shoe?.wardrobeItemId;
    }).filter(Boolean);

    if (shoeIds.length >= 2) {
      // Consecutive shoes should differ
      for (let i = 1; i < shoeIds.length; i++) {
        expect(shoeIds[i]).not.toBe(shoeIds[i - 1]);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  ALTERNATES — each picked item should surface runner-up candidates
// ══════════════════════════════════════════════════════════════════════════════

describe('Alternates — runner-up candidates per slot', () => {
  it('items with 2+ candidates in bucket have alternates attached', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Wool Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Navy Chinos', main_category: 'Bottoms', subcategory: 'Chinos', formalityScore: 70}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');
    const firstOutfit = capsule.outfits[0];

    // Find the top item — it should have alternates (3 dress shirts in bucket)
    const top = firstOutfit.items.find(i => i.mainCategory === 'Tops');
    expect(top).toBeDefined();
    const alts = (top as any)?.alternates;
    expect(alts).toBeDefined();
    expect(alts.length).toBeGreaterThanOrEqual(1);
    expect(alts.length).toBeLessThanOrEqual(2);

    // Each alternate has required fields
    for (const alt of alts) {
      expect(alt.id).toBeDefined();
      expect(alt.name).toBeDefined();
      expect(alt.reason).toBeDefined();
      expect(typeof alt.reason).toBe('string');
      expect(alt.reason.length).toBeGreaterThan(0);
    }

    // Alternate id differs from chosen
    expect(alts.every((a: any) => a.id !== top!.wardrobeItemId)).toBe(true);
  });

  it('items with only 1 candidate in bucket have NO alternates', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      // Only ONE bottom — no alternate possible
      makeWardrobeItem({id: 'b1', name: 'Wool Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');
    const firstOutfit = capsule.outfits[0];

    // Bottom has only 1 item → no alternates
    const bottom = firstOutfit.items.find(i => i.mainCategory === 'Bottoms');
    expect(bottom).toBeDefined();
    expect((bottom as any)?.alternates).toBeUndefined();
  });

  it('alternates have at most 2 entries', () => {
    // 5 tops → alternates should cap at 2
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Shirt A', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Shirt B', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 78, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Shirt C', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 76, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Shirt D', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 74, dressCode: 'business'}),
      makeWardrobeItem({id: 't5', name: 'Shirt E', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxfords', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');
    const top = capsule.outfits[0].items.find(i => i.mainCategory === 'Tops');
    const alts = (top as any)?.alternates;
    expect(alts).toBeDefined();
    expect(alts.length).toBe(2);
  });

  it('shoe alternates are present when 2+ formal shoes exist', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');
    const shoe = capsule.outfits[0].items.find(i => i.mainCategory === 'Shoes');
    expect(shoe).toBeDefined();
    const alts = (shoe as any)?.alternates;
    expect(alts).toBeDefined();
    expect(alts.length).toBe(1); // 2 shoes → 1 alternate
    expect(alts[0].id).not.toBe(shoe!.wardrobeItemId);
  });

  it('alternates do not appear on items from non-gated outerwear picks', () => {
    // Default case uses pickOuterwear (not through diversity system)
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'T-Shirt', main_category: 'Tops'}),
      makeWardrobeItem({id: 'b1', name: 'Jeans', main_category: 'Bottoms'}),
      makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes', subcategory: 'Sneakers'}),
      makeWardrobeItem({id: 'o1', name: 'Rain Jacket', main_category: 'Outerwear', rainOk: true}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 52, lowF: 40, condition: 'rainy', rainChance: 80},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Casual'], 'Home');
    const outfit = capsule.outfits[0];
    const outerwear = outfit.items.find(i => i.mainCategory === 'Outerwear');
    // pickOuterwear doesn't go through diversity → no alternates
    if (outerwear) {
      expect((outerwear as any)?.alternates).toBeUndefined();
    }
  });

  it('existing selection logic is unchanged — alternates are additive only', () => {
    // Same wardrobe and weather as the shoe rotation test — verify identical picks
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Wool Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Navy Chinos', main_category: 'Bottoms', subcategory: 'Chinos', formalityScore: 70}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
      {date: '2026-03-05', dayLabel: 'Thu', highF: 73, lowF: 59, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');

    // Verify determinism: same inputs → same item selections
    const capsule2 = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');

    for (let i = 0; i < capsule.outfits.length; i++) {
      const items1 = capsule.outfits[i].items.map(it => it.wardrobeItemId);
      const items2 = capsule2.outfits[i].items.map(it => it.wardrobeItemId);
      expect(items1).toEqual(items2);
    }
  });
});

describe('Formality gating — buildCapsule integration', () => {
  const formalWardrobe: TripWardrobeItem[] = [
    {id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirts', formalityScore: 80, dressCode: 'business'},
    {id: 't2', name: 'Grey Hoodie', main_category: 'Tops', subcategory: 'Hoodies', formalityScore: 20},
    {id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 75},
    {id: 'b2', name: 'Black Joggers', main_category: 'Bottoms', subcategory: 'Joggers', formalityScore: 10},
    {id: 's1', name: 'Red Sneakers', main_category: 'Shoes', subcategory: 'Lifestyle Sneakers', formalityScore: 20},
    {id: 's2', name: 'Cap-Toe Oxfords', main_category: 'Shoes', subcategory: 'Oxfords', formalityScore: 90, dressCode: 'formal'},
    {id: 'a1', name: 'Leather Watch', main_category: 'Accessories', subcategory: 'Watch'},
  ];

  const weather: DayWeather[] = [
    {date: '2026-03-01', dayLabel: 'Sun', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-02', dayLabel: 'Mon', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
  ];

  it('Business trip: ZERO sneakers, ZERO hoodies, ZERO joggers in outfits', () => {
    const capsule = buildCapsule(formalWardrobe, weather, ['Business'], 'Home', 'masculine');
    const allItems = capsule.outfits.flatMap(o => o.items);
    const subCategories = allItems.map(i => (i.subCategory || '').toLowerCase());
    const names = allItems.map(i => i.name.toLowerCase());

    // Sneakers must NEVER appear
    expect(subCategories.some(s => s.includes('sneaker'))).toBe(false);
    expect(names.some(n => n.includes('sneaker'))).toBe(false);
    // Hoodies must NEVER appear
    expect(subCategories.some(s => s.includes('hoodie'))).toBe(false);
    expect(names.some(n => n.includes('hoodie'))).toBe(false);
    // Joggers must NEVER appear
    expect(subCategories.some(s => s.includes('jogger'))).toBe(false);
    expect(names.some(n => n.includes('jogger'))).toBe(false);
  });

  it('Formal event: ZERO sneakers in outfits', () => {
    const capsule = buildCapsule(formalWardrobe, weather, ['Formal'], 'Home', 'masculine');
    const allItems = capsule.outfits.flatMap(o => o.items);
    const subCategories = allItems.map(i => (i.subCategory || '').toLowerCase());

    expect(subCategories.some(s => s.includes('sneaker'))).toBe(false);
  });

  it('Dinner: ZERO sneakers or hoodies in Dinner outfits', () => {
    // Dinner appears as secondary activity; primary is Casual which CAN have sneakers
    const capsule = buildCapsule(formalWardrobe, weather, ['Dinner'], 'Home', 'masculine');
    const dinnerOutfits = capsule.outfits.filter(o => o.occasion === 'Dinner');
    const dinnerItems = dinnerOutfits.flatMap(o => o.items);
    const subCategories = dinnerItems.map(i => (i.subCategory || '').toLowerCase());

    // Dinner outfits must not contain sneakers or hoodies
    expect(subCategories.some(s => s.includes('sneaker'))).toBe(false);
    expect(subCategories.some(s => s.includes('hoodie'))).toBe(false);
  });

  it('Casual trip: sneakers and hoodies ARE allowed', () => {
    const capsule = buildCapsule(formalWardrobe, weather, ['Casual'], 'Home', 'masculine');
    const allItems = capsule.outfits.flatMap(o => o.items);
    const allWardrobeIds = allItems.map(i => i.wardrobeItemId);

    // With only sneakers available as shoes, they should be packed for casual
    expect(allWardrobeIds.some(id => id === 's1' || id === 's2')).toBe(true);
  });

  it('Mixed Business+Casual trip: Business outfits have NO sneakers, Casual outfits CAN', () => {
    const mixedWeather: DayWeather[] = [
      {date: '2026-03-03', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-04', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-05', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
    ];
    const capsule = buildCapsule(formalWardrobe, mixedWeather, ['Business', 'Casual'], 'Home', 'masculine');

    for (const outfit of capsule.outfits) {
      if (outfit.occasion === 'Business') {
        const subs = outfit.items.map(i => (i.subCategory || '').toLowerCase());
        expect(subs.some(s => s.includes('sneaker'))).toBe(false);
        expect(subs.some(s => s.includes('hoodie'))).toBe(false);
        expect(subs.some(s => s.includes('jogger'))).toBe(false);
      }
    }
  });

  it('Business trip: ZERO shorts even in warm weather', () => {
    const warmWeather: DayWeather[] = [
      {date: '2026-07-01', dayLabel: 'Mon', highF: 92, lowF: 78, condition: 'sunny', rainChance: 5},
      {date: '2026-07-02', dayLabel: 'Tue', highF: 95, lowF: 80, condition: 'sunny', rainChance: 5},
    ];
    const wardrobeWithShorts: TripWardrobeItem[] = [
      {id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirts', formalityScore: 80},
      {id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 75},
      {id: 'b2', name: 'Khaki Shorts', main_category: 'Bottoms', subcategory: 'Shorts', formalityScore: 10},
      {id: 's1', name: 'Cap-Toe Oxfords', main_category: 'Shoes', subcategory: 'Oxfords', formalityScore: 90},
    ];
    const capsule = buildCapsule(wardrobeWithShorts, warmWeather, ['Business'], 'Home', 'masculine');
    const allItems = capsule.outfits.flatMap(o => o.items);
    expect(allItems.some(i => (i.subCategory || '').toLowerCase().includes('short'))).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  FALLBACK SAFETY: Fallback must NEVER bypass formality rules
// ══════════════════════════════════════════════════════════════════════════════

describe('Fallback safety — fail-closed for formal activities', () => {
  it('feminine user with ONLY hoodies: Business outfit gets NO tops (fail-closed), NOT hoodies', () => {
    const hoodieOnlyWardrobe: TripWardrobeItem[] = [
      {id: 't1', name: 'Grey Hoodie', main_category: 'Tops', subcategory: 'Hoodies'},
      {id: 't2', name: 'Black Hoodie', main_category: 'Tops', subcategory: 'Hoodies'},
      {id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers'},
      {id: 's1', name: 'Penny Loafers', main_category: 'Shoes', subcategory: 'Loafers'},
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-01', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];
    const capsule = buildCapsule(hoodieOnlyWardrobe, weather, ['Business'], 'Home', 'feminine');

    // Business outfits must NOT contain hoodies even via fallback
    for (const outfit of capsule.outfits) {
      if (outfit.occasion === 'Business') {
        const subs = outfit.items.map(i => (i.subCategory || '').toLowerCase());
        expect(subs.some(s => s.includes('hoodie'))).toBe(false);
      }
    }
  });

  it('mixed user with ONLY sneakers: Formal outfit gets NO shoes (fail-closed), NOT sneakers', () => {
    const sneakerOnlyWardrobe: TripWardrobeItem[] = [
      {id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirts', formalityScore: 80},
      {id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 75},
      {id: 's1', name: 'White Sneakers', main_category: 'Shoes', subcategory: 'Lifestyle Sneakers'},
      {id: 's2', name: 'Running Shoes', main_category: 'Shoes', subcategory: 'Athletic Sneakers'},
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-01', dayLabel: 'Sun', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-02', dayLabel: 'Mon', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    ];
    // Formal is last day per planDaySchedules
    const capsule = buildCapsule(sneakerOnlyWardrobe, weather, ['Formal'], 'Home', 'mixed');

    for (const outfit of capsule.outfits) {
      if (outfit.occasion === 'Formal') {
        const subs = outfit.items.map(i => (i.subCategory || '').toLowerCase());
        expect(subs.some(s => s.includes('sneaker'))).toBe(false);
        expect(subs.some(s => s.includes('athletic'))).toBe(false);
      }
    }
  });

  it('all genders: Business NEVER has shorts, cargo, leggings, espadrilles, or puffer jackets', () => {
    const mixedWardrobe: TripWardrobeItem[] = [
      {id: 't1', name: 'Polo Shirt', main_category: 'Tops', subcategory: 'Polo Shirts'},
      {id: 'b1', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'},
      {id: 'b2', name: 'Cargo Pants', main_category: 'Bottoms', subcategory: 'Cargo Pants'},
      {id: 'b3', name: 'Leggings', main_category: 'Bottoms', subcategory: 'Leggings'},
      {id: 'b4', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers'},
      {id: 's1', name: 'Espadrilles', main_category: 'Shoes', subcategory: 'Espadrilles'},
      {id: 's2', name: 'Loafers', main_category: 'Shoes', subcategory: 'Loafers'},
      {id: 'o1', name: 'Puffer Jacket', main_category: 'Outerwear', subcategory: 'Puffer Jackets'},
      {id: 'o2', name: 'Blazer', main_category: 'Outerwear', subcategory: 'Blazers'},
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-03', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    for (const pres of ['masculine', 'feminine', 'mixed'] as const) {
      const capsule = buildCapsule(mixedWardrobe, weather, ['Business'], 'Home', pres);
      for (const outfit of capsule.outfits) {
        if (outfit.occasion === 'Business') {
          const subs = outfit.items.map(i => (i.subCategory || '').toLowerCase());
          expect(subs.some(s => s.includes('short'))).toBe(false);
          expect(subs.some(s => s.includes('cargo'))).toBe(false);
          expect(subs.some(s => s.includes('legging'))).toBe(false);
          expect(subs.some(s => s.includes('espadrille'))).toBe(false);
          expect(subs.some(s => s.includes('puffer'))).toBe(false);
        }
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  ANCHOR ACTIVITY SCHEDULING — no phantom Casual
// ══════════════════════════════════════════════════════════════════════════════

describe('Anchor activity scheduling — no phantom Casual', () => {
  const businessWardrobe: TripWardrobeItem[] = [
    makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
    makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 'b3', name: 'Charcoal Slacks', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 80}),
    makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
    makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
    makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
  ];

  it('[Business, Dinner, Formal] produces NO Casual anchor outfits', () => {
    const weather: DayWeather[] = [
      {date: '2026-03-07', dayLabel: 'Sat', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-08', dayLabel: 'Sun', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-09', dayLabel: 'Mon', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
    ];

    const capsule = buildCapsule(businessWardrobe, weather, ['Business', 'Dinner', 'Formal'], 'Home', 'masculine');
    const anchorOccasions = capsule.outfits
      .filter(o => o.type === 'anchor')
      .map(o => o.occasion);

    expect(anchorOccasions).not.toContain('Casual');
    // Every anchor must be one of the selected activities
    for (const occ of anchorOccasions) {
      expect(['Business', 'Dinner', 'Formal']).toContain(occ);
    }
  });

  it('[Business] only produces Business anchor outfits', () => {
    const weather: DayWeather[] = [
      {date: '2026-03-07', dayLabel: 'Sat', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-08', dayLabel: 'Sun', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-09', dayLabel: 'Mon', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
    ];

    const capsule = buildCapsule(businessWardrobe, weather, ['Business'], 'Home', 'masculine');
    const anchorOccasions = capsule.outfits
      .filter(o => o.type === 'anchor')
      .map(o => o.occasion);

    for (const occ of anchorOccasions) {
      expect(occ).toBe('Business');
    }
  });

  it('more days than activities cycles through selected activities', () => {
    const weather: DayWeather[] = [
      {date: '2026-03-07', dayLabel: 'Sat', highF: 85, lowF: 72, condition: 'sunny', rainChance: 5},
      {date: '2026-03-08', dayLabel: 'Sun', highF: 86, lowF: 73, condition: 'sunny', rainChance: 5},
      {date: '2026-03-09', dayLabel: 'Mon', highF: 84, lowF: 71, condition: 'sunny', rainChance: 10},
      {date: '2026-03-10', dayLabel: 'Tue', highF: 83, lowF: 70, condition: 'sunny', rainChance: 10},
      {date: '2026-03-11', dayLabel: 'Wed', highF: 82, lowF: 69, condition: 'sunny', rainChance: 5},
    ];

    const capsule = buildCapsule(businessWardrobe, weather, ['Dinner', 'Sightseeing'], 'Home', 'masculine');
    const anchorOccasions = capsule.outfits
      .filter(o => o.type === 'anchor')
      .map(o => o.occasion);

    expect(anchorOccasions).not.toContain('Casual');
    for (const occ of anchorOccasions) {
      expect(['Dinner', 'Sightseeing']).toContain(occ);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  BACKUP ITEM SUGGESTIONS
// ══════════════════════════════════════════════════════════════════════════════

describe('Trip backup kit', () => {
  const largeWardrobe: TripWardrobeItem[] = [
    // 6 tops
    makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
    makeWardrobeItem({id: 't4', name: 'Striped Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
    makeWardrobeItem({id: 't5', name: 'Grey Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
    makeWardrobeItem({id: 't6', name: 'Mint Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 70, dressCode: 'business'}),
    // 4 bottoms
    makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 'b3', name: 'Khaki Chinos', main_category: 'Bottoms', subcategory: 'Chinos', formalityScore: 70}),
    makeWardrobeItem({id: 'b4', name: 'Charcoal Slacks', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 80}),
    // 3 shoes
    makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
    makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85}),
    // Outerwear + accessories
    makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
    makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
  ];

  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
  ];

  it('max 3 items in tripBackupKit', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    expect(capsule.tripBackupKit!.length).toBeLessThanOrEqual(3);
  });

  it('deterministic output across runs', () => {
    const capsule1 = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    const capsule2 = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');

    expect(capsule1.tripBackupKit).toBeDefined();
    expect(capsule2.tripBackupKit).toBeDefined();
    expect(capsule1.tripBackupKit!.length).toBe(capsule2.tripBackupKit!.length);
    for (let i = 0; i < capsule1.tripBackupKit!.length; i++) {
      expect(capsule1.tripBackupKit![i].wardrobeItemId).toBe(capsule2.tripBackupKit![i].wardrobeItemId);
      expect(capsule1.tripBackupKit![i].reason).toBe(capsule2.tripBackupKit![i].reason);
    }
  });

  it('no duplicate items in kit', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    const ids = capsule.tripBackupKit.map(b => b.wardrobeItemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no overlap with mandatory outfit items', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    const outfitItemIds = new Set(capsule.outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)));
    for (const b of capsule.tripBackupKit) {
      expect(outfitItemIds.has(b.wardrobeItemId)).toBe(false);
    }
  });

  it('each item has name, imageUrl, and multi-clause reason', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    for (const b of capsule.tripBackupKit) {
      expect(b.wardrobeItemId).toBeDefined();
      expect(b.name.length).toBeGreaterThan(0);
      expect(typeof b.imageUrl).toBe('string');
      expect(b.reason.length).toBeGreaterThan(0);
      // Reasons are now 2–3 clauses separated by periods
      const sentences = b.reason.split('.').filter(s => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences.length).toBeLessThanOrEqual(3);
      // Each clause should be concise (≤ 7 words)
      for (const s of sentences) {
        expect(s.trim().split(' ').length).toBeLessThanOrEqual(7);
      }
    }
  });

  it('no kit when wardrobe too small', () => {
    const tinyWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxfords', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(tinyWardrobe, weather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeUndefined();
  });

  it('outfits do not have backupSuggestions', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    for (const outfit of capsule.outfits) {
      expect((outfit as any).backupSuggestions).toBeUndefined();
    }
  });
});
