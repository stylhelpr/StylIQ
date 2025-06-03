import { Injectable } from '@nestjs/common';
import { PineconeController } from './pinecone.controller';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

@Injectable()
export class PineconeService {
  async search({
    vector,
    topK,
    metadata,
  }: {
    vector: number[];
    topK: number;
    metadata?: any;
  }) {
    const query = {
      vector,
      topK,
      filter: metadata || {},
      includeMetadata: true,
    };
    const result = await index.query({ query });
    return result.matches;
  }

  async upsert({
    id,
    vector,
    metadata,
  }: {
    id: string;
    vector: number[];
    metadata: any;
  }) {
    await index.upsert({
      upsertRequest: {
        vectors: [{ id, values: vector, metadata }],
      },
    });
    return { message: 'Vector upserted' };
  }

  async delete(id: string) {
    await index.deleteOne(id);
    return { message: 'Vector deleted' };
  }
}
