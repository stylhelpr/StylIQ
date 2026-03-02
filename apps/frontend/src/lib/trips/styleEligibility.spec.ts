import {
  normalizeGenderToPresentation,
  isItemEligibleForProfile,
  filterEligibleItems,
  hasFeminineOverride,
} from './styleEligibility';
import type {TripWardrobeItem} from '../../types/trips';

function makeItem(overrides: Partial<TripWardrobeItem> & {id: string}): TripWardrobeItem {
  return {name: 'Test Item', ...overrides};
}

// ══════════════════════════════════════════════════════════════════════════════
// normalizeGenderToPresentation
// ══════════════════════════════════════════════════════════════════════════════

describe('normalizeGenderToPresentation', () => {
  it('maps "male" to masculine', () => {
    expect(normalizeGenderToPresentation('male')).toBe('masculine');
  });

  it('maps "Male" to masculine (case insensitive)', () => {
    expect(normalizeGenderToPresentation('Male')).toBe('masculine');
  });

  it('maps "female" to feminine', () => {
    expect(normalizeGenderToPresentation('female')).toBe('feminine');
  });

  it('maps "Female" to feminine', () => {
    expect(normalizeGenderToPresentation('Female')).toBe('feminine');
  });

  it('maps "other" to mixed', () => {
    expect(normalizeGenderToPresentation('other')).toBe('mixed');
  });

  it('maps "non-binary" to mixed', () => {
    expect(normalizeGenderToPresentation('non-binary')).toBe('mixed');
  });

  it('maps "non_binary" to mixed', () => {
    expect(normalizeGenderToPresentation('non_binary')).toBe('mixed');
  });

  it('maps "rather_not_say" to mixed', () => {
    expect(normalizeGenderToPresentation('rather_not_say')).toBe('mixed');
  });

  it('maps undefined to mixed', () => {
    expect(normalizeGenderToPresentation(undefined)).toBe('mixed');
  });

  it('maps null to mixed', () => {
    expect(normalizeGenderToPresentation(null)).toBe('mixed');
  });

  it('maps empty string to mixed', () => {
    expect(normalizeGenderToPresentation('')).toBe('mixed');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// isItemEligibleForProfile
// ══════════════════════════════════════════════════════════════════════════════

describe('isItemEligibleForProfile', () => {
  // ── Masculine profile: blocks feminine items ──

  it('blocks Dresses for masculine', () => {
    const dress = makeItem({id: '1', name: 'Evening Gown', main_category: 'Dresses'});
    expect(isItemEligibleForProfile(dress, 'masculine')).toBe(false);
  });

  it('blocks Skirts for masculine', () => {
    const skirt = makeItem({id: '2', name: 'Pencil Skirt', main_category: 'Skirts'});
    expect(isItemEligibleForProfile(skirt, 'masculine')).toBe(false);
  });

  it('blocks halter dress (subcategory) for masculine', () => {
    const halter = makeItem({id: '3', name: 'Halter Dress', main_category: 'Dresses', subcategory: 'Halter Dress'});
    expect(isItemEligibleForProfile(halter, 'masculine')).toBe(false);
  });

  it('blocks heels for masculine', () => {
    const heels = makeItem({id: '4', name: 'Stiletto Heels', subcategory: 'Heels'});
    expect(isItemEligibleForProfile(heels, 'masculine')).toBe(false);
  });

  it('blocks blouse for masculine', () => {
    const blouse = makeItem({id: '5', name: 'Silk Blouse', subcategory: 'Blouse'});
    expect(isItemEligibleForProfile(blouse, 'masculine')).toBe(false);
  });

  it('blocks earrings for masculine', () => {
    const earrings = makeItem({id: '6', name: 'Diamond Earrings', subcategory: 'Earrings'});
    expect(isItemEligibleForProfile(earrings, 'masculine')).toBe(false);
  });

  it('blocks purse for masculine', () => {
    const purse = makeItem({id: '7', name: 'Designer Purse', subcategory: 'Purse'});
    expect(isItemEligibleForProfile(purse, 'masculine')).toBe(false);
  });

  it('blocks pumps for masculine', () => {
    const pumps = makeItem({id: '8', name: 'Red Pumps', subcategory: 'Pumps'});
    expect(isItemEligibleForProfile(pumps, 'masculine')).toBe(false);
  });

  it('blocks gown for masculine', () => {
    const gown = makeItem({id: '9', name: 'Ball Gown', subcategory: 'Gown'});
    expect(isItemEligibleForProfile(gown, 'masculine')).toBe(false);
  });

  // ── Masculine profile: allows masculine items ──

  it('allows Tops for masculine', () => {
    const top = makeItem({id: '10', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt'});
    expect(isItemEligibleForProfile(top, 'masculine')).toBe(true);
  });

  it('allows Bottoms for masculine', () => {
    const bottom = makeItem({id: '11', name: 'Chinos', main_category: 'Bottoms'});
    expect(isItemEligibleForProfile(bottom, 'masculine')).toBe(true);
  });

  it('allows Shoes (Oxfords) for masculine', () => {
    const shoe = makeItem({id: '12', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford'});
    expect(isItemEligibleForProfile(shoe, 'masculine')).toBe(true);
  });

  it('allows Watch for masculine', () => {
    const watch = makeItem({id: '13', name: 'Leather Watch', main_category: 'Accessories', subcategory: 'Watch'});
    expect(isItemEligibleForProfile(watch, 'masculine')).toBe(true);
  });

  // ── FALSE POSITIVE: "dress shirt" must NOT be blocked ──

  it('does NOT block "Dress Shirt" for masculine (false positive prevention)', () => {
    const dressShirt = makeItem({id: '14', name: 'White Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt'});
    expect(isItemEligibleForProfile(dressShirt, 'masculine')).toBe(true);
  });

  // ── Feminine profile: allows all ──

  it('allows Dresses for feminine', () => {
    const dress = makeItem({id: '20', name: 'Evening Gown', main_category: 'Dresses'});
    expect(isItemEligibleForProfile(dress, 'feminine')).toBe(true);
  });

  it('allows Skirts for feminine', () => {
    const skirt = makeItem({id: '21', name: 'Pencil Skirt', main_category: 'Skirts'});
    expect(isItemEligibleForProfile(skirt, 'feminine')).toBe(true);
  });

  // ── Mixed profile: allows all ──

  it('allows Dresses for mixed', () => {
    const dress = makeItem({id: '30', name: 'Sundress', main_category: 'Dresses'});
    expect(isItemEligibleForProfile(dress, 'mixed')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// filterEligibleItems
// ══════════════════════════════════════════════════════════════════════════════

describe('filterEligibleItems', () => {
  const mixedWardrobe: TripWardrobeItem[] = [
    makeItem({id: 't1', name: 'Dress Shirt', main_category: 'Tops', subcategory: 'Dress Shirt'}),
    makeItem({id: 'b1', name: 'Chinos', main_category: 'Bottoms'}),
    makeItem({id: 's1', name: 'Oxford Shoes', main_category: 'Shoes', subcategory: 'Oxford'}),
    makeItem({id: 'd1', name: 'Evening Gown', main_category: 'Dresses'}),
    makeItem({id: 'sk1', name: 'Pencil Skirt', main_category: 'Skirts'}),
    makeItem({id: 'h1', name: 'Stiletto Heels', main_category: 'Shoes', subcategory: 'Heels'}),
  ];

  it('masculine: removes all feminine items', () => {
    const eligible = filterEligibleItems(mixedWardrobe, 'masculine');
    expect(eligible.map(i => i.id)).toEqual(['t1', 'b1', 's1']);
    expect(eligible.find(i => i.main_category === 'Dresses')).toBeUndefined();
    expect(eligible.find(i => i.main_category === 'Skirts')).toBeUndefined();
    expect(eligible.find(i => i.name === 'Stiletto Heels')).toBeUndefined();
  });

  it('feminine: keeps all items', () => {
    const eligible = filterEligibleItems(mixedWardrobe, 'feminine');
    expect(eligible.length).toBe(mixedWardrobe.length);
  });

  it('mixed: keeps all items', () => {
    const eligible = filterEligibleItems(mixedWardrobe, 'mixed');
    expect(eligible.length).toBe(mixedWardrobe.length);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// hasFeminineOverride
// ══════════════════════════════════════════════════════════════════════════════

describe('hasFeminineOverride', () => {
  it('detects "pack a dress"', () => {
    expect(hasFeminineOverride('pack a dress for the event')).toBe(true);
  });

  it('detects "add skirt"', () => {
    expect(hasFeminineOverride('add skirt to the outfit')).toBe(true);
  });

  it('detects "feminine style"', () => {
    expect(hasFeminineOverride('I want a feminine style')).toBe(true);
  });

  it('detects "women\'s clothing"', () => {
    expect(hasFeminineOverride("include women's clothing")).toBe(true);
  });

  it('does NOT trigger on "pack shirts"', () => {
    expect(hasFeminineOverride('pack shirts and pants')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasFeminineOverride(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(hasFeminineOverride(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasFeminineOverride('')).toBe(false);
  });
});
