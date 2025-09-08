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
import { FeedbackService } from '../feedback/feedback.service';

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

@Injectable()
export class WardrobeService {
  constructor(
    private readonly vertex: VertexService,
    private readonly feedbackService: FeedbackService, // <-- inject here
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Enum whitelists (insert only if value is included)
  // Mirror DB enums exactly (UPPERCASE)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * These lists gate what we insert for "hard" enum-like DB columns.
   * If a value doesn't match, we insert NULL instead of invalid text.
   */
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

  // Generic safe-casters used throughout normalization
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Normalizers for enum-ish columns (string folding, canonicalization)
  // ─────────────────────────────────────────────────────────────────────────────

  private normLower(val?: string | null) {
    if (!val) return undefined;
    const s = String(val).trim();
    if (!s) return undefined;
    return s.toLowerCase();
  }

  /**
   * Normalize free-form "pattern" into strict DB labels (UPPERCASE).
   * Returns undefined if no confident mapping exists.
   */
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

  /**
   * If subcategory strongly implies a main category (e.g. "Blazer" ⇒ Outerwear,
   * "Loafer" ⇒ Shoes, "Belt" ⇒ Accessories), override/force it.
   * Otherwise, fall back to the provided main category (or undefined).
   */
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

  // Additional normalizers for various text-y fields
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
    // Normalize to DB enum labels (UPPERCASE)
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

  /**
   * Model helper: extract the first JSON object from a raw string (defensive
   * against models sometimes returning extra text or code fences).
   */
  // moved to ./logic/json → extractStrictJson

  /**
   * MAIN OUTFIT GENERATOR:
   * 1) Embed query text → Pinecone search for candidate items (topK).
   * 2) Build a stable "catalog" with indexes and human-ish labels for prompt.
   * 3) Rerank catalog with lightweight constraint logic.
   * 4) Prompt the model to build 2–3 outfits by numeric index only.
   * 5) Parse model JSON + map indices back to CatalogItem objects.
   * 6) Post-process each outfit to enforce slots/constraints and fill gaps.
   */
  async generateOutfits(
    userId: string,
    query: string,
    topK: number,
    opts?: {
      userStyle?: UserStyle;
      weather?: WeatherContext;
      weights?: ContextWeights;
      useWeather?: boolean; // 👈 ADD THIS
    },
  ) {
    try {
      // 1) Vectorize query and pull nearest items for this user
      const queryVec = await this.vertex.embedText(query);
      const matches = await queryUserNs({
        userId,
        vector: queryVec,
        topK,
        includeMetadata: true,
      });

      // 2) Build a prompt-friendly catalog from Pinecone metadata
      const catalog: CatalogItem[] = matches.map((m, i) => {
        const { id } = this.normalizePineconeId(m.id as string);
        const meta: any = m.metadata || {};

        // Coerce main_category from subcategory when obvious (e.g. "Loafers")
        const sub_raw = this.asStr(meta.subcategory ?? meta.subCategory);
        const main_raw = this.asStr(meta.main_category ?? meta.mainCategory);
        const main_fix = this.coerceMainCategoryFromSub(main_raw, sub_raw);

        return {
          index: i + 1,
          id,
          label: this.summarizeItem(meta),

          image_url: this.asStr(meta.image_url ?? meta.imageUrl),
          main_category: main_fix, // coerced category
          subcategory: sub_raw,
          color: this.asStr(meta.color ?? meta.color_family),
          color_family: this.asStr(meta.color_family),
          shoe_style: this.asStr(meta.shoe_style),
          dress_code: this.asStr(meta.dress_code ?? meta.dressCode),

          formality_score: this.asNum(meta.formality_score),

          // NEW: extras for style/weather scoring
          brand: this.asStr(meta.brand),
          material: this.asStr(meta.material),
          sleeve_length: this.asStr(meta.sleeve_length),
          layering: this.asStr(meta.layering),
          waterproof_rating: this.asNum(meta.waterproof_rating),
          rain_ok: !!meta.rain_ok,
        };
      });

      console.log(
        '[SERVICE] useWeather=',
        opts?.useWeather,
        'weather=',
        opts?.weather,
      );

      const itemBoosts = await this.feedbackService.getUserItemBoosts(
        userId,
        500,
      );

      // 3) Context-aware rerank (constraints + user style + weather)
      const reranked = rerankCatalogWithContext(
        catalog,
        parseConstraints(query),
        {
          userStyle: opts?.userStyle,
          weather: opts?.weather,
          weights: opts?.weights ?? DEFAULT_CONTEXT_WEIGHTS,
          useWeather: opts?.useWeather, // keep forwarding this
          itemBoosts, // 👈 NEW
          boostAlpha: 0.15, // 👈 optional; tune as needed
        },
      );
      // 4) Build LLM prompt from catalog (extracted)
      const catalogLines = reranked
        .map((c) => `${c.index}. ${c.label}`)
        .join('\n');
      const prompt = buildOutfitPrompt(catalogLines, query);

      // 5) Call Vertex / LLM and parse JSON robustly
      const raw = await this.vertex.generateReasonedOutfit(prompt);
      const text =
        (raw?.candidates?.[0]?.content?.parts?.[0]?.text as string) ??
        (typeof raw === 'string' ? raw : '');
      const parsed = extractStrictJson(text);

      // Map from index → catalog item (use reranked indices)
      const byIndex = new Map<number, (typeof reranked)[number]>();
      reranked.forEach((c) => byIndex.set(c.index, c));
      catalog.forEach((c) => byIndex.set(c.index, c)); // backup

      // Convert model "items": [indices] into concrete CatalogItem objects
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

      // 6) Finalize each outfit (slots, exclusions, fallback picks) (extracted)
      outfits = outfits.map((o) => finalizeOutfitSlots(o, reranked, query));

      // Optional: post-LLM hard constraints (kept callable; no change to behavior unless used)
      outfits = enforceConstraintsOnOutfits(
        outfits as any,
        reranked as any,
        query,
      ) as any;

      return { outfits };
    } catch (err: any) {
      console.error('❌ Error in generateOutfits:', err.message, err.stack);
      throw err;
    }
  }

  /**
   * Defensive extractor for various LLM wrapper shapes.
   * (Not currently used in the flow above; kept as utility.)
   */
  private extractModelText(output: any): string {
    if (typeof output === 'string') return output;

    // Gemini JSON response shape
    const parts = output?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const joined = parts.map((p: any) => p?.text ?? '').join('');
      if (joined) return joined;
    }

    // Some wrappers return { text: "..." }
    if (typeof output?.text === 'string') return output.text;

    // Last resort: stringify
    return JSON.stringify(output ?? '');
  }

