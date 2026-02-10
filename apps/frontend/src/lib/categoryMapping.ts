/**
 * CANONICAL Category → Slot Mapping Module (FRONTEND)
 *
 * This is the SINGLE SOURCE OF TRUTH for all category-to-slot mappings in the frontend.
 * All consumers (capsuleEngine, useOutfitApi, etc.) MUST use this.
 *
 * This file MUST be kept in sync with:
 * apps/backend-nest/src/wardrobe/logic/categoryMapping.ts
 *
 * DO NOT define category mappings elsewhere. Import from here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All 21 MainCategory values from the canonical taxonomy.
 * Matches: backend categoryMapping.ts, categories.json, DTOs
 */
export type MainCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Outerwear'
  | 'Shoes'
  | 'Accessories'
  | 'Undergarments'
  | 'Activewear'
  | 'Formalwear'
  | 'Loungewear'
  | 'Sleepwear'
  | 'Swimwear'
  | 'Maternity'
  | 'Unisex'
  | 'Costumes'
  | 'TraditionalWear'
  | 'Dresses'
  | 'Skirts'
  | 'Bags'
  | 'Headwear'
  | 'Jewelry'
  | 'Other';

/**
 * All possible Slot values for outfit assembly.
 * These are the internal buckets used for outfit generation.
 */
export type Slot =
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'outerwear'
  | 'accessories'
  | 'dresses'
  | 'activewear'
  | 'swimwear'
  | 'undergarments'
  | 'other';

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Mappings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MAIN_CATEGORY_TO_SLOT: Maps ALL 21 MainCategories to their Slot.
 * Every MainCategory MUST have an entry - no undefined returns.
 *
 * Key mappings:
 * - Skirts → bottoms (worn in place of pants)
 * - Bags, Headwear, Jewelry → accessories (accessory-like items)
 * - Formalwear → dresses (suits/tuxedos are dress-code items, assemble like one-piece)
 * - TraditionalWear → dresses (kimonos, saris are dress-like one-piece items)
 * - Loungewear, Sleepwear, Maternity, Unisex, Costumes → other (specialized, not auto-included)
 */
export const MAIN_CATEGORY_TO_SLOT: Record<MainCategory, Slot> = {
  // Core outfit slots
  Tops: 'tops',
  Bottoms: 'bottoms',
  Shoes: 'shoes',
  Outerwear: 'outerwear',
  Accessories: 'accessories',
  Dresses: 'dresses',
  Activewear: 'activewear',
  Swimwear: 'swimwear',
  Undergarments: 'undergarments',

  // Mapped to core slots
  Skirts: 'bottoms', // Worn in place of pants/bottoms
  Bags: 'accessories', // Accessory-like
  Headwear: 'accessories', // Accessory-like
  Jewelry: 'accessories', // Accessory-like
  Formalwear: 'dresses', // Suits/tuxedos treated as one-piece formal
  TraditionalWear: 'dresses', // Kimonos, saris are dress-like

  // Specialized categories → 'other' bucket
  Loungewear: 'other',
  Sleepwear: 'other',
  Maternity: 'other',
  Unisex: 'other',
  Costumes: 'other',
  Other: 'other',
};

/**
 * SLOT_TO_MAIN_CATEGORIES: Reverse mapping for filtering.
 * For each slot, lists which MainCategories should match.
 */
