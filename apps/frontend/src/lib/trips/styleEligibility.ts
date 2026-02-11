/**
 * styleEligibility.ts
 *
 * Reusable eligibility filter for trips packing.
 * Ensures masculine profiles never receive feminine-only items
 * unless the user explicitly requests them.
 */

import type {TripWardrobeItem} from '../../types/trips';
import {inferGarmentFlags} from './capsuleEngine';

// ── Types ──

export type Presentation = 'masculine' | 'feminine' | 'mixed';

// ── Constants ──

/** Main categories that are exclusively feminine */
const FEMININE_ONLY_MAIN_CATEGORIES = new Set([
  'Dresses',
  'Skirts',
]);

/** Override keywords: if user prompt contains any of these, allow feminine items */
const FEMININE_OVERRIDE_KEYWORDS = [
  'dress',
  'skirt',
  'gown',
  'blouse',
  'heel',
  'heels',
  'feminine',
  'women',
  "women's",
  'she/her',
  'halter',
];

// ── Public API ──

/**
 * Maps the user's stored `gender_presentation` value to a Presentation type.
 *
 * DB values (normalized in onboarding): "male", "female", "other", "non-binary", "rather_not_say"
 * Picker values (before normalization): "Male", "Female", "Other", "Non-binary", "Rather Not Say"
 */
export function normalizeGenderToPresentation(
  genderPresentation: string | undefined | null,
): Presentation {
  if (!genderPresentation) return 'mixed';
  const g = genderPresentation.toLowerCase().replace(/[\s_-]+/g, '');

  if (g === 'male') return 'masculine';
  if (g === 'female') return 'feminine';
  // "other", "nonbinary", "rathernotsay", empty → mixed (allow all)
  return 'mixed';
}

/**
 * Returns true if a wardrobe item is eligible for the user's presentation.
 *
 * Masculine profiles:
 *   - EXCLUDE items flagged as isFeminineOnly (dresses, skirts, blouses, gowns,
 *     heels, ballet flats, earrings, bracelets, anklets, purses)
 *   - EXCLUDE items whose main_category is in FEMININE_ONLY_MAIN_CATEGORIES
 *
 * Feminine / mixed / unknown:
 *   - Allow all items
 */
export function isItemEligibleForProfile(
  item: TripWardrobeItem,
  presentation: Presentation,
): boolean {
  if (presentation !== 'masculine') return true;

  // Check main_category hard block
  if (item.main_category && FEMININE_ONLY_MAIN_CATEGORIES.has(item.main_category)) {
    return false;
  }

  // Check inferred garment flags (covers subcategory-level detection)
  const flags = inferGarmentFlags(item);
  if (flags.isFeminineOnly) return false;

  return true;
}

/**
 * Filters a wardrobe array to only items eligible for the given presentation.
 */
export function filterEligibleItems(
  items: TripWardrobeItem[],
  presentation: Presentation,
): TripWardrobeItem[] {
  if (presentation !== 'masculine') return items;
  return items.filter(item => isItemEligibleForProfile(item, presentation));
}

/**
 * Returns true if the user's prompt text contains keywords that indicate
 * an explicit request for feminine items (e.g. "pack a dress", "add heels").
 *
 * This is used to temporarily override the masculine block.
 */
export function hasFeminineOverride(promptText: string | undefined | null): boolean {
  if (!promptText) return false;
  const lower = promptText.toLowerCase();
  return FEMININE_OVERRIDE_KEYWORDS.some(kw => lower.includes(kw));
}
