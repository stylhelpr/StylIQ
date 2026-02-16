/**
 * Stylist Brain — Unified Style Context Loader
 *
 * Single entry point for fetching all style-related user data:
 * - gender_presentation (users table)
 * - style profile fields (style_profiles table)
 * - fashion state summary (learning-derived)
 *
 * Fail-open: any individual leg can fail without blocking the others.
 * 200ms overall timeout — returns partial/empty on timeout.
 */

import { pool } from '../../db/pool';
import type { FashionStateSummary } from '../../learning/dto/fashion-state.dto';
import type { FashionStateService } from '../../learning/fashion-state.service';

// ── Types ───────────────────────────────────────────────────────────────────

export interface StyleProfileFields {
  fit_preferences: string[];
  fabric_preferences: string[];
  favorite_colors: string[];
  disliked_styles: string[];
  style_preferences: string[];
  preferred_brands: string[];
  occasions: string[];
  body_type: string | null;
  climate: string | null;

  // P0 hard vetoes
  coverage_no_go: string[];
  avoid_colors: string[];
  avoid_materials: string[];
  formality_floor: string | null;
  walkability_requirement: string | null;

  // P1 soft preferences
  pattern_preferences: string[];
  avoid_patterns: string[];
  silhouette_preference: string | null;
  care_tolerance: string | null;
  metal_preference: string | null;
  contrast_preference: string | null;
  footwear_comfort: string | null;
  foot_width: string | null;

  // Coloring
  skin_tone: string | null;
  undertone: string | null;
  hair_color: string | null;
  eye_color: string | null;

  // Body & proportions
  proportions: string | null;
  height: number | null;
  weight: number | null;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  shoulder_width: number | null;
  inseam: number | null;
  shoe_size: number | null;

  // Extra preference fields
  color_preferences: string[];
  unit_preference: string | null;
  prefs_jsonb: Record<string, unknown> | null;

  // LLM-only context
  fashion_boldness: string | null;
  trend_appetite: string | null;
  fashion_confidence: string | null;
  budget_min: number | null;
  budget_max: number | null;
  style_icons: string[];
  daily_activities: string[];
  personality_traits: string[];
  lifestyle_notes: string | null;
}

export interface StylistBrainContext {
  /** User's gender presentation from users table */
  presentation: 'masculine' | 'feminine' | 'mixed';

  /** Canonical style profile fields from style_profiles */
  styleProfile: StyleProfileFields | null;

  /** Learning-derived fashion state (null if cold start or unavailable) */
  fashionState: FashionStateSummary | null;
}

// ── Presentation Resolver ───────────────────────────────────────────────────

function resolvePresentation(
  raw: string | null | undefined,
): 'masculine' | 'feminine' | 'mixed' {
  const gp = (raw || '').toLowerCase().replace(/[\s_-]+/g, '');
  // Check female/feminine FIRST — 'female'.includes('male') is true in JS!
  if (gp.includes('female') || gp.includes('feminin') || gp === 'woman')
    return 'feminine';
  if (gp.includes('male') || gp.includes('masculin') || gp === 'man')
    return 'masculine';
  return 'mixed';
}

// ── Style Profile Row Parser ────────────────────────────────────────────────

