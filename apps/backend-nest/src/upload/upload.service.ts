import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class UploadService {
  private storage = new Storage();
  private bucketName = 'stylhelpr-dev-bucket';

  async generatePresignedUrl(userId: string, originalFilename: string) {
    const folderPrefix = userId.slice(0, 2);
    const fileExtension = path.extname(originalFilename);
    const fileId = uuidv4();
    const fileName = `${fileId}${fileExtension}`;
    const objectKey = `uploads/${folderPrefix}/${userId}/images/${fileName}`;

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: 'image/jpeg',
    });

    return {
      uploadUrl: url,
      publicUrl: `https://storage.googleapis.com/${this.bucketName}/${objectKey}`,
      objectKey,
    };
  }

  async saveWardrobeItem(body: any) {
    console.log('📥 Incoming wardrobe item:', body);

    const {
      user_id,
      image_url,
      object_key, // ✅ FIXED
      name,
      main_category,
      color,
      tags,
    } = body;

    if (!user_id || !image_url || !object_key || !name || !main_category) {
      console.error('❌ Missing fields:', {
        user_id,
        image_url,
        object_key,
        name,
        main_category,
      });
      throw new Error('Missing required fields in wardrobe item payload.');
    }

    const gsutil_uri = `gs://${this.bucketName}/${object_key}`; // ✅ FIXED

    try {
      const result = await pool.query(
        `INSERT INTO wardrobe_items (
          user_id,
          image_url,
          gsutil_uri,
          name,
          main_category,
          color,
          metadata,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING id`,
        [
          user_id,
          image_url,
          gsutil_uri,
          name,
          main_category,
          color,
          JSON.stringify({ tags }),
        ],
      );

      return {
        message: 'Saved to DB',
        itemId: result.rows[0].id,
      };
    } catch (err) {
      console.error('❌ DB INSERT FAILED:', err);
      throw new Error('Database insert failed.');
    }
  }
}
