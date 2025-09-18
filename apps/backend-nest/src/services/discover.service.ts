import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class DiscoverService {
  private readonly log = new Logger(DiscoverService.name);

  async getInternalUserId(auth0Sub: string): Promise<string> {
    const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
      auth0Sub,
    ]);
    if (res.rowCount === 0) throw new Error('User not found');
    return res.rows[0].id;
  }

  /**
   * Fetch **real fashion products** (replace with ShopStyle API)
   */
  async refreshProducts() {
    try {
      const resp = await fetch(
        'https://api.escuelajs.co/api/v1/products?limit=50',
      );
      if (!resp.ok)
        throw new Error(`Failed to fetch demo products: ${resp.status}`);

      const data = await resp.json();
      console.log('📦 Got demo products:', data.length);

      for (const p of data) {
        let img = p.images?.[0] || '';
        if (!img) continue;

        img = img.replace(/^http:\/\//, 'https://');

        await pool.query(
          `INSERT INTO discover_products (id, title, brand, category, image_url, link)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id)
         DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
          [
            String(p.id),
            p.title,
            p.category?.name || 'Brand',
            p.category?.name || '',
            img,
            img, // using the image URL as link for now
          ],
        );
      }

      console.log('✅ Finished inserting demo products');
      return { success: true };
    } catch (err) {
      console.error('❌ refreshProducts failed:', err);
      throw err;
    }
  }

  /**
   * Personalized: Recommend based on wardrobe gaps + style profile
   */
  async getRecommended(userId: string) {
    // 1) Load user prefs (be tolerant if tables/rows are missing)
    const wardrobe = await pool
      .query('SELECT main_category FROM wardrobe_items WHERE user_id=$1', [
        userId,
      ])
      .catch(() => ({ rowCount: 0, rows: [] as { main_category: string }[] }));

    const style = await pool
      .query('SELECT preferred_brands FROM style_profiles WHERE user_id=$1', [
        userId,
      ])
      .catch(() => ({
        rowCount: 0,
        rows: [] as { preferred_brands: string[] }[],
      }));

    const preferredBrands: string[] =
      style.rowCount && Array.isArray(style.rows[0]?.preferred_brands)
        ? style.rows[0].preferred_brands.filter(Boolean)
        : [];

    const ownedCategories: string[] = wardrobe.rowCount
      ? wardrobe.rows.map((w) => w.main_category).filter(Boolean)
      : [];

    // 2) Build WHERE dynamically so we never pass empty arrays into ANY()
    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (preferredBrands.length > 0) {
      where.push(`brand = ANY($${i}::text[])`);
      params.push(preferredBrands);
      i += 1;
    }

    if (ownedCategories.length > 0) {
      // Exclude categories the user already owns
      where.push(`NOT (category = ANY($${i}::text[]))`);
      params.push(ownedCategories);
      i += 1;
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

    // 3) Fallback so the UI never shows "No picks found"
    if (rows.length === 0) {
      const fb = await pool.query(
        'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
      );
      return fb.rows;
    }

    return rows;
  }
}

/////////////

// import { Injectable, Logger } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class DiscoverService {
//   private readonly log = new Logger(DiscoverService.name);

//   /**
//    * Optional: still useful if you ever receive an auth0Sub and need to map it.
//    */
//   async getInternalUserId(auth0Sub: string): Promise<string> {
//     const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
//       auth0Sub,
//     ]);
//     if (res.rowCount === 0) throw new Error('User not found');
//     return res.rows[0].id;
//   }

//   /**
//    * Refresh product catalog. Loosen image validation to allow CDN/placeholder URLs
//    * that don't end with a file extension (common on picsum/loremflickr/etc).
//    */
//   async refreshProducts() {
//     const resp = await fetch(
//       'https://api.escuelajs.co/api/v1/products?limit=50',
//     );
//     if (!resp.ok) throw new Error('Failed to fetch products');
//     const data = await resp.json();

//     for (const p of data) {
//       let img: string = p.images?.[0] || '';
//       if (!img) continue;

//       // Normalize
//       img = img.replace(/^http:\/\//, 'https://');

//       // Allow querystrings/no-extension, block obvious bad redirector pages
//       const looksLikeImageUrl =
//         /^https?:\/\/\S+/i.test(img) && !img.includes('google.com/imgres');
//       if (!looksLikeImageUrl) continue;

//       await pool.query(
//         `INSERT INTO discover_products (id, title, brand, category, image_url, link)
//          VALUES ($1,$2,$3,$4,$5,$6)
//          ON CONFLICT (id)
//          DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
//         [
//           String(p.id),
//           p.title,
//           p.category?.name || 'Brand',
//           p.category?.name || '',
//           img,
//           img, // if you don't have a product page yet, link to the image
//         ],
//       );
//     }
//   }

//   /**
//    * Primary entry: accept your internal userId (UUID).
//    * (Personalization can be layered in later using userId.)
//    */
//   async getRecommended(userId: string) {
//     // For now, return latest (ignore userId). Keep the signature for future personalization.
//     const { rows } = await pool.query(
//       'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
//     );
//     return rows;
//   }
// }
