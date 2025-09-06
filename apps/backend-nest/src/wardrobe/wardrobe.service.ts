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

// ─────────────────────────────────────────────────────────────────────────────
// Catalog typing + coercion helpers
// ─────────────────────────────────────────────────────────────────────────────
type CatalogItem = {
  index: number;
  id: string;
  label: string;
  image_url?: string;
  main_category?: string;
  subcategory?: string;
  color?: string;
  color_family?: string;
  shoe_style?: string;
  dress_code?: string;
  formality_score?: number;
};

@Injectable()
export class WardrobeService {
  constructor(private readonly vertex: VertexService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Enum whitelists (insert only if value is included)
  // Mirror DB enums exactly (UPPERCASE)
  // ─────────────────────────────────────────────────────────────────────────────
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

  // Treat obvious subcategories as authoritative for main_category
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Constraint parsing + rerank helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Minimal signals pulled from the natural-language query */
  private parseConstraints(q: string) {
    const s = (q || '').toLowerCase();

    const want = (w: string | RegExp) =>
      typeof w === 'string' ? s.includes(w) : w.test(s);

    const colorWanted =
      (want('brown') && 'Brown') ||
      (want('navy') && 'Navy') ||
      (want('blue') && 'Blue') ||
      (want('black') && 'Black') ||
      undefined;

    const dressWanted =
      (want(/business\s*casual/) && 'BusinessCasual') ||
      (want(/smart\s*casual/) && 'SmartCasual') ||
      (want(/\bcasual\b/) && 'Casual') ||
      undefined;

    return {
      wantsLoafers: want('loafer'),
      wantsSneakers: want('sneaker'),
      wantsBoots: want('boot'),
      wantsBlazer: want('blazer') || want('sport coat') || want('sportcoat'),

      colorWanted, // e.g., "Brown", "Blue"
      dressWanted, // e.g., "BusinessCasual"
      wantsBrown: colorWanted === 'Brown',
    };
  }

  private text(val: any) {
    return (val ?? '').toString().trim();
  }

  /** Simple numeric score; higher sorts earlier */
  // keep your CatalogItem type from earlier reply

  private scoreItemForConstraints(
    item: CatalogItem,
    c: ReturnType<WardrobeService['parseConstraints']>,
    baseBias: number,
  ) {
    let score = baseBias;

    const cat = this.text(item.main_category);
    const sub = this.text(item.subcategory);
    const shoe = this.text(item.shoe_style);
    const dress = this.text(item.dress_code);
    const color = (
      this.text(item.color) || this.text(item.color_family)
    ).toLowerCase();
    const f = Number(item.formality_score ?? NaN);

    // Shoes intent
    if (c.wantsLoafers) {
      if (sub === 'Loafers' || shoe === 'Loafer') score += 50;
      if (c.wantsBrown && color.includes('brown')) score += 10;
      if (cat === 'Shoes' && !(sub === 'Loafers' || shoe === 'Loafer'))
        score -= 15;
    }
    if (c.wantsSneakers && (sub === 'Sneakers' || shoe === 'Sneaker'))
      score += 35;
    if (c.wantsBoots && (sub === 'Boots' || shoe === 'Boot')) score += 35;

    // Blazer intent (prefer blazer/sport coat; penalize other outerwear like trench)
    if (c.wantsBlazer) {
      if (sub === 'Blazer' || sub === 'Sport Coat') {
        score += 40;
        if (c.colorWanted === 'Blue' && color.includes('blue')) score += 12;
      } else if (cat === 'Outerwear') {
        score -= 12; // trench/coat downrank when blazer is asked
      }
    }

    // Color preference (general)
    if (c.colorWanted && color.includes(c.colorWanted.toLowerCase()))
      score += 10;

    // Dress-code fit
    if (c.dressWanted) {
      if (dress === c.dressWanted) score += 10;
      if (c.dressWanted === 'BusinessCasual' && sub === 'Sneakers') score -= 8;
      if (c.dressWanted === 'BusinessCasual' && sub === 'Jeans') score -= 6;
    }

    // Formality sweet spot for BusinessCasual ~7
    if (c.dressWanted === 'BusinessCasual' && Number.isFinite(f)) {
      const dist = Math.abs(f - 7);
      score += Math.max(0, 10 - 3 * dist);
    }

    return score;
  }

  private finalizeOutfitSlots(
    outfit: {
      title: string;
      items: CatalogItem[];
      why: string;
      missing?: string;
    },
    catalog: CatalogItem[],
    q: string,
  ) {
    const c = this.parseConstraints(q);
    const items = [...(outfit.items || [])];

    const appendMissing = (msg: string) => {
      outfit.missing = outfit.missing ? outfit.missing : msg;
    };

    const isLoafer = (x: CatalogItem) =>
      (x.main_category === 'Shoes' ||
        (x.subcategory ?? '').toLowerCase().includes('loafer')) &&
      ((x.subcategory ?? '') === 'Loafers' ||
        (x.shoe_style ?? '') === 'Loafer');

    const isFootwear = (x: CatalogItem) => {
      const sub = (x.subcategory ?? '').toLowerCase();
      return (
        x.main_category === 'Shoes' ||
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
        ].some((k) => sub.includes(k))
      );
    };

    const isBrownish = (x: CatalogItem) => {
      const a = (x.color ?? '').toLowerCase();
      const b = (x.color_family ?? '').toLowerCase();
      return (
        a.includes('brown') ||
        b === 'brown' ||
        a.includes('tan') ||
        a.includes('cognac')
      );
    };

    // Keep at most one outerwear; prefer blazer/sport coat when asked
    const outers = items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => it.main_category === 'Outerwear');
    if (outers.length > 1) {
      outers.sort((a, b) => {
        const ap =
          a.it.subcategory === 'Blazer' || a.it.subcategory === 'Sport Coat'
            ? 0
            : 1;
        const bp =
          b.it.subcategory === 'Blazer' || b.it.subcategory === 'Sport Coat'
            ? 0
            : 1;
        return ap - bp || (a.it.index ?? 999) - (b.it.index ?? 999);
      });
      const keep = outers[0].i;
      for (let k = outers.length - 1; k >= 0; k--) {
        if (outers[k].i !== keep) items.splice(outers[k].i, 1);
      }
    }

