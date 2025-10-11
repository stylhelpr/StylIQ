// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';
// import { Storage } from '@google-cloud/storage';

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
// }

// /* ----------------------------- Tag Enhancers ----------------------------- */
// const tagPriority: Record<string, number> = {
//   gender: 5,
//   mainCategory: 4,
//   subCategory: 4,
//   color: 3,
//   pattern: 3,
//   style_type: 3,
//   occasion: 2,
//   fit: 2,
//   seasonality: 1,
// };

// const synonymMap: Record<string, string> = {
//   overshirt: 'flannel shirt',
//   tee: 't-shirt',
//   trousers: 'pants',
//   slacks: 'pants',
//   denim: 'jeans',
//   earth: 'brown',
//   neutral: 'beige',
// };

// const bannedDescriptors = [
//   'comfortable',
//   'versatile',
//   'outdoor',
//   'modern',
//   'stylish',
//   'fashion',
//   'tone',
//   'tones',
//   'wear',
//   'outfit',
//   'vibe',
//   'look',
//   'clothing',
//   'garment',
// ];

// function prioritizeTags(
//   meta: Record<string, string | undefined>,
//   aiTags: string[],
// ) {
//   const weighted = Object.entries(meta)
//     .filter(([_, v]) => v)
//     .sort((a, b) => (tagPriority[b[0]] ?? 0) - (tagPriority[a[0]] ?? 0))
//     .map(([_, v]) => v!.toLowerCase());
//   return [...weighted, ...aiTags];
// }

// function normalizeTags(tags: string[]): string[] {
//   return tags.map((t) => synonymMap[t.toLowerCase()] || t.toLowerCase());
// }

// function filterTags(tags: string[]): string[] {
//   return tags.filter((t) => !bannedDescriptors.includes(t.toLowerCase()));
// }

// function scoreProduct(p: any, tags: string[]) {
//   const name = (p.name || p.title || '').toLowerCase();
//   return tags.reduce((s, t) => (name.includes(t) ? s + 1 : s), 0);
// }

// @Injectable()
// export class ShopbyProductSearchService {
//   private readonly logger = new Logger(ShopbyProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();
//   private serpCooldownUntil = 0;

//   /* ⚡️ Cache image to GCS */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_shop_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);
//       await file.save(buffer, { contentType: 'image/jpeg', resumable: false });
//       return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl;
//     }
//   }

//   /* 🧠 Smart tag compressor */
//   private compressTags(tags: string[]): string {
//     if (!tags?.length) return '';

//     let normalized = tags
//       .map((t) => t.toLowerCase().trim())
//       .map((t) => synonymMap[t] || t)
//       .filter(Boolean);

//     normalized = normalized.filter((t) => !bannedDescriptors.includes(t));

//     return Array.from(new Set(normalized)).slice(0, 6).join(' ');
//   }

//   /* 👕 ASOS (Casual / Streetwear / Smart-casual) */
//   private async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=8`;

//     try {
//       const res = await fetch(url, {
//         headers: {
//           'X-RapidAPI-Key': this.rapidKey,
//           'X-RapidAPI-Host': 'asos2.p.rapidapi.com',
//         },
//       });
//       const json = await res.json();
//       const items = json?.products || [];
//       if (!items.length) return [];

//       const filtered = /shirt|flannel|plaid/i.test(query)
//         ? items.filter(
//             (p: any) =>
//               /(shirt|flannel|check|overshirt)/i.test(p.name) &&
//               !/(jacket|coat|blazer)/i.test(p.name),
//           )
//         : items;

//       return await Promise.all(
//         filtered.map(async (p: any) => ({
//           name: p.name,
//           brand: p.brand?.name || 'ASOS',
//           price: p.price?.current?.text,
//           image: await this.cacheImageToGCS(
//             p.imageUrl?.startsWith('http')
//               ? p.imageUrl
//               : `https://${p.imageUrl}`,
//           ),
//           shopUrl: p.url?.startsWith('http')
//             ? p.url
//             : `https://www.asos.com/${p.url}`,
//           source: 'ASOS' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('ASOS search failed:', err);
//       return [];
//     }
//   }

//   /* 🎩 FARFETCH (Luxury / Designer / Formalwear) */
//   private async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited during Farfetch search');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }
//       const json = await res.json();
//       const items = json.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items.slice(0, 6).map(async (i: any) => ({
//           name: i.title,
//           brand: i.source || 'Farfetch',
//           price:
//             i.price || (i.extracted_price ? `$${i.extracted_price}` : null),
//           image: await this.cacheImageToGCS(i.thumbnail || i.serpapi_thumbnail),
//           shopUrl: i.product_link || i.link,
//           source: 'Farfetch' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('Farfetch search failed:', err);
//       return [];
//     }
//   }

//   /* 🛍️ Google Shopping fallback */
//   private async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey || Date.now() < this.serpCooldownUntil) {
//       this.logger.log('⏸️ Skipping SerpAPI (cooldown active)');
//       return [];
//     }

//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited (429) → cooldown');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }

//       const json = await res.json();
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail && i.link)
//           .slice(0, 6)
//           .map(async (i: any) => ({
//             name: i.title,
//             brand: i.source || 'Google Shopping',
//             price:
//               i.extracted_price !== undefined
//                 ? `$${i.extracted_price}`
//                 : i.price || null,
//             image: await this.cacheImageToGCS(i.thumbnail),
//             shopUrl: i.link,
//             source: 'SerpAPI' as const,
//           })),
//       );
//     } catch (err) {
//       this.logger.warn('SerpAPI fallback failed:', err);
//       return [];
//     }
//   }

//   /* ------------------------------------------------------------
//      ⚙️ Cache + Retry Layer
//   -------------------------------------------------------------*/
//   private cacheMap = new Map<
//     string,
//     { data: ProductResult[]; timestamp: number }
//   >();
//   private CACHE_TTL_MS = 1000 * 60 * 30; // 30 min

