import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { DeleteItemDto } from './dto/delete-item.dto';
import { Storage } from '@google-cloud/storage';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const storage = new Storage();

@Injectable()
export class WardrobeService {
  async createItem(dto: CreateWardrobeItemDto) {
    const {
      user_id,
      image_url,
      gsutil_uri,
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
    user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
    fit, size, brand, metadata, width, height
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13, $14
  ) RETURNING *`,
      [
        user_id,
        image_url,
        gsutil_uri,
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

  async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(dto) as [
      keyof UpdateWardrobeItemDto,
      any,
    ][]) {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields provided for update.');
    }

    values.push(itemId);

    const query = `
    UPDATE wardrobe_items
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${index}
    RETURNING *;
  `;

    const result = await pool.query(query, values);

    return {
      message: 'Wardrobe item updated successfully',
      item: result.rows[0],
    };
  }

  async deleteItem(dto: DeleteItemDto) {
    const { item_id, user_id, image_url } = dto;

    // Delete from Postgres
    await pool.query(
      'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
      [item_id, user_id],
    );

    // Delete from GCS — now safely wrapped
    const bucketName = process.env.GCS_BUCKET_NAME!;
    const fileName = this.extractFileName(image_url);

    try {
      await storage.bucket(bucketName).file(fileName).delete();
    } catch (err: any) {
      if (err.code === 404) {
        console.warn('🧼 GCS file already deleted:', fileName);
      } else {
        throw err;
      }
    }

    return { message: 'Wardrobe item deleted successfully' };
  }

  private extractFileName(url: string): string {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  }
}
