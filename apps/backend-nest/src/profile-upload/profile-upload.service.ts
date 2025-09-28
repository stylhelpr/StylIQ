import { Injectable, BadRequestException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import { Pool } from 'pg';

const IMAGE_CT_FALLBACK = 'image/jpeg';

@Injectable()
export class ProfileUploadService {
  private storage = new Storage();
  private bucketName =
    process.env.GCS_PROFILE_BUCKET || 'stylhelpr-prod-profile-photos';
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  /**
   * Generate a presigned URL to upload a profile photo directly to GCS
   */
  async generateProfilePresignedUrl(
    userId: string,
    originalFilename: string,
    contentType: string = IMAGE_CT_FALLBACK,
  ) {
    if (!userId || !originalFilename) {
      throw new BadRequestException('userId and filename are required');
    }

    const ext = path.extname(originalFilename) || '';
    const objectKey = `profiles/${userId}${ext}`;
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 10 * 60 * 1000,
      contentType,
    });

    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${objectKey}`;
    const gsutilUri = `gs://${this.bucketName}/${objectKey}`;

    return { uploadUrl, publicUrl, gsutilUri, objectKey };
  }

  /**
   * Save the final profile photo URL into the users table
   */
  async saveProfilePhoto(userId: string, imageUrl: string, objectKey: string) {
    if (!userId || !imageUrl || !objectKey) {
      throw new BadRequestException(
        'user_id, image_url, and object_key are required',
      );
    }

    // ✅ Only update profile_picture to avoid DB column errors
    const query = `
      UPDATE users
      SET profile_picture = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, profile_picture;
    `;

    const result = await this.pool.query(query, [imageUrl, userId]);

    if (result.rowCount === 0) {
      throw new BadRequestException(`User ${userId} not found`);
    }

    return result.rows[0];
  }
}

////////////////////

// import { Injectable, BadRequestException } from '@nestjs/common';
// import { Storage } from '@google-cloud/storage';
// import * as path from 'path';
// import { Pool } from 'pg';

// const IMAGE_CT_FALLBACK = 'image/jpeg';

// @Injectable()
// export class ProfileUploadService {
//   private storage = new Storage();
//   private bucketName =
//     process.env.GCS_PROFILE_BUCKET || 'stylhelpr-prod-profile-photos';
//   private pool: Pool;

//   constructor() {
//     this.pool = new Pool({
//       connectionString: process.env.DATABASE_URL, // ✅ Ensure this is set in your env
//     });
//   }

//   /**
//    * Generate a presigned URL to upload a profile photo directly to GCS
//    */
//   async generateProfilePresignedUrl(
//     userId: string,
//     originalFilename: string,
//     contentType: string = IMAGE_CT_FALLBACK,
//   ) {
//     if (!userId || !originalFilename) {
//       throw new BadRequestException('userId and filename are required');
//     }

//     const ext = path.extname(originalFilename) || '';
//     const objectKey = `profiles/${userId}${ext}`;
//     const bucket = this.storage.bucket(this.bucketName);
//     const file = bucket.file(objectKey);

//     const [uploadUrl] = await file.getSignedUrl({
//       version: 'v4',
//       action: 'write',
//       expires: Date.now() + 10 * 60 * 1000,
//       contentType,
//     });

//     const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${objectKey}`;
//     const gsutilUri = `gs://${this.bucketName}/${objectKey}`;

//     return { uploadUrl, publicUrl, gsutilUri, objectKey };
//   }

//   /**
//    * Save the final profile photo URL into the users table
//    */
//   async saveProfilePhoto(userId: string, imageUrl: string, objectKey: string) {
//     if (!userId || !imageUrl || !objectKey) {
//       throw new BadRequestException(
//         'user_id, image_url, and object_key are required',
//       );
//     }

//     // ✅ If your DB **does NOT** have `profile_picture_key`, remove that column from the query.
//     // ✅ If it DOES, make sure you pass all 3 parameters (imageUrl, objectKey, userId)
//     const query = `
//       UPDATE users
//       SET profile_picture = $1,
//           profile_picture_key = $2,
//           updated_at = NOW()
//       WHERE id = $3
//       RETURNING id, email, profile_picture, profile_picture_key;
//     `;

//     // ✅ Pass ALL THREE parameters to match the placeholders above
//     const result = await this.pool.query(query, [imageUrl, objectKey, userId]);

//     if (result.rowCount === 0) {
//       throw new BadRequestException(`User ${userId} not found`);
//     }

//     return result.rows[0]; // ✅ Return updated user data
//   }
// }
