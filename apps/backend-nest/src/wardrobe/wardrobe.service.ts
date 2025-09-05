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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const storage = new Storage();

@Injectable()
export class WardrobeService {
  constructor(private readonly vertex: VertexService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Enum whitelists (insert only if value is included)
  // Leave empty to force skipping until you confirm DB enum labels.
  // NOTE: pattern_type in your DB rejected "solid", so do NOT include it here.
  // ─────────────────────────────────────────────────────────────────────────────
  private static readonly PATTERN_ENUM_WHITELIST: string[] = [
    // 'check','striped','herringbone','windowpane','floral','dot','camo','abstract','other'
  ];
  private static readonly SEASONALITY_ENUM_WHITELIST: string[] = [
    // 'ss','fw','all_season'
  ];
  private static readonly LAYERING_ENUM_WHITELIST: string[] = [
    // 'base','mid','shell','accent'
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // Normalizers for enum-ish columns
  // ─────────────────────────────────────────────────────────────────────────────
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
      stripe: 'striped',
      striped: 'striped',
      stripes: 'striped',
      plaid: 'check',
      check: 'check',
      checked: 'check',
      herringbone: 'herringbone',
      windowpane: 'windowpane',
      floral: 'floral',
      flower: 'floral',
      dot: 'dot',
      dots: 'dot',
      polka: 'dot',
      polka_dot: 'dot',
      camo: 'camo',
      camouflage: 'camo',
      abstract: 'abstract',
      print: 'abstract',
      printed: 'abstract',
      graphic: 'abstract',
      other: 'other',
      // deliberately no 'solid'
    };
    return map[s] ?? undefined;
  }

