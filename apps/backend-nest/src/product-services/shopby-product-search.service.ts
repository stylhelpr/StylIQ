///////////////////

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

      return await Promise.all(
        items.map(async (p: any) => ({
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

  /* 🎯 Context-aware Shop the Look Search (fixed) */
  async search(
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

    this.logger.log(
      `🛍️ [ShopBy] Searching for "${rawQuery}" → gender=${gender}, tags=${tagContext}`,
    );

    // Extract descriptors
    const vibe =
      /(modern|minimal|neutral|classic|retro|boho|sporty|vintage)/i.exec(
        tagContext,
      )?.[0];
    const color =
      /(black|white|grey|beige|blue|brown|tan|navy|olive|green|cream|charcoal|ivory|camel)/i.exec(
        tagContext,
      )?.[0];
    const season = /(summer|winter|spring|fall|autumn)/i.exec(tagContext)?.[0];
    const material =
      /(cotton|wool|linen|silk|leather|denim|suede|cashmere)/i.exec(
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

    // 🧩 Instead of forcing a category fallback, keep the user query if no match
    const categoryMatch = clean.match(
      /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short|top|bottom|accessory)/,
    );
    const category = categoryMatch ? categoryMatch[1] : '';

    // ✅ Preserve the full query context instead of replacing it
    let query = `${gender} ${clean} ${tagContext} ${color || ''} ${fit || ''} ${category}`;
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
      // Prioritize retailer by vibe
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
}

////////////////////

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

////////////////////

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
//   private serpCooldownUntil = 0; // 🧠 cooldown after rate-limit

//   /* ⚡️ Cache image to GCS so React Native can render it reliably */
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

//   /* 👕 ASOS (Casual / Everyday) */
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

//       const mapped = await Promise.all(
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
//       return mapped;
//     } catch (err) {
//       this.logger.warn('ASOS search failed:', err);
//       return [];
//     }
//   }

//   /* 🧠 FARFETCH (Luxury / Designer / Formal) */
//   private async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       if (res.status === 429) {
//         this.logger.warn('🚫 SerpAPI rate-limited during Farfetch search');
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12; // 12h cooldown
//         return [];
//       }
//       const json = await res.json();
//       const items = json.shopping_results || [];
//       if (!items.length) return [];

//       const mapped = await Promise.all(
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
//       return mapped;
//     } catch (err) {
//       this.logger.warn('Farfetch search failed:', err);
//       return [];
//     }
//   }

//   /* 🛍️ GOOGLE SHOPPING (General / Fallback) */
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
//         this.serpCooldownUntil = Date.now() + 1000 * 60 * 60 * 12; // 12h cooldown
//         return [];
//       }

//       const json = await res.json();
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       const mapped = await Promise.all(
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
//       return mapped;
//     } catch (err) {
//       this.logger.warn('SerpAPI fallback failed:', err);
//       return [];
//     }
//   }

//   /* 🎯 Shop the Look Combined Search — gender + tags aware */
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

//     const isFormal =
//       /(suit|blazer|tux|loafer|oxford|formal|tailored|business)/i.test(
//         clean + tagContext,
//       );
//     const isLuxury =
//       /(ferragamo|gucci|prada|armani|designer|italian|cashmere|silk|wool|luxury)/i.test(
//         clean + tagContext,
//       );
//     const isStreet =
//       /(hoodie|cargo|sneaker|street|graphic|denim|tee|jogger|puffer|urban)/i.test(
//         clean + tagContext,
//       );
//     const isSmartCasual =
//       /(chino|polo|knit|cardigan|overshirt|minimal|neutral|smart|clean|casual)/i.test(
//         clean + tagContext,
//       );

//     const categoryMatch = clean.match(
//       /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short|top|bottom|accessory)/,
//     );
//     const category = categoryMatch ? categoryMatch[1] : 'outfit';

//     let query = `${gender} ${category}`;
//     if (isLuxury) query += ' luxury designer';
//     if (isFormal) query += ' formal elegant tailored';
//     if (isStreet) query += ' streetwear modern';
//     if (isSmartCasual) query += ' smart casual polished';
//     if (!isLuxury && !isFormal && !isStreet && !isSmartCasual)
//       query += ' fashion outfit';

//     this.logger.log(`🧠 [ShopBy] Enriched query → "${query}"`);

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
// }