//   private getCached(query: string): ProductResult[] | null {
//     const cached = this.cacheMap.get(query);
//     if (!cached) return null;
//     if (Date.now() - cached.timestamp > this.CACHE_TTL_MS) {
//       this.cacheMap.delete(query);
//       return null;
//     }
//     return cached.data;
//   }

//   private setCache(query: string, data: ProductResult[]) {
//     this.cacheMap.set(query, { data, timestamp: Date.now() });
//   }

//   private simplifyQuery(query: string): string {
//     return query
//       .replace(
//         /\b(men|women|unisex|luxury|designer|casual|streetwear|smart|modern|formal|neutral)\b/gi,
//         '',
//       )
//       .replace(/\s+/g, ' ')
//       .trim();
//   }

//   /* ------------------------------------------------------------
//      🧠 Core Search Logic (with Tag Enrichment & Re-Ranking)
//   -------------------------------------------------------------*/
//   private async searchCore(
//     rawQuery: string,
//     genderHint?: string,
//     tags?: string[],
//   ): Promise<ProductResult[]> {
//     const clean = rawQuery.toLowerCase().trim();
//     const gender =
//       genderHint ||
//       (/(women|female|lady|girl)/i.test(clean)
//         ? 'women'
//         : /(men|male|guy|gent)/i.test(clean)
//           ? 'men'
//           : 'unisex');

//     // 🔍 Tag processing pipeline
//     let finalTags = normalizeTags(tags || []);
//     finalTags = filterTags(finalTags);

//     const tagSummary = this.compressTags(finalTags);
//     this.logger.log(`🧩 [ShopBy] Compressed tags → "${tagSummary}"`);

//     // derive key metadata
//     const tagContext = (tags || []).join(' ').toLowerCase();
//     const color =
//       /(black|white|grey|beige|blue|brown|tan|navy|olive|green|cream|charcoal|ivory|camel)/i.exec(
//         tagContext,
//       )?.[0];
//     const fit = /(slim|regular|oversized|relaxed|tailored|cropped)/i.exec(
//       tagContext,
//     )?.[0];
//     const material =
//       /(cotton|wool|linen|silk|leather|denim|suede|cashmere|flannel)/i.exec(
//         tagContext,
//       )?.[0];
//     const season = /(summer|winter|spring|fall|autumn)/i.exec(tagContext)?.[0];

//     // color bias
//     if (color && !finalTags.includes(color)) finalTags.unshift(color);

//     // fallback trend nudge
//     if (finalTags.length < 4)
//       finalTags.push('trending', 'streetwear', '2025 fashion');

//     const vibe =
//       /(modern|minimal|neutral|classic|retro|boho|sporty|vintage|workwear)/i.exec(
//         tagContext,
//       )?.[0];

//     const categoryMatch =
//       clean.match(
//         /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short|top|bottom|accessory|flannel)/,
//       ) || tagSummary.match(/(shirt|flannel|overshirt|check)/i);
//     const category = categoryMatch ? categoryMatch[1] : 'outfit';

//     let query = `${gender} ${tagSummary || ''} ${color || ''} ${fit || ''} ${category}`;
//     if (material) query += ` ${material}`;
//     if (season) query += ` ${season} style`;
//     if (vibe) query += ` ${vibe}`;
//     query = query.replace(/\s+/g, ' ').trim();

//     this.logger.log(`🧠 [ShopBy] Final query → "${query}"`);

//     try {
//       const asos = await this.searchASOS(query);
//       const farfetch = await this.searchFarfetch(query);
//       const serp = await this.searchSerpApi(query);

//       let results = [...asos, ...farfetch, ...serp];
//       if (!results.length) {
//         this.logger.warn(`❌ [ShopBy] No results found for "${query}"`);
//         return [];
//       }

//       // 🧩 Re-rank results by tag match
//       results.sort(
//         (a, b) => scoreProduct(b, finalTags) - scoreProduct(a, finalTags),
//       );

//       return results;
//     } catch (err) {
//       this.logger.error('ShopBy product search failed:', err);
//       return [];
//     }
//   }

//   /* ------------------------------------------------------------
//      🎯 Public Search with Cache + Retry + Fallback
//   -------------------------------------------------------------*/
//   async search(
//     rawQuery: string,
//     genderHint?: string,
//     tags?: string[],
//   ): Promise<ProductResult[]> {
//     const cached = this.getCached(rawQuery);
//     if (cached) {
//       this.logger.log(`⚡ Cache hit for "${rawQuery}"`);
//       return cached;
//     }

//     try {
//       const results = await this.searchCore(rawQuery, genderHint, tags);
//       if (results.length) {
//         this.setCache(rawQuery, results);
//         return results;
//       }

//       const simplified = this.simplifyQuery(rawQuery);
//       if (simplified !== rawQuery) {
//         const retry = await this.searchCore(simplified, genderHint, tags);
//         if (retry.length) {
//           this.setCache(rawQuery, retry);
//           return retry;
//         }
//       }

//       const trendFallback = await this.searchSerpApi('modern neutral outfit');
//       if (trendFallback.length) {
//         this.setCache(rawQuery, trendFallback);
//         return trendFallback;
//       }

//       return [];
//     } catch (err) {
//       this.logger.error(`❌ Search failed for "${rawQuery}"`, err);
//       return [];
//     }
//   }
// }

//////////////////////

import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { Storage } from '@google-cloud/storage';

export interface ProductResult {
  name: string;
  brand?: string;
  price?: string;
  image: string;
  shopUrl: string;
  source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
}

@Injectable()
export class ShopbyProductSearchService {
  private readonly logger = new Logger(ShopbyProductSearchService.name);
  private readonly rapidKey = process.env.RAPIDAPI_KEY;
  private readonly serpapiKey = process.env.SERPAPI_KEY;
  private readonly bucketName =
    process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
  private readonly storage = new Storage();
  private serpCooldownUntil = 0;

