import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { Storage } from '@google-cloud/storage';

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
//   title?: string; // ✅ Added — some APIs return `title` instead of `name`
//   color?: string; // ✅ Added — helps with filtering and display
//   fit?: string; // ✅ Optional, used for profile filtering
//   description?: string; // ✅ Optional, for match scoring
// }

export interface ProductResult {
  name: string;
  brand?: string;
  price?: string;
  image: string;
  shopUrl: string;
  source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';

  // 🧩 Optional meta fields
  title?: string; // some APIs return `title` instead of `name`
  color?: string; // helps with filtering and display
  fit?: string; // used for profile filtering
  description?: string; // used for match scoring

  // 🖼️ Additional image variant fields from various APIs
  image_url?: string;
  thumbnail?: string;
  serpapi_thumbnail?: string;
  thumbnail_url?: string;
  img?: string;

  // 🧠 SerpAPI nested result structure
  result?: {
    thumbnail?: string;
    serpapi_thumbnail?: string;
  };
}

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);
  private readonly rapidKey = process.env.RAPIDAPI_KEY;
  private readonly serpapiKey = process.env.SERPAPI_KEY;
  private readonly bucketName =
    process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
  private readonly storage = new Storage();

  /* ⚡️ Cache image to GCS so React Native can render it reliably */
  private async cacheImageToGCS(imageUrl?: string): Promise<string> {
    if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const fileName = `cached_ai_images/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`;
      const file = this.storage.bucket(this.bucketName).file(fileName);

      await file.save(buffer, {
        contentType: 'image/jpeg',
        resumable: false,
        // public: true,
      });

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
      return publicUrl;
    } catch (e) {
      this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
      return imageUrl; // fallback
    }
  }

  /* 🧠 FARFETCH (via SerpAPI site filter) */
  async searchFarfetch(query: string): Promise<ProductResult[]> {
    if (!this.serpapiKey) return [];
    const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
      query,
    )}&api_key=${this.serpapiKey}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      const items = json.shopping_results || [];
      if (!items.length) return [];

      const mapped = await Promise.all(
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
      return mapped;
    } catch (err) {
      this.logger.warn('Farfetch search failed:', err);
      return [];
    }
  }

  /* 👕 ASOS (Streetwear / Casual) */
  async searchASOS(query: string): Promise<ProductResult[]> {
    if (!this.rapidKey) return [];
    const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
      query,
    )}&offset=0&limit=5`;

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

      const mapped = await Promise.all(
        items.map(async (p: any) => ({
          name: p.name,
          brand: p.brand?.name,
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
      return mapped;
    } catch (err) {
      this.logger.warn('ASOS search failed:', err);
      return [];
    }
  }

  /* 🛍️ GOOGLE SHOPPING (SerpAPI — general fallback) */

  async searchSerpApi(query: string): Promise<ProductResult[]> {
    if (!this.serpapiKey) return [];
    const baseUrl = 'https://serpapi.com/search.json';
    const params = new URLSearchParams({
      engine: 'google_shopping',
      gl: 'us',
      hl: 'en',
      q: query,
      api_key: this.serpapiKey,
    });

    try {
      this.logger.log(`🛒 [SerpAPI] Searching → ${query}`);
      const url = `${baseUrl}?${params.toString()}`;
      const res = await fetch(url);
      this.logger.log(`📦 SerpAPI status: ${res.status}`);
      const json = await res.json();

      let results = json.shopping_results || [];

      // 🔁 If Google Shopping rejected the query → retry simplified version
      if (!results.length && query.includes('-women')) {
        const simplifiedQuery = `men ${query
          .replace(/-women|-womens|-female|-girls|-ladies/gi, '')
          .trim()}`;

        this.logger.warn(
          `[SerpAPI] Empty payload → retrying simplified query: ${simplifiedQuery}`,
        );

        const retryParams = new URLSearchParams({
          engine: 'google_shopping',
          gl: 'us',
          hl: 'en',
          q: simplifiedQuery,
          api_key: this.serpapiKey,
        });
        const retryRes = await fetch(`${baseUrl}?${retryParams.toString()}`);
        const retryJson = await retryRes.json();
        results = retryJson.shopping_results || [];
      }

      // 🧠 Normalize to array
      const items = Array.isArray(results)
        ? results
        : results?.results ||
          json?.organic_results ||
          json?.inline_products ||
          [];

      if (!items.length) {
        this.logger.warn('[SerpAPI] Returned no usable shopping_results');
        return [];
      }

      // 🚫 Filter out any female/unisex listings before mapping
      const filtered = items.filter(
        (i: any) =>
          !/women|female|ladies|girl/i.test(
            `${i.title ?? ''} ${i.source ?? ''} ${i.merchant ?? ''}`.toLowerCase(),
          ),
      );

      // 🖼️ Map & cache top results
      const mapped = await Promise.all(
        filtered
          .filter((i: any) => i.thumbnail || i.serpapi_thumbnail || i.image)
          .slice(0, 6)
          .map(async (i: any) => {
            const imgUrl =
              i.thumbnail ||
              i.serpapi_thumbnail ||
              i.image ||
              i.image_url ||
              i.result?.thumbnail ||
              i.result?.serpapi_thumbnail ||
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';

            return {
              name: i.title || i.name || i.product_title,
              brand: i.source || i.store || i.merchant || 'Unknown',
              price:
                i.extracted_price !== undefined
                  ? `$${i.extracted_price}`
                  : i.price || null,
              image: await this.cacheImageToGCS(imgUrl),
              shopUrl: i.link || i.product_link || i.serpapi_product_api || '',
              source: 'SerpAPI' as const,
            };
          }),
      );

      return mapped;
    } catch (err) {
      this.logger.warn('⚠️ [SerpAPI] Search failed:', err);
      return [];
    }
  }

  /* 🔄 Smart Combined Search — Premium First */
  async search(query: string): Promise<ProductResult[]> {
    this.logger.log(`🛒 Searching for: ${query}`);

    const farfetch = await this.searchFarfetch(query);
    if (farfetch.length > 0) return farfetch;

    const asos = await this.searchASOS(query);
    if (asos.length > 0) return asos;

    const serp = await this.searchSerpApi(query);
    if (serp.length > 0) return serp;

    this.logger.warn(`❌ No results found for "${query}"`);
    return [];
  }
}

////////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';
// import { Storage } from '@google-cloud/storage';

// // export interface ProductResult {
// //   name: string;
// //   brand?: string;
// //   price?: string;
// //   image: string;
// //   shopUrl: string;
// //   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
// //   title?: string; // ✅ Added — some APIs return `title` instead of `name`
// //   color?: string; // ✅ Added — helps with filtering and display
// //   fit?: string; // ✅ Optional, used for profile filtering
// //   description?: string; // ✅ Optional, for match scoring
// // }

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';

//   // 🧩 Optional meta fields
//   title?: string; // some APIs return `title` instead of `name`
//   color?: string; // helps with filtering and display
//   fit?: string; // used for profile filtering
//   description?: string; // used for match scoring

//   // 🖼️ Additional image variant fields from various APIs
//   image_url?: string;
//   thumbnail?: string;
//   serpapi_thumbnail?: string;
//   thumbnail_url?: string;
//   img?: string;

//   // 🧠 SerpAPI nested result structure
//   result?: {
//     thumbnail?: string;
//     serpapi_thumbnail?: string;
//   };
// }

// @Injectable()
// export class ProductSearchService {
//   private readonly logger = new Logger(ProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();

//   /* ⚡️ Cache image to GCS so React Native can render it reliably */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_ai_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);

//       await file.save(buffer, {
//         contentType: 'image/jpeg',
//         resumable: false,
//         // public: true,
//       });

//       const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//       return publicUrl;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl; // fallback
//     }
//   }

//   /* 🧠 FARFETCH (via SerpAPI site filter) */
//   async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
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

//   /* 👕 ASOS (Streetwear / Casual) */
//   async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=5`;

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
//           brand: p.brand?.name,
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

