import { pool } from '../db/pool';
import type { ExtractedFeatures } from './dto/learning-event.dto';

/**
 * Extracts wardrobe-item features from an outfit for learning event enrichment.
 * Queries outfit_suggestions then custom_outfits for the outfit's item IDs,
 * then fetches wardrobe metadata for those items.
 *
 * Returns {} on any error (fire-and-forget safe).
 */
export async function extractOutfitFeatures(
  outfitId: string,
): Promise<ExtractedFeatures> {
  try {
    let itemIds: string[] = [];

    for (const table of ['outfit_suggestions', 'custom_outfits']) {
      const { rows } = await pool.query(
        `SELECT top_id, bottom_id, shoes_id, accessory_ids FROM ${table} WHERE id = $1 LIMIT 1`,
        [outfitId],
      );
      if (rows.length > 0) {
        const row = rows[0];
        const accessories: string[] = Array.isArray(row.accessory_ids)
          ? row.accessory_ids
          : [];
        itemIds = [
          row.top_id,
          row.bottom_id,
          row.shoes_id,
          ...accessories,
        ].filter(Boolean);
        break;
      }
    }

    if (itemIds.length === 0) return {};

    const { rows: items } = await pool.query(
      `SELECT id, brand, color, color_family, main_category, subcategory,
              material, style_descriptors, style_archetypes
       FROM wardrobe_items WHERE id = ANY($1)`,
      [itemIds],
    );

    if (items.length === 0) return {};

    const dedupe = (arr: string[]) => [...new Set(arr)];

    return {
      item_ids: dedupe(itemIds),
      categories: dedupe(
        items.flatMap((i) => [i.main_category, i.subcategory]).filter(Boolean),
      ),
      brands: dedupe(items.map((i) => i.brand).filter(Boolean)),
      colors: dedupe(
        items.flatMap((i) => [i.color, i.color_family]).filter(Boolean),
      ),
      styles: dedupe(
        items
          .flatMap((i) => [
            ...(Array.isArray(i.style_descriptors) ? i.style_descriptors : []),
            ...(Array.isArray(i.style_archetypes) ? i.style_archetypes : []),
          ])
          .filter((v) => typeof v === 'string' && v !== ''),
      ),
      materials: dedupe(items.map((i) => i.material).filter(Boolean)),
    };
  } catch {
    return {};
  }
}