  /* ⚡️ Cache image to GCS */
  private async cacheImageToGCS(imageUrl?: string): Promise<string> {
    if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const fileName = `cached_shop_images/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`;
      const file = this.storage.bucket(this.bucketName).file(fileName);
      await file.save(buffer, {
        contentType: 'image/jpeg',
        resumable: false,
      });
      return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
    } catch (e) {
      this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
      return imageUrl;
    }
  }

  /* 🧠 Smart tag compressor to improve retailer queries */
  private compressTags(tags: string[]): string {
    if (!tags?.length) return '';

    const synonyms: Record<string, string> = {
      'button-up shirt': 'flannel shirt',
      'button up': 'shirt',
      'button-up': 'shirt',
      'button down': 'shirt',
      'long sleeve': 'shirt',
      'short sleeve': 'shirt',
      plaid: 'plaid flannel shirt',
      flannel: 'flannel shirt',
      'earth tones': 'neutral tones',
      'relaxed fit': 'regular fit',
      'tailored fit': 'slim fit',
      outdoor: 'casual',
      'casual wear': 'casual',
      traditional: 'classic',
      layers: 'layered',
      workwear: 'rugged work shirt',
    };

    let normalized = tags
      .map((t) => t.toLowerCase().trim())
      .map((t) => {
        for (const [key, val] of Object.entries(synonyms)) {
          if (t.includes(key)) return val;
        }
        return t;
      })
      .filter(Boolean);

    const stopwords = new Set([
      'modern',
      'style',
      'outfit',
      'fashion',
      'tone',
      'tones',
      'vibe',
      'comfortable',
      'everyday',
      'fit',
      'wear',
      'look',
      'clothing',
      'garment',
    ]);
    normalized = normalized.filter((t) => !stopwords.has(t));

    return Array.from(new Set(normalized)).slice(0, 6).join(' ');
  }

  /* 👕 ASOS (Casual / Streetwear / Smart-casual) */
  private async searchASOS(query: string): Promise<ProductResult[]> {
    if (!this.rapidKey) return [];
    const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
      query,
    )}&offset=0&limit=8`;

    try {
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': this.rapidKey,
          'X-RapidAPI-Host': 'asos2.p.rapidapi.com',
        },
      });
      const json = await res.json();
      const items = json?.products || [];
      if (!items.length) return [];

      // 🧹 Filter out irrelevant jackets/blazers if query implies shirts
      const filtered = /shirt|flannel|plaid/i.test(query)
        ? items.filter(
            (p: any) =>
              /(shirt|flannel|check|overshirt)/i.test(p.name) &&
              !/(jacket|coat|blazer)/i.test(p.name),
          )
        : items;

      return await Promise.all(
        filtered.map(async (p: any) => ({
          name: p.name,
          brand: p.brand?.name || 'ASOS',
          price: p.price?.current?.text,
          image: await this.cacheImageToGCS(
            p.imageUrl?.startsWith('http')
              ? p.imageUrl
              : `https://${p.imageUrl}`,
          ),
          shopUrl: p.url?.startsWith('http')
            ? p.url
            : `https://www.asos.com/${p.url}`,
          source: 'ASOS' as const,
        })),
      );
    } catch (err) {
      this.logger.warn('ASOS search failed:', err);
      return [];
    }
  }

  /* 🎩 FARFETCH (Luxury / Designer / Formalwear) */
  private async searchFarfetch(query: string): Promise<ProductResult[]> {
    if (!this.serpapiKey) return [];
    const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
      query,
    )}&api_key=${this.serpapiKey}`;

    try {
      const res = await fetch(url);
      if (res.status === 429) {
        this.logger.warn('🚫 SerpAPI rate-limited during Farfetch search');
        this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
        return [];
      }
      const json = await res.json();
      const items = json.shopping_results || [];
      if (!items.length) return [];

      return await Promise.all(
        items.slice(0, 6).map(async (i: any) => ({
          name: i.title,
          brand: i.source || 'Farfetch',
          price:
            i.price || (i.extracted_price ? `$${i.extracted_price}` : null),
          image: await this.cacheImageToGCS(i.thumbnail || i.serpapi_thumbnail),
          shopUrl: i.product_link || i.link,
          source: 'Farfetch' as const,
        })),
      );
    } catch (err) {
      this.logger.warn('Farfetch search failed:', err);
      return [];
    }
  }

  /* 🛍️ Google Shopping fallback */
  private async searchSerpApi(query: string): Promise<ProductResult[]> {
    if (!this.serpapiKey || Date.now() < this.serpCooldownUntil) {
      this.logger.log('⏸️ Skipping SerpAPI (cooldown active)');
      return [];
    }

    const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
      query,
    )}&api_key=${this.serpapiKey}`;

    try {
      const res = await fetch(url);
      if (res.status === 429) {
        this.logger.warn('🚫 SerpAPI rate-limited (429) → cooldown');
        this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
        return [];
      }

      const json = await res.json();
      const items = json?.shopping_results || [];
      if (!items.length) return [];

      return await Promise.all(
        items
          .filter((i: any) => i.thumbnail && i.link)
          .slice(0, 6)
          .map(async (i: any) => ({
            name: i.title,
            brand: i.source || 'Google Shopping',
            price:
              i.extracted_price !== undefined
                ? `$${i.extracted_price}`
                : i.price || null,
            image: await this.cacheImageToGCS(i.thumbnail),
            shopUrl: i.link,
            source: 'SerpAPI' as const,
          })),
      );
    } catch (err) {
      this.logger.warn('SerpAPI fallback failed:', err);
      return [];
    }
  }

  /* ------------------------------------------------------------
     ⚙️ Cache + Retry Layer
  -------------------------------------------------------------*/
  private cacheMap = new Map<
    string,
    { data: ProductResult[]; timestamp: number }
  >();
  private CACHE_TTL_MS = 1000 * 60 * 30; // 30 min

  private getCached(query: string): ProductResult[] | null {
    const cached = this.cacheMap.get(query);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.CACHE_TTL_MS) {
      this.cacheMap.delete(query);
      return null;
    }
    return cached.data;
  }

  private setCache(query: string, data: ProductResult[]) {
    this.cacheMap.set(query, { data, timestamp: Date.now() });
  }

  private simplifyQuery(query: string): string {
    return query
      .replace(
        /\b(men|women|unisex|luxury|designer|casual|streetwear|smart|modern|formal|neutral)\b/gi,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ------------------------------------------------------------
     🧠 Core Search Logic
  -------------------------------------------------------------*/
  private async searchCore(
    rawQuery: string,
    genderHint?: string,
    tags?: string[],
  ): Promise<ProductResult[]> {
    const clean = rawQuery.toLowerCase().trim();
    const gender =
      genderHint ||
      (/(women|female|lady|girl)/i.test(clean)
        ? 'women'
        : /(men|male|guy|gent)/i.test(clean)
          ? 'men'
          : 'unisex');
    const tagContext = (tags || []).join(' ').toLowerCase();
    const tagSummary = this.compressTags(tags || []);
    this.logger.log(`🧩 [ShopBy] Compressed tags → "${tagSummary}"`);

    const vibe =
      /(modern|minimal|neutral|classic|retro|boho|sporty|vintage|workwear)/i.exec(
        tagContext,
      )?.[0];
    const color =
      /(black|white|grey|beige|blue|brown|tan|navy|olive|green|cream|charcoal|ivory|camel)/i.exec(
        tagContext,
      )?.[0];
    const season = /(summer|winter|spring|fall|autumn)/i.exec(tagContext)?.[0];
    const material =
      /(cotton|wool|linen|silk|leather|denim|suede|cashmere|flannel)/i.exec(
        tagContext,
      )?.[0];
    const fit = /(slim|regular|oversized|relaxed|tailored|cropped)/i.exec(
      tagContext,
    )?.[0];

    const isFormal =
      /(suit|blazer|tux|loafer|oxford|tailored|formal|business)/i.test(
        clean + tagContext,
      );
    const isLuxury =
      /(ferragamo|gucci|prada|armani|designer|italian|cashmere|silk|luxury)/i.test(
        clean + tagContext,
      );
    const isStreet =
      /(street|sneaker|hoodie|cargo|denim|graphic|jogger|puffer|urban)/i.test(
        clean + tagContext,
      );
    const isSmartCasual =
      /(polo|chino|knit|cardigan|neutral|smart|clean|casual|minimal)/i.test(
        clean + tagContext,
      );

    const categoryMatch =
      clean.match(
        /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short|top|bottom|accessory|flannel)/,
      ) || tagSummary.match(/(shirt|flannel|overshirt|check)/i);
    const category = categoryMatch ? categoryMatch[1] : 'outfit';

    let query = `${gender} ${tagSummary || ''} ${color || ''} ${fit || ''} ${category}`;
    if (isLuxury) query += ' high-end luxury designer';
    if (isFormal) query += ' formal business tailored';
    if (isStreet) query += ' streetwear modern';
    if (isSmartCasual) query += ' smart casual everyday';
    if (material) query += ` ${material}`;
    if (season) query += ` ${season} style`;
    if (vibe) query += ` ${vibe}`;
    query = query.replace(/\s+/g, ' ').trim();

    this.logger.log(`🧠 [ShopBy] Final query → "${query}"`);

    try {
      if (isStreet || isSmartCasual || !isLuxury) {
        const asos = await this.searchASOS(query);
        if (asos.length) return asos;
      }

      if (isFormal || isLuxury) {
        const farfetch = await this.searchFarfetch(query);
        if (farfetch.length) return farfetch;
      }

      const serp = await this.searchSerpApi(query);
      if (serp.length) return serp;

      this.logger.warn(`❌ [ShopBy] No results found for "${query}"`);
      return [];
    } catch (err) {
      this.logger.error('ShopBy product search failed:', err);
      return [];
    }
  }

  /* ------------------------------------------------------------
     🎯 Public Search with Cache + Retry + Fallback
  -------------------------------------------------------------*/
  async search(
    rawQuery: string,
    genderHint?: string,
    tags?: string[],
  ): Promise<ProductResult[]> {
    const cached = this.getCached(rawQuery);
    if (cached) {
      this.logger.log(`⚡ Cache hit for "${rawQuery}"`);
      return cached;
    }

    try {
      const results = await this.searchCore(rawQuery, genderHint, tags);
      if (results.length) {
        this.setCache(rawQuery, results);
        return results;
      }

      // 🔁 Retry simplified query
      const simplified = this.simplifyQuery(rawQuery);
      if (simplified !== rawQuery) {
        const retry = await this.searchCore(simplified, genderHint, tags);
        if (retry.length) {
          this.setCache(rawQuery, retry);
          return retry;
        }
      }

      // 🧭 Trend-based fallback
      const trendFallback = await this.searchSerpApi('modern neutral outfit');
      if (trendFallback.length) {
        this.setCache(rawQuery, trendFallback);
        return trendFallback;
      }

      return [];
    } catch (err) {
      this.logger.error(`❌ Search failed for "${rawQuery}"`, err);
      return [];
    }
  }
}