    // Generic prune helper
    const pruneToOne = (
      pred: (x: CatalogItem) => boolean,
      prefer?: (A: CatalogItem, B: CatalogItem) => number,
    ) => {
      const matches = items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => pred(it));
      if (matches.length <= 1) return;
      matches.sort((a, b) =>
        prefer ? prefer(a.it, b.it) : (a.it.index ?? 999) - (b.it.index ?? 999),
      );
      const keep = matches[0].i;
      for (let k = matches.length - 1; k >= 0; k--) {
        if (matches[k].i !== keep) items.splice(matches[k].i, 1);
      }
    };

    // Prefer non-jeans for BusinessCasual bottoms
    const preferBottoms = (A: CatalogItem, B: CatalogItem) => {
      const aJeans = (A.subcategory ?? '').toLowerCase() === 'jeans';
      const bJeans = (B.subcategory ?? '').toLowerCase() === 'jeans';
      if (c.dressWanted === 'BusinessCasual') {
        if (aJeans && !bJeans) return 1;
        if (bJeans && !aJeans) return -1;
      }
      return (A.index ?? 999) - (B.index ?? 999);
    };

    // Shoes preference: loafers first if requested; then brown if requested
    const preferShoes = (A: CatalogItem, B: CatalogItem) => {
      const aLoafer = isLoafer(A),
        bLoafer = isLoafer(B);
      if (c.wantsLoafers && aLoafer !== bLoafer) return aLoafer ? -1 : 1;

      const aBrown = isBrownish(A),
        bBrown = isBrownish(B);
      if (c.wantsBrown && aBrown !== bBrown) return aBrown ? -1 : 1;

      return (A.index ?? 999) - (B.index ?? 999);
    };

    // Prune to one Top, one Bottom, one pair of Shoes (recognizing mis-typed footwear)
    pruneToOne((x) => x.main_category === 'Tops');
    pruneToOne((x) => x.main_category === 'Bottoms', preferBottoms);
    pruneToOne((x) => isFootwear(x), preferShoes);

    // Ensure required slots exist
    const hasTop = items.some((x) => x.main_category === 'Tops');
    const hasBottom = items.some((x) => x.main_category === 'Bottoms');
    const hasFootwear = items.some((x) => isFootwear(x));

    const pickBest = (
      pred: (x: CatalogItem) => boolean,
      prefer?: (A: CatalogItem, B: CatalogItem) => number,
    ) => {
      const pool = catalog.filter(pred);
      if (!pool.length) return undefined;
      if (!prefer) return pool[0];
      return pool.slice().sort(prefer)[0];
    };

    if (!hasTop) {
      const top = pickBest((x) => x.main_category === 'Tops');
      if (top) items.push(top);
      else appendMissing('A shirt');
    }

    if (!hasBottom) {
      const bottom = pickBest(
        (x) =>
          x.main_category === 'Bottoms' &&
          (x.subcategory ?? '').toLowerCase() !== 'shorts',
        preferBottoms,
      );
      if (bottom) items.push(bottom);
      else appendMissing('Dress trousers');
    }

    // Enforce loafers + brown if requested; otherwise ensure some shoes
    const currentlyHasLoafer = items.some(isLoafer);
    if (c.wantsLoafers) {
      if (!currentlyHasLoafer) {
        const loafer =
          (c.wantsBrown && pickBest((x) => isLoafer(x) && isBrownish(x))) ||
          pickBest(isLoafer);
        if (loafer) {
          // replace any footwear or append
          const idx = items.findIndex(isFootwear);
          if (idx >= 0) items[idx] = loafer;
          else items.push(loafer);
          if (c.wantsBrown && !isBrownish(loafer))
            appendMissing('Brown loafers');
        } else {
          // no loafers at all → prefer brown shoes if available
          const brownShoe = pickBest(
            (x) => isFootwear(x) && isBrownish(x),
            preferShoes,
          );
          const anyShoe = brownShoe ?? pickBest(isFootwear, preferShoes);
          if (anyShoe) {
            const idx = items.findIndex(isFootwear);
            if (idx >= 0) items[idx] = anyShoe;
            else items.push(anyShoe);
          }
          appendMissing(c.wantsBrown ? 'Brown loafers' : 'Loafers');
        }
      } else if (c.wantsBrown) {
        // Swap to brown loafers if current loafer isn’t brown
        const idx = items.findIndex(isLoafer);
        if (idx >= 0 && !isBrownish(items[idx])) {
          const brownLoafer = pickBest((x) => isLoafer(x) && isBrownish(x));
          if (brownLoafer) items[idx] = brownLoafer;
          else appendMissing('Brown loafers');
        }
      }
    } else if (!hasFootwear) {
      const shoe = pickBest(isFootwear, preferShoes);
      if (shoe) items.push(shoe);
      else appendMissing('Dress shoes');
    }

    return { ...outfit, items };
  }

  private rerankCatalog(catalog: CatalogItem[], q: string): CatalogItem[] {
    const c = this.parseConstraints(q);

    // Keep Pinecone order as a tiny bias
    const scored = catalog.map((item, i) => ({
      item,
      score: this.scoreItemForConstraints(item, c, (catalog.length - i) * 0.01),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Re-index to match the new order for the LLM prompt
    return scored.map((s, i) => ({ ...s.item, index: i + 1 }));
  }

  /** Enforce specific constraints post-LLM (e.g., must be loafers if asked) */
  private enforceConstraintsOnOutfits(
    outfits: Array<{
      title: string;
      items: any[];
      why: string;
      missing?: string;
    }>,
    catalog: Array<any>,
    q: string,
  ) {
    const c = this.parseConstraints(q);
    if (!c.wantsLoafers) return outfits;

    const bestLoafer = catalog.find(
      (x) =>
        x.main_category === 'Shoes' &&
        (x.subcategory === 'Loafers' || x.shoe_style === 'Loafer'),
    );

    return outfits.map((o) => {
      const hasLoafer = (o.items || []).some(
        (x: any) =>
          x?.main_category === 'Shoes' &&
          (x?.subcategory === 'Loafers' || x?.shoe_style === 'Loafer'),
      );

      if (hasLoafer) return o;

      if (bestLoafer) {
        // Replace any non-loafer shoes, otherwise append loafers
        const idx = (o.items || []).findIndex(
          (x: any) => x?.main_category === 'Shoes',
        );
        if (idx >= 0) {
          const newItems = [...o.items];
          newItems[idx] = bestLoafer;
          return { ...o, items: newItems };
        }
        return { ...o, items: [...(o.items || []), bestLoafer] };
      }

      // No loafers exist → declare missing
      const missingMsg = 'Brown loafers';
      return {
        ...o,
        missing: o.missing ? o.missing : missingMsg,
      };
    });
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

  // Inside WardrobeService

  private extractStrictJson(text: string): any {
    // Strip code fences and grab the first {...} block
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON object found in model response');
    }
    const jsonStr = text.slice(start, end + 1);
    return JSON.parse(jsonStr);
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
      // Build a stable catalog we can map back from indices → items
      const catalog: CatalogItem[] = matches.map((m, i) => {
        const { id } = this.normalizePineconeId(m.id as string);
        const meta: any = m.metadata || {};

        // ⬇️ NEW: coerce main_category from subcategory
        const sub_raw = this.asStr(meta.subcategory ?? meta.subCategory);
        const main_raw = this.asStr(meta.main_category ?? meta.mainCategory);
        const main_fix = this.coerceMainCategoryFromSub(main_raw, sub_raw);

        return {
          index: i + 1,
          id,
          label: this.summarizeItem(meta),

          image_url: this.asStr(meta.image_url ?? meta.imageUrl),
          main_category: main_fix, // ⬅️ use coerced value
          subcategory: sub_raw,
          color: this.asStr(meta.color ?? meta.color_family),
          color_family: this.asStr(meta.color_family),
          shoe_style: this.asStr(meta.shoe_style),
          dress_code: this.asStr(meta.dress_code ?? meta.dressCode),

          formality_score: this.asNum(meta.formality_score),
        };
      });

      // Rerank catalog using query-aware constraints
      const reranked = this.rerankCatalog(catalog, query);

      // Build lines for the prompt based on reranked order
      const catalogLines = reranked
        .map((c) => `${c.index}. ${c.label}`)
        .join('\n');
      const constraints = this.parseConstraints(query);
      const constraintsLine = JSON.stringify(constraints);

      const prompt = `
        You are a world-class personal stylist.

        Catalog (use ONLY these items by index as provided):
        ${catalogLines}

        User request: "${query}"
        Parsed constraints (for your guidance): ${constraintsLine}

        Rules (must follow):
        - Build 2–3 complete outfits ONLY from the catalog by numeric index.
        - HONOR explicit constraints in the request:
          • If the user mentions "loafers", at least one outfit must use a catalog item with subcategory "Loafers" or shoe_style "Loafer"; if none exist, note it in "missing".
          • Prefer dress_code ≈ the user's intent (e.g., BusinessCasual for “business casual”) and formality_score around 6–8 for BusinessCasual.
          • Prefer color matches when the user calls them out (e.g., brown loafers when “brown loafers” is requested).
        - Keep coherent slots (normally: 1 shoes, 1 bottom, 1 shirt; outerwear optional; accessories optional).
        - The "items" array MUST be numeric indices from the catalog (no free text).
        - If a crucial piece is unavailable, set "missing" to a short note.

        Respond in STRICT JSON only (no markdown, no code fences):
        {
          "outfits": [
            {
              "title": "string",
              "items": [1,2,3],
              "why": "one sentence",
              "missing": "optional short note"
            }
          ]
          }
`.trim();

      // Call your Vertex helper (returns LLM raw text)
      const raw = await this.vertex.generateReasonedOutfit(prompt);

      // Handle both your earlier "candidates[0].content.parts[0].text" shape and direct text
      const text =
        (raw?.candidates?.[0]?.content?.parts?.[0]?.text as string) ??
        (typeof raw === 'string' ? raw : '');

      const parsed = this.extractStrictJson(text);

      // We'll map indices → items using the reranked list
      const byIndex = new Map<number, (typeof reranked)[number]>();
      reranked.forEach((c) => byIndex.set(c.index, c));
      catalog.forEach((c) => byIndex.set(c.index, c));

      // after building `outfits` from parsed JSON:
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

      // ✅ clamp/clean each outfit with your finalizeOutfitSlots
      outfits = outfits.map((o) =>
        this.finalizeOutfitSlots(o, reranked, query),
      );

      return { outfits };
    } catch (err: any) {
      console.error('❌ Error in generateOutfits:', err.message, err.stack);
      throw err;
    }
  }

  /** Handles either a plain string or Gemini-like { candidates: [{ content: { parts: [{ text }] }}]} */
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

    // Last resort: stringify (we'll still try to parse JSON from it)
    return JSON.stringify(output ?? '');
  }

  /** Strips ```json fences if present and parses JSON; also tries to grab the largest JSON object if mixed text sneaks in */
  private parseModelJson(s: string): any {
    const cleaned = s
      // strip opening/closing code fences (``` or ```json)
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // Fallback: try to find a JSON object substring
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        return JSON.parse(m[0]);
      }
      throw new Error('Model did not return valid JSON.');
    }
  }

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

  // DTO-facing normalizers (typed unions)
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

    // Force OUTERWEAR when sub clearly implies it
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

    // ✅ NEW: force SHOES when sub implies footwear
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

    // ✅ NEW: force ACCESSORIES when sub implies accessory
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

    // Shell layers are not "Tops"
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

  // Replace your current sanitizeMeta with this version
  private sanitizeMeta(
    raw: Record<string, any>,
  ): Record<string, string | number | boolean | string[]> {
    const out: Record<string, string | number | boolean | string[]> = {};

    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;

      // Avoid Pinecone confusion with a field literally named "metadata"
      // Either drop it, or keep it but rename & stringify. Pick ONE:
      if (k === 'metadata') {
        // OPTION A (safer): drop it entirely
        // continue;

        // OPTION B: keep it as a JSON string under a new key
        out['meta_json'] = typeof v === 'string' ? v : JSON.stringify(v);
        continue;
      }

      // Pinecone only allows string[] (not number[]/object[])
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
          // Any remaining objects must be stringified
          out[k] = JSON.stringify(v);
          break;
        default:
          // skip symbols, functions, etc.
          break;
      }
    }

    return out;
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

    // Normalize to exact DTO unions
    const rawMain =
      (base as any).main_category ??
      (draft?.main_category as string | undefined) ??
      (draft?.category as string | undefined);

    const main_category: CreateWardrobeItemDto['main_category'] =
      this.resolveMainCategory(rawMain, rawSub, layeringRaw);

    // later, when you set `layering` (typed union), use layeringRaw:
    const layering = this.normalizeLayeringDto(layeringRaw);

    const pattern_scale = this.normalizePatternScaleDto(
      pick<string>('pattern_scale') ?? draft?.pattern_scale,
    );

    const seasonality = this.normalizeSeasonalityDto(
      pick<string>('seasonality') ?? draft?.seasonality,
    );

    // ensure tags is string[]
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

      // passthrough
      metadata: (base as any).metadata,
      constraints: (base as any).constraints,
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
    // ✅ use DB row fallback so we embed even if dto.gsutil_uri was absent
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

        // add these:
        item.color_temp, // Warm/Cool/Neutral
        item.contrast_profile, // Low/Medium/High
        String(item.formality_score ?? ''), // numeric can still help
        item.seasonality, // SS/FW/ALL_SEASON
        item.layering, // BASE/MID/SHELL/ACCENT
        item.pattern, // SOLID/CHECK...
        item.pattern_scale, // subtle/medium/bold (or Micro/Medium/Bold)

        // silhouette hooks (big for pairing):
        item.neckline,
        item.collar_type,
        item.sleeve_length,
        item.rise,
        item.leg,
        String(item.inseam_in ?? ''),
        item.length_class,
        item.shoe_style,
        item.sole,

        // intent + preferences
        Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        item.dress_code,
        item.anchor_role, // Hero/Neutral/Connector

        // (optional, still useful)
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
        this.normalizePatternScaleDto(dto.pattern_scale) ?? null;
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

    // if (textChanged) {
    //   const textInput = [
    //     item.name,
    //     item.main_category,
    //     item.subcategory,
    //     item.color,
    //     item.color_family,
    //     item.material,
    //     item.fit,
    //     item.size,
    //     item.brand,
    //     item.pattern,
    //     item.pattern_scale,
    //     item.seasonality,
    //     item.layering,
    //     item.dress_code,
    //     Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
    //     Array.isArray(item.tags) ? item.tags.join(' ') : '',
    //     item.anchor_role,
    //   ]
    //     .filter(Boolean)
    //     .join(' ');
    //   textVec = await this.vertex.embedText(textInput);
    // }

    // ✅ Only re-embed image when image fields change; use row fallback
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

    // Prefer a descriptive line; include name if it carries signal
    const head = primary || name || 'Item';
    return extras ? `${head} — ${extras}` : head;
  }
}

