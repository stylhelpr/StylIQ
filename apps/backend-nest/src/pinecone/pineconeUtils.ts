import { Pinecone } from '@pinecone-database/pinecone';

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const index = pinecone.Index(process.env.PINECONE_INDEX!);

// Vertex service is configured for 512-d embeddings
export const VECTOR_DIMS = Number(process.env.PC_DIMS || 512);
