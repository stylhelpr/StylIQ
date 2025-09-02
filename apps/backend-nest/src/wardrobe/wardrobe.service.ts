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

  // ---- helpers --------------------------------------------------------------

  private normalizePineconeId(raw: string | undefined | null): {
    id: string;
    modality: 'text' | 'image' | 'unknown';
  } {
    if (!raw) return { id: '', modality: 'unknown' };
    const [base, modality] = String(raw).split(':');
    return {
      id: base,
      modality:
        modality === 'text' || modality === 'image' ? modality : 'unknown',
    };
  }

  private extractFileName(url: string): string {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  }

  private sanitizeMeta(
    raw: Record<string, any>,
  ): Record<string, string | number | boolean | string[]> {
    const meta: Record<string, string | number | boolean | string[]> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        meta[k] = v.map(String);
      } else if (typeof v === 'object') {
        meta[k] = JSON.stringify(v);
      } else {
        meta[k] = String(v);
      }
    }
    return meta;
  }

  // -------------------
  // CREATE ITEM
  // -------------------
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
      ) RETURNING *;
      `,
      [
        user_id,
        image_url,
        gsutil_uri ?? null,
        name ?? null,
        main_category,
        subcategory ?? null,
        color ?? null,
        material ?? null,
        fit ?? null,
        size ?? null,
        brand ?? null,
        metadata ? JSON.stringify(metadata) : JSON.stringify({}),
        width ?? null,
        height ?? null,
        tags ?? [],
      ],
    );
    const item = result.rows[0];

    // Generate embeddings
    let imageVec: number[] | undefined;
    if (gsutil_uri) {
      imageVec = await this.vertex.embedImage(gsutil_uri);
    }

    const textVec = await this.vertex.embedText(
      `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
    );

    // Sanitize metadata
    const meta = this.sanitizeMeta({
      name,
      main_category,
      subcategory,
      color,
      material,
      fit,
      size,
      brand,
      tags,
    });

    await upsertItemNs({
      userId: user_id,
      itemId: item.id,
      imageVec,
      textVec,
      meta,
    });

    return { message: 'Wardrobe item created + indexed successfully', item };
  }

  // -------------------
  // READ ITEMS
  // -------------------
  async getItemsByUser(userId: string) {
    const result = await pool.query(
      'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows;
  }

  // -------------------
  // UPDATE ITEM
  // -------------------
  async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(
          typeof value === 'object' && !Array.isArray(value)
            ? JSON.stringify(value)
            : value,
        );
        index++;
      }
    }

    if (fields.length === 0) throw new Error('No fields provided for update.');

    values.push(itemId);

    // 1) Update Postgres
    const query = `
      UPDATE wardrobe_items
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${index}
      RETURNING *;
    `;
    const result = await pool.query(query, values);
    const item = result.rows[0];

    // 2) Decide what needs re-embedding
    let textVec: number[] | undefined;
    let imageVec: number[] | undefined;

    const textFields = [
      'name',
      'main_category',
      'subcategory',
      'color',
      'material',
      'fit',
      'size',
      'brand',
    ];
    const textChanged = textFields.some((f) => f in dto);
    if (textChanged) {
      const textInput = `${item.name || ''} ${item.main_category || ''} ${
        item.subcategory || ''
      } ${item.color || ''} ${item.material || ''} ${item.fit || ''} ${
        item.size || ''
      } ${item.brand || ''}`;
      textVec = await this.vertex.embedText(textInput);
    }

    if ((dto as any).gsutil_uri) {
      imageVec = await this.vertex.embedImage(item.gsutil_uri);
    }

    // 3) Sanitize metadata for Pinecone
    const rawMeta = {
      name: item.name,
      main_category: item.main_category,
      subcategory: item.subcategory,
      color: item.color,
      material: item.material,
      fit: item.fit,
      size: item.size,
      brand: item.brand,
      tags: item.tags,
    };
    const meta: Record<string, string | number | boolean | string[]> = {};
    for (const [k, v] of Object.entries(rawMeta)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        meta[k] = v.map(String);
      } else if (typeof v === 'object') {
        meta[k] = JSON.stringify(v);
      } else {
        meta[k] = String(v);
      }
    }

    // 4) Upsert embeddings into Pinecone if needed
    if (textVec || imageVec) {
      await upsertItemNs({
        userId: item.user_id,
        itemId: item.id,
        textVec,
        imageVec,
        meta,
      });
    }

    return {
      message: 'Wardrobe item updated successfully',
      item,
    };
  }

  // -------------------
  // DELETE ITEM
  // -------------------
  async deleteItem(dto: DeleteItemDto) {
    const { item_id, user_id, image_url } = dto;

    // 1) Try DB delete
    try {
      await pool.query(
        'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
        [item_id, user_id],
      );
    } catch (err: any) {
      console.warn(`⚠️ Skipped DB delete: ${err.message}`);
    }

    // 2) Pinecone cleanup
    try {
      await deleteItemNs(user_id, item_id);
    } catch (err: any) {
      console.warn(`⚠️ Pinecone delete skipped: ${err.message}`);
    }

    // 3) GCS cleanup
    if (image_url) {
      const bucketName = process.env.GCS_BUCKET_NAME!;
      const fileName = this.extractFileName(image_url);

      try {
        await storage.bucket(bucketName).file(fileName).delete();
      } catch (err: any) {
        if (err.code === 404) {
          console.warn('🧼 GCS file already deleted:', fileName);
        } else {
          console.error('❌ Error deleting GCS file:', err.message);
        }
      }
    }

    return { message: 'Wardrobe item cleanup attempted (DB, Pinecone, GCS)' };
  }

  // -------------------
  // VECTOR-BASED SUGGESTIONS & SEARCH
  // -------------------
  async suggestOutfits(userId: string, queryVec: number[]) {
    const matches = await queryUserNs({
      userId,
      vector: queryVec,
      topK: 20,
      includeMetadata: true,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }

  async searchText(userId: string, q: string, topK = 20) {
    const vec = await this.vertex.embedText(q);
    const matches = await queryUserNs({
      userId,
      vector: vec,
      topK,
      includeMetadata: true,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }

  async searchImage(userId: string, gcsUri: string, topK = 20) {
    const vec = await this.vertex.embedImage(gcsUri);
    const matches = await queryUserNs({
      userId,
      vector: vec,
      topK,
      includeMetadata: true,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }

  async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
    const [textVec, imageVec] = await Promise.all([
      q ? this.vertex.embedText(q) : Promise.resolve(undefined),
      gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
    ]);

    const matches = await hybridQueryUserNs({
      userId,
      textVec,
      imageVec,
      topK,
    });
    return matches.map((m) => {
      const { id, modality } = this.normalizePineconeId(m.id as string);
      return { id, modality, score: m.score, meta: m.metadata };
    });
  }

  // -------------------
  // GENERATE AI STYLED OUTFITS (Gemini)
  // -------------------
  async generateOutfits(userId: string, query: string, topK: number) {
    try {
      const queryVec = await this.vertex.embedText(query);
      const matches = await queryUserNs({ userId, vector: queryVec, topK });

      const wardrobeItems = matches
        .map((m) => m.metadata?.name || '')
        .join(', ');

      const prompt = `
      You are a world-class personal stylist.
      Wardrobe items available: ${wardrobeItems}
      User request: "${query}"
      Consider: weather, occasion, style preferences.
      Suggest 2–3 complete outfits.
      If an item is missing, clearly mark it as "MISSING ITEM".
      Respond in JSON.
      `;

      const response = await this.vertex.generateReasonedOutfit(prompt);
      return { outfits: response };
    } catch (err: any) {
      console.error('❌ Error in generateOutfits:', err.message, err.stack);
      throw err;
    }
  }
}

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { Storage } from '@google-cloud/storage';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
// import { VertexService } from '../vertex/vertex.service';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // ---- helpers --------------------------------------------------------------

//   private normalizePineconeId(raw: string | undefined | null): {
//     id: string;
//     modality: 'text' | 'image' | 'unknown';
//   } {
//     if (!raw) return { id: '', modality: 'unknown' };
//     const [base, modality] = String(raw).split(':');
//     return {
//       id: base,
//       modality:
//         modality === 'text' || modality === 'image' ? modality : 'unknown',
//     };
//   }

//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   private sanitizeMeta(
//     raw: Record<string, any>,
//   ): Record<string, string | number | boolean | string[]> {
//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }
//     return meta;
//   }

//   // -------------------
//   // CREATE ITEM
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
//       tags,
//     } = dto;

//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height, tags
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14,$15
//       ) RETURNING *;
//       `,
//       [
//         user_id,
//         image_url,
//         gsutil_uri ?? null,
//         name ?? null,
//         main_category,
//         subcategory ?? null,
//         color ?? null,
//         material ?? null,
//         fit ?? null,
//         size ?? null,
//         brand ?? null,
//         metadata ? JSON.stringify(metadata) : JSON.stringify({}),
//         width ?? null,
//         height ?? null,
//         tags ?? [],
//       ],
//     );
//     const item = result.rows[0];

//     // Generate embeddings
//     let imageVec: number[] | undefined;
//     if (gsutil_uri) {
//       imageVec = await this.vertex.embedImage(gsutil_uri);
//     }

//     const textVec = await this.vertex.embedText(
//       `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
//     );

//     // Sanitize metadata
//     const meta = this.sanitizeMeta({
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       tags,
//     });

//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return { message: 'Wardrobe item created + indexed successfully', item };
//   }

//   // -------------------
//   // READ ITEMS
//   // -------------------
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE ITEM
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(
//           typeof value === 'object' && !Array.isArray(value)
//             ? JSON.stringify(value)
//             : value,
//         );
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

//     values.push(itemId);

//     // 1) Update Postgres
//     const query = `
//       UPDATE wardrobe_items
//       SET ${fields.join(', ')}, updated_at = NOW()
//       WHERE id = $${index}
//       RETURNING *;
//     `;
//     const result = await pool.query(query, values);
//     const item = result.rows[0];

//     // 2) Decide what needs re-embedding
//     let textVec: number[] | undefined;
//     let imageVec: number[] | undefined;

//     const textFields = [
//       'name',
//       'main_category',
//       'subcategory',
//       'color',
//       'material',
//       'fit',
//       'size',
//       'brand',
//     ];
//     const textChanged = textFields.some((f) => f in dto);
//     if (textChanged) {
//       const textInput = `${item.name || ''} ${item.main_category || ''} ${
//         item.subcategory || ''
//       } ${item.color || ''} ${item.material || ''} ${item.fit || ''} ${
//         item.size || ''
//       } ${item.brand || ''}`;
//       textVec = await this.vertex.embedText(textInput);
//     }

//     if ((dto as any).gsutil_uri) {
//       imageVec = await this.vertex.embedImage(item.gsutil_uri);
//     }

//     // 3) Sanitize metadata for Pinecone
//     const rawMeta = {
//       name: item.name,
//       main_category: item.main_category,
//       subcategory: item.subcategory,
//       color: item.color,
//       material: item.material,
//       fit: item.fit,
//       size: item.size,
//       brand: item.brand,
//       tags: item.tags,
//     };
//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(rawMeta)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }

//     // 4) Upsert embeddings into Pinecone if needed
//     if (textVec || imageVec) {
//       await upsertItemNs({
//         userId: item.user_id,
//         itemId: item.id,
//         textVec,
//         imageVec,
//         meta,
//       });
//     }

//     return {
//       message: 'Wardrobe item updated successfully',
//       item,
//     };
//   }

//   // -------------------
//   // DELETE ITEM
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // 1) Try DB delete
//     try {
//       await pool.query(
//         'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//         [item_id, user_id],
//       );
//     } catch (err: any) {
//       console.warn(`⚠️ Skipped DB delete: ${err.message}`);
//     }

//     // 2) Pinecone cleanup
//     try {
//       await deleteItemNs(user_id, item_id);
//     } catch (err: any) {
//       console.warn(`⚠️ Pinecone delete skipped: ${err.message}`);
//     }

//     // 3) GCS cleanup
//     if (image_url) {
//       const bucketName = process.env.GCS_BUCKET_NAME!;
//       const fileName = this.extractFileName(image_url);

//       try {
//         await storage.bucket(bucketName).file(fileName).delete();
//       } catch (err: any) {
//         if (err.code === 404) {
//           console.warn('🧼 GCS file already deleted:', fileName);
//         } else {
//           console.error('❌ Error deleting GCS file:', err.message);
//         }
//       }
//     }

//     return { message: 'Wardrobe item cleanup attempted (DB, Pinecone, GCS)' };
//   }

//   // -------------------
//   // VECTOR-BASED SUGGESTIONS & SEARCH
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }

//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }

//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }

//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);

//     const matches = await hybridQueryUserNs({
//       userId,
//       textVec,
//       imageVec,
//       topK,
//     });
//     return matches.map((m) => {
//       const { id, modality } = this.normalizePineconeId(m.id as string);
//       return { id, modality, score: m.score, meta: m.metadata };
//     });
//   }

//   // -------------------
//   // GENERATE AI STYLED OUTFITS (Gemini)
//   // -------------------
//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({ userId, vector: queryVec, topK });

//       const wardrobeItems = matches
//         .map((m) => m.metadata?.name || '')
//         .join(', ');

//       const prompt = `
//       You are a world-class personal stylist.
//       Wardrobe items available: ${wardrobeItems}
//       User request: "${query}"
//       Consider: weather, occasion, style preferences.
//       Suggest 2–3 complete outfits.
//       If an item is missing, clearly mark it as "MISSING ITEM".
//       Respond in JSON.
//       `;

//       const response = await this.vertex.generateReasonedOutfit(prompt);
//       return { outfits: response };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }
// }

////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { Storage } from '@google-cloud/storage';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
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
//   // CREATE ITEM
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
//       tags,
//     } = dto;

//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height, tags
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14,$15
//       ) RETURNING *;
//       `,
//       [
//         user_id,
//         image_url,
//         gsutil_uri ?? null,
//         name ?? null,
//         main_category,
//         subcategory ?? null,
//         color ?? null,
//         material ?? null,
//         fit ?? null,
//         size ?? null,
//         brand ?? null,
//         metadata ? JSON.stringify(metadata) : JSON.stringify({}),
//         width ?? null,
//         height ?? null,
//         tags ?? [],
//       ],
//     );
//     const item = result.rows[0];

//     // Generate embeddings
//     let imageVec: number[] | undefined;
//     if (gsutil_uri) {
//       imageVec = await this.vertex.embedImage(gsutil_uri); // 👈 guard against null
//     }

//     const textVec = await this.vertex.embedText(
//       `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
//     );

//     // Sanitize metadata
//     const meta = this.sanitizeMeta({
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       tags,
//     });

//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return { message: 'Wardrobe item created + indexed successfully', item };
//   }

//   // -------------------
//   // READ ITEMS
//   // -------------------
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE ITEM
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(
//           typeof value === 'object' && !Array.isArray(value)
//             ? JSON.stringify(value)
//             : value,
//         );
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

//     values.push(itemId);

//     // 1️⃣ Update Postgres
//     const query = `
//     UPDATE wardrobe_items
//     SET ${fields.join(', ')}, updated_at = NOW()
//     WHERE id = $${index}
//     RETURNING *;
//   `;

//     const result = await pool.query(query, values);
//     const item = result.rows[0];

//     // 2️⃣ Decide what needs re-embedding
//     let textVec: number[] | undefined;
//     let imageVec: number[] | undefined;

//     const textFields = [
//       'name',
//       'main_category',
//       'subcategory',
//       'color',
//       'material',
//       'fit',
//       'size',
//       'brand',
//     ];
//     const textChanged = textFields.some((f) => f in dto);
//     if (textChanged) {
//       const textInput = `${item.name || ''} ${item.main_category || ''} ${
//         item.subcategory || ''
//       } ${item.color || ''} ${item.material || ''} ${item.fit || ''} ${
//         item.size || ''
//       } ${item.brand || ''}`;
//       textVec = await this.vertex.embedText(textInput);
//     }

//     if (dto.gsutil_uri) {
//       imageVec = await this.vertex.embedImage(item.gsutil_uri);
//     }

//     // 3️⃣ Sanitize metadata for Pinecone
//     const rawMeta = {
//       name: item.name,
//       main_category: item.main_category,
//       subcategory: item.subcategory,
//       color: item.color,
//       material: item.material,
//       fit: item.fit,
//       size: item.size,
//       brand: item.brand,
//       tags: item.tags,
//     };

//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(rawMeta)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }

//     // 4️⃣ Upsert embeddings into Pinecone if needed
//     if (textVec || imageVec) {
//       await upsertItemNs({
//         userId: item.user_id,
//         itemId: item.id,
//         textVec,
//         imageVec,
//         meta,
//       });
//     }

//     return {
//       message: 'Wardrobe item updated successfully',
//       item,
//     };
//   }

//   // -------------------
//   // DELETE ITEM
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // 1️⃣ Try DB delete (don’t block if not found)
//     try {
//       await pool.query(
//         'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//         [item_id, user_id],
//       );
//     } catch (err) {
//       console.warn(`⚠️ Skipped DB delete: ${err.message}`);
//     }

//     // 2️⃣ Always attempt Pinecone cleanup
//     try {
//       await deleteItemNs(user_id, item_id);
//     } catch (err) {
//       console.warn(`⚠️ Pinecone delete skipped: ${err.message}`);
//     }

//     // 3️⃣ Always try to remove file from GCS
//     if (image_url) {
//       const bucketName = process.env.GCS_BUCKET_NAME!;
//       const fileName = this.extractFileName(image_url);

//       try {
//         await storage.bucket(bucketName).file(fileName).delete();
//       } catch (err: any) {
//         if (err.code === 404) {
//           console.warn('🧼 GCS file already deleted:', fileName);
//         } else {
//           console.error('❌ Error deleting GCS file:', err.message);
//         }
//       }
//     }

//     return { message: 'Wardrobe item cleanup attempted (DB, Pinecone, GCS)' };
//   }

//   // -------------------
//   // VECTOR-BASED SUGGESTIONS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);
//     return hybridQueryUserNs({ userId, textVec, imageVec, topK });
//   }

//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   private sanitizeMeta(
//     raw: Record<string, any>,
//   ): Record<string, string | number | boolean | string[]> {
//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }
//     return meta;
//   }

//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({ userId, vector: queryVec, topK });

//       const wardrobeItems = matches
//         .map((m) => m.metadata?.name || '')
//         .join(', ');

//       const prompt = `
//       You are a world-class personal stylist.
//       Wardrobe items available: ${wardrobeItems}
//       User request: "${query}"
//       Consider: weather, occasion, style preferences.
//       Suggest 2–3 complete outfits.
//       If an item is missing, clearly mark it as "MISSING ITEM".
//       Respond in JSON.
//       `;

//       const response = await this.vertex.generateReasonedOutfit(prompt);
//       return { outfits: response };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }
// }

////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { Storage } from '@google-cloud/storage';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
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
//   // CREATE ITEM
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
//       tags,
//     } = dto;

//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height, tags
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14,$15
//       ) RETURNING *;
//       `,
//       [
//         user_id,
//         image_url,
//         gsutil_uri,
//         name ?? null,
//         main_category,
//         subcategory ?? null,
//         color ?? null,
//         material ?? null,
//         fit ?? null,
//         size ?? null,
//         brand ?? null,
//         metadata ? JSON.stringify(metadata) : JSON.stringify({}),
//         width ?? null,
//         height ?? null,
//         tags ?? [],
//       ],
//     );
//     const item = result.rows[0];

//     // Generate embeddings
//     const imageVec = await this.vertex.embedImage(gsutil_uri);
//     const textVec = await this.vertex.embedText(
//       `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
//     );

//     // Sanitize metadata
//     const meta = this.sanitizeMeta({
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       tags,
//     });

//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return { message: 'Wardrobe item created + indexed successfully', item };
//   }

//   // -------------------
//   // READ ITEMS
//   // -------------------
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE ITEM
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(
//           typeof value === 'object' && !Array.isArray(value)
//             ? JSON.stringify(value)
//             : value,
//         );
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

//     values.push(itemId);

//     // 1️⃣ Update Postgres
//     const query = `
//     UPDATE wardrobe_items
//     SET ${fields.join(', ')}, updated_at = NOW()
//     WHERE id = $${index}
//     RETURNING *;
//   `;

//     const result = await pool.query(query, values);
//     const item = result.rows[0];

//     // 2️⃣ Decide what needs re-embedding
//     let textVec: number[] | undefined;
//     let imageVec: number[] | undefined;

//     const textFields = [
//       'name',
//       'main_category',
//       'subcategory',
//       'color',
//       'material',
//       'fit',
//       'size',
//       'brand',
//     ];
//     const textChanged = textFields.some((f) => f in dto);
//     if (textChanged) {
//       const textInput = `${item.name || ''} ${item.main_category || ''} ${
//         item.subcategory || ''
//       } ${item.color || ''} ${item.material || ''} ${item.fit || ''} ${
//         item.size || ''
//       } ${item.brand || ''}`;
//       textVec = await this.vertex.embedText(textInput);
//     }

//     if ('gsutil_uri' in dto) {
//       imageVec = await this.vertex.embedImage(item.gsutil_uri);
//     }

//     // 3️⃣ Sanitize metadata for Pinecone
//     const rawMeta = {
//       name: item.name,
//       main_category: item.main_category,
//       subcategory: item.subcategory,
//       color: item.color,
//       material: item.material,
//       fit: item.fit,
//       size: item.size,
//       brand: item.brand,
//       tags: item.tags,
//     };

//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(rawMeta)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }

//     // 4️⃣ Upsert embeddings into Pinecone if needed
//     if (textVec || imageVec) {
//       await upsertItemNs({
//         userId: item.user_id,
//         itemId: item.id,
//         textVec,
//         imageVec,
//         meta,
//       });
//     }

//     return {
//       message: 'Wardrobe item updated successfully',
//       item,
//     };
//   }

//   // -------------------
//   // DELETE ITEM
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // 1️⃣ Try DB delete (don’t block if not found)
//     try {
//       await pool.query(
//         'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//         [item_id, user_id],
//       );
//     } catch (err) {
//       console.warn(`⚠️ Skipped DB delete: ${err.message}`);
//     }

//     // 2️⃣ Always attempt Pinecone cleanup
//     try {
//       await deleteItemNs(user_id, item_id);
//     } catch (err) {
//       console.warn(`⚠️ Pinecone delete skipped: ${err.message}`);
//     }

//     // 3️⃣ Always try to remove file from GCS
//     if (image_url) {
//       const bucketName = process.env.GCS_BUCKET_NAME!;
//       const fileName = this.extractFileName(image_url);

//       try {
//         await storage.bucket(bucketName).file(fileName).delete();
//       } catch (err: any) {
//         if (err.code === 404) {
//           console.warn('🧼 GCS file already deleted:', fileName);
//         } else {
//           console.error('❌ Error deleting GCS file:', err.message);
//         }
//       }
//     }

//     return { message: 'Wardrobe item cleanup attempted (DB, Pinecone, GCS)' };
//   }

//   // -------------------
//   // VECTOR-BASED SUGGESTIONS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);
//     return hybridQueryUserNs({ userId, textVec, imageVec, topK });
//   }

//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   private sanitizeMeta(
//     raw: Record<string, any>,
//   ): Record<string, string | number | boolean | string[]> {
//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(raw)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }
//     return meta;
//   }

//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({ userId, vector: queryVec, topK });

//       const wardrobeItems = matches
//         .map((m) => m.metadata?.name || '')
//         .join(', ');

//       const prompt = `
//       You are a world-class personal stylist.
//       Wardrobe items available: ${wardrobeItems}
//       User request: "${query}"
//       Consider: weather, occasion, style preferences.
//       Suggest 2–3 complete outfits.
//       If an item is missing, clearly mark it as "MISSING ITEM".
//       Respond in JSON.
//       `;

//       const response = await this.vertex.generateReasonedOutfit(prompt);
//       return { outfits: response };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }
// }

///////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { Storage } from '@google-cloud/storage';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert';
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
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
//   // CREATE ITEM
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
//       tags,
//     } = dto;

//     // Insert into Postgres
//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height, tags
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14,$15
//       ) RETURNING *;
//       `,
//       [
//         user_id,
//         image_url,
//         gsutil_uri,
//         name ?? null,
//         main_category,
//         subcategory ?? null,
//         color ?? null,
//         material ?? null,
//         fit ?? null,
//         size ?? null,
//         brand ?? null,
//         metadata ? JSON.stringify(metadata) : JSON.stringify({}),
//         width ?? null,
//         height ?? null,
//         tags ?? [],
//       ],
//     );
//     const item = result.rows[0];

//     // Generate embeddings
//     const imageVec = await this.vertex.embedImage(gsutil_uri);
//     const textVec = await this.vertex.embedText(
//       `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
//     );

//     // Sanitize metadata for Pinecone
//     const rawMeta = {
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       tags,
//     };

//     const meta: Record<string, string | number | boolean | string[]> = {};
//     for (const [k, v] of Object.entries(rawMeta)) {
//       if (v === undefined || v === null) continue;
//       if (Array.isArray(v)) {
//         meta[k] = v.map(String);
//       } else if (typeof v === 'object') {
//         meta[k] = JSON.stringify(v);
//       } else {
//         meta[k] = String(v);
//       }
//     }

//     // Upsert into Pinecone
//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return { message: 'Wardrobe item created + indexed successfully', item };
//   }

//   // -------------------
//   // READ ITEMS
//   // -------------------
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE ITEM
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(
//           typeof value === 'object' && !Array.isArray(value)
//             ? JSON.stringify(value)
//             : value,
//         );
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

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
//   // DELETE ITEM
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     await pool.query(
//       'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//       [item_id, user_id],
//     );

//     await deleteItemNs(user_id, item_id);

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
//   // VECTOR-BASED SUGGESTIONS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);
//     return hybridQueryUserNs({ userId, textVec, imageVec, topK });
//   }

//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({ userId, vector: queryVec, topK });

//       const wardrobeItems = matches
//         .map((m) => m.metadata?.name || '')
//         .join(', ');

//       const prompt = `
//       You are a world-class personal stylist.
//       Wardrobe items available: ${wardrobeItems}
//       User request: "${query}"
//       Consider: weather, occasion, style preferences.
//       Suggest 2–3 complete outfits.
//       If an item is missing, clearly mark it as "MISSING ITEM".
//       Respond in JSON.
//       `;

//       const response = await this.vertex.generateReasonedOutfit(prompt);
//       return { outfits: response };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }
// }

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg'; // 👈 Postgres client
// import { Storage } from '@google-cloud/storage'; // 👈 GCS client
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert'; // 👈 Pinecone helpers
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
// import { VertexService } from '../vertex/vertex.service'; // 👈 Handles Vertex embeddings + Gemini

// // 🔹 Database connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // 🔹 Cloud Storage client (uploads + deletes wardrobe images)
// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // -------------------
//   // CREATE ITEM
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
//       tags,
//     } = dto;

//     // 1️⃣ Insert item into Postgres
//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height, tags
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14,$15
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
//         tags,
//       ],
//     );
//     const item = result.rows[0];

//     // 2️⃣ Generate embeddings with Vertex
//     const imageVec = await this.vertex.embedImage(gsutil_uri);
//     const textVec = await this.vertex.embedText(
//       `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
//     );

//     // Metadata stored with Pinecone vector
//     const meta = {
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       tags,
//     };

//     // 3️⃣ Upsert vectors + metadata into Pinecone (two per item: image + text)
//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return { message: 'Wardrobe item created + indexed successfully', item };
//   }

//   // -------------------
//   // READ ITEMS
//   // -------------------
//   async getItemsByUser(userId: string) {
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE ITEM
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(value);
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

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
//   // DELETE ITEM
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // 1️⃣ Remove from Postgres
//     await pool.query(
//       'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//       [item_id, user_id],
//     );

//     // 2️⃣ Remove vectors from Pinecone
//     await deleteItemNs(user_id, item_id);

//     // 3️⃣ Remove file from GCS bucket
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
//   // VECTOR-BASED SUGGESTIONS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   // -------------------
//   // SEARCH (Text → Embedding → Pinecone)
//   // -------------------
//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   // -------------------
//   // SEARCH (Image → Embedding → Pinecone)
//   // -------------------
//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   // -------------------
//   // HYBRID SEARCH (Text + Image → Pinecone fusion)
//   // -------------------
//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);
//     return hybridQueryUserNs({ userId, textVec, imageVec, topK });
//   }

//   // -------------------
//   // UTILITY: Extract file name from full GCS URL
//   // -------------------
//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   // -------------------
//   // AI-POWERED OUTFIT GENERATION (Flash for quick, Pro for stylist quality)
//   // -------------------
//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       // 1️⃣ Search Pinecone to get wardrobe items relevant to the query
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({ userId, vector: queryVec, topK });

//       const wardrobeItems = matches
//         .map((m) => m.metadata?.name || '')
//         .join(', ');

//       // 2️⃣ Build stylist prompt
//       const prompt = `
//       You are a world-class personal stylist.
//       Wardrobe items available: ${wardrobeItems}
//       User request: "${query}"

//       Consider: weather, occasion, style preferences.
//       Suggest 2–3 complete outfits.
//       If an item is missing, clearly mark it as "MISSING ITEM".
//       Respond in JSON:
//       [
//         { "title": "Smart Casual Evening", "items": ["White Oxford Shirt", "Navy Trousers", "Loafers"], "reasoning": "Balanced look for warm LA evenings" }
//       ]
//       `;

//       // 3️⃣ Use Gemini-2.5-Pro for deeper reasoning
//       const response = await this.vertex.generateReasonedOutfit(prompt);

//       return { outfits: response };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }
// }

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg'; // 👈 Postgres client
// import { Storage } from '@google-cloud/storage'; // 👈 GCS client
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { upsertItemNs, deleteItemNs } from '../pinecone/pinecone-upsert'; // 👈 Pinecone helpers
// import { queryUserNs, hybridQueryUserNs } from '../pinecone/pinecone-query';
// import { VertexService } from '../vertex/vertex.service'; // 👈 Handles Vertex embeddings + Gemini

// // 🔹 Database connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // 🔹 Cloud Storage client (uploads + deletes wardrobe images)
// const storage = new Storage();

// @Injectable()
// export class WardrobeService {
//   constructor(private readonly vertex: VertexService) {}

//   // -------------------
//   // CREATE ITEM
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
//       tags,
//     } = dto;

//     // 1️⃣ Insert item into Postgres
//     const result = await pool.query(
//       `
//       INSERT INTO wardrobe_items (
//         user_id, image_url, gsutil_uri, name, main_category, subcategory, color, material,
//         fit, size, brand, metadata, width, height, tags
//       ) VALUES (
//         $1,$2,$3,$4,$5,$6,$7,$8,
//         $9,$10,$11,$12,$13,$14,$15
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
//         tags,
//       ],
//     );
//     const item = result.rows[0];

//     // 2️⃣ Generate embeddings with Vertex
//     const imageVec = await this.vertex.embedImage(gsutil_uri);
//     const textVec = await this.vertex.embedText(
//       `${name || ''} ${main_category || ''} ${subcategory || ''} ${color || ''} ${material || ''} ${fit || ''} ${size || ''} ${brand || ''}`,
//     );

//     // Metadata stored with Pinecone vector
//     const meta = {
//       name,
//       main_category,
//       subcategory,
//       color,
//       material,
//       fit,
//       size,
//       brand,
//       tags,
//     };

//     // 3️⃣ Upsert vectors + metadata into Pinecone (two per item: image + text)
//     await upsertItemNs({
//       userId: user_id,
//       itemId: item.id,
//       imageVec,
//       textVec,
//       meta,
//     });

//     return { message: 'Wardrobe item created + indexed successfully', item };
//   }

//   // -------------------
//   // READ ITEMS
//   // -------------------
//   async getItemsByUser(userId: string) {
//     // Fetch wardrobe from Postgres
//     const result = await pool.query(
//       'SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC',
//       [userId],
//     );
//     return result.rows;
//   }

//   // -------------------
//   // UPDATE ITEM
//   // -------------------
//   async updateItem(itemId: string, dto: UpdateWardrobeItemDto) {
//     // Dynamically build UPDATE query for only provided fields
//     const fields: string[] = [];
//     const values: any[] = [];
//     let index = 1;

//     for (const [key, value] of Object.entries(dto)) {
//       if (value !== undefined) {
//         fields.push(`${key} = $${index}`);
//         values.push(value);
//         index++;
//       }
//     }

//     if (fields.length === 0) throw new Error('No fields provided for update.');

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
//   // DELETE ITEM
//   // -------------------
//   async deleteItem(dto: DeleteItemDto) {
//     const { item_id, user_id, image_url } = dto;

//     // 1️⃣ Remove from Postgres
//     await pool.query(
//       'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
//       [item_id, user_id],
//     );

//     // 2️⃣ Remove vectors from Pinecone
//     await deleteItemNs(user_id, item_id);

//     // 3️⃣ Remove file from GCS bucket
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
//   // VECTOR-BASED SUGGESTIONS
//   // -------------------
//   async suggestOutfits(userId: string, queryVec: number[]) {
//     // Direct vector search in Pinecone
//     const matches = await queryUserNs({
//       userId,
//       vector: queryVec,
//       topK: 20,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   // -------------------
//   // SEARCH (Text → Embedding → Pinecone)
//   // -------------------
//   async searchText(userId: string, q: string, topK = 20) {
//     const vec = await this.vertex.embedText(q);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   // -------------------
//   // SEARCH (Image → Embedding → Pinecone)
//   // -------------------
//   async searchImage(userId: string, gcsUri: string, topK = 20) {
//     const vec = await this.vertex.embedImage(gcsUri);
//     const matches = await queryUserNs({
//       userId,
//       vector: vec,
//       topK,
//       includeMetadata: true,
//     });
//     return matches.map((m) => ({ id: m.id, score: m.score, meta: m.metadata }));
//   }

//   // -------------------
//   // HYBRID SEARCH (Text + Image → Pinecone fusion)
//   // -------------------
//   async searchHybrid(userId: string, q?: string, gcsUri?: string, topK = 20) {
//     const [textVec, imageVec] = await Promise.all([
//       q ? this.vertex.embedText(q) : Promise.resolve(undefined),
//       gcsUri ? this.vertex.embedImage(gcsUri) : Promise.resolve(undefined),
//     ]);
//     return hybridQueryUserNs({ userId, textVec, imageVec, topK });
//   }

//   // -------------------
//   // UTILITY: Extract file name from full GCS URL
//   // -------------------
//   private extractFileName(url: string): string {
//     const parts = url.split('/');
//     return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
//   }

//   // -------------------
//   // AI-POWERED OUTFIT GENERATION
//   // -------------------
//   async generateOutfits(userId: string, query: string, topK: number) {
//     try {
//       // 1️⃣ Search Pinecone to get wardrobe items relevant to the query
//       const queryVec = await this.vertex.embedText(query);
//       const matches = await queryUserNs({ userId, vector: queryVec, topK });

//       // 2️⃣ Build stylist prompt for Gemini
//       const wardrobeItems = matches
//         .map((m) => m.metadata?.name || '')
//         .join(', ');
//       const prompt = `
//       You are a world-class fashion stylist.
//       Based on these wardrobe items: ${wardrobeItems}
//       and the request: "${query}"
//       suggest 2-3 complete outfits.
//       Respond with JSON like:
//       [
//         { "title": "Smart Casual Evening", "items": ["White Oxford Shirt", "Navy Trousers", "Loafers"], "reasoning": "Balanced look for warm LA evenings" }
//       ]
//     `;

//       // 3️⃣ Call Gemini-2.5-Flash (Generative AI)
//       const response = await this.vertex.generateOutfits(prompt);

//       return { outfits: response };
//     } catch (err: any) {
//       console.error('❌ Error in generateOutfits:', err.message, err.stack);
//       throw err;
//     }
//   }
// }