//   /* 🛍️ GOOGLE SHOPPING (SerpAPI — general fallback) */
//   async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       console.log('🔑 SERPAPI key loaded?', !!this.serpapiKey);
//       console.log('🌐 SerpAPI URL:', url);
//       const res = await fetch(url);
//       console.log('📦 SerpAPI status:', res.status);
//       const json = await res.json();
//       console.log(
//         '🖼️ sample:',
//         JSON.stringify(json.shopping_results?.slice(0, 2), null, 2),
//       );
//       const rawItems =
//         json?.shopping_results ||
//         json?.shopping_results?.results ||
//         json?.organic_results ||
//         json?.inline_products ||
//         [];

//       const items = Array.isArray(rawItems) ? rawItems : [];

//       if (!items.length) {
//         this.logger.warn('SerpAPI returned empty shopping_results payload');
//         return [];
//       }

//       const mapped = await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail || i.serpapi_thumbnail || i.image)
//           .slice(0, 6)
//           .map(async (i: any) => {
//             const imgUrl =
//               i.thumbnail ||
//               i.serpapi_thumbnail ||
//               i.image ||
//               i.image_url ||
//               i.result?.thumbnail ||
//               i.result?.serpapi_thumbnail ||
//               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';

//             return {
//               name: i.title || i.name || i.product_title,
//               brand: i.source || i.store || i.merchant || 'Unknown',
//               price:
//                 i.extracted_price !== undefined
//                   ? `$${i.extracted_price}`
//                   : i.price || null,
//               image: await this.cacheImageToGCS(imgUrl),
//               shopUrl: i.link || i.product_link || i.serpapi_product_api || '',
//               source: 'SerpAPI' as const,
//             };
//           }),
//       );

