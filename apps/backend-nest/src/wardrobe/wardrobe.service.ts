import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';

import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class WardrobeService {
  async createItem(dto: CreateWardrobeItemDto) {
    const {
      user_id,
      image_url,
      name,
      main_category,
      subcategory,
      color,
      material,
      fit,
      size,
      brand,
      metadata,
      width,
      height,
    } = dto;

    const result = await pool.query(
      `
      INSERT INTO wardrobe_items (
        user_id, image_url, name, main_category, subcategory, color, material,
        fit, size, brand, metadata, width, height
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        user_id,
        image_url,
        name,
        main_category,
        subcategory,
        color,
        material,
        fit,
        size,
        brand,
        metadata,
        width,
        height,
      ],
    );

    return {
      message: 'Wardrobe item created successfully',
      item: result.rows[0],
    };
  }

  async getItemsByUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows;
  }
}

/////////////

// import { Injectable } from '@nestjs/common';
// import { Storage } from '@google-cloud/storage';
// import { Pool } from 'pg';
// import { DeleteItemDto } from './dto/delete-item.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });
// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   async getAllItems(user_id: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
//       [user_id],
//     );
//     return result.rows;
//   }

//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // 1. Delete from Postgres
//     await pool.query(
//       'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//       [item_id, user_id],
//     );

//     // 2. Delete from GCS
//     const bucketName = process.env.GCS_BUCKET_NAME!;
//     const fileName = this.extractFileName(image_url);
//     await storage.bucket(bucketName).file(fileName).delete();

//     return { message: 'Wardrobe item deleted successfully' };
//   }

//   extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }
// }
