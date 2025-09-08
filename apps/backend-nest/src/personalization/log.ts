import type { Pool } from 'pg';
import { extractFeaturesFromOutfit, OutfitCandidate } from './features';

export async function logGeneration(
  pool: Pool,
  data: {
    request_id: string;
    user_id: string;
    query?: string;
    context?: any;
    weights?: any;
    candidates: OutfitCandidate[];
    chosen: OutfitCandidate;
  },
) {
  await pool.query(
    `INSERT INTO outfit_generations (request_id, user_id, query, context_json, weights_json, candidates_json, chosen_outfit_json)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb)`,
    [
      data.request_id,
      data.user_id,
      data.query ?? null,
      JSON.stringify(data.context ?? {}),
      JSON.stringify(data.weights ?? {}),
      JSON.stringify(data.candidates),
      JSON.stringify(data.chosen),
    ],
  );
}

function deltaFromRating(rating: number) {
  if (rating === -1) return -1;
  if (rating === 1) return +1;
  if (rating >= 2 && rating <= 5) return (rating - 3) * 0.7;
  return 0;
}

export async function recordFeedbackAndUpdatePrefs(
  pool: Pool,
  payload: {
    request_id: string;
    user_id: string;
    outfit: {
      outfit_id: string;
      item_ids: string[];
      items?: any[];
      [k: string]: any;
    };
    rating: number; // -1 or 1..5
    tags?: string[];
    notes?: string;
  },
) {
  const { request_id, user_id, outfit, rating, tags = [], notes } = payload;

  await pool.query(
    `INSERT INTO outfit_feedback_events (request_id, user_id, outfit_json, rating, tags, notes)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6)`,
    [request_id, user_id, JSON.stringify(outfit), rating, tags, notes ?? null],
  );

  const d = deltaFromRating(rating);
  if (d === 0) return;

  const now = new Date().toISOString();
  const features = extractFeaturesFromOutfit({
    outfit_id: outfit.outfit_id,
    item_ids: outfit.item_ids,
    base_score: 0,
    items: outfit.items,
    meta: (outfit as any).meta,
  });

  // Per-feature
  for (const f of features) {
    await pool.query(
      `INSERT INTO user_pref_feature (user_id, feature, score, updated_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, feature) DO UPDATE
         SET score = LEAST(5, GREATEST(-5, user_pref_feature.score + $3)),
             updated_at = EXCLUDED.updated_at`,
      [user_id, f, d, now],
    );
    await pool.query(
      `INSERT INTO global_feature_quality (feature, score, updated_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (feature) DO UPDATE
         SET score = LEAST(5, GREATEST(-5, global_feature_quality.score + $2)),
             updated_at = EXCLUDED.updated_at`,
      [f, d, now],
    );
  }

  // Per-item
  for (const id of outfit.item_ids) {
    await pool.query(
      `INSERT INTO user_pref_item (user_id, item_id, score, updated_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, item_id) DO UPDATE
         SET score = LEAST(5, GREATEST(-5, user_pref_item.score + $3)),
             updated_at = EXCLUDED.updated_at`,
      [user_id, id, d * 2, now],
    );
    await pool.query(
      `INSERT INTO global_item_quality (item_id, score, updated_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (item_id) DO UPDATE
         SET score = LEAST(5, GREATEST(-5, global_item_quality.score + $2)),
             updated_at = EXCLUDED.updated_at`,
      [id, d, now],
    );
  }
}