//////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';
// import { Storage } from '@google-cloud/storage';

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
// }

// @Injectable()
// export class ShopbyProductSearchService {
//   private readonly logger = new Logger(ShopbyProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();
//   private serpCooldownUntil = 0;

//   /* ⚡️ Cache image to GCS */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_shop_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);
//       await file.save(buffer, {
//         contentType: 'image/jpeg',
//         resumable: false,
//       });
//       return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl;
//     }
//   }

//   /* 🧠 Smart tag compressor to improve retailer queries */
//   private compressTags(tags: string[]): string {
//     if (!tags?.length) return '';

//     const synonyms: Record<string, string> = {
//       'button-up shirt': 'flannel shirt',
//       'button up': 'shirt',
//       'button-up': 'shirt',
//       'button down': 'shirt',
//       'long sleeve': 'shirt',
//       'short sleeve': 'shirt',
//       plaid: 'plaid flannel shirt',
//       flannel: 'flannel shirt',
//       'earth tones': 'neutral tones',
//       'relaxed fit': 'regular fit',
//       'tailored fit': 'slim fit',
//       outdoor: 'casual',
//       'casual wear': 'casual',
//       traditional: 'classic',
//       layers: 'layered',
//       workwear: 'rugged work shirt',
//     };

//     let normalized = tags
//       .map((t) => t.toLowerCase().trim())
//       .map((t) => {
//         for (const [key, val] of Object.entries(synonyms)) {
//           if (t.includes(key)) return val;
//         }
//         return t;
//       })
//       .filter(Boolean);

