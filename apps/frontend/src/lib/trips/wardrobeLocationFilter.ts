/**
 * Filters wardrobe items by location_id, falling back to full wardrobe
 * if the filtered set is too small to build a useful capsule.
 */
export function filterWardrobeByLocation(
  wardrobe: any[],
  locationId: string,
  min = 5,
): any[] {
  const filtered = wardrobe.filter(
    item => (item.locationId ?? item.location_id ?? 'home') === locationId,
  );
  return filtered.length >= min ? filtered : wardrobe;
}