export const SLOT_TO_MAIN_CATEGORIES: Record<Slot, readonly MainCategory[]> = {
  tops: ['Tops'],
  bottoms: ['Bottoms', 'Skirts'],
  shoes: ['Shoes'],
  outerwear: ['Outerwear'],
  accessories: ['Accessories', 'Bags', 'Headwear', 'Jewelry'],
  dresses: ['Dresses', 'Formalwear', 'TraditionalWear'],
  activewear: ['Activewear'],
  swimwear: ['Swimwear'],
  undergarments: ['Undergarments'],
  other: ['Loungewear', 'Sleepwear', 'Maternity', 'Unisex', 'Costumes', 'Other'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a MainCategory to its Slot.
 * NEVER returns undefined - all 21 categories are mapped.
 * Handles null/undefined/empty gracefully by returning 'other'.
 */
export function mapMainCategoryToSlot(
  category: string | null | undefined,
): Slot {
  // Handle null/undefined/empty
  if (!category || typeof category !== 'string') return 'other';
  const trimmed = category.trim();
  if (!trimmed) return 'other';

  const slot = MAIN_CATEGORY_TO_SLOT[trimmed as MainCategory];
  if (slot) return slot;

  // Fallback: try case-insensitive match
  const normalized =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  const slotNormalized = MAIN_CATEGORY_TO_SLOT[normalized as MainCategory];
  if (slotNormalized) return slotNormalized;

  // Ultimate fallback: 'other'
  if (__DEV__) {
    console.warn(
      `[categoryMapping] Unknown category "${category}", defaulting to 'other'`,
    );
  }
  return 'other';
}

/**
 * Gets all MainCategories that map to a given slot.
 */
export function getMainCategoriesForSlot(slot: Slot): readonly MainCategory[] {
  return SLOT_TO_MAIN_CATEGORIES[slot];
}

/**
 * Checks if a MainCategory string is valid.
 */
export function isValidMainCategory(
  category: string,
): category is MainCategory {
  return category in MAIN_CATEGORY_TO_SLOT;
}

/**
 * Gets all valid MainCategory values.
 */
export function getAllMainCategories(): MainCategory[] {
  return Object.keys(MAIN_CATEGORY_TO_SLOT) as MainCategory[];
}

/**
 * Gets all valid Slot values.
 */
export function getAllSlots(): Slot[] {
  return Object.keys(SLOT_TO_MAIN_CATEGORIES) as Slot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Slot-Based Item Helpers (for filtering without hardcoded category comparisons)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Item-like type for slot checking - supports both snake_case and camelCase.
 */
type ItemLike = {main_category?: string | null; mainCategory?: string | null};

/**
 * Gets the category from an item (handles both naming conventions).
 */
function getCategoryFromItem(item: ItemLike): string | null | undefined {
  return item.main_category ?? item.mainCategory;
}

/**
 * Checks if an item belongs to a specific slot.
 * Use this instead of: item.main_category === 'Tops'
 *
 * @example
 * // Instead of: item.main_category === 'Tops'
 * isSlot(item, 'tops')
 *
 * // Instead of: item.main_category === 'Bottoms' || item.main_category === 'Skirts'
 * isSlot(item, 'bottoms') // automatically includes Skirts
 */
export function isSlot(item: ItemLike, slot: Slot): boolean {
  return mapMainCategoryToSlot(getCategoryFromItem(item)) === slot;
}

/**
 * Checks if an item belongs to any of the specified slots.
 *
 * @example
 * isAnySlot(item, ['tops', 'dresses']) // true if top or dress
 */
export function isAnySlot(item: ItemLike, slots: Slot[]): boolean {
  const itemSlot = mapMainCategoryToSlot(getCategoryFromItem(item));
  return slots.includes(itemSlot);
}

/**
 * Gets the slot of an item.
 *
 * @example
 * const slot = getSlot(item); // 'tops', 'bottoms', etc.
 */
export function getSlot(item: ItemLike): Slot {
  return mapMainCategoryToSlot(getCategoryFromItem(item));
}

/**
 * Filter items by slot.
 *
 * @example
 * const tops = filterBySlot(catalog, 'tops');
 * const bottoms = filterBySlot(catalog, 'bottoms'); // includes Skirts
 */
export function filterBySlot<T extends ItemLike>(items: T[], slot: Slot): T[] {
  return items.filter(item => isSlot(item, slot));
}

/**
 * Find first item matching a slot.
 *
 * @example
 * const top = findBySlot(items, 'tops');
 */
export function findBySlot<T extends ItemLike>(
  items: T[],
  slot: Slot,
): T | undefined {
  return items.find(item => isSlot(item, slot));
}

/**
 * Group items by their slot.
 *
 * @example
 * const grouped = groupBySlot(catalog);
 * // { tops: [...], bottoms: [...], shoes: [...], ... }
 */
export function groupBySlot<T extends ItemLike>(items: T[]): Record<Slot, T[]> {
  const result: Record<Slot, T[]> = {
    tops: [],
    bottoms: [],
    shoes: [],
    outerwear: [],
    accessories: [],
    dresses: [],
    activewear: [],
    swimwear: [],
    undergarments: [],
    other: [],
  };

  for (const item of items) {
    const slot = getSlot(item);
    result[slot].push(item);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports for tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Total number of MainCategories (for test assertions).
 */
export const MAIN_CATEGORY_COUNT = 21;

/**
 * Total number of Slots (for test assertions).
 */
export const SLOT_COUNT = 10;
