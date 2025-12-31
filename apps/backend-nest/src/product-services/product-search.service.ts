import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { Storage } from '@google-cloud/storage';
import { getSecret, secretExists } from '../config/secrets';
import { validateImageUrlForSSRF } from '../utils/ssrf-protection';

export interface ProductResult {
  name: string;
  brand?: string;
  price?: string;
  image: string;
  shopUrl: string;
  source?: 'ASOS' | 'Farfetch' | 'SerpAPI' | 'Fallback';
  title?: string;
  color?: string;
  fit?: string;
  description?: string;
  image_url?: string;
  thumbnail?: string;
  serpapi_thumbnail?: string;
  thumbnail_url?: string;
  img?: string;
  result?: { thumbnail?: string; serpapi_thumbnail?: string };
}

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);
  private readonly storage = new Storage();

  private get rapidKey(): string | undefined {
    return secretExists('RAPIDAPI_KEY') ? getSecret('RAPIDAPI_KEY') : undefined;
  }

  private get serpapiKey(): string | undefined {
    return secretExists('SERPAPI_KEY') ? getSecret('SERPAPI_KEY') : undefined;
  }

  private get bucketName(): string {
    return secretExists('GCS_BUCKET') ? getSecret('GCS_BUCKET') : 'stylhelpr-prod-bucket';
  }

  // 🧠 Gender pattern lists
  private readonly genderPatterns = {
    male: ['men', "men's", 'male', 'masculine', 'menswear', 'gentleman'],
    female: ['women', "women's", 'female', 'ladies', 'girls', 'womenswear'],
  };

  private readonly womenOnlyVendors = [
    'shein',
    'revolve',
    'anthropologie',
    'fashionnova',
    'prettylittlething',
    'boohoo',
    'lulus',
    'princesspolly',
    'victoria',
    'skims',
    'hm.com/en_us/women',
  ];

  /* ⚡️ Cache image to GCS */
  private async cacheImageToGCS(imageUrl?: string): Promise<string> {
    if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl || '';
    // 🚫 Block recaching of any previously filtered or known-female images
    if (
      /(women|female|ladies|girls|skims|shein|fashionnova|princesspolly|revolve|anthropologie)/i.test(
        imageUrl,
      )
    ) {
      this.logger.warn(
        `🚫 [cacheImageToGCS] Blocked female image: ${imageUrl}`,
      );
      return 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
    }

    // 🔒 SSRF Protection: Validate image URL before fetching
    // Checks: protocol (http/https only), domain allowlist, DNS resolution, private IP blocking
    try {
      await validateImageUrlForSSRF(imageUrl);
    } catch (err) {
      this.logger.warn(
        `🚫 [cacheImageToGCS] SSRF validation failed for: ${imageUrl} - ${err.message}`,
      );
      return 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
    }

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

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
      return publicUrl;
    } catch (e) {
      this.logger.warn(`⚠️ cacheImageToGCS failed: ${e}`);
      return imageUrl;
    }
  }

  // 🧠 Determine if an item matches user gender context
  private matchesUserGender(
    item: any,
    userGender: 'male' | 'female' | 'unisex' | 'other' = 'unisex',
  ): boolean {
    if (!userGender || userGender === 'unisex' || userGender === 'other')
      return true;

    const text = [
      item.title,
      item.name,
      item.merchant,
      item.source,
      item.store,
      item.link,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const vendor = (item.link || '').toLowerCase();

    if (userGender === 'male') {
      if (this.womenOnlyVendors.some((v) => vendor.includes(v))) return false;
      const mentionsFemale = this.genderPatterns.female.some((t) =>
        text.includes(t),
      );
      return !mentionsFemale;
    }

    if (userGender === 'female') {
      const mentionsMale = this.genderPatterns.male.some((t) =>
        text.includes(t),
      );
      return !mentionsMale;
    }

    return true;
  }

  /* 🧠 FARFETCH */
  async searchFarfetch(
    query: string,
    userGender: 'male' | 'female' | 'unisex' | 'other' = 'unisex',
  ): Promise<ProductResult[]> {
    if (!this.serpapiKey) return [];
    const genderedQuery =
      userGender === 'male'
        ? `(${query}) (men's|male|menswear|unisex) fashion`
        : userGender === 'female'
          ? `(${query}) (women's|female|ladies|womenswear) fashion`
          : query;

    const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&site=farfetch.com&q=${encodeURIComponent(
      genderedQuery,
    )}&api_key=${this.serpapiKey}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      const items = (json.shopping_results || []).filter((i: any) =>
        this.matchesUserGender(i, userGender),
      );
      if (!items.length) return [];

      return Promise.all(
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

  /* 👕 ASOS */
  async searchASOS(
    query: string,
    userGender: 'male' | 'female' | 'unisex' | 'other' = 'unisex',
  ): Promise<ProductResult[]> {
    if (!this.rapidKey) return [];
    const genderParam =
      userGender === 'male'
        ? 'men'
        : userGender === 'female'
          ? 'women'
          : 'unisex';

    const url = `https://asos2.p.rapidapi.com/products/v2/list?store=US&q=${encodeURIComponent(
      `${genderParam} ${query}`,
    )}&offset=0&limit=5`;

    try {
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': this.rapidKey,
          'X-RapidAPI-Host': 'asos2.p.rapidapi.com',
        },
      });
      const json = await res.json();
      const items = (json?.products || []).filter((p: any) =>
        this.matchesUserGender(p, userGender),
      );
      if (!items.length) return [];

      return Promise.all(
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
    } catch (err) {
      this.logger.warn('ASOS search failed:', err);
      return [];
    }
  }

  /* 🛍️ GOOGLE SHOPPING (SerpAPI) */
  async searchSerpApi(
    query: string,
    userGender: 'male' | 'female' | 'unisex' | 'other' = 'unisex',
  ): Promise<ProductResult[]> {
    if (!this.serpapiKey) return [];
    const baseUrl = 'https://serpapi.com/search.json';

    const genderedQuery =
      userGender === 'male'
        ? `men men's masculine ${query} -women -womens -female -ladies -girls`
        : userGender === 'female'
          ? `women women's feminine ${query} -men -mens -male`
          : query;

    const params = new URLSearchParams({
      engine: 'google_shopping',
      gl: 'us',
      hl: 'en',
      q: genderedQuery,
      api_key: this.serpapiKey,
    });

    try {
      this.logger.log(`🛍️ [SerpAPI] Search (${userGender}) → ${genderedQuery}`);
      const res = await fetch(`${baseUrl}?${params.toString()}`);
      const json = await res.json();
      const items = json.shopping_results || [];
      if (!items.length) return [];

      // 🚫 Global filters for domains and gendered URLs
      // 🚫 Global filters for domains and gendered URLs
      const bannedDomains = [
        'shein',
        'fashionnova',
        'prettylittlething',
        'princesspolly',
        'skims',
        'victoriassecret',
        'hm.com/en_us/women',
        '/women/',
        '/ladies/',
        '/female/',
        '/girl/',
        '/womenswear/',
      ];

      const femaleWords =
        /(women|woman|female|ladies|girls|womenswear|femme|she\b|her\b|skirts|dresses|heels)/i;
      const maleWords =
        /(men|man|male|menswear|gentlemen|him\b|his\b|boxers|suits)/i;

      const filtered = items.filter((i: any) => {
        const text = `${i.title ?? ''} ${i.name ?? ''} ${i.source ?? ''} ${
          i.merchant ?? ''
        } ${i.link ?? ''} ${i.product_title ?? ''}`.toLowerCase();
        const link = (i.link ?? '').toLowerCase();
        const vendor = (i.merchant ?? '').toLowerCase();

        // ❌ Global vendor/domain block
        if (bannedDomains.some((b) => link.includes(b))) return false;

        // 🧍‍♂️ Male filtering
        if (userGender === 'male') {
          if (
            femaleWords.test(text) ||
            bannedDomains.some((b) => vendor.includes(b)) ||
            /\/women/.test(link)
          )
            return false;
        }

        // 🧍‍♀️ Female filtering
        if (userGender === 'female') {
          if (maleWords.test(text) || /\/men/.test(link)) return false;
        }

        // 🧍 Unisex → allow all
        return true;
      });

      if (!filtered.length) {
        this.logger.warn(`⚠️ [SerpAPI] All results filtered (${userGender})`);
        return [];
      }

      const mapped = (
        await Promise.all(
          filtered.slice(0, 10).map(async (i: any) => {
            const imgUrl =
              i.thumbnail ||
              i.serpapi_thumbnail ||
              i.image ||
              i.image_url ||
              i.result?.thumbnail ||
              i.result?.serpapi_thumbnail ||
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';

            const lowerImg = imgUrl.toLowerCase();

            if (
              bannedDomains.some((b) => lowerImg.includes(b)) ||
              femaleWords.test(lowerImg)
            ) {
              this.logger.warn(`🚫 [SerpAPI] Skipping female image: ${imgUrl}`);
              return null;
            }

            // 🚫 Brand domain women's section guard
            if (
              /(gucci\.com|prada\.com|louisvuitton\.com|chanel\.com)/.test(
                lowerImg,
              ) &&
              /(\/women|\/ladies|\/female)/.test(lowerImg)
            ) {
              this.logger.warn(
                `🚫 [SerpAPI] Skipping women's catalog brand image: ${imgUrl}`,
              );
              return null;
            }

            // 🚫 Extra visual-sanity guard before caching
            const combinedText =
              `${i.title ?? ''} ${i.name ?? ''} ${i.source ?? ''} ${
                i.merchant ?? ''
              }`.toLowerCase();

            const isLikelyFemaleProduct =
              femaleWords.test(combinedText) ||
              bannedDomains.some((b) =>
                (i.link ?? '').toLowerCase().includes(b),
              );

            if (userGender === 'male' && isLikelyFemaleProduct) {
              this.logger.warn(
                `🚫 [SerpAPI] Skipping visually female product: ${i.title}`,
              );
              return null;
            }

            // 🧠 Optional re-query: if image URL clearly contains female variant, try male version
            if (userGender === 'male' && /women|ladies|female/.test(imgUrl)) {
              try {
                this.logger.log(
                  `🔁 [SerpAPI] Retrying with male variant for: ${i.title}`,
                );
                const altResults = await this.searchSerpApi(
                  `${i.title} men`,
                  'male',
                );
                const altImg = altResults?.[0]?.image;
                if (altImg) {
                  this.logger.log(
                    `✅ [SerpAPI] Swapped to male image for: ${i.title}`,
                  );
                  return {
                    name: i.title || i.name || i.product_title,
                    brand: i.source || i.store || i.merchant || 'Unknown',
                    price:
                      i.extracted_price !== undefined
                        ? `$${i.extracted_price}`
                        : i.price || null,
                    image: await this.cacheImageToGCS(altImg),
                    shopUrl: i.link || i.product_link || '',
                    source: 'SerpAPI' as const,
                  };
                }
              } catch (retryErr) {
                this.logger.warn(
                  `⚠️ [SerpAPI] Male requery failed for ${i.title}: ${retryErr}`,
                );
              }
            }

            return {
              name: i.title || i.name || i.product_title,
              brand: i.source || i.store || i.merchant || 'Unknown',
              price:
                i.extracted_price !== undefined
                  ? `$${i.extracted_price}`
                  : i.price || null,
              image: await this.cacheImageToGCS(imgUrl),
              shopUrl: i.link || i.product_link || '',
              source: 'SerpAPI' as const,
            };
          }),
        )
      ).filter(Boolean);

      return mapped;
    } catch (err) {
      this.logger.warn('⚠️ [SerpAPI] Search failed:', err);
      return [];
    }
  }

  /* 🔄 Combined Search */
  async search(
    query: string,
    userGender: 'male' | 'female' | 'unisex' | 'other' = 'unisex',
  ): Promise<ProductResult[]> {
    this.logger.log(`🛒 Searching for: ${query} (${userGender})`);

    const farfetch = await this.searchFarfetch(query, userGender);
    if (farfetch.length > 0) return farfetch;

    const asos = await this.searchASOS(query, userGender);
    if (asos.length > 0) return asos;

    const serp = await this.searchSerpApi(query, userGender);
    if (serp.length > 0) return serp;

    this.logger.warn(`❌ No results found for "${query}"`);
    return [];
  }
}
