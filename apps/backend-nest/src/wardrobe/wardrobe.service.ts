// apps/backend-nest/src/wardrobe/wardrobe.service.ts

import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Storage } from '@google-cloud/storage';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { DeleteItemDto } from './dto/delete-item.dto';
import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
import { VertexService } from '../vertex/vertex.service';
import { randomUUID } from 'crypto'; // ← NEW

// NEW imports for extracted logic (prompts + scoring only)
import { parseConstraints } from './logic/constraints';
import {
  rerankCatalogWithContext,
  DEFAULT_CONTEXT_WEIGHTS,
  type ContextWeights,
} from './logic/scoring';
import type { UserStyle } from './logic/style';
import type { WeatherContext } from './logic/weather';
import { finalizeOutfitSlots } from './logic/finalize';
import { enforceConstraintsOnOutfits } from './logic/enforce';
import { buildOutfitPrompt } from './prompts/outfitPrompt';
import { extractStrictJson } from './logic/json';
import { applyContextualFilters } from './logic/contextFilters';
import { STYLE_AGENTS } from './logic/style-agents';

// NEW: feedback filters
import {
  applyFeedbackFilters,
  compileFeedbackRulesFromRows,
  OutfitFeedbackRow, // ✅ correct type
} from './logic/feedbackFilters';

/**
 * Postgres connection pool.
 * - SSL enabled for managed DBs.
 * - Used for all CRUD on wardrobe_items table.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Google Cloud Storage client.
 * - Used to delete images from GCS when wardrobe items are removed.
 */
const storage = new Storage();

// ─────────────────────────────────────────────────────────────────────────────
// Catalog typing + coercion helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The shape of an item the "catalog" (Pinecone search results) feeds into the
 * outfit generator. This is a lightweight, prompt-friendly view.
 */
type CatalogItem = {
  index: number;
  id: string;
  label: string;
  image_url?: string;

  // core used by all scorers
  main_category?: string;
  subcategory?: string;
  color?: string;
  color_family?: string;
  shoe_style?: string;
  dress_code?: string;
  formality_score?: number;

  // extras used by style/weather scorers (all optional)
  brand?: string;
  material?: string;
  sleeve_length?: string;
  layering?: string; // 'Base' | 'Mid' | 'Outer'
  waterproof_rating?: number | string;
  rain_ok?: boolean;
};

// ── Weights normalization helpers ────────────────────────────────────────────
type WeightsLong = {
  constraintsWeight: number;
  styleWeight: number;
  weatherWeight: number;
  feedbackWeight?: number;
};
type WeightsShort = {
  constraints: number;
  style: number;
  weather: number;
  feedback?: number;
};
type AnyWeights = WeightsLong | WeightsShort;

function toLongWeights(w: AnyWeights): WeightsLong {
  if ('styleWeight' in w) return { ...w };
  return {
    constraintsWeight: w.constraints,
    styleWeight: w.style,
    weatherWeight: w.weather,
    feedbackWeight: w.feedback,
  };
}
// function fromLongWeights(longW: WeightsLong, like: AnyWeights): AnyWeights {
//   if ('styleWeight' in like) return { ...longW };
//   return {
//     constraints: longW.constraintsWeight,
//     style: longW.styleWeight,
//     weather: longW.weatherWeight,
//     feedback: longW.feedbackWeight,
//   };
// }

function fromLongWeights(longW: WeightsLong, like: AnyWeights): AnyWeights {
  if ('styleWeight' in like) {
    // Convert frontend shape → short shape
    return {
      constraints: like.constraintsWeight ?? longW.constraintsWeight,
      style: like.styleWeight ?? longW.styleWeight,
      weather: like.weatherWeight ?? longW.weatherWeight,
      feedback: like.feedbackWeight ?? longW.feedbackWeight,
    };
  }
  // Already in short shape → just normalize from long
  return {
    constraints: longW.constraintsWeight,
    style: longW.styleWeight,
    weather: longW.weatherWeight,
    feedback: longW.feedbackWeight,
  };
}

// Soft numeric prefs derived from feedback rules (only for rerank nudges)
function buildUserPrefsFromRules(
  catalog: Array<{
    id?: string;
    label?: string;
    subcategory?: string;
    main_category?: string;
    color?: string;
    color_family?: string;
  }>,
  rules: ReturnType<typeof compileFeedbackRulesFromRows>,
): Map<string, number> {
  const m = new Map<string, number>();
  if (!rules?.length || !catalog?.length) return m;

  const lc = (v?: string) => (v ?? '').toLowerCase();

  // mirror the predicate logic lightly to issue a -5 soft penalty
  const hit = (it: any): boolean => {
    const id = it?.id;
    const brand = lc((it as any).brand);
    const color = lc((it as any).color) || lc((it as any).color_family);
    const main = lc((it as any).main_category);
    const sub = lc((it as any).subcategory);
    const lbl = lc((it as any).label);

    for (const r of rules) {
      switch (r.kind) {
        case 'excludeItemIds':
          if (id && r.item_ids.includes(id)) return true;
          break;
        case 'excludeBrand':
          if (brand && brand.includes(lc(r.brand))) {
            if (!r.category) return true;
            if (main.includes(lc(r.category))) return true;
          }
          break;
        case 'excludeColorOnCategory':
          if (
            r.category &&
            (main.includes(r.category) || sub.includes(r.category))
          ) {
            if (color.includes(r.color)) return true;
            if (lbl.includes(r.color)) return true;
          }
          break;
        case 'excludeColor':
          if (color.includes(r.color) || lbl.includes(r.color)) return true;
          break;
        case 'excludeSubstring':
          if ((r.field === 'label' ? lbl : sub).includes(lc(r.value))) {
            if (!r.category) return true;
            if (main.includes(lc(r.category))) return true;
          }
          break;
      }
    }
    return false;
  };

  for (const it of catalog) {
    const id = it?.id;
    if (!id) continue;
    if (hit(it)) m.set(id, -5); // -5 raw → scaled to ~ -0.2 in reranker
  }
  return m;
}

@Injectable()
export class WardrobeService {
  constructor(private readonly vertex: VertexService) {}

  // ─────────────────────────────────────────────────────────────
  // Enum whitelists
  // ─────────────────────────────────────────────────────────────

  private static readonly PATTERN_ENUM_WHITELIST: string[] = [
    'SOLID',
    'STRIPE',
    'CHECK',
    'HERRINGBONE',
    'WINDOWPANE',
    'FLORAL',
    'DOT',
    'CAMO',
    'ABSTRACT',
    'OTHER',
  ];
  private static readonly SEASONALITY_ENUM_WHITELIST: string[] = [
    'SS',
    'FW',
    'ALL_SEASON',
  ];
  private static readonly LAYERING_ENUM_WHITELIST: string[] = [
    'BASE',
    'MID',
    'SHELL',
    'ACCENT',
  ];

