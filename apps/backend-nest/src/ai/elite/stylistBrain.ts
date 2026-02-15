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
  budget_min: number | null;
  budget_max: number | null;
  body_type: string | null;
  climate: string | null;
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

function resolvePresentation(raw: string | null | undefined): 'masculine' | 'feminine' | 'mixed' {
  const gp = (raw || '').toLowerCase().replace(/[\s_-]+/g, '');
  // Check female/feminine FIRST — 'female'.includes('male') is true in JS!
  if (gp.includes('female') || gp.includes('feminin') || gp === 'woman') return 'feminine';
  if (gp.includes('male') || gp.includes('masculin') || gp === 'man') return 'masculine';
  return 'mixed';
}

// ── Style Profile Row Parser ────────────────────────────────────────────────

function parseStyleProfileRow(row: Record<string, unknown>): StyleProfileFields {
  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  return {
    fit_preferences: toStringArray(row.fit_preferences),
    fabric_preferences: toStringArray(row.fabric_preferences),
    favorite_colors: toStringArray(row.favorite_colors),
    disliked_styles: toStringArray(row.disliked_styles),
    style_preferences: toStringArray(row.style_preferences),
    preferred_brands: toStringArray(row.preferred_brands),
    budget_min: typeof row.budget_min === 'number' ? row.budget_min : null,
    budget_max: typeof row.budget_max === 'number' ? row.budget_max : null,
    body_type: typeof row.body_type === 'string' ? row.body_type : null,
    climate: typeof row.climate === 'string' ? row.climate : null,
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
        pool.query(
          'SELECT gender_presentation FROM users WHERE id = $1 LIMIT 1',
          [userId],
        ).then(r => r.rows[0]?.gender_presentation as string | undefined)
          .catch(() => undefined),

        // Leg 2: style profile
        pool.query(
          `SELECT fit_preferences, fabric_preferences, favorite_colors,
                  disliked_styles, style_preferences, preferred_brands,
                  budget_min, budget_max, body_type, climate
           FROM style_profiles WHERE user_id = $1`,
          [userId],
        ).then(r => r.rows[0] ?? null)
          .catch(() => null),

        // Leg 3: fashion state summary (already has internal timeout)
        fashionStateService.getStateSummary(userId).catch(() => null),
      ]),
      // Overall timeout
      new Promise<null>(resolve => setTimeout(() => resolve(null), BRAIN_TIMEOUT_MS)),
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