//     const stopwords = new Set([
//       'modern',
//       'style',
//       'outfit',
//       'fashion',
//       'tone',
//       'tones',
//       'vibe',
//       'comfortable',
//       'everyday',
//       'fit',
//       'wear',
//       'look',
//       'clothing',
//       'garment',
//     ]);
//     normalized = normalized.filter((t) => !stopwords.has(t));

//     return Array.from(new Set(normalized)).slice(0, 6).join(' ');
//   }

//   /* 👕 ASOS (Casual / Streetwear / Smart-casual) */
//   private async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=8`;

//     try {
//       const res = await fetch(url, {
//         headers: {
//           'X-RapidAPI-Key': this.rapidKey,
//           'X-RapidAPI-Host': 'asos2.p.rapidapi.com',
//         },
//       });
//       const json = await res.json();
//       const items = json?.products || [];
//       if (!items.length) return [];

//       // 🧹 Filter out irrelevant jackets/blazers if query implies shirts
//       const filtered = /shirt|flannel|plaid/i.test(query)
//         ? items.filter(
//             (p: any) =>
//               /(shirt|flannel|check|overshirt)/i.test(p.name) &&
//               !/(jacket|coat|blazer)/i.test(p.name),
//           )
//         : items;

//       return await Promise.all(
//         filtered.map(async (p: any) => ({
//           name: p.name,
//           brand: p.brand?.name || 'ASOS',
//           price: p.price?.current?.text,
//           image: await this.cacheImageToGCS(
//             p.imageUrl?.startsWith('http')
//               ? p.imageUrl
//               : `https://${p.imageUrl}`,
//           ),
//           shopUrl: p.url?.startsWith('http')
//             ? p.url
//             : `https://www.asos.com/${p.url}`,
//           source: 'ASOS' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('ASOS search failed:', err);
//       return [];
//     }
//   }

//   /* 🎩 FARFETCH (Luxury / Designer / Formalwear) */
//   private async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited during Farfetch search');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }
//       const json = await res.json();
//       const items = json.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items.slice(0, 6).map(async (i: any) => ({
//           name: i.title,
//           brand: i.source || 'Farfetch',
//           price:
//             i.price || (i.extracted_price ? `$${i.extracted_price}` : null),
//           image: await this.cacheImageToGCS(i.thumbnail || i.serpapi_thumbnail),
//           shopUrl: i.product_link || i.link,
//           source: 'Farfetch' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('Farfetch search failed:', err);
//       return [];
//     }
//   }

//   /* 🛍️ Google Shopping fallback */
//   private async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey || Date.now() < this.serpCooldownUntil) {
//       this.logger.log('⏸️ Skipping SerpAPI (cooldown active)');
//       return [];
//     }

//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited (429) → cooldown');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }

//       const json = await res.json();
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail && i.link)
//           .slice(0, 6)
//           .map(async (i: any) => ({
//             name: i.title,
//             brand: i.source || 'Google Shopping',
//             price:
//               i.extracted_price !== undefined
//                 ? `$${i.extracted_price}`
//                 : i.price || null,
//             image: await this.cacheImageToGCS(i.thumbnail),
//             shopUrl: i.link,
//             source: 'SerpAPI' as const,
//           })),
//       );
//     } catch (err) {
//       this.logger.warn('SerpAPI fallback failed:', err);
//       return [];
//     }
//   }

//   /* 🎯 Context-aware Shop the Look Search */
//   async search(
//     rawQuery: string,
//     genderHint?: string,
//     tags?: string[],
//   ): Promise<ProductResult[]> {
//     const clean = rawQuery.toLowerCase().trim();
//     const gender =
//       genderHint ||
//       (/(women|female|lady|girl)/i.test(clean)
//         ? 'women'
//         : /(men|male|guy|gent)/i.test(clean)
//           ? 'men'
//           : 'unisex');
//     const tagContext = (tags || []).join(' ').toLowerCase();
//     const tagSummary = this.compressTags(tags || []);
//     this.logger.log(`🧩 [ShopBy] Compressed tags → "${tagSummary}"`);

//     this.logger.log(
//       `🛍️ [ShopBy] Searching for "${rawQuery}" → gender=${gender}, tags=${tagContext}`,
//     );

//     const vibe =
//       /(modern|minimal|neutral|classic|retro|boho|sporty|vintage|workwear)/i.exec(
//         tagContext,
//       )?.[0];
//     const color =
//       /(black|white|grey|beige|blue|brown|tan|navy|olive|green|cream|charcoal|ivory|camel)/i.exec(
//         tagContext,
//       )?.[0];
//     const season = /(summer|winter|spring|fall|autumn)/i.exec(tagContext)?.[0];
//     const material =
//       /(cotton|wool|linen|silk|leather|denim|suede|cashmere|flannel)/i.exec(
//         tagContext,
//       )?.[0];
//     const fit = /(slim|regular|oversized|relaxed|tailored|cropped)/i.exec(
//       tagContext,
//     )?.[0];

