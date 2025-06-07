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

    const { user_id, image_url, name, main_category, color, tags } = body;

    if (!user_id || !image_url || !name || !main_category) {
      console.error('❌ Missing fields:', {
        user_id,
        image_url,
        name,
        main_category,
      });
      throw new Error('Missing required fields in wardrobe item payload.');
    }

    try {
      const result = await pool.query(
        `INSERT INTO wardrobe_items (
        user_id,
        image_url,
        name,
        main_category,
        color,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id`,
        [
          user_id,
          image_url,
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

//////////////

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
//   private bucketName = 'stylhelpr-dev-bucket';

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

//     const { user_id, image_url, name, main_category, color, tags } = body;

//     if (!user_id || !image_url || !name || !main_category) {
//       console.error('❌ Missing fields:', {
//         user_id,
//         image_url,
//         name,
//         main_category,
//       });
//       throw new Error('Missing required fields in wardrobe item payload.');
//     }

//     try {
//       const result = await pool.query(
//         `INSERT INTO wardrobe_items (
//         user_id,
//         image_url,
//         name,
//         main_category,
//         color,
//         metadata,
//         created_at,
//         updated_at
//       ) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id`,
//         [
//           user_id,
//           image_url,
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

/////////////

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
//   private bucketName = 'stylhelpr-dev-bucket';

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
//     const { user_id, image_url, name, main_category, color, tags } = body;

//     console.log('📥 Incoming wardrobe item:', body);

//     try {
//       const result = await pool.query(
//         `INSERT INTO wardrobe_items (
//         user_id,
//         image_url,
//         name,
//         main_category,
//         color,
//         metadata,
//         created_at,
//         updated_at
//       ) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id`,
//         [
//           user_id,
//           image_url,
//           name,
//           main_category,
//           color,
//           JSON.stringify({ tags }),
//         ],
//       );

//       console.log('✅ Saved to DB:', result.rows[0]);

//       return {
//         message: 'Saved to DB',
//         itemId: result.rows[0].id,
//       };
//     } catch (err) {
//       console.error('❌ DB INSERT FAILED:', err);
//       throw err;
//     }
//   }
// }

/////////////

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
//   private bucketName = 'stylhelpr-dev-bucket';

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
//     const { user_id, image_url, name, main_category, color, tags } = body;

//     const result = await pool.query(
//       `INSERT INTO wardrobe_items (
//         user_id,
//         image_url,
//         name,
//         main_category,
//         color,
//         metadata,
//         created_at,
//         updated_at
//       ) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id`,
//       [
//         user_id,
//         image_url,
//         name,
//         main_category,
//         color,
//         JSON.stringify({ tags }),
//       ],
//     );

//     return {
//       message: 'Saved to DB',
//       itemId: result.rows[0].id,
//     };
//   }
// }

//////////////

// import { Injectable } from '@nestjs/common';
// import { UploadDto } from './dto/upload.dto';

// @Injectable()
// export class UploadService {
//   async handleUpload(dto: UploadDto) {
//     const { user_id, image_url, name, width, height } = dto;

//     // 1. Generate mock metadata (replace with Gemini Flash later)
//     const metadata = await this.generateMetadata(image_url);

//     // 2. Generate mock embedding (replace with Vertex AI later)
//     const vector = await this.generateEmbedding(image_url);

//     // 3. Skipping actual DB insert — returning mock ID
//     const itemId = 'mock-id-123';

//     // 4. Skipping actual Pinecone upsert

//     return {
//       message: 'Upload complete (mock)',
//       itemId,
//       metadata,
//       embeddingSample: vector.slice(0, 5), // show preview of embedding
//     };
//   }

//   async generateMetadata(image_url: string) {
//     // Mocked Gemini Flash output
//     return {
//       main_category: 'Tops',
//       subcategory: 'T-Shirts',
//       color: 'Black',
//       material: 'Cotton',
//       fit: 'Regular',
//       size: 'M',
//       brand: 'Calvin Klein',
//       neckline: 'Crew',
//       pattern: 'Solid',
//       tags: ['casual', 'summer'],
//     };
//   }

//   async generateEmbedding(image_url: string) {
//     // Mocked 1024-dim embedding
//     return Array(1024).fill(0.1);
//   }
// }
