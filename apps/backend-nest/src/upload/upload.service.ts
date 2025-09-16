import { Injectable, BadRequestException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { WardrobeService } from '../wardrobe/wardrobe.service';

const IMAGE_CT_FALLBACK = 'image/jpeg';

@Injectable()
export class UploadService {
  private storage = new Storage();
  private bucketName = process.env.GCS_BUCKET_NAME || 'stylhelpr-prod-bucket';

  constructor(private readonly wardrobe: WardrobeService) {}

  /**
   * Create a v4 signed URL for uploading a single object to GCS.
   */
  async generatePresignedUrl(
    userId: string,
    originalFilename: string,
    contentType: string = IMAGE_CT_FALLBACK,
  ) {
    if (!userId || !originalFilename) {
      throw new BadRequestException('userId and filename are required');
    }

    const folderPrefix = userId.slice(0, 2);
    const ext = path.extname(originalFilename) || '';
    const fileId = uuidv4();
    const safeName = originalFilename.replace(/[^\w.\-]/g, '_');
    const objectKey = `uploads/${folderPrefix}/${userId}/images/${fileId}-${safeName}`;

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    // v4 signed URL
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 10 * 60 * 1000, // 10 min
      contentType: contentType || IMAGE_CT_FALLBACK,
    });

    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${objectKey}`;
    const gsutil_uri = `gs://${this.bucketName}/${objectKey}`;

    return { uploadUrl, publicUrl, gsutil_uri, objectKey };
  }

  /**
   * After client uploads the image, call this to create the wardrobe item.
   * This delegates to WardrobeService.createItem so embeddings + Pinecone indexing
   * are handled in one place.
   */
  async saveWardrobeItem(body: any) {
    const {
      user_id,
      image_url,
      object_key,
      name,
      main_category,
      subcategory,
      color,
      material,
      fit,
      size,
      brand,
      tags,
      // all enrichment fields allowed and will be ignored if not part of Create DTO
      ...rest
    } = body || {};

    if (!user_id || !image_url || !object_key || !name || !main_category) {
      throw new BadRequestException(
        'user_id, image_url, object_key, name, main_category are required',
      );
    }

    const gsutil_uri = `gs://${this.bucketName}/${object_key}`;

    // Build the exact CreateWardrobeItemDto expected by WardrobeService
    const payload = {
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
      tags: Array.isArray(tags) ? tags : [],
      // pass-through of any supported enrichment fields safely:
      ...rest,
    };

    // Reuse your existing create flow (DB insert, Vertex embeds, Pinecone upsert)
    return this.wardrobe.createItem(payload as any);
  }
}

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Storage } from '@google-cloud/storage';
// import { v4 as uuidv4 } from 'uuid';
// import { Pool } from 'pg';
// import * as path from 'path';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class UploadService {
//   private storage = new Storage();
//   private bucketName = 'stylhelpr-prod-bucket';

//   async generatePresignedUrl(userId: string, originalFilename: string) {
//     const folderPrefix = userId.slice(0, 2);
//     const fileExtension = path.extname(originalFilename);
//     const fileId = uuidv4();
//     const fileName = `${fileId}${fileExtension}`;
//     const objectKey = `uploads/${folderPrefix}/${userId}/images/${fileName}`;

//     const bucket = this.storage.bucket(this.bucketName);
//     const file = bucket.file(objectKey);

//     const [url] = await file.getSignedUrl({
//       action: 'write',
//       expires: Date.now() + 15 * 60 * 1000,
//       contentType: 'image/jpeg',
//     });

//     return {
//       uploadUrl: url,
//       publicUrl: `https://storage.googleapis.com/${this.bucketName}/${objectKey}`,
//       objectKey,
//     };
//   }

//   async saveWardrobeItem(body: any) {
//     console.log('📥 Incoming wardrobe item:', body);

//     const {
//       user_id,
//       image_url,
//       object_key, // ✅ FIXED
//       name,
//       main_category,
//       color,
//       tags,
//     } = body;

//     if (!user_id || !image_url || !object_key || !name || !main_category) {
//       console.error('❌ Missing fields:', {
//         user_id,
//         image_url,
//         object_key,
//         name,
//         main_category,
//       });
//       throw new Error('Missing required fields in wardrobe item payload.');
//     }

//     const gsutil_uri = `gs://${this.bucketName}/${object_key}`; // ✅ FIXED

//     try {
//       const result = await pool.query(
//         `INSERT INTO wardrobe_items (
//           user_id,
//           image_url,
//           gsutil_uri,
//           name,
//           main_category,
//           color,
//           metadata,
//           created_at,
//           updated_at
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING id`,
//         [
//           user_id,
//           image_url,
//           gsutil_uri,
//           name,
//           main_category,
//           color,
//           JSON.stringify({ tags }),
//         ],
//       );

//       return {
//         message: 'Saved to DB',
//         itemId: result.rows[0].id,
//       };
//     } catch (err) {
//       console.error('❌ DB INSERT FAILED:', err);
//       throw new Error('Database insert failed.');
//     }
//   }
// }
