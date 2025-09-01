import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Storage } from '@google-cloud/storage';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { DeleteItemDto } from './dto/delete-item.dto';
import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
import { VertexService } from '../vertex/vertex.service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const storage = new Storage();

@Injectable()
export class WardrobeService {
  constructor(private readonly vertex: VertexService) {}

  // CREATE
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
      tags,
    } = dto;

    const result = await pool.query(
      `
      INSERT INTO wardrobe_items (
        user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
        fit, size, brand, metadata, width, height, tags
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15
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
        tags,
      ],
    );

    const item = result.rows[0];

    // Vertex embeddings
    const imageVec = await this.vertex.embedImage(gsutil_uri);
    const textVec = await this.vertex.embedText(
      `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
    );

    const meta = {
      name,
      main_category,
      subcategory,
      color,
      material,
      fit,
      size,
      brand,
      tags,
    };

    await upsertItemNs({
      userId: user_id,
      itemId: item.id,
      imageVec,
      textVec,
      meta,
    });

    return { message: 'Wardrobe item created + indexed successfully', item };
  }

  // READ
  async getItemsByUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows;
  }

  // UPDATE
  async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) throw new Error('No fields provided for update.');

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

  // DELETE
  async deleteItem(dto: DeleteItemDto) {
    const { item_id, user_id, image_url } = dto;

    await pool.query(
      'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
      [item_id, user_id],
    );

    await deleteItemNs(user_id, item_id);

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

  // SUGGEST OUTFITS
  async suggestOutfits(userId: string, queryVec: number[]) {
    const matches = await queryUserNs({
      userId,
      vector: queryVec,
      topK: 20,
      includeMetadata: true,
    });
    return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
  }

  // SEARCH
  async searchText(userId: string, q: string, topK = 20) {
    const vec = await this.vertex.embedText(q);
    const matches = await queryUserNs({
      userId,
      vector: vec,
      topK,
      includeMetadata: true,
    });
    return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
  }

  async searchImage(userId: string, gcsUri: string, topK = 20) {
    const vec = await this.vertex.embedImage(gcsUri);
    const matches = await queryUserNs({
      userId,
      vector: vec,
      topK,
      includeMetadata: true,
    });
    return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
  }

  async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
    const [textVec, imageVec] = await Promise.all([
      q ? this.vertex.embedText(q) : Promise.resolve(undefined),
      gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
    ]);
    return hybridQueryUserNs({ userId, textVec, imageVec, topK });
  }

  private extractFileName(url: string): string {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  }
}

///////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { Storage } from '@google-cloud/storage';
// import { upsertItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs } from '../pinecone/pinecone-query';
// import { VertexService } from '../vertex/vertex.service';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // -------------------
//   // CREATE
//   // -------------------
//   async createItem(dto: CreateWardrobeItemDto) {
//     try {
//       const {
//         user_id,
//         image_url,
//         gsutil_uri,
//         name,
//         main_category,
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         metadata,
//         width,
//         height,
//         tags,
//       } = dto;

//       const result = await pool.query(
//         `
//         INSERT INTO wardrobe_items (
//           user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//           fit, size, brand, metadata, width, height, tags
//         ) VALUES (
//           $1,$2,$3,$4,$5,$6,$7,$8,
//           $9,$10,$11,$12,$13,$14,$15
//         ) RETURNING *`,
//         [
//           user_id,
//           image_url,
//           gsutil_uri,
//           name,
//           main_category,
//           subcategory,
//           color,
//           material,
//           fit,
//           size,
//           brand,
//           metadata,
//           width,
//           height,
//           tags,
//         ],
//       );

//       const item = result.rows[0];

//       // ✅ Real Vertex embeddings
//       const imageVec = await this.vertex.embedImage(gsutil_uri);
//       const textVec = await this.vertex.embedText(
//         `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
//       );

//       const meta = {
//         name,
//         main_category,
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         tags,
//       };

//       // Push into Pinecone
//       await upsertItemNs({
//         userId: user_id,
//         itemId: item.id,
//         imageVec,
//         textVec,
//         meta,
//       });

//       return {
//         message: 'Wardrobe item created + indexed successfully',
//         item,
//       };
//     } catch (err: any) {
//       console.error('❌ Error in createItem:', err.message, err.stack);
//       throw err;
//     }
//   }

//   // -------------------
//   // READ
//   // -------------------
//   async getItemsByUser(userId: string) {
//     try {
//       const result = await pool.query(
//         'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//         [userId],
//       );
//       return result.rows;
//     } catch (err: any) {
//       console.error('❌ Error in getItemsByUser:', err.message, err.stack);
//       throw err;
//     }
//   }