///////////////////

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
//   // Mirror DB enums exactly (UPPERCASE)
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // Inside WardrobeService

//   private extractStrictJson(text: string): any {
//     // Strip code fences and grab the first {...} block
//     const start = text.indexOf('{');
//     const end = text.lastIndexOf('}');
//     if (start === -1 || end === -1 || end <= start) {
//       throw new Error('No JSON object found in model response');
//     }
//     const jsonStr = text.slice(start, end + 1);
//     return JSON.parse(jsonStr);
//   }

//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({
//         userId,
//         vector: queryVec,
//         topK,
//         includeMetadata: true,
//       });

//       // Build a stable catalog we can map back from indices → items
//       const catalog = matches.map((m, i) => {
//         const { id } = this.normalizePineconeId(m.id as string);
//         const meta = m.metadata || {};
//         return {
//           index: i + 1,
//           id,
//           label: this.summarizeItem(meta),
//           image_url: meta.image_url,
//           main_category: meta.main_category ?? meta.mainCategory,
//           subcategory: meta.subcategory ?? meta.subCategory,
//           color: meta.color ?? meta.color_family,
//         };
//       });

//       const catalogLines = catalog
//         .map((c) => `${c.index}. ${c.label}`)
//         .join('\n');

//       const prompt = `
// You are a world-class personal stylist.