//     const isFormal =
//       /(suit|blazer|tux|loafer|oxford|tailored|formal|business)/i.test(
//         clean + tagContext,
//       );
//     const isLuxury =
//       /(ferragamo|gucci|prada|armani|designer|italian|cashmere|silk|luxury)/i.test(
//         clean + tagContext,
//       );
//     const isStreet =
//       /(street|sneaker|hoodie|cargo|denim|graphic|jogger|puffer|urban)/i.test(
//         clean + tagContext,
//       );
//     const isSmartCasual =
//       /(polo|chino|knit|cardigan|neutral|smart|clean|casual|minimal)/i.test(
//         clean + tagContext,
//       );

//     const categoryMatch =
//       clean.match(
//         /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short|top|bottom|accessory|flannel)/,
//       ) || tagSummary.match(/(shirt|flannel|overshirt|check)/i);
//     const category = categoryMatch ? categoryMatch[1] : 'outfit';

//     // ✨ Refined retailer-friendly query
//     let query = `${gender} ${tagSummary || ''} ${color || ''} ${fit || ''} ${category}`;
//     if (isLuxury) query += ' high-end luxury designer';
//     if (isFormal) query += ' formal business tailored';
//     if (isStreet) query += ' streetwear modern';
//     if (isSmartCasual) query += ' smart casual everyday';
//     if (material) query += ` ${material}`;
//     if (season) query += ` ${season} style`;
//     if (vibe) query += ` ${vibe}`;
//     query = query.replace(/\s+/g, ' ').trim();

//     this.logger.log(`🧠 [ShopBy] Final query → "${query}"`);

//     try {
//       if (isStreet || isSmartCasual || !isLuxury) {
//         this.logger.log(`🛍️ [ShopBy] ASOS query → "${query}"`);
//         const asos = await this.searchASOS(query);
//         if (asos.length) return asos;
//       }

//       if (isFormal || isLuxury) {
//         this.logger.log(`🎩 [ShopBy] Farfetch query → "${query}"`);
//         const farfetch = await this.searchFarfetch(query);
//         if (farfetch.length) return farfetch;
//       }

//       this.logger.log(`🧭 [ShopBy] SerpAPI fallback query → "${query}"`);
//       const serp = await this.searchSerpApi(query);
//       if (serp.length) return serp;

//       this.logger.warn(`❌ [ShopBy] No results found for "${query}"`);
//       return [];
//     } catch (err) {
//       this.logger.error('ShopBy product search failed:', err);
//       return [];
//     }
//   }
// }

///////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';
// import { Storage } from '@google-cloud/storage';

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
// }

// @Injectable()
// export class ShopbyProductSearchService {
//   private readonly logger = new Logger(ShopbyProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();
//   private serpCooldownUntil = 0;

//   /* ⚡️ Cache image to GCS */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_shop_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);
//       await file.save(buffer, {
//         contentType: 'image/jpeg',
//         resumable: false,
//       });
//       return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl;
//     }
//   }

//   /* 🧠 Smart tag compressor to improve retailer queries */
//   private compressTags(tags: string[]): string {
//     if (!tags?.length) return '';

//     const synonyms: Record<string, string> = {
//       'button-up shirt': 'flannel shirt',
//       'button up': 'shirt',
//       'button-up': 'shirt',
//       'button down': 'shirt',
//       'long sleeve': 'shirt',
//       'short sleeve': 'shirt',
//       plaid: 'plaid flannel shirt',
//       flannel: 'flannel shirt',
//       'earth tones': 'neutral tones',
//       'relaxed fit': 'regular fit',
//       'tailored fit': 'slim fit',
//       outdoor: 'casual',
//       'casual wear': 'casual',
//       traditional: 'classic',
//       layers: 'layered',
//     };

//     let normalized = tags
//       .map((t) => t.toLowerCase().trim())
//       .map((t) => {
//         for (const [key, val] of Object.entries(synonyms)) {
//           if (t.includes(key)) return val;
//         }
//         return t;
//       })
//       .filter(Boolean);

//     const stopwords = new Set([
//       'modern',
//       'style',
//       'outfit',
//       'fashion',
//       'tone',
//       'tones',
//       'vibe',
//       'comfortable',
//       'everyday',
//       'fit',
//       'wear',
//       'look',
//       'clothing',
//       'garment',
//     ]);
//     normalized = normalized.filter((t) => !stopwords.has(t));

//     return Array.from(new Set(normalized)).slice(0, 6).join(' ');
//   }

//   /* 👕 ASOS (Casual / Streetwear / Smart-casual) */
//   private async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=8`;

//     try {
//       const res = await fetch(url, {
//         headers: {
//           'X-RapidAPI-Key': this.rapidKey,
//           'X-RapidAPI-Host': 'asos2.p.rapidapi.com',
//         },
//       });
//       const json = await res.json();
//       const items = json?.products || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items.map(async (p: any) => ({
//           name: p.name,
//           brand: p.brand?.name || 'ASOS',
//           price: p.price?.current?.text,
//           image: await this.cacheImageToGCS(
//             p.imageUrl?.startsWith('http')
//               ? p.imageUrl
//               : `https://${p.imageUrl}`,
//           ),
//           shopUrl: p.url?.startsWith('http')
//             ? p.url
//             : `https://www.asos.com/${p.url}`,
//           source: 'ASOS' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('ASOS search failed:', err);
//       return [];
//     }
//   }

//   /* 🎩 FARFETCH (Luxury / Designer / Formalwear) */
//   private async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited during Farfetch search');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }
//       const json = await res.json();
//       const items = json.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items.slice(0, 6).map(async (i: any) => ({
//           name: i.title,
//           brand: i.source || 'Farfetch',
//           price:
//             i.price || (i.extracted_price ? `$${i.extracted_price}` : null),
//           image: await this.cacheImageToGCS(i.thumbnail || i.serpapi_thumbnail),
//           shopUrl: i.product_link || i.link,
//           source: 'Farfetch' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('Farfetch search failed:', err);
//       return [];
//     }
//   }