//   // -------------------
//   // UPDATE
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     try {
//       const fields: string[] = [];
//       const values: any[] = [];
//       let index = 1;

//       for (const [key, value] of Object.entries(dto) as [
//         keyof UpdateWardrobeItemDto,
//         any,
//       ][]) {
//         if (value !== undefined) {
//           fields.push(`${key} = $${index}`);
//           values.push(value);
//           index++;
//         }
//       }

//       if (fields.length === 0) {
//         throw new Error('No fields provided for update.');
//       }

//       values.push(itemId);

//       const query = `
//         UPDATE wardrobe_items
//         SET ${fields.join(', ')}, updated_at = NOW()
//         WHERE id = $${index}
//         RETURNING *;
//       `;

//       const result = await pool.query(query, values);

//       return {
//         message: 'Wardrobe item updated successfully',
//         item: result.rows[0],
//       };
//     } catch (err: any) {
//       console.error('❌ Error in updateItem:', err.message, err.stack);
//       throw err;
//     }
//   }

//   // -------------------
//   // DELETE
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     try {
//       await pool.query(
//         'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//         [item_id, user_id],
//       );

//       const bucketName = process.env.GCS_BUCKET_NAME!;
//       const fileName = this.extractFileName(image_url);

//       try {
//         await storage.bucket(bucketName).file(fileName).delete();
//       } catch (err: any) {
//         if (err.code === 404) {
//           console.warn('🧼 GCS file already deleted:', fileName);
//         } else {
//           throw err;
//         }
//       }

//       return { message: 'Wardrobe item deleted successfully' };
//     } catch (err: any) {
//       console.error('❌ Error in deleteItem:', err.message, err.stack);
//       throw err;
//     }
//   }

//   // -------------------
//   // SUGGEST OUTFITS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     try {
//       const matches = await queryUserNs(userId, queryVec);
//       return matches.map((m) => ({
//         id: m.id,
//         score: m.score,
//         meta: m.metadata,
//       }));
//     } catch (err: any) {
//       console.error('❌ Error in suggestOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }

//   // -------------------
//   // HELPERS
//   // -------------------
//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }
// }

//////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { Storage } from '@google-cloud/storage';
// import { upsertItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs } from '../pinecone/pinecone-query';
// import { embedImage, embedText } from '../vertex/embeddings';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   // -------------------
//   // CREATE
//   // -------------------
//   async createItem(dto: CreateWardrobeItemDto) {
//     const {
//       user_id,
//       image_url,
//       gsutil_uri,
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       metadata,
//       width,
//       height,
//     } = dto;

//     // 1) Persist to Postgres
//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14
//       ) RETURNING *`,
//       [
//         user_id,
//         image_url,
//         gsutil_uri,
//         name,
//         main_category,
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         metadata,
//         width,
//         height,
//       ],
//     );

//     const item = result.rows[0];

//     // 2) Build a compact text string for text embeddings
//     const textForEmbedding = [
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//     ]
//       .filter(Boolean)
//       .join(', ');

//     // 3) Generate Vertex embeddings (512-d each)
//     const [imageVec, textVec] = await Promise.all([
//       embedImage(gsutil_uri), // must be a GCS URI like gs://bucket/path.jpg
//       embedText(textForEmbedding || 'wardrobe item'),
//     ]);

//     // 4) Prepare metadata that will be filterable in Pinecone
//     const meta = {
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//     };

//     // 5) Upsert into Pinecone under the user's namespace
//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return {
//       message: 'Wardrobe item created + embedded + indexed successfully',
//       item,
//     };
//   }

//   // -------------------
//   // READ
//   // -------------------
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let idx = 1;

//     for (const [key, value] of Object.entries(dto) as [
//       keyof UpdateWardrobeItemDto,
//       any,
//     ][]) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${idx}`);
//         values.push(value);
//         idx++;
//       }
//     }

//     if (fields.length === 0) {
//       throw new Error('No fields provided for update.');
//     }

//     values.push(itemId);

//     const query = `
//       UPDATE wardrobe_items
//       SET ${fields.join(', ')}, updated_at = NOW()
//       WHERE id = $${idx}
//       RETURNING *;
//     `;

//     const result = await pool.query(query, values);

//     return {
//       message: 'Wardrobe item updated successfully',
//       item: result.rows[0],
//     };
//   }

//   // -------------------
//   // DELETE
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // Delete from Postgres
//     await pool.query(
//       'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//       [item_id, user_id],
//     );

//     // Delete from GCS
//     const bucketName = process.env.GCS_BUCKET_NAME!;
//     const fileName = this.extractFileName(image_url);

//     try {
//       await storage.bucket(bucketName).file(fileName).delete();
//     } catch (err: any) {
//       if (err.code === 404) {
//         console.warn('🧼 GCS file already deleted:', fileName);
//       } else {
//         throw err;
//       }
//     }

//     return { message: 'Wardrobe item deleted successfully' };
//   }

//   // -------------------
//   // SUGGEST OUTFITS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs(userId, queryVec);
//     return matches.map((m) => ({
//       id: m.id,
//       score: m.score,
//       meta: m.metadata,
//     }));
//   }

//   // -------------------
//   // HELPERS
//   // -------------------
//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }
// }

///////////

// // apps/backend-nest/src/wardrobe/wardrobe.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { Storage } from '@google-cloud/storage';
// import { upsertItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs } from '../pinecone/pinecone-query';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   // -------------------
//   // CREATE
//   // -------------------
//   async createItem(dto: CreateWardrobeItemDto) {
//     const {
//       user_id,
//       image_url,
//       gsutil_uri,
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       metadata,
//       width,
//       height,
//     } = dto;

//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14
//       ) RETURNING *`,
//       [
//         user_id,
//         image_url,
//         gsutil_uri,
//         name,
//         main_category,
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         metadata,
//         width,
//         height,
//       ],
//     );

//     const item = result.rows[0];

//     // 🔑 TODO: Replace with Vertex AI embedding calls
//     const imageVec: number[] = []; // multimodalembedding@001
//     const textVec: number[] = []; // text-embedding-004
//     const meta = {
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//     };

//     // Push into Pinecone
//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return {
//       message: 'Wardrobe item created + indexed successfully',
//       item,
//     };
//   }

//   // -------------------
//   // READ
//   // -------------------
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto) as [
//       keyof UpdateWardrobeItemDto,
//       any,
//     ][]) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(value);
//         index++;
//       }
//     }

//     if (fields.length === 0) {
//       throw new Error('No fields provided for update.');
//     }

//     values.push(itemId);

//     const query = `
//       UPDATE wardrobe_items
//       SET ${fields.join(', ')}, updated_at = NOW()
//       WHERE id = $${index}
//       RETURNING *;
//     `;

//     const result = await pool.query(query, values);

//     return {
//       message: 'Wardrobe item updated successfully',
//       item: result.rows[0],
//     };
//   }

//   // -------------------
//   // DELETE
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // Delete from Postgres
//     await pool.query(
//       'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//       [item_id, user_id],
//     );

//     // Delete from GCS
//     const bucketName = process.env.GCS_BUCKET_NAME!;
//     const fileName = this.extractFileName(image_url);

//     try {
//       await storage.bucket(bucketName).file(fileName).delete();
//     } catch (err: any) {
//       if (err.code === 404) {
//         console.warn('🧼 GCS file already deleted:', fileName);
//       } else {
//         throw err;
//       }
//     }

//     return { message: 'Wardrobe item deleted successfully' };
//   }

//   // -------------------
//   // SUGGEST OUTFITS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs(userId, queryVec);
//     return matches.map((m) => ({
//       id: m.id,
//       score: m.score,
//       meta: m.metadata,
//     }));
//   }

//   // -------------------
//   // HELPERS
//   // -------------------
//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }
// }

////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { Storage } from '@google-cloud/storage';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   async createItem(dto: CreateWardrobeItemDto) {
//     const {
//       user_id,
//       image_url,
//       gsutil_uri,
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       metadata,
//       width,
//       height,
//     } = dto;

//     const result = await pool.query(
//       `
//   INSERT INTO wardrobe_items (
//     user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//     fit, size, brand, metadata, width, height
//   ) VALUES (
//     $1, $2, $3, $4, $5, $6, $7, $8,
//     $9, $10, $11, $12, $13, $14
//   ) RETURNING *`,
//       [
//         user_id,
//         image_url,
//         gsutil_uri,
//         name,
//         main_category,
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         metadata,
//         width,
//         height,
//       ],
//     );

//     return {
//       message: 'Wardrobe item created successfully',
//       item: result.rows[0],
//     };
//   }

//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto) as [
//       keyof UpdateWardrobeItemDto,
//       any,
//     ][]) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(value);
//         index++;
//       }
//     }

//     if (fields.length === 0) {
//       throw new Error('No fields provided for update.');
//     }

//     values.push(itemId);

//     const query = `
//     UPDATE wardrobe_items
//     SET ${fields.join(', ')}, updated_at = NOW()
//     WHERE id = $${index}
//     RETURNING *;
//   `;

//     const result = await pool.query(query, values);

//     return {
//       message: 'Wardrobe item updated successfully',
//       item: result.rows[0],
//     };
//   }

//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // Delete from Postgres
//     await pool.query(
//       'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//       [item_id, user_id],
//     );

//     // Delete from GCS — now safely wrapped
//     const bucketName = process.env.GCS_BUCKET_NAME!;
//     const fileName = this.extractFileName(image_url);

//     try {
//       await storage.bucket(bucketName).file(fileName).delete();
//     } catch (err: any) {
//       if (err.code === 404) {
//         console.warn('🧼 GCS file already deleted:', fileName);
//       } else {
//         throw err;
//       }
//     }

//     return { message: 'Wardrobe item deleted successfully' };
//   }

//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }
// }
