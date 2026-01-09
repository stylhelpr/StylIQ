import { Pinecone, Index } from '@pinecone-database/pinecone';
import { getSecret, secretExists } from '../config/secrets';

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
    const indexName = getSecret('PINECONE_INDEX');
    // Use PINECONE_HOST if available to skip describeIndex control plane call
    const host = secretExists('PINECONE_HOST') ? getSecret('PINECONE_HOST') : undefined;
    pineconeIndex = getPineconeClient().Index(indexName, host);
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