function parseStyleProfileRow(
  row: Record<string, unknown>,
): StyleProfileFields {
  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  const toNullableString = (v: unknown): string | null =>
    typeof v === 'string' ? v : null;

  const toNullableNumber = (v: unknown): number | null =>
    typeof v === 'number' && isFinite(v) ? v : null;

  return {
    fit_preferences: toStringArray(row.fit_preferences),
    fabric_preferences: toStringArray(row.fabric_preferences),
    favorite_colors: toStringArray(row.favorite_colors),
    disliked_styles: toStringArray(row.disliked_styles),
    style_preferences: toStringArray(row.style_preferences),
    preferred_brands: toStringArray(row.preferred_brands),
    occasions: toStringArray(row.occasions),
    body_type: toNullableString(row.body_type),
    climate: toNullableString(row.climate),

    // P0 hard vetoes
    coverage_no_go: toStringArray(row.coverage_no_go),
    avoid_colors: toStringArray(row.avoid_colors),
    avoid_materials: toStringArray(row.avoid_materials),
    formality_floor: toNullableString(row.formality_floor),
    walkability_requirement: toNullableString(row.walkability_requirement),

    // P1 soft preferences
    pattern_preferences: toStringArray(row.pattern_preferences),
    avoid_patterns: toStringArray(row.avoid_patterns),
    silhouette_preference: toNullableString(row.silhouette_preference),
    care_tolerance: toNullableString(row.care_tolerance),
    metal_preference: toNullableString(row.metal_preference),
    contrast_preference: toNullableString(row.contrast_preference),
    footwear_comfort: toNullableString(row.footwear_comfort),
    foot_width: toNullableString(row.foot_width),

    // Coloring
    skin_tone: toNullableString(row.skin_tone),
    undertone: toNullableString(row.undertone),
    hair_color: toNullableString(row.hair_color),
    eye_color: toNullableString(row.eye_color),

    // Body & proportions
    proportions: toNullableString(row.proportions),
    height: toNullableNumber(row.height),
    weight: toNullableNumber(row.weight),
    chest: toNullableNumber(row.chest),
    waist: toNullableNumber(row.waist),
    hip: toNullableNumber(row.hip),
    shoulder_width: toNullableNumber(row.shoulder_width),
    inseam: toNullableNumber(row.inseam),
    shoe_size: toNullableNumber(row.shoe_size),

    // Extra preference fields
    color_preferences: toStringArray(row.color_preferences),
    unit_preference: toNullableString(row.unit_preference),
    prefs_jsonb:
      row.prefs_jsonb && typeof row.prefs_jsonb === 'object'
        ? (row.prefs_jsonb as Record<string, unknown>)
        : null,

    // LLM-only context
    fashion_boldness: toNullableString(row.fashion_boldness),
    trend_appetite: toNullableString(row.trend_appetite),
    fashion_confidence: toNullableString(row.fashion_confidence),
    budget_min: toNullableNumber(row.budget_min),
    budget_max: toNullableNumber(row.budget_max),
    style_icons: toStringArray(row.style_icons),
    daily_activities: toStringArray(row.daily_activities),
    personality_traits: toStringArray(row.personality_traits),
    lifestyle_notes: toNullableString(row.lifestyle_notes),
  };
}

// ── Main Loader ─────────────────────────────────────────────────────────────

const BRAIN_TIMEOUT_MS = 200;

/**
 * Load unified style context for a user. Fail-open on any failure.
 *
 * @param userId - Auth user ID
 * @param fashionStateService - Injected FashionStateService instance
 */
export async function loadStylistBrainContext(
  userId: string,
  fashionStateService: FashionStateService,
): Promise<StylistBrainContext> {
  const defaults: StylistBrainContext = {
    presentation: 'mixed',
    styleProfile: null,
    fashionState: null,
  };

  try {
    const result = await Promise.race([
      Promise.all([
        // Leg 1: gender_presentation
        pool
          .query(
            'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
            [userId],
          )
          .then((r) => r.rows[0]?.gender_presentation as string | undefined)
          .catch(() => undefined),

        // Leg 2: style profile
        pool
          .query(
            `SELECT fit_preferences, fabric_preferences, favorite_colors,
                  disliked_styles, style_preferences, preferred_brands,
                  occasions, body_type, climate,
                  coverage_no_go, avoid_colors, avoid_materials,
                  formality_floor, walkability_requirement,
                  pattern_preferences, avoid_patterns, silhouette_preference,
                  care_tolerance, metal_preference, contrast_preference,
                  footwear_comfort, foot_width,
                  skin_tone, undertone, hair_color, eye_color,
                  proportions, height, weight, chest, waist, hip,
                  shoulder_width, inseam, shoe_size,
                  color_preferences, unit_preference, prefs_jsonb,
                  fashion_boldness, trend_appetite, fashion_confidence,
                  budget_min, budget_max, style_icons, daily_activities,
                  personality_traits, lifestyle_notes
           FROM style_profiles WHERE user_id = $1`,
            [userId],
          )
          .then((r) => r.rows[0] ?? null)
          .catch(() => null),

        // Leg 3: fashion state summary (already has internal timeout)
        fashionStateService.getStateSummary(userId).catch(() => null),
      ]),
      // Overall timeout
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), BRAIN_TIMEOUT_MS),
      ),
    ]);

    if (!result || !Array.isArray(result)) return defaults;

    const [genderRaw, profileRow, fashionState] = result;

    return {
      presentation: resolvePresentation(genderRaw),
      styleProfile: profileRow ? parseStyleProfileRow(profileRow) : null,
      fashionState: fashionState ?? null,
    };
  } catch {
    return defaults;
  }
}
