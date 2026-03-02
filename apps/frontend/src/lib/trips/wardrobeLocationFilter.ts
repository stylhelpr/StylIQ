/**
 * Filters wardrobe items by location_id and excludes items at the cleaner,
 * falling back to full wardrobe if the filtered set is too small to build
 * a useful capsule.
 */
export function filterWardrobeByLocation(
  wardrobe: any[],
  locationId: string,
  min = 5,
): any[] {
  const filtered = wardrobe.filter(
    item =>
      (item.locationId ?? item.location_id ?? 'home') === locationId &&
      (item.careStatus ?? item.care_status ?? 'available') !== 'at_cleaner',
  );
  if (filtered.length >= min) return filtered;
  // Fallback: ignore location constraint but still exclude items at the cleaner
  const available = wardrobe.filter(
    item => (item.careStatus ?? item.care_status ?? 'available') !== 'at_cleaner',
  );
  return available;
}