// Catalog (each line is "index. label"):
// ${catalogLines}

// User request: "${query}"

// Rules:
// - Build 2–3 complete outfits ONLY from the catalog.
// - Return "items" as an array of INTEGER indices (e.g., [2,7,11]). No strings.
// - If a crucial piece is missing, put it in a separate "missing" field (string).
// - JSON only. No code fences. No commentary.

// Respond in STRICT JSON:
// {
//   "outfits": [
//     {
//       "title": "string",
//       "items": [1,2,3],
//       "why": "one sentence",
//       "missing": "optional string"
//     }
//   ]
// }
// `;

//       // Call your Vertex helper (returns LLM raw text)
//       const raw = await this.vertex.generateReasonedOutfit(prompt);

//       // Handle both your earlier "candidates[0].content.parts[0].text" shape and direct text
//       const text =
//         (raw?.candidates?.[0]?.content?.parts?.[0]?.text as string) ??
//         (typeof raw === 'string' ? raw : '');

//       const parsed = this.extractStrictJson(text);

//       // Map numeric indices back to concrete items
//       const byIndex = new Map<number, (typeof catalog)[number]>();
//       catalog.forEach((c) => byIndex.set(c.index, c));

//       const outfits = (parsed.outfits || []).map((o: any) => ({
//         title: String(o.title ?? 'Outfit'),
//         items: Array.isArray(o.items)
//           ? o.items
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
//               .filter(Boolean)
//           : [],
//         why: String(o.why ?? ''),
//         missing: o.missing ? String(o.missing) : undefined,
//       }));

