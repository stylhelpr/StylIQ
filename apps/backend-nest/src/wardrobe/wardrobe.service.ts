import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
// import { Pinecone } from '@pinecone-database/pinecone';
import { Pool } from 'pg';
import { DeleteItemDto } from './dto/delete-item.dto';

const pool = new Pool();
// const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
// const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
const storage = new Storage();

@Injectable()
export class WardrobeService {
  async deleteItem(dto: DeleteItemDto) {
    const { item_id, user_id, image_url } = dto;

    // 1. Delete from Postgres
    await pool.query(
      'DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2',
      [item_id, user_id],
    );

    // 2. Delete from Pinecone
    // await index.deleteOne(item_id);

    // 3. Delete from GCS
    const bucketName = process.env.GCS_BUCKET_NAME!;
    const fileName = this.extractFileName(image_url);
    await storage.bucket(bucketName).file(fileName).delete();

    return { message: 'Wardrobe item deleted successfully' };
  }

  extractFileName(url: string): string {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  }
}
