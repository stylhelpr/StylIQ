/**
 * tripsTasteGate.ts — Trips-scoped adapter for shared brain avoid-list contracts.
 * Mirrors: tasteValidator.ts avoid_colors (P0), avoid_materials (P0),
 *          avoid_patterns (P0), coverage_no_go (P0)
 *
 * LOCKED: Does NOT import any shared backend modules.
 */
import {TripWardrobeItem} from '../../types/trips';

export interface TripsTasteProfile {
  avoid_colors: string[];
  avoid_materials: string[];
  avoid_patterns: string[];
  coverage_no_go: string[];
}

// Color family expansion (mirrors stylistQualityGate.expandStylistAvoidColors)
const COLOR_FAMILIES: Record<string, string[]> = {
  red: ['red', 'crimson', 'scarlet', 'burgundy', 'maroon', 'wine', 'brick', 'rust', 'cherry'],
  blue: ['blue', 'navy', 'cobalt', 'indigo', 'sapphire', 'teal', 'cerulean', 'azure'],
  green: ['green', 'olive', 'sage', 'forest', 'emerald', 'moss', 'hunter', 'lime'],
  pink: ['pink', 'blush', 'rose', 'fuchsia', 'magenta', 'mauve', 'coral', 'salmon'],
  purple: ['purple', 'plum', 'violet', 'lavender', 'lilac', 'eggplant', 'amethyst'],
  orange: ['orange', 'tangerine', 'peach', 'apricot', 'amber', 'copper'],
  yellow: ['yellow', 'gold', 'mustard', 'lemon', 'saffron', 'honey'],
  brown: ['brown', 'tan', 'chocolate', 'camel', 'khaki', 'sienna', 'taupe', 'espresso'],
  white: ['white', 'ivory', 'cream', 'off-white', 'snow', 'pearl', 'alabaster'],
  black: ['black', 'charcoal', 'jet', 'onyx', 'ebony'],
  grey: ['grey', 'gray', 'silver', 'slate', 'ash', 'pewter', 'stone'],
  beige: ['beige', 'nude', 'oatmeal', 'sand', 'champagne'],
};

export function expandAvoidColors(avoidColors: string[]): string[] {
  const expanded = new Set<string>();
  for (const c of avoidColors) {
    const cl = c.toLowerCase().trim();
    expanded.add(cl);
    for (const [family, members] of Object.entries(COLOR_FAMILIES)) {
      if (members.includes(cl) || cl === family) {
        members.forEach(m => expanded.add(m));
      }
    }
  }
  return [...expanded];
}

// Coverage keyword map (mirrors tasteValidator.ts COVERAGE_MAP)
const COVERAGE_MAP: Record<string, string[]> = {
  'no midriff exposure': ['crop', 'cropped', 'crop top', 'midriff'],
  'no leg exposure': ['shorts', 'mini', 'micro', 'short shorts'],
  'no shoulder exposure': ['strapless', 'off-shoulder', 'off shoulder', 'one shoulder', 'spaghetti'],
  'no cleavage': ['low cut', 'plunge', 'deep v', 'deep-v'],
  'no back exposure': ['backless', 'open back', 'open-back'],
  'no sheer': ['sheer', 'see-through', 'see through', 'mesh', 'transparent'],
};

export function tripsTasteGate(
  item: {name?: string; color?: string; material?: string; subcategory?: string},
  profile: TripsTasteProfile,
): {blocked: boolean; reason?: string} {
  const text = `${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
  const mat = (item.material ?? '').toLowerCase();
  const colors = (item.color ?? '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);

  // P0: Avoid colors (expanded families)
  if (profile.avoid_colors.length > 0) {
    const expandedColors = expandAvoidColors(profile.avoid_colors);
    for (const ic of colors) {
      if (expandedColors.some(ac => ic === ac || ic.includes(ac) || ac.includes(ic))) {
        return {blocked: true, reason: `VETO_COLOR: ${ic}`};
      }
    }
  }

  // P0: Avoid materials
  for (const am of profile.avoid_materials) {
    if (mat.includes(am.toLowerCase())) {
      return {blocked: true, reason: `VETO_MATERIAL: ${am}`};
    }
  }

  // P0: Avoid patterns
  for (const ap of profile.avoid_patterns) {
    if (text.includes(ap.toLowerCase()) || mat.includes(ap.toLowerCase())) {
      return {blocked: true, reason: `VETO_PATTERN: ${ap}`};
    }
  }

  // P0: Coverage no-go
  for (const rule of profile.coverage_no_go) {
    const keywords = COVERAGE_MAP[rule.toLowerCase()] ?? [rule.toLowerCase()];
    if (keywords.some(kw => text.includes(kw))) {
      return {blocked: true, reason: `VETO_COVERAGE: ${rule}`};
    }
  }

  return {blocked: false};
}

/**
 * Batch filter: applies tripsTasteGate to a candidate pool.
 * Emergency fallback: if ALL candidates are vetoed, returns original pool.
 */
export function filterByTasteGate(
  candidates: TripWardrobeItem[],
  profile: TripsTasteProfile | undefined,
): TripWardrobeItem[] {
  if (!profile) return candidates;
  const hasAnyRule = profile.avoid_colors.length > 0 ||
    profile.avoid_materials.length > 0 ||
    profile.avoid_patterns.length > 0 ||
    profile.coverage_no_go.length > 0;
  if (!hasAnyRule) return candidates;

  const allowed = candidates.filter(item => !tripsTasteGate(item, profile).blocked);
  // Emergency fallback: if entire category gated to 0, preserve pool
  if (allowed.length === 0) return candidates;
  return allowed;
}