//       return { outfits };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }

//   /** Handles either a plain string or Gemini-like { candidates: [{ content: { parts: [{ text }] }}]} */
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

//     // Last resort: stringify (we'll still try to parse JSON from it)
//     return JSON.stringify(output ?? '');
//   }

//   /** Strips ```json fences if present and parses JSON; also tries to grab the largest JSON object if mixed text sneaks in */
//   private parseModelJson(s: string): any {
//     const cleaned = s
//       // strip opening/closing code fences (``` or ```json)
//       .replace(/^\s*```(?:json)?\s*/i, '')
//       .replace(/\s*```\s*$/i, '')
//       .trim();

//     try {
//       return JSON.parse(cleaned);
//     } catch {
//       // Fallback: try to find a JSON object substring
//       const m = cleaned.match(/\{[\s\S]*\}/);
//       if (m) {
//         return JSON.parse(m[0]);
//       }
//       throw new Error('Model did not return valid JSON.');
//     }
//   }

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

//   // DTO-facing normalizers (typed unions)
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
//     const normalized = this.normalizeMainCategory(rawMain); // your existing map
//     const s = (sub ?? '').toLowerCase();
//     const lay = (layering ?? '').toUpperCase();

//     // Subcategory implies outerwear → force it
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

//     // Shell layers are not "Tops"
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

