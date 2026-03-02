import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { CreateSavedLookDto } from './dto/create-saved-look.dto';
import { UpdateSavedLookDto } from './dto/update-saved-look.dto';
import { pool, safeQuery } from '../db/pool';
import { getSecret, getSecretJson, secretExists } from '../config/secrets';
import { LearningEventsService } from '../learning/learning-events.service';
import { LEARNING_FLAGS } from '../config/feature-flags';

type GCPServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: any;
};

@Injectable()
export class SavedLookService {
  private storage: Storage;

  constructor(private readonly learningEvents: LearningEventsService) {
    const credentials = getSecretJson<GCPServiceAccount>(
      'GCP_SERVICE_ACCOUNT_JSON',
    );
    this.storage = new Storage({
      projectId: credentials.project_id,
      credentials,
    });
  }

  private get bucketName(): string {
    return secretExists('GCS_BUCKET_NAME')
      ? getSecret('GCS_BUCKET_NAME')
      : 'stylhelpr-prod-bucket';
  }

  /**
   * Download an image from an external URL and upload it to GCS.
   * Returns the GCS public URL.
   */
  private async downloadAndUploadToGCS(
    externalUrl: string,
    userId: string,
  ): Promise<{ publicUrl: string; gsutilUri: string; objectKey: string }> {
    // Fetch the image from the external URL
    const response = await fetch(externalUrl);
    if (!response.ok) {
      throw new BadRequestException(
        `Failed to fetch image from URL: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from content type
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';

    // Generate unique object key
    const folderPrefix = userId.slice(0, 2);
    const fileId = uuidv4();
    const objectKey = `saved-looks/${folderPrefix}/${userId}/${fileId}${ext}`;

    // Upload to GCS
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectKey);

    await file.save(buffer, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
      // With uniform bucket-level access, public access is controlled at bucket level
      // No need to call makePublic() - bucket IAM grants allUsers read access
    });

    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${objectKey}`;
    const gsutilUri = `gs://${this.bucketName}/${objectKey}`;

    console.log('[SavedLooks] Uploaded to GCS:', { publicUrl, gsutilUri });

    return { publicUrl, gsutilUri, objectKey };
  }

  async create(dto: CreateSavedLookDto) {
    const { user_id, image_url, name } = dto;

    // Download the external image and upload to GCS
    let gcsImageUrl = image_url;
    let gsutilUri: string | null = null;
    let objectKey: string | null = null;

    try {
      const gcsResult = await this.downloadAndUploadToGCS(image_url, user_id);
      gcsImageUrl = gcsResult.publicUrl;
      gsutilUri = gcsResult.gsutilUri;
      objectKey = gcsResult.objectKey;
    } catch (err) {
      console.error(
        '[SavedLooks] Failed to upload to GCS, falling back to external URL:',
        err,
      );
      // Fall back to storing the external URL if upload fails
    }

    // Try to insert with new GCS columns, fall back to original schema if columns don't exist
    let savedLook: any;
    try {
      const res = await pool.query(
        `INSERT INTO saved_looks (user_id, image_url, name, gsutil_uri, object_key, original_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, gcsImageUrl, name ?? null, gsutilUri, objectKey, image_url],
      );
      savedLook = res.rows[0];
    } catch (err: any) {
      // If the columns don't exist yet, fall back to the original insert
      if (err.code === '42703') {
        // column does not exist
        console.warn('[SavedLooks] New columns not found, using legacy insert');
        const res = await pool.query(
          `INSERT INTO saved_looks (user_id, image_url, name)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [user_id, gcsImageUrl, name ?? null],
        );
        savedLook = res.rows[0];
      } else {
        throw err;
      }
    }

    // Emit LOOK_SAVED learning event (shadow mode - no behavior change)
    if (LEARNING_FLAGS.EVENTS_ENABLED && savedLook?.id) {
      this.learningEvents
        .logEvent({
          userId: user_id,
          eventType: 'LOOK_SAVED',
          entityType: 'look',
          entityId: savedLook.id,
          signalPolarity: 1,
          signalWeight: 0.3,
          extractedFeatures: {},
          sourceFeature: 'looks',
          clientEventId: `look_saved:${user_id}:${savedLook.id}`,
        })
        .catch(() => {});
    }

    return savedLook;
  }

  async getByUser(userId: string) {
    // Use safeQuery to handle connection timeouts gracefully (returns [] on failure)
    const res = await safeQuery(
      `SELECT * FROM saved_looks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows;
  }

  async update(id: string, userId: string, dto: UpdateSavedLookDto) {
    const entries = Object.entries(dto).filter(
      ([_, value]) => value !== undefined,
    );

    if (entries.length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const fields = entries.map(([key], i) => `${key} = $${i + 3}`);
    const values = entries.map(([, value]) => value);

    const res = await pool.query(
      `UPDATE saved_looks
       SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException('Saved look not found');
    }

    return res.rows[0];
  }

  async delete(id: string, userId: string) {
    const result = await pool.query(
      `DELETE FROM saved_looks WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Saved look not found');
    }

    return { message: 'Deleted' };
  }
}

//////////////

// // src/saved-look/saved-look.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateSavedLookDto } from './dto/create-saved-look.dto';
// import { UpdateSavedLookDto } from './dto/update-saved-look.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class SavedLookService {
//   async create(dto: CreateSavedLookDto) {
//     const { user_id, image_url, name } = dto;

//     const res = await pool.query(
//       `INSERT INTO saved_looks (user_id, image_url, name)
//        VALUES ($1, $2, $3)
//        RETURNING *`,
//       [user_id, image_url, name ?? null],
//     );

//     return res.rows[0];
//   }

//   async getByUser(userId: string) {
//     const res = await pool.query(
//       `SELECT * FROM saved_looks
//        WHERE user_id = $1
//        ORDER BY created_at DESC`,
//       [userId],
//     );
//     console.log('✅ Saved looks found:', res.rows);
//     return res.rows;
//   }

//   async update(id: string, dto: UpdateSavedLookDto) {
//     const entries = Object.entries(dto);
//     if (entries.length === 0) return null;

//     const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
//     const values = entries.map(([, value]) => value);

//     const res = await pool.query(
//       `UPDATE saved_looks
//        SET ${fields.join(', ')}, updated_at = now()
//        WHERE id = $1
//        RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     const result = await pool.query(`DELETE FROM saved_looks WHERE id = $1`, [
//       id,
//     ]);
//     return { message: result.rowCount > 0 ? 'Deleted' : 'Not found' };
//   }
// }

//////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateSavedLookDto } from './dto/create-saved-look.dto';
// import { UpdateSavedLookDto } from './dto/update-saved-look.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class SavedLookService {
//   async create(dto: CreateSavedLookDto) {
//     const { user_id, image_url, name } = dto;

//     const res = await pool.query(
//       `INSERT INTO saved_looks (user_id, image_url, name)
//        VALUES ($1, $2, $3)
//        RETURNING *`,
//       [user_id, image_url, name ?? null],
//     );

//     return res.rows[0];
//   }

//   async getByUser(userId: string) {
//     const res = await pool.query(
//       `SELECT * FROM saved_looks
//        WHERE user_id = $1
//        ORDER BY created_at DESC`,
//       [userId],
//     );
//     console.log('✅ Saved looks found:', res.rows);
//     return res.rows;
//   }

//   async update(id: string, dto: UpdateSavedLookDto) {
//     const entries = Object.entries(dto);
//     if (entries.length === 0) return null;

//     const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
//     const values = entries.map(([, value]) => value);

//     const res = await pool.query(
//       `UPDATE saved_looks
//        SET ${fields.join(', ')}, updated_at = now()
//        WHERE id = $1
//        RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query(`DELETE FROM saved_looks WHERE id = $1`, [id]);
//     return { message: 'Deleted' };
//   }
// }
