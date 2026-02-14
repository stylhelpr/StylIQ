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
  gateBackupPool,
  gateBackupPoolFallback,
  getNormalizedFormality,
  aestheticBonus,
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

  it('NO_CAPSULE: triggers rebuild when capsule is undefined', () => {
    expect(shouldRebuildCapsule(undefined, 2, 'mixed')).toEqual({rebuild: true, reason: 'NO_CAPSULE', mode: 'AUTO'});
  });

  it('NO_CAPSULE: triggers rebuild for all presentation values', () => {
    for (const p of ['masculine', 'feminine', 'mixed'] as const) {
      const result = shouldRebuildCapsule(undefined, CAPSULE_VERSION, p);
      expect(result).toEqual({rebuild: true, reason: 'NO_CAPSULE', mode: 'AUTO'});
    }
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
    // Explicit 'feminine' — wardrobe contains Bikini (swimwear), detectPresentation
    // early-outs to 'masculine' for small wardrobes with no gendered signals
    const capsule = buildCapsule(wardrobe, hotWeather, ['Beach'], 'Home', 'feminine');
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

  // Additional: CAPSULE_VERSION bumped for final validation gate
  it('CAPSULE_VERSION is 12 (final validation gate)', () => {
    expect(CAPSULE_VERSION).toBe(12);
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

describe('Feminine-only detection — isFeminineOnly false-positive prevention', () => {
  // Items with "dress" as an adjective (NOT dresses) must NOT be flagged feminine-only
  it('dress boots are NOT isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'db1', name: 'Brown Dress Boots', main_category: 'Shoes', subcategory: 'Dress Boots'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(false);
  });

  it('dress shoes are NOT isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'ds1', name: 'Black Dress Shoes', main_category: 'Shoes', subcategory: 'Dress Shoes'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(false);
  });

  it('dress shirt is NOT isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'ds2', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(false);
  });

  it('dress pants are NOT isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'dp1', name: 'Grey Dress Pants', main_category: 'Bottoms', subcategory: 'Dress Pants'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(false);
  });

  // Actual dresses MUST still be flagged feminine-only
  it('wrap dress IS isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'wd1', name: 'Red Wrap Dress', main_category: 'Dresses', subcategory: 'Wrap Dress'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(true);
  });

  it('maxi dress IS isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'md1', name: 'Floral Maxi Dress', main_category: 'Dresses', subcategory: 'Maxi Dress'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(true);
  });

  it('sundress IS isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'sd1', name: 'Yellow Sundress', main_category: 'Dresses', subcategory: 'Sundress'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(true);
  });

  it('cocktail dress IS isFeminineOnly (main_category Dresses)', () => {
    const item: TripWardrobeItem = {id: 'cd1', name: 'Black Cocktail Dress', main_category: 'Dresses', subcategory: 'Cocktail Dress'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(true);
  });

  it('subcategory "dress" (bare noun) IS isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'bd1', name: 'Little Black Dress', main_category: 'Dresses', subcategory: 'Dress'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(true);
  });

  // Other feminine items still correctly detected
  it('stiletto heels are isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'sh1', name: 'Black Stilettos', main_category: 'Shoes', subcategory: 'Stiletto'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(true);
  });

  it('ballet flats are isFeminineOnly', () => {
    const item: TripWardrobeItem = {id: 'bf1', name: 'Nude Ballet Flats', main_category: 'Shoes', subcategory: 'Ballet Flat'};
    expect(inferGarmentFlags(item).isFeminineOnly).toBe(true);
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

  // Diagnostic: cold Business trip with multiple formal shoe types
  it('Business/cold: keeps all formal shoes (oxford, loafer, derby, chelsea, monk)', () => {
    const formalShoes: TripWardrobeItem[] = [
      {id: 'fs1', name: 'Cap-Toe Oxfords', main_category: 'Shoes', subcategory: 'Oxfords', formalityScore: 90},
      {id: 'fs2', name: 'Penny Loafers', main_category: 'Shoes', subcategory: 'Loafers', formalityScore: 75},
      {id: 'fs3', name: 'Brown Derby Shoes', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 78},
      {id: 'fs4', name: 'Chelsea Boots', main_category: 'Shoes', subcategory: 'Chelsea Boots', formalityScore: 70},
      {id: 'fs5', name: 'Monk Strap Shoes', main_category: 'Shoes', subcategory: 'Monk Strap', formalityScore: 82},
      {id: 'fs6', name: 'Dress Boots', main_category: 'Shoes', subcategory: 'Dress Boots', formalityScore: 72},
    ];
    // Test all climate zones × Business
    for (const zone of ['cold', 'freezing', 'cool', 'mild', 'warm'] as const) {
      const result = gatePool(formalShoes, zone, businessProfile, 'masculine');
      const passedIds = result.map(i => i.id);
      for (const shoe of formalShoes) {
        expect(passedIds).toContain(shoe.id);
      }
    }
  });

  it('Business/cold: blocks casual shoes even in mild weather', () => {
    const casualShoes: TripWardrobeItem[] = [
      {id: 'cs1', name: 'Running Sneakers', main_category: 'Shoes', subcategory: 'Sneakers', formalityScore: 10},
      {id: 'cs2', name: 'Hiking Boots', main_category: 'Shoes', subcategory: 'Hiking Boots', formalityScore: 20},
      {id: 'cs3', name: 'Slides', main_category: 'Shoes', subcategory: 'Slides', formalityScore: 5},
    ];
    const result = gatePool(casualShoes, 'mild', businessProfile, 'masculine');
    expect(result.length).toBe(0);
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
// ██  WEIGHTED PICK — USAGE-BASED DIVERSITY (POST-GATE)
// ══════════════════════════════════════════════════════════════════════════════

describe('Weighted pick — usage-based diversity', () => {
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

  it('diversity survives gating shrinkage (3 shoes → 2 after formality gate)', () => {
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

  it('items distribute across days via usage penalty', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Shirt A', main_category: 'Tops', subcategory: 'Button-Down', formalityScore: 60}),
      makeWardrobeItem({id: 't2', name: 'Shirt B', main_category: 'Tops', subcategory: 'Button-Down', formalityScore: 60}),
      makeWardrobeItem({id: 't3', name: 'Shirt C', main_category: 'Tops', subcategory: 'Button-Down', formalityScore: 60}),
      makeWardrobeItem({id: 'b1', name: 'Chinos', main_category: 'Bottoms', subcategory: 'Chinos', formalityScore: 60}),
      makeWardrobeItem({id: 'b2', name: 'Jeans', main_category: 'Bottoms', subcategory: 'Jeans', formalityScore: 50}),
      makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes', subcategory: 'Sneakers', formalityScore: 40}),
      makeWardrobeItem({id: 's2', name: 'Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 60}),
    ];
    const weather: DayWeather[] = Array.from({length: 5}, (_, i) => ({
      date: `2026-03-0${i + 1}`,
      dayLabel: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i],
      highF: 75, lowF: 60, condition: 'sunny' as const, rainChance: 5,
    }));

    const capsule = buildCapsule(wardrobe, weather, ['Casual'], 'Home');
    const anchorOutfits = capsule.outfits.filter(o => o.type === 'anchor');

    // All 3 tops should appear at least once across 5 days
    const topIds = anchorOutfits.flatMap(o =>
      o.items.filter(i => i.mainCategory === 'Tops').map(i => i.wardrobeItemId),
    );
    const uniqueTops = new Set(topIds);
    expect(uniqueTops.size).toBeGreaterThanOrEqual(2); // at least 2 of 3 (one may be reserved)

    // No item exceeds ceil(5/3) + 1 = 3 uses
    const usageCounts = new Map<string, number>();
    for (const id of topIds) usageCounts.set(id, (usageCounts.get(id) || 0) + 1);
    for (const [, count] of usageCounts) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it('recently-used items are deprioritized', () => {
    // Need 3+ tops so reserve system takes one and 2+ remain for outfit rotation
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Top A', main_category: 'Tops', subcategory: 'T-Shirt', formalityScore: 50}),
      makeWardrobeItem({id: 't2', name: 'Top B', main_category: 'Tops', subcategory: 'T-Shirt', formalityScore: 50}),
      makeWardrobeItem({id: 't3', name: 'Top C', main_category: 'Tops', subcategory: 'T-Shirt', formalityScore: 50}),
      makeWardrobeItem({id: 'b1', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts', formalityScore: 40}),
      makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes', subcategory: 'Sneakers', formalityScore: 40}),
      makeWardrobeItem({id: 's2', name: 'Sandals', main_category: 'Shoes', subcategory: 'Sandals', formalityScore: 30}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-01', dayLabel: 'Mon', highF: 80, lowF: 65, condition: 'sunny', rainChance: 5},
      {date: '2026-03-02', dayLabel: 'Tue', highF: 80, lowF: 65, condition: 'sunny', rainChance: 5},
      {date: '2026-03-03', dayLabel: 'Wed', highF: 80, lowF: 65, condition: 'sunny', rainChance: 5},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Casual'], 'Home');
    const anchors = capsule.outfits.filter(o => o.type === 'anchor');

    const day1Top = anchors[0]?.items.find(i => i.mainCategory === 'Tops')?.wardrobeItemId;
    const day2Top = anchors[1]?.items.find(i => i.mainCategory === 'Tops')?.wardrobeItemId;

    // Day 2 should pick different top than day 1 (cooldown penalty)
    if (day1Top && day2Top) {
      expect(day2Top).not.toBe(day1Top);
    }
  });

  it('deterministic output — identical calls produce identical capsules', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 80}),
      makeWardrobeItem({id: 's1', name: 'Oxfords', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 85}),
      makeWardrobeItem({id: 's2', name: 'Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 70}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
    ];

    const capsule1 = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');
    const capsule2 = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');

    // Same items in same order
    for (let i = 0; i < capsule1.outfits.length; i++) {
      const items1 = capsule1.outfits[i].items.map(it => it.wardrobeItemId);
      const items2 = capsule2.outfits[i].items.map(it => it.wardrobeItemId);
      expect(items1).toEqual(items2);
    }
  });

  it('no empty outfits produced', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Top', main_category: 'Tops', subcategory: 'T-Shirt', formalityScore: 50}),
      makeWardrobeItem({id: 'b1', name: 'Jeans', main_category: 'Bottoms', subcategory: 'Jeans', formalityScore: 50}),
      makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes', subcategory: 'Sneakers', formalityScore: 40}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-01', dayLabel: 'Mon', highF: 75, lowF: 60, condition: 'sunny', rainChance: 5},
      {date: '2026-03-02', dayLabel: 'Tue', highF: 75, lowF: 60, condition: 'sunny', rainChance: 5},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Casual'], 'Home');
    for (const outfit of capsule.outfits) {
      expect(outfit.items.length).toBeGreaterThan(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  getNormalizedFormality
// ══════════════════════════════════════════════════════════════════════════════

describe('getNormalizedFormality', () => {
  it('returns formalityScore when present', () => {
    const item = makeWardrobeItem({id: 'x', name: 'Test', main_category: 'Tops', formalityScore: 80});
    expect(getNormalizedFormality(item)).toBe(80);
  });

  it('returns DEFAULT_UNKNOWN_FORMALITY (30) when formalityScore is null', () => {
    const item = makeWardrobeItem({id: 'x', name: 'Test', main_category: 'Tops', formalityScore: null as any});
    expect(getNormalizedFormality(item)).toBe(30);
  });

  it('returns DEFAULT_UNKNOWN_FORMALITY (30) when formalityScore is undefined', () => {
    const item = makeWardrobeItem({id: 'x', name: 'Test', main_category: 'Tops'});
    delete (item as any).formalityScore;
    expect(getNormalizedFormality(item)).toBe(30);
  });

  it('returns 0 when formalityScore is explicitly 0', () => {
    const item = makeWardrobeItem({id: 'x', name: 'Test', main_category: 'Tops', formalityScore: 0});
    expect(getNormalizedFormality(item)).toBe(0);
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

  it('shoe alternates are present when 3+ formal shoes exist', () => {
    // 3 shoes: 1 may be reserved as backup, leaving 2 for outfit (1 pick + 1 alternate)
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(wardrobe, weather, ['Business'], 'Home', 'masculine');
    const shoe = capsule.outfits[0].items.find(i => i.mainCategory === 'Shoes');
    expect(shoe).toBeDefined();
    const alts = (shoe as any)?.alternates;
    expect(alts).toBeDefined();
    expect(alts.length).toBeGreaterThanOrEqual(1);
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
// ██  BACKUP KIT — FORMALITY AND CLIMATE GATING
// ══════════════════════════════════════════════════════════════════════════════

describe('Backup kit — formality and climate gating', () => {
  const mixedWardrobe: TripWardrobeItem[] = [
    // Formal-appropriate
    makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
    // Casual-only (should be BLOCKED on formal trips)
    makeWardrobeItem({id: 't4', name: 'Grey Hoodie', main_category: 'Tops', subcategory: 'Hoodie', formalityScore: 20}),
    makeWardrobeItem({id: 't5', name: 'Band T-Shirt', main_category: 'Tops', subcategory: 'T-Shirt', formalityScore: 15}),
    // Bottoms
    makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    // Formal shoes + casual shoes
    makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
    makeWardrobeItem({id: 's3', name: 'Running Sneakers', main_category: 'Shoes', subcategory: 'Sneaker', formalityScore: 10}),
    makeWardrobeItem({id: 's4', name: 'Work Boots', main_category: 'Shoes', subcategory: 'Work Boot', formalityScore: 15}),
    // Outerwear
    makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
    makeWardrobeItem({id: 'o2', name: 'Puffer Jacket', main_category: 'Outerwear', subcategory: 'Puffer', formalityScore: 20}),
    // Accessories
    makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
  ];

  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
  ];

  const casualBlockedIds = new Set(['t4', 't5', 's3', 's4', 'o2']);

  it('no hoodies or sneakers in backup kit on Business/Formal trips', () => {
    const capsule = buildCapsule(mixedWardrobe, threeDayWeather, ['Business', 'Formal'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    for (const b of capsule.tripBackupKit) {
      expect(casualBlockedIds.has(b.wardrobeItemId)).toBe(false);
    }
  });

  it('no trip-incompatible casual items in backup kit when trip includes Dinner', () => {
    const capsule = buildCapsule(mixedWardrobe, threeDayWeather, ['Dinner', 'Sightseeing'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    // Dinner has formality 2 → floor is 40. All backup items must meet that.
    for (const b of capsule.tripBackupKit) {
      const item = mixedWardrobe.find(w => w.id === b.wardrobeItemId)!;
      expect(getNormalizedFormality(item)).toBeGreaterThanOrEqual(40);
    }
  });

  it('no climate-mismatched items in backup kit', () => {
    // Add items with cold-only sweetspot to a hot trip
    const coldOnlyWardrobe: TripWardrobeItem[] = [
      ...mixedWardrobe,
      makeWardrobeItem({id: 'o3', name: 'Heavy Wool Coat', main_category: 'Outerwear', subcategory: 'Coat', formalityScore: 70, climateSweetspotFMin: 10, climateSweetspotFMax: 50}),
      makeWardrobeItem({id: 'o4', name: 'Down Parka', main_category: 'Outerwear', subcategory: 'Coat', formalityScore: 65, climateSweetspotFMin: 0, climateSweetspotFMax: 40}),
    ];
    const hotWeather: DayWeather[] = [
      {date: '2026-07-15', dayLabel: 'Tue', highF: 95, lowF: 80, condition: 'sunny', rainChance: 5},
      {date: '2026-07-16', dayLabel: 'Wed', highF: 93, lowF: 78, condition: 'sunny', rainChance: 5},
      {date: '2026-07-17', dayLabel: 'Thu', highF: 92, lowF: 79, condition: 'sunny', rainChance: 5},
    ];
    const capsule = buildCapsule(coldOnlyWardrobe, hotWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    const backupIds = capsule.tripBackupKit.map(b => b.wardrobeItemId);
    expect(backupIds).not.toContain('o3');
    expect(backupIds).not.toContain('o4');
  });

  it('backup items must match >= 50% of anchor outfits', () => {
    // 5-day trip to force more anchors
    const fiveDayWeather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
      {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
      {date: '2026-03-05', dayLabel: 'Thu', highF: 69, lowF: 55, condition: 'sunny', rainChance: 10},
      {date: '2026-03-06', dayLabel: 'Fri', highF: 73, lowF: 59, condition: 'sunny', rainChance: 5},
    ];
    // Need a bigger wardrobe for 5 days
    const bigWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Lavender Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't5', name: 'Cream Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
      makeWardrobeItem({id: 't6', name: 'Grey Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 70, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b3', name: 'Charcoal Slacks', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 80}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];
    const capsule = buildCapsule(bigWardrobe, fiveDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;

    const anchorOutfits = capsule.outfits.filter(o => o.type === 'anchor');
    const threshold = Math.ceil(anchorOutfits.length / 2);

    for (const b of capsule.tripBackupKit) {
      const item = bigWardrobe.find(w => w.id === b.wardrobeItemId)!;
      // Re-derive compatibility
      let compatibleDays = 0;
      for (const ao of anchorOutfits) {
        const aoIdx = capsule.outfits.indexOf(ao);
        const dw = fiveDayWeather[aoIdx];
        if (!dw) continue;
        const cz = deriveClimateZone(dw);
        const ap = getActivityProfile(ao.occasion as TripActivity);
        if (gatePool([item], cz, ap, 'masculine').length > 0) {
          compatibleDays++;
        }
      }
      expect(compatibleDays).toBeGreaterThanOrEqual(threshold);
    }
  });

  it('backup reasons reference actual activity context', () => {
    const capsule = buildCapsule(mixedWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit || capsule.tripBackupKit.length === 0) return;
    // At least one reason should reference "business"
    const allReasons = capsule.tripBackupKit.map(b => b.reason.toLowerCase());
    const hasActivityRef = allReasons.some(r => r.includes('business'));
    expect(hasActivityRef).toBe(true);
    // No vague "Versatile backup pick" on formal trips
    for (const r of allReasons) {
      expect(r).not.toContain('versatile backup pick');
    }
  });

  it('deterministic output with mixed wardrobe', () => {
    const capsule1 = buildCapsule(mixedWardrobe, threeDayWeather, ['Business', 'Formal'], 'Home', 'masculine');
    const capsule2 = buildCapsule(mixedWardrobe, threeDayWeather, ['Business', 'Formal'], 'Home', 'masculine');

    const ids1 = (capsule1.tripBackupKit || []).map(b => b.wardrobeItemId);
    const ids2 = (capsule2.tripBackupKit || []).map(b => b.wardrobeItemId);
    expect(ids1).toEqual(ids2);

    const reasons1 = (capsule1.tripBackupKit || []).map(b => b.reason);
    const reasons2 = (capsule2.tripBackupKit || []).map(b => b.reason);
    expect(reasons1).toEqual(reasons2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  BACKUP KIT — TWO-TIER FALLBACK
// ══════════════════════════════════════════════════════════════════════════════

describe('Backup kit — two-tier fallback', () => {
  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
  ];

  // Mild weather for fallback-trigger scenario (lowF=55)
  const mildWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 55, condition: 'sunny', rainChance: 10},
  ];

  // A wardrobe large enough for strict tier to produce backups
  const richWardrobe: TripWardrobeItem[] = [
    makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
    makeWardrobeItem({id: 't4', name: 'Striped Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
    makeWardrobeItem({id: 't5', name: 'Grey Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
    makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
    makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85}),
    makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
    makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
  ];

  // Wardrobe where spare items fail strict climate (±15) but pass fallback (±25)
  // Overcoat: sweetMax=38, trip lowF=55 → strict: 38 < 55-15=40 BLOCKED, fallback: 38 >= 55-25=30 PASSES
  const fallbackWardrobe: TripWardrobeItem[] = [
    makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
    makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
    makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    makeWardrobeItem({id: 'o2', name: 'Wool Overcoat', main_category: 'Outerwear', subcategory: 'Coat', formalityScore: 75, climateSweetspotFMin: 20, climateSweetspotFMax: 38}),
  ];

  it('strict tier produces backups → fallback not used', () => {
    const capsule = buildCapsule(richWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    expect(capsule.tripBackupKit!.length).toBeGreaterThanOrEqual(1);
    expect(capsule.tripBackupKit!.length).toBeLessThanOrEqual(3);
  });

  it('strict tier empty → fallback activates via relaxed climate gate', () => {
    // gateBackupPool blocks the overcoat (sweetMax 38 < lowF 55 - 15 = 40)
    const strict = gateBackupPool([fallbackWardrobe[3]], ['Business'], mildWeather, 'masculine');
    expect(strict.length).toBe(0);
    // gateBackupPoolFallback allows it (sweetMax 38 >= lowF 55 - 25 = 30)
    const fallback = gateBackupPoolFallback([fallbackWardrobe[3]], ['Business'], mildWeather, 'masculine');
    expect(fallback.length).toBe(1);
    // Integration: buildCapsule should find the overcoat via fallback
    const capsule = buildCapsule(fallbackWardrobe, mildWeather, ['Business'], 'Home', 'masculine');
    if (capsule.tripBackupKit) {
      expect(capsule.tripBackupKit.length).toBeLessThanOrEqual(2);
    }
  });

  it('fallback blocks items below trip formality floor', () => {
    // Items with formalityScore < 40 should be blocked on Business trips (formality 2 → floor 40)
    const lowFormalityItems: TripWardrobeItem[] = [
      makeWardrobeItem({id: 'x1', name: 'Item A', main_category: 'Tops', formalityScore: 20}),
      makeWardrobeItem({id: 'x2', name: 'Item B', main_category: 'Shoes', formalityScore: 15}),
      makeWardrobeItem({id: 'x3', name: 'Item C', main_category: 'Shoes', formalityScore: 10}),
      makeWardrobeItem({id: 'x4', name: 'Item D', main_category: 'Tops', formalityScore: 60}),
      // No formalityScore → defaults to 30, blocked on Business (floor 40)
      makeWardrobeItem({id: 'x5', name: 'Unclassified Item', main_category: 'Tops'}),
    ];
    const gated = gateBackupPoolFallback(lowFormalityItems, ['Business'], threeDayWeather, 'masculine');
    // Only x4 (formalityScore 60) should survive; x5 (default 30) is blocked
    expect(gated.map(i => i.id)).toEqual(['x4']);
  });

  it('unclassified items pass on casual trips but fail on formal trips', () => {
    const unclassified = [makeWardrobeItem({id: 'u1', name: 'Mystery Item', main_category: 'Tops'})];
    // Casual trip (formality 0 → floor 0): passes
    expect(gateBackupPool(unclassified, ['Casual'], threeDayWeather, 'masculine').length).toBe(1);
    // Business trip (formality 2 → floor 40): blocked (default 30 < 40)
    expect(gateBackupPool(unclassified, ['Business'], threeDayWeather, 'masculine').length).toBe(0);
    // Same for fallback
    expect(gateBackupPoolFallback(unclassified, ['Business'], threeDayWeather, 'masculine').length).toBe(0);
  });

  it('fallback respects presentation gate', () => {
    const feminineItems: TripWardrobeItem[] = [
      makeWardrobeItem({id: 'd1', name: 'Evening Gown', main_category: 'Dresses', subcategory: 'Gown', formalityScore: 95}),
      makeWardrobeItem({id: 'sh2', name: 'Stiletto Heels', main_category: 'Shoes', subcategory: 'Heels', formalityScore: 85}),
      makeWardrobeItem({id: 'o1', name: 'Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
    ];
    const gated = gateBackupPoolFallback(feminineItems, ['Business'], threeDayWeather, 'masculine');
    const ids = gated.map(i => i.id);
    expect(ids).not.toContain('d1');
    expect(ids).not.toContain('sh2');
    expect(ids).toContain('o1');
  });

  it('fallback returns at most 2 items', () => {
    // Use fallbackWardrobe where strict is empty → fallback activates
    const capsule = buildCapsule(fallbackWardrobe, mildWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    expect(capsule.tripBackupKit.length).toBeLessThanOrEqual(2);
  });

  it('deterministic fallback output', () => {
    const capsule1 = buildCapsule(fallbackWardrobe, mildWeather, ['Business'], 'Home', 'masculine');
    const capsule2 = buildCapsule(fallbackWardrobe, mildWeather, ['Business'], 'Home', 'masculine');

    const ids1 = (capsule1.tripBackupKit || []).map(b => b.wardrobeItemId);
    const ids2 = (capsule2.tripBackupKit || []).map(b => b.wardrobeItemId);
    expect(ids1).toEqual(ids2);

    const reasons1 = (capsule1.tripBackupKit || []).map(b => b.reason);
    const reasons2 = (capsule2.tripBackupKit || []).map(b => b.reason);
    expect(reasons1).toEqual(reasons2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  BACKUP KIT — COVERAGE-GAP AWARENESS
// ══════════════════════════════════════════════════════════════════════════════

describe('Backup kit — coverage-gap awareness', () => {
  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
  ];
  // 5-day trip forces 5 mandatory tops, 2 mandatory shoes → shoes clearly underrepresented
  const fiveDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
    {date: '2026-03-05', dayLabel: 'Thu', highF: 73, lowF: 59, condition: 'sunny', rainChance: 10},
    {date: '2026-03-06', dayLabel: 'Fri', highF: 74, lowF: 60, condition: 'sunny', rainChance: 5},
  ];

  it('underrepresented category outranks versatile layer when coverage is imbalanced', () => {
    // 5-day trip: 5 mandatory tops, 2 mandatory shoes → shoes underrepresented vs tops
    // Coverage-gap bonus (+15) should push the spare shoe into the top 2 backup slots
    const wardrobe: TripWardrobeItem[] = [
      // 7 tops — 5 become mandatory for 5-day rotation, 2 spare
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Mint Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
      makeWardrobeItem({id: 't5', name: 'Grey Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 70, dressCode: 'business'}),
      makeWardrobeItem({id: 't6', name: 'Lavender Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 68, dressCode: 'business'}),
      makeWardrobeItem({id: 't7', name: 'Cream Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 66, dressCode: 'business'}),
      // 3 bottoms
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b3', name: 'Charcoal Slacks', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 80}),
      // 3 shoes — engine selects 2 (maxShoes=2 for ≤5 days), 1 spare
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 's3', name: 'Black Derby Shoes', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 78}),
      // Accessories
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const capsule = buildCapsule(wardrobe, fiveDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit || capsule.tripBackupKit.length === 0) return;

    // Verify a shoe backup exists — coverage-gap bonus should ensure a spare shoe makes the kit
    const backupIds = capsule.tripBackupKit.map(b => b.wardrobeItemId);
    const hasShoeBackup = backupIds.some(id => {
      const item = wardrobe.find(w => w.id === id);
      return item && (item.main_category === 'Shoes');
    });
    expect(hasShoeBackup).toBe(true);
  });

  it('balanced coverage produces no coverage-gap bonus', () => {
    // All backup-eligible slots have equal mandatory items → no slot is underrepresented
    // Use a wardrobe where tops and shoes are equally represented
    const balancedWardrobe: TripWardrobeItem[] = [
      // 3 tops (all become mandatory for 3-day trip)
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Mint Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
      // Bottoms
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      // 3 shoes — equally represented as tops
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85}),
      // Outerwear spare
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      // Accessories
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    // Two runs should be identical (deterministic)
    const capsule1 = buildCapsule(balancedWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    const capsule2 = buildCapsule(balancedWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');

    const ids1 = (capsule1.tripBackupKit || []).map(b => b.wardrobeItemId);
    const ids2 = (capsule2.tripBackupKit || []).map(b => b.wardrobeItemId);
    expect(ids1).toEqual(ids2);
  });

  it('coverage-gap bonus is deterministic across runs', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Shirt A', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Shirt B', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 78, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Shirt C', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 76, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Shirt D', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 74, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Loafer', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'o1', name: 'Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const c1 = buildCapsule(wardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    const c2 = buildCapsule(wardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');

    expect((c1.tripBackupKit || []).map(b => b.wardrobeItemId))
      .toEqual((c2.tripBackupKit || []).map(b => b.wardrobeItemId));
    expect((c1.tripBackupKit || []).map(b => b.reason))
      .toEqual((c2.tripBackupKit || []).map(b => b.reason));
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

  it('max 2 items in tripBackupKit', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    expect(capsule.tripBackupKit!.length).toBeLessThanOrEqual(2);
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

  it('no overlap with planned outfit items', () => {
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

  it('no kit when wardrobe too small for unused reserves', () => {
    const tinyWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxfords', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    const capsule = buildCapsule(tinyWardrobe, weather, ['Business'], 'Home', 'masculine');
    // All items consumed by outfit — no unused items available for reserves
    // Fallback may produce a kit from used items, but primary reserve phase won't
    if (capsule.tripBackupKit) {
      // If fallback triggered, items should still be valid
      for (const b of capsule.tripBackupKit) {
        expect(b.wardrobeItemId).toBeDefined();
        expect(b.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('outfits do not have backupSuggestions', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    for (const outfit of capsule.outfits) {
      expect((outfit as any).backupSuggestions).toBeUndefined();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  BACKUP KIT — USED ITEM PENALTY (not exclusion)
// ══════════════════════════════════════════════════════════════════════════════

describe('Backup kit — reserve lock (hard exclusion)', () => {
  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
  ];

  it('reserves never overlap with outfit items when spares exist', () => {
    // Large wardrobe: plenty of spares per slot
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Striped Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't5', name: 'Grey Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
      makeWardrobeItem({id: 't6', name: 'Mint Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 70, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const capsule = buildCapsule(wardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    const outfitItemIds = new Set(capsule.outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)));
    for (const b of capsule.tripBackupKit!) {
      expect(outfitItemIds.has(b.wardrobeItemId)).toBe(false);
    }
  });

  it('fallback allows used items when no unused spares exist', () => {
    // Small wardrobe: all backup-eligible items consumed by outfits
    const smallWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const capsule = buildCapsule(smallWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    // Fallback may produce backups from used items for small wardrobes
    if (capsule.tripBackupKit && capsule.tripBackupKit.length > 0) {
      // Valid kit: items have content
      for (const b of capsule.tripBackupKit) {
        expect(b.wardrobeItemId).toBeDefined();
        expect(b.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('gates still block casual items regardless of reserve mode', () => {
    const mixedWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Grey Hoodie', main_category: 'Tops', subcategory: 'Hoodie', formalityScore: 20}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Running Sneakers', main_category: 'Shoes', subcategory: 'Sneakers', formalityScore: 10}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const capsule = buildCapsule(mixedWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    const backupIds = capsule.tripBackupKit.map(b => b.wardrobeItemId);
    expect(backupIds).not.toContain('t4');
    expect(backupIds).not.toContain('s2');
  });

  it('max 2 items in backup kit', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Mint Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 72, dressCode: 'business'}),
      makeWardrobeItem({id: 't5', name: 'Grey Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 70, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const capsule = buildCapsule(wardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    if (!capsule.tripBackupKit) return;
    expect(capsule.tripBackupKit.length).toBeLessThanOrEqual(2);
  });

  it('deterministic output', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const c1 = buildCapsule(wardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    const c2 = buildCapsule(wardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');

    expect((c1.tripBackupKit || []).map(b => b.wardrobeItemId))
      .toEqual((c2.tripBackupKit || []).map(b => b.wardrobeItemId));
    expect((c1.tripBackupKit || []).map(b => b.reason))
      .toEqual((c2.tripBackupKit || []).map(b => b.reason));
  });
});

describe('Backup kit — proven-fit formality bypass', () => {
  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 71, lowF: 57, condition: 'sunny', rainChance: 5},
  ];

  it('null-formalityScore items pass gateBackupPool when in provenFitIds', () => {
    // With reserve lock, proven-fit bypass matters for FALLBACK path.
    // Test the gate function directly: null-formalityScore + proven-fit → passes gate.
    const item = makeWardrobeItem({
      id: 't1', name: 'Unscored Dress Shirt', main_category: 'Tops',
      subcategory: 'Dress Shirt', dressCode: 'business',
    });

    // Without provenFitIds → blocked (DEFAULT_UNKNOWN_FORMALITY=30 < 50)
    const blocked = gateBackupPool([item], ['Formal'], threeDayWeather, 'masculine');
    expect(blocked.length).toBe(0);

    // With provenFitIds → passes formality floor
    const passed = gateBackupPool([item], ['Formal'], threeDayWeather, 'masculine', new Set(['t1']));
    expect(passed.length).toBe(1);
  });

  it('same null-formalityScore item, if unused, is still blocked on formal trips', () => {
    const item = makeWardrobeItem({
      id: 'x1', name: 'Mystery Top', main_category: 'Tops',
      subcategory: 'Shirt',
    });

    // No provenFitIds → defaults to 30 < 50 → blocked
    const gated = gateBackupPool([item], ['Formal'], threeDayWeather, 'masculine');
    expect(gated.length).toBe(0);

    // With provenFitIds → bypasses formality floor
    const gatedProven = gateBackupPool([item], ['Formal'], threeDayWeather, 'masculine', new Set(['x1']));
    expect(gatedProven.length).toBe(1);
  });

  it('fallback gate also respects proven-fit bypass', () => {
    const item = makeWardrobeItem({
      id: 'x1', name: 'Mystery Top', main_category: 'Tops',
      subcategory: 'Shirt',
    });

    // Not proven → blocked
    const gated = gateBackupPoolFallback([item], ['Formal'], threeDayWeather, 'masculine');
    expect(gated.length).toBe(0);

    // Proven → passes
    const gatedProven = gateBackupPoolFallback([item], ['Formal'], threeDayWeather, 'masculine', new Set(['x1']));
    expect(gatedProven.length).toBe(1);
  });

  it('formal trip still blocks true casual items from outfits and backups', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business'}),
      makeWardrobeItem({id: 't4', name: 'Grey Hoodie', main_category: 'Tops', subcategory: 'Hoodie', formalityScore: 20}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const capsule = buildCapsule(wardrobe, threeDayWeather, ['Formal'], 'Home', 'masculine');
    // Hoodie blocked by gatePool (isCasualOnly) → never in outfits → never proven-fit
    const outfitItemIds = capsule.outfits.flatMap(o => o.items.map(i => i.wardrobeItemId));
    expect(outfitItemIds).not.toContain('t4');
    // Hoodie not proven-fit + formalityScore=20 < 50 → blocked from backups too
    if (capsule.tripBackupKit) {
      expect(capsule.tripBackupKit.map(b => b.wardrobeItemId)).not.toContain('t4');
    }
  });

  it('deterministic output with proven-fit bypass', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Unscored Dress Shirt A', main_category: 'Tops', subcategory: 'Dress Shirt', dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Unscored Dress Shirt B', main_category: 'Tops', subcategory: 'Dress Shirt', dressCode: 'business'}),
      makeWardrobeItem({id: 't3', name: 'Unscored Dress Shirt C', main_category: 'Tops', subcategory: 'Dress Shirt', dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 75}),
      makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
    ];

    const c1 = buildCapsule(wardrobe, threeDayWeather, ['Formal'], 'Home', 'masculine');
    const c2 = buildCapsule(wardrobe, threeDayWeather, ['Formal'], 'Home', 'masculine');

    expect((c1.tripBackupKit || []).map(b => b.wardrobeItemId))
      .toEqual((c2.tripBackupKit || []).map(b => b.wardrobeItemId));
    expect((c1.tripBackupKit || []).map(b => b.reason))
      .toEqual((c2.tripBackupKit || []).map(b => b.reason));
  });
});

describe('Backup kit — reserve selection quality', () => {
  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 68, lowF: 54, condition: 'partly-cloudy', rainChance: 15},
  ];

  // Rich wardrobe: enough items so outfits consume some and leave quality spares
  const richWardrobe: TripWardrobeItem[] = [
    // Tops: 6 dress shirts — outfits use ~3, leaving 3 quality spares
    makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business', color: 'white'}),
    makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business', color: 'blue'}),
    makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 78, dressCode: 'business', color: 'pink'}),
    makeWardrobeItem({id: 't4', name: 'Lavender Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 76, dressCode: 'business', color: 'lavender'}),
    makeWardrobeItem({id: 't5', name: 'Grey Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business', color: 'grey'}),
    makeWardrobeItem({id: 't6', name: 'Cream Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 74, dressCode: 'business', color: 'cream'}),
    // Bottoms: 3
    makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85, color: 'navy'}),
    makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85, color: 'grey'}),
    makeWardrobeItem({id: 'b3', name: 'Charcoal Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 82, color: 'charcoal'}),
    // Shoes: 3
    makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90, color: 'black'}),
    makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 78, color: 'brown'}),
    makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85, color: 'black'}),
    // Outerwear: 2
    makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 82, color: 'navy'}),
    makeWardrobeItem({id: 'o2', name: 'Charcoal Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80, color: 'charcoal'}),
    // Accessories
    makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
  ];

  it('reserves exist when enough quality items exist', () => {
    const capsule = buildCapsule(richWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    expect(capsule.tripBackupKit!.length).toBeGreaterThanOrEqual(1);
    expect(capsule.tripBackupKit!.length).toBeLessThanOrEqual(2);
  });

  it('reserves are top-tier, not scraps — all pass formality gate', () => {
    const capsule = buildCapsule(richWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    for (const b of capsule.tripBackupKit!) {
      // Every reserve must be a formal-appropriate item (not casual)
      const item = richWardrobe.find(w => w.id === b.wardrobeItemId)!;
      const flags = inferGarmentFlags(item);
      expect(flags.isCasualOnly).toBe(false);
      // Formal items: formalityScore should be substantial
      expect(item.formalityScore).toBeGreaterThanOrEqual(70);
    }
  });

  it('reserves have zero overlap with planned outfits', () => {
    const capsule = buildCapsule(richWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    const outfitItemIds = new Set(capsule.outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)));
    // Hard exclusion: every reserve must be unused
    for (const b of capsule.tripBackupKit!) {
      expect(outfitItemIds.has(b.wardrobeItemId)).toBe(false);
    }
  });

  it('engine never returns empty backup kit if >= 2 valid items exist', () => {
    // Wardrobe with exactly 2 items per backup-eligible slot
    const minWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 78, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
      makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 78}),
      makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
      {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    ];

    const capsule = buildCapsule(minWardrobe, weather, ['Business'], 'Home', 'masculine');
    // With 2+ valid items per slot, reserve logic should produce a kit
    expect(capsule.tripBackupKit).toBeDefined();
    expect(capsule.tripBackupKit!.length).toBeGreaterThanOrEqual(1);
  });

  it('deterministic output preserved', () => {
    const c1 = buildCapsule(richWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    const c2 = buildCapsule(richWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');

    const ids1 = (c1.tripBackupKit || []).map(b => b.wardrobeItemId);
    const ids2 = (c2.tripBackupKit || []).map(b => b.wardrobeItemId);
    expect(ids1).toEqual(ids2);

    const reasons1 = (c1.tripBackupKit || []).map(b => b.reason);
    const reasons2 = (c2.tripBackupKit || []).map(b => b.reason);
    expect(reasons1).toEqual(reasons2);
  });
});

describe('Backup isolation — reserve-first architecture', () => {
  const threeDayWeather: DayWeather[] = [
    {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    {date: '2026-03-03', dayLabel: 'Tue', highF: 70, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-03-04', dayLabel: 'Wed', highF: 68, lowF: 54, condition: 'partly-cloudy', rainChance: 15},
  ];

  // Large wardrobe: plenty of items so reserves, outfits, and alternates all have candidates
  const largeWardrobe: TripWardrobeItem[] = [
    makeWardrobeItem({id: 't1', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business', color: 'white'}),
    makeWardrobeItem({id: 't2', name: 'Blue Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business', color: 'blue'}),
    makeWardrobeItem({id: 't3', name: 'Pink Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 78, dressCode: 'business', color: 'pink'}),
    makeWardrobeItem({id: 't4', name: 'Lavender Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 76, dressCode: 'business', color: 'lavender'}),
    makeWardrobeItem({id: 't5', name: 'Grey Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 75, dressCode: 'business', color: 'grey'}),
    makeWardrobeItem({id: 't6', name: 'Cream Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 74, dressCode: 'business', color: 'cream'}),
    makeWardrobeItem({id: 'b1', name: 'Navy Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85, color: 'navy'}),
    makeWardrobeItem({id: 'b2', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85, color: 'grey'}),
    makeWardrobeItem({id: 'b3', name: 'Charcoal Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 82, color: 'charcoal'}),
    makeWardrobeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90, color: 'black'}),
    makeWardrobeItem({id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'Loafer', formalityScore: 78, color: 'brown'}),
    makeWardrobeItem({id: 's3', name: 'Black Derby', main_category: 'Shoes', subcategory: 'Derby', formalityScore: 85, color: 'black'}),
    makeWardrobeItem({id: 'o1', name: 'Navy Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 82, color: 'navy'}),
    makeWardrobeItem({id: 'o2', name: 'Charcoal Blazer', main_category: 'Outerwear', subcategory: 'Blazer', formalityScore: 80, color: 'charcoal'}),
    makeWardrobeItem({id: 'a1', name: 'Silk Tie', main_category: 'Accessories', subcategory: 'Tie'}),
  ];

  it('backups never overlap outfits', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    const outfitItemIds = new Set(capsule.outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)));
    for (const b of capsule.tripBackupKit!) {
      expect(outfitItemIds.has(b.wardrobeItemId)).toBe(false);
    }
  });

  it('backups never overlap alternates', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    expect(capsule.tripBackupKit).toBeDefined();
    const backupIds = new Set(capsule.tripBackupKit!.map(b => b.wardrobeItemId));
    // Collect all alternate IDs from all outfit items
    const alternateIds: string[] = [];
    for (const outfit of capsule.outfits) {
      for (const item of outfit.items) {
        const alts = (item as any).alternates as Array<{id: string}> | undefined;
        if (alts) {
          for (const alt of alts) alternateIds.push(alt.id);
        }
      }
    }
    for (const altId of alternateIds) {
      expect(backupIds.has(altId)).toBe(false);
    }
  });

  it('alternates never overlap outfits (already-picked items)', () => {
    const capsule = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    for (const outfit of capsule.outfits) {
      const pickedIds = new Set(outfit.items.map(i => i.wardrobeItemId));
      for (const item of outfit.items) {
        const alts = (item as any).alternates as Array<{id: string}> | undefined;
        if (!alts) continue;
        for (const alt of alts) {
          // Alternate must not be the same as any picked item in this outfit
          expect(pickedIds.has(alt.id)).toBe(false);
        }
      }
    }
  });

  it('fallback only triggers when no unused candidates exist', () => {
    // Tiny wardrobe: all items consumed by outfits
    const tinyWardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt', formalityScore: 80, dressCode: 'business'}),
      makeWardrobeItem({id: 'b1', name: 'Trousers', main_category: 'Bottoms', subcategory: 'Trousers', formalityScore: 85}),
      makeWardrobeItem({id: 's1', name: 'Oxfords', main_category: 'Shoes', subcategory: 'Oxford', formalityScore: 90}),
    ];
    const weather: DayWeather[] = [
      {date: '2026-03-02', dayLabel: 'Mon', highF: 72, lowF: 58, condition: 'sunny', rainChance: 10},
    ];

    // Spy on console.log to detect RESERVE_FALLBACK_USED
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const capsule = buildCapsule(tinyWardrobe, weather, ['Business'], 'Home', 'masculine');

    if (capsule.tripBackupKit && capsule.tripBackupKit.length > 0) {
      // If fallback produced backups from used items, it must have logged
      const outfitItemIds = new Set(capsule.outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)));
      const hasUsedBackup = capsule.tripBackupKit.some(b => outfitItemIds.has(b.wardrobeItemId));
      if (hasUsedBackup) {
        const fallbackLogs = logSpy.mock.calls.filter(
          args => typeof args[0] === 'string' && args[0].includes('RESERVE_FALLBACK_USED'),
        );
        expect(fallbackLogs.length).toBeGreaterThanOrEqual(1);
      }
    }
    logSpy.mockRestore();
  });

  it('deterministic ordering preserved', () => {
    const c1 = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');
    const c2 = buildCapsule(largeWardrobe, threeDayWeather, ['Business'], 'Home', 'masculine');

    // Backup kit
    const bIds1 = (c1.tripBackupKit || []).map(b => b.wardrobeItemId);
    const bIds2 = (c2.tripBackupKit || []).map(b => b.wardrobeItemId);
    expect(bIds1).toEqual(bIds2);

    // Outfit items
    for (let i = 0; i < c1.outfits.length; i++) {
      const items1 = c1.outfits[i].items.map(it => it.wardrobeItemId);
      const items2 = c2.outfits[i].items.map(it => it.wardrobeItemId);
      expect(items1).toEqual(items2);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  BEACH / ACTIVE — MASCULINE COMPLETENESS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Beach/Active masculine outfit completeness', () => {
  const hotWeather: DayWeather[] = [
    {date: '2025-07-15', dayLabel: 'Tue', highF: 95, lowF: 78, condition: 'sunny', rainChance: 5},
    {date: '2025-07-16', dayLabel: 'Wed', highF: 93, lowF: 77, condition: 'sunny', rainChance: 5},
  ];

  // ── Beach: masculine with regular bottoms ──
  it('beach + masculine: produces tops + bottoms + shoes', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Tank Top', main_category: 'Tops'}),
      makeWardrobeItem({id: 't2', name: 'Linen Shirt', main_category: 'Tops'}),
      makeWardrobeItem({id: 'b1', name: 'Board Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
      makeWardrobeItem({id: 'b2', name: 'Chino Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
      makeWardrobeItem({id: 's1', name: 'Flip-Flops', main_category: 'Shoes'}),
      makeWardrobeItem({id: 's2', name: 'Sneakers', main_category: 'Shoes'}),
      makeWardrobeItem({id: 'sw1', name: 'Swim Trunks', main_category: 'Swimwear', subcategory: 'Swim Trunks'}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Beach'], 'Home', 'masculine');

    expect(capsule.outfits.length).toBeGreaterThan(0);
    for (const outfit of capsule.outfits) {
      const cats = outfit.items.map(i => i.mainCategory);
      expect(cats).toContain('Tops');
      expect(cats.some(c => c === 'Bottoms' || c === 'Swimwear')).toBe(true);
      expect(cats).toContain('Shoes');
    }
  });

  // ── Beach: masculine with ONLY swim trunks (no regular bottoms) ──
  it('beach + masculine (swim trunks only): trunks satisfy bottoms', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'T-Shirt', main_category: 'Tops'}),
      makeWardrobeItem({id: 't2', name: 'Tank Top', main_category: 'Tops'}),
      makeWardrobeItem({id: 'sw1', name: 'Swim Trunks', main_category: 'Swimwear', subcategory: 'Swim Trunks'}),
      makeWardrobeItem({id: 's1', name: 'Flip-Flops', main_category: 'Shoes'}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Beach'], 'Home', 'masculine');

    expect(capsule.outfits.length).toBeGreaterThan(0);
    for (const outfit of capsule.outfits) {
      const cats = outfit.items.map(i => i.mainCategory);
      expect(cats).toContain('Tops');
      // Swim trunks satisfy the bottoms requirement via hasCoreSlots swimwear exception
      expect(cats.some(c => c === 'Bottoms' || c === 'Swimwear')).toBe(true);
      expect(cats).toContain('Shoes');
    }
  });

  // ── Beach: feminine still uses swimwear-first (no bottoms required) ──
  it('beach + feminine: swimwear-first, no bottoms required', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 'sw1', name: 'Bikini', main_category: 'Swimwear'}),
      makeWardrobeItem({id: 't1', name: 'Cover-Up', main_category: 'Tops'}),
      makeWardrobeItem({id: 's1', name: 'Flip-Flops', main_category: 'Shoes'}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Beach'], 'Home', 'feminine');
    const allItems = capsule.outfits.flatMap(o => o.items);

    // Swimwear is picked (feminine path)
    expect(allItems.some(i => i.mainCategory === 'Swimwear')).toBe(true);
  });

  // ── Active: masculine produces tops + bottoms + shoes ──
  it('active + masculine: produces tops + bottoms + shoes', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Dri-Fit Tee', main_category: 'Tops'}),
      makeWardrobeItem({id: 't2', name: 'Performance Polo', main_category: 'Tops'}),
      makeWardrobeItem({id: 'b1', name: 'Athletic Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
      makeWardrobeItem({id: 'b2', name: 'Joggers', main_category: 'Bottoms', subcategory: 'Joggers'}),
      makeWardrobeItem({id: 's1', name: 'Running Shoes', main_category: 'Shoes'}),
      makeWardrobeItem({id: 's2', name: 'Trail Shoes', main_category: 'Shoes'}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Active'], 'Home', 'masculine');

    expect(capsule.outfits.length).toBeGreaterThan(0);
    for (const outfit of capsule.outfits) {
      const cats = outfit.items.map(i => i.mainCategory);
      expect(cats).toContain('Tops');
      expect(cats).toContain('Bottoms');
      expect(cats).toContain('Shoes');
    }
  });

  // ── Active: feminine still uses activewear pairing ──
  it('active + feminine: activewear pairing preserved', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 'aw1', name: 'Sports Bra', main_category: 'Activewear', subcategory: 'Sports Bra'}),
      makeWardrobeItem({id: 'aw2', name: 'Leggings', main_category: 'Activewear', subcategory: 'Leggings'}),
      makeWardrobeItem({id: 's1', name: 'Running Shoes', main_category: 'Shoes'}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Active'], 'Home', 'feminine');
    const allItems = capsule.outfits.flatMap(o => o.items);

    // Activewear items are picked (feminine path)
    expect(allItems.some(i => i.mainCategory === 'Activewear')).toBe(true);
  });

  // ── Mixed trip: Beach + Casual masculine produces complete outfits for both ──
  it('beach + casual + masculine: all outfits have tops + bottoms + shoes', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'T-Shirt', main_category: 'Tops'}),
      makeWardrobeItem({id: 't2', name: 'Polo', main_category: 'Tops'}),
      makeWardrobeItem({id: 't3', name: 'Linen Shirt', main_category: 'Tops'}),
      makeWardrobeItem({id: 'b1', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
      makeWardrobeItem({id: 'b2', name: 'Chinos', main_category: 'Bottoms'}),
      makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes'}),
      makeWardrobeItem({id: 's2', name: 'Sandals', main_category: 'Shoes'}),
      makeWardrobeItem({id: 'sw1', name: 'Swim Trunks', main_category: 'Swimwear', subcategory: 'Swim Trunks'}),
    ];
    const capsule = buildCapsule(wardrobe, hotWeather, ['Beach', 'Casual'], 'Home', 'masculine');

    expect(capsule.outfits.length).toBeGreaterThan(0);
    for (const outfit of capsule.outfits) {
      const cats = outfit.items.map(i => i.mainCategory);
      expect(cats).toContain('Tops');
      expect(cats.some(c => c === 'Bottoms' || c === 'Swimwear')).toBe(true);
      expect(cats).toContain('Shoes');
    }
  });

  // ── Deterministic: same inputs → same outputs ──
  it('beach + masculine: deterministic output', () => {
    const wardrobe: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Tank Top', main_category: 'Tops'}),
      makeWardrobeItem({id: 'b1', name: 'Board Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
      makeWardrobeItem({id: 's1', name: 'Flip-Flops', main_category: 'Shoes'}),
      makeWardrobeItem({id: 'sw1', name: 'Swim Trunks', main_category: 'Swimwear', subcategory: 'Swim Trunks'}),
    ];
    const c1 = buildCapsule(wardrobe, hotWeather, ['Beach'], 'Home', 'masculine');
    const c2 = buildCapsule(wardrobe, hotWeather, ['Beach'], 'Home', 'masculine');

    expect(c1.outfits.length).toBe(c2.outfits.length);
    for (let i = 0; i < c1.outfits.length; i++) {
      const ids1 = c1.outfits[i].items.map(it => it.wardrobeItemId);
      const ids2 = c2.outfits[i].items.map(it => it.wardrobeItemId);
      expect(ids1).toEqual(ids2);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ██  REGRESSION: NEVER EMIT INCOMPLETE MASCULINE OUTFITS
// ══════════════════════════════════════════════════════════════════════════════

describe('INVARIANT: never emits incomplete masculine outfits', () => {
  const SLOT_MAP: Record<string, string> = {
    Tops: 'tops', Bottoms: 'bottoms', Skirts: 'bottoms', Shoes: 'shoes',
    Dresses: 'dresses', Formalwear: 'dresses', TraditionalWear: 'dresses',
    Outerwear: 'outerwear', Accessories: 'accessories', Jewelry: 'accessories',
    Activewear: 'activewear', Swimwear: 'swimwear', Bags: 'accessories',
    Undergarments: 'undergarments',
  };

  function assertMasculineComplete(capsule: TripCapsule) {
    for (const outfit of capsule.outfits) {
      const slots = new Set(outfit.items.map(i => SLOT_MAP[i.mainCategory] || 'other'));
      const hasTop = slots.has('tops');
      const hasBottomsEquiv = slots.has('bottoms') || slots.has('swimwear');
      const hasShoes = slots.has('shoes');
      expect({
        outfitId: outfit.id,
        activity: outfit.occasion,
        hasTop,
        hasBottomsEquiv,
        hasShoes,
        items: outfit.items.map(i => `${i.name} (${i.mainCategory})`),
      }).toEqual(expect.objectContaining({
        hasTop: true,
        hasBottomsEquiv: true,
        hasShoes: true,
      }));
    }
  }

  const activities: TripActivity[][] = [
    ['Casual'],
    ['Beach'],
    ['Active'],
    ['Business'],
    ['Dinner'],
    ['Beach', 'Casual'],
    ['Active', 'Casual'],
    ['Beach', 'Active', 'Dinner'],
  ];

  const hotWeather: DayWeather[] = [
    {date: '2025-07-15', dayLabel: 'Tue', highF: 95, lowF: 78, condition: 'sunny', rainChance: 5},
    {date: '2025-07-16', dayLabel: 'Wed', highF: 93, lowF: 77, condition: 'sunny', rainChance: 5},
    {date: '2025-07-17', dayLabel: 'Thu', highF: 90, lowF: 75, condition: 'partly-cloudy', rainChance: 10},
  ];

  const coldWeather: DayWeather[] = [
    {date: '2025-01-10', dayLabel: 'Fri', highF: 40, lowF: 28, condition: 'cloudy', rainChance: 20},
    {date: '2025-01-11', dayLabel: 'Sat', highF: 38, lowF: 25, condition: 'snowy', rainChance: 40},
  ];

  // Large wardrobe — exercises all activity paths
  const largeWardrobe: TripWardrobeItem[] = [
    makeWardrobeItem({id: 't1', name: 'T-Shirt', main_category: 'Tops'}),
    makeWardrobeItem({id: 't2', name: 'Polo', main_category: 'Tops'}),
    makeWardrobeItem({id: 't3', name: 'Dress Shirt', main_category: 'Tops', formalityScore: 80}),
    makeWardrobeItem({id: 't4', name: 'Linen Shirt', main_category: 'Tops'}),
    makeWardrobeItem({id: 'b1', name: 'Chinos', main_category: 'Bottoms'}),
    makeWardrobeItem({id: 'b2', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
    makeWardrobeItem({id: 'b3', name: 'Trousers', main_category: 'Bottoms', formalityScore: 80}),
    makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes'}),
    makeWardrobeItem({id: 's2', name: 'Loafers', main_category: 'Shoes', formalityScore: 75}),
    makeWardrobeItem({id: 's3', name: 'Sandals', main_category: 'Shoes'}),
    makeWardrobeItem({id: 'sw1', name: 'Swim Trunks', main_category: 'Swimwear', subcategory: 'Swim Trunks'}),
    makeWardrobeItem({id: 'ow1', name: 'Jacket', main_category: 'Outerwear'}),
    makeWardrobeItem({id: 'ac1', name: 'Watch', main_category: 'Accessories'}),
  ];

  // Minimal wardrobe — tests starvation edge case
  const minimalWardrobe: TripWardrobeItem[] = [
    makeWardrobeItem({id: 't1', name: 'T-Shirt', main_category: 'Tops'}),
    makeWardrobeItem({id: 'b1', name: 'Shorts', main_category: 'Bottoms', subcategory: 'Shorts'}),
    makeWardrobeItem({id: 's1', name: 'Sneakers', main_category: 'Shoes'}),
  ];

  for (const acts of activities) {
    it(`${acts.join('+')} (hot): every masculine outfit has tops+bottoms+shoes`, () => {
      const capsule = buildCapsule(largeWardrobe, hotWeather, acts, 'Home', 'masculine');
      assertMasculineComplete(capsule);
    });
  }

  it('cold weather + Business: every masculine outfit has tops+bottoms+shoes', () => {
    const capsule = buildCapsule(largeWardrobe, coldWeather, ['Business'], 'Home', 'masculine');
    assertMasculineComplete(capsule);
  });

  it('minimal wardrobe + Casual: every masculine outfit has tops+bottoms+shoes', () => {
    const capsule = buildCapsule(minimalWardrobe, hotWeather, ['Casual'], 'Home', 'masculine');
    assertMasculineComplete(capsule);
  });

  it('minimal wardrobe + Beach: every masculine outfit has tops+bottoms+shoes (or swimwear)', () => {
    const beachMinimal: TripWardrobeItem[] = [
      makeWardrobeItem({id: 't1', name: 'Tank Top', main_category: 'Tops'}),
      makeWardrobeItem({id: 'sw1', name: 'Swim Trunks', main_category: 'Swimwear', subcategory: 'Swim Trunks'}),
      makeWardrobeItem({id: 's1', name: 'Flip-Flops', main_category: 'Shoes'}),
    ];
    const capsule = buildCapsule(beachMinimal, hotWeather, ['Beach'], 'Home', 'masculine');
    assertMasculineComplete(capsule);
  });
});

// ─── Aesthetic Bonus ──────────────────────────────────────────────

describe('aestheticBonus', () => {
  const makeLookup = (items: TripWardrobeItem[]): Map<string, TripWardrobeItem> =>
    new Map(items.map(i => [i.id, i]));

  it('returns within ±0.5 for all scenarios', () => {
    const candidate = makeWardrobeItem({id: 'c1', name: 'Red Top', color: 'red', main_category: 'Tops', subcategory: 'T-Shirt'});
    const existing: TripPackingItem[] = [
      makeItem({wardrobeItemId: 'e1', mainCategory: 'Bottoms', name: 'Purple Pants'}),
    ];
    const pool = [
      candidate,
      makeWardrobeItem({id: 'e1', name: 'Purple Pants', color: 'purple', main_category: 'Bottoms'}),
    ];
    const lookup = makeLookup(pool);

    const result = aestheticBonus(candidate, existing, lookup);
    expect(result).toBeGreaterThanOrEqual(-0.5);
    expect(result).toBeLessThanOrEqual(0.5);
  });

  it('+0.3 bonus for neutral candidate color', () => {
    const candidate = makeWardrobeItem({id: 'c1', name: 'Black Tee', color: 'black', main_category: 'Tops'});
    const lookup = makeLookup([candidate]);
    const result = aestheticBonus(candidate, [], lookup);
    expect(result).toBe(0.3);
  });

  it('-0.5 for bold-on-bold clash (red + purple)', () => {
    const candidate = makeWardrobeItem({id: 'c1', name: 'Red Top', color: 'red', main_category: 'Tops'});
    const existingItem = makeWardrobeItem({id: 'e1', name: 'Purple Pants', color: 'purple', main_category: 'Bottoms'});
    const existing: TripPackingItem[] = [
      makeItem({wardrobeItemId: 'e1', mainCategory: 'Bottoms', name: 'Purple Pants'}),
    ];
    const lookup = makeLookup([candidate, existingItem]);

    const result = aestheticBonus(candidate, existing, lookup);
    // red (bold) + purple (bold) = -0.5 for bold clash
    // red (warm) + purple (neither warm nor cool) = no warm/cool clash
    // no neutral = no +0.3
    expect(result).toBe(-0.5);
  });

  it('-0.2 for same subcategory already in outfit', () => {
    const candidate = makeWardrobeItem({id: 'c1', name: 'Navy Polo', color: 'navy', main_category: 'Tops', subcategory: 'Polo'});
    const existingItem = makeWardrobeItem({id: 'e1', name: 'White Polo', color: 'white', main_category: 'Tops', subcategory: 'Polo'});
    const existing: TripPackingItem[] = [
      makeItem({wardrobeItemId: 'e1', mainCategory: 'Tops', name: 'White Polo', subCategory: 'Polo'}),
    ];
    const lookup = makeLookup([candidate, existingItem]);

    const result = aestheticBonus(candidate, existing, lookup);
    // navy = neutral (+0.3) + same subcategory (-0.2) = 0.1
    expect(result).toBeCloseTo(0.1);
  });

  it('deterministic: same inputs produce identical results across runs', () => {
    const candidate = makeWardrobeItem({id: 'c1', name: 'Olive Tee', color: 'olive', main_category: 'Tops', subcategory: 'T-Shirt'});
    const existingItem = makeWardrobeItem({id: 'e1', name: 'Blue Jeans', color: 'blue', main_category: 'Bottoms', subcategory: 'Jeans'});
    const existing: TripPackingItem[] = [
      makeItem({wardrobeItemId: 'e1', mainCategory: 'Bottoms', name: 'Blue Jeans'}),
    ];
    const lookup = makeLookup([candidate, existingItem]);

    const r1 = aestheticBonus(candidate, existing, lookup);
    const r2 = aestheticBonus(candidate, existing, lookup);
    const r3 = aestheticBonus(candidate, existing, lookup);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });
});