//   // Replace your current sanitizeMeta with this version
//   private sanitizeMeta(
//     raw: Record<string, any>,
//   ): Record<string, string | number | boolean | string[]> {
//     const out: Record<string, string | number | boolean | string[]> = {};

//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;

//       // Avoid Pinecone confusion with a field literally named "metadata"
//       // Either drop it, or keep it but rename & stringify. Pick ONE:
//       if (k === 'metadata') {
//         // OPTION A (safer): drop it entirely
//         // continue;

//         // OPTION B: keep it as a JSON string under a new key
//         out['meta_json'] = typeof v === 'string' ? v : JSON.stringify(v);
//         continue;
//       }

//       // Pinecone only allows string[] (not number[]/object[])
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
//           // Any remaining objects must be stringified
//           out[k] = JSON.stringify(v);
//           break;
//         default:
//           // skip symbols, functions, etc.
//           break;
//       }
//     }

//     return out;
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

//     // Normalize to exact DTO unions
//     const rawMain =
//       (base as any).main_category ??
//       (draft?.main_category as string | undefined) ??
//       (draft?.category as string | undefined);

//     const main_category: CreateWardrobeItemDto['main_category'] =
//       this.resolveMainCategory(rawMain, rawSub, layeringRaw);

//     // later, when you set `layering` (typed union), use layeringRaw:
//     const layering = this.normalizeLayeringDto(layeringRaw);

