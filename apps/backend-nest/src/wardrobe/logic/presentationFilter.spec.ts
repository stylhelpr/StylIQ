import {
  resolveUserPresentation,
  isFeminineItem,
  buildGenderDirective,
} from './presentationFilter';

// ═══════════════════════════════════════════════════════════════════════════
// resolveUserPresentation
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveUserPresentation', () => {
  describe('feminine detection (must check BEFORE masculine)', () => {
    it.each([
      'female',
      'Female',
      'FEMALE',
      'feminine',
      'Feminine',
      'woman',
      'Woman',
      'fe male', // with space
      'fe-male', // with dash
      'fe_male', // with underscore
    ])('returns feminine for "%s"', (input) => {
      expect(resolveUserPresentation(input)).toBe('feminine');
    });
  });

  describe('masculine detection', () => {
    it.each([
      'male',
      'Male',
      'MALE',
      'masculine',
      'Masculine',
      'man',
      'Man',
    ])('returns masculine for "%s"', (input) => {
      expect(resolveUserPresentation(input)).toBe('masculine');
    });
  });

  describe('mixed (default) for everything else', () => {
    it.each([
      '',
      'other',
      'nonbinary',
      'non-binary',
      'Non Binary',
      'rathernotsay',
      'prefer not to say',
      'unknown',
    ])('returns mixed for "%s"', (input) => {
      expect(resolveUserPresentation(input)).toBe('mixed');
    });
  });

  // CRITICAL: JS string bug — 'female'.includes('male') is true
  it('does NOT misclassify "female" as masculine', () => {
    expect(resolveUserPresentation('female')).toBe('feminine');
    expect(resolveUserPresentation('Female')).toBe('feminine');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// isFeminineItem
// ═══════════════════════════════════════════════════════════════════════════

describe('isFeminineItem', () => {
  describe('main category hard blocks', () => {
    it('blocks Dresses', () => {
      expect(isFeminineItem('Dresses', '', '')).toBe(true);
    });
    it('blocks Skirts', () => {
      expect(isFeminineItem('Skirts', '', '')).toBe(true);
    });
  });

  describe('subcategory feminine detections', () => {
    it.each([
      ['Tops', 'wrap dress', ''],
      ['Tops', 'halter dress', ''],
      ['Bottoms', 'mini skirt', ''],
      ['Tops', 'silk blouse', ''],
      ['Dresses', 'evening gown', ''],
      ['Shoes', 'high heel', ''],
      ['Shoes', 'stiletto', ''],
      ['Shoes', 'kitten pump', ''],
      ['Shoes', 'slingback', ''],
      ['Shoes', 'mary jane', ''],
      ['Shoes', 'ballet flat', ''],
      ['Accessories', 'hoop earring', ''],
      ['Accessories', 'gold bracelet', ''],
      ['Accessories', 'anklet chain', ''],
      ['Accessories', 'leather purse', ''],
      ['Accessories', 'clutch bag', ''],
      ['Accessories', 'handbag', ''],
    ])('blocks [%s, "%s", "%s"]', (cat, sub, name) => {
      expect(isFeminineItem(cat, sub, name)).toBe(true);
    });
  });

  describe('name-based fallback detections', () => {
    it.each([
      ['Accessories', '', 'gold earring set'],
      ['Accessories', '', 'beaded bracelet'],
      ['Accessories', '', 'silver anklet'],
      ['Accessories', '', 'coach purse'],
      ['Accessories', '', 'gucci handbag'],
      ['Shoes', '', 'ballet flat shoes'],
    ])('blocks [%s, "%s", "%s"]', (cat, sub, name) => {
      expect(isFeminineItem(cat, sub, name)).toBe(true);
    });
  });

  describe('masculine-safe items NOT blocked', () => {
    it.each([
      ['Tops', 't-shirt', 'Blue crew tee'],
      ['Tops', 'polo', 'Ralph Lauren polo'],
      ['Bottoms', 'jeans', 'Slim dark jeans'],
      ['Bottoms', 'chinos', 'Navy chinos'],
      ['Shoes', 'sneakers', 'White sneakers'],
      ['Shoes', 'oxford', 'Brown oxford'],
      ['Shoes', 'loafer', 'Leather loafer'],
      ['Shoes', 'boot', 'Chelsea boot'],
      ['Outerwear', 'blazer', 'Navy blazer'],
      ['Outerwear', 'bomber jacket', 'Green bomber'],
      ['Accessories', 'watch', 'Casio watch'],
      ['Accessories', 'belt', 'Leather belt'],
      ['Accessories', 'cap', 'Baseball cap'],
      ['Activewear', 'running shorts', 'Nike shorts'],
      ['Tops', 'henley', 'Cotton henley'],
    ])('allows [%s, "%s", "%s"]', (cat, sub, name) => {
      expect(isFeminineItem(cat, sub, name)).toBe(false);
    });
  });

  // Edge case: "heel tab" on a sneaker should NOT be blocked
  it('does NOT block items with "heel tab" in name', () => {
    expect(isFeminineItem('Shoes', 'heel tab sneaker', 'Nike heel tab')).toBe(
      false,
    );
  });

  describe('miscategorized items still blocked via subcategory', () => {
    it.each([
      ['Tops', 'wrap dress', 'Floral wrap dress'],
      ['Bottoms', 'midi skirt', 'Pleated midi skirt'],
      ['Tops', 'silk blouse', 'White silk blouse'],
      ['Shoes', 'stiletto heel', 'Black stiletto'],
    ])('blocks [%s, "%s", "%s"] despite wrong main_category', (cat, sub, name) => {
      expect(isFeminineItem(cat, sub, name)).toBe(true);
    });
  });

  // Proves dress+shoes fallback path works for feminine/mixed users:
  // isFeminineItem is only called for masculine — these items are allowed otherwise
  describe('dresses are feminine-flagged (confirms masculine-only filtering)', () => {
    it('Dresses flagged as feminine', () => {
      expect(isFeminineItem('Dresses', 'midi dress', 'Navy midi dress')).toBe(
        true,
      );
    });
    it('Tops NOT flagged when subcategory is neutral', () => {
      expect(isFeminineItem('Tops', 'crew neck', 'White tee')).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildGenderDirective
// ═══════════════════════════════════════════════════════════════════════════

describe('buildGenderDirective', () => {
  it('returns masculine directive with key exclusions', () => {
    const d = buildGenderDirective('masculine');
    expect(d).toContain('GENDER CONTEXT');
    expect(d).toContain('presents masculine');
    expect(d).toContain('NEVER include dresses');
    expect(d).toContain('skirts');
    expect(d).toContain('blouses');
    expect(d).toContain('heels');
    expect(d).toContain('purses');
  });

  it('returns feminine directive with encouragement', () => {
    const d = buildGenderDirective('feminine');
    expect(d).toContain('GENDER CONTEXT');
    expect(d).toContain('presents feminine');
    expect(d).toContain('allowed and encouraged');
  });

  it('returns empty string for mixed', () => {
    expect(buildGenderDirective('mixed')).toBe('');
  });
});
