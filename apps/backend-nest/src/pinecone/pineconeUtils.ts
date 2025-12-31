import { Pinecone, Index } from '@pinecone-database/pinecone';
import { getSecret } from '../config/secrets';

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: getSecret('PINECONE_API_KEY'),
    });
  }
  return pineconeClient;
}

function getPineconeIndex(): Index {
  if (!pineconeIndex) {
    pineconeIndex = getPineconeClient().Index(getSecret('PINECONE_INDEX'));
  }
  return pineconeIndex;
}

// Legacy exports with lazy initialization
export const pinecone = new Proxy({} as Pinecone, {
  get(_, prop: keyof Pinecone) {
    return getPineconeClient()[prop];
  },
});

export const index = new Proxy({} as Index, {
  get(_, prop: keyof Index) {
    return getPineconeIndex()[prop];
  },
});

// Vertex service is configured for 512-d embeddings
// Note: PC_DIMS is a non-secret config, kept as env var
export const VECTOR_DIMS = 512;