//   /* 🛍️ Google Shopping fallback */
//   private async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey || Date.now() < this.serpCooldownUntil) {
//       this.logger.log('⏸️ Skipping SerpAPI (cooldown active)');
//       return [];
//     }

//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited (429) → cooldown');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }

//       const json = await res.json();
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail && i.link)
//           .slice(0, 6)
//           .map(async (i: any) => ({
//             name: i.title,
//             brand: i.source || 'Google Shopping',
//             price:
//               i.extracted_price !== undefined
//                 ? `$${i.extracted_price}`
//                 : i.price || null,
//             image: await this.cacheImageToGCS(i.thumbnail),
//             shopUrl: i.link,
//             source: 'SerpAPI' as const,
//           })),
//       );
//     } catch (err) {
//       this.logger.warn('SerpAPI fallback failed:', err);
//       return [];
//     }
//   }

//   /* 🎯 Context-aware Shop the Look Search */
//   async search(
//     rawQuery: string,
//     genderHint?: string,
//     tags?: string[],
//   ): Promise<ProductResult[]> {
//     const clean = rawQuery.toLowerCase().trim();
//     const tagSummary = this.compressTags(tags || []);
//     const gender =
//       genderHint ||
//       (/(women|female|lady|girl)/i.test(clean)
//         ? 'women'
//         : /(men|male|guy|gent)/i.test(clean)
//           ? 'men'
//           : 'unisex');

//     this.logger.log(
//       `🛍️ [ShopBy] Searching for "${rawQuery}" → gender=${gender}, tags=${tagSummary}`,
//     );

//     // Extract descriptors
//     const vibe =
//       /(modern|minimal|neutral|classic|retro|boho|sporty|vintage)/i.exec(
//         tagSummary,
//       )?.[0];
//     const color =
//       /(black|white|grey|beige|blue|brown|tan|navy|olive|green|cream|charcoal|ivory|camel)/i.exec(
//         tagSummary,
//       )?.[0];
//     const season = /(summer|winter|spring|fall|autumn)/i.exec(tagSummary)?.[0];
//     const material =
//       /(cotton|wool|linen|silk|leather|denim|suede|cashmere|flannel)/i.exec(
//         tagSummary,
//       )?.[0];
//     const fit = /(slim|regular|oversized|relaxed|tailored|cropped)/i.exec(
//       tagSummary,
//     )?.[0];

//     const isFormal =
//       /(suit|blazer|tux|loafer|oxford|tailored|formal|business)/i.test(
//         clean + tagSummary,
//       );
//     const isLuxury =
//       /(ferragamo|gucci|prada|armani|designer|italian|cashmere|silk|luxury)/i.test(
//         clean + tagSummary,
//       );
//     const isStreet =
//       /(street|sneaker|hoodie|cargo|denim|graphic|jogger|puffer|urban)/i.test(
//         clean + tagSummary,
//       );
//     const isSmartCasual =
//       /(polo|chino|knit|cardigan|neutral|smart|clean|casual|minimal)/i.test(
//         clean + tagSummary,
//       );

//     const categoryMatch = clean.match(
//       /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short|top|bottom|accessory|overshirt|flannel)/,
//     );
//     const category = categoryMatch ? categoryMatch[1] : 'outfit';

//     // ✨ Retailer-friendly query
//     let query = `${gender} ${tagSummary || ''} ${color || ''} ${fit || ''} ${category}`;
//     if (isLuxury) query += ' high-end luxury designer';
//     if (isFormal) query += ' formal business tailored';
//     if (isStreet) query += ' streetwear modern';
//     if (isSmartCasual) query += ' smart casual everyday';
//     if (material) query += ` ${material}`;
//     if (season) query += ` ${season} style`;
//     if (vibe) query += ` ${vibe}`;

//     // 🕶️ Seasonal biasing
//     if (tagSummary.includes('fall') || tagSummary.includes('autumn'))
//       query += ' fall warm layers';
//     if (tagSummary.includes('summer')) query += ' lightweight breathable';
//     if (tagSummary.includes('winter')) query += ' cozy layered wool';
//     if (tagSummary.includes('spring')) query += ' light transitional';

//     query = query.replace(/\s+/g, ' ').trim();
//     this.logger.log(`🧩 [ShopBy] Compressed tags → "${tagSummary}"`);
//     this.logger.log(`🧠 [ShopBy] Final query → "${query}"`);

//     try {
//       if (isStreet || isSmartCasual || !isLuxury) {
//         this.logger.log(`🛍️ [ShopBy] ASOS query → "${query}"`);
//         const asos = await this.searchASOS(query);
//         if (asos.length) return asos;
//       }

//       if (isFormal || isLuxury) {
//         this.logger.log(`🎩 [ShopBy] Farfetch query → "${query}"`);
//         const farfetch = await this.searchFarfetch(query);
//         if (farfetch.length) return farfetch;
//       }

//       this.logger.log(`🧭 [ShopBy] SerpAPI fallback query → "${query}"`);
//       const serp = await this.searchSerpApi(query);
//       if (serp.length) return serp;

//       this.logger.warn(`❌ [ShopBy] No results found for "${query}"`);
//       return [];
//     } catch (err) {
//       this.logger.error('ShopBy product search failed:', err);
//       return [];
//     }
//   }
// }

/////////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';
// import { Storage } from '@google-cloud/storage';

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
// }

// @Injectable()
// export class ShopbyProductSearchService {
//   private readonly logger = new Logger(ShopbyProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();
//   private serpCooldownUntil = 0;

//   /* ⚡️ Cache image to GCS */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_shop_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);
//       await file.save(buffer, {
//         contentType: 'image/jpeg',
//         resumable: false,
//       });
//       return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl;
//     }
//   }

//   /* 👕 ASOS (Casual / Streetwear / Smart-casual) */
//   private async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=8`;