//       return mapped;
//     } catch (err) {
//       this.logger.warn('SerpAPI fallback failed:', err);
//       return [];
//     }
//   }

//   /* 🔄 Smart Combined Search — Premium First */
//   async search(query: string): Promise<ProductResult[]> {
//     this.logger.log(`🛒 Searching for: ${query}`);

//     const farfetch = await this.searchFarfetch(query);
//     if (farfetch.length > 0) return farfetch;

//     const asos = await this.searchASOS(query);
//     if (asos.length > 0) return asos;

//     const serp = await this.searchSerpApi(query);
//     if (serp.length > 0) return serp;

//     this.logger.warn(`❌ No results found for "${query}"`);
//     return [];
//   }
// }

////////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';
// import { Storage } from '@google-cloud/storage';

// // export interface ProductResult {
// //   name: string;
// //   brand?: string;
// //   price?: string;
// //   image: string;
// //   shopUrl: string;
// //   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
// //   title?: string; // ✅ Added — some APIs return `title` instead of `name`
// //   color?: string; // ✅ Added — helps with filtering and display
// //   fit?: string; // ✅ Optional, used for profile filtering
// //   description?: string; // ✅ Optional, for match scoring
// // }

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
//   source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';

//   // 🧩 Optional meta fields
//   title?: string; // some APIs return `title` instead of `name`
//   color?: string; // helps with filtering and display
//   fit?: string; // used for profile filtering
//   description?: string; // used for match scoring

//   // 🖼️ Additional image variant fields from various APIs
//   image_url?: string;
//   thumbnail?: string;
//   serpapi_thumbnail?: string;
//   thumbnail_url?: string;
//   img?: string;

//   // 🧠 SerpAPI nested result structure
//   result?: {
//     thumbnail?: string;
//     serpapi_thumbnail?: string;
//   };
// }

// @Injectable()
// export class ProductSearchService {
//   private readonly logger = new Logger(ProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();

//   /* ⚡️ Cache image to GCS so React Native can render it reliably */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_ai_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);

//       await file.save(buffer, {
//         contentType: 'image/jpeg',
//         resumable: false,
//         // public: true,
//       });

//       const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//       return publicUrl;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl; // fallback
//     }
//   }

//   /* 🧠 FARFETCH (via SerpAPI site filter) */
//   async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
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

//   /* 👕 ASOS (Streetwear / Casual) */
//   async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=5`;

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
//           brand: p.brand?.name,
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

//   /* 🛍️ GOOGLE SHOPPING (SerpAPI — general fallback) */
//   async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       console.log('🔑 SERPAPI key loaded?', !!this.serpapiKey);
//       console.log('🌐 SerpAPI URL:', url);
//       const res = await fetch(url);
//       console.log('📦 SerpAPI status:', res.status);
//       const json = await res.json();
//       console.log(
//         '🖼️ sample:',
//         JSON.stringify(json.shopping_results?.slice(0, 2), null, 2),
//       );
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       const mapped = await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail && i.link)
//           .slice(0, 6)
//           .map(async (i: any) => ({
//             name: i.title,
//             brand: i.source,
//             price:
//               i.extracted_price !== undefined
//                 ? `$${i.extracted_price}`
//                 : i.price || null,
//             image: await this.cacheImageToGCS(
//               i.thumbnail ||
//                 i.serpapi_thumbnail ||
//                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//             ),
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

//   /* 🔄 Smart Combined Search — Premium First */
//   async search(query: string): Promise<ProductResult[]> {
//     this.logger.log(`🛒 Searching for: ${query}`);

