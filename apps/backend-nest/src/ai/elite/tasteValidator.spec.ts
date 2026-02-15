import {
  validateOutfit,
  validateOutfits,
  isOpenFootwear,
  tempToClimateZone,
  type ValidatorItem,
  type ValidatorContext,
} from './tasteValidator';

// ── Helpers ─────────────────────────────────────────────────────────────────

function item(overrides: Partial<ValidatorItem> & { id: string; slot: ValidatorItem['slot'] }): ValidatorItem {
  return overrides;
}

const shoes = (id: string, extra?: Partial<ValidatorItem>): ValidatorItem =>
  item({ id, slot: 'shoes', name: id, ...extra });

const top = (id: string, extra?: Partial<ValidatorItem>): ValidatorItem =>
  item({ id, slot: 'tops', name: id, ...extra });

const bottom = (id: string, extra?: Partial<ValidatorItem>): ValidatorItem =>
  item({ id, slot: 'bottoms', name: id, ...extra });

const dress = (id: string, extra?: Partial<ValidatorItem>): ValidatorItem =>
  item({ id, slot: 'dresses', name: id, ...extra });

// ── isOpenFootwear ──────────────────────────────────────────────────────────

describe('isOpenFootwear', () => {
  it('detects sandals by subcategory', () => {
    expect(isOpenFootwear({ subcategory: 'Sandals' })).toBe(true);
  });
  it('detects sandal (singular) by name', () => {
    expect(isOpenFootwear({ name: 'Brown Leather Sandal' })).toBe(true);
  });
  it('detects flip-flops by subcategory', () => {
    expect(isOpenFootwear({ subcategory: 'Flip-Flops' })).toBe(true);
  });
  it('detects flip flops by name (no hyphen)', () => {
    expect(isOpenFootwear({ name: 'Blue Flip Flops' })).toBe(true);
  });
  it('detects slides by subcategory', () => {
    expect(isOpenFootwear({ subcategory: 'Slides' })).toBe(true);
  });
  it('detects slide (singular)', () => {
    expect(isOpenFootwear({ name: 'Adidas Slide' })).toBe(true);
  });
  it('detects thong footwear', () => {
    expect(isOpenFootwear({ subcategory: 'Thong' })).toBe(true);
  });
  it('rejects sneakers', () => {
    expect(isOpenFootwear({ subcategory: 'Sneakers', name: 'White Sneakers' })).toBe(false);
  });
  it('rejects boots', () => {
    expect(isOpenFootwear({ subcategory: 'Boots', name: 'Chelsea Boots' })).toBe(false);
  });
  it('rejects dress shoes', () => {
    expect(isOpenFootwear({ subcategory: 'Dress Shoes', name: 'Black Oxfords' })).toBe(false);
  });
  it('rejects empty', () => {
    expect(isOpenFootwear({})).toBe(false);
  });
});

// ── tempToClimateZone ───────────────────────────────────────────────────────

describe('tempToClimateZone', () => {
  it('freezing', () => expect(tempToClimateZone(20)).toBe('freezing'));
  it('cold', () => expect(tempToClimateZone(40)).toBe('cold'));
  it('cool', () => expect(tempToClimateZone(50)).toBe('cool'));
  it('mild', () => expect(tempToClimateZone(60)).toBe('mild'));
  it('warm', () => expect(tempToClimateZone(80)).toBe('warm'));
  it('hot', () => expect(tempToClimateZone(95)).toBe('hot'));
  it('null', () => expect(tempToClimateZone(null)).toBeUndefined());
  it('undefined', () => expect(tempToClimateZone(undefined)).toBeUndefined());
});

// ── Hard fail: CROSS_PRESENTATION ───────────────────────────────────────────