//     try {
//       const res = await fetch(url, {
//         headers: {
//           'X-RapidAPI-Key': this.rapidKey,
//           'X-RapidAPI-Host': 'asos2.p.rapidapi.com',
//         },
//       });
//       const json = await res.json();
//       const items = json?.products || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items.map(async (p: any) => ({
//           name: p.name,
//           brand: p.brand?.name || 'ASOS',
//           price: p.price?.current?.text,
//           image: await this.cacheImageToGCS(
//             p.imageUrl?.startsWith('http')
//               ? p.imageUrl
//               : `https://${p.imageUrl}`,
//           ),
//           shopUrl: p.url?.startsWith('http')
//             ? p.url
//             : `https://www.asos.com/${p.url}`,
//           source: 'ASOS' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('ASOS search failed:', err);
//       return [];
//     }
//   }

//   /* 🎩 FARFETCH (Luxury / Designer / Formalwear) */
//   private async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited during Farfetch search');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }
//       const json = await res.json();
//       const items = json.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items.slice(0, 6).map(async (i: any) => ({
//           name: i.title,
//           brand: i.source || 'Farfetch',
//           price:
//             i.price || (i.extracted_price ? `$${i.extracted_price}` : null),
//           image: await this.cacheImageToGCS(i.thumbnail || i.serpapi_thumbnail),
//           shopUrl: i.product_link || i.link,
//           source: 'Farfetch' as const,
//         })),
//       );
//     } catch (err) {
//       this.logger.warn('Farfetch search failed:', err);
//       return [];
//     }
//   }

//   /* 🛍️ Google Shopping fallback */
//   private async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey || Date.now() < this.serpCooldownUntil) {
//       this.logger.log('⏸️ Skipping SerpAPI (cooldown active)');
//       return [];
//     }

//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited (429) → cooldown');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12;
//         return [];
//       }

//       const json = await res.json();
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       return await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail && i.link)
//           .slice(0, 6)
//           .map(async (i: any) => ({
//             name: i.title,
//             brand: i.source || 'Google Shopping',
//             price:
//               i.extracted_price !== undefined
//                 ? `$${i.extracted_price}`
//                 : i.price || null,
//             image: await this.cacheImageToGCS(i.thumbnail),
//             shopUrl: i.link,
//             source: 'SerpAPI' as const,
//           })),
//       );
//     } catch (err) {
//       this.logger.warn('SerpAPI fallback failed:', err);
//       return [];
//     }
//   }

//   /* 🎯 Context-aware Shop the Look Search */
//   async search(
//     rawQuery: string,
//     genderHint?: string,
//     tags?: string[],
//   ): Promise<ProductResult[]> {
//     const clean = rawQuery.toLowerCase().trim();
//     const gender =
//       genderHint ||
//       (/(women|female|lady|girl)/i.test(clean)
//         ? 'women'
//         : /(men|male|guy|gent)/i.test(clean)
//           ? 'men'
//           : 'unisex');
//     const tagContext = (tags || []).join(' ').toLowerCase();

//     this.logger.log(
//       `🛍️ [ShopBy] Searching for "${rawQuery}" → gender=${gender}, tags=${tagContext}`,
//     );

//     // Extract descriptors
//     const vibe =
//       /(modern|minimal|neutral|classic|retro|boho|sporty|vintage)/i.exec(
//         tagContext,
//       )?.[0];
//     const color =
//       /(black|white|grey|beige|blue|brown|tan|navy|olive|green|cream|charcoal|ivory|camel)/i.exec(
//         tagContext,
//       )?.[0];
//     const season = /(summer|winter|spring|fall|autumn)/i.exec(tagContext)?.[0];
//     const material =
//       /(cotton|wool|linen|silk|leather|denim|suede|cashmere)/i.exec(
//         tagContext,
//       )?.[0];
//     const fit = /(slim|regular|oversized|relaxed|tailored|cropped)/i.exec(
//       tagContext,
//     )?.[0];

//     const isFormal =
//       /(suit|blazer|tux|loafer|oxford|tailored|formal|business)/i.test(
//         clean + tagContext,
//       );
//     const isLuxury =
//       /(ferragamo|gucci|prada|armani|designer|italian|cashmere|silk|luxury)/i.test(
//         clean + tagContext,
//       );
//     const isStreet =
//       /(street|sneaker|hoodie|cargo|denim|graphic|jogger|puffer|urban)/i.test(
//         clean + tagContext,
//       );
//     const isSmartCasual =
//       /(polo|chino|knit|cardigan|neutral|smart|clean|casual|minimal)/i.test(
//         clean + tagContext,
//       );

//     const categoryMatch = clean.match(
//       /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short|top|bottom|accessory)/,
//     );
//     const category = categoryMatch ? categoryMatch[1] : 'outfit';

//     // ✨ Refined retailer-friendly query
//     let query = `${gender} ${color || ''} ${fit || ''} ${category}`;
//     if (isLuxury) query += ' high-end luxury designer';
//     if (isFormal) query += ' formal business tailored';
//     if (isStreet) query += ' streetwear modern';
//     if (isSmartCasual) query += ' smart casual everyday';
//     if (material) query += ` ${material}`;
//     if (season) query += ` ${season} style`;
//     if (vibe) query += ` ${vibe}`;
//     query = query.replace(/\s+/g, ' ').trim();

//     this.logger.log(`🧠 [ShopBy] Final query → "${query}"`);

//     try {
//       // Prioritize retailer by vibe
//       if (isStreet || isSmartCasual || !isLuxury) {
//         const asos = await this.searchASOS(query);
//         if (asos.length) return asos;
//       }

//       if (isFormal || isLuxury) {
//         const farfetch = await this.searchFarfetch(query);
//         if (farfetch.length) return farfetch;
//       }

//       const serp = await this.searchSerpApi(query);
//       if (serp.length) return serp;

//       this.logger.warn(`❌ [ShopBy] No results found for "${query}"`);
//       return [];
//     } catch (err) {
//       this.logger.error('ShopBy product search failed:', err);
//       return [];
//     }
//   }
// }