//     const pattern_scale = this.normalizePatternScaleDto(
//       pick<string>('pattern_scale') ?? draft?.pattern_scale,
//     );

//     const seasonality = this.normalizeSeasonalityDto(
//       pick<string>('seasonality') ?? draft?.seasonality,
//     );

//     // ensure tags is string[]
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

//       // passthrough
//       metadata: (base as any).metadata,
//       constraints: (base as any).constraints,
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
//     // ✅ use DB row fallback so we embed even if dto.gsutil_uri was absent
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

//         // add these:
//         item.color_temp, // Warm/Cool/Neutral
//         item.contrast_profile, // Low/Medium/High
//         String(item.formality_score ?? ''), // numeric can still help
//         item.seasonality, // SS/FW/ALL_SEASON
//         item.layering, // BASE/MID/SHELL/ACCENT
//         item.pattern, // SOLID/CHECK...
//         item.pattern_scale, // subtle/medium/bold (or Micro/Medium/Bold)

//         // silhouette hooks (big for pairing):
//         item.neckline,
//         item.collar_type,
//         item.sleeve_length,
//         item.rise,
//         item.leg,
//         String(item.inseam_in ?? ''),
//         item.length_class,
//         item.shoe_style,
//         item.sole,

//         // intent + preferences
//         Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.dress_code,
//         item.anchor_role, // Hero/Neutral/Connector

//         // (optional, still useful)
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
//         this.normalizePatternScaleDto(dto.pattern_scale) ?? null;
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

//     // if (textChanged) {
//     //   const textInput = [
//     //     item.name,
//     //     item.main_category,
//     //     item.subcategory,
//     //     item.color,
//     //     item.color_family,
//     //     item.material,
//     //     item.fit,
//     //     item.size,
//     //     item.brand,
//     //     item.pattern,
//     //     item.pattern_scale,
//     //     item.seasonality,
//     //     item.layering,
//     //     item.dress_code,
//     //     Array.isArray(item.occasion_tags) ? item.occasion_tags.join(' ') : '',
//     //     Array.isArray(item.tags) ? item.tags.join(' ') : '',
//     //     item.anchor_role,
//     //   ]
//     //     .filter(Boolean)
//     //     .join(' ');
//     //   textVec = await this.vertex.embedText(textInput);
//     // }

//     // ✅ Only re-embed image when image fields change; use row fallback
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // VECTOR SEARCH + OUTFITS
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

//     // Prefer a descriptive line; include name if it carries signal
//     const head = primary || name || 'Item';
//     return extras ? `${head} — ${extras}` : head;
//   }
// }
