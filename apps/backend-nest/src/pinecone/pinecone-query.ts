// apps/backend-nest/src/pinecone/query.ts
import { index } from './pineconeUtils';

/**
 * Query items for a specific user namespace
 */
export async function queryUserNs(userId: string, queryVec: number[]) {
  const ns = index.namespace(userId);

  const res = await ns.query({
    topK: 20,
    vector: queryVec,
    filter: {
      // example filters — adjust to your metadata schema
      dressCode: { $in: ['smart casual'] },
      season: { $in: ['summer'] },
    },
    includeMetadata: true,
  });

  return res.matches;
}

/**
 * Query shared index with userId filter
 */
export async function queryShared(userId: string, queryVec: number[]) {
  const res = await index.query({
    topK: 20,
    vector: queryVec,
    filter: {
      userId, // only return this user's items
      dressCode: { $in: ['smart casual'] },
      season: { $in: ['summer'] },
    },
    includeMetadata: true,
  });

  return res.matches;
}
