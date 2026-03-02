import {filterWardrobeByLocation} from './wardrobeLocationFilter';

const makeItem = (overrides: Record<string, any>) => ({
  id: overrides.id ?? 'item-1',
  name: overrides.name ?? 'Test Item',
  location_id: overrides.location_id ?? 'home',
  care_status: overrides.care_status ?? 'available',
  ...overrides,
});

describe('filterWardrobeByLocation', () => {
  it('returns items matching location and excludes at_cleaner', () => {
    const wardrobe = [
      makeItem({id: '1', location_id: 'home', care_status: 'available'}),
      makeItem({id: '2', location_id: 'home', care_status: 'at_cleaner'}),
      makeItem({id: '3', location_id: 'office', care_status: 'available'}),
      makeItem({id: '4', location_id: 'home', care_status: 'available'}),
      makeItem({id: '5', location_id: 'home', care_status: 'available'}),
      makeItem({id: '6', location_id: 'home', care_status: 'available'}),
      makeItem({id: '7', location_id: 'home', care_status: 'available'}),
    ];

    const result = filterWardrobeByLocation(wardrobe, 'home');

    expect(result).toHaveLength(5);
    expect(result.every(i => i.location_id === 'home')).toBe(true);
    expect(result.every(i => i.care_status !== 'at_cleaner')).toBe(true);
  });

  it('fallback excludes at_cleaner items when filtered < min', () => {
    const wardrobe = [
      makeItem({id: '1', location_id: 'office', care_status: 'available'}),
      makeItem({id: '2', location_id: 'home', care_status: 'available'}),
      makeItem({id: '3', location_id: 'office', care_status: 'at_cleaner'}),
      makeItem({id: '4', location_id: 'office', care_status: 'available'}),
    ];

    // Only 1 item at 'home' (below min=5), so fallback triggers
    const result = filterWardrobeByLocation(wardrobe, 'home');

    // Fallback returns all items EXCEPT at_cleaner
    expect(result).toHaveLength(3);
    expect(result.some(i => i.care_status === 'at_cleaner')).toBe(false);
    expect(result.map(i => i.id).sort()).toEqual(['1', '2', '4']);
  });

  it('fallback with only at_cleaner items returns empty array', () => {
    const wardrobe = [
      makeItem({id: '1', location_id: 'home', care_status: 'at_cleaner'}),
      makeItem({id: '2', location_id: 'office', care_status: 'at_cleaner'}),
    ];

    const result = filterWardrobeByLocation(wardrobe, 'home');

    expect(result).toHaveLength(0);
  });

  it('respects custom min threshold', () => {
    const wardrobe = [
      makeItem({id: '1', location_id: 'home', care_status: 'available'}),
      makeItem({id: '2', location_id: 'home', care_status: 'available'}),
      makeItem({id: '3', location_id: 'office', care_status: 'available'}),
    ];

    // 2 items at 'home', min=2 → returns filtered
    const result = filterWardrobeByLocation(wardrobe, 'home', 2);

    expect(result).toHaveLength(2);
    expect(result.every(i => i.location_id === 'home')).toBe(true);
  });

  it('handles camelCase careStatus field', () => {
    const wardrobe = [
      {id: '1', locationId: 'home', careStatus: 'available'},
      {id: '2', locationId: 'home', careStatus: 'at_cleaner'},
      {id: '3', locationId: 'office', careStatus: 'available'},
    ];

    // Only 1 at home (below min=5), fallback triggers
    const result = filterWardrobeByLocation(wardrobe, 'home');

    // Fallback excludes at_cleaner (camelCase)
    expect(result).toHaveLength(2);
    expect(result.some(i => (i as any).careStatus === 'at_cleaner')).toBe(false);
  });
});
