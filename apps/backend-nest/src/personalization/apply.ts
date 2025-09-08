import type { Pool } from 'pg';
import { extractFeaturesFromOutfit, OutfitCandidate } from './features';

type Weights = {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
  epsilon: number;
};
const DEFAULT_W: Weights = {
  alpha: 0.2,
  beta: 0.3,
  gamma: 0.05,
  delta: 0.1,
  epsilon: 0.05,
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

async function fetchUserMaps(pool: Pool, userId: string) {
  const [feat, item] = await Promise.all([
    pool.query(
      'SELECT feature, score FROM user_pref_feature WHERE user_id = $1',
      [userId],
    ),
    pool.query('SELECT item_id, score FROM user_pref_item WHERE user_id = $1', [
      userId,
    ]),
  ]);
  const featMap = new Map<string, number>(
    feat.rows.map((r: any) => [r.feature, Number(r.score)]),
  );
  const itemMap = new Map<string, number>(
    item.rows.map((r: any) => [r.item_id, Number(r.score)]),
  );
  return { featMap, itemMap };
}

async function fetchGlobalMaps(pool: Pool, itemIds: string[]) {
  const [gf, gi] = await Promise.all([
    pool.query('SELECT feature, score FROM global_feature_quality'),
    itemIds.length
      ? pool.query(
          'SELECT item_id, score FROM global_item_quality WHERE item_id = ANY($1)',
          [itemIds],
        )
      : { rows: [] as any[] },
  ]);
  const gFeat = new Map<string, number>(
    gf.rows.map((r: any) => [r.feature, Number(r.score)]),
  );
  const gItem = new Map<string, number>(
    gi.rows.map((r: any) => [r.item_id, Number(r.score)]),
  );
  return { gFeat, gItem };
}

function hardBlocks(
  itemMap: Map<string, number>,
  outfit: OutfitCandidate,
): boolean {
  for (const id of outfit.item_ids) {
    const s = itemMap.get(id);
    if (s !== undefined && s <= -4) return true;
  }
  return false;
}

export async function applyPersonalizationAndExploration(opts: {
  pool: Pool;
  userId: string;
  baseOutfits: OutfitCandidate[]; // sorted by base_score
  context?: any;
  weights?: Partial<Weights>;
  explorationRate?: number;
  recentShownItemIds?: string[];
}) {
  const {
    pool,
    userId,
    baseOutfits,
    context = {},
    weights = {},
    explorationRate = 0.1,
    recentShownItemIds = [],
  } = opts;
  const W = { ...DEFAULT_W, ...weights };

  const allItemIds = Array.from(
    new Set(baseOutfits.flatMap((o) => o.item_ids)),
  );
  const [{ featMap, itemMap }, { gFeat, gItem }] = await Promise.all([
    fetchUserMaps(pool, userId),
    fetchGlobalMaps(pool, allItemIds),
  ]);

  const rescored = baseOutfits
    .filter((o) => !hardBlocks(itemMap, o))
    .map((o) => {
      const feats = extractFeaturesFromOutfit(o);
      const personal = feats.length
        ? feats.reduce((acc, f) => acc + (featMap.get(f) ?? 0), 0) /
          feats.length
        : 0;

      const item_bias = o.item_ids.length
        ? o.item_ids.reduce((acc, id) => acc + (itemMap.get(id) ?? 0), 0) /
          o.item_ids.length
        : 0;

      const gItemAvg = o.item_ids.length
        ? o.item_ids.reduce((acc, id) => acc + (gItem.get(id) ?? 0), 0) /
          o.item_ids.length
        : 0;

      const gFeatAvg = feats.length
        ? feats.reduce((acc, f) => acc + (gFeat.get(f) ?? 0), 0) / feats.length
        : 0;

      const diversity = o.item_ids.some(
        (id) => !recentShownItemIds.includes(id),
      )
        ? 1
        : 0;

      const boost = clamp(
        W.alpha * personal +
          W.beta * item_bias +
          W.gamma * diversity +
          W.delta * gItemAvg +
          W.epsilon * gFeatAvg,
        -0.5,
        0.5,
      );

      return { ...o, final_score: o.base_score + boost };
    })
    .sort((a, b) => b.final_score - a.final_score);

  // Exploration: small chance to swap 1 item in top outfit
  let chosen = rescored[0];
  if (rescored.length && Math.random() < explorationRate) {
    const poolItems = Array.from(
      new Set(rescored.slice(0, 10).flatMap((o) => o.item_ids)),
    );
    const avoid = new Set(chosen.item_ids);
    const candidates = poolItems.filter(
      (id) => !avoid.has(id) && !recentShownItemIds.includes(id),
    );
    if (candidates.length) {
      const idx = Math.floor(Math.random() * chosen.item_ids.length);
      const swapId = candidates[Math.floor(Math.random() * candidates.length)];
      const newIds = chosen.item_ids.slice();
      newIds[idx] = swapId;
      chosen = {
        ...chosen,
        outfit_id: `${chosen.outfit_id}#x`,
        item_ids: newIds,
        final_score: chosen.final_score - 0.01,
      };
    }
  }

  return { rescored, chosen, debug_weights: W, context_used: context };
}