describe('CROSS_PRESENTATION', () => {
  it('rejects feminine item for masculine user', () => {
    const r = validateOutfit(
      [top('t1', { presentation_code: 'feminine' }), bottom('b1'), shoes('s1')],
      { userPresentation: 'masculine' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('CROSS_PRESENTATION');
  });

  it('rejects masculine item for feminine user', () => {
    const r = validateOutfit(
      [top('t1', { presentation_code: 'masculine' }), bottom('b1'), shoes('s1')],
      { userPresentation: 'feminine' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('CROSS_PRESENTATION');
  });

  it('passes for mixed user', () => {
    const r = validateOutfit(
      [top('t1', { presentation_code: 'feminine' }), bottom('b1'), shoes('s1')],
      { userPresentation: 'mixed' },
    );
    expect(r.valid).toBe(true);
  });

  it('passes when item has no presentation_code (fail-open)', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1')],
      { userPresentation: 'masculine' },
    );
    expect(r.valid).toBe(true);
  });
});

// ── Hard fail: EXTREME_WEATHER_CONTRADICTION ────────────────────────────────

describe('EXTREME_WEATHER_CONTRADICTION', () => {
  it('rejects sandals in freezing', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Brown Sandals', subcategory: 'Sandals' })],
      { climateZone: 'freezing' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('EXTREME_WEATHER_CONTRADICTION');
  });

  it('rejects flip-flops in cold', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Flip Flops', subcategory: 'Flip-Flops' })],
      { climateZone: 'cold' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('EXTREME_WEATHER_CONTRADICTION');
  });

  it('rejects slides in freezing', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Nike Slides', subcategory: 'Slides' })],
      { climateZone: 'freezing' },
    );
    expect(r.valid).toBe(false);
  });

  it('rejects thong footwear in cold', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Beach Thong', subcategory: 'Thong' })],
      { climateZone: 'cold' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('EXTREME_WEATHER_CONTRADICTION');
  });

  it('rejects thong footwear in freezing', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Beach Thong', subcategory: 'Thong' })],
      { climateZone: 'freezing' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('EXTREME_WEATHER_CONTRADICTION');
  });

  it('passes sandals in mild', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Sandals', subcategory: 'Sandals' })],
      { climateZone: 'mild' },
    );
    expect(r.valid).toBe(true);
  });

  it('passes closed shoes in freezing', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Boots', subcategory: 'Boots' })],
      { climateZone: 'freezing' },
    );
    expect(r.valid).toBe(true);
  });

  it('passes with no climate zone (fail-open)', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Sandals', subcategory: 'Sandals' })],
      {},
    );
    expect(r.valid).toBe(true);
  });

  it('rejects heavy outerwear in hot', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1'), item({ id: 'ow1', slot: 'outerwear', material: 'Down Parka' })],
      { climateZone: 'hot' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('EXTREME_WEATHER_CONTRADICTION');
  });
});

// ── Hard fail: DRESS_CODE_MISMATCH ──────────────────────────────────────────

describe('DRESS_CODE_MISMATCH', () => {
  it('rejects athletic dress_code in business request', () => {
    const r = validateOutfit(
      [top('t1', { dress_code: 'Athletic' }), bottom('b1'), shoes('s1')],
      { requestedDressCode: 'Business' },
    );
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('DRESS_CODE_MISMATCH');
  });

  it('passes when no requested dress code', () => {
    const r = validateOutfit(
      [top('t1', { dress_code: 'Athletic' }), bottom('b1'), shoes('s1')],
      {},
    );
    expect(r.valid).toBe(true);
  });

  it('passes matching dress codes', () => {
    const r = validateOutfit(
      [top('t1', { dress_code: 'Business' }), bottom('b1'), shoes('s1')],
      { requestedDressCode: 'Business' },
    );
    expect(r.valid).toBe(true);
  });

  it('passes casual items when request is not formal', () => {
    const r = validateOutfit(
      [top('t1', { dress_code: 'UltraCasual' }), bottom('b1'), shoes('s1')],
      { requestedDressCode: 'Casual' },
    );
    expect(r.valid).toBe(true);
  });
});

// ── Hard fail: MISSING_REQUIRED_SLOTS ───────────────────────────────────────

describe('MISSING_REQUIRED_SLOTS', () => {
  it('passes separates with tops+bottoms+shoes', () => {
    const r = validateOutfit([top('t1'), bottom('b1'), shoes('s1')], {});
    expect(r.valid).toBe(true);
  });

  it('rejects separates missing shoes', () => {
    const r = validateOutfit([top('t1'), bottom('b1')], {});
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('MISSING_REQUIRED_SLOTS');
  });

  it('rejects separates missing tops', () => {
    const r = validateOutfit([bottom('b1'), shoes('s1')], {});
    expect(r.valid).toBe(false);
  });

  it('passes dress + shoes', () => {
    const r = validateOutfit([dress('d1'), shoes('s1')], {});
    expect(r.valid).toBe(true);
  });

  it('rejects dress without shoes', () => {
    const r = validateOutfit([dress('d1')], {});
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('dress missing shoes');
  });

  it('passes swimwear alone', () => {
    const r = validateOutfit([item({ id: 'sw1', slot: 'swimwear' })], {});
    expect(r.valid).toBe(true);
  });

  it('rejects activewear without shoes', () => {
    const r = validateOutfit([item({ id: 'a1', slot: 'activewear' })], {});
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('activewear missing shoes');
  });

  it('passes activewear with shoes', () => {
    const r = validateOutfit([item({ id: 'a1', slot: 'activewear' }), shoes('s1')], {});
    expect(r.valid).toBe(true);
  });

  it('rejects empty items', () => {
    const r = validateOutfit([], {});
    expect(r.valid).toBe(false);
    expect(r.hardFails[0]).toContain('MISSING_REQUIRED_SLOTS');
  });
});

// ── Soft penalties ──────────────────────────────────────────────────────────

