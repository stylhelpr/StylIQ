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
    const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
      query,
    )}&api_key=${this.serpapiKey}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      const items = json?.shopping_results || [];
      if (!items.length) return [];

      const mapped = await Promise.all(
        items
          .filter((i: any) => i.thumbnail && i.link)
          .slice(0, 6)
          .map(async (i: any) => ({
            name: i.title,
            brand: i.source,
            price:
              i.extracted_price !== undefined
                ? `$${i.extracted_price}`
                : i.price || null,
            image: await this.cacheImageToGCS(
              i.thumbnail ||
                'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
            ),
            shopUrl: i.link,
            source: 'SerpAPI' as const,
          })),
      );
      return mapped;
    } catch (err) {
      this.logger.warn('SerpAPI fallback failed:', err);
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
