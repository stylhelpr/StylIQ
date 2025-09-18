import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class DiscoverService {
  private readonly log = new Logger(DiscoverService.name);

  /**
   * Optional: still useful if you ever receive an auth0Sub and need to map it.
   */
  async getInternalUserId(auth0Sub: string): Promise<string> {
    const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
      auth0Sub,
    ]);
    if (res.rowCount === 0) throw new Error('User not found');
    return res.rows[0].id;
  }

  /**
   * Refresh product catalog. Loosen image validation to allow CDN/placeholder URLs
   * that don't end with a file extension (common on picsum/loremflickr/etc).
   */
  async refreshProducts() {
    const resp = await fetch(
      'https://api.escuelajs.co/api/v1/products?limit=50',
    );
    if (!resp.ok) throw new Error('Failed to fetch products');
    const data = await resp.json();

    for (const p of data) {
      let img: string = p.images?.[0] || '';
      if (!img) continue;

      // Normalize
      img = img.replace(/^http:\/\//, 'https://');

      // Allow querystrings/no-extension, block obvious bad redirector pages
      const looksLikeImageUrl =
        /^https?:\/\/\S+/i.test(img) && !img.includes('google.com/imgres');
      if (!looksLikeImageUrl) continue;

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
          img, // if you don't have a product page yet, link to the image
        ],
      );
    }
  }

  /**
   * Primary entry: accept your internal userId (UUID).
   * (Personalization can be layered in later using userId.)
   */
  async getRecommended(userId: string) {
    // For now, return latest (ignore userId). Keep the signature for future personalization.
    const { rows } = await pool.query(
      'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
    );
    return rows;
  }
}

////////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class DiscoverService {
//   async getInternalUserId(auth0Sub: string): Promise<string> {
//     const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
//       auth0Sub,
//     ]);
//     if (res.rowCount === 0) throw new Error('User not found');
//     return res.rows[0].id;
//   }

//   // ⬇️ FIXED: Only store valid images
//   async refreshProducts() {
//     const resp = await fetch(
//       'https://api.escuelajs.co/api/v1/products?limit=50',
//     );
//     if (!resp.ok) throw new Error('Failed to fetch products');
//     const data = await resp.json();

//     for (const p of data) {
//       let img = p.images?.[0] || '';
//       if (!img) continue;

//       // Normalize and validate
//       img = img.replace(/^http:\/\//, 'https://');
//       if (!/^https?:\/\/.+\.(jpe?g|png|webp)$/i.test(img)) continue;

//       await pool.query(
//         `INSERT INTO discover_products (id, title, brand, category, image_url, link)
//          VALUES ($1,$2,$3,$4,$5,$6)
//          ON CONFLICT (id)
//          DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
//         [
//           p.id.toString(),
//           p.title,
//           p.category?.name || 'Brand',
//           p.category?.name || '',
//           img,
//           img, // using same URL as link for now
//         ],
//       );
//     }
//   }

//   async getRecommended(_auth0Sub: string) {
//     const all = await pool.query(
//       'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 20',
//     );
//     return all.rows;
//   }
// }

///////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class DiscoverService {
//   async getInternalUserId(auth0Sub: string): Promise<string> {
//     const res = await pool.query('SELECT id FROM users WHERE auth0_sub = $1', [
//       auth0Sub,
//     ]);
//     if (res.rowCount === 0) throw new Error('User not found');
//     return res.rows[0].id;
//   }

//   // Pull a batch of products from the internet and store them
//   async refreshProducts() {
//     const resp = await fetch(
//       'https://api.escuelajs.co/api/v1/products?limit=50',
//     );
//     if (!resp.ok) throw new Error('Failed to fetch products');
//     const data = await resp.json();

//     for (const p of data) {
//       await pool.query(
//         `INSERT INTO discover_products (id, title, brand, category, image_url, link)
//          VALUES ($1,$2,$3,$4,$5,$6)
//          ON CONFLICT (id)
//          DO UPDATE SET title=$2, brand=$3, category=$4, image_url=$5, link=$6`,
//         [
//           p.id.toString(),
//           p.title,
//           p.category?.name || 'Brand',
//           p.category?.name || '',
//           p.images?.[0] || '',
//           p.images?.[0] || '',
//         ],
//       );
//     }
//   }

//   // Return products filtered by user style tags
//   async getRecommended(auth0Sub: string) {
//     const userId = await this.getInternalUserId(auth0Sub);

//     const user = await pool.query(
//       'SELECT style_tags FROM style_profiles WHERE user_id=$1',
//       [userId],
//     );

//     const tags: string[] = user.rows?.[0]?.style_tags || [];

//     const all = await pool.query(
//       'SELECT * FROM discover_products ORDER BY created_at DESC LIMIT 100',
//     );

//     const filtered = all.rows.filter((p: any) =>
//       tags.some(
//         (tag) =>
//           p.title?.toLowerCase().includes(tag.toLowerCase()) ||
//           p.category?.toLowerCase().includes(tag.toLowerCase()),
//       ),
//     );

//     return filtered.slice(0, 20);
//   }
// }
