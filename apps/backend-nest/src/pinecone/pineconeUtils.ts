// apps/backend-nest/src/pinecone/pineconeUtils.ts
import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';

export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const index = pc.index('styliq-wardrobe');
