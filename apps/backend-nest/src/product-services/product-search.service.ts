import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

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

  /* 🧠 FARFETCH (via SerpAPI site filter) */
  async searchFarfetch(query: string): Promise<ProductResult[]> {
    if (!this.serpapiKey) {
      this.logger.warn('⚠️ No SERPAPI_KEY found.');
      return [];
    }

    const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
      query,
    )}&api_key=${this.serpapiKey}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      const items = json.shopping_results || [];

      if (!items.length) {
        this.logger.warn(`⚠️ No Farfetch results for "${query}"`);
        return [];
      }

      return items.slice(0, 6).map((i: any) => ({
        name: i.title,
        brand: i.source || 'Farfetch',
        price: i.price || (i.extracted_price ? `$${i.extracted_price}` : null),
        image: i.thumbnail || i.serpapi_thumbnail,
        shopUrl: i.product_link || i.link,
        source: 'Farfetch',
      }));
    } catch (err) {
      this.logger.warn('Farfetch (via SerpAPI) search failed:', err);
      return [];
    }
  }

  /* 👕 ASOS (Streetwear / Casual) */
  async searchASOS(query: string): Promise<ProductResult[]> {
    if (!this.rapidKey) {
      this.logger.warn('⚠️ No RAPIDAPI_KEY found.');
      return [];
    }

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

      if (!items.length) {
        this.logger.warn(`⚠️ No ASOS results for "${query}"`);
        return [];
      }

      return items.map((p: any) => ({
        name: p.name,
        brand: p.brand?.name,
        price: p.price?.current?.text,
        image: p.imageUrl?.startsWith('http')
          ? p.imageUrl
          : `https://${p.imageUrl}`,
        shopUrl: p.url?.startsWith('http')
          ? p.url
          : `https://www.asos.com/${p.url}`,
        source: 'ASOS',
      }));
    } catch (err) {
      this.logger.warn('ASOS search failed:', err);
      return [];
    }
  }

  /* 🛍️ GOOGLE SHOPPING (SerpAPI — general fallback) */
  async searchSerpApi(query: string): Promise<ProductResult[]> {
    if (!this.serpapiKey) {
      this.logger.warn('⚠️ No SERPAPI_KEY found.');
      return [];
    }

    const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
      query,
    )}&api_key=${this.serpapiKey}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      const items = json?.shopping_results || [];

      if (!items.length) {
        this.logger.warn(`⚠️ No SerpAPI fallback results for "${query}"`);
        return [];
      }

      return items
        .filter((i: any) => i.thumbnail && i.link)
        .slice(0, 6)
        .map((i: any) => ({
          name: i.title,
          brand: i.source,
          price:
            i.extracted_price !== undefined
              ? `$${i.extracted_price}`
              : i.price || null,
          image:
            i.thumbnail ||
            'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
          shopUrl: i.link,
          source: 'SerpAPI',
        }));
    } catch (err) {
      this.logger.warn('SerpAPI fallback failed:', err);
      return [];
    }
  }

  /* 🔄 Smart Combined Search — Premium First */
  async search(query: string): Promise<ProductResult[]> {
    this.logger.log(`🛒 Searching for: ${query}`);

    // 1️⃣ Farfetch (premium designer)
    const farfetch = await this.searchFarfetch(query);
    if (farfetch.length > 0) {
      this.logger.log(`✅ Found ${farfetch.length} items on Farfetch`);
      return farfetch;
    }

    // 2️⃣ ASOS (mainstream streetwear)
    const asos = await this.searchASOS(query);
    if (asos.length > 0) {
      this.logger.log(`✅ Found ${asos.length} items on ASOS`);
      return asos;
    }

    // 3️⃣ SerpAPI (universal fallback)
    const serp = await this.searchSerpApi(query);
    if (serp.length > 0) {
      this.logger.log(`✅ Found ${serp.length} fallback items on SerpAPI`);
      return serp;
    }

    this.logger.warn(`❌ No results found for "${query}"`);
    return [];
  }
}

///////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';

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

//   /* 🛍️ GOOGLE SHOPPING (SerpAPI — always public images) */
//   async searchSerpApi(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) {
//       this.logger.warn('⚠️ No SERPAPI_KEY found.');
//       return [];
//     }

//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&q=${encodeURIComponent(
//       query,
//     )}&api_key=${this.serpapiKey}`;

//     try {
//       const res = await fetch(url);
//       const json = await res.json();
//       const items = json?.shopping_results || [];

//       if (!items.length) {
//         this.logger.warn(`⚠️ No SerpAPI results for "${query}"`);
//         return [];
//       }

//       return items
//         .filter((i: any) => i.thumbnail && i.link)
//         .slice(0, 6)
//         .map((i: any) => ({
//           name: i.title,
//           brand: i.source,
//           price:
//             i.extracted_price !== undefined
//               ? `$${i.extracted_price}`
//               : i.price || null,
//           image:
//             i.thumbnail ||
//             'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//           shopUrl: i.link,
//         }));
//     } catch (err) {
//       this.logger.warn('SerpAPI search failed:', err);
//       return [];
//     }
//   }

