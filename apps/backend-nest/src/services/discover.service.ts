import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

type JsonObj = Record<string, any>;

@Injectable()
export class DiscoverService {
  private readonly log = new Logger(DiscoverService.name);

  // -------------------- utils --------------------
  private ensureArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string') {
      const s = val.trim();
      const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
      if (!inner) return [];
      return inner
        .split(',')
        .map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean);
    }
    return [];
  }

  private likePatterns(values: string[]): string[] {
    return values
      .map((v) => v?.toString().trim())
      .filter(Boolean)
      .map((v) => `%${v}%`);
  }

  private async fetchJSON(url: string): Promise<any> {
    const resp = await fetch(encodeURI(url), {
      headers: {
        'user-agent':
          process.env.FETCH_UA ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        accept: 'application/json,text/plain,*/*',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    if (!resp.ok) throw new Error(`GET ${url} -> ${resp.status}`);
    // some endpoints return text/json; still parseable
    return await resp.json().catch(async () => JSON.parse(await resp.text()));
  }

  private toNumberOrNull(v: unknown): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(String(v).replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  private async upsertProduct(row: {
    id: string;
    title: string;
    brand: string;
    category: string;
    image_url: string;
    link: string;
    price: number | null;
  }) {
    if (!row.title || !row.image_url || !row.link || !row.brand) return;
    await pool.query(
      `INSERT INTO discover_products (id, title, brand, category, image_url, link, price)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id)
       DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6, price=$7`,
      [
        row.id,
        row.title,
        row.brand,
        row.category || '',
        row.image_url,
        row.link,
        row.price,
      ],
    );
  }

  // -------------------- PUBLIC SEED SOURCES (works today) --------------------

  // A) DummyJSON categories (men’s)
  private async fetchDummyJsonMen(limitPerCat = 60) {
    const categories = [
      'mens-shirts',
      'mens-shoes',
      //   'mens-watches',
      //   'sunglasses', // good filler
      //   'womens-dresses', // for variety
      //   'womens-shoes',
      //   'womens-bags',
    ];
    let inserted = 0;

    for (const cat of categories) {
      try {
        const url = `https://dummyjson.com/products/category/${encodeURIComponent(
          cat,
        )}?limit=${limitPerCat}`;
        const data = await this.fetchJSON(url);
        const items: any[] = Array.isArray(data?.products) ? data.products : [];

        for (const p of items) {
          const title: string =
            p?.title || p?.name || p?.displayName || 'Untitled';
          const brand: string = p?.brand || 'Demo';
          const category: string = p?.category || cat;
          const image_url: string =
            (Array.isArray(p?.images) && p.images[0]) || p?.thumbnail || '';
          // For lack of product pages, link to image (matches prior pattern you used)
          const link: string =
            image_url || `https://dummyjson.com/products/${p?.id}`;
          const price = this.toNumberOrNull(p?.price);

          await this.upsertProduct({
            id: `dummyjson:${p?.id ?? `${cat}:${title}`}`,
            title,
            brand,
            category,
            image_url,
            link,
            price,
          });
          inserted++;
        }
        this.log.log(`✅ DummyJSON ${cat}: +${items.length}`);
      } catch (e) {
        this.log.warn(`⚠️ DummyJSON ${cat} failed: ${(e as Error).message}`);
      }
    }
    return inserted;
  }

  // B) FakeStoreAPI (men’s & women’s clothing)
  private async fetchFakeStore() {
    const cats = [
      "men's clothing",
      "women's clothing",
      // keep focused on apparel; skip electronics/jewelery
    ];
    let inserted = 0;

    for (const cat of cats) {
      try {
        const url = `https://fakestoreapi.com/products/category/${encodeURIComponent(
          cat,
        )}`;
        const items: any[] = await this.fetchJSON(url);
        for (const p of items) {
          const title: string = p?.title ?? 'Untitled';
          const category: string = p?.category ?? cat;
          const image_url: string = p?.image ?? '';
          const price = this.toNumberOrNull(p?.price);
          // brand not provided; use source marker
          const brand = 'FakeStore';
          const link =
            image_url || `https://fakestoreapi.com/products/${p?.id}`;

          await this.upsertProduct({
            id: `fakestore:${p?.id ?? `${cat}:${title}`}`,
            title,
            brand,
            category,
            image_url,
            link,
            price,
          });
          inserted++;
        }
        this.log.log(`✅ FakeStore ${cat}: +${items.length}`);
      } catch (e) {
        this.log.warn(`⚠️ FakeStore ${cat} failed: ${(e as Error).message}`);
      }
    }
    return inserted;
  }

  // -------------------- REFRESH (fast, reliable) --------------------

  async refreshProducts() {
    // hard reset so no junk remains
    await pool.query('DELETE FROM discover_products');

    let totalInserted = 0;
    totalInserted += await this.fetchDummyJsonMen(80);
    totalInserted += await this.fetchFakeStore();

    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS c FROM discover_products',
    );
    this.log.log(
      `🎯 refreshProducts inserted rows: ${totalInserted}, total now: ${rows[0].c}`,
    );

    return { success: true, inserted: totalInserted, total: rows[0].c };
  }

  // -------------------- Personalized recommendations --------------------

  async getRecommended(userId: string) {
    const wardrobe = await pool
      .query('SELECT main_category FROM wardrobe_items WHERE user_id=$1', [
        userId,
      ])
      .catch(() => ({ rowCount: 0, rows: [] as { main_category: string }[] }));
    const ownedCategories: string[] = wardrobe.rowCount
      ? wardrobe.rows.map((w) => String(w.main_category)).filter(Boolean)
      : [];

    const sp = await pool
      .query<{
        doc: JsonObj;
      }>(
        'SELECT to_jsonb(sp) AS doc FROM style_profiles sp WHERE user_id=$1 LIMIT 1',
        [userId],
      )
      .catch(() => ({ rowCount: 0, rows: [] as { doc: JsonObj }[] }));
    const doc: JsonObj = sp.rowCount ? sp.rows[0].doc : {};

    const preferredBrands = this.ensureArray(doc.preferred_brands);
    const styleKeywords = this.ensureArray(doc.style_keywords);
    const colorPrefs =
      this.ensureArray(doc.color_preferences) ||
      this.ensureArray(doc.favorite_colors);
    const dislike = this.ensureArray(doc.disliked_styles);

    const kwLike = this.likePatterns(styleKeywords);
    const colorLike = this.likePatterns(colorPrefs);
    const dislikeLike = this.likePatterns(dislike);

    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    // NOTE: since demo sources have generic brands, brand filter may remove too much.
    // We keep it, but the fallback below ensures the UI still shows items if empty.
    if (preferredBrands.length > 0) {
      where.push(`brand = ANY($${i}::text[])`);
      params.push(preferredBrands);
      i++;
    }
    if (kwLike.length > 0) {
      where.push(
        `(title ILIKE ANY($${i}::text[]) OR brand ILIKE ANY($${i}::text[]) OR category ILIKE ANY($${i}::text[]))`,
      );
      params.push(kwLike);
      i++;
    }
    if (colorLike.length > 0) {
      where.push(`(title ILIKE ANY($${i}::text[]))`);
      params.push(colorLike);
      i++;
    }
    if (ownedCategories.length > 0) {
      where.push(`NOT (category = ANY($${i}::text[]))`);
      params.push(ownedCategories);
      i++;
    }
    if (dislikeLike.length > 0) {
      where.push(
        `NOT (title ILIKE ANY($${i}::text[]) OR category ILIKE ANY($${i}::text[]))`,
      );
      params.push(dislikeLike);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT *
      FROM discover_products
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const { rows } = await pool.query(sql, params);
    if (rows.length === 0) {
      // brand keywords likely filtered out generic-source brands — show latest instead
      const fb = await pool.query(
        'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
      );
      return fb.rows;
    }
    return rows;
  }

  // Optional mapper if your controller still needs it:
  async getInternalUserId(auth0Sub: string): Promise<string> {
    const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
      auth0Sub,
    ]);
    if (res.rowCount === 0) throw new Error('User not found');
    return res.rows[0].id;
  }
}

/////////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// type JsonObj = Record<string, any>;

// @Injectable()
// export class DiscoverService {
//   private readonly log = new Logger(DiscoverService.name);

//   // ---- Utilities ------------------------------------------------------------

//   private ensureArray(val: unknown): string[] {
//     // Accept: PG text[], JSON array, or "{a,b}" string
//     if (Array.isArray(val)) return val.map(String).filter(Boolean);
//     if (typeof val === 'string') {
//       const s = val.trim();
//       const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
//       if (!inner) return [];
//       return inner
//         .split(',')
//         .map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
//         .filter(Boolean);
//     }
//     return [];
//   }

//   private likePatterns(values: string[]): string[] {
//     return values
//       .map((v) => v?.toString().trim())
//       .filter(Boolean)
//       .map((v) => `%${v}%`);
//   }

//   // ---- Public seed (no keys) -----------------------------------------------

//   async refreshProducts() {
//     try {
//       const resp = await fetch(
//         'https://api.escuelajs.co/api/v1/products?limit=100',
//       );
//       if (!resp.ok)
//         throw new Error(`Failed to fetch demo products: ${resp.status}`);

//       const data = await resp.json();
//       this.log.log(
//         `📦 Got demo products: ${Array.isArray(data) ? data.length : 0}`,
//       );

//       for (const p of data as any[]) {
//         let img = p?.images?.[0] || '';
//         if (!img) continue;
//         img = img.replace(/^http:\/\//, 'https://');

//         await pool.query(
//           `INSERT INTO discover_products (id, title, brand, category, image_url, link)
//            VALUES ($1,$2,$3,$4,$5,$6)
//            ON CONFLICT (id)
//            DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
//           [
//             String(p.id),
//             p.title ?? '',
//             p.category?.name ?? 'Brand',
//             p.category?.name ?? '',
//             img,
//             img, // link = image for now
//           ],
//         );
//       }

//       this.log.log('✅ Finished inserting demo products');
//       return { success: true };
//     } catch (err) {
//       this.log.error('❌ refreshProducts failed:', err as any);
//       throw err;
//     }
//   }

//   // ---- Personalized recommend (robust to your real schema) ------------------

//   async getRecommended(userId: string) {
//     // 1) Wardrobe categories (exclude what user already owns)
//     const wardrobe = await pool
//       .query('SELECT main_category FROM wardrobe_items WHERE user_id=$1', [
//         userId,
//       ])
//       .catch(() => ({ rowCount: 0, rows: [] as { main_category: string }[] }));

//     const ownedCategories: string[] = wardrobe.rowCount
//       ? wardrobe.rows.map((w) => String(w.main_category)).filter(Boolean)
//       : [];

//     // 2) Pull entire style_profile row as JSON; extract whatever exists
//     const sp = await pool
//       .query<{
//         doc: JsonObj;
//       }>(
//         'SELECT to_jsonb(sp) AS doc FROM style_profiles sp WHERE user_id=$1 LIMIT 1',
//         [userId],
//       )
//       .catch(() => ({ rowCount: 0, rows: [] as { doc: JsonObj }[] }));

//     const doc: JsonObj = sp.rowCount ? sp.rows[0].doc : {};

//     // These keys came from your CSVs; if a key is missing, it just returns []
//     const preferredBrands = this.ensureArray(doc.preferred_brands);
//     const styleKeywords = this.ensureArray(doc.style_keywords);
//     const colorPrefs = this.ensureArray(
//       doc.color_preferences ?? doc.favorite_colors,
//     );
//     const dislikedStyles = this.ensureArray(doc.disliked_styles);

//     // Prepare LIKE patterns
//     const kwPatterns = this.likePatterns(styleKeywords);
//     const colorPatterns = this.likePatterns(colorPrefs);
//     const dislikePats = this.likePatterns(dislikedStyles);

//     // 3) Build WHERE dynamically. Only bind arrays when they have items.
//     const where: string[] = [];
//     const params: any[] = [];
//     let i = 1;

//     // Prefer brands user likes
//     if (preferredBrands.length > 0) {
//       where.push(`brand = ANY($${i}::text[])`);
//       params.push(preferredBrands);
//       i++;
//     }

//     // Match style keywords across title/brand/category
//     if (kwPatterns.length > 0) {
//       where.push(
//         `(title ILIKE ANY($${i}::text[]) OR brand ILIKE ANY($${i}::text[]) OR category ILIKE ANY($${i}::text[]))`,
//       );
//       params.push(kwPatterns);
//       i++;
//     }

//     // Match colors in title (demo feeds usually put colors in names)
//     if (colorPatterns.length > 0) {
//       where.push(`(title ILIKE ANY($${i}::text[]))`);
//       params.push(colorPatterns);
//       i++;
//     }

//     // Exclude categories already owned
//     if (ownedCategories.length > 0) {
//       where.push(`NOT (category = ANY($${i}::text[]))`);
//       params.push(ownedCategories);
//       i++;
//     }

//     // Exclude disliked styles by title/category words
//     if (dislikePats.length > 0) {
//       where.push(
//         `NOT (title ILIKE ANY($${i}::text[]) OR category ILIKE ANY($${i}::text[]))`,
//       );
//       params.push(dislikePats);
//       i++;
//     }

//     const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
//     const sql = `
//       SELECT *
//       FROM discover_products
//       ${whereSql}
//       ORDER BY created_at DESC
//       LIMIT 20
//     `;

//     const { rows } = await pool.query(sql, params);

//     // 4) Fallback so UI never empties
//     if (rows.length === 0) {
//       const fb = await pool.query(
//         'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
//       );
//       return fb.rows;
//     }

//     return rows;
//   }
// }

/////////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class DiscoverService {
//   private readonly log = new Logger(DiscoverService.name);

//   async getInternalUserId(auth0Sub: string): Promise<string> {
//     const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
//       auth0Sub,
//     ]);
//     if (res.rowCount === 0) throw new Error('User not found');
//     return res.rows[0].id;
//   }

//   // Public demo seed (no keys)
//   async refreshProducts() {
//     try {
//       const resp = await fetch(
//         'https://api.escuelajs.co/api/v1/products?limit=50',
//       );
//       if (!resp.ok)
//         throw new Error(`Failed to fetch demo products: ${resp.status}`);

//       const data = await resp.json();
//       this.log.log(
//         `📦 Got demo products: ${Array.isArray(data) ? data.length : 0}`,
//       );

//       for (const p of data as any[]) {
//         let img = p?.images?.[0] || '';
//         if (!img) continue;
//         img = img.replace(/^http:\/\//, 'https://');

//         await pool.query(
//           `INSERT INTO discover_products (id, title, brand, category, image_url, link)
//            VALUES ($1,$2,$3,$4,$5,$6)
//            ON CONFLICT (id)
//            DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
//           [
//             String(p.id),
//             p.title ?? '',
//             p.category?.name ?? 'Brand',
//             p.category?.name ?? '',
//             img,
//             img, // link = image for now
//           ],
//         );
//       }

//       this.log.log('✅ Finished inserting demo products');
//       return { success: true };
//     } catch (err) {
//       this.log.error('❌ refreshProducts failed:', err as any);
//       throw err;
//     }
//   }

//   // Helper: coerce pg value into string[]
//   private ensureArray(val: unknown): string[] {
//     if (Array.isArray(val))
//       return (val as unknown[]).map(String).filter(Boolean);
//     if (typeof val === 'string') {
//       // handle pg text[] string like "{a,b,c}"
//       const s = val.trim();
//       const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
//       return inner
//         .split(',')
//         .map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
//         .filter(Boolean);
//     }
//     return [];
//   }

//   /**
//    * Personalized recommendations using your real schema:
//    * - style_profiles: style_keywords (ARRAY), favorite_colors (ARRAY)
//    * - wardrobe_items: main_category
//    *
//    * Matches keywords/colors against title/brand/category (ILIKE),
//    * optionally excludes owned categories. Safe dynamic SQL (no empty ANY()).
//    */
//   async getRecommended(userId: string) {
//     // 1) Load user data (tolerant if rows missing)
//     const wardrobe = await pool
//       .query('SELECT main_category FROM wardrobe_items WHERE user_id=$1', [
//         userId,
//       ])
//       .catch(() => ({ rowCount: 0, rows: [] as { main_category: string }[] }));

//     const style = await pool
//       .query(
//         `SELECT style_keywords, favorite_colors
//          FROM style_profiles
//          WHERE user_id=$1`,
//         [userId],
//       )
//       .catch(() => ({ rowCount: 0, rows: [] as any[] }));

//     const styleRow = style.rowCount ? style.rows[0] : {};
//     const styleKeywords = this.ensureArray(styleRow?.style_keywords);
//     const favoriteColors = this.ensureArray(styleRow?.favorite_colors);
//     const ownedCategories = wardrobe.rowCount
//       ? wardrobe.rows.map((w) => String(w.main_category)).filter(Boolean)
//       : [];

//     // Build LIKE patterns for keywords/colors: '%keyword%'
//     const kwPatterns = styleKeywords.map((k) => `%${k}%`);
//     const colorPatterns = favoriteColors.map((c) => `%${c}%`);

//     // 2) Build WHERE dynamically; only pass arrays when non-empty
//     const where: string[] = [];
//     const params: any[] = [];
//     let i = 1;

//     if (kwPatterns.length > 0) {
//       where.push(
//         `(title ILIKE ANY($${i}::text[]) OR brand ILIKE ANY($${i}::text[]) OR category ILIKE ANY($${i}::text[]))`,
//       );
//       params.push(kwPatterns);
//       i += 1;
//     }

//     if (colorPatterns.length > 0) {
//       // Titles often carry color terms in these demo feeds
//       where.push(`(title ILIKE ANY($${i}::text[]))`);
//       params.push(colorPatterns);
//       i += 1;
//     }

//     if (ownedCategories.length > 0) {
//       // exclude categories you already own
//       where.push(`NOT (category = ANY($${i}::text[]))`);
//       params.push(ownedCategories);
//       i += 1;
//     }

//     const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

//     const sql = `
//       SELECT *
//       FROM discover_products
//       ${whereSql}
//       ORDER BY created_at DESC
//       LIMIT 20
//     `;

//     const { rows } = await pool.query(sql, params);

//     // 3) Fallback so UI never empties
//     if (rows.length === 0) {
//       const fb = await pool.query(
//         'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
//       );
//       return fb.rows;
//     }

//     return rows;
//   }
// }

////////////////

// import { Injectable, Logger } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class DiscoverService {
//   private readonly log = new Logger(DiscoverService.name);

//   async getInternalUserId(auth0Sub: string): Promise<string> {
//     const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
//       auth0Sub,
//     ]);
//     if (res.rowCount === 0) throw new Error('User not found');
//     return res.rows[0].id;
//   }

//   /**
//    * Fetch **real fashion products** (replace with ShopStyle API)
//    */
//   async refreshProducts() {
//     try {
//       const resp = await fetch(
//         'https://api.escuelajs.co/api/v1/products?limit=50',
//       );
//       if (!resp.ok)
//         throw new Error(`Failed to fetch demo products: ${resp.status}`);

//       const data = await resp.json();
//       console.log('📦 Got demo products:', data.length);

//       for (const p of data) {
//         let img = p.images?.[0] || '';
//         if (!img) continue;

//         img = img.replace(/^http:\/\//, 'https://');

//         await pool.query(
//           `INSERT INTO discover_products (id, title, brand, category, image_url, link)
//          VALUES ($1,$2,$3,$4,$5,$6)
//          ON CONFLICT (id)
//          DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
//           [
//             String(p.id),
//             p.title,
//             p.category?.name || 'Brand',
//             p.category?.name || '',
//             img,
//             img, // using the image URL as link for now
//           ],
//         );
//       }

//       console.log('✅ Finished inserting demo products');
//       return { success: true };
//     } catch (err) {
//       console.error('❌ refreshProducts failed:', err);
//       throw err;
//     }
//   }

//   /**
//    * Personalized: Recommend based on wardrobe gaps + style profile
//    */
//   async getRecommended(userId: string) {
//     // 1) Load user prefs (be tolerant if tables/rows are missing)
//     const wardrobe = await pool
//       .query('SELECT main_category FROM wardrobe_items WHERE user_id=$1', [
//         userId,
//       ])
//       .catch(() => ({ rowCount: 0, rows: [] as { main_category: string }[] }));

//     const style = await pool
//       .query('SELECT preferred_brands FROM style_profiles WHERE user_id=$1', [
//         userId,
//       ])
//       .catch(() => ({
//         rowCount: 0,
//         rows: [] as { preferred_brands: string[] }[],
//       }));

//     const preferredBrands: string[] =
//       style.rowCount && Array.isArray(style.rows[0]?.preferred_brands)
//         ? style.rows[0].preferred_brands.filter(Boolean)
//         : [];

//     const ownedCategories: string[] = wardrobe.rowCount
//       ? wardrobe.rows.map((w) => w.main_category).filter(Boolean)
//       : [];

//     // 2) Build WHERE dynamically so we never pass empty arrays into ANY()
//     const where: string[] = [];
//     const params: any[] = [];
//     let i = 1;

//     if (preferredBrands.length > 0) {
//       where.push(`brand = ANY($${i}::text[])`);
//       params.push(preferredBrands);
//       i += 1;
//     }

//     if (ownedCategories.length > 0) {
//       // Exclude categories the user already owns
//       where.push(`NOT (category = ANY($${i}::text[]))`);
//       params.push(ownedCategories);
//       i += 1;
//     }

//     const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
//     const sql = `
//     SELECT *
//     FROM discover_products
//     ${whereSql}
//     ORDER BY created_at DESC
//     LIMIT 20
//   `;

//     const { rows } = await pool.query(sql, params);

//     // 3) Fallback so the UI never shows "No picks found"
//     if (rows.length === 0) {
//       const fb = await pool.query(
//         'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
//       );
//       return fb.rows;
//     }

//     return rows;
//   }
// }

///////////////

// import { Injectable, Logger } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class DiscoverService {
//   private readonly log = new Logger(DiscoverService.name);

//   async getInternalUserId(auth0Sub: string): Promise<string> {
//     const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
//       auth0Sub,
//     ]);
//     if (res.rowCount === 0) throw new Error('User not found');
//     return res.rows[0].id;
//   }

//   /**
//    * Fetch **real fashion products** (replace with ShopStyle API)
//    */
//   async refreshProducts() {
//     try {
//       const resp = await fetch(
//         'https://api.escuelajs.co/api/v1/products?limit=50',
//       );
//       if (!resp.ok)
//         throw new Error(`Failed to fetch demo products: ${resp.status}`);

//       const data = await resp.json();
//       console.log('📦 Got demo products:', data.length);

//       for (const p of data) {
//         let img = p.images?.[0] || '';
//         if (!img) continue;

//         img = img.replace(/^http:\/\//, 'https://');

//         await pool.query(
//           `INSERT INTO discover_products (id, title, brand, category, image_url, link)
//          VALUES ($1,$2,$3,$4,$5,$6)
//          ON CONFLICT (id)
//          DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
//           [
//             String(p.id),
//             p.title,
//             p.category?.name || 'Brand',
//             p.category?.name || '',
//             img,
//             img, // using the image URL as link for now
//           ],
//         );
//       }

//       console.log('✅ Finished inserting demo products');
//       return { success: true };
//     } catch (err) {
//       console.error('❌ refreshProducts failed:', err);
//       throw err;
//     }
//   }

//   /**
//    * Personalized: Recommend based on wardrobe gaps + style profile
//    */
//   async getRecommended(userId: string) {
//     // 1) Load user prefs (be tolerant if tables/rows are missing)
//     const wardrobe = await pool
//       .query('SELECT main_category FROM wardrobe_items WHERE user_id=$1', [
//         userId,
//       ])
//       .catch(() => ({ rowCount: 0, rows: [] as { main_category: string }[] }));

//     const style = await pool
//       .query('SELECT preferred_brands FROM style_profiles WHERE user_id=$1', [
//         userId,
//       ])
//       .catch(() => ({
//         rowCount: 0,
//         rows: [] as { preferred_brands: string[] }[],
//       }));

//     const preferredBrands: string[] =
//       style.rowCount && Array.isArray(style.rows[0]?.preferred_brands)
//         ? style.rows[0].preferred_brands.filter(Boolean)
//         : [];

//     const ownedCategories: string[] = wardrobe.rowCount
//       ? wardrobe.rows.map((w) => w.main_category).filter(Boolean)
//       : [];

//     // 2) Build WHERE dynamically so we never pass empty arrays into ANY()
//     const where: string[] = [];
//     const params: any[] = [];
//     let i = 1;

//     if (preferredBrands.length > 0) {
//       where.push(`brand = ANY($${i}::text[])`);
//       params.push(preferredBrands);
//       i += 1;
//     }

//     if (ownedCategories.length > 0) {
//       // Exclude categories the user already owns
//       where.push(`NOT (category = ANY($${i}::text[]))`);
//       params.push(ownedCategories);
//       i += 1;
//     }

//     const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
//     const sql = `
//     SELECT *
//     FROM discover_products
//     ${whereSql}
//     ORDER BY created_at DESC
//     LIMIT 20
//   `;

//     const { rows } = await pool.query(sql, params);

//     // 3) Fallback so the UI never shows "No picks found"
//     if (rows.length === 0) {
//       const fb = await pool.query(
//         'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
//       );
//       return fb.rows;
//     }

//     return rows;
//   }
// }
