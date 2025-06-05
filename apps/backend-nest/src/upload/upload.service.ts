import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Pinecone } from '@pinecone-database/pinecone';
import { UploadDto } from './dto/upload.dto';
// import callVertexAI(), callGemini() here if applicable

const pool = new Pool();
// const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
// const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

@Injectable()
export class UploadService {
  async handleUpload(dto: UploadDto) {
    const { user_id, image_url, name, width, height } = dto;

    // 1. Call Gemini Flash for metadata (mock or actual call)
    const metadata = await this.generateMetadata(image_url);

    // 2. Call Vertex AI for vector embedding (mock or actual call)
    const vector = await this.generateEmbedding(image_url);

    // 3. Insert into Postgres
    const res = await pool.query(
      `INSERT INTO wardrobe_items (
        user_id, image_url, name, main_category, subcategory,
        color, material, fit, size, brand, metadata, width, height
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      ) RETURNING id`,
      [
        user_id,
        image_url,
        name,
        metadata.main_category,
        metadata.subcategory,
        metadata.color,
        metadata.material,
        metadata.fit,
        metadata.size,
        metadata.brand,
        metadata,
        width,
        height,
      ],
    );

    const itemId = res.rows[0].id;

    // 4. Upsert to Pinecone
    // await index.upsert({
    //   upsertRequest: {
    //     vectors: [
    //       {
    //         id: itemId,
    //         values: vector,
    //         metadata,
    //       },
    //     ],
    //   },
    // });

    return { message: 'Upload complete', itemId };
  }

  async generateMetadata(image_url: string) {
    // mock Gemini call
    return {
      main_category: 'Tops',
      subcategory: 'T-Shirts',
      color: 'Black',
      material: 'Cotton',
      fit: 'Regular',
      size: 'M',
      brand: 'Calvin Klein',
      neckline: 'Crew',
      pattern: 'Solid',
      tags: ['casual', 'summer'],
    };
  }

  async generateEmbedding(image_url: string) {
    // mock Vertex AI call
    return Array(1024).fill(0.1);
  }
}