//     const farfetch = await this.searchFarfetch(query);
//     if (farfetch.length > 0) return farfetch;

//     const asos = await this.searchASOS(query);
//     if (asos.length > 0) return asos;

//     const serp = await this.searchSerpApi(query);
//     if (serp.length > 0) return serp;

//     this.logger.warn(`❌ No results found for "${query}"`);
//     return [];
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
// export class ProductSearchService {
//   private readonly logger = new Logger(ProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();

//   /* ⚡️ Cache image to GCS so React Native can render it reliably */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_ai_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);

//       await file.save(buffer, {
//         contentType: 'image/jpeg',
//         resumable: false,
//         // public: true,
//       });

//       const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//       return publicUrl;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl; // fallback
//     }
//   }

//   /* 🧠 FARFETCH (via SerpAPI site filter) */
//   async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
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

//   /* 👕 ASOS (Streetwear / Casual) */
//   async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=5`;

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
//           brand: p.brand?.name,
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

//   /* 🛍️ GOOGLE SHOPPING (SerpAPI — general fallback) */
//   async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       const json = await res.json();
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       const mapped = await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail && i.link)
//           .slice(0, 6)
//           .map(async (i: any) => ({
//             name: i.title,
//             brand: i.source,
//             price:
//               i.extracted_price !== undefined
//                 ? `$${i.extracted_price}`
//                 : i.price || null,
//             image: await this.cacheImageToGCS(
//               i.thumbnail ||
//                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//             ),
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

//   /* 🔄 Smart Combined Search — Premium First */
//   async search(query: string): Promise<ProductResult[]> {
//     this.logger.log(`🛒 Searching for: ${query}`);

//     const farfetch = await this.searchFarfetch(query);
//     if (farfetch.length > 0) return farfetch;

//     const asos = await this.searchASOS(query);
//     if (asos.length > 0) return asos;

//     const serp = await this.searchSerpApi(query);
//     if (serp.length > 0) return serp;

//     this.logger.warn(`❌ No results found for "${query}"`);
//     return [];
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
// export class ProductSearchService {
//   private readonly logger = new Logger(ProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;
//   private readonly serpapiKey = process.env.SERPAPI_KEY;
//   private readonly bucketName =
//     process.env.GCS_BUCKET || 'stylhelpr-prod-bucket';
//   private readonly storage = new Storage();

//   /* ⚡️ Cache image to GCS so React Native can render it reliably */
//   private async cacheImageToGCS(imageUrl?: string): Promise<string> {
//     if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
//     try {
//       const res = await fetch(imageUrl);
//       if (!res.ok) throw new Error(`fetch ${res.status}`);
//       const buffer = Buffer.from(await res.arrayBuffer());
//       const fileName = `cached_ai_images/${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2)}.jpg`;
//       const file = this.storage.bucket(this.bucketName).file(fileName);

//       await file.save(buffer, {
//         contentType: 'image/jpeg',
//         resumable: false,
//         // public: true,
//       });

//       const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//       return publicUrl;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl; // fallback
//     }
//   }

//   /* 🧠 FARFETCH (via SerpAPI site filter) */
//   async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
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

//   /* 👕 ASOS (Streetwear / Casual) */
//   async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=5`;

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
//           brand: p.brand?.name,
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

//   /* 🛍️ GOOGLE SHOPPING (SerpAPI — general fallback) */
//   async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) return [];
//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       const json = await res.json();
//       const items = json?.shopping_results || [];
//       if (!items.length) return [];

//       const mapped = await Promise.all(
//         items
//           .filter((i: any) => i.thumbnail && i.link)
//           .slice(0, 6)
//           .map(async (i: any) => ({
//             name: i.title,
//             brand: i.source,
//             price:
//               i.extracted_price !== undefined
//                 ? `$${i.extracted_price}`
//                 : i.price || null,
//             image: await this.cacheImageToGCS(
//               i.thumbnail ||
//                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//             ),
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

//   /* 🔄 Smart Combined Search — Premium First */
//   async search(query: string): Promise<ProductResult[]> {
//     this.logger.log(`🛒 Searching for: ${query}`);

//     const farfetch = await this.searchFarfetch(query);
//     if (farfetch.length > 0) return farfetch;

//     const asos = await this.searchASOS(query);
//     if (asos.length > 0) return asos;

//     const serp = await this.searchSerpApi(query);
//     if (serp.length > 0) return serp;

//     this.logger.warn(`❌ No results found for "${query}"`);
//     return [];
//   }
// }