  // optional helpers for other text-enums (DB columns are TEXT, but normalize anyway)
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
    // Normalize to potential DB keys; we still only insert if whitelisted.
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      ss: 'ss',
      'spring/summer': 'ss',
      spring: 'ss',
      summer: 'ss',
      fw: 'fw',
      'fall/winter': 'fw',
      fall: 'fw',
      autumn: 'fw',
      winter: 'fw',
      allseason: 'all_season',
      'all season': 'all_season',
      'all-season': 'all_season',
      all_season: 'all_season',
      all: 'all_season',
    };
    return map[s];
  }

  private normalizeLayering(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
      base: 'base',
      baselayer: 'base',
      'base layer': 'base',
      mid: 'mid',
      midlayer: 'mid',
      'mid layer': 'mid',
      shell: 'shell',
      outer: 'shell',
      outerwear: 'shell',
      jacket: 'shell',
      accent: 'accent',
      accessory: 'accent',
      acc: 'accent',
    };
    return map[s];
  }

  private normalizePatternScale(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    if (['subtle', 'small', 'micro', '0', '-1'].includes(s)) return 'subtle';
    if (['medium', 'mid', '1'].includes(s)) return 'medium';
    if (['bold', 'large', 'big', '2'].includes(s)) return 'bold';
    return undefined;
  }

  private normalizeDressCode(val?: string | null) {
    const s = this.normLower(val);
    if (!s) return undefined;
    const map: Record<string, string> = {
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
    return map[s] ?? undefined;
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
    const meta: Record<string, string | number | boolean | string[]> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        meta[k] = v.map(String);
      } else if (typeof v === 'object') {
        meta[k] = JSON.stringify(v);
      } else {
        meta[k] = String(v);
      }
    }
    return meta;
  }

  // map DB snake_case → frontend camelCase
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

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE ITEM (dynamic & normalized)
  // ─────────────────────────────────────────────────────────────────────────────
  async createItem(dto: CreateWardrobeItemDto) {
    const cols: string[] = [];
    const vals: any[] = [];
    const params: string[] = [];
    let i = 1;

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
    add('metadata', dto.metadata, 'json');
    add('width', dto.width);
    add('height', dto.height);
    add('tags', dto.tags);

    // Visuals & styling
    add('style_descriptors', dto.style_descriptors);
    add('style_archetypes', dto.style_archetypes);
    add('anchor_role', this.normalizeAnchorRole(dto.anchor_role));

    // pattern (ENUM): only insert if it matches whitelist
    const normalizedPattern = this.normalizePattern(dto.pattern);
    if (
      normalizedPattern &&
      WardrobeService.PATTERN_ENUM_WHITELIST.includes(normalizedPattern)
    ) {
      add('pattern', normalizedPattern);
    }
    // pattern_scale (TEXT normalized)
    if (dto.pattern_scale !== undefined) {
      add(
        'pattern_scale',
        this.normalizePatternScale(dto.pattern_scale) ?? null,
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

    // Seasonality & climate (ENUMS): only insert if whitelisted
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
    if (dto.gsutil_uri) imageVec = await this.vertex.embedImage(dto.gsutil_uri);
    const textVec = await this.vertex.embedText(
      `${dto.name || ''} ${dto.main_category || ''} ${dto.subcategory || ''} ${dto.color || ''} ${dto.material || ''} ${dto.fit || ''} ${dto.size || ''} ${dto.brand || ''}`,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // READ ITEMS
  // ─────────────────────────────────────────────────────────────────────────────
  async getItemsByUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows.map((r) => this.toCamel(r));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE ITEM
  // ─────────────────────────────────────────────────────────────────────────────
  async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    // normalize + gate enum-ish columns
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
        this.normalizePatternScale(dto.pattern_scale) ?? null;
    }

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
      'material',
      'fit',
      'size',
      'brand',
    ];
    const textChanged = textFields.some((f) => f in dto);
    if (textChanged) {
      const textInput = `${item.name || ''} ${item.main_category || ''} ${item.subcategory || ''} ${item.color || ''} ${item.material || ''} ${item.fit || ''} ${item.size || ''} ${item.brand || ''}`;
      textVec = await this.vertex.embedText(textInput);
    }
    if ((dto as any).gsutil_uri) {
      imageVec = await this.vertex.embedImage(item.gsutil_uri);
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
    }

    return {
      message: 'Wardrobe item updated successfully',
      item: this.toCamel(item),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE ITEM
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
  // VECTOR SEARCH + OUTFITS
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // VECTOR SEARCH + OUTFITS
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

    const extras = [
      brand && `${brand}`,
      fit && `${fit} fit`,
      size && `(${size})`,
      dress && `${dress}`,
      role && `${role} role`,
      patternish && `pattern:${patternish}`,
    ]
      .filter(Boolean)
      .join(', ');

    // Prefer a descriptive line; include name if it carries signal
    const head = primary || name || 'Item';
    return extras ? `${head} — ${extras}` : head;
  }

  async generateOutfits(userId: string, query: string, topK: number) {
    try {
      const queryVec = await this.vertex.embedText(query);
      const matches = await queryUserNs({
        userId,
        vector: queryVec,
        topK,
        includeMetadata: true,
      });

      // Use rich item descriptions instead of just names
      const wardrobeItems = matches
        .map((m) => `- ${this.summarizeItem(m.metadata || {})}`)
        .join('\n');

      const prompt = `
      You are a world-class personal stylist.
      Wardrobe items available:
      ${wardrobeItems}

      User request: "${query}"

      Rules:
      - Use only the listed items to build 2–3 complete outfits.
      - Respect obvious signals in each item (color, category/subcategory, material, fit/size, brand).
      - If suitable, respect dress code, role (Hero/Neutral/Connector), and pattern notes when present.
      - Prefer color harmony and coherent formality; explain "why it works" in one sentence per outfit.
      - If a crucial piece is missing, include "MISSING ITEM" with a short note.

      Respond in strict JSON:
      {
        "outfits": [
          {
            "title": "string",
            "items": ["exact item strings from the list above"],
            "why": "one sentence"
          }
        ]
      }
    `;

      const response = await this.vertex.generateReasonedOutfit(prompt);
      return { outfits: response };
    } catch (err: any) {
      console.error('❌ Error in generateOutfits:', err.message, err.stack);
      throw err;
    }
  }
}

/////////////////

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

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Enum whitelists (insert only if value is included)
//   // Leave empty to force skipping until you confirm DB enum labels.
//   // NOTE: pattern_type in your DB rejected "solid", so do NOT include it here.
//   // ─────────────────────────────────────────────────────────────────────────────
//   private static readonly PATTERN_ENUM_WHITELIST: string[] = [
//     // 'check','striped','herringbone','windowpane','floral','dot','camo','abstract','other'
//   ];
//   private static readonly SEASONALITY_ENUM_WHITELIST: string[] = [
//     // 'ss','fw','all_season'
//   ];
//   private static readonly LAYERING_ENUM_WHITELIST: string[] = [
//     // 'base','mid','shell','accent'
//   ];

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Normalizers for enum-ish columns
//   // ─────────────────────────────────────────────────────────────────────────────
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
//       stripe: 'striped',
//       striped: 'striped',
//       stripes: 'striped',
//       plaid: 'check',
//       check: 'check',
//       checked: 'check',
//       herringbone: 'herringbone',
//       windowpane: 'windowpane',
//       floral: 'floral',
//       flower: 'floral',
//       dot: 'dot',
//       dots: 'dot',
//       polka: 'dot',
//       polka_dot: 'dot',
//       camo: 'camo',
//       camouflage: 'camo',
//       abstract: 'abstract',
//       print: 'abstract',
//       printed: 'abstract',
//       graphic: 'abstract',
//       other: 'other',
//       // deliberately no 'solid'
//     };
//     return map[s] ?? undefined;
//   }

//   // optional helpers for other text-enums (DB columns are TEXT, but normalize anyway)
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
//     // Normalize to potential DB keys; we still only insert if whitelisted.
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       ss: 'ss',
//       'spring/summer': 'ss',
//       spring: 'ss',
//       summer: 'ss',
//       fw: 'fw',
//       'fall/winter': 'fw',
//       fall: 'fw',
//       autumn: 'fw',
//       winter: 'fw',
//       allseason: 'all_season',
//       'all season': 'all_season',
//       'all-season': 'all_season',
//       all_season: 'all_season',
//       all: 'all_season',
//     };
//     return map[s];
//   }

//   private normalizeLayering(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
//       base: 'base',
//       baselayer: 'base',
//       'base layer': 'base',
//       mid: 'mid',
//       midlayer: 'mid',
//       'mid layer': 'mid',
//       shell: 'shell',
//       outer: 'shell',
//       outerwear: 'shell',
//       jacket: 'shell',
//       accent: 'accent',
//       accessory: 'accent',
//       acc: 'accent',
//     };
//     return map[s];
//   }

//   private normalizePatternScale(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     if (['subtle', 'small', 'micro', '0', '-1'].includes(s)) return 'subtle';
//     if (['medium', 'mid', '1'].includes(s)) return 'medium';
//     if (['bold', 'large', 'big', '2'].includes(s)) return 'bold';
//     return undefined;
//   }

//   private normalizeDressCode(val?: string | null) {
//     const s = this.normLower(val);
//     if (!s) return undefined;
//     const map: Record<string, string> = {
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
//     return map[s] ?? undefined;
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
//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }
//     return meta;
//   }

//   // map DB snake_case → frontend camelCase
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // CREATE ITEM (dynamic & normalized)
//   // ─────────────────────────────────────────────────────────────────────────────
//   async createItem(dto: CreateWardrobeItemDto) {
//     const cols: string[] = [];
//     const vals: any[] = [];
//     const params: string[] = [];
//     let i = 1;

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
//     add('metadata', dto.metadata, 'json');
//     add('width', dto.width);
//     add('height', dto.height);
//     add('tags', dto.tags);

//     // Visuals & styling
//     add('style_descriptors', dto.style_descriptors);
//     add('style_archetypes', dto.style_archetypes);
//     add('anchor_role', this.normalizeAnchorRole(dto.anchor_role));

//     // pattern (ENUM): only insert if it matches whitelist
//     const normalizedPattern = this.normalizePattern(dto.pattern);
//     if (
//       normalizedPattern &&
//       WardrobeService.PATTERN_ENUM_WHITELIST.includes(normalizedPattern)
//     ) {
//       add('pattern', normalizedPattern);
//     }
//     // pattern_scale (TEXT normalized)
//     if (dto.pattern_scale !== undefined) {
//       add(
//         'pattern_scale',
//         this.normalizePatternScale(dto.pattern_scale) ?? null,
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

//     // Seasonality & climate (ENUMS): only insert if whitelisted
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
//     if (dto.gsutil_uri) imageVec = await this.vertex.embedImage(dto.gsutil_uri);
//     const textVec = await this.vertex.embedText(
//       `${dto.name || ''} ${dto.main_category || ''} ${dto.subcategory || ''} ${dto.color || ''} ${dto.material || ''} ${dto.fit || ''} ${dto.size || ''} ${dto.brand || ''}`,
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // READ ITEMS
//   // ─────────────────────────────────────────────────────────────────────────────
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows.map((r) => this.toCamel(r));
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UPDATE ITEM
//   // ─────────────────────────────────────────────────────────────────────────────
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     // normalize + gate enum-ish columns
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
//         this.normalizePatternScale(dto.pattern_scale) ?? null;
//     }

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
//       'material',
//       'fit',
//       'size',
//       'brand',
//     ];
//     const textChanged = textFields.some((f) => f in dto);
//     if (textChanged) {
//       const textInput = `${item.name || ''} ${item.main_category || ''} ${item.subcategory || ''} ${item.color || ''} ${item.material || ''} ${item.fit || ''} ${item.size || ''} ${item.brand || ''}`;
//       textVec = await this.vertex.embedText(textInput);
//     }
//     if ((dto as any).gsutil_uri) {
//       imageVec = await this.vertex.embedImage(item.gsutil_uri);
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
//     }

//     return {
//       message: 'Wardrobe item updated successfully',
//       item: this.toCamel(item),
//     };
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // DELETE ITEM
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
//   // VECTOR SEARCH + OUTFITS
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({ userId, vector: queryVec, topK });
//       const wardrobeItems = matches
//         .map((m) => m.metadata?.name || '')
//         .join(', ');
//       const prompt = `
//         You are a world-class personal stylist.
//         Wardrobe items available: ${wardrobeItems}
//         User request: "${query}"
//         Consider: weather, occasion, style preferences.
//         Suggest 2–3 complete outfits.
//         If an item is missing, clearly mark it as "MISSING ITEM".
//         Respond in JSON.
//       `;
//       const response = await this.vertex.generateReasonedOutfit(prompt);
//       return { outfits: response };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }
// }