  // Generic safe-casters
  private asStr(v: any): string | undefined {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s ? s : undefined;
  }
  private asNum(v: any): number | undefined {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  // Pull user feedback rows from your DB (adjust table/columns if yours differ)

  // Replace your current fetchFeedbackRows with this exact version:
  private async fetchFeedbackRows(
    userId: string,
  ): Promise<OutfitFeedbackRow[]> {
    // Adjust table/column names only if they differ in your DB.
    // This version is compatible with your CSV: rating = -1/1, notes = free text.
    const { rows } = await pool.query(
      `SELECT id, user_id, outfit_id, rating, notes, created_at
       FROM outfit_feedback
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 500`,
      [userId],
    );

    return rows.map((r: any) => {
      // rating: -1 => "dislike", 1 => "like", anything else => null
      const rating =
        r.rating === -1 ? 'dislike' : r.rating === 1 ? 'like' : null;

      // notes may be plain text like: "Avoid shoes with green in them."
      // Keep as-is; compileFeedbackRulesFromRows() will parse color/brand/slot.
      const notes =
        typeof r.notes === 'string' && r.notes.trim().length ? r.notes : null;

      return {
        id: String(r.id),
        request_id: '', // unknown here
        user_id: String(r.user_id),
        rating, // "like" | "dislike" | null
        tags: null, // not present in your CSV
        notes, // free text
        outfit_json: null, // not present in your CSV
        created_at: String(r.created_at),
      } as OutfitFeedbackRow;
    });
  }

  // Normalizers
  private normLower(val?: string | null) {
    if (!val) return undefined;
    const s = String(val).trim();
    if (!s) return undefined;
    return s.toLowerCase();
  }
  private normalizePattern(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      solid: 'SOLID',
      stripe: 'STRIPE',
      striped: 'STRIPE',
      stripes: 'STRIPE',
      plaid: 'CHECK',
      check: 'CHECK',
      checked: 'CHECK',
      herringbone: 'HERRINGBONE',
      windowpane: 'WINDOWPANE',
      floral: 'FLORAL',
      flower: 'FLORAL',
      dot: 'DOT',
      dots: 'DOT',
      polka: 'DOT',
      polka_dot: 'DOT',
      camo: 'CAMO',
      camouflage: 'CAMO',
      abstract: 'ABSTRACT',
      print: 'ABSTRACT',
      printed: 'ABSTRACT',
      graphic: 'ABSTRACT',
      other: 'OTHER',
    };
    return map[s] ?? undefined;
  }
  private coerceMainCategoryFromSub(
    rawMain?: string,
    sub?: string,
  ): string | undefined {
    const main = (rawMain ?? '').trim();
    const s = (sub ?? '').toLowerCase();

    const isOuter = [
      'blazer',
      'sport coat',
      'sportcoat',
      'suit jacket',
      'jacket',
      'coat',
      'parka',
      'trench',
      'overcoat',
      'topcoat',
    ].some((k) => s.includes(k));
    if (isOuter) return 'Outerwear';

    const isShoe = [
      'loafer',
      'loafers',
      'sneaker',
      'sneakers',
      'boot',
      'boots',
      'heel',
      'heels',
      'pump',
      'oxford',
      'derby',
      'dress shoe',
      'dress shoes',
      'sandal',
      'sandals',
    ].some((k) => s.includes(k));
    if (isShoe) return 'Shoes';

    const isAccessory = [
      'belt',
      'hat',
      'scarf',
      'tie',
      'watch',
      'sunglasses',
      'bag',
      'briefcase',
    ].some((k) => s.includes(k));
    if (isAccessory) return 'Accessories';

    return main || undefined;
  }
  private normalizeAnchorRole(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      hero: 'Hero',
      neutral: 'Neutral',
      connector: 'Connector',
    };
    return map[s] ?? undefined;
  }
  private normalizeSeasonality(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      ss: 'SS',
      'spring/summer': 'SS',
      spring: 'SS',
      summer: 'SS',
      fw: 'FW',
      'fall/winter': 'FW',
      fall: 'FW',
      autumn: 'FW',
      winter: 'FW',
      allseason: 'ALL_SEASON',
      'all season': 'ALL_SEASON',
      'all-season': 'ALL_SEASON',
      all_season: 'ALL_SEASON',
      all: 'ALL_SEASON',
      'year-round': 'ALL_SEASON',
      'year round': 'ALL_SEASON',
    };
    return map[s];
  }

  // Ultra-casual screen used only when the query implies "upscale"
  private isUltraCasualForUpscale(c: {
    main_category?: string;
    subcategory?: string;
    label?: string;
    dress_code?: string;
    formality_score?: number;
  }): boolean {
    const main = (c.main_category ?? '').toLowerCase();
    const sub = (c.subcategory ?? '').toLowerCase();
    const lbl = (c.label ?? '').toLowerCase();

    // obvious casual tops & loud casual items
    const casualWords = /(t-?shirt|tee|hoodie|tank|graphic tee|hawaiian)/;
    if (casualWords.test(sub) || casualWords.test(lbl)) return true;

    // shorts for bottoms
    if (main === 'bottoms' && /\bshorts?\b/.test(sub)) return true;

    // jeans: allow only if clearly dressy; otherwise screen out for upscale
    if (/\bjeans?\b/.test(sub) && (c.formality_score ?? 0) < 6) return true;

    // generic dress code + formality gate
    const dc = c.dress_code;
    if (
      dc &&
      (dc === 'UltraCasual' || dc === 'Casual') &&
      (c.formality_score ?? 0) < 6
    ) {
      return true;
    }

    return false;
  }

  private retitleOutfit(o: {
    title: string;
    why: string;
    items: CatalogItem[];
  }): { title: string; why: string } {
    if (!o.items?.length) return { title: o.title, why: o.why };

    const tops = o.items.filter(
      (c) => (c.main_category ?? '').toLowerCase() === 'tops',
    );
    const bottoms = o.items.filter(
      (c) => (c.main_category ?? '').toLowerCase() === 'bottoms',
    );
    const shoes = o.items.filter(
      (c) => (c.main_category ?? '').toLowerCase() === 'shoes',
    );

    const topName = tops[0]?.label ?? '';
    const bottomName = bottoms[0]?.label ?? '';
    const shoeName = shoes[0]?.label ?? '';

    // Very simple rewrite
    const title = `Outfit with ${[topName, bottomName, shoeName]
      .filter(Boolean)
      .join(', ')}`;

    const why = `This look combines ${topName || 'a top'} with ${
      bottomName || 'a bottom'
    } and ${shoeName || 'shoes'} for a complete outfit.`;

    return { title, why };
  }

  /**
   * MAIN OUTFIT GENERATOR
   */
  async generateOutfits(
    userId: string,
    query: string,
    topK: number,
    opts: {
      userStyle?: UserStyle;
      weather?: WeatherContext;
      weights?: ContextWeights;
      useWeather?: boolean;
      useFeedback?: boolean; // 👈 add this
      styleAgent?: 'agent1' | 'agent2' | 'agent3'; // 👈 NEW
    },
  ) {
    try {
      // 1) Vectorize query and pull nearest items
      const queryVec = await this.vertex.embedText(query);
      const matches = await queryUserNs({
        userId,
        vector: queryVec,
        topK,
        includeMetadata: true,
      });

      // 2) Build catalog
      let catalog: CatalogItem[] = matches.map((m, i) => {
        const { id } = this.normalizePineconeId(m.id as string);
        const meta: any = m.metadata || {};
        const sub_raw = this.asStr(meta.subcategory ?? meta.subCategory);
        const main_raw = this.asStr(meta.main_category ?? meta.mainCategory);
        const main_fix = this.coerceMainCategoryFromSub(main_raw, sub_raw);

        return {
          index: i + 1,
          id,
          label: this.summarizeItem(meta),

          image_url: this.asStr(meta.image_url ?? meta.imageUrl),
          main_category: main_fix,
          subcategory: sub_raw,
          color: this.asStr(meta.color ?? meta.color_family),
          color_family: this.asStr(meta.color_family),
          shoe_style: this.asStr(meta.shoe_style),
          dress_code: this.asStr(meta.dress_code ?? meta.dressCode),

          formality_score: this.asNum(meta.formality_score),

          brand: this.asStr(meta.brand),
          material: this.asStr(meta.material),
          sleeve_length: this.asStr(meta.sleeve_length),
          layering: this.asStr(meta.layering),
          waterproof_rating: this.asNum(meta.waterproof_rating),
          rain_ok: !!meta.rain_ok,
        };
      });

      if (opts?.styleAgent && STYLE_AGENTS[opts.styleAgent]) {
        const agent = STYLE_AGENTS[opts.styleAgent];

        catalog = catalog.filter((c) => {
          const brand = (c.brand ?? '').toLowerCase();
          const color = (c.color ?? '').toLowerCase();
          const dress = (c.dress_code ?? '').toLowerCase();
          const sub = (c.subcategory ?? '').toLowerCase();

          // basic positive matches
          const matchesBrand = agent.favoriteBrands?.some((b) =>
            brand.includes(b.toLowerCase()),
          );
          const matchesColor = agent.preferredColors?.some((col) =>
            color.includes(col.toLowerCase()),
          );
          const matchesDress = agent.dressBias
            ? dress.includes(agent.dressBias.toLowerCase())
            : false;

          // agent2: explicitly ban business/smart-casual staples
          const banned =
            /\b(blazer|dress shirt|loafers?|oxfords?|derbys?|tux|formal)\b/i.test(
              sub,
            );

          return (matchesBrand || matchesColor || matchesDress) && !banned;
        });

        console.log(
          `🎯 Hard-filtered catalog for ${opts.styleAgent}:`,
          catalog.length,
          'items kept',
        );
      }

      if (opts?.styleAgent === 'agent2') {
        catalog = catalog.filter((c) => {
          const sub = (c.subcategory ?? '').toLowerCase();
          const main = (c.main_category ?? '').toLowerCase();
          const dress = (c.dress_code ?? '').toLowerCase();

          // 🚫 Explicit bans for Edgy Streetwear
          const banned =
            /\b(blazer|sport coat|dress shirt|oxfords?|derbys?|loafers?|dress shoes?|belt)\b/i.test(
              sub,
            ) ||
            dress.includes('business') ||
            dress.includes('formal');

          return !banned;
        });

        console.log(
          `🎯 Agent2 negative filter applied: ${catalog.length} items left`,
        );
      }

      // 3) Contextual pre-filters — only if no styleAgent
      if (opts?.styleAgent) {
        console.log(
          '🎨 Style agent override, skipping contextual filters + constraints',
        );
      } else {
        catalog = applyContextualFilters(query, catalog, { minKeep: 6 });
      }

      // 3b) Apply user feedback (dislikes/bans) before reranking/LLM
      let feedbackRows: any[] = [];
      let feedbackRules: any[] = [];
      let userPrefs = new Map<string, number>();

      // 🔑 Respect frontend toggle + env var
      const clientWantsFeedback = opts?.useFeedback !== false; // default ON if undefined
      const envDisable = process.env.DISABLE_FEEDBACK === '1';
      const disableFeedback = !clientWantsFeedback || envDisable;

      console.log('[FEEDBACK] useFeedback (client):', opts?.useFeedback);
      // console.log('[FEEDBACK] DISABLE_FEEDBACK (env):', envDisable);
      // console.log('[FEEDBACK] Effective disableFeedback =', disableFeedback);

      if (!disableFeedback) {
        feedbackRows = await this.fetchFeedbackRows(userId);
        feedbackRules = compileFeedbackRulesFromRows(feedbackRows);

        // Optional debug: see what got blocked (disabled by default)
        if (process.env.DEBUG_FEEDBACK === '1' && feedbackRules.length) {
          const strongPreview = catalog.filter(
            (it) =>
              !feedbackRules.some((r) => {
                try {
                  return (
                    (r as any) &&
                    (function rule(it: any) {
                      switch (r.kind) {
                        case 'excludeItemIds':
                          return !!(it.id && r.item_ids.includes(it.id));
                        default:
                          return false;
                      }
                    })(it)
                  );
                } catch {
                  return false;
                }
              }),
          );
          console.debug('[FEEDBACK] rules:', feedbackRules);
          console.debug(
            '[FEEDBACK] catalog before/after (counts):',
            catalog.length,
            '→ (preview)',
            strongPreview.length,
          );
        }

        // Enforce (strong, then soften if list would get too small)
        catalog = applyFeedbackFilters(catalog, feedbackRules, {
          minKeep: 6,
          softenWhenBelow: true,
        });

        // 1) Build soft prefs from rules
        userPrefs = buildUserPrefsFromRules(catalog, feedbackRules);

        // 2) Pull per-item preference scores from DB
        const prefRes = await pool.query(
          `SELECT item_id, score FROM user_pref_item WHERE user_id = $1`,
          [userId],
        );
        const prefMap = new Map<string, number>(
          prefRes.rows.map((r: any) => [String(r.item_id), Number(r.score)]),
        );

        // 3) Merge DB scores into userPrefs
        for (const [itemId, score] of prefMap) {
          const existing = userPrefs.get(itemId) ?? 0;
          userPrefs.set(itemId, existing + score);
        }
      } else {
        console.log('[FEEDBACK] Feedback influence skipped.');
      }

      // Keep this only to cap style weight when the user asked for upscale vibes
      const needUpscale =
        /\b(upscale|smart\s*casual|business|formal|dressy|rooftop)\b/i.test(
          query,
        );

      const baseConstraints = parseConstraints(query);
      const constraints = { ...baseConstraints };

      // keep your existing weight normalization
      const incoming = opts?.weights ?? DEFAULT_CONTEXT_WEIGHTS;
      const longW = toLongWeights(incoming);
      if (needUpscale && longW.styleWeight > 0.35) {
        longW.styleWeight = 0.35;
      }
      const tunedWeights = fromLongWeights(longW, incoming) as ContextWeights;

      // Resolve style influence
      let effectiveStyle: UserStyle | undefined;

      if (opts?.styleAgent && STYLE_AGENTS[opts.styleAgent]) {
        effectiveStyle = STYLE_AGENTS[opts.styleAgent];
        console.log(
          '🎨 Using style agent override:',
          opts.styleAgent,
          effectiveStyle,
        );
      } else if (opts?.userStyle) {
        effectiveStyle = opts.userStyle;
        console.log('👤 Using user style profile:', effectiveStyle);
      } else {
        console.log('⚪ No style profile or agent applied');
      }

      // Debug weights & flags
      console.log('[DEBUG] weights =', tunedWeights);
      console.log('[DEBUG] useWeather =', opts?.useWeather);
      console.log('[DEBUG] useFeedback =', opts?.useFeedback);
      console.log(
        '[DEBUG] userPrefs (from feedback) =',
        Array.from(userPrefs.entries()),
      );

      // 4) Proceed to rerank with enriched (or empty) userPrefs

      let reranked: CatalogItem[]; // 👈 FIX: declare it once

      if (opts?.styleAgent && STYLE_AGENTS[opts.styleAgent]) {
        console.log('🎨 StyleAgent mode → style-only rerank');

        const longW = toLongWeights(tunedWeights);

        reranked = rerankCatalogWithContext(catalog, {} as any, {
          userStyle: STYLE_AGENTS[opts.styleAgent],
          weights: {
            constraintsWeight: 0, // 🚫 kill constraints
            styleWeight: longW.styleWeight ?? 1.0, // ✅ safe access
            weatherWeight: opts.useWeather ? (longW.weatherWeight ?? 0.8) : 0,
            feedbackWeight: 0, // 🚫 ignore feedback
          },
          useWeather: opts.useWeather,
        });
      } else {
        reranked = rerankCatalogWithContext(catalog, constraints, {
          userStyle: effectiveStyle,
          weather: opts?.weather,
          weights: tunedWeights,
          useWeather: opts?.useWeather,
          userPrefs,
        });
      }

      // 4) Build prompt
      const catalogLines = reranked
        .map((c) => `${c.index}. ${c.label}`)
        .join('\n');
      const prompt = buildOutfitPrompt(catalogLines, query);

      // 5) LLM call and parse
      const raw = await this.vertex.generateReasonedOutfit(prompt);
      const text =
        (raw?.candidates?.[0]?.content?.parts?.[0]?.text as string) ??
        (typeof raw === 'string' ? raw : '');
      const parsed = extractStrictJson(text);

      // Map by index
      const byIndex = new Map<number, (typeof reranked)[number]>();
      reranked.forEach((c) => byIndex.set(c.index, c));
      catalog.forEach((c) => byIndex.set(c.index, c)); // backup

      // 6) Build outfits
      let outfits = (parsed.outfits || []).map((o: any) => ({
        title: String(o.title ?? 'Outfit'),
        items: Array.isArray(o.items)
          ? (o.items
              .map((it: any) => {
                if (typeof it === 'number') return byIndex.get(it);
                if (typeof it === 'string') {
                  const n = Number(it.trim());
                  if (!Number.isNaN(n)) return byIndex.get(n);
                  return catalog.find(
                    (c) => c.label.toLowerCase() === it.toLowerCase(),
                  );
                }
                return undefined;
              })
              .filter(Boolean) as CatalogItem[])
          : [],
        why: String(o.why ?? ''),
        missing: o.missing ? String(o.missing) : undefined,
      }));

      // ─────────────────────────────────────────────────────────
      // HARD REPAIR: ensure required slots exist (bottom + shoes)
      // Gym intent also requires sneakers.
      // ─────────────────────────────────────────────────────────
      const toLc = (s?: string) => (s ?? '').toLowerCase();
      const gymIntent = /\b(gym|work ?out|workout|training|exercise)\b/i.test(
        query,
      );

      const isBottom = (c?: CatalogItem) => {
        if (!c) return false;
        const main = toLc(c.main_category);
        const sub = toLc(c.subcategory);
        const lbl = toLc(c.label);
        return (
          main === 'bottoms' ||
          /\b(trouser|pants|jeans|chinos|shorts|joggers?|sweatpants?|track\s*pants?)\b/i.test(
            sub,
          ) ||
          /\bshorts?\b/i.test(lbl)
        );
      };
      const isShoes = (c?: CatalogItem) => {
        if (!c) return false;
        const main = toLc(c.main_category);
        const sub = toLc(c.subcategory);
        return (
          main === 'shoes' ||
          /\b(sneakers?|trainers?|running|athletic|loafers?|boots?|oxfords?|derbys?|dress\s*shoes?|sandals?)\b/i.test(
            sub,
          )
        );
      };
      const isSneaker = (c?: CatalogItem) => {
        if (!c) return false;
        const sub = toLc(c.subcategory);
        const lbl = toLc(c.label);
        return /\b(sneakers?|trainers?|running|athletic)\b/i.test(sub || lbl);
      };
      const isTop = (c?: CatalogItem) => {
        if (!c) return false;
        const main = toLc(c.main_category);
        const sub = toLc(c.subcategory);
        return (
          main === 'tops' ||
          /\b(t-?shirt|tee|polo|shirt|sweater|knit|henley|hoodie)\b/i.test(sub)
        );
      };
      const orderRank = (c: CatalogItem) =>
        isTop(c) ? 1 : isBottom(c) ? 2 : isShoes(c) ? 3 : 4;

      const firstBottom = reranked.find(isBottom);
      const firstShoes = reranked.find(isShoes);
      const firstSneaker = reranked.find(isSneaker);
      const firstTop = reranked.find(isTop);

      outfits = outfits.map((o) => {
        const haveBottom = o.items.some(isBottom);
        const haveShoes = o.items.some(isShoes);
        const haveSneaker = o.items.some(isSneaker);
        const already = new Set(o.items.map((x) => x?.id));

        // Gym: sneakers required
        if (
          gymIntent &&
          !haveSneaker &&
          firstSneaker &&
          !already.has(firstSneaker.id)
        ) {
          o.items.push(firstSneaker);
          o.missing = o.missing || 'auto-added sneakers for gym';
          already.add(firstSneaker.id);
        }

        // Always ensure a bottom exists
        if (!haveBottom && firstBottom && !already.has(firstBottom.id)) {
          o.items.push(firstBottom);
          o.missing = o.missing || 'auto-added bottom';
          already.add(firstBottom.id);
        }

        // Always ensure some shoes exist
        if (!haveShoes && firstShoes && !already.has(firstShoes.id)) {
          o.items.push(firstShoes);
          o.missing = o.missing || 'auto-added shoes';
          already.add(firstShoes.id);
        }

        // Optional: ensure at least one top exists
        if (!o.items.some(isTop) && firstTop && !already.has(firstTop.id)) {
          o.items.unshift(firstTop);
          o.missing = o.missing || 'auto-added top';
          already.add(firstTop.id);
        }

        // Keep a stable, readable order: TOP, BOTTOM, SHOES, then others
        o.items = [...o.items].sort((a, b) => orderRank(a) - orderRank(b));
        return o;
      });

      // finalize
      outfits = outfits.map((o) => finalizeOutfitSlots(o, reranked, query));
      outfits = enforceConstraintsOnOutfits(
        outfits as any,
        reranked as any,
        query,
      ) as any;

      // ──────────────────────────────────────────────
      // Retitle / rewrite "why" so it matches final items
      // ──────────────────────────────────────────────
      outfits = outfits.map((o) => {
        const { title, why } = this.retitleOutfit(o);
        return { ...o, title, why };
      });

      // ──────────────────────────────────────────────────────────────
      // NEW: minimal personalization using per-item prefs
      // ──────────────────────────────────────────────────────────────
      const withIds = outfits.map((o) => ({
        ...o,
        outfit_id: randomUUID(),
      }));
      const ids = Array.from(
        new Set(
          withIds.flatMap((o) =>
            o.items.map((it: any) => it?.id).filter(Boolean),
          ),
        ),
      ) as string[];

      // small, safe table for user item prefs (auto-creates once)
      await pool.query(
        `CREATE TABLE IF NOT EXISTS user_pref_item(
         user_id TEXT NOT NULL,
         item_id TEXT NOT NULL,
         score REAL NOT NULL DEFAULT 0,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (user_id, item_id)
       );`,
      );

      const prefRows =
        ids.length > 0
          ? await pool.query(
              'SELECT item_id, score FROM user_pref_item WHERE user_id = $1 AND item_id = ANY($2)',
              [userId, ids],
            )
          : { rows: [] as any[] };

      const pref = new Map<string, number>(
        prefRows.rows.map((r: any) => [String(r.item_id), Number(r.score)]),
      );

      const ranked = withIds
        .map((o) => {
          const items = o.items as any[];
          const boost =
            items.length === 0
              ? 0
              : items.reduce((a, it) => a + (pref.get(it?.id) ?? 0), 0) /
                items.length;
          return { o, boost };
        })
        .sort((a, b) => b.boost - a.boost);

      const best = ranked[0]?.o ??
        withIds[0] ?? {
          items: [],
          why: '',
          missing: undefined,
          outfit_id: 'o1',
        };

      const request_id = randomUUID();

      // ✅ FINAL OUTFIT DEBUG LOG (safe placement)
      if (process.env.NODE_ENV !== 'production') {
        console.dir(
          {
            level: 'OUTFIT_RESULT',
            request_id,
            user_id: userId,
            query,
            best_outfit: {
              outfit_id: (best as any).outfit_id,
              title: (best as any).title,
              why: (best as any).why,
              missing: (best as any).missing,
              items: (best as any).items.map((it: any) => ({
                id: it?.id,
                label: it?.label,
                image_url: it?.image_url,
                main_category: it?.main_category,
                subcategory: it?.subcategory,
                brand: it?.brand,
                color: it?.color,
                dress_code: it?.dress_code,
                formality_score: it?.formality_score,
              })),
            },
            all_outfits: withIds.map((o) => ({
              outfit_id: o.outfit_id,
              title: o.title,
              why: o.why,
              missing: o.missing,
              items: o.items.map((it) => ({
                id: it?.id,
                label: it?.label,
                image_url: it?.image_url,
                main_category: it?.main_category,
                subcategory: it?.subcategory,
                brand: it?.brand,
                color: it?.color,
                dress_code: it?.dress_code,
                formality_score: it?.formality_score,
              })),
            })),
          },
          { depth: null },
        );
      }

      // Return shape compatible with your mobile screen (uses current?.items/why/missing)
      return {
        request_id,
        outfit_id: (best as any).outfit_id,
        items: (best as any).items,
        why: (best as any).why,
        missing: (best as any).missing,
        outfits: withIds, // keep full list if UI/telemetry needs it
      };
    } catch (err: any) {
      console.error('❌ Error in generateOutfits:', err.message, err.stack);
      throw err;
    }
  }

  /**
   * Defensive extractor for various LLM wrapper shapes.
   */
  private extractModelText(output: any): string {
    if (typeof output === 'string') return output;

    const parts = output?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const joined = parts.map((p: any) => p?.text ?? '').join('');
      if (joined) return joined;
    }
    if (typeof output?.text === 'string') return output.text;
    return JSON.stringify(output ?? '');
  }

  private parseModelJson(s: string): any {
    const cleaned = s
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Model did not return valid JSON.');
    }
  }

  // More text-normalizers
  private normalizeDressCode(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<
      string,
      | 'UltraCasual'
      | 'Casual'
      | 'SmartCasual'
      | 'BusinessCasual'
      | 'Business'
      | 'BlackTie'
    > = {
      ultracasual: 'UltraCasual',
      ultra_casual: 'UltraCasual',
      casual: 'Casual',
      smartcasual: 'SmartCasual',
      smart_casual: 'SmartCasual',
      businesscasual: 'BusinessCasual',
      business_casual: 'BusinessCasual',
      business: 'Business',
      blacktie: 'BlackTie',
      black_tie: 'BlackTie',
      'black tie': 'BlackTie',
    };
    return map[s];
  }
  private normalizeLayering(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      base: 'BASE',
      baselayer: 'BASE',
      'base layer': 'BASE',
      mid: 'MID',
      midlayer: 'MID',
      'mid layer': 'MID',
      shell: 'SHELL',
      outer: 'SHELL',
      outerwear: 'SHELL',
      jacket: 'SHELL',
      accent: 'ACCENT',
      accessory: 'ACCENT',
      acc: 'ACCENT',
    };
    return map[s];
  }

  // DTO-facing normalizers
  private normalizeMainCategory(
    val?: string | null,
  ): CreateWardrobeItemDto['main_category'] {
    const unions: CreateWardrobeItemDto['main_category'][] = [
      'Tops',
      'Bottoms',
      'Outerwear',
      'Shoes',
      'Accessories',
      'Undergarments',
      'Activewear',
      'Formalwear',
      'Loungewear',
      'Sleepwear',
      'Swimwear',
      'Maternity',
      'Unisex',
      'Costumes',
      'TraditionalWear',
    ];
    const raw = (val ?? '').toString().trim();
    if (unions.includes(raw as any))
      return raw as CreateWardrobeItemDto['main_category'];
    const s = raw.toLowerCase();
    const map: Record<string, CreateWardrobeItemDto['main_category']> = {
      top: 'Tops',
      tops: 'Tops',
      tshirt: 'Tops',
      't-shirt': 'Tops',
      tee: 'Tops',
      shirt: 'Tops',
      blouse: 'Tops',
      knit: 'Tops',
      sweater: 'Tops',
      bottom: 'Bottoms',
      bottoms: 'Bottoms',
      pants: 'Bottoms',
      trousers: 'Bottoms',
      jeans: 'Bottoms',
      chinos: 'Bottoms',
      shorts: 'Bottoms',
      skirt: 'Bottoms',
      outer: 'Outerwear',
      outerwear: 'Outerwear',
      jacket: 'Outerwear',
      coat: 'Outerwear',
      parka: 'Outerwear',
      blazer: 'Outerwear',
      shoe: 'Shoes',
      shoes: 'Shoes',
      sneaker: 'Shoes',
      sneakers: 'Shoes',
      boot: 'Shoes',
      boots: 'Shoes',
      heel: 'Shoes',
      loafers: 'Shoes',
      accessory: 'Accessories',
      accessories: 'Accessories',
      bag: 'Accessories',
      belt: 'Accessories',
      hat: 'Accessories',
      scarf: 'Accessories',
      tie: 'Accessories',
      sunglasses: 'Accessories',
      watch: 'Accessories',
      underwear: 'Undergarments',
      undergarments: 'Undergarments',
      bra: 'Undergarments',
      briefs: 'Undergarments',
      socks: 'Undergarments',
      active: 'Activewear',
      activewear: 'Activewear',
      athleisure: 'Activewear',
      gym: 'Activewear',
      formal: 'Formalwear',
      formalwear: 'Formalwear',
      suit: 'Formalwear',
      tuxedo: 'Formalwear',
      lounge: 'Loungewear',
      loungewear: 'Loungewear',
      sweats: 'Loungewear',
      sleep: 'Sleepwear',
      sleepwear: 'Sleepwear',
      pajama: 'Sleepwear',
      pajamas: 'Sleepwear',
      swim: 'Swimwear',
      swimwear: 'Swimwear',
      swimsuit: 'Swimwear',
      trunks: 'Swimwear',
      bikini: 'Swimwear',
      maternity: 'Maternity',
      unisex: 'Unisex',
      costume: 'Costumes',
      costumes: 'Costumes',
      'traditional wear': 'TraditionalWear',
      traditionalwear: 'TraditionalWear',
      kimono: 'TraditionalWear',
      sari: 'TraditionalWear',
    };
    return map[s] ?? 'Tops';
  }
  private resolveMainCategory(
    rawMain?: string | null,
    sub?: string | null,
    layering?: string | null,
  ): CreateWardrobeItemDto['main_category'] {
    const normalized = this.normalizeMainCategory(rawMain);
    const s = (sub ?? '').toLowerCase();
    const lay = (layering ?? '').toUpperCase();
    if (
      [
        'blazer',
        'sport coat',
        'sportcoat',
        'suit jacket',
        'jacket',
        'coat',
        'parka',
        'trench',
        'overcoat',
        'topcoat',
      ].some((k) => s.includes(k))
    )
      return 'Outerwear';
    if (
      [
        'loafer',
        'loafers',
        'sneaker',
        'sneakers',
        'boot',
        'boots',
        'heel',
        'heels',
        'pump',
        'oxford',
        'derby',
        'dress shoe',
        'dress shoes',
        'sandal',
        'sandals',
      ].some((k) => s.includes(k))
    )
      return 'Shoes';
    if (
      [
        'belt',
        'hat',
        'scarf',
        'tie',
        'watch',
        'sunglasses',
        'bag',
        'briefcase',
      ].some((k) => s.includes(k))
    )
      return 'Accessories';
    if (normalized === 'Tops' && lay === 'SHELL') return 'Outerwear';
    return normalized;
  }
  private normalizePatternScaleDto(
    val?: string | null,
  ): CreateWardrobeItemDto['pattern_scale'] | undefined {
    const s = (val ?? '').toString().trim().toLowerCase();
    if (!s) return undefined;
    if (['micro', 'subtle', '0', '-1', 'small'].includes(s)) return 'Micro';
    if (['medium', 'mid', '1'].includes(s)) return 'Medium';
    if (['bold', 'large', 'big', '2'].includes(s)) return 'Bold';
    return undefined;
  }
  private normalizeSeasonalityDto(
    val?: string | null,
  ): CreateWardrobeItemDto['seasonality'] | undefined {
    const s = (val ?? '').toString().trim().toLowerCase();
    if (!s) return undefined;
    if (['spring', 'spr', 'ss', 's/s'].includes(s)) return 'Spring';
    if (['summer', 'ss2'].includes(s)) return 'Summer';
    if (['fall', 'autumn', 'fw', 'f/w'].includes(s)) return 'Fall';
    if (['winter', 'win'].includes(s)) return 'Winter';
    if (
      [
        'all',
        'allseason',
        'all-season',
        'all season',
        'year-round',
        'year round',
        'all_season',
        'allseasonal',
        'allseasonwear',
      ].includes(s)
    )
      return 'AllSeason';
    return undefined;
  }
  private normalizeLayeringDto(
    val?: string | null,
  ): CreateWardrobeItemDto['layering'] | undefined {
    const s = (val ?? '').toString().trim().toLowerCase();
    if (!s) return undefined;
    if (['base', 'base layer', 'baselayer'].includes(s)) return 'Base';
    if (['mid', 'midlayer', 'mid layer'].includes(s)) return 'Mid';
    if (['outer', 'outerwear', 'jacket', 'shell'].includes(s)) return 'Outer';
    return undefined;
  }
  private normalizeColorTemp(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      warm: 'Warm',
      cool: 'Cool',
      neutral: 'Neutral',
    };
    return map[s] ?? undefined;
  }
  private normalizeContrast(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      med: 'Medium',
      high: 'High',
    };
    return map[s] ?? undefined;
  }

  /**
   * Pinecone id helper
   */
  private normalizePineconeId(raw: string | undefined | null): {
    id: string;
    modality: 'text' | 'image' | 'unknown';
  } {
    if (!raw) return { id: '', modality: 'unknown' };
    const [base, modality] = String(raw).split(':');
    return {
      id: base,
      modality:
        modality === 'text' || modality === 'image' ? modality : 'unknown',
    };
  }

  private extractFileName(url: string): string {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  }

  private sanitizeMeta(
    raw: Record<string, any>,
  ): Record<string, string | number | boolean | string[]> {
    const out: Record<string, string | number | boolean | string[]> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;
      if (k === 'metadata') {
        out['meta_json'] = typeof v === 'string' ? v : JSON.stringify(v);
        continue;
      }
      if (Array.isArray(v)) {
        out[k] = v.map((x) => String(x)).filter((x) => x.length > 0);
        continue;
      }
      switch (typeof v) {
        case 'string':
          out[k] = v;
          break;
        case 'number':
          if (Number.isFinite(v)) out[k] = v;
          break;
        case 'boolean':
          out[k] = v;
          break;
        case 'object':
          out[k] = JSON.stringify(v);
          break;
      }
    }
    return out;
  }

  private toCamel(row: any) {
    if (!row) return row;
    return {
      ...row,
      userId: row.user_id,
      image: row.image_url,
      gsutilUri: row.gsutil_uri,
      objectKey: row.object_key,
      aiTitle: row.ai_title,
      aiDescription: row.ai_description,
      aiKeyAttributes: row.ai_key_attributes,
      aiConfidence: row.ai_confidence,
      mainCategory: row.main_category,
      subCategory: row.subcategory,
      styleDescriptors: row.style_descriptors,
      styleArchetypes: row.style_archetypes,
      anchorRole: row.anchor_role,
      occasionTags: row.occasion_tags,
      dressCode: row.dress_code,
      formalityScore: row.formality_score,
      dominantHex: row.dominant_hex,
      paletteHex: row.palette_hex,
      colorFamily: row.color_family,
      colorTemp: row.color_temp,
      contrastProfile: row.contrast_profile,
      fabricBlend: row.fabric_blend,
      fabricWeightGsm: row.fabric_weight_gsm,
      wrinkleResistance: row.wrinkle_resistance,
      stretchDirection: row.stretch_direction,
      stretchPct: row.stretch_pct,
      sizeSystem: row.size_system,
      sizeLabel: row.size_label,
      inseamIn: row.inseam_in,
      seasonalityArr: row.seasonality_arr,
      goesWithIds: row.goes_with_ids,
      avoidWithIds: row.avoid_with_ids,
      userRating: row.user_rating,
      fitConfidence: row.fit_confidence,
      outfitFeedback: row.outfit_feedback,
      dislikedFeatures: row.disliked_features,
      purchaseDate: row.purchase_date,
      purchasePrice: row.purchase_price,
      countryOfOrigin: row.country_of_origin,
      lastWornAt: row.last_worn_at,
      rotationPriority: row.rotation_priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  composeFromAiDraft(
    base: Partial<CreateWardrobeItemDto>,
    draft: Record<string, any>,
  ): CreateWardrobeItemDto {
    const pick = <T>(k: string, fallback?: T): T | undefined =>
      (base as any)[k] ?? (draft?.[k] as T) ?? fallback;

    const name = pick<string>('name') ?? draft?.ai_title ?? 'Wardrobe Item';

    const rawSub =
      pick<string>('subcategory') ??
      draft?.subcategory ??
      (draft as any)?.subCategory;
    const layeringRaw = pick<string>('layering') ?? draft?.layering;

    const rawMain =
      (base as any).main_category ??
      (draft?.main_category as string | undefined) ??
      (draft?.category as string | undefined);

    const main_category: CreateWardrobeItemDto['main_category'] =
      this.resolveMainCategory(rawMain, rawSub, layeringRaw);

    const layering = this.normalizeLayeringDto(layeringRaw);
    const pattern_scale = this.normalizePatternScaleDto(
      pick<string>('pattern_scale') ?? draft?.pattern_scale,
    );
    const seasonality = this.normalizeSeasonalityDto(
      pick<string>('seasonality') ?? draft?.seasonality,
    );

    const rawTags =
      pick<string[] | string>('tags') ?? (draft?.tags as any) ?? [];
    const tags: string[] = Array.isArray(rawTags)
      ? rawTags.filter(Boolean).map(String)
      : String(rawTags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

    const parseNum = (x: any) =>
      typeof x === 'number'
        ? x
        : typeof x === 'string' && x.trim() !== '' && !Number.isNaN(+x)
          ? Number(x)
          : undefined;

    return {
      user_id: String(base.user_id),
      image_url: String(base.image_url),
      name,
      main_category,

      gsutil_uri: pick('gsutil_uri'),
      object_key: pick('object_key'),

      subcategory: pick('subcategory'),
      color: pick('color'),
      material: pick('material'),
      fit: pick('fit'),
      size: pick('size'),
      brand: pick('brand'),
      tags,

      style_descriptors: draft?.style_descriptors,
      style_archetypes: draft?.style_archetypes,
      anchor_role: draft?.anchor_role,
      occasion_tags: draft?.occasion_tags,
      dress_code: draft?.dress_code,
      formality_score: draft?.formality_score,

      dominant_hex: draft?.dominant_hex,
      palette_hex: draft?.palette_hex,
      color_family: draft?.color_family,
      color_temp: draft?.color_temp,
      contrast_profile: draft?.contrast_profile,

      pattern: draft?.pattern,
      pattern_scale,

      seasonality,
      seasonality_arr: draft?.seasonality_arr,
      layering,
      thermal_rating: draft?.thermal_rating,
      breathability: draft?.breathability,
      rain_ok: draft?.rain_ok,
      wind_ok: draft?.wind_ok,
      waterproof_rating: draft?.waterproof_rating,
      climate_sweetspot_f_min: draft?.climate_sweetspot_f_min,
      climate_sweetspot_f_max: draft?.climate_sweetspot_f_max,

      fabric_blend: draft?.fabric_blend,
      fabric_weight_gsm: draft?.fabric_weight_gsm,
      wrinkle_resistance: draft?.wrinkle_resistance,
      stretch_direction: draft?.stretch_direction,
      stretch_pct: draft?.stretch_pct,
      thickness: draft?.thickness,
      size_system: draft?.size_system,
      size_label: draft?.size_label,
      measurements: draft?.measurements,
      width: draft?.width,
      height: draft?.height,

      neckline: draft?.neckline,
      collar_type: draft?.collar_type,
      sleeve_length: draft?.sleeve_length,
      hem_style: draft?.hem_style,
      rise: draft?.rise,
      leg: draft?.leg,
      inseam_in: draft?.inseam_in,
      cuff: draft?.cuff,
      lapel: draft?.lapel,
      closure: draft?.closure,
      length_class: draft?.length_class,
      shoe_style: draft?.shoe_style,
      sole: draft?.sole,
      toe_shape: draft?.toe_shape,

      care_symbols: draft?.care_symbols,
      wash_temp_c: draft?.wash_temp_c,
      dry_clean: draft?.dry_clean,
      iron_ok: draft?.iron_ok,

      retailer: draft?.retailer,
      purchase_date: draft?.purchase_date,
      purchase_price: draft?.purchase_price,
      country_of_origin: draft?.country_of_origin,
      condition: draft?.condition,
      defects_notes: draft?.defects_notes,

      ai_title: draft?.ai_title,
      ai_description: draft?.ai_description,
      ai_key_attributes: draft?.ai_key_attributes,
      ai_confidence: parseNum(draft?.ai_confidence),

      metadata: (base as any).metadata,
      constraints: (base as any).constraints,
    };
  }

  // CREATE
  async createItem(dto: CreateWardrobeItemDto) {
    const cols: string[] = [];
    const vals: any[] = [];
    const params: string[] = [];
    let i = 1;

    const add = (col: string, val: any, kind: 'json' | 'raw' = 'raw') => {
      if (val === undefined) return;
      if (Array.isArray(val) && val.length === 0) return;
      cols.push(col);
      if (kind === 'json' && val !== null) {
        vals.push(JSON.stringify(val));
      } else {
        vals.push(val);
      }
      params.push(`$${i++}`);
    };

    // REQUIRED
    add('user_id', dto.user_id);
    add('image_url', dto.image_url);
    add('name', dto.name);
    add('main_category', dto.main_category);

    // Optional core/meta
    add('subcategory', dto.subcategory);
    add('color', dto.color);
    add('material', dto.material);
    add('fit', dto.fit);
    add('size', dto.size);
    add('brand', dto.brand);
    add('gsutil_uri', dto.gsutil_uri);
    add('object_key', dto.object_key);
    add('metadata', dto.metadata, 'json');
    add('width', dto.width);
    add('height', dto.height);
    add('tags', dto.tags);

    // Visuals & styling
    add('style_descriptors', dto.style_descriptors);
    add('style_archetypes', dto.style_archetypes);
    add('anchor_role', this.normalizeAnchorRole(dto.anchor_role));

    const normalizedPattern = this.normalizePattern(dto.pattern);
    if (
      normalizedPattern &&
      WardrobeService.PATTERN_ENUM_WHITELIST.includes(normalizedPattern)
    ) {
      add('pattern', normalizedPattern);
    }
    if (dto.pattern_scale !== undefined) {
      add(
        'pattern_scale',
        this.normalizePatternScaleDto(dto.pattern_scale) ?? null,
      );
    }

    add('dominant_hex', dto.dominant_hex);
    add('palette_hex', dto.palette_hex);
    add('color_family', dto.color_family);
    add('color_temp', this.normalizeColorTemp(dto.color_temp));
    add('contrast_profile', this.normalizeContrast(dto.contrast_profile));

    // Occasion & formality
    add('occasion_tags', dto.occasion_tags);
    add('dress_code', this.normalizeDressCode(dto.dress_code));
    add('formality_score', dto.formality_score);

    // Seasonality & climate (ENUMS)
    const normalizedSeasonality = this.normalizeSeasonality(dto.seasonality);
    if (
      normalizedSeasonality &&
      WardrobeService.SEASONALITY_ENUM_WHITELIST.includes(normalizedSeasonality)
    ) {
      add('seasonality', normalizedSeasonality);
    }
    const normalizedLayering = this.normalizeLayering(dto.layering);
    if (
      normalizedLayering &&
      WardrobeService.LAYERING_ENUM_WHITELIST.includes(normalizedLayering)
    ) {
      add('layering', normalizedLayering);
    }

    add('seasonality_arr', dto.seasonality_arr);
    add('thermal_rating', dto.thermal_rating);
    add('breathability', dto.breathability);
    add('rain_ok', dto.rain_ok);
    add('wind_ok', dto.wind_ok);
    add('waterproof_rating', dto.waterproof_rating);
    add('climate_sweetspot_f_min', dto.climate_sweetspot_f_min);
    add('climate_sweetspot_f_max', dto.climate_sweetspot_f_max);

    // Construction & sizing
    add('fabric_blend', dto.fabric_blend, 'json');
    add('fabric_weight_gsm', dto.fabric_weight_gsm);
    add('wrinkle_resistance', dto.wrinkle_resistance);
    add('stretch_direction', dto.stretch_direction);
    add('stretch_pct', dto.stretch_pct);
    add('thickness', dto.thickness);
    add('size_system', dto.size_system);
    add('size_label', dto.size_label);
    add('measurements', dto.measurements, 'json');

    // Silhouette & cut
    add('neckline', dto.neckline);
    add('collar_type', dto.collar_type);
    add('sleeve_length', dto.sleeve_length);
    add('hem_style', dto.hem_style);
    add('rise', dto.rise);
    add('leg', dto.leg);
    add('inseam_in', dto.inseam_in);
    add('cuff', dto.cuff);
    add('lapel', dto.lapel);
    add('closure', dto.closure);
    add('length_class', dto.length_class);
    add('shoe_style', dto.shoe_style);
    add('sole', dto.sole);
    add('toe_shape', dto.toe_shape);

    // Care
    add('care_symbols', dto.care_symbols);
    add('wash_temp_c', dto.wash_temp_c);
    add('dry_clean', dto.dry_clean);
    add('iron_ok', dto.iron_ok);

    // Usage
    add('wear_count', dto.wear_count ?? 0);
    add('last_worn_at', dto.last_worn_at);
    add('rotation_priority', dto.rotation_priority);

    // Commerce & provenance
    add('purchase_date', dto.purchase_date);
    add('purchase_price', dto.purchase_price);
    add('retailer', dto.retailer);
    add('country_of_origin', dto.country_of_origin);
    add('condition', dto.condition);
    add('defects_notes', dto.defects_notes);

    // Pairing & feedback
    add('goes_with_ids', dto.goes_with_ids);
    add('avoid_with_ids', dto.avoid_with_ids);
    add('user_rating', dto.user_rating);
    add('fit_confidence', dto.fit_confidence);
    add('outfit_feedback', dto.outfit_feedback, 'json');
    add('disliked_features', dto.disliked_features);

    // AI
    add('ai_title', dto.ai_title);
    add('ai_description', dto.ai_description);
    add('ai_key_attributes', dto.ai_key_attributes);
    add('ai_confidence', dto.ai_confidence);

    // System
    add('constraints', dto.constraints);

    const sql = `
      INSERT INTO wardrobe_items (${cols.join(', ')})
      VALUES (${params.join(', ')})
      RETURNING *;
    `;
    const result = await pool.query(sql, vals);
    const item = result.rows[0];

    // Embeddings
    let imageVec: number[] | undefined;
    const gcs = dto.gsutil_uri ?? item.gsutil_uri;
    if (gcs) imageVec = await this.vertex.embedImage(gcs);

    const textVec = await this.vertex.embedText(
      [
        item.name,
        item.main_category,
        item.subcategory,
        item.color,
        item.color_family,
        item.material,
        item.fit,
        item.size,
        item.brand,
        item.color_temp,
        item.contrast_profile,
        String(item.formality_score ?? ''),
        item.seasonality,
        item.layering,
        item.pattern,
        item.pattern_scale,
        item.neckline,
        item.collar_type,
        item.sleeve_length,
        item.rise,
        item.leg,
        String(item.inseam_in ?? ''),
        item.length_class,
        item.shoe_style,
        item.sole,
        Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        item.dress_code,
        item.anchor_role,
        item.dominant_hex,
        Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' '),
    );

    const meta = this.sanitizeMeta({ ...item });
    await upsertItemNs({
      userId: dto.user_id,
      itemId: item.id,
      imageVec,
      textVec,
      meta,
    });

    return {
      message: 'Wardrobe item created + indexed successfully',
      item: this.toCamel(item),
    };
  }

  // READ
  async getItemsByUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows.map((r) => this.toCamel(r));
  }

  // UPDATE
  async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (dto.pattern !== undefined) {
      const p = this.normalizePattern(dto.pattern);
      (dto as any).pattern =
        p && WardrobeService.PATTERN_ENUM_WHITELIST.includes(p) ? p : null;
    }
    if (dto.seasonality !== undefined) {
      const s = this.normalizeSeasonality(dto.seasonality);
      (dto as any).seasonality =
        s && WardrobeService.SEASONALITY_ENUM_WHITELIST.includes(s) ? s : null;
    }
    if (dto.layering !== undefined) {
      const l = this.normalizeLayering(dto.layering);
      (dto as any).layering =
        l && WardrobeService.LAYERING_ENUM_WHITELIST.includes(l) ? l : null;
    }
    if (dto.anchor_role !== undefined)
      (dto as any).anchor_role =
        this.normalizeAnchorRole(dto.anchor_role) ?? null;
    if (dto.dress_code !== undefined)
      (dto as any).dress_code = this.normalizeDressCode(dto.dress_code) ?? null;
    if (dto.color_temp !== undefined)
      (dto as any).color_temp = this.normalizeColorTemp(dto.color_temp) ?? null;
    if (dto.contrast_profile !== undefined)
      (dto as any).contrast_profile =
        this.normalizeContrast(dto.contrast_profile) ?? null;
    if (dto.pattern_scale !== undefined)
      (dto as any).pattern_scale =
        this.normalizePatternScaleDto(dto.pattern_scale) ?? null;

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        if (Array.isArray(value)) {
          values.push(value.length ? value : null);
        } else if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        index++;
      }
    }

    if (fields.length === 0) throw new Error('No fields provided for update.');

    values.push(itemId);

    const query = `
      UPDATE wardrobe_items
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${index}
      RETURNING *;
    `;
    const result = await pool.query(query, values);
    const item = result.rows[0];

    let textVec: number[] | undefined;
    let imageVec: number[] | undefined;

    const textFields = [
      'name',
      'main_category',
      'subcategory',
      'color',
      'color_family',
      'material',
      'fit',
      'size',
      'brand',
      'pattern',
      'pattern_scale',
      'seasonality',
      'layering',
      'dress_code',
      'occasion_tags',
      'tags',
      'anchor_role',
    ];
    const textChanged = textFields.some((f) => f in dto);
    if (textChanged) {
      const textInput = [
        item.name,
        item.main_category,
        item.subcategory,
        item.color,
        item.color_family,
        item.material,
        item.fit,
        item.size,
        item.brand,
        item.color_temp,
        item.contrast_profile,
        String(item.formality_score ?? ''),
        item.seasonality,
        item.layering,
        item.pattern,
        item.pattern_scale,
        item.neckline,
        item.collar_type,
        item.sleeve_length,
        item.rise,
        item.leg,
        String(item.inseam_in ?? ''),
        item.length_class,
        item.shoe_style,
        item.sole,
        Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        item.dress_code,
        item.anchor_role,
        item.dominant_hex,
        Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ');
      textVec = await this.vertex.embedText(textInput);
    }

    const imageChanged = 'gsutil_uri' in dto || 'image_url' in dto;
    const gcs = (dto as any).gsutil_uri ?? item.gsutil_uri;
    if (imageChanged && gcs) {
      imageVec = await this.vertex.embedImage(gcs);
    }

    const meta = this.sanitizeMeta({ ...item });

    if (textVec || imageVec) {
      await upsertItemNs({
        userId: item.user_id,
        itemId: item.id,
        textVec,
        imageVec,
        meta,
      });
    } else {
      await upsertItemNs({ userId: item.user_id, itemId: item.id, meta });
    }

    return {
      message: 'Wardrobe item updated successfully',
      item: this.toCamel(item),
    };
  }

  // 👉 ADD THIS RIGHT BELOW updateItem
  async updateFavorite(itemId: string, favorite: boolean) {
    const result = await pool.query(
      `UPDATE wardrobe_items
     SET favorite = $1,
         updated_at = now()
     WHERE id = $2
     RETURNING *`,
      [favorite, itemId],
    );
    return result.rows[0];
  }

  // DELETE
  async deleteItem(dto: DeleteItemDto) {
    const { item_id, user_id, image_url } = dto;
    try {
      await pool.query(
        'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
        [item_id, user_id],
      );
    } catch (err: any) {
      console.warn(`⚠️ Skipped DB delete: ${err.message}`);
    }
    try {
      await deleteItemNs(user_id, item_id);
    } catch (err: any) {
      console.warn(`⚠️ Pinecone delete skipped: ${err.message}`);
    }
    if (image_url) {
      const bucketName = process.env.GCS_BUCKET_NAME!;
      const fileName = this.extractFileName(image_url);
      try {
        await storage.bucket(bucketName).file(fileName).delete();
      } catch (err: any) {
        if ((err as any).code === 404) {
          console.warn('🧼 GCS file already deleted:', fileName);
        } else {
          console.error('❌ Error deleting GCS file:', (err as any).message);
        }
      }
    }
    return { message: 'Wardrobe item cleanup attempted (DB, Pinecone, GCS)' };
  }

  // VECTOR SEARCH UTILITIES
  async suggestOutfits(userId: string, queryVec: number[]) {
    const matches = await queryUserNs({
      userId,
      vector: queryVec,
      topK: 20,
      includeMetadata: true,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }
  async searchText(userId: string, q: string, topK = 20) {
    const vec = await this.vertex.embedText(q);
    const matches = await queryUserNs({
      userId,
      vector: vec,
      topK,
      includeMetadata: true,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }
  async searchImage(userId: string, gcsUri: string, topK = 20) {
    const vec = await this.vertex.embedImage(gcsUri);
    const matches = await queryUserNs({
      userId,
      vector: vec,
      topK,
      includeMetadata: true,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }
  async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
    const [textVec, imageVec] = await Promise.all([
      q ? this.vertex.embedText(q) : Promise.resolve(undefined),
      gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
    ]);
    const matches = await hybridQueryUserNs({
      userId,
      textVec,
      imageVec,
      topK,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }

  // Label helper
  private summarizeItem(meta: any): string {
    if (!meta) return 'Item';
    const name = (meta.name || '').toString().trim();

    const color = meta.color || meta.color_family;
    const cat = meta.main_category || meta.mainCategory;
    const sub = meta.subcategory || meta.subCategory;
    const mat = meta.material;
    const brand = meta.brand;
    const fit = meta.fit;
    const size = meta.size_label || meta.size;
    const dress = meta.dress_code || meta.dressCode;
    const role = meta.anchor_role || meta.anchorRole;
    const patternish = meta.pattern_scale || meta.patternScale || meta.pattern;

    // ── NEW: slot detection to make roles explicit ─────────────
    const toLc = (s: any) => (s ?? '').toString().trim().toLowerCase();
    const mainLc = toLc(cat);
    const subLc = toLc(sub);

    const isBottom =
      mainLc === 'bottoms' ||
      /\b(trouser|pants|jeans|chinos|shorts|joggers?|sweatpants?|track\s*pants?)\b/i.test(
        subLc,
      );

    const isShoes =
      mainLc === 'shoes' ||
      /\b(sneakers?|trainers?|running|athletic|loafers?|boots?|oxfords?|derbys?|dress\s*shoes?|sandals?)\b/i.test(
        subLc,
      );

    const isOuter =
      mainLc === 'outerwear' ||
      /\b(blazer|sport\s*coat|suit\s*jacket|jacket|coat|windbreaker|parka|trench|overcoat|topcoat)\b/i.test(
        subLc,
      );

    const isTop =
      mainLc === 'tops' ||
      /\b(t-?shirt|tee|polo|shirt|sweater|knit|henley|hoodie)\b/i.test(subLc);

    const isAcc =
      mainLc === 'accessories' ||
      /\b(belt|watch|hat|scarf|tie|sunglasses|bag|briefcase)\b/i.test(subLc);

    const slot =
      (isBottom && 'BOTTOM') ||
      (isShoes && 'SHOES') ||
      (isOuter && 'OUTER') ||
      (isTop && 'TOP') ||
      (isAcc && 'ACC') ||
      undefined;

    // ───────────────────────────────────────────────────────────

    const primary = [color, mat, sub || cat].filter(Boolean).join(' ');

    const season =
      meta.seasonality ||
      (Array.isArray(meta.seasonality_arr) && meta.seasonality_arr.join('/'));
    const temp = meta.color_temp;
    const contrast = meta.contrast_profile;
    const form = meta.formality_score != null ? `F${meta.formality_score}` : '';

    const extras = [
      brand && `${brand}`,
      fit && `${fit} fit`,
      size && `(${size})`,
      dress && `${dress}`,
      role && `${role} role`,
      patternish && `pattern:${patternish}`,
      season && `${season}`,
      temp && `temp:${temp}`,
      contrast && `contrast:${contrast}`,
      form,
    ]
      .filter(Boolean)
      .join(', ');

    const headRaw = primary || name || 'Item';
    const head = slot ? `[${slot}] ${headRaw}` : headRaw;
    return extras ? `${head} — ${extras}` : head;
  }
}

/////////////////////

// // apps/backend-nest/src/wardrobe/wardrobe.service.ts

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { Storage } from '@google-cloud/storage';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
// import { VertexService } from '../vertex/vertex.service';
// import { randomUUID } from 'crypto'; // ← NEW

// // NEW imports for extracted logic (prompts + scoring only)
// import { parseConstraints } from './logic/constraints';
// import {
//   rerankCatalogWithContext,
//   DEFAULT_CONTEXT_WEIGHTS,
//   type ContextWeights,
// } from './logic/scoring';
// import type { UserStyle } from './logic/style';
// import type { WeatherContext } from './logic/weather';
// import { finalizeOutfitSlots } from './logic/finalize';
// import { enforceConstraintsOnOutfits } from './logic/enforce';
// import { buildOutfitPrompt } from './prompts/outfitPrompt';
// import { extractStrictJson } from './logic/json';
// import { applyContextualFilters } from './logic/contextFilters';

// // NEW: feedback filters
// import {
//   applyFeedbackFilters,
//   compileFeedbackRulesFromRows,
//   OutfitFeedbackRow, // ✅ correct type
// } from './logic/feedbackFilters';

// /**
//  * Postgres connection pool.
//  * - SSL enabled for managed DBs.
//  * - Used for all CRUD on wardrobe_items table.
//  */
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// /**
//  * Google Cloud Storage client.
//  * - Used to delete images from GCS when wardrobe items are removed.
//  */
// const storage = new Storage();

// // ─────────────────────────────────────────────────────────────────────────────
// // Catalog typing + coercion helpers
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * The shape of an item the "catalog" (Pinecone search results) feeds into the
//  * outfit generator. This is a lightweight, prompt-friendly view.
//  */
// type CatalogItem = {
//   index: number;
//   id: string;
//   label: string;
//   image_url?: string;

//   // core used by all scorers
//   main_category?: string;
//   subcategory?: string;
//   color?: string;
//   color_family?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   formality_score?: number;

//   // extras used by style/weather scorers (all optional)
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string; // 'Base' | 'Mid' | 'Outer'
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// // ── Weights normalization helpers ────────────────────────────────────────────
// type WeightsLong = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
//   feedbackWeight?: number;
// };
// type WeightsShort = {
//   constraints: number;
//   style: number;
//   weather: number;
//   feedback?: number;
// };
// type AnyWeights = WeightsLong | WeightsShort;

// function toLongWeights(w: AnyWeights): WeightsLong {
//   if ('styleWeight' in w) return { ...w };
//   return {
//     constraintsWeight: w.constraints,
//     styleWeight: w.style,
//     weatherWeight: w.weather,
//     feedbackWeight: w.feedback,
//   };
// }
// function fromLongWeights(longW: WeightsLong, like: AnyWeights): AnyWeights {
//   if ('styleWeight' in like) return { ...longW };
//   return {
//     constraints: longW.constraintsWeight,
//     style: longW.styleWeight,
//     weather: longW.weatherWeight,
//     feedback: longW.feedbackWeight,
//   };
// }

// // Soft numeric prefs derived from feedback rules (only for rerank nudges)
// function buildUserPrefsFromRules(
//   catalog: Array<{
//     id?: string;
//     label?: string;
//     subcategory?: string;
//     main_category?: string;
//     color?: string;
//     color_family?: string;
//   }>,
//   rules: ReturnType<typeof compileFeedbackRulesFromRows>,
// ): Map<string, number> {
//   const m = new Map<string, number>();
//   if (!rules?.length || !catalog?.length) return m;

//   const lc = (v?: string) => (v ?? '').toLowerCase();

//   // mirror the predicate logic lightly to issue a -5 soft penalty
//   const hit = (it: any): boolean => {
//     const id = it?.id;
//     const brand = lc((it as any).brand);
//     const color = lc((it as any).color) || lc((it as any).color_family);
//     const main = lc((it as any).main_category);
//     const sub = lc((it as any).subcategory);
//     const lbl = lc((it as any).label);

//     for (const r of rules) {
//       switch (r.kind) {
//         case 'excludeItemIds':
//           if (id && r.item_ids.includes(id)) return true;
//           break;
//         case 'excludeBrand':
//           if (brand && brand.includes(lc(r.brand))) {
//             if (!r.category) return true;
//             if (main.includes(lc(r.category))) return true;
//           }
//           break;
//         case 'excludeColorOnCategory':
//           if (
//             r.category &&
//             (main.includes(r.category) || sub.includes(r.category))
//           ) {
//             if (color.includes(r.color)) return true;
//             if (lbl.includes(r.color)) return true;
//           }
//           break;
//         case 'excludeColor':
//           if (color.includes(r.color) || lbl.includes(r.color)) return true;
//           break;
//         case 'excludeSubstring':
//           if ((r.field === 'label' ? lbl : sub).includes(lc(r.value))) {
//             if (!r.category) return true;
//             if (main.includes(lc(r.category))) return true;
//           }
//           break;
//       }
//     }
//     return false;
//   };

//   for (const it of catalog) {
//     const id = it?.id;
//     if (!id) continue;
//     if (hit(it)) m.set(id, -5); // -5 raw → scaled to ~ -0.2 in reranker
//   }
//   return m;
// }

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // ─────────────────────────────────────────────────────────────
//   // Enum whitelists
//   // ─────────────────────────────────────────────────────────────

//   private static readonly PATTERN_ENUM_WHITELIST: string[] = [
//     'SOLID',
//     'STRIPE',
//     'CHECK',
//     'HERRINGBONE',
//     'WINDOWPANE',
//     'FLORAL',
//     'DOT',
//     'CAMO',
//     'ABSTRACT',
//     'OTHER',
//   ];
//   private static readonly SEASONALITY_ENUM_WHITELIST: string[] = [
//     'SS',
//     'FW',
//     'ALL_SEASON',
//   ];
//   private static readonly LAYERING_ENUM_WHITELIST: string[] = [
//     'BASE',
//     'MID',
//     'SHELL',
//     'ACCENT',
//   ];

//   // Generic safe-casters
//   private asStr(v: any): string | undefined {
//     if (v === undefined || v === null) return undefined;
//     const s = String(v).trim();
//     return s ? s : undefined;
//   }
//   private asNum(v: any): number | undefined {
//     if (v === undefined || v === null) return undefined;
//     const n = Number(v);
//     return Number.isFinite(n) ? n : undefined;
//   }

//   // Pull user feedback rows from your DB (adjust table/columns if yours differ)

//   // Replace your current fetchFeedbackRows with this exact version:
//   private async fetchFeedbackRows(
//     userId: string,
//   ): Promise<OutfitFeedbackRow[]> {
//     // Adjust table/column names only if they differ in your DB.
//     // This version is compatible with your CSV: rating = -1/1, notes = free text.
//     const { rows } = await pool.query(
//       `SELECT id, user_id, outfit_id, rating, notes, created_at
//        FROM outfit_feedback
//       WHERE user_id = $1
//       ORDER BY created_at DESC
//       LIMIT 500`,
//       [userId],
//     );

//     return rows.map((r: any) => {
//       // rating: -1 => "dislike", 1 => "like", anything else => null
//       const rating =
//         r.rating === -1 ? 'dislike' : r.rating === 1 ? 'like' : null;

//       // notes may be plain text like: "Avoid shoes with green in them."
//       // Keep as-is; compileFeedbackRulesFromRows() will parse color/brand/slot.
//       const notes =
//         typeof r.notes === 'string' && r.notes.trim().length ? r.notes : null;

//       return {
//         id: String(r.id),
//         request_id: '', // unknown here
//         user_id: String(r.user_id),
//         rating, // "like" | "dislike" | null
//         tags: null, // not present in your CSV
//         notes, // free text
//         outfit_json: null, // not present in your CSV
//         created_at: String(r.created_at),
//       } as OutfitFeedbackRow;
//     });
//   }

//   // Normalizers
//   private normLower(val?: string | null) {
//     if (!val) return undefined;
//     const s = String(val).trim();
//     if (!s) return undefined;
//     return s.toLowerCase();
//   }
//   private normalizePattern(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       solid: 'SOLID',
//       stripe: 'STRIPE',
//       striped: 'STRIPE',
//       stripes: 'STRIPE',
//       plaid: 'CHECK',
//       check: 'CHECK',
//       checked: 'CHECK',
//       herringbone: 'HERRINGBONE',
//       windowpane: 'WINDOWPANE',
//       floral: 'FLORAL',
//       flower: 'FLORAL',
//       dot: 'DOT',
//       dots: 'DOT',
//       polka: 'DOT',
//       polka_dot: 'DOT',
//       camo: 'CAMO',
//       camouflage: 'CAMO',
//       abstract: 'ABSTRACT',
//       print: 'ABSTRACT',
//       printed: 'ABSTRACT',
//       graphic: 'ABSTRACT',
//       other: 'OTHER',
//     };
//     return map[s] ?? undefined;
//   }
//   private coerceMainCategoryFromSub(
//     rawMain?: string,
//     sub?: string,
//   ): string | undefined {
//     const main = (rawMain ?? '').trim();
//     const s = (sub ?? '').toLowerCase();

//     const isOuter = [
//       'blazer',
//       'sport coat',
//       'sportcoat',
//       'suit jacket',
//       'jacket',
//       'coat',
//       'parka',
//       'trench',
//       'overcoat',
//       'topcoat',
//     ].some((k) => s.includes(k));
//     if (isOuter) return 'Outerwear';

//     const isShoe = [
//       'loafer',
//       'loafers',
//       'sneaker',
//       'sneakers',
//       'boot',
//       'boots',
//       'heel',
//       'heels',
//       'pump',
//       'oxford',
//       'derby',
//       'dress shoe',
//       'dress shoes',
//       'sandal',
//       'sandals',
//     ].some((k) => s.includes(k));
//     if (isShoe) return 'Shoes';

//     const isAccessory = [
//       'belt',
//       'hat',
//       'scarf',
//       'tie',
//       'watch',
//       'sunglasses',
//       'bag',
//       'briefcase',
//     ].some((k) => s.includes(k));
//     if (isAccessory) return 'Accessories';

//     return main || undefined;
//   }
//   private normalizeAnchorRole(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       hero: 'Hero',
//       neutral: 'Neutral',
//       connector: 'Connector',
//     };
//     return map[s] ?? undefined;
//   }
//   private normalizeSeasonality(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       ss: 'SS',
//       'spring/summer': 'SS',
//       spring: 'SS',
//       summer: 'SS',
//       fw: 'FW',
//       'fall/winter': 'FW',
//       fall: 'FW',
//       autumn: 'FW',
//       winter: 'FW',
//       allseason: 'ALL_SEASON',
//       'all season': 'ALL_SEASON',
//       'all-season': 'ALL_SEASON',
//       all_season: 'ALL_SEASON',
//       all: 'ALL_SEASON',
//       'year-round': 'ALL_SEASON',
//       'year round': 'ALL_SEASON',
//     };
//     return map[s];
//   }

//   // Ultra-casual screen used only when the query implies "upscale"
//   private isUltraCasualForUpscale(c: {
//     main_category?: string;
//     subcategory?: string;
//     label?: string;
//     dress_code?: string;
//     formality_score?: number;
//   }): boolean {
//     const main = (c.main_category ?? '').toLowerCase();
//     const sub = (c.subcategory ?? '').toLowerCase();
//     const lbl = (c.label ?? '').toLowerCase();

//     // obvious casual tops & loud casual items
//     const casualWords = /(t-?shirt|tee|hoodie|tank|graphic tee|hawaiian)/;
//     if (casualWords.test(sub) || casualWords.test(lbl)) return true;

//     // shorts for bottoms
//     if (main === 'bottoms' && /\bshorts?\b/.test(sub)) return true;

//     // jeans: allow only if clearly dressy; otherwise screen out for upscale
//     if (/\bjeans?\b/.test(sub) && (c.formality_score ?? 0) < 6) return true;

//     // generic dress code + formality gate
//     const dc = c.dress_code;
//     if (
//       dc &&
//       (dc === 'UltraCasual' || dc === 'Casual') &&
//       (c.formality_score ?? 0) < 6
//     ) {
//       return true;
//     }

//     return false;
//   }

//   private retitleOutfit(o: {
//     title: string;
//     why: string;
//     items: CatalogItem[];
//   }): { title: string; why: string } {
//     if (!o.items?.length) return { title: o.title, why: o.why };

//     const tops = o.items.filter(
//       (c) => (c.main_category ?? '').toLowerCase() === 'tops',
//     );
//     const bottoms = o.items.filter(
//       (c) => (c.main_category ?? '').toLowerCase() === 'bottoms',
//     );
//     const shoes = o.items.filter(
//       (c) => (c.main_category ?? '').toLowerCase() === 'shoes',
//     );

//     const topName = tops[0]?.label ?? '';
//     const bottomName = bottoms[0]?.label ?? '';
//     const shoeName = shoes[0]?.label ?? '';

//     // Very simple rewrite
//     const title = `Outfit with ${[topName, bottomName, shoeName]
//       .filter(Boolean)
//       .join(', ')}`;

//     const why = `This look combines ${topName || 'a top'} with ${
//       bottomName || 'a bottom'
//     } and ${shoeName || 'shoes'} for a complete outfit.`;

//     return { title, why };
//   }

//   /**
//    * MAIN OUTFIT GENERATOR
//    */
//   async generateOutfits(
//     userId: string,
//     query: string,
//     topK: number,
//     opts?: {
//       userStyle?: UserStyle;
//       weather?: WeatherContext;
//       weights?: ContextWeights;
//       useWeather?: boolean;
//       useFeedback?: boolean; // 👈 add this
//     },
//   ) {
//     try {
//       // 1) Vectorize query and pull nearest items
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({
//         userId,
//         vector: queryVec,
//         topK,
//         includeMetadata: true,
//       });

//       // 2) Build catalog
//       let catalog: CatalogItem[] = matches.map((m, i) => {
//         const { id } = this.normalizePineconeId(m.id as string);
//         const meta: any = m.metadata || {};
//         const sub_raw = this.asStr(meta.subcategory ?? meta.subCategory);
//         const main_raw = this.asStr(meta.main_category ?? meta.mainCategory);
//         const main_fix = this.coerceMainCategoryFromSub(main_raw, sub_raw);

//         return {
//           index: i + 1,
//           id,
//           label: this.summarizeItem(meta),

//           image_url: this.asStr(meta.image_url ?? meta.imageUrl),
//           main_category: main_fix,
//           subcategory: sub_raw,
//           color: this.asStr(meta.color ?? meta.color_family),
//           color_family: this.asStr(meta.color_family),
//           shoe_style: this.asStr(meta.shoe_style),
//           dress_code: this.asStr(meta.dress_code ?? meta.dressCode),

//           formality_score: this.asNum(meta.formality_score),

//           brand: this.asStr(meta.brand),
//           material: this.asStr(meta.material),
//           sleeve_length: this.asStr(meta.sleeve_length),
//           layering: this.asStr(meta.layering),
//           waterproof_rating: this.asNum(meta.waterproof_rating),
//           rain_ok: !!meta.rain_ok,
//         };
//       });

//       // 3) Contextual pre-filters (gym / black tie / beach / wedding / upscale)
//       catalog = applyContextualFilters(query, catalog, { minKeep: 6 });

//       // 3b) Apply user feedback (dislikes/bans) before reranking/LLM
//       let feedbackRows: any[] = [];
//       let feedbackRules: any[] = [];
//       let userPrefs = new Map<string, number>();

//       // 🔑 Respect frontend toggle + env var
//       const clientWantsFeedback = opts?.useFeedback !== false; // default ON if undefined
//       const envDisable = process.env.DISABLE_FEEDBACK === '1';
//       const disableFeedback = !clientWantsFeedback || envDisable;

//       console.log('[FEEDBACK] useFeedback (client):', opts?.useFeedback);
//       // console.log('[FEEDBACK] DISABLE_FEEDBACK (env):', envDisable);
//       // console.log('[FEEDBACK] Effective disableFeedback =', disableFeedback);

//       if (!disableFeedback) {
//         feedbackRows = await this.fetchFeedbackRows(userId);
//         feedbackRules = compileFeedbackRulesFromRows(feedbackRows);

//         // Optional debug: see what got blocked (disabled by default)
//         if (process.env.DEBUG_FEEDBACK === '1' && feedbackRules.length) {
//           const strongPreview = catalog.filter(
//             (it) =>
//               !feedbackRules.some((r) => {
//                 try {
//                   return (
//                     (r as any) &&
//                     (function rule(it: any) {
//                       switch (r.kind) {
//                         case 'excludeItemIds':
//                           return !!(it.id && r.item_ids.includes(it.id));
//                         default:
//                           return false;
//                       }
//                     })(it)
//                   );
//                 } catch {
//                   return false;
//                 }
//               }),
//           );
//           console.debug('[FEEDBACK] rules:', feedbackRules);
//           console.debug(
//             '[FEEDBACK] catalog before/after (counts):',
//             catalog.length,
//             '→ (preview)',
//             strongPreview.length,
//           );
//         }

//         // Enforce (strong, then soften if list would get too small)
//         catalog = applyFeedbackFilters(catalog, feedbackRules, {
//           minKeep: 6,
//           softenWhenBelow: true,
//         });

//         // 1) Build soft prefs from rules
//         userPrefs = buildUserPrefsFromRules(catalog, feedbackRules);

//         // 2) Pull per-item preference scores from DB
//         const prefRes = await pool.query(
//           `SELECT item_id, score FROM user_pref_item WHERE user_id = $1`,
//           [userId],
//         );
//         const prefMap = new Map<string, number>(
//           prefRes.rows.map((r: any) => [String(r.item_id), Number(r.score)]),
//         );

//         // 3) Merge DB scores into userPrefs
//         for (const [itemId, score] of prefMap) {
//           const existing = userPrefs.get(itemId) ?? 0;
//           userPrefs.set(itemId, existing + score);
//         }
//       } else {
//         console.log('[FEEDBACK] Feedback influence skipped.');
//       }

//       // Keep this only to cap style weight when the user asked for upscale vibes
//       const needUpscale =
//         /\b(upscale|smart\s*casual|business|formal|dressy|rooftop)\b/i.test(
//           query,
//         );

//       const baseConstraints = parseConstraints(query);
//       const constraints = { ...baseConstraints };

//       // keep your existing weight normalization
//       const incoming = opts?.weights ?? DEFAULT_CONTEXT_WEIGHTS;
//       const longW = toLongWeights(incoming);
//       if (needUpscale && longW.styleWeight > 0.35) {
//         longW.styleWeight = 0.35;
//       }
//       const tunedWeights = fromLongWeights(longW, incoming) as ContextWeights;

//       // 4) Proceed to rerank with enriched (or empty) userPrefs
//       const reranked = rerankCatalogWithContext(catalog, constraints, {
//         userStyle: opts?.userStyle,
//         weather: opts?.weather,
//         weights: tunedWeights,
//         useWeather: opts?.useWeather,
//         userPrefs, // ✅ real prefs or {} if disabled
//       });

//       // 4) Build prompt
//       const catalogLines = reranked
//         .map((c) => `${c.index}. ${c.label}`)
//         .join('\n');
//       const prompt = buildOutfitPrompt(catalogLines, query);

//       // 5) LLM call and parse
//       const raw = await this.vertex.generateReasonedOutfit(prompt);
//       const text =
//         (raw?.candidates?.[0]?.content?.parts?.[0]?.text as string) ??
//         (typeof raw === 'string' ? raw : '');
//       const parsed = extractStrictJson(text);

//       // Map by index
//       const byIndex = new Map<number, (typeof reranked)[number]>();
//       reranked.forEach((c) => byIndex.set(c.index, c));
//       catalog.forEach((c) => byIndex.set(c.index, c)); // backup

//       // 6) Build outfits
//       let outfits = (parsed.outfits || []).map((o: any) => ({
//         title: String(o.title ?? 'Outfit'),
//         items: Array.isArray(o.items)
//           ? (o.items
//               .map((it: any) => {
//                 if (typeof it === 'number') return byIndex.get(it);
//                 if (typeof it === 'string') {
//                   const n = Number(it.trim());
//                   if (!Number.isNaN(n)) return byIndex.get(n);
//                   return catalog.find(
//                     (c) => c.label.toLowerCase() === it.toLowerCase(),
//                   );
//                 }
//                 return undefined;
//               })
//               .filter(Boolean) as CatalogItem[])
//           : [],
//         why: String(o.why ?? ''),
//         missing: o.missing ? String(o.missing) : undefined,
//       }));

//       // ─────────────────────────────────────────────────────────
//       // HARD REPAIR: ensure required slots exist (bottom + shoes)
//       // Gym intent also requires sneakers.
//       // ─────────────────────────────────────────────────────────
//       const toLc = (s?: string) => (s ?? '').toLowerCase();
//       const gymIntent = /\b(gym|work ?out|workout|training|exercise)\b/i.test(
//         query,
//       );

//       const isBottom = (c?: CatalogItem) => {
//         if (!c) return false;
//         const main = toLc(c.main_category);
//         const sub = toLc(c.subcategory);
//         const lbl = toLc(c.label);
//         return (
//           main === 'bottoms' ||
//           /\b(trouser|pants|jeans|chinos|shorts|joggers?|sweatpants?|track\s*pants?)\b/i.test(
//             sub,
//           ) ||
//           /\bshorts?\b/i.test(lbl)
//         );
//       };
//       const isShoes = (c?: CatalogItem) => {
//         if (!c) return false;
//         const main = toLc(c.main_category);
//         const sub = toLc(c.subcategory);
//         return (
//           main === 'shoes' ||
//           /\b(sneakers?|trainers?|running|athletic|loafers?|boots?|oxfords?|derbys?|dress\s*shoes?|sandals?)\b/i.test(
//             sub,
//           )
//         );
//       };
//       const isSneaker = (c?: CatalogItem) => {
//         if (!c) return false;
//         const sub = toLc(c.subcategory);
//         const lbl = toLc(c.label);
//         return /\b(sneakers?|trainers?|running|athletic)\b/i.test(sub || lbl);
//       };
//       const isTop = (c?: CatalogItem) => {
//         if (!c) return false;
//         const main = toLc(c.main_category);
//         const sub = toLc(c.subcategory);
//         return (
//           main === 'tops' ||
//           /\b(t-?shirt|tee|polo|shirt|sweater|knit|henley|hoodie)\b/i.test(sub)
//         );
//       };
//       const orderRank = (c: CatalogItem) =>
//         isTop(c) ? 1 : isBottom(c) ? 2 : isShoes(c) ? 3 : 4;

//       const firstBottom = reranked.find(isBottom);
//       const firstShoes = reranked.find(isShoes);
//       const firstSneaker = reranked.find(isSneaker);
//       const firstTop = reranked.find(isTop);

//       outfits = outfits.map((o) => {
//         const haveBottom = o.items.some(isBottom);
//         const haveShoes = o.items.some(isShoes);
//         const haveSneaker = o.items.some(isSneaker);
//         const already = new Set(o.items.map((x) => x?.id));

//         // Gym: sneakers required
//         if (
//           gymIntent &&
//           !haveSneaker &&
//           firstSneaker &&
//           !already.has(firstSneaker.id)
//         ) {
//           o.items.push(firstSneaker);
//           o.missing = o.missing || 'auto-added sneakers for gym';
//           already.add(firstSneaker.id);
//         }

//         // Always ensure a bottom exists
//         if (!haveBottom && firstBottom && !already.has(firstBottom.id)) {
//           o.items.push(firstBottom);
//           o.missing = o.missing || 'auto-added bottom';
//           already.add(firstBottom.id);
//         }

//         // Always ensure some shoes exist
//         if (!haveShoes && firstShoes && !already.has(firstShoes.id)) {
//           o.items.push(firstShoes);
//           o.missing = o.missing || 'auto-added shoes';
//           already.add(firstShoes.id);
//         }

//         // Optional: ensure at least one top exists
//         if (!o.items.some(isTop) && firstTop && !already.has(firstTop.id)) {
//           o.items.unshift(firstTop);
//           o.missing = o.missing || 'auto-added top';
//           already.add(firstTop.id);
//         }

//         // Keep a stable, readable order: TOP, BOTTOM, SHOES, then others
//         o.items = [...o.items].sort((a, b) => orderRank(a) - orderRank(b));
//         return o;
//       });

//       // finalize
//       outfits = outfits.map((o) => finalizeOutfitSlots(o, reranked, query));
//       outfits = enforceConstraintsOnOutfits(
//         outfits as any,
//         reranked as any,
//         query,
//       ) as any;

//       // ──────────────────────────────────────────────
//       // Retitle / rewrite "why" so it matches final items
//       // ──────────────────────────────────────────────
//       outfits = outfits.map((o) => {
//         const { title, why } = this.retitleOutfit(o);
//         return { ...o, title, why };
//       });

//       // ──────────────────────────────────────────────────────────────
//       // NEW: minimal personalization using per-item prefs
//       // ──────────────────────────────────────────────────────────────
//       const withIds = outfits.map((o) => ({
//         ...o,
//         outfit_id: randomUUID(),
//       }));
//       const ids = Array.from(
//         new Set(
//           withIds.flatMap((o) =>
//             o.items.map((it: any) => it?.id).filter(Boolean),
//           ),
//         ),
//       ) as string[];

//       // small, safe table for user item prefs (auto-creates once)
//       await pool.query(
//         `CREATE TABLE IF NOT EXISTS user_pref_item(
//          user_id TEXT NOT NULL,
//          item_id TEXT NOT NULL,
//          score REAL NOT NULL DEFAULT 0,
//          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
//          PRIMARY KEY (user_id, item_id)
//        );`,
//       );

//       const prefRows =
//         ids.length > 0
//           ? await pool.query(
//               'SELECT item_id, score FROM user_pref_item WHERE user_id = $1 AND item_id = ANY($2)',
//               [userId, ids],
//             )
//           : { rows: [] as any[] };

//       const pref = new Map<string, number>(
//         prefRows.rows.map((r: any) => [String(r.item_id), Number(r.score)]),
//       );

//       const ranked = withIds
//         .map((o) => {
//           const items = o.items as any[];
//           const boost =
//             items.length === 0
//               ? 0
//               : items.reduce((a, it) => a + (pref.get(it?.id) ?? 0), 0) /
//                 items.length;
//           return { o, boost };
//         })
//         .sort((a, b) => b.boost - a.boost);

//       const best = ranked[0]?.o ??
//         withIds[0] ?? {
//           items: [],
//           why: '',
//           missing: undefined,
//           outfit_id: 'o1',
//         };

//       const request_id = randomUUID();

//       // ✅ FINAL OUTFIT DEBUG LOG (safe placement)
//       if (process.env.NODE_ENV !== 'production') {
//         console.dir(
//           {
//             level: 'OUTFIT_RESULT',
//             request_id,
//             user_id: userId,
//             query,
//             best_outfit: {
//               outfit_id: (best as any).outfit_id,
//               title: (best as any).title,
//               why: (best as any).why,
//               missing: (best as any).missing,
//               items: (best as any).items.map((it: any) => ({
//                 id: it?.id,
//                 label: it?.label,
//                 image_url: it?.image_url,
//                 main_category: it?.main_category,
//                 subcategory: it?.subcategory,
//                 brand: it?.brand,
//                 color: it?.color,
//                 dress_code: it?.dress_code,
//                 formality_score: it?.formality_score,
//               })),
//             },
//             all_outfits: withIds.map((o) => ({
//               outfit_id: o.outfit_id,
//               title: o.title,
//               why: o.why,
//               missing: o.missing,
//               items: o.items.map((it) => ({
//                 id: it?.id,
//                 label: it?.label,
//                 image_url: it?.image_url,
//                 main_category: it?.main_category,
//                 subcategory: it?.subcategory,
//                 brand: it?.brand,
//                 color: it?.color,
//                 dress_code: it?.dress_code,
//                 formality_score: it?.formality_score,
//               })),
//             })),
//           },
//           { depth: null },
//         );
//       }

//       // Return shape compatible with your mobile screen (uses current?.items/why/missing)
//       return {
//         request_id,
//         outfit_id: (best as any).outfit_id,
//         items: (best as any).items,
//         why: (best as any).why,
//         missing: (best as any).missing,
//         outfits: withIds, // keep full list if UI/telemetry needs it
//       };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }

//   /**
//    * Defensive extractor for various LLM wrapper shapes.
//    */
//   private extractModelText(output: any): string {
//     if (typeof output === 'string') return output;

//     const parts = output?.candidates?.[0]?.content?.parts;
//     if (Array.isArray(parts)) {
//       const joined = parts.map((p: any) => p?.text ?? '').join('');
//       if (joined) return joined;
//     }
//     if (typeof output?.text === 'string') return output.text;
//     return JSON.stringify(output ?? '');
//   }

//   private parseModelJson(s: string): any {
//     const cleaned = s
//       .replace(/^\s*```(?:json)?\s*/i, '')
//       .replace(/\s*```\s*$/i, '')
//       .trim();

//     try {
//       return JSON.parse(cleaned);
//     } catch {
//       const m = cleaned.match(/\{[\s\S]*\}/);
//       if (m) return JSON.parse(m[0]);
//       throw new Error('Model did not return valid JSON.');
//     }
//   }

//   // More text-normalizers
//   private normalizeDressCode(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<
//       string,
//       | 'UltraCasual'
//       | 'Casual'
//       | 'SmartCasual'
//       | 'BusinessCasual'
//       | 'Business'
//       | 'BlackTie'
//     > = {
//       ultracasual: 'UltraCasual',
//       ultra_casual: 'UltraCasual',
//       casual: 'Casual',
//       smartcasual: 'SmartCasual',
//       smart_casual: 'SmartCasual',
//       businesscasual: 'BusinessCasual',
//       business_casual: 'BusinessCasual',
//       business: 'Business',
//       blacktie: 'BlackTie',
//       black_tie: 'BlackTie',
//       'black tie': 'BlackTie',
//     };
//     return map[s];
//   }
//   private normalizeLayering(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       base: 'BASE',
//       baselayer: 'BASE',
//       'base layer': 'BASE',
//       mid: 'MID',
//       midlayer: 'MID',
//       'mid layer': 'MID',
//       shell: 'SHELL',
//       outer: 'SHELL',
//       outerwear: 'SHELL',
//       jacket: 'SHELL',
//       accent: 'ACCENT',
//       accessory: 'ACCENT',
//       acc: 'ACCENT',
//     };
//     return map[s];
//   }

//   // DTO-facing normalizers
//   private normalizeMainCategory(
//     val?: string | null,
//   ): CreateWardrobeItemDto['main_category'] {
//     const unions: CreateWardrobeItemDto['main_category'][] = [
//       'Tops',
//       'Bottoms',
//       'Outerwear',
//       'Shoes',
//       'Accessories',
//       'Undergarments',
//       'Activewear',
//       'Formalwear',
//       'Loungewear',
//       'Sleepwear',
//       'Swimwear',
//       'Maternity',
//       'Unisex',
//       'Costumes',
//       'TraditionalWear',
//     ];
//     const raw = (val ?? '').toString().trim();
//     if (unions.includes(raw as any))
//       return raw as CreateWardrobeItemDto['main_category'];
//     const s = raw.toLowerCase();
//     const map: Record<string, CreateWardrobeItemDto['main_category']> = {
//       top: 'Tops',
//       tops: 'Tops',
//       tshirt: 'Tops',
//       't-shirt': 'Tops',
//       tee: 'Tops',
//       shirt: 'Tops',
//       blouse: 'Tops',
//       knit: 'Tops',
//       sweater: 'Tops',
//       bottom: 'Bottoms',
//       bottoms: 'Bottoms',
//       pants: 'Bottoms',
//       trousers: 'Bottoms',
//       jeans: 'Bottoms',
//       chinos: 'Bottoms',
//       shorts: 'Bottoms',
//       skirt: 'Bottoms',
//       outer: 'Outerwear',
//       outerwear: 'Outerwear',
//       jacket: 'Outerwear',
//       coat: 'Outerwear',
//       parka: 'Outerwear',
//       blazer: 'Outerwear',
//       shoe: 'Shoes',
//       shoes: 'Shoes',
//       sneaker: 'Shoes',
//       sneakers: 'Shoes',
//       boot: 'Shoes',
//       boots: 'Shoes',
//       heel: 'Shoes',
//       loafers: 'Shoes',
//       accessory: 'Accessories',
//       accessories: 'Accessories',
//       bag: 'Accessories',
//       belt: 'Accessories',
//       hat: 'Accessories',
//       scarf: 'Accessories',
//       tie: 'Accessories',
//       sunglasses: 'Accessories',
//       watch: 'Accessories',
//       underwear: 'Undergarments',
//       undergarments: 'Undergarments',
//       bra: 'Undergarments',
//       briefs: 'Undergarments',
//       socks: 'Undergarments',
//       active: 'Activewear',
//       activewear: 'Activewear',
//       athleisure: 'Activewear',
//       gym: 'Activewear',
//       formal: 'Formalwear',
//       formalwear: 'Formalwear',
//       suit: 'Formalwear',
//       tuxedo: 'Formalwear',
//       lounge: 'Loungewear',
//       loungewear: 'Loungewear',
//       sweats: 'Loungewear',
//       sleep: 'Sleepwear',
//       sleepwear: 'Sleepwear',
//       pajama: 'Sleepwear',
//       pajamas: 'Sleepwear',
//       swim: 'Swimwear',
//       swimwear: 'Swimwear',
//       swimsuit: 'Swimwear',
//       trunks: 'Swimwear',
//       bikini: 'Swimwear',
//       maternity: 'Maternity',
//       unisex: 'Unisex',
//       costume: 'Costumes',
//       costumes: 'Costumes',
//       'traditional wear': 'TraditionalWear',
//       traditionalwear: 'TraditionalWear',
//       kimono: 'TraditionalWear',
//       sari: 'TraditionalWear',
//     };
//     return map[s] ?? 'Tops';
//   }
//   private resolveMainCategory(
//     rawMain?: string | null,
//     sub?: string | null,
//     layering?: string | null,
//   ): CreateWardrobeItemDto['main_category'] {
//     const normalized = this.normalizeMainCategory(rawMain);
//     const s = (sub ?? '').toLowerCase();
//     const lay = (layering ?? '').toUpperCase();
//     if (
//       [
//         'blazer',
//         'sport coat',
//         'sportcoat',
//         'suit jacket',
//         'jacket',
//         'coat',
//         'parka',
//         'trench',
//         'overcoat',
//         'topcoat',
//       ].some((k) => s.includes(k))
//     )
//       return 'Outerwear';
//     if (
//       [
//         'loafer',
//         'loafers',
//         'sneaker',
//         'sneakers',
//         'boot',
//         'boots',
//         'heel',
//         'heels',
//         'pump',
//         'oxford',
//         'derby',
//         'dress shoe',
//         'dress shoes',
//         'sandal',
//         'sandals',
//       ].some((k) => s.includes(k))
//     )
//       return 'Shoes';
//     if (
//       [
//         'belt',
//         'hat',
//         'scarf',
//         'tie',
//         'watch',
//         'sunglasses',
//         'bag',
//         'briefcase',
//       ].some((k) => s.includes(k))
//     )
//       return 'Accessories';
//     if (normalized === 'Tops' && lay === 'SHELL') return 'Outerwear';
//     return normalized;
//   }
//   private normalizePatternScaleDto(
//     val?: string | null,
//   ): CreateWardrobeItemDto['pattern_scale'] | undefined {
//     const s = (val ?? '').toString().trim().toLowerCase();
//     if (!s) return undefined;
//     if (['micro', 'subtle', '0', '-1', 'small'].includes(s)) return 'Micro';
//     if (['medium', 'mid', '1'].includes(s)) return 'Medium';
//     if (['bold', 'large', 'big', '2'].includes(s)) return 'Bold';
//     return undefined;
//   }
//   private normalizeSeasonalityDto(
//     val?: string | null,
//   ): CreateWardrobeItemDto['seasonality'] | undefined {
//     const s = (val ?? '').toString().trim().toLowerCase();
//     if (!s) return undefined;
//     if (['spring', 'spr', 'ss', 's/s'].includes(s)) return 'Spring';
//     if (['summer', 'ss2'].includes(s)) return 'Summer';
//     if (['fall', 'autumn', 'fw', 'f/w'].includes(s)) return 'Fall';
//     if (['winter', 'win'].includes(s)) return 'Winter';
//     if (
//       [
//         'all',
//         'allseason',
//         'all-season',
//         'all season',
//         'year-round',
//         'year round',
//         'all_season',
//         'allseasonal',
//         'allseasonwear',
//       ].includes(s)
//     )
//       return 'AllSeason';
//     return undefined;
//   }
//   private normalizeLayeringDto(
//     val?: string | null,
//   ): CreateWardrobeItemDto['layering'] | undefined {
//     const s = (val ?? '').toString().trim().toLowerCase();
//     if (!s) return undefined;
//     if (['base', 'base layer', 'baselayer'].includes(s)) return 'Base';
//     if (['mid', 'midlayer', 'mid layer'].includes(s)) return 'Mid';
//     if (['outer', 'outerwear', 'jacket', 'shell'].includes(s)) return 'Outer';
//     return undefined;
//   }
//   private normalizeColorTemp(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       warm: 'Warm',
//       cool: 'Cool',
//       neutral: 'Neutral',
//     };
//     return map[s] ?? undefined;
//   }
//   private normalizeContrast(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       low: 'Low',
//       medium: 'Medium',
//       med: 'Medium',
//       high: 'High',
//     };
//     return map[s] ?? undefined;
//   }

//   /**
//    * Pinecone id helper
//    */
//   private normalizePineconeId(raw: string | undefined | null): {
//     id: string;
//     modality: 'text' | 'image' | 'unknown';
//   } {
//     if (!raw) return { id: '', modality: 'unknown' };
//     const [base, modality] = String(raw).split(':');
//     return {
//       id: base,
//       modality:
//         modality === 'text' || modality === 'image' ? modality : 'unknown',
//     };
//   }

//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   private sanitizeMeta(
//     raw: Record<string, any>,
//   ): Record<string, string | number | boolean | string[]> {
//     const out: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;
//       if (k === 'metadata') {
//         out['meta_json'] = typeof v === 'string' ? v : JSON.stringify(v);
//         continue;
//       }
//       if (Array.isArray(v)) {
//         out[k] = v.map((x) => String(x)).filter((x) => x.length > 0);
//         continue;
//       }
//       switch (typeof v) {
//         case 'string':
//           out[k] = v;
//           break;
//         case 'number':
//           if (Number.isFinite(v)) out[k] = v;
//           break;
//         case 'boolean':
//           out[k] = v;
//           break;
//         case 'object':
//           out[k] = JSON.stringify(v);
//           break;
//       }
//     }
//     return out;
//   }

//   private toCamel(row: any) {
//     if (!row) return row;
//     return {
//       ...row,
//       userId: row.user_id,
//       image: row.image_url,
//       gsutilUri: row.gsutil_uri,
//       objectKey: row.object_key,
//       aiTitle: row.ai_title,
//       aiDescription: row.ai_description,
//       aiKeyAttributes: row.ai_key_attributes,
//       aiConfidence: row.ai_confidence,
//       mainCategory: row.main_category,
//       subCategory: row.subcategory,
//       styleDescriptors: row.style_descriptors,
//       styleArchetypes: row.style_archetypes,
//       anchorRole: row.anchor_role,
//       occasionTags: row.occasion_tags,
//       dressCode: row.dress_code,
//       formalityScore: row.formality_score,
//       dominantHex: row.dominant_hex,
//       paletteHex: row.palette_hex,
//       colorFamily: row.color_family,
//       colorTemp: row.color_temp,
//       contrastProfile: row.contrast_profile,
//       fabricBlend: row.fabric_blend,
//       fabricWeightGsm: row.fabric_weight_gsm,
//       wrinkleResistance: row.wrinkle_resistance,
//       stretchDirection: row.stretch_direction,
//       stretchPct: row.stretch_pct,
//       sizeSystem: row.size_system,
//       sizeLabel: row.size_label,
//       inseamIn: row.inseam_in,
//       seasonalityArr: row.seasonality_arr,
//       goesWithIds: row.goes_with_ids,
//       avoidWithIds: row.avoid_with_ids,
//       userRating: row.user_rating,
//       fitConfidence: row.fit_confidence,
//       outfitFeedback: row.outfit_feedback,
//       dislikedFeatures: row.disliked_features,
//       purchaseDate: row.purchase_date,
//       purchasePrice: row.purchase_price,
//       countryOfOrigin: row.country_of_origin,
//       lastWornAt: row.last_worn_at,
//       rotationPriority: row.rotation_priority,
//       createdAt: row.created_at,
//       updatedAt: row.updated_at,
//       deletedAt: row.deleted_at,
//     };
//   }

//   composeFromAiDraft(
//     base: Partial<CreateWardrobeItemDto>,
//     draft: Record<string, any>,
//   ): CreateWardrobeItemDto {
//     const pick = <T>(k: string, fallback?: T): T | undefined =>
//       (base as any)[k] ?? (draft?.[k] as T) ?? fallback;

//     const name = pick<string>('name') ?? draft?.ai_title ?? 'Wardrobe Item';

//     const rawSub =
//       pick<string>('subcategory') ??
//       draft?.subcategory ??
//       (draft as any)?.subCategory;
//     const layeringRaw = pick<string>('layering') ?? draft?.layering;

//     const rawMain =
//       (base as any).main_category ??
//       (draft?.main_category as string | undefined) ??
//       (draft?.category as string | undefined);

//     const main_category: CreateWardrobeItemDto['main_category'] =
//       this.resolveMainCategory(rawMain, rawSub, layeringRaw);

//     const layering = this.normalizeLayeringDto(layeringRaw);
//     const pattern_scale = this.normalizePatternScaleDto(
//       pick<string>('pattern_scale') ?? draft?.pattern_scale,
//     );
//     const seasonality = this.normalizeSeasonalityDto(
//       pick<string>('seasonality') ?? draft?.seasonality,
//     );

//     const rawTags =
//       pick<string[] | string>('tags') ?? (draft?.tags as any) ?? [];
//     const tags: string[] = Array.isArray(rawTags)
//       ? rawTags.filter(Boolean).map(String)
//       : String(rawTags)
//           .split(',')
//           .map((t) => t.trim())
//           .filter(Boolean);

//     const parseNum = (x: any) =>
//       typeof x === 'number'
//         ? x
//         : typeof x === 'string' && x.trim() !== '' && !Number.isNaN(+x)
//           ? Number(x)
//           : undefined;

//     return {
//       user_id: String(base.user_id),
//       image_url: String(base.image_url),
//       name,
//       main_category,

//       gsutil_uri: pick('gsutil_uri'),
//       object_key: pick('object_key'),

//       subcategory: pick('subcategory'),
//       color: pick('color'),
//       material: pick('material'),
//       fit: pick('fit'),
//       size: pick('size'),
//       brand: pick('brand'),
//       tags,

//       style_descriptors: draft?.style_descriptors,
//       style_archetypes: draft?.style_archetypes,
//       anchor_role: draft?.anchor_role,
//       occasion_tags: draft?.occasion_tags,
//       dress_code: draft?.dress_code,
//       formality_score: draft?.formality_score,

//       dominant_hex: draft?.dominant_hex,
//       palette_hex: draft?.palette_hex,
//       color_family: draft?.color_family,
//       color_temp: draft?.color_temp,
//       contrast_profile: draft?.contrast_profile,

//       pattern: draft?.pattern,
//       pattern_scale,

//       seasonality,
//       seasonality_arr: draft?.seasonality_arr,
//       layering,
//       thermal_rating: draft?.thermal_rating,
//       breathability: draft?.breathability,
//       rain_ok: draft?.rain_ok,
//       wind_ok: draft?.wind_ok,
//       waterproof_rating: draft?.waterproof_rating,
//       climate_sweetspot_f_min: draft?.climate_sweetspot_f_min,
//       climate_sweetspot_f_max: draft?.climate_sweetspot_f_max,

//       fabric_blend: draft?.fabric_blend,
//       fabric_weight_gsm: draft?.fabric_weight_gsm,
//       wrinkle_resistance: draft?.wrinkle_resistance,
//       stretch_direction: draft?.stretch_direction,
//       stretch_pct: draft?.stretch_pct,
//       thickness: draft?.thickness,
//       size_system: draft?.size_system,
//       size_label: draft?.size_label,
//       measurements: draft?.measurements,
//       width: draft?.width,
//       height: draft?.height,

//       neckline: draft?.neckline,
//       collar_type: draft?.collar_type,
//       sleeve_length: draft?.sleeve_length,
//       hem_style: draft?.hem_style,
//       rise: draft?.rise,
//       leg: draft?.leg,
//       inseam_in: draft?.inseam_in,
//       cuff: draft?.cuff,
//       lapel: draft?.lapel,
//       closure: draft?.closure,
//       length_class: draft?.length_class,
//       shoe_style: draft?.shoe_style,
//       sole: draft?.sole,
//       toe_shape: draft?.toe_shape,

//       care_symbols: draft?.care_symbols,
//       wash_temp_c: draft?.wash_temp_c,
//       dry_clean: draft?.dry_clean,
//       iron_ok: draft?.iron_ok,

//       retailer: draft?.retailer,
//       purchase_date: draft?.purchase_date,
//       purchase_price: draft?.purchase_price,
//       country_of_origin: draft?.country_of_origin,
//       condition: draft?.condition,
//       defects_notes: draft?.defects_notes,

//       ai_title: draft?.ai_title,
//       ai_description: draft?.ai_description,
//       ai_key_attributes: draft?.ai_key_attributes,
//       ai_confidence: parseNum(draft?.ai_confidence),

//       metadata: (base as any).metadata,
//       constraints: (base as any).constraints,
//     };
//   }

//   // CREATE
//   async createItem(dto: CreateWardrobeItemDto) {
//     const cols: string[] = [];
//     const vals: any[] = [];
//     const params: string[] = [];
//     let i = 1;

//     const add = (col: string, val: any, kind: 'json' | 'raw' = 'raw') => {
//       if (val === undefined) return;
//       if (Array.isArray(val) && val.length === 0) return;
//       cols.push(col);
//       if (kind === 'json' && val !== null) {
//         vals.push(JSON.stringify(val));
//       } else {
//         vals.push(val);
//       }
//       params.push(`$${i++}`);
//     };

//     // REQUIRED
//     add('user_id', dto.user_id);
//     add('image_url', dto.image_url);
//     add('name', dto.name);
//     add('main_category', dto.main_category);

//     // Optional core/meta
//     add('subcategory', dto.subcategory);
//     add('color', dto.color);
//     add('material', dto.material);
//     add('fit', dto.fit);
//     add('size', dto.size);
//     add('brand', dto.brand);
//     add('gsutil_uri', dto.gsutil_uri);
//     add('object_key', dto.object_key);
//     add('metadata', dto.metadata, 'json');
//     add('width', dto.width);
//     add('height', dto.height);
//     add('tags', dto.tags);

//     // Visuals & styling
//     add('style_descriptors', dto.style_descriptors);
//     add('style_archetypes', dto.style_archetypes);
//     add('anchor_role', this.normalizeAnchorRole(dto.anchor_role));

//     const normalizedPattern = this.normalizePattern(dto.pattern);
//     if (
//       normalizedPattern &&
//       WardrobeService.PATTERN_ENUM_WHITELIST.includes(normalizedPattern)
//     ) {
//       add('pattern', normalizedPattern);
//     }
//     if (dto.pattern_scale !== undefined) {
//       add(
//         'pattern_scale',
//         this.normalizePatternScaleDto(dto.pattern_scale) ?? null,
//       );
//     }

//     add('dominant_hex', dto.dominant_hex);
//     add('palette_hex', dto.palette_hex);
//     add('color_family', dto.color_family);
//     add('color_temp', this.normalizeColorTemp(dto.color_temp));
//     add('contrast_profile', this.normalizeContrast(dto.contrast_profile));

//     // Occasion & formality
//     add('occasion_tags', dto.occasion_tags);
//     add('dress_code', this.normalizeDressCode(dto.dress_code));
//     add('formality_score', dto.formality_score);

//     // Seasonality & climate (ENUMS)
//     const normalizedSeasonality = this.normalizeSeasonality(dto.seasonality);
//     if (
//       normalizedSeasonality &&
//       WardrobeService.SEASONALITY_ENUM_WHITELIST.includes(normalizedSeasonality)
//     ) {
//       add('seasonality', normalizedSeasonality);
//     }
//     const normalizedLayering = this.normalizeLayering(dto.layering);
//     if (
//       normalizedLayering &&
//       WardrobeService.LAYERING_ENUM_WHITELIST.includes(normalizedLayering)
//     ) {
//       add('layering', normalizedLayering);
//     }

//     add('seasonality_arr', dto.seasonality_arr);
//     add('thermal_rating', dto.thermal_rating);
//     add('breathability', dto.breathability);
//     add('rain_ok', dto.rain_ok);
//     add('wind_ok', dto.wind_ok);
//     add('waterproof_rating', dto.waterproof_rating);
//     add('climate_sweetspot_f_min', dto.climate_sweetspot_f_min);
//     add('climate_sweetspot_f_max', dto.climate_sweetspot_f_max);

//     // Construction & sizing
//     add('fabric_blend', dto.fabric_blend, 'json');
//     add('fabric_weight_gsm', dto.fabric_weight_gsm);
//     add('wrinkle_resistance', dto.wrinkle_resistance);
//     add('stretch_direction', dto.stretch_direction);
//     add('stretch_pct', dto.stretch_pct);
//     add('thickness', dto.thickness);
//     add('size_system', dto.size_system);
//     add('size_label', dto.size_label);
//     add('measurements', dto.measurements, 'json');

//     // Silhouette & cut
//     add('neckline', dto.neckline);
//     add('collar_type', dto.collar_type);
//     add('sleeve_length', dto.sleeve_length);
//     add('hem_style', dto.hem_style);
//     add('rise', dto.rise);
//     add('leg', dto.leg);
//     add('inseam_in', dto.inseam_in);
//     add('cuff', dto.cuff);
//     add('lapel', dto.lapel);
//     add('closure', dto.closure);
//     add('length_class', dto.length_class);
//     add('shoe_style', dto.shoe_style);
//     add('sole', dto.sole);
//     add('toe_shape', dto.toe_shape);

//     // Care
//     add('care_symbols', dto.care_symbols);
//     add('wash_temp_c', dto.wash_temp_c);
//     add('dry_clean', dto.dry_clean);
//     add('iron_ok', dto.iron_ok);

//     // Usage
//     add('wear_count', dto.wear_count ?? 0);
//     add('last_worn_at', dto.last_worn_at);
//     add('rotation_priority', dto.rotation_priority);

//     // Commerce & provenance
//     add('purchase_date', dto.purchase_date);
//     add('purchase_price', dto.purchase_price);
//     add('retailer', dto.retailer);
//     add('country_of_origin', dto.country_of_origin);
//     add('condition', dto.condition);
//     add('defects_notes', dto.defects_notes);

//     // Pairing & feedback
//     add('goes_with_ids', dto.goes_with_ids);
//     add('avoid_with_ids', dto.avoid_with_ids);
//     add('user_rating', dto.user_rating);
//     add('fit_confidence', dto.fit_confidence);
//     add('outfit_feedback', dto.outfit_feedback, 'json');
//     add('disliked_features', dto.disliked_features);

//     // AI
//     add('ai_title', dto.ai_title);
//     add('ai_description', dto.ai_description);
//     add('ai_key_attributes', dto.ai_key_attributes);
//     add('ai_confidence', dto.ai_confidence);

//     // System
//     add('constraints', dto.constraints);

//     const sql = `
//       INSERT INTO wardrobe_items (${cols.join(', ')})
//       VALUES (${params.join(', ')})
//       RETURNING *;
//     `;
//     const result = await pool.query(sql, vals);
//     const item = result.rows[0];

//     // Embeddings
//     let imageVec: number[] | undefined;
//     const gcs = dto.gsutil_uri ?? item.gsutil_uri;
//     if (gcs) imageVec = await this.vertex.embedImage(gcs);

//     const textVec = await this.vertex.embedText(
//       [
//         item.name,
//         item.main_category,
//         item.subcategory,
//         item.color,
//         item.color_family,
//         item.material,
//         item.fit,
//         item.size,
//         item.brand,
//         item.color_temp,
//         item.contrast_profile,
//         String(item.formality_score ?? ''),
//         item.seasonality,
//         item.layering,
//         item.pattern,
//         item.pattern_scale,
//         item.neckline,
//         item.collar_type,
//         item.sleeve_length,
//         item.rise,
//         item.leg,
//         String(item.inseam_in ?? ''),
//         item.length_class,
//         item.shoe_style,
//         item.sole,
//         Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.dress_code,
//         item.anchor_role,
//         item.dominant_hex,
//         Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
//       ]
//         .filter(Boolean)
//         .join(' '),
//     );

//     const meta = this.sanitizeMeta({ ...item });
//     await upsertItemNs({
//       userId: dto.user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return {
//       message: 'Wardrobe item created + indexed successfully',
//       item: this.toCamel(item),
//     };
//   }

//   // READ
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows.map((r) => this.toCamel(r));
//   }

//   // UPDATE
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     if (dto.pattern !== undefined) {
//       const p = this.normalizePattern(dto.pattern);
//       (dto as any).pattern =
//         p && WardrobeService.PATTERN_ENUM_WHITELIST.includes(p) ? p : null;
//     }
//     if (dto.seasonality !== undefined) {
//       const s = this.normalizeSeasonality(dto.seasonality);
//       (dto as any).seasonality =
//         s && WardrobeService.SEASONALITY_ENUM_WHITELIST.includes(s) ? s : null;
//     }
//     if (dto.layering !== undefined) {
//       const l = this.normalizeLayering(dto.layering);
//       (dto as any).layering =
//         l && WardrobeService.LAYERING_ENUM_WHITELIST.includes(l) ? l : null;
//     }
//     if (dto.anchor_role !== undefined)
//       (dto as any).anchor_role =
//         this.normalizeAnchorRole(dto.anchor_role) ?? null;
//     if (dto.dress_code !== undefined)
//       (dto as any).dress_code = this.normalizeDressCode(dto.dress_code) ?? null;
//     if (dto.color_temp !== undefined)
//       (dto as any).color_temp = this.normalizeColorTemp(dto.color_temp) ?? null;
//     if (dto.contrast_profile !== undefined)
//       (dto as any).contrast_profile =
//         this.normalizeContrast(dto.contrast_profile) ?? null;
//     if (dto.pattern_scale !== undefined)
//       (dto as any).pattern_scale =
//         this.normalizePatternScaleDto(dto.pattern_scale) ?? null;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         if (Array.isArray(value)) {
//           values.push(value.length ? value : null);
//         } else if (typeof value === 'object' && value !== null) {
//           values.push(JSON.stringify(value));
//         } else {
//           values.push(value);
//         }
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

//     values.push(itemId);

//     const query = `
//       UPDATE wardrobe_items
//       SET ${fields.join(', ')}, updated_at = NOW()
//       WHERE id = $${index}
//       RETURNING *;
//     `;
//     const result = await pool.query(query, values);
//     const item = result.rows[0];

//     let textVec: number[] | undefined;
//     let imageVec: number[] | undefined;

//     const textFields = [
//       'name',
//       'main_category',
//       'subcategory',
//       'color',
//       'color_family',
//       'material',
//       'fit',
//       'size',
//       'brand',
//       'pattern',
//       'pattern_scale',
//       'seasonality',
//       'layering',
//       'dress_code',
//       'occasion_tags',
//       'tags',
//       'anchor_role',
//     ];
//     const textChanged = textFields.some((f) => f in dto);
//     if (textChanged) {
//       const textInput = [
//         item.name,
//         item.main_category,
//         item.subcategory,
//         item.color,
//         item.color_family,
//         item.material,
//         item.fit,
//         item.size,
//         item.brand,
//         item.color_temp,
//         item.contrast_profile,
//         String(item.formality_score ?? ''),
//         item.seasonality,
//         item.layering,
//         item.pattern,
//         item.pattern_scale,
//         item.neckline,
//         item.collar_type,
//         item.sleeve_length,
//         item.rise,
//         item.leg,
//         String(item.inseam_in ?? ''),
//         item.length_class,
//         item.shoe_style,
//         item.sole,
//         Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.dress_code,
//         item.anchor_role,
//         item.dominant_hex,
//         Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
//       ]
//         .filter(Boolean)
//         .join(' ');
//       textVec = await this.vertex.embedText(textInput);
//     }

//     const imageChanged = 'gsutil_uri' in dto || 'image_url' in dto;
//     const gcs = (dto as any).gsutil_uri ?? item.gsutil_uri;
//     if (imageChanged && gcs) {
//       imageVec = await this.vertex.embedImage(gcs);
//     }

//     const meta = this.sanitizeMeta({ ...item });

//     if (textVec || imageVec) {
//       await upsertItemNs({
//         userId: item.user_id,
//         itemId: item.id,
//         textVec,
//         imageVec,
//         meta,
//       });
//     } else {
//       await upsertItemNs({ userId: item.user_id, itemId: item.id, meta });
//     }

//     return {
//       message: 'Wardrobe item updated successfully',
//       item: this.toCamel(item),
//     };
//   }

//   // 👉 ADD THIS RIGHT BELOW updateItem
//   async updateFavorite(itemId: string, favorite: boolean) {
//     const result = await pool.query(
//       `UPDATE wardrobe_items
//      SET favorite = $1,
//          updated_at = now()
//      WHERE id = $2
//      RETURNING *`,
//       [favorite, itemId],
//     );
//     return result.rows[0];
//   }

//   // DELETE
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;
//     try {
//       await pool.query(
//         'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//         [item_id, user_id],
//       );
//     } catch (err: any) {
//       console.warn(`⚠️ Skipped DB delete: ${err.message}`);
//     }
//     try {
//       await deleteItemNs(user_id, item_id);
//     } catch (err: any) {
//       console.warn(`⚠️ Pinecone delete skipped: ${err.message}`);
//     }
//     if (image_url) {
//       const bucketName = process.env.GCS_BUCKET_NAME!;
//       const fileName = this.extractFileName(image_url);
//       try {
//         await storage.bucket(bucketName).file(fileName).delete();
//       } catch (err: any) {
//         if ((err as any).code === 404) {
//           console.warn('🧼 GCS file already deleted:', fileName);
//         } else {
//           console.error('❌ Error deleting GCS file:', (err as any).message);
//         }
//       }
//     }
//     return { message: 'Wardrobe item cleanup attempted (DB, Pinecone, GCS)' };
//   }

//   // VECTOR SEARCH UTILITIES
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }
//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }
//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }
//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);
//     const matches = await hybridQueryUserNs({
//       userId,
//       textVec,
//       imageVec,
//       topK,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }

//   // Label helper
//   private summarizeItem(meta: any): string {
//     if (!meta) return 'Item';
//     const name = (meta.name || '').toString().trim();

//     const color = meta.color || meta.color_family;
//     const cat = meta.main_category || meta.mainCategory;
//     const sub = meta.subcategory || meta.subCategory;
//     const mat = meta.material;
//     const brand = meta.brand;
//     const fit = meta.fit;
//     const size = meta.size_label || meta.size;
//     const dress = meta.dress_code || meta.dressCode;
//     const role = meta.anchor_role || meta.anchorRole;
//     const patternish = meta.pattern_scale || meta.patternScale || meta.pattern;

//     // ── NEW: slot detection to make roles explicit ─────────────
//     const toLc = (s: any) => (s ?? '').toString().trim().toLowerCase();
//     const mainLc = toLc(cat);
//     const subLc = toLc(sub);

//     const isBottom =
//       mainLc === 'bottoms' ||
//       /\b(trouser|pants|jeans|chinos|shorts|joggers?|sweatpants?|track\s*pants?)\b/i.test(
//         subLc,
//       );

//     const isShoes =
//       mainLc === 'shoes' ||
//       /\b(sneakers?|trainers?|running|athletic|loafers?|boots?|oxfords?|derbys?|dress\s*shoes?|sandals?)\b/i.test(
//         subLc,
//       );

//     const isOuter =
//       mainLc === 'outerwear' ||
//       /\b(blazer|sport\s*coat|suit\s*jacket|jacket|coat|windbreaker|parka|trench|overcoat|topcoat)\b/i.test(
//         subLc,
//       );

//     const isTop =
//       mainLc === 'tops' ||
//       /\b(t-?shirt|tee|polo|shirt|sweater|knit|henley|hoodie)\b/i.test(subLc);

//     const isAcc =
//       mainLc === 'accessories' ||
//       /\b(belt|watch|hat|scarf|tie|sunglasses|bag|briefcase)\b/i.test(subLc);

//     const slot =
//       (isBottom && 'BOTTOM') ||
//       (isShoes && 'SHOES') ||
//       (isOuter && 'OUTER') ||
//       (isTop && 'TOP') ||
//       (isAcc && 'ACC') ||
//       undefined;

//     // ───────────────────────────────────────────────────────────

//     const primary = [color, mat, sub || cat].filter(Boolean).join(' ');

//     const season =
//       meta.seasonality ||
//       (Array.isArray(meta.seasonality_arr) && meta.seasonality_arr.join('/'));
//     const temp = meta.color_temp;
//     const contrast = meta.contrast_profile;
//     const form = meta.formality_score != null ? `F${meta.formality_score}` : '';

//     const extras = [
//       brand && `${brand}`,
//       fit && `${fit} fit`,
//       size && `(${size})`,
//       dress && `${dress}`,
//       role && `${role} role`,
//       patternish && `pattern:${patternish}`,
//       season && `${season}`,
//       temp && `temp:${temp}`,
//       contrast && `contrast:${contrast}`,
//       form,
//     ]
//       .filter(Boolean)
//       .join(', ');

//     const headRaw = primary || name || 'Item';
//     const head = slot ? `[${slot}] ${headRaw}` : headRaw;
//     return extras ? `${head} — ${extras}` : head;
//   }
// }

////////////////////

// // apps/backend-nest/src/wardrobe/wardrobe.service.ts

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { Storage } from '@google-cloud/storage';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
// import { VertexService } from '../vertex/vertex.service';
// import { randomUUID } from 'crypto'; // ← NEW

// // NEW imports for extracted logic (prompts + scoring only)
// import { parseConstraints } from './logic/constraints';
// import {
//   rerankCatalogWithContext,
//   DEFAULT_CONTEXT_WEIGHTS,
//   type ContextWeights,
// } from './logic/scoring';
// import type { UserStyle } from './logic/style';
// import type { WeatherContext } from './logic/weather';
// import { finalizeOutfitSlots } from './logic/finalize';
// import { enforceConstraintsOnOutfits } from './logic/enforce';
// import { buildOutfitPrompt } from './prompts/outfitPrompt';
// import { extractStrictJson } from './logic/json';
// import { applyContextualFilters } from './logic/contextFilters';

// // NEW: feedback filters
// import {
//   applyFeedbackFilters,
//   compileFeedbackRulesFromRows,
//   OutfitFeedbackRow, // ✅ correct type
// } from './logic/feedbackFilters';

// /**
//  * Postgres connection pool.
//  * - SSL enabled for managed DBs.
//  * - Used for all CRUD on wardrobe_items table.
//  */
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// /**
//  * Google Cloud Storage client.
//  * - Used to delete images from GCS when wardrobe items are removed.
//  */
// const storage = new Storage();

// // ─────────────────────────────────────────────────────────────────────────────
// // Catalog typing + coercion helpers
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * The shape of an item the "catalog" (Pinecone search results) feeds into the
//  * outfit generator. This is a lightweight, prompt-friendly view.
//  */
// type CatalogItem = {
//   index: number;
//   id: string;
//   label: string;
//   image_url?: string;

//   // core used by all scorers
//   main_category?: string;
//   subcategory?: string;
//   color?: string;
//   color_family?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   formality_score?: number;

//   // extras used by style/weather scorers (all optional)
//   brand?: string;
//   material?: string;
//   sleeve_length?: string;
//   layering?: string; // 'Base' | 'Mid' | 'Outer'
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
// };

// // ── Weights normalization helpers ────────────────────────────────────────────
// type WeightsLong = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
//   feedbackWeight?: number;
// };
// type WeightsShort = {
//   constraints: number;
//   style: number;
//   weather: number;
//   feedback?: number;
// };
// type AnyWeights = WeightsLong | WeightsShort;

// function toLongWeights(w: AnyWeights): WeightsLong {
//   if ('styleWeight' in w) return { ...w };
//   return {
//     constraintsWeight: w.constraints,
//     styleWeight: w.style,
//     weatherWeight: w.weather,
//     feedbackWeight: w.feedback,
//   };
// }
// function fromLongWeights(longW: WeightsLong, like: AnyWeights): AnyWeights {
//   if ('styleWeight' in like) return { ...longW };
//   return {
//     constraints: longW.constraintsWeight,
//     style: longW.styleWeight,
//     weather: longW.weatherWeight,
//     feedback: longW.feedbackWeight,
//   };
// }

// // Soft numeric prefs derived from feedback rules (only for rerank nudges)
// function buildUserPrefsFromRules(
//   catalog: Array<{
//     id?: string;
//     label?: string;
//     subcategory?: string;
//     main_category?: string;
//     color?: string;
//     color_family?: string;
//   }>,
//   rules: ReturnType<typeof compileFeedbackRulesFromRows>,
// ): Map<string, number> {
//   const m = new Map<string, number>();
//   if (!rules?.length || !catalog?.length) return m;

//   const lc = (v?: string) => (v ?? '').toLowerCase();

//   // mirror the predicate logic lightly to issue a -5 soft penalty
//   const hit = (it: any): boolean => {
//     const id = it?.id;
//     const brand = lc((it as any).brand);
//     const color = lc((it as any).color) || lc((it as any).color_family);
//     const main = lc((it as any).main_category);
//     const sub = lc((it as any).subcategory);
//     const lbl = lc((it as any).label);

//     for (const r of rules) {
//       switch (r.kind) {
//         case 'excludeItemIds':
//           if (id && r.item_ids.includes(id)) return true;
//           break;
//         case 'excludeBrand':
//           if (brand && brand.includes(lc(r.brand))) {
//             if (!r.category) return true;
//             if (main.includes(lc(r.category))) return true;
//           }
//           break;
//         case 'excludeColorOnCategory':
//           if (
//             r.category &&
//             (main.includes(r.category) || sub.includes(r.category))
//           ) {
//             if (color.includes(r.color)) return true;
//             if (lbl.includes(r.color)) return true;
//           }
//           break;
//         case 'excludeColor':
//           if (color.includes(r.color) || lbl.includes(r.color)) return true;
//           break;
//         case 'excludeSubstring':
//           if ((r.field === 'label' ? lbl : sub).includes(lc(r.value))) {
//             if (!r.category) return true;
//             if (main.includes(lc(r.category))) return true;
//           }
//           break;
//       }
//     }
//     return false;
//   };

//   for (const it of catalog) {
//     const id = it?.id;
//     if (!id) continue;
//     if (hit(it)) m.set(id, -5); // -5 raw → scaled to ~ -0.2 in reranker
//   }
//   return m;
// }

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // ─────────────────────────────────────────────────────────────
//   // Enum whitelists
//   // ─────────────────────────────────────────────────────────────

//   private static readonly PATTERN_ENUM_WHITELIST: string[] = [
//     'SOLID',
//     'STRIPE',
//     'CHECK',
//     'HERRINGBONE',
//     'WINDOWPANE',
//     'FLORAL',
//     'DOT',
//     'CAMO',
//     'ABSTRACT',
//     'OTHER',
//   ];
//   private static readonly SEASONALITY_ENUM_WHITELIST: string[] = [
//     'SS',
//     'FW',
//     'ALL_SEASON',
//   ];
//   private static readonly LAYERING_ENUM_WHITELIST: string[] = [
//     'BASE',
//     'MID',
//     'SHELL',
//     'ACCENT',
//   ];

//   // Generic safe-casters
//   private asStr(v: any): string | undefined {
//     if (v === undefined || v === null) return undefined;
//     const s = String(v).trim();
//     return s ? s : undefined;
//   }
//   private asNum(v: any): number | undefined {
//     if (v === undefined || v === null) return undefined;
//     const n = Number(v);
//     return Number.isFinite(n) ? n : undefined;
//   }

//   // Pull user feedback rows from your DB (adjust table/columns if yours differ)

//   // Replace your current fetchFeedbackRows with this exact version:
//   private async fetchFeedbackRows(
//     userId: string,
//   ): Promise<OutfitFeedbackRow[]> {
//     // Adjust table/column names only if they differ in your DB.
//     // This version is compatible with your CSV: rating = -1/1, notes = free text.
//     const { rows } = await pool.query(
//       `SELECT id, user_id, outfit_id, rating, notes, created_at
//        FROM outfit_feedback
//       WHERE user_id = $1
//       ORDER BY created_at DESC
//       LIMIT 500`,
//       [userId],
//     );

//     return rows.map((r: any) => {
//       // rating: -1 => "dislike", 1 => "like", anything else => null
//       const rating =
//         r.rating === -1 ? 'dislike' : r.rating === 1 ? 'like' : null;

//       // notes may be plain text like: "Avoid shoes with green in them."
//       // Keep as-is; compileFeedbackRulesFromRows() will parse color/brand/slot.
//       const notes =
//         typeof r.notes === 'string' && r.notes.trim().length ? r.notes : null;

//       return {
//         id: String(r.id),
//         request_id: '', // unknown here
//         user_id: String(r.user_id),
//         rating, // "like" | "dislike" | null
//         tags: null, // not present in your CSV
//         notes, // free text
//         outfit_json: null, // not present in your CSV
//         created_at: String(r.created_at),
//       } as OutfitFeedbackRow;
//     });
//   }

//   // Normalizers
//   private normLower(val?: string | null) {
//     if (!val) return undefined;
//     const s = String(val).trim();
//     if (!s) return undefined;
//     return s.toLowerCase();
//   }
//   private normalizePattern(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       solid: 'SOLID',
//       stripe: 'STRIPE',
//       striped: 'STRIPE',
//       stripes: 'STRIPE',
//       plaid: 'CHECK',
//       check: 'CHECK',
//       checked: 'CHECK',
//       herringbone: 'HERRINGBONE',
//       windowpane: 'WINDOWPANE',
//       floral: 'FLORAL',
//       flower: 'FLORAL',
//       dot: 'DOT',
//       dots: 'DOT',
//       polka: 'DOT',
//       polka_dot: 'DOT',
//       camo: 'CAMO',
//       camouflage: 'CAMO',
//       abstract: 'ABSTRACT',
//       print: 'ABSTRACT',
//       printed: 'ABSTRACT',
//       graphic: 'ABSTRACT',
//       other: 'OTHER',
//     };
//     return map[s] ?? undefined;
//   }
//   private coerceMainCategoryFromSub(
//     rawMain?: string,
//     sub?: string,
//   ): string | undefined {
//     const main = (rawMain ?? '').trim();
//     const s = (sub ?? '').toLowerCase();

//     const isOuter = [
//       'blazer',
//       'sport coat',
//       'sportcoat',
//       'suit jacket',
//       'jacket',
//       'coat',
//       'parka',
//       'trench',
//       'overcoat',
//       'topcoat',
//     ].some((k) => s.includes(k));
//     if (isOuter) return 'Outerwear';

//     const isShoe = [
//       'loafer',
//       'loafers',
//       'sneaker',
//       'sneakers',
//       'boot',
//       'boots',
//       'heel',
//       'heels',
//       'pump',
//       'oxford',
//       'derby',
//       'dress shoe',
//       'dress shoes',
//       'sandal',
//       'sandals',
//     ].some((k) => s.includes(k));
//     if (isShoe) return 'Shoes';

//     const isAccessory = [
//       'belt',
//       'hat',
//       'scarf',
//       'tie',
//       'watch',
//       'sunglasses',
//       'bag',
//       'briefcase',
//     ].some((k) => s.includes(k));
//     if (isAccessory) return 'Accessories';

//     return main || undefined;
//   }
//   private normalizeAnchorRole(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       hero: 'Hero',
//       neutral: 'Neutral',
//       connector: 'Connector',
//     };
//     return map[s] ?? undefined;
//   }
//   private normalizeSeasonality(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       ss: 'SS',
//       'spring/summer': 'SS',
//       spring: 'SS',
//       summer: 'SS',
//       fw: 'FW',
//       'fall/winter': 'FW',
//       fall: 'FW',
//       autumn: 'FW',
//       winter: 'FW',
//       allseason: 'ALL_SEASON',
//       'all season': 'ALL_SEASON',
//       'all-season': 'ALL_SEASON',
//       all_season: 'ALL_SEASON',
//       all: 'ALL_SEASON',
//       'year-round': 'ALL_SEASON',
//       'year round': 'ALL_SEASON',
//     };
//     return map[s];
//   }

//   // Ultra-casual screen used only when the query implies "upscale"
//   private isUltraCasualForUpscale(c: {
//     main_category?: string;
//     subcategory?: string;
//     label?: string;
//     dress_code?: string;
//     formality_score?: number;
//   }): boolean {
//     const main = (c.main_category ?? '').toLowerCase();
//     const sub = (c.subcategory ?? '').toLowerCase();
//     const lbl = (c.label ?? '').toLowerCase();

//     // obvious casual tops & loud casual items
//     const casualWords = /(t-?shirt|tee|hoodie|tank|graphic tee|hawaiian)/;
//     if (casualWords.test(sub) || casualWords.test(lbl)) return true;

//     // shorts for bottoms
//     if (main === 'bottoms' && /\bshorts?\b/.test(sub)) return true;

//     // jeans: allow only if clearly dressy; otherwise screen out for upscale
//     if (/\bjeans?\b/.test(sub) && (c.formality_score ?? 0) < 6) return true;

//     // generic dress code + formality gate
//     const dc = c.dress_code;
//     if (
//       dc &&
//       (dc === 'UltraCasual' || dc === 'Casual') &&
//       (c.formality_score ?? 0) < 6
//     ) {
//       return true;
//     }

//     return false;
//   }

//   private retitleOutfit(o: {
//     title: string;
//     why: string;
//     items: CatalogItem[];
//   }): { title: string; why: string } {
//     if (!o.items?.length) return { title: o.title, why: o.why };

//     const tops = o.items.filter(
//       (c) => (c.main_category ?? '').toLowerCase() === 'tops',
//     );
//     const bottoms = o.items.filter(
//       (c) => (c.main_category ?? '').toLowerCase() === 'bottoms',
//     );
//     const shoes = o.items.filter(
//       (c) => (c.main_category ?? '').toLowerCase() === 'shoes',
//     );

//     const topName = tops[0]?.label ?? '';
//     const bottomName = bottoms[0]?.label ?? '';
//     const shoeName = shoes[0]?.label ?? '';

//     // Very simple rewrite
//     const title = `Outfit with ${[topName, bottomName, shoeName]
//       .filter(Boolean)
//       .join(', ')}`;

//     const why = `This look combines ${topName || 'a top'} with ${
//       bottomName || 'a bottom'
//     } and ${shoeName || 'shoes'} for a complete outfit.`;

//     return { title, why };
//   }

//   /**
//    * MAIN OUTFIT GENERATOR
//    */
//   async generateOutfits(
//     userId: string,
//     query: string,
//     topK: number,
//     opts?: {
//       userStyle?: UserStyle;
//       weather?: WeatherContext;
//       weights?: ContextWeights;
//       useWeather?: boolean;
//       useFeedback?: boolean; // 👈 add this
//     },
//   ) {
//     try {
//       // 1) Vectorize query and pull nearest items
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({
//         userId,
//         vector: queryVec,
//         topK,
//         includeMetadata: true,
//       });

//       // 2) Build catalog
//       let catalog: CatalogItem[] = matches.map((m, i) => {
//         const { id } = this.normalizePineconeId(m.id as string);
//         const meta: any = m.metadata || {};
//         const sub_raw = this.asStr(meta.subcategory ?? meta.subCategory);
//         const main_raw = this.asStr(meta.main_category ?? meta.mainCategory);
//         const main_fix = this.coerceMainCategoryFromSub(main_raw, sub_raw);

//         return {
//           index: i + 1,
//           id,
//           label: this.summarizeItem(meta),

//           image_url: this.asStr(meta.image_url ?? meta.imageUrl),
//           main_category: main_fix,
//           subcategory: sub_raw,
//           color: this.asStr(meta.color ?? meta.color_family),
//           color_family: this.asStr(meta.color_family),
//           shoe_style: this.asStr(meta.shoe_style),
//           dress_code: this.asStr(meta.dress_code ?? meta.dressCode),

//           formality_score: this.asNum(meta.formality_score),

//           brand: this.asStr(meta.brand),
//           material: this.asStr(meta.material),
//           sleeve_length: this.asStr(meta.sleeve_length),
//           layering: this.asStr(meta.layering),
//           waterproof_rating: this.asNum(meta.waterproof_rating),
//           rain_ok: !!meta.rain_ok,
//         };
//       });

//       // 3) Contextual pre-filters (gym / black tie / beach / wedding / upscale)
//       catalog = applyContextualFilters(query, catalog, { minKeep: 6 });

//       // 3b) Apply user feedback (dislikes/bans) before reranking/LLM
//       let feedbackRows: any[] = [];
//       let feedbackRules: any[] = [];
//       let userPrefs = new Map<string, number>();

//       // 🔑 Respect frontend toggle + env var
//       const clientWantsFeedback = opts?.useFeedback !== false; // default ON if undefined
//       const envDisable = process.env.DISABLE_FEEDBACK === '1';
//       const disableFeedback = !clientWantsFeedback || envDisable;

//       console.log('[FEEDBACK] useFeedback (client):', opts?.useFeedback);
//       // console.log('[FEEDBACK] DISABLE_FEEDBACK (env):', envDisable);
//       // console.log('[FEEDBACK] Effective disableFeedback =', disableFeedback);

//       if (!disableFeedback) {
//         feedbackRows = await this.fetchFeedbackRows(userId);
//         feedbackRules = compileFeedbackRulesFromRows(feedbackRows);

//         // Optional debug: see what got blocked (disabled by default)
//         if (process.env.DEBUG_FEEDBACK === '1' && feedbackRules.length) {
//           const strongPreview = catalog.filter(
//             (it) =>
//               !feedbackRules.some((r) => {
//                 try {
//                   return (
//                     (r as any) &&
//                     (function rule(it: any) {
//                       switch (r.kind) {
//                         case 'excludeItemIds':
//                           return !!(it.id && r.item_ids.includes(it.id));
//                         default:
//                           return false;
//                       }
//                     })(it)
//                   );
//                 } catch {
//                   return false;
//                 }
//               }),
//           );
//           console.debug('[FEEDBACK] rules:', feedbackRules);
//           console.debug(
//             '[FEEDBACK] catalog before/after (counts):',
//             catalog.length,
//             '→ (preview)',
//             strongPreview.length,
//           );
//         }

//         // Enforce (strong, then soften if list would get too small)
//         catalog = applyFeedbackFilters(catalog, feedbackRules, {
//           minKeep: 6,
//           softenWhenBelow: true,
//         });

//         // 1) Build soft prefs from rules
//         userPrefs = buildUserPrefsFromRules(catalog, feedbackRules);

//         // 2) Pull per-item preference scores from DB
//         const prefRes = await pool.query(
//           `SELECT item_id, score FROM user_pref_item WHERE user_id = $1`,
//           [userId],
//         );
//         const prefMap = new Map<string, number>(
//           prefRes.rows.map((r: any) => [String(r.item_id), Number(r.score)]),
//         );

//         // 3) Merge DB scores into userPrefs
//         for (const [itemId, score] of prefMap) {
//           const existing = userPrefs.get(itemId) ?? 0;
//           userPrefs.set(itemId, existing + score);
//         }
//       } else {
//         console.log('[FEEDBACK] Feedback influence skipped.');
//       }

//       // Keep this only to cap style weight when the user asked for upscale vibes
//       const needUpscale =
//         /\b(upscale|smart\s*casual|business|formal|dressy|rooftop)\b/i.test(
//           query,
//         );

//       const baseConstraints = parseConstraints(query);
//       const constraints = { ...baseConstraints };

//       // keep your existing weight normalization
//       const incoming = opts?.weights ?? DEFAULT_CONTEXT_WEIGHTS;
//       const longW = toLongWeights(incoming);
//       if (needUpscale && longW.styleWeight > 0.35) {
//         longW.styleWeight = 0.35;
//       }
//       const tunedWeights = fromLongWeights(longW, incoming) as ContextWeights;

//       // 4) Proceed to rerank with enriched (or empty) userPrefs
//       const reranked = rerankCatalogWithContext(catalog, constraints, {
//         userStyle: opts?.userStyle,
//         weather: opts?.weather,
//         weights: tunedWeights,
//         useWeather: opts?.useWeather,
//         userPrefs, // ✅ real prefs or {} if disabled
//       });

//       // 4) Build prompt
//       const catalogLines = reranked
//         .map((c) => `${c.index}. ${c.label}`)
//         .join('\n');
//       const prompt = buildOutfitPrompt(catalogLines, query);

//       // 5) LLM call and parse
//       const raw = await this.vertex.generateReasonedOutfit(prompt);
//       const text =
//         (raw?.candidates?.[0]?.content?.parts?.[0]?.text as string) ??
//         (typeof raw === 'string' ? raw : '');
//       const parsed = extractStrictJson(text);

//       // Map by index
//       const byIndex = new Map<number, (typeof reranked)[number]>();
//       reranked.forEach((c) => byIndex.set(c.index, c));
//       catalog.forEach((c) => byIndex.set(c.index, c)); // backup

//       // 6) Build outfits
//       let outfits = (parsed.outfits || []).map((o: any) => ({
//         title: String(o.title ?? 'Outfit'),
//         items: Array.isArray(o.items)
//           ? (o.items
//               .map((it: any) => {
//                 if (typeof it === 'number') return byIndex.get(it);
//                 if (typeof it === 'string') {
//                   const n = Number(it.trim());
//                   if (!Number.isNaN(n)) return byIndex.get(n);
//                   return catalog.find(
//                     (c) => c.label.toLowerCase() === it.toLowerCase(),
//                   );
//                 }
//                 return undefined;
//               })
//               .filter(Boolean) as CatalogItem[])
//           : [],
//         why: String(o.why ?? ''),
//         missing: o.missing ? String(o.missing) : undefined,
//       }));

//       // ─────────────────────────────────────────────────────────
//       // HARD REPAIR: ensure required slots exist (bottom + shoes)
//       // Gym intent also requires sneakers.
//       // ─────────────────────────────────────────────────────────
//       const toLc = (s?: string) => (s ?? '').toLowerCase();
//       const gymIntent = /\b(gym|work ?out|workout|training|exercise)\b/i.test(
//         query,
//       );

//       const isBottom = (c?: CatalogItem) => {
//         if (!c) return false;
//         const main = toLc(c.main_category);
//         const sub = toLc(c.subcategory);
//         const lbl = toLc(c.label);
//         return (
//           main === 'bottoms' ||
//           /\b(trouser|pants|jeans|chinos|shorts|joggers?|sweatpants?|track\s*pants?)\b/i.test(
//             sub,
//           ) ||
//           /\bshorts?\b/i.test(lbl)
//         );
//       };
//       const isShoes = (c?: CatalogItem) => {
//         if (!c) return false;
//         const main = toLc(c.main_category);
//         const sub = toLc(c.subcategory);
//         return (
//           main === 'shoes' ||
//           /\b(sneakers?|trainers?|running|athletic|loafers?|boots?|oxfords?|derbys?|dress\s*shoes?|sandals?)\b/i.test(
//             sub,
//           )
//         );
//       };
//       const isSneaker = (c?: CatalogItem) => {
//         if (!c) return false;
//         const sub = toLc(c.subcategory);
//         const lbl = toLc(c.label);
//         return /\b(sneakers?|trainers?|running|athletic)\b/i.test(sub || lbl);
//       };
//       const isTop = (c?: CatalogItem) => {
//         if (!c) return false;
//         const main = toLc(c.main_category);
//         const sub = toLc(c.subcategory);
//         return (
//           main === 'tops' ||
//           /\b(t-?shirt|tee|polo|shirt|sweater|knit|henley|hoodie)\b/i.test(sub)
//         );
//       };
//       const orderRank = (c: CatalogItem) =>
//         isTop(c) ? 1 : isBottom(c) ? 2 : isShoes(c) ? 3 : 4;

//       const firstBottom = reranked.find(isBottom);
//       const firstShoes = reranked.find(isShoes);
//       const firstSneaker = reranked.find(isSneaker);
//       const firstTop = reranked.find(isTop);

//       outfits = outfits.map((o) => {
//         const haveBottom = o.items.some(isBottom);
//         const haveShoes = o.items.some(isShoes);
//         const haveSneaker = o.items.some(isSneaker);
//         const already = new Set(o.items.map((x) => x?.id));

//         // Gym: sneakers required
//         if (
//           gymIntent &&
//           !haveSneaker &&
//           firstSneaker &&
//           !already.has(firstSneaker.id)
//         ) {
//           o.items.push(firstSneaker);
//           o.missing = o.missing || 'auto-added sneakers for gym';
//           already.add(firstSneaker.id);
//         }

//         // Always ensure a bottom exists
//         if (!haveBottom && firstBottom && !already.has(firstBottom.id)) {
//           o.items.push(firstBottom);
//           o.missing = o.missing || 'auto-added bottom';
//           already.add(firstBottom.id);
//         }

//         // Always ensure some shoes exist
//         if (!haveShoes && firstShoes && !already.has(firstShoes.id)) {
//           o.items.push(firstShoes);
//           o.missing = o.missing || 'auto-added shoes';
//           already.add(firstShoes.id);
//         }

//         // Optional: ensure at least one top exists
//         if (!o.items.some(isTop) && firstTop && !already.has(firstTop.id)) {
//           o.items.unshift(firstTop);
//           o.missing = o.missing || 'auto-added top';
//           already.add(firstTop.id);
//         }

//         // Keep a stable, readable order: TOP, BOTTOM, SHOES, then others
//         o.items = [...o.items].sort((a, b) => orderRank(a) - orderRank(b));
//         return o;
//       });

//       // finalize
//       outfits = outfits.map((o) => finalizeOutfitSlots(o, reranked, query));
//       outfits = enforceConstraintsOnOutfits(
//         outfits as any,
//         reranked as any,
//         query,
//       ) as any;

//       // ──────────────────────────────────────────────
//       // Retitle / rewrite "why" so it matches final items
//       // ──────────────────────────────────────────────
//       outfits = outfits.map((o) => {
//         const { title, why } = this.retitleOutfit(o);
//         return { ...o, title, why };
//       });

//       // ──────────────────────────────────────────────────────────────
//       // NEW: minimal personalization using per-item prefs
//       // ──────────────────────────────────────────────────────────────
//       const withIds = outfits.map((o) => ({
//         ...o,
//         outfit_id: randomUUID(),
//       }));
//       const ids = Array.from(
//         new Set(
//           withIds.flatMap((o) =>
//             o.items.map((it: any) => it?.id).filter(Boolean),
//           ),
//         ),
//       ) as string[];

//       // small, safe table for user item prefs (auto-creates once)
//       await pool.query(
//         `CREATE TABLE IF NOT EXISTS user_pref_item(
//          user_id TEXT NOT NULL,
//          item_id TEXT NOT NULL,
//          score REAL NOT NULL DEFAULT 0,
//          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
//          PRIMARY KEY (user_id, item_id)
//        );`,
//       );

//       const prefRows =
//         ids.length > 0
//           ? await pool.query(
//               'SELECT item_id, score FROM user_pref_item WHERE user_id = $1 AND item_id = ANY($2)',
//               [userId, ids],
//             )
//           : { rows: [] as any[] };

//       const pref = new Map<string, number>(
//         prefRows.rows.map((r: any) => [String(r.item_id), Number(r.score)]),
//       );

//       const ranked = withIds
//         .map((o) => {
//           const items = o.items as any[];
//           const boost =
//             items.length === 0
//               ? 0
//               : items.reduce((a, it) => a + (pref.get(it?.id) ?? 0), 0) /
//                 items.length;
//           return { o, boost };
//         })
//         .sort((a, b) => b.boost - a.boost);

//       const best = ranked[0]?.o ??
//         withIds[0] ?? {
//           items: [],
//           why: '',
//           missing: undefined,
//           outfit_id: 'o1',
//         };

//       const request_id = randomUUID();

//       // ✅ FINAL OUTFIT DEBUG LOG (safe placement)
//       if (process.env.NODE_ENV !== 'production') {
//         console.dir(
//           {
//             level: 'OUTFIT_RESULT',
//             request_id,
//             user_id: userId,
//             query,
//             best_outfit: {
//               outfit_id: (best as any).outfit_id,
//               title: (best as any).title,
//               why: (best as any).why,
//               missing: (best as any).missing,
//               items: (best as any).items.map((it: any) => ({
//                 id: it?.id,
//                 label: it?.label,
//                 image_url: it?.image_url,
//                 main_category: it?.main_category,
//                 subcategory: it?.subcategory,
//                 brand: it?.brand,
//                 color: it?.color,
//                 dress_code: it?.dress_code,
//                 formality_score: it?.formality_score,
//               })),
//             },
//             all_outfits: withIds.map((o) => ({
//               outfit_id: o.outfit_id,
//               title: o.title,
//               why: o.why,
//               missing: o.missing,
//               items: o.items.map((it) => ({
//                 id: it?.id,
//                 label: it?.label,
//                 image_url: it?.image_url,
//                 main_category: it?.main_category,
//                 subcategory: it?.subcategory,
//                 brand: it?.brand,
//                 color: it?.color,
//                 dress_code: it?.dress_code,
//                 formality_score: it?.formality_score,
//               })),
//             })),
//           },
//           { depth: null },
//         );
//       }

//       // Return shape compatible with your mobile screen (uses current?.items/why/missing)
//       return {
//         request_id,
//         outfit_id: (best as any).outfit_id,
//         items: (best as any).items,
//         why: (best as any).why,
//         missing: (best as any).missing,
//         outfits: withIds, // keep full list if UI/telemetry needs it
//       };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }

//   /**
//    * Defensive extractor for various LLM wrapper shapes.
//    */
//   private extractModelText(output: any): string {
//     if (typeof output === 'string') return output;

//     const parts = output?.candidates?.[0]?.content?.parts;
//     if (Array.isArray(parts)) {
//       const joined = parts.map((p: any) => p?.text ?? '').join('');
//       if (joined) return joined;
//     }
//     if (typeof output?.text === 'string') return output.text;
//     return JSON.stringify(output ?? '');
//   }

//   private parseModelJson(s: string): any {
//     const cleaned = s
//       .replace(/^\s*```(?:json)?\s*/i, '')
//       .replace(/\s*```\s*$/i, '')
//       .trim();

//     try {
//       return JSON.parse(cleaned);
//     } catch {
//       const m = cleaned.match(/\{[\s\S]*\}/);
//       if (m) return JSON.parse(m[0]);
//       throw new Error('Model did not return valid JSON.');
//     }
//   }

//   // More text-normalizers
//   private normalizeDressCode(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<
//       string,
//       | 'UltraCasual'
//       | 'Casual'
//       | 'SmartCasual'
//       | 'BusinessCasual'
//       | 'Business'
//       | 'BlackTie'
//     > = {
//       ultracasual: 'UltraCasual',
//       ultra_casual: 'UltraCasual',
//       casual: 'Casual',
//       smartcasual: 'SmartCasual',
//       smart_casual: 'SmartCasual',
//       businesscasual: 'BusinessCasual',
//       business_casual: 'BusinessCasual',
//       business: 'Business',
//       blacktie: 'BlackTie',
//       black_tie: 'BlackTie',
//       'black tie': 'BlackTie',
//     };
//     return map[s];
//   }
//   private normalizeLayering(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       base: 'BASE',
//       baselayer: 'BASE',
//       'base layer': 'BASE',
//       mid: 'MID',
//       midlayer: 'MID',
//       'mid layer': 'MID',
//       shell: 'SHELL',
//       outer: 'SHELL',
//       outerwear: 'SHELL',
//       jacket: 'SHELL',
//       accent: 'ACCENT',
//       accessory: 'ACCENT',
//       acc: 'ACCENT',
//     };
//     return map[s];
//   }

//   // DTO-facing normalizers
//   private normalizeMainCategory(
//     val?: string | null,
//   ): CreateWardrobeItemDto['main_category'] {
//     const unions: CreateWardrobeItemDto['main_category'][] = [
//       'Tops',
//       'Bottoms',
//       'Outerwear',
//       'Shoes',
//       'Accessories',
//       'Undergarments',
//       'Activewear',
//       'Formalwear',
//       'Loungewear',
//       'Sleepwear',
//       'Swimwear',
//       'Maternity',
//       'Unisex',
//       'Costumes',
//       'TraditionalWear',
//     ];
//     const raw = (val ?? '').toString().trim();
//     if (unions.includes(raw as any))
//       return raw as CreateWardrobeItemDto['main_category'];
//     const s = raw.toLowerCase();
//     const map: Record<string, CreateWardrobeItemDto['main_category']> = {
//       top: 'Tops',
//       tops: 'Tops',
//       tshirt: 'Tops',
//       't-shirt': 'Tops',
//       tee: 'Tops',
//       shirt: 'Tops',
//       blouse: 'Tops',
//       knit: 'Tops',
//       sweater: 'Tops',
//       bottom: 'Bottoms',
//       bottoms: 'Bottoms',
//       pants: 'Bottoms',
//       trousers: 'Bottoms',
//       jeans: 'Bottoms',
//       chinos: 'Bottoms',
//       shorts: 'Bottoms',
//       skirt: 'Bottoms',
//       outer: 'Outerwear',
//       outerwear: 'Outerwear',
//       jacket: 'Outerwear',
//       coat: 'Outerwear',
//       parka: 'Outerwear',
//       blazer: 'Outerwear',
//       shoe: 'Shoes',
//       shoes: 'Shoes',
//       sneaker: 'Shoes',
//       sneakers: 'Shoes',
//       boot: 'Shoes',
//       boots: 'Shoes',
//       heel: 'Shoes',
//       loafers: 'Shoes',
//       accessory: 'Accessories',
//       accessories: 'Accessories',
//       bag: 'Accessories',
//       belt: 'Accessories',
//       hat: 'Accessories',
//       scarf: 'Accessories',
//       tie: 'Accessories',
//       sunglasses: 'Accessories',
//       watch: 'Accessories',
//       underwear: 'Undergarments',
//       undergarments: 'Undergarments',
//       bra: 'Undergarments',
//       briefs: 'Undergarments',
//       socks: 'Undergarments',
//       active: 'Activewear',
//       activewear: 'Activewear',
//       athleisure: 'Activewear',
//       gym: 'Activewear',
//       formal: 'Formalwear',
//       formalwear: 'Formalwear',
//       suit: 'Formalwear',
//       tuxedo: 'Formalwear',
//       lounge: 'Loungewear',
//       loungewear: 'Loungewear',
//       sweats: 'Loungewear',
//       sleep: 'Sleepwear',
//       sleepwear: 'Sleepwear',
//       pajama: 'Sleepwear',
//       pajamas: 'Sleepwear',
//       swim: 'Swimwear',
//       swimwear: 'Swimwear',
//       swimsuit: 'Swimwear',
//       trunks: 'Swimwear',
//       bikini: 'Swimwear',
//       maternity: 'Maternity',
//       unisex: 'Unisex',
//       costume: 'Costumes',
//       costumes: 'Costumes',
//       'traditional wear': 'TraditionalWear',
//       traditionalwear: 'TraditionalWear',
//       kimono: 'TraditionalWear',
//       sari: 'TraditionalWear',
//     };
//     return map[s] ?? 'Tops';
//   }
//   private resolveMainCategory(
//     rawMain?: string | null,
//     sub?: string | null,
//     layering?: string | null,
//   ): CreateWardrobeItemDto['main_category'] {
//     const normalized = this.normalizeMainCategory(rawMain);
//     const s = (sub ?? '').toLowerCase();
//     const lay = (layering ?? '').toUpperCase();
//     if (
//       [
//         'blazer',
//         'sport coat',
//         'sportcoat',
//         'suit jacket',
//         'jacket',
//         'coat',
//         'parka',
//         'trench',
//         'overcoat',
//         'topcoat',
//       ].some((k) => s.includes(k))
//     )
//       return 'Outerwear';
//     if (
//       [
//         'loafer',
//         'loafers',
//         'sneaker',
//         'sneakers',
//         'boot',
//         'boots',
//         'heel',
//         'heels',
//         'pump',
//         'oxford',
//         'derby',
//         'dress shoe',
//         'dress shoes',
//         'sandal',
//         'sandals',
//       ].some((k) => s.includes(k))
//     )
//       return 'Shoes';
//     if (
//       [
//         'belt',
//         'hat',
//         'scarf',
//         'tie',
//         'watch',
//         'sunglasses',
//         'bag',
//         'briefcase',
//       ].some((k) => s.includes(k))
//     )
//       return 'Accessories';
//     if (normalized === 'Tops' && lay === 'SHELL') return 'Outerwear';
//     return normalized;
//   }
//   private normalizePatternScaleDto(
//     val?: string | null,
//   ): CreateWardrobeItemDto['pattern_scale'] | undefined {
//     const s = (val ?? '').toString().trim().toLowerCase();
//     if (!s) return undefined;
//     if (['micro', 'subtle', '0', '-1', 'small'].includes(s)) return 'Micro';
//     if (['medium', 'mid', '1'].includes(s)) return 'Medium';
//     if (['bold', 'large', 'big', '2'].includes(s)) return 'Bold';
//     return undefined;
//   }
//   private normalizeSeasonalityDto(
//     val?: string | null,
//   ): CreateWardrobeItemDto['seasonality'] | undefined {
//     const s = (val ?? '').toString().trim().toLowerCase();
//     if (!s) return undefined;
//     if (['spring', 'spr', 'ss', 's/s'].includes(s)) return 'Spring';
//     if (['summer', 'ss2'].includes(s)) return 'Summer';
//     if (['fall', 'autumn', 'fw', 'f/w'].includes(s)) return 'Fall';
//     if (['winter', 'win'].includes(s)) return 'Winter';
//     if (
//       [
//         'all',
//         'allseason',
//         'all-season',
//         'all season',
//         'year-round',
//         'year round',
//         'all_season',
//         'allseasonal',
//         'allseasonwear',
//       ].includes(s)
//     )
//       return 'AllSeason';
//     return undefined;
//   }
//   private normalizeLayeringDto(
//     val?: string | null,
//   ): CreateWardrobeItemDto['layering'] | undefined {
//     const s = (val ?? '').toString().trim().toLowerCase();
//     if (!s) return undefined;
//     if (['base', 'base layer', 'baselayer'].includes(s)) return 'Base';
//     if (['mid', 'midlayer', 'mid layer'].includes(s)) return 'Mid';
//     if (['outer', 'outerwear', 'jacket', 'shell'].includes(s)) return 'Outer';
//     return undefined;
//   }
//   private normalizeColorTemp(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       warm: 'Warm',
//       cool: 'Cool',
//       neutral: 'Neutral',
//     };
//     return map[s] ?? undefined;
//   }
//   private normalizeContrast(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       low: 'Low',
//       medium: 'Medium',
//       med: 'Medium',
//       high: 'High',
//     };
//     return map[s] ?? undefined;
//   }

//   /**
//    * Pinecone id helper
//    */
//   private normalizePineconeId(raw: string | undefined | null): {
//     id: string;
//     modality: 'text' | 'image' | 'unknown';
//   } {
//     if (!raw) return { id: '', modality: 'unknown' };
//     const [base, modality] = String(raw).split(':');
//     return {
//       id: base,
//       modality:
//         modality === 'text' || modality === 'image' ? modality : 'unknown',
//     };
//   }

//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   private sanitizeMeta(
//     raw: Record<string, any>,
//   ): Record<string, string | number | boolean | string[]> {
//     const out: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;
//       if (k === 'metadata') {
//         out['meta_json'] = typeof v === 'string' ? v : JSON.stringify(v);
//         continue;
//       }
//       if (Array.isArray(v)) {
//         out[k] = v.map((x) => String(x)).filter((x) => x.length > 0);
//         continue;
//       }
//       switch (typeof v) {
//         case 'string':
//           out[k] = v;
//           break;
//         case 'number':
//           if (Number.isFinite(v)) out[k] = v;
//           break;
//         case 'boolean':
//           out[k] = v;
//           break;
//         case 'object':
//           out[k] = JSON.stringify(v);
//           break;
//       }
//     }
//     return out;
//   }

//   private toCamel(row: any) {
//     if (!row) return row;
//     return {
//       ...row,
//       userId: row.user_id,
//       image: row.image_url,
//       gsutilUri: row.gsutil_uri,
//       objectKey: row.object_key,
//       aiTitle: row.ai_title,
//       aiDescription: row.ai_description,
//       aiKeyAttributes: row.ai_key_attributes,
//       aiConfidence: row.ai_confidence,
//       mainCategory: row.main_category,
//       subCategory: row.subcategory,
//       styleDescriptors: row.style_descriptors,
//       styleArchetypes: row.style_archetypes,
//       anchorRole: row.anchor_role,
//       occasionTags: row.occasion_tags,
//       dressCode: row.dress_code,
//       formalityScore: row.formality_score,
//       dominantHex: row.dominant_hex,
//       paletteHex: row.palette_hex,
//       colorFamily: row.color_family,
//       colorTemp: row.color_temp,
//       contrastProfile: row.contrast_profile,
//       fabricBlend: row.fabric_blend,
//       fabricWeightGsm: row.fabric_weight_gsm,
//       wrinkleResistance: row.wrinkle_resistance,
//       stretchDirection: row.stretch_direction,
//       stretchPct: row.stretch_pct,
//       sizeSystem: row.size_system,
//       sizeLabel: row.size_label,
//       inseamIn: row.inseam_in,
//       seasonalityArr: row.seasonality_arr,
//       goesWithIds: row.goes_with_ids,
//       avoidWithIds: row.avoid_with_ids,
//       userRating: row.user_rating,
//       fitConfidence: row.fit_confidence,
//       outfitFeedback: row.outfit_feedback,
//       dislikedFeatures: row.disliked_features,
//       purchaseDate: row.purchase_date,
//       purchasePrice: row.purchase_price,
//       countryOfOrigin: row.country_of_origin,
//       lastWornAt: row.last_worn_at,
//       rotationPriority: row.rotation_priority,
//       createdAt: row.created_at,
//       updatedAt: row.updated_at,
//       deletedAt: row.deleted_at,
//     };
//   }

//   composeFromAiDraft(
//     base: Partial<CreateWardrobeItemDto>,
//     draft: Record<string, any>,
//   ): CreateWardrobeItemDto {
//     const pick = <T>(k: string, fallback?: T): T | undefined =>
//       (base as any)[k] ?? (draft?.[k] as T) ?? fallback;

//     const name = pick<string>('name') ?? draft?.ai_title ?? 'Wardrobe Item';

//     const rawSub =
//       pick<string>('subcategory') ??
//       draft?.subcategory ??
//       (draft as any)?.subCategory;
//     const layeringRaw = pick<string>('layering') ?? draft?.layering;

//     const rawMain =
//       (base as any).main_category ??
//       (draft?.main_category as string | undefined) ??
//       (draft?.category as string | undefined);

//     const main_category: CreateWardrobeItemDto['main_category'] =
//       this.resolveMainCategory(rawMain, rawSub, layeringRaw);

//     const layering = this.normalizeLayeringDto(layeringRaw);
//     const pattern_scale = this.normalizePatternScaleDto(
//       pick<string>('pattern_scale') ?? draft?.pattern_scale,
//     );
//     const seasonality = this.normalizeSeasonalityDto(
//       pick<string>('seasonality') ?? draft?.seasonality,
//     );

//     const rawTags =
//       pick<string[] | string>('tags') ?? (draft?.tags as any) ?? [];
//     const tags: string[] = Array.isArray(rawTags)
//       ? rawTags.filter(Boolean).map(String)
//       : String(rawTags)
//           .split(',')
//           .map((t) => t.trim())
//           .filter(Boolean);

//     const parseNum = (x: any) =>
//       typeof x === 'number'
//         ? x
//         : typeof x === 'string' && x.trim() !== '' && !Number.isNaN(+x)
//           ? Number(x)
//           : undefined;

//     return {
//       user_id: String(base.user_id),
//       image_url: String(base.image_url),
//       name,
//       main_category,

//       gsutil_uri: pick('gsutil_uri'),
//       object_key: pick('object_key'),

//       subcategory: pick('subcategory'),
//       color: pick('color'),
//       material: pick('material'),
//       fit: pick('fit'),
//       size: pick('size'),
//       brand: pick('brand'),
//       tags,

//       style_descriptors: draft?.style_descriptors,
//       style_archetypes: draft?.style_archetypes,
//       anchor_role: draft?.anchor_role,
//       occasion_tags: draft?.occasion_tags,
//       dress_code: draft?.dress_code,
//       formality_score: draft?.formality_score,

//       dominant_hex: draft?.dominant_hex,
//       palette_hex: draft?.palette_hex,
//       color_family: draft?.color_family,
//       color_temp: draft?.color_temp,
//       contrast_profile: draft?.contrast_profile,

//       pattern: draft?.pattern,
//       pattern_scale,

//       seasonality,
//       seasonality_arr: draft?.seasonality_arr,
//       layering,
//       thermal_rating: draft?.thermal_rating,
//       breathability: draft?.breathability,
//       rain_ok: draft?.rain_ok,
//       wind_ok: draft?.wind_ok,
//       waterproof_rating: draft?.waterproof_rating,
//       climate_sweetspot_f_min: draft?.climate_sweetspot_f_min,
//       climate_sweetspot_f_max: draft?.climate_sweetspot_f_max,

//       fabric_blend: draft?.fabric_blend,
//       fabric_weight_gsm: draft?.fabric_weight_gsm,
//       wrinkle_resistance: draft?.wrinkle_resistance,
//       stretch_direction: draft?.stretch_direction,
//       stretch_pct: draft?.stretch_pct,
//       thickness: draft?.thickness,
//       size_system: draft?.size_system,
//       size_label: draft?.size_label,
//       measurements: draft?.measurements,
//       width: draft?.width,
//       height: draft?.height,

//       neckline: draft?.neckline,
//       collar_type: draft?.collar_type,
//       sleeve_length: draft?.sleeve_length,
//       hem_style: draft?.hem_style,
//       rise: draft?.rise,
//       leg: draft?.leg,
//       inseam_in: draft?.inseam_in,
//       cuff: draft?.cuff,
//       lapel: draft?.lapel,
//       closure: draft?.closure,
//       length_class: draft?.length_class,
//       shoe_style: draft?.shoe_style,
//       sole: draft?.sole,
//       toe_shape: draft?.toe_shape,

//       care_symbols: draft?.care_symbols,
//       wash_temp_c: draft?.wash_temp_c,
//       dry_clean: draft?.dry_clean,
//       iron_ok: draft?.iron_ok,

//       retailer: draft?.retailer,
//       purchase_date: draft?.purchase_date,
//       purchase_price: draft?.purchase_price,
//       country_of_origin: draft?.country_of_origin,
//       condition: draft?.condition,
//       defects_notes: draft?.defects_notes,

//       ai_title: draft?.ai_title,
//       ai_description: draft?.ai_description,
//       ai_key_attributes: draft?.ai_key_attributes,
//       ai_confidence: parseNum(draft?.ai_confidence),

//       metadata: (base as any).metadata,
//       constraints: (base as any).constraints,
//     };
//   }

//   // CREATE
//   async createItem(dto: CreateWardrobeItemDto) {
//     const cols: string[] = [];
//     const vals: any[] = [];
//     const params: string[] = [];
//     let i = 1;

//     const add = (col: string, val: any, kind: 'json' | 'raw' = 'raw') => {
//       if (val === undefined) return;
//       if (Array.isArray(val) && val.length === 0) return;
//       cols.push(col);
//       if (kind === 'json' && val !== null) {
//         vals.push(JSON.stringify(val));
//       } else {
//         vals.push(val);
//       }
//       params.push(`$${i++}`);
//     };

//     // REQUIRED
//     add('user_id', dto.user_id);
//     add('image_url', dto.image_url);
//     add('name', dto.name);
//     add('main_category', dto.main_category);

//     // Optional core/meta
//     add('subcategory', dto.subcategory);
//     add('color', dto.color);
//     add('material', dto.material);
//     add('fit', dto.fit);
//     add('size', dto.size);
//     add('brand', dto.brand);
//     add('gsutil_uri', dto.gsutil_uri);
//     add('object_key', dto.object_key);
//     add('metadata', dto.metadata, 'json');
//     add('width', dto.width);
//     add('height', dto.height);
//     add('tags', dto.tags);

//     // Visuals & styling
//     add('style_descriptors', dto.style_descriptors);
//     add('style_archetypes', dto.style_archetypes);
//     add('anchor_role', this.normalizeAnchorRole(dto.anchor_role));

//     const normalizedPattern = this.normalizePattern(dto.pattern);
//     if (
//       normalizedPattern &&
//       WardrobeService.PATTERN_ENUM_WHITELIST.includes(normalizedPattern)
//     ) {
//       add('pattern', normalizedPattern);
//     }
//     if (dto.pattern_scale !== undefined) {
//       add(
//         'pattern_scale',
//         this.normalizePatternScaleDto(dto.pattern_scale) ?? null,
//       );
//     }

//     add('dominant_hex', dto.dominant_hex);
//     add('palette_hex', dto.palette_hex);
//     add('color_family', dto.color_family);
//     add('color_temp', this.normalizeColorTemp(dto.color_temp));
//     add('contrast_profile', this.normalizeContrast(dto.contrast_profile));

//     // Occasion & formality
//     add('occasion_tags', dto.occasion_tags);
//     add('dress_code', this.normalizeDressCode(dto.dress_code));
//     add('formality_score', dto.formality_score);

//     // Seasonality & climate (ENUMS)
//     const normalizedSeasonality = this.normalizeSeasonality(dto.seasonality);
//     if (
//       normalizedSeasonality &&
//       WardrobeService.SEASONALITY_ENUM_WHITELIST.includes(normalizedSeasonality)
//     ) {
//       add('seasonality', normalizedSeasonality);
//     }
//     const normalizedLayering = this.normalizeLayering(dto.layering);
//     if (
//       normalizedLayering &&
//       WardrobeService.LAYERING_ENUM_WHITELIST.includes(normalizedLayering)
//     ) {
//       add('layering', normalizedLayering);
//     }

//     add('seasonality_arr', dto.seasonality_arr);
//     add('thermal_rating', dto.thermal_rating);
//     add('breathability', dto.breathability);
//     add('rain_ok', dto.rain_ok);
//     add('wind_ok', dto.wind_ok);
//     add('waterproof_rating', dto.waterproof_rating);
//     add('climate_sweetspot_f_min', dto.climate_sweetspot_f_min);
//     add('climate_sweetspot_f_max', dto.climate_sweetspot_f_max);

//     // Construction & sizing
//     add('fabric_blend', dto.fabric_blend, 'json');
//     add('fabric_weight_gsm', dto.fabric_weight_gsm);
//     add('wrinkle_resistance', dto.wrinkle_resistance);
//     add('stretch_direction', dto.stretch_direction);
//     add('stretch_pct', dto.stretch_pct);
//     add('thickness', dto.thickness);
//     add('size_system', dto.size_system);
//     add('size_label', dto.size_label);
//     add('measurements', dto.measurements, 'json');

//     // Silhouette & cut
//     add('neckline', dto.neckline);
//     add('collar_type', dto.collar_type);
//     add('sleeve_length', dto.sleeve_length);
//     add('hem_style', dto.hem_style);
//     add('rise', dto.rise);
//     add('leg', dto.leg);
//     add('inseam_in', dto.inseam_in);
//     add('cuff', dto.cuff);
//     add('lapel', dto.lapel);
//     add('closure', dto.closure);
//     add('length_class', dto.length_class);
//     add('shoe_style', dto.shoe_style);
//     add('sole', dto.sole);
//     add('toe_shape', dto.toe_shape);

//     // Care
//     add('care_symbols', dto.care_symbols);
//     add('wash_temp_c', dto.wash_temp_c);
//     add('dry_clean', dto.dry_clean);
//     add('iron_ok', dto.iron_ok);

//     // Usage
//     add('wear_count', dto.wear_count ?? 0);
//     add('last_worn_at', dto.last_worn_at);
//     add('rotation_priority', dto.rotation_priority);

//     // Commerce & provenance
//     add('purchase_date', dto.purchase_date);
//     add('purchase_price', dto.purchase_price);
//     add('retailer', dto.retailer);
//     add('country_of_origin', dto.country_of_origin);
//     add('condition', dto.condition);
//     add('defects_notes', dto.defects_notes);

//     // Pairing & feedback
//     add('goes_with_ids', dto.goes_with_ids);
//     add('avoid_with_ids', dto.avoid_with_ids);
//     add('user_rating', dto.user_rating);
//     add('fit_confidence', dto.fit_confidence);
//     add('outfit_feedback', dto.outfit_feedback, 'json');
//     add('disliked_features', dto.disliked_features);

//     // AI
//     add('ai_title', dto.ai_title);
//     add('ai_description', dto.ai_description);
//     add('ai_key_attributes', dto.ai_key_attributes);
//     add('ai_confidence', dto.ai_confidence);

//     // System
//     add('constraints', dto.constraints);

//     const sql = `
//       INSERT INTO wardrobe_items (${cols.join(', ')})
//       VALUES (${params.join(', ')})
//       RETURNING *;
//     `;
//     const result = await pool.query(sql, vals);
//     const item = result.rows[0];

//     // Embeddings
//     let imageVec: number[] | undefined;
//     const gcs = dto.gsutil_uri ?? item.gsutil_uri;
//     if (gcs) imageVec = await this.vertex.embedImage(gcs);

//     const textVec = await this.vertex.embedText(
//       [
//         item.name,
//         item.main_category,
//         item.subcategory,
//         item.color,
//         item.color_family,
//         item.material,
//         item.fit,
//         item.size,
//         item.brand,
//         item.color_temp,
//         item.contrast_profile,
//         String(item.formality_score ?? ''),
//         item.seasonality,
//         item.layering,
//         item.pattern,
//         item.pattern_scale,
//         item.neckline,
//         item.collar_type,
//         item.sleeve_length,
//         item.rise,
//         item.leg,
//         String(item.inseam_in ?? ''),
//         item.length_class,
//         item.shoe_style,
//         item.sole,
//         Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.dress_code,
//         item.anchor_role,
//         item.dominant_hex,
//         Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
//       ]
//         .filter(Boolean)
//         .join(' '),
//     );

//     const meta = this.sanitizeMeta({ ...item });
//     await upsertItemNs({
//       userId: dto.user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return {
//       message: 'Wardrobe item created + indexed successfully',
//       item: this.toCamel(item),
//     };
//   }

//   // READ
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows.map((r) => this.toCamel(r));
//   }

//   // UPDATE
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     if (dto.pattern !== undefined) {
//       const p = this.normalizePattern(dto.pattern);
//       (dto as any).pattern =
//         p && WardrobeService.PATTERN_ENUM_WHITELIST.includes(p) ? p : null;
//     }
//     if (dto.seasonality !== undefined) {
//       const s = this.normalizeSeasonality(dto.seasonality);
//       (dto as any).seasonality =
//         s && WardrobeService.SEASONALITY_ENUM_WHITELIST.includes(s) ? s : null;
//     }
//     if (dto.layering !== undefined) {
//       const l = this.normalizeLayering(dto.layering);
//       (dto as any).layering =
//         l && WardrobeService.LAYERING_ENUM_WHITELIST.includes(l) ? l : null;
//     }
//     if (dto.anchor_role !== undefined)
//       (dto as any).anchor_role =
//         this.normalizeAnchorRole(dto.anchor_role) ?? null;
//     if (dto.dress_code !== undefined)
//       (dto as any).dress_code = this.normalizeDressCode(dto.dress_code) ?? null;
//     if (dto.color_temp !== undefined)
//       (dto as any).color_temp = this.normalizeColorTemp(dto.color_temp) ?? null;
//     if (dto.contrast_profile !== undefined)
//       (dto as any).contrast_profile =
//         this.normalizeContrast(dto.contrast_profile) ?? null;
//     if (dto.pattern_scale !== undefined)
//       (dto as any).pattern_scale =
//         this.normalizePatternScaleDto(dto.pattern_scale) ?? null;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         if (Array.isArray(value)) {
//           values.push(value.length ? value : null);
//         } else if (typeof value === 'object' && value !== null) {
//           values.push(JSON.stringify(value));
//         } else {
//           values.push(value);
//         }
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

//     values.push(itemId);

//     const query = `
//       UPDATE wardrobe_items
//       SET ${fields.join(', ')}, updated_at = NOW()
//       WHERE id = $${index}
//       RETURNING *;
//     `;
//     const result = await pool.query(query, values);
//     const item = result.rows[0];

//     let textVec: number[] | undefined;
//     let imageVec: number[] | undefined;

//     const textFields = [
//       'name',
//       'main_category',
//       'subcategory',
//       'color',
//       'color_family',
//       'material',
//       'fit',
//       'size',
//       'brand',
//       'pattern',
//       'pattern_scale',
//       'seasonality',
//       'layering',
//       'dress_code',
//       'occasion_tags',
//       'tags',
//       'anchor_role',
//     ];
//     const textChanged = textFields.some((f) => f in dto);
//     if (textChanged) {
//       const textInput = [
//         item.name,
//         item.main_category,
//         item.subcategory,
//         item.color,
//         item.color_family,
//         item.material,
//         item.fit,
//         item.size,
//         item.brand,
//         item.color_temp,
//         item.contrast_profile,
//         String(item.formality_score ?? ''),
//         item.seasonality,
//         item.layering,
//         item.pattern,
//         item.pattern_scale,
//         item.neckline,
//         item.collar_type,
//         item.sleeve_length,
//         item.rise,
//         item.leg,
//         String(item.inseam_in ?? ''),
//         item.length_class,
//         item.shoe_style,
//         item.sole,
//         Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.dress_code,
//         item.anchor_role,
//         item.dominant_hex,
//         Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
//       ]
//         .filter(Boolean)
//         .join(' ');
//       textVec = await this.vertex.embedText(textInput);
//     }

//     const imageChanged = 'gsutil_uri' in dto || 'image_url' in dto;
//     const gcs = (dto as any).gsutil_uri ?? item.gsutil_uri;
//     if (imageChanged && gcs) {
//       imageVec = await this.vertex.embedImage(gcs);
//     }

//     const meta = this.sanitizeMeta({ ...item });

//     if (textVec || imageVec) {
//       await upsertItemNs({
//         userId: item.user_id,
//         itemId: item.id,
//         textVec,
//         imageVec,
//         meta,
//       });
//     } else {
//       await upsertItemNs({ userId: item.user_id, itemId: item.id, meta });
//     }

//     return {
//       message: 'Wardrobe item updated successfully',
//       item: this.toCamel(item),
//     };
//   }

//   // DELETE
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;
//     try {
//       await pool.query(
//         'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//         [item_id, user_id],
//       );
//     } catch (err: any) {
//       console.warn(`⚠️ Skipped DB delete: ${err.message}`);
//     }
//     try {
//       await deleteItemNs(user_id, item_id);
//     } catch (err: any) {
//       console.warn(`⚠️ Pinecone delete skipped: ${err.message}`);
//     }
//     if (image_url) {
//       const bucketName = process.env.GCS_BUCKET_NAME!;
//       const fileName = this.extractFileName(image_url);
//       try {
//         await storage.bucket(bucketName).file(fileName).delete();
//       } catch (err: any) {
//         if ((err as any).code === 404) {
//           console.warn('🧼 GCS file already deleted:', fileName);
//         } else {
//           console.error('❌ Error deleting GCS file:', (err as any).message);
//         }
//       }
//     }
//     return { message: 'Wardrobe item cleanup attempted (DB, Pinecone, GCS)' };
//   }

//   // VECTOR SEARCH UTILITIES
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }
//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }
//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }
//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);
//     const matches = await hybridQueryUserNs({
//       userId,
//       textVec,
//       imageVec,
//       topK,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }

//   // Label helper
//   private summarizeItem(meta: any): string {
//     if (!meta) return 'Item';
//     const name = (meta.name || '').toString().trim();

//     const color = meta.color || meta.color_family;
//     const cat = meta.main_category || meta.mainCategory;
//     const sub = meta.subcategory || meta.subCategory;
//     const mat = meta.material;
//     const brand = meta.brand;
//     const fit = meta.fit;
//     const size = meta.size_label || meta.size;
//     const dress = meta.dress_code || meta.dressCode;
//     const role = meta.anchor_role || meta.anchorRole;
//     const patternish = meta.pattern_scale || meta.patternScale || meta.pattern;

//     // ── NEW: slot detection to make roles explicit ─────────────
//     const toLc = (s: any) => (s ?? '').toString().trim().toLowerCase();
//     const mainLc = toLc(cat);
//     const subLc = toLc(sub);

//     const isBottom =
//       mainLc === 'bottoms' ||
//       /\b(trouser|pants|jeans|chinos|shorts|joggers?|sweatpants?|track\s*pants?)\b/i.test(
//         subLc,
//       );

//     const isShoes =
//       mainLc === 'shoes' ||
//       /\b(sneakers?|trainers?|running|athletic|loafers?|boots?|oxfords?|derbys?|dress\s*shoes?|sandals?)\b/i.test(
//         subLc,
//       );

//     const isOuter =
//       mainLc === 'outerwear' ||
//       /\b(blazer|sport\s*coat|suit\s*jacket|jacket|coat|windbreaker|parka|trench|overcoat|topcoat)\b/i.test(
//         subLc,
//       );

//     const isTop =
//       mainLc === 'tops' ||
//       /\b(t-?shirt|tee|polo|shirt|sweater|knit|henley|hoodie)\b/i.test(subLc);

//     const isAcc =
//       mainLc === 'accessories' ||
//       /\b(belt|watch|hat|scarf|tie|sunglasses|bag|briefcase)\b/i.test(subLc);

//     const slot =
//       (isBottom && 'BOTTOM') ||
//       (isShoes && 'SHOES') ||
//       (isOuter && 'OUTER') ||
//       (isTop && 'TOP') ||
//       (isAcc && 'ACC') ||
//       undefined;

//     // ───────────────────────────────────────────────────────────

//     const primary = [color, mat, sub || cat].filter(Boolean).join(' ');

//     const season =
//       meta.seasonality ||
//       (Array.isArray(meta.seasonality_arr) && meta.seasonality_arr.join('/'));
//     const temp = meta.color_temp;
//     const contrast = meta.contrast_profile;
//     const form = meta.formality_score != null ? `F${meta.formality_score}` : '';

//     const extras = [
//       brand && `${brand}`,
//       fit && `${fit} fit`,
//       size && `(${size})`,
//       dress && `${dress}`,
//       role && `${role} role`,
//       patternish && `pattern:${patternish}`,
//       season && `${season}`,
//       temp && `temp:${temp}`,
//       contrast && `contrast:${contrast}`,
//       form,
//     ]
//       .filter(Boolean)
//       .join(', ');

//     const headRaw = primary || name || 'Item';
//     const head = slot ? `[${slot}] ${headRaw}` : headRaw;
//     return extras ? `${head} — ${extras}` : head;
//   }
// }