  /**
   * Strip code-fences and parse JSON. If parsing fails, try to find the largest
   * {...} block in the text. (Not used by generateOutfits; utility kept handy.)
   */
  private parseModelJson(s: string): any {
    const cleaned = s
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        return JSON.parse(m[0]);
      }
      throw new Error('Model did not return valid JSON.');
    }
  }

  // More text-normalizers (to map free-form strings to strict unions/enums)
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
    // Normalize to DB enum labels (UPPERCASE)
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

  // ─────────────────────────────────────────────────────────────────────────────
  // DTO-facing normalizers for API input → DB-safe unions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Normalize main_category into the strict union the DTO expects.
   * Handles synonyms/singular/plurals and falls back to 'Tops' if unknown.
   */
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

  /**
   * Smarter resolution: adjust main category from sub/layering hints (e.g. SHELL → Outerwear).
   */
  private resolveMainCategory(
    rawMain?: string | null,
    sub?: string | null,
    layering?: string | null,
  ): CreateWardrobeItemDto['main_category'] {
    const normalized = this.normalizeMainCategory(rawMain);
    const s = (sub ?? '').toLowerCase();
    const lay = (layering ?? '').toUpperCase();

    // Obvious outers
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

    // Obvious shoes
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

    // Obvious accessories
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

    // Shell layer isn't a "Top"
    if (normalized === 'Tops' && lay === 'SHELL') return 'Outerwear';

    return normalized;
  }

  // Human-friendly normalizations for DTO text fields
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
   * Pinecone IDs are stored as `${itemId}:${modality}` where modality is `text` or `image`.
   * This helps us keep two vectors per item.
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

  /**
   * Pinecone metadata must be primitives or string[].
   * - Objects are JSON.stringified.
   * - Arrays are coerced to string[].
   * - A raw "metadata" field is renamed to "meta_json" to avoid conflicts.
   */
  private sanitizeMeta(
    raw: Record<string, any>,
  ): Record<string, string | number | boolean | string[]> {
    const out: Record<string, string | number | boolean | string[]> = {};

    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;

      if (k === 'metadata') {
        // Keep as JSON string under a different key to avoid name collision
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
        default:
          break;
      }
    }

    return out;
  }

  /**
   * Map DB snake_case row to camelCase the mobile app prefers.
   */
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

  /**
   * Compose a CreateWardrobeItemDto by merging user-supplied base values with an
   * AI draft object. All enum-ish fields are normalized to strict DTO unions.
   */
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

    // Prioritize main category resolution from sub/layering hints
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

    // Ensure tags becomes string[]
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
      // required
      user_id: String(base.user_id),
      image_url: String(base.image_url),
      name,
      main_category,

      // storage
      gsutil_uri: pick('gsutil_uri'),
      object_key: pick('object_key'),

      // core
      subcategory: pick('subcategory'),
      color: pick('color'),
      material: pick('material'),
      fit: pick('fit'),
      size: pick('size'),
      brand: pick('brand'),
      tags,

      // styling / occasion
      style_descriptors: draft?.style_descriptors,
      style_archetypes: draft?.style_archetypes,
      anchor_role: draft?.anchor_role,
      occasion_tags: draft?.occasion_tags,
      dress_code: draft?.dress_code,
      formality_score: draft?.formality_score,

      // color/palette
      dominant_hex: draft?.dominant_hex,
      palette_hex: draft?.palette_hex,
      color_family: draft?.color_family,
      color_temp: draft?.color_temp,
      contrast_profile: draft?.contrast_profile,

      // pattern
      pattern: draft?.pattern,
      pattern_scale,

      // climate / season
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

      // construction & sizing
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

      // silhouette
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

      // care
      care_symbols: draft?.care_symbols,
      wash_temp_c: draft?.wash_temp_c,
      dry_clean: draft?.dry_clean,
      iron_ok: draft?.iron_ok,

      // commerce
      retailer: draft?.retailer,
      purchase_date: draft?.purchase_date,
      purchase_price: draft?.purchase_price,
      country_of_origin: draft?.country_of_origin,
      condition: draft?.condition,
      defects_notes: draft?.defects_notes,

      // AI narrative
      ai_title: draft?.ai_title,
      ai_description: draft?.ai_description,
      ai_key_attributes: draft?.ai_key_attributes,
      ai_confidence: parseNum(draft?.ai_confidence),

      // passthrough (will be JSON stringified in createItem)
      metadata: (base as any).metadata,
      constraints: (base as any).constraints,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE ITEM (dynamic INSERT + embeddings + Pinecone upsert)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Insert a new wardrobe item with only the provided fields, normalize enum-ish
   * values, and then index it into Pinecone (text+image vectors + metadata).
   */
  async createItem(dto: CreateWardrobeItemDto) {
    const cols: string[] = [];
    const vals: any[] = [];
    const params: string[] = [];
    let i = 1;

    // Helper to append a column/value pair. If kind='json', we stringify.
    const add = (col: string, val: any, kind: 'json' | 'raw' = 'raw') => {
      if (val === undefined) return; // allow null to pass through
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
    add('metadata', dto.metadata, 'json'); // ensure JSON object, not pre-stringified
    add('width', dto.width);
    add('height', dto.height);
    add('tags', dto.tags);

    // Visuals & styling
    add('style_descriptors', dto.style_descriptors);
    add('style_archetypes', dto.style_archetypes);
    add('anchor_role', this.normalizeAnchorRole(dto.anchor_role));

    // pattern (ENUM): only insert if whitelisted
    const normalizedPattern = this.normalizePattern(dto.pattern);
    if (
      normalizedPattern &&
      WardrobeService.PATTERN_ENUM_WHITELIST.includes(normalizedPattern)
    ) {
      add('pattern', normalizedPattern);
    }
    // pattern_scale (free text normalized to Micro/Medium/Bold for UI)
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

    // Seasonality & climate (ENUMS): only insert if valid
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

    // Construction & sizing (JSON fields are stringified)
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

    // System (free-form JSON-ish passthrough)
    add('constraints', dto.constraints);

    // Execute dynamic INSERT
    const sql = `
      INSERT INTO wardrobe_items (${cols.join(', ')})
      VALUES (${params.join(', ')})
      RETURNING *;
    `;
    const result = await pool.query(sql, vals);
    const item = result.rows[0];

    // Build embeddings for Pinecone
    let imageVec: number[] | undefined;
    // Use DB row fallback so we still embed image if dto.gsutil_uri was omitted
    const gcs = dto.gsutil_uri ?? item.gsutil_uri;
    if (gcs) imageVec = await this.vertex.embedImage(gcs);

    // Rich text embedding from many descriptive fields
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

        // color theory / dress code signals
        item.color_temp,
        item.contrast_profile,
        String(item.formality_score ?? ''),
        item.seasonality,
        item.layering,
        item.pattern,
        item.pattern_scale,

        // silhouette hooks
        item.neckline,
        item.collar_type,
        item.sleeve_length,
        item.rise,
        item.leg,
        String(item.inseam_in ?? ''),
        item.length_class,
        item.shoe_style,
        item.sole,

        // preferences
        Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        item.dress_code,
        item.anchor_role,

        // palette
        item.dominant_hex,
        Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' '),
    );

    // Flatten metadata for Pinecone and upsert both text+image records
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

  // ─────────────────────────────────────────────────────────────────────────────
  // READ ITEMS (used by mobile app)
  // ─────────────────────────────────────────────────────────────────────────────

  async getItemsByUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows.map((r) => this.toCamel(r));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE ITEM (dynamic UPDATE + selective re-embedding + Pinecone refresh)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Update only provided fields, normalize enums, and decide whether to:
   * - re-embed text (if text-ish fields changed),
   * - re-embed image (if gsutil_uri/image_url changed),
   * - or just refresh metadata in Pinecone.
   */
  async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    // Gate/normalize enum-like fields before UPDATE
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
    if (dto.anchor_role !== undefined) {
      (dto as any).anchor_role =
        this.normalizeAnchorRole(dto.anchor_role) ?? null;
    }
    if (dto.dress_code !== undefined) {
      (dto as any).dress_code = this.normalizeDressCode(dto.dress_code) ?? null;
    }
    if (dto.color_temp !== undefined) {
      (dto as any).color_temp = this.normalizeColorTemp(dto.color_temp) ?? null;
    }
    if (dto.contrast_profile !== undefined) {
      (dto as any).contrast_profile =
        this.normalizeContrast(dto.contrast_profile) ?? null;
    }
    if (dto.pattern_scale !== undefined) {
      (dto as any).pattern_scale =
        this.normalizePatternScaleDto(dto.pattern_scale) ?? null;
    }

    // Build dynamic SET list, stringifying objects/arrays as needed
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

    // Decide if we need to re-embed and/or refresh metadata
    let textVec: number[] | undefined;
    let imageVec: number[] | undefined;

    // If any of these fields changed, rebuild text embedding
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

        // stronger embed with color/dress signals
        item.color_temp,
        item.contrast_profile,
        String(item.formality_score ?? ''),
        item.seasonality,
        item.layering,
        item.pattern,
        item.pattern_scale,

        // silhouette
        item.neckline,
        item.collar_type,
        item.sleeve_length,
        item.rise,
        item.leg,
        String(item.inseam_in ?? ''),
        item.length_class,
        item.shoe_style,
        item.sole,

        // preferences
        Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        item.dress_code,
        item.anchor_role,

        // palette
        item.dominant_hex,
        Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ');
      textVec = await this.vertex.embedText(textInput);
    }

    // Re-embed image only if gsutil_uri/image_url changed (use DB fallback)
    const imageChanged = 'gsutil_uri' in dto || 'image_url' in dto;
    const gcs = (dto as any).gsutil_uri ?? item.gsutil_uri;
    if (imageChanged && gcs) {
      imageVec = await this.vertex.embedImage(gcs);
    }

    // Always push fresh metadata to Pinecone (with/without vectors)
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
      // Metadata-only refresh (both :text and :image records)
      await upsertItemNs({
        userId: item.user_id,
        itemId: item.id,
        meta,
      });
    }

    return {
      message: 'Wardrobe item updated successfully',
      item: this.toCamel(item),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE ITEM (DB + Pinecone + GCS best-effort cleanup)
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // VECTOR SEARCH UTILITIES (used by dev tools / debugging endpoints)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Return nearest items to a given query vector for this user (raw). */
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

  /** Text-only vector search */
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

  /** Image-only vector search */
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

  /** Hybrid (text + image) search, weighted inside Pinecone (via hybridQueryUserNs). */
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility: Build a compact, human-readable label for a catalog line.
  // Shows enough attributes to help the model and humans pick items by index.
  // ─────────────────────────────────────────────────────────────────────────────

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

    const head = primary || name || 'Item';
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

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Enum whitelists (insert only if value is included)
//   // Mirror DB enums exactly (UPPERCASE)
//   // ─────────────────────────────────────────────────────────────────────────────

//   /**
//    * These lists gate what we insert for "hard" enum-like DB columns.
//    * If a value doesn't match, we insert NULL instead of invalid text.
//    */
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

//   // Generic safe-casters used throughout normalization
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Normalizers for enum-ish columns (string folding, canonicalization)
//   // ─────────────────────────────────────────────────────────────────────────────

//   private normLower(val?: string | null) {
//     if (!val) return undefined;
//     const s = String(val).trim();
//     if (!s) return undefined;
//     return s.toLowerCase();
//   }

//   /**
//    * Normalize free-form "pattern" into strict DB labels (UPPERCASE).
//    * Returns undefined if no confident mapping exists.
//    */
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

//   /**
//    * If subcategory strongly implies a main category (e.g. "Blazer" ⇒ Outerwear,
//    * "Loafer" ⇒ Shoes, "Belt" ⇒ Accessories), override/force it.
//    * Otherwise, fall back to the provided main category (or undefined).
//    */
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

//   // Additional normalizers for various text-y fields
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
//     // Normalize to DB enum labels (UPPERCASE)
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

//   /**
//    * Model helper: extract the first JSON object from a raw string (defensive
//    * against models sometimes returning extra text or code fences).
//    */
//   // moved to ./logic/json → extractStrictJson

//   /**
//    * MAIN OUTFIT GENERATOR:
//    * 1) Embed query text → Pinecone search for candidate items (topK).
//    * 2) Build a stable "catalog" with indexes and human-ish labels for prompt.
//    * 3) Rerank catalog with lightweight constraint logic.
//    * 4) Prompt the model to build 2–3 outfits by numeric index only.
//    * 5) Parse model JSON + map indices back to CatalogItem objects.
//    * 6) Post-process each outfit to enforce slots/constraints and fill gaps.
//    */
//   async generateOutfits(
//     userId: string,
//     query: string,
//     topK: number,
//     opts?: {
//       userStyle?: UserStyle;
//       weather?: WeatherContext;
//       weights?: ContextWeights;
//       useWeather?: boolean; // 👈 ADD THIS
//     },
//   ) {
//     try {
//       // 1) Vectorize query and pull nearest items for this user
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({
//         userId,
//         vector: queryVec,
//         topK,
//         includeMetadata: true,
//       });

//       // 2) Build a prompt-friendly catalog from Pinecone metadata
//       const catalog: CatalogItem[] = matches.map((m, i) => {
//         const { id } = this.normalizePineconeId(m.id as string);
//         const meta: any = m.metadata || {};

//         // Coerce main_category from subcategory when obvious (e.g. "Loafers")
//         const sub_raw = this.asStr(meta.subcategory ?? meta.subCategory);
//         const main_raw = this.asStr(meta.main_category ?? meta.mainCategory);
//         const main_fix = this.coerceMainCategoryFromSub(main_raw, sub_raw);

//         return {
//           index: i + 1,
//           id,
//           label: this.summarizeItem(meta),

//           image_url: this.asStr(meta.image_url ?? meta.imageUrl),
//           main_category: main_fix, // coerced category
//           subcategory: sub_raw,
//           color: this.asStr(meta.color ?? meta.color_family),
//           color_family: this.asStr(meta.color_family),
//           shoe_style: this.asStr(meta.shoe_style),
//           dress_code: this.asStr(meta.dress_code ?? meta.dressCode),

//           formality_score: this.asNum(meta.formality_score),

//           // NEW: extras for style/weather scoring
//           brand: this.asStr(meta.brand),
//           material: this.asStr(meta.material),
//           sleeve_length: this.asStr(meta.sleeve_length),
//           layering: this.asStr(meta.layering),
//           waterproof_rating: this.asNum(meta.waterproof_rating),
//           rain_ok: !!meta.rain_ok,
//         };
//       });

//       console.log(
//         '[SERVICE] useWeather=',
//         opts?.useWeather,
//         'weather=',
//         opts?.weather,
//       );

//       // 3) Context-aware rerank (constraints + user style + weather)
//       const reranked = rerankCatalogWithContext(
//         catalog,
//         parseConstraints(query),
//         {
//           userStyle: opts?.userStyle,
//           weather: opts?.weather, // ✅ only weather, no useWeather
//           weights: opts?.weights ?? DEFAULT_CONTEXT_WEIGHTS,
//           useWeather: opts?.useWeather, // 👈 FORWARD IT
//         },
//       );

//       // 4) Build LLM prompt from catalog (extracted)
//       const catalogLines = reranked
//         .map((c) => `${c.index}. ${c.label}`)
//         .join('\n');
//       const prompt = buildOutfitPrompt(catalogLines, query);

//       // 5) Call Vertex / LLM and parse JSON robustly
//       const raw = await this.vertex.generateReasonedOutfit(prompt);
//       const text =
//         (raw?.candidates?.[0]?.content?.parts?.[0]?.text as string) ??
//         (typeof raw === 'string' ? raw : '');
//       const parsed = extractStrictJson(text);

//       // Map from index → catalog item (use reranked indices)
//       const byIndex = new Map<number, (typeof reranked)[number]>();
//       reranked.forEach((c) => byIndex.set(c.index, c));
//       catalog.forEach((c) => byIndex.set(c.index, c)); // backup

//       // Convert model "items": [indices] into concrete CatalogItem objects
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

//       // 6) Finalize each outfit (slots, exclusions, fallback picks) (extracted)
//       outfits = outfits.map((o) => finalizeOutfitSlots(o, reranked, query));

//       // Optional: post-LLM hard constraints (kept callable; no change to behavior unless used)
//       outfits = enforceConstraintsOnOutfits(
//         outfits as any,
//         reranked as any,
//         query,
//       ) as any;

//       return { outfits };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }

//   /**
//    * Defensive extractor for various LLM wrapper shapes.
//    * (Not currently used in the flow above; kept as utility.)
//    */
//   private extractModelText(output: any): string {
//     if (typeof output === 'string') return output;

//     // Gemini JSON response shape
//     const parts = output?.candidates?.[0]?.content?.parts;
//     if (Array.isArray(parts)) {
//       const joined = parts.map((p: any) => p?.text ?? '').join('');
//       if (joined) return joined;
//     }

//     // Some wrappers return { text: "..." }
//     if (typeof output?.text === 'string') return output.text;

//     // Last resort: stringify
//     return JSON.stringify(output ?? '');
//   }

//   /**
//    * Strip code-fences and parse JSON. If parsing fails, try to find the largest
//    * {...} block in the text. (Not used by generateOutfits; utility kept handy.)
//    */
//   private parseModelJson(s: string): any {
//     const cleaned = s
//       .replace(/^\s*```(?:json)?\s*/i, '')
//       .replace(/\s*```\s*$/i, '')
//       .trim();

//     try {
//       return JSON.parse(cleaned);
//     } catch {
//       const m = cleaned.match(/\{[\s\S]*\}/);
//       if (m) {
//         return JSON.parse(m[0]);
//       }
//       throw new Error('Model did not return valid JSON.');
//     }
//   }

//   // More text-normalizers (to map free-form strings to strict unions/enums)
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
//     // Normalize to DB enum labels (UPPERCASE)
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // DTO-facing normalizers for API input → DB-safe unions
//   // ─────────────────────────────────────────────────────────────────────────────

//   /**
//    * Normalize main_category into the strict union the DTO expects.
//    * Handles synonyms/singular/plurals and falls back to 'Tops' if unknown.
//    */
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

//   /**
//    * Smarter resolution: adjust main category from sub/layering hints (e.g. SHELL → Outerwear).
//    */
//   private resolveMainCategory(
//     rawMain?: string | null,
//     sub?: string | null,
//     layering?: string | null,
//   ): CreateWardrobeItemDto['main_category'] {
//     const normalized = this.normalizeMainCategory(rawMain);
//     const s = (sub ?? '').toLowerCase();
//     const lay = (layering ?? '').toUpperCase();

//     // Obvious outers
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

//     // Obvious shoes
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

//     // Obvious accessories
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

//     // Shell layer isn't a "Top"
//     if (normalized === 'Tops' && lay === 'SHELL') return 'Outerwear';

//     return normalized;
//   }

//   // Human-friendly normalizations for DTO text fields
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
//    * Pinecone IDs are stored as `${itemId}:${modality}` where modality is `text` or `image`.
//    * This helps us keep two vectors per item.
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

//   /**
//    * Pinecone metadata must be primitives or string[].
//    * - Objects are JSON.stringified.
//    * - Arrays are coerced to string[].
//    * - A raw "metadata" field is renamed to "meta_json" to avoid conflicts.
//    */
//   private sanitizeMeta(
//     raw: Record<string, any>,
//   ): Record<string, string | number | boolean | string[]> {
//     const out: Record<string, string | number | boolean | string[]> = {};

//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;

//       if (k === 'metadata') {
//         // Keep as JSON string under a different key to avoid name collision
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
//         default:
//           break;
//       }
//     }

//     return out;
//   }

//   /**
//    * Map DB snake_case row to camelCase the mobile app prefers.
//    */
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

//   /**
//    * Compose a CreateWardrobeItemDto by merging user-supplied base values with an
//    * AI draft object. All enum-ish fields are normalized to strict DTO unions.
//    */
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

//     // Prioritize main category resolution from sub/layering hints
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

//     // Ensure tags becomes string[]
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
//       // required
//       user_id: String(base.user_id),
//       image_url: String(base.image_url),
//       name,
//       main_category,

//       // storage
//       gsutil_uri: pick('gsutil_uri'),
//       object_key: pick('object_key'),

//       // core
//       subcategory: pick('subcategory'),
//       color: pick('color'),
//       material: pick('material'),
//       fit: pick('fit'),
//       size: pick('size'),
//       brand: pick('brand'),
//       tags,

//       // styling / occasion
//       style_descriptors: draft?.style_descriptors,
//       style_archetypes: draft?.style_archetypes,
//       anchor_role: draft?.anchor_role,
//       occasion_tags: draft?.occasion_tags,
//       dress_code: draft?.dress_code,
//       formality_score: draft?.formality_score,

//       // color/palette
//       dominant_hex: draft?.dominant_hex,
//       palette_hex: draft?.palette_hex,
//       color_family: draft?.color_family,
//       color_temp: draft?.color_temp,
//       contrast_profile: draft?.contrast_profile,

//       // pattern
//       pattern: draft?.pattern,
//       pattern_scale,

//       // climate / season
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

//       // construction & sizing
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

//       // silhouette
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

//       // care
//       care_symbols: draft?.care_symbols,
//       wash_temp_c: draft?.wash_temp_c,
//       dry_clean: draft?.dry_clean,
//       iron_ok: draft?.iron_ok,

//       // commerce
//       retailer: draft?.retailer,
//       purchase_date: draft?.purchase_date,
//       purchase_price: draft?.purchase_price,
//       country_of_origin: draft?.country_of_origin,
//       condition: draft?.condition,
//       defects_notes: draft?.defects_notes,

//       // AI narrative
//       ai_title: draft?.ai_title,
//       ai_description: draft?.ai_description,
//       ai_key_attributes: draft?.ai_key_attributes,
//       ai_confidence: parseNum(draft?.ai_confidence),

//       // passthrough (will be JSON stringified in createItem)
//       metadata: (base as any).metadata,
//       constraints: (base as any).constraints,
//     };
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // CREATE ITEM (dynamic INSERT + embeddings + Pinecone upsert)
//   // ─────────────────────────────────────────────────────────────────────────────

//   /**
//    * Insert a new wardrobe item with only the provided fields, normalize enum-ish
//    * values, and then index it into Pinecone (text+image vectors + metadata).
//    */
//   async createItem(dto: CreateWardrobeItemDto) {
//     const cols: string[] = [];
//     const vals: any[] = [];
//     const params: string[] = [];
//     let i = 1;

//     // Helper to append a column/value pair. If kind='json', we stringify.
//     const add = (col: string, val: any, kind: 'json' | 'raw' = 'raw') => {
//       if (val === undefined) return; // allow null to pass through
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
//     add('metadata', dto.metadata, 'json'); // ensure JSON object, not pre-stringified
//     add('width', dto.width);
//     add('height', dto.height);
//     add('tags', dto.tags);

//     // Visuals & styling
//     add('style_descriptors', dto.style_descriptors);
//     add('style_archetypes', dto.style_archetypes);
//     add('anchor_role', this.normalizeAnchorRole(dto.anchor_role));

//     // pattern (ENUM): only insert if whitelisted
//     const normalizedPattern = this.normalizePattern(dto.pattern);
//     if (
//       normalizedPattern &&
//       WardrobeService.PATTERN_ENUM_WHITELIST.includes(normalizedPattern)
//     ) {
//       add('pattern', normalizedPattern);
//     }
//     // pattern_scale (free text normalized to Micro/Medium/Bold for UI)
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

//     // Seasonality & climate (ENUMS): only insert if valid
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

//     // Construction & sizing (JSON fields are stringified)
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

//     // System (free-form JSON-ish passthrough)
//     add('constraints', dto.constraints);

//     // Execute dynamic INSERT
//     const sql = `
//       INSERT INTO wardrobe_items (${cols.join(', ')})
//       VALUES (${params.join(', ')})
//       RETURNING *;
//     `;
//     const result = await pool.query(sql, vals);
//     const item = result.rows[0];

//     // Build embeddings for Pinecone
//     let imageVec: number[] | undefined;
//     // Use DB row fallback so we still embed image if dto.gsutil_uri was omitted
//     const gcs = dto.gsutil_uri ?? item.gsutil_uri;
//     if (gcs) imageVec = await this.vertex.embedImage(gcs);

//     // Rich text embedding from many descriptive fields
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

//         // color theory / dress code signals
//         item.color_temp,
//         item.contrast_profile,
//         String(item.formality_score ?? ''),
//         item.seasonality,
//         item.layering,
//         item.pattern,
//         item.pattern_scale,

//         // silhouette hooks
//         item.neckline,
//         item.collar_type,
//         item.sleeve_length,
//         item.rise,
//         item.leg,
//         String(item.inseam_in ?? ''),
//         item.length_class,
//         item.shoe_style,
//         item.sole,

//         // preferences
//         Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.dress_code,
//         item.anchor_role,

//         // palette
//         item.dominant_hex,
//         Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
//       ]
//         .filter(Boolean)
//         .join(' '),
//     );

//     // Flatten metadata for Pinecone and upsert both text+image records
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // READ ITEMS (used by mobile app)
//   // ─────────────────────────────────────────────────────────────────────────────

//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows.map((r) => this.toCamel(r));
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UPDATE ITEM (dynamic UPDATE + selective re-embedding + Pinecone refresh)
//   // ─────────────────────────────────────────────────────────────────────────────

//   /**
//    * Update only provided fields, normalize enums, and decide whether to:
//    * - re-embed text (if text-ish fields changed),
//    * - re-embed image (if gsutil_uri/image_url changed),
//    * - or just refresh metadata in Pinecone.
//    */
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     // Gate/normalize enum-like fields before UPDATE
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
//     if (dto.anchor_role !== undefined) {
//       (dto as any).anchor_role =
//         this.normalizeAnchorRole(dto.anchor_role) ?? null;
//     }
//     if (dto.dress_code !== undefined) {
//       (dto as any).dress_code = this.normalizeDressCode(dto.dress_code) ?? null;
//     }
//     if (dto.color_temp !== undefined) {
//       (dto as any).color_temp = this.normalizeColorTemp(dto.color_temp) ?? null;
//     }
//     if (dto.contrast_profile !== undefined) {
//       (dto as any).contrast_profile =
//         this.normalizeContrast(dto.contrast_profile) ?? null;
//     }
//     if (dto.pattern_scale !== undefined) {
//       (dto as any).pattern_scale =
//         this.normalizePatternScaleDto(dto.pattern_scale) ?? null;
//     }

//     // Build dynamic SET list, stringifying objects/arrays as needed
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

//     // Decide if we need to re-embed and/or refresh metadata
//     let textVec: number[] | undefined;
//     let imageVec: number[] | undefined;

//     // If any of these fields changed, rebuild text embedding
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

//         // stronger embed with color/dress signals
//         item.color_temp,
//         item.contrast_profile,
//         String(item.formality_score ?? ''),
//         item.seasonality,
//         item.layering,
//         item.pattern,
//         item.pattern_scale,

//         // silhouette
//         item.neckline,
//         item.collar_type,
//         item.sleeve_length,
//         item.rise,
//         item.leg,
//         String(item.inseam_in ?? ''),
//         item.length_class,
//         item.shoe_style,
//         item.sole,

//         // preferences
//         Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.dress_code,
//         item.anchor_role,

//         // palette
//         item.dominant_hex,
//         Array.isArray(item.palette_hex) ? item.palette_hex.join(' ') : '',
//       ]
//         .filter(Boolean)
//         .join(' ');
//       textVec = await this.vertex.embedText(textInput);
//     }

//     // Re-embed image only if gsutil_uri/image_url changed (use DB fallback)
//     const imageChanged = 'gsutil_uri' in dto || 'image_url' in dto;
//     const gcs = (dto as any).gsutil_uri ?? item.gsutil_uri;
//     if (imageChanged && gcs) {
//       imageVec = await this.vertex.embedImage(gcs);
//     }

//     // Always push fresh metadata to Pinecone (with/without vectors)
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
//       // Metadata-only refresh (both :text and :image records)
//       await upsertItemNs({
//         userId: item.user_id,
//         itemId: item.id,
//         meta,
//       });
//     }

//     return {
//       message: 'Wardrobe item updated successfully',
//       item: this.toCamel(item),
//     };
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // DELETE ITEM (DB + Pinecone + GCS best-effort cleanup)
//   // ─────────────────────────────────────────────────────────────────────────────

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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // VECTOR SEARCH UTILITIES (used by dev tools / debugging endpoints)
//   // ─────────────────────────────────────────────────────────────────────────────

//   /** Return nearest items to a given query vector for this user (raw). */
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

//   /** Text-only vector search */
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

//   /** Image-only vector search */
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

//   /** Hybrid (text + image) search, weighted inside Pinecone (via hybridQueryUserNs). */
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Utility: Build a compact, human-readable label for a catalog line.
//   // Shows enough attributes to help the model and humans pick items by index.
//   // ─────────────────────────────────────────────────────────────────────────────

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

//     const head = primary || name || 'Item';
//     return extras ? `${head} — ${extras}` : head;
//   }
// }