describe('Soft penalties', () => {
  it('fires FORMALITY_INCOHERENCE when range > 4', () => {
    const r = validateOutfit(
      [top('t1', { formality_score: 2 }), bottom('b1', { formality_score: 8 }), shoes('s1')],
      {},
    );
    expect(r.valid).toBe(true);
    expect(r.softPenalties).toContain('FORMALITY_INCOHERENCE');
  });

  it('no formality penalty when range <= 4', () => {
    const r = validateOutfit(
      [top('t1', { formality_score: 4 }), bottom('b1', { formality_score: 6 }), shoes('s1')],
      {},
    );
    expect(r.softPenalties).not.toContain('FORMALITY_INCOHERENCE');
  });

  it('fires FIT_PREFERENCE_MISMATCH when user prefers slim and item is oversized', () => {
    const r = validateOutfit(
      [top('t1', { fit: 'Oversized' }), bottom('b1'), shoes('s1')],
      { styleProfile: { fit_preferences: ['Slim'] } },
    );
    expect(r.softPenalties).toContain('FIT_PREFERENCE_MISMATCH');
  });

  it('no fit penalty when no fit_preferences', () => {
    const r = validateOutfit(
      [top('t1', { fit: 'Oversized' }), bottom('b1'), shoes('s1')],
      {},
    );
    expect(r.softPenalties).not.toContain('FIT_PREFERENCE_MISMATCH');
  });

  it('fires FABRIC_CLIMATE_MISMATCH for wool in hot', () => {
    const r = validateOutfit(
      [top('t1', { material: 'Merino Wool' }), bottom('b1'), shoes('s1')],
      { climateZone: 'hot' },
    );
    expect(r.softPenalties).toContain('FABRIC_CLIMATE_MISMATCH');
  });

  it('no fabric penalty in mild climate', () => {
    const r = validateOutfit(
      [top('t1', { material: 'Wool' }), bottom('b1'), shoes('s1')],
      { climateZone: 'mild' },
    );
    expect(r.softPenalties).not.toContain('FABRIC_CLIMATE_MISMATCH');
  });

  it('fires BUDGET_MISALIGNMENT when price > 2x budget_max', () => {
    const r = validateOutfit(
      [top('t1', { price: 500 }), bottom('b1'), shoes('s1')],
      { styleProfile: { budget_max: 100 } },
    );
    expect(r.softPenalties).toContain('BUDGET_MISALIGNMENT');
  });

  it('no budget penalty when no budget_max', () => {
    const r = validateOutfit(
      [top('t1', { price: 500 }), bottom('b1'), shoes('s1')],
      {},
    );
    expect(r.softPenalties).not.toContain('BUDGET_MISALIGNMENT');
  });

  it('fires DISLIKED_STYLE_MATCH when descriptors intersect disliked_styles', () => {
    const r = validateOutfit(
      [top('t1', { style_descriptors: ['Bohemian'] }), bottom('b1'), shoes('s1')],
      { styleProfile: { disliked_styles: ['bohemian'] } },
    );
    expect(r.softPenalties).toContain('DISLIKED_STYLE_MATCH');
  });

  it('no disliked penalty when disliked_styles empty', () => {
    const r = validateOutfit(
      [top('t1', { style_descriptors: ['Bohemian'] }), bottom('b1'), shoes('s1')],
      {},
    );
    expect(r.softPenalties).not.toContain('DISLIKED_STYLE_MATCH');
  });
});

// ── Fail-open integration ───────────────────────────────────────────────────

describe('Fail-open / integration', () => {
  it('all metadata missing => valid, coherenceScore 100', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1')],
      {},
    );
    expect(r.valid).toBe(true);
    expect(r.hardFails).toHaveLength(0);
    expect(r.softPenalties).toHaveLength(0);
    expect(r.coherenceScore).toBe(100);
  });

  it('hard fail sets coherenceScore to 0', () => {
    const r = validateOutfit(
      [top('t1'), bottom('b1'), shoes('s1', { name: 'Sandals', subcategory: 'Sandals' })],
      { climateZone: 'freezing' },
    );
    expect(r.coherenceScore).toBe(0);
  });

  it('freezing + business + sandals is hard fail (regression for reported bug)', () => {
    const r = validateOutfit(
      [
        top('t1', { dress_code: 'Business' }),
        bottom('b1', { dress_code: 'Business' }),
        shoes('s1', { name: 'Brown Sandals', subcategory: 'Sandals', dress_code: 'Casual' }),
      ],
      { climateZone: 'freezing', requestedDressCode: 'Business' },
    );
    expect(r.valid).toBe(false);
    // Should fail on weather contradiction
    expect(r.hardFails.some(f => f.includes('EXTREME_WEATHER_CONTRADICTION'))).toBe(true);
  });

  it('validateOutfits batch works correctly', () => {
    const batch = validateOutfits(
      [
        { outfitId: 'o1', items: [top('t1'), bottom('b1'), shoes('s1')] },
        { outfitId: 'o2', items: [top('t2'), bottom('b2'), shoes('s2', { name: 'Sandals', subcategory: 'Sandals' })] },
      ],
      { climateZone: 'freezing' },
    );
    expect(batch.results).toHaveLength(2);
    expect(batch.results[0].validation.valid).toBe(true);
    expect(batch.results[1].validation.valid).toBe(false);
  });
});
