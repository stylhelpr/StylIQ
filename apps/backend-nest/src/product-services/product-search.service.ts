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
      });
      return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
    } catch (e) {
      this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
      return imageUrl;
    }
  }

  /* 🧠 FARFETCH (Luxury / Designer / Formal) */
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

  /* 👕 ASOS (Streetwear / Everyday) */
  async searchASOS(query: string): Promise<ProductResult[]> {
    if (!this.rapidKey) return [];
    const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
      query,
    )}&offset=0&limit=6`;

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
      return mapped;
    } catch (err) {
      this.logger.warn('ASOS search failed:', err);
      return [];
    }
  }

  /* 🛍️ GOOGLE SHOPPING (General / Fallback) */
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
      return mapped;
    } catch (err) {
      this.logger.warn('SerpAPI fallback failed:', err);
      return [];
    }
  }

  /* 🎯 Context-Aware Combined Search */
  async search(rawQuery: string): Promise<ProductResult[]> {
    this.logger.log(`🛒 Searching for: ${rawQuery}`);

    const clean = rawQuery.toLowerCase().trim();

    // 🧩 Extract gender
    const gender = /(women|female|lady|girl)/i.test(clean) ? 'women' : 'men';

    // 🧩 Identify context
    const isFormal = /(suit|blazer|tux|loafer|oxford|formal|tailored)/i.test(
      clean,
    );
    const isLuxury =
      /(ferragamo|gucci|prada|armani|italian|cashmere|silk|wool)/i.test(clean);
    const isStreet =
      /(hoodie|cargo|sneaker|street|graphic|denim|tee|jogger|puffer)/i.test(
        clean,
      );
    const isSmartCasual = /(chino|polo|knit|cardigan|overshirt|casual)/i.test(
      clean,
    );

    // 🧩 Detect main category
    const categoryMatch = clean.match(
      /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short)/,
    );
    const category = categoryMatch ? categoryMatch[1] : 'outfit';

    // 🪄 Build enriched retailer-friendly query
    let query = `${gender} ${category}`;
    if (isLuxury) query += ' luxury designer';
    if (isFormal) query += ' formal classic elegant';
    if (isStreet) query += ' streetwear casual';
    if (isSmartCasual) query += ' smart casual';
    if (!isFormal && !isStreet && !isSmartCasual && !isLuxury)
      query += ' fashion outfit';

    this.logger.log(`🧠 Enriched search phrase: "${query}"`);

    try {
      // 🎩 Farfetch first for luxury/formal
      if (isLuxury || isFormal) {
        const farfetch = await this.searchFarfetch(query);
        if (farfetch.length) return farfetch;
      }

      // 👕 ASOS for streetwear and casual
      if (isStreet || isSmartCasual) {
        const asos = await this.searchASOS(query);
        if (asos.length) return asos;
      }

      // 🧢 If uncertain → parallel search
      const [asos, farfetch] = await Promise.all([
        this.searchASOS(query),
        this.searchFarfetch(query),
      ]);

      const combined = [...asos, ...farfetch];
      if (combined.length) return combined.slice(0, 6);

      // 🛍 Fallback to Google Shopping
      const serp = await this.searchSerpApi(query);
      if (serp.length) return serp;

      this.logger.warn(`❌ No products found for "${query}"`);
      return [];
    } catch (err) {
      this.logger.error('Product search failed:', err);
      return [];
    }
  }
}

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
//       });
//       return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
//     } catch (e) {
//       this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
//       return imageUrl;
//     }
//   }

//   /* 🧠 FARFETCH (Luxury / Designer / Formal) */
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

//   /* 👕 ASOS (Streetwear / Everyday) */
//   async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) return [];
//     const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
//       query,
//     )}&offset=0&limit=6`;

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

//   /* 🛍️ GOOGLE SHOPPING (General / Fallback) */
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

//   /* 🎯 Context-Aware Combined Search */
//   async search(rawQuery: string): Promise<ProductResult[]> {
//     this.logger.log(`🛒 Searching for: ${rawQuery}`);

//     const clean = rawQuery.toLowerCase().trim();

//     // 🧩 Extract gender
//     const gender = /(women|female|lady|girl)/i.test(clean) ? 'women' : 'men';

//     // 🧩 Identify context
//     const isFormal = /(suit|blazer|tux|loafer|oxford|formal|tailored)/i.test(
//       clean,
//     );
//     const isLuxury =
//       /(ferragamo|gucci|prada|armani|italian|cashmere|silk|wool)/i.test(clean);
//     const isStreet =
//       /(hoodie|cargo|sneaker|street|graphic|denim|tee|jogger|puffer)/i.test(
//         clean,
//       );
//     const isSmartCasual = /(chino|polo|knit|cardigan|overshirt|casual)/i.test(
//       clean,
//     );

//     // 🧩 Detect main category
//     const categoryMatch = clean.match(
//       /(blazer|suit|shirt|tee|trouser|jean|jacket|coat|dress|shoe|sneaker|loafer|skirt|bag|polo|sweater|hoodie|cargo|short)/,
//     );
//     const category = categoryMatch ? categoryMatch[1] : 'outfit';

//     // 🪄 Build enriched retailer-friendly query
//     let query = `${gender} ${category}`;
//     if (isLuxury) query += ' luxury designer';
//     if (isFormal) query += ' formal classic elegant';
//     if (isStreet) query += ' streetwear casual';
//     if (isSmartCasual) query += ' smart casual';
//     if (!isFormal && !isStreet && !isSmartCasual && !isLuxury)
//       query += ' fashion outfit';

//     this.logger.log(`🧠 Enriched search phrase: "${query}"`);

//     try {
//       // 🎩 Farfetch first for luxury/formal
//       if (isLuxury || isFormal) {
//         const farfetch = await this.searchFarfetch(query);
//         if (farfetch.length) return farfetch;
//       }

//       // 👕 ASOS for streetwear and casual
//       if (isStreet || isSmartCasual) {
//         const asos = await this.searchASOS(query);
//         if (asos.length) return asos;
//       }

//       // 🧢 If uncertain → parallel search
//       const [asos, farfetch] = await Promise.all([
//         this.searchASOS(query),
//         this.searchFarfetch(query),
//       ]);

//       const combined = [...asos, ...farfetch];
//       if (combined.length) return combined.slice(0, 6);

//       // 🛍 Fallback to Google Shopping
//       const serp = await this.searchSerpApi(query);
//       if (serp.length) return serp;

//       this.logger.warn(`❌ No products found for "${query}"`);
//       return [];
//     } catch (err) {
//       this.logger.error('Product search failed:', err);
//       return [];
//     }
//   }
// }
