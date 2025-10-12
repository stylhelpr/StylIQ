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
//      🧠 Core Search Logic
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
//     const tagContext = (tags || []).join(' ').toLowerCase();
//     const tagSummary = this.compressTags(tags || []);
//     this.logger.log(`🧩 [ShopBy] Compressed tags → "${tagSummary}"`);

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

//       // 🔁 Retry simplified query
//       const simplified = this.simplifyQuery(rawQuery);
//       if (simplified !== rawQuery) {
//         const retry = await this.searchCore(simplified, genderHint, tags);
//         if (retry.length) {
//           this.setCache(rawQuery, retry);
//           return retry;
//         }
//       }

//       // 🧭 Trend-based fallback
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