//   /* 🧠 FARFETCH (via SerpAPI site filter) */
//   async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.serpapiKey) {
//       this.logger.warn('⚠️ No SERPAPI_KEY found.');
//       return [];
//     }

//     const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(query)}&api_key=${this.serpapiKey}`;
//     try {
//       const res = await fetch(url);
//       const json = await res.json();
//       const items = json.shopping_results || [];
//       return items.map((i: any) => ({
//         name: i.title,
//         brand: i.source,
//         price: i.price || (i.extracted_price ? `$${i.extracted_price}` : null),
//         image: i.thumbnail || i.serpapi_thumbnail,
//         shopUrl: i.product_link || i.link,
//       }));
//     } catch (err) {
//       this.logger.warn('Farfetch (via SerpAPI) search failed:', err);
//       return [];
//     }
//   }

//   /* 👕 ASOS (Streetwear / Casual) */
//   async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) {
//       this.logger.warn('⚠️ No RAPIDAPI_KEY found.');
//       return [];
//     }

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

//       return items.map((p: any) => ({
//         name: p.name,
//         brand: p.brand?.name,
//         price: p.price?.current?.text,
//         image: p.imageUrl?.startsWith('http')
//           ? p.imageUrl
//           : `https://${p.imageUrl}`,
//         shopUrl: p.url?.startsWith('http')
//           ? p.url
//           : `https://www.asos.com/${p.url}`,
//       }));
//     } catch (err) {
//       this.logger.warn('ASOS search failed:', err);
//       return [];
//     }
//   }

//   /* 🔄 Combined Smart Search */
//   async search(query: string): Promise<ProductResult[]> {
//     this.logger.log(`🛒 Searching for: ${query}`);

//     // ✅ 1️⃣ Try SerpAPI first (always works, best images)
//     const serp = await this.searchSerpApi(query);
//     if (serp.length > 0) {
//       this.logger.log(`✅ Found ${serp.length} items on SerpAPI`);
//       return serp;
//     }

//     // 2️⃣ Then Farfetch (premium)
//     const farfetch = await this.searchFarfetch(query);
//     if (farfetch.length > 0) {
//       this.logger.log(`✅ Found ${farfetch.length} items on Farfetch`);
//       return farfetch;
//     }

//     // 3️⃣ Finally ASOS (streetwear)
//     const asos = await this.searchASOS(query);
//     if (asos.length > 0) {
//       this.logger.log(`✅ Found ${asos.length} items on ASOS`);
//       return asos;
//     }

//     this.logger.warn(`❌ No results found for "${query}"`);
//     return [];
//   }
// }

///////////////

// import { Injectable, Logger } from '@nestjs/common';
// import fetch from 'node-fetch';

// export interface ProductResult {
//   name: string;
//   brand?: string;
//   price?: string;
//   image: string;
//   shopUrl: string;
// }

// @Injectable()
// export class ProductSearchService {
//   private readonly logger = new Logger(ProductSearchService.name);
//   private readonly rapidKey = process.env.RAPIDAPI_KEY;

//   /* 🧠 Farfetch (Premium, Trendy) */
//   async searchFarfetch(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) {
//       this.logger.warn('No RAPIDAPI_KEY found.');
//       return [];
//     }

//     const url = `https://farfetch1.p.rapidapi.com/v1/search/${encodeURIComponent(
//       query,
//     )}`;
//     try {
//       const res = await fetch(url, {
//         headers: {
//           'X-RapidAPI-Key': this.rapidKey,
//           'X-RapidAPI-Host': 'farfetch1.p.rapidapi.com',
//         },
//       });
//       const json = await res.json();

//       const items = json?.results || [];
//       return items.map((i: any) => ({
//         name: i.shortDescription,
//         brand: i.brand?.name,
//         price: i.price?.formattedValue,
//         image: i.images?.[0]?.url,
//         shopUrl: i.url,
//       }));
//     } catch (err) {
//       this.logger.warn('Farfetch search failed:', err);
//       return [];
//     }
//   }

//   /* 🛍️ ASOS (Casual, Streetwear) */
//   async searchASOS(query: string): Promise<ProductResult[]> {
//     if (!this.rapidKey) {
//       this.logger.warn('No RAPIDAPI_KEY found.');
//       return [];
//     }

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
//       return items.map((p: any) => ({
//         name: p.name,
//         brand: p.brand?.name,
//         price: p.price?.current?.text,
//         image: p.imageUrl?.startsWith('http')
//           ? p.imageUrl
//           : `https://${p.imageUrl}`,
//         shopUrl: `https://www.asos.com/${p.url}`,
//       }));
//     } catch (err) {
//       this.logger.warn('ASOS search failed:', err);
//       return [];
//     }
//   }

//   /* 🔄 Combined Search */
//   async search(query: string): Promise<ProductResult[]> {
//     const farfetch = await this.searchFarfetch(query);
//     if (farfetch.length > 0) {
//       this.logger.log(`✅ Found ${farfetch.length} items on Farfetch`);
//       return farfetch;
//     }

//     const asos = await this.searchASOS(query);
//     if (asos.length > 0) {
//       this.logger.log(`✅ Found ${asos.length} items on ASOS`);
//       return asos;
//     }

//     this.logger.warn(`❌ No results found for "${query}"`);
//     return [];
//   }
// }
