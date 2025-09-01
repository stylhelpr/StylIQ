import { index } from './pineconeUtils';

// Allow optional metadata filters (e.g., category = "Shoes")
export type PCFilter = Record<string, any>;

/**
 * Query Pinecone for a single vector (text OR image) in a user's namespace.
 *
 * @param params.userId - UUID of the user (namespace in Pinecone)
 * @param params.vector - embedding vector to search against
 * @param params.topK - how many matches to return (default: 20)
 * @param params.filter - optional metadata filter (e.g., { color: "navy" })
 * @param params.includeMetadata - whether to return item metadata (default: true)
 */
export async function queryUserNs(params: {
  userId: string;
  vector: number[];
  topK?: number;
  filter?: PCFilter;
  includeMetadata?: boolean;
}) {
  const { userId, vector, topK = 20, filter, includeMetadata = true } = params;

  // Each user gets their own namespace in Pinecone so items don't overlap
  const ns = index.namespace(userId);

  // Run Pinecone query
  const res = await ns.query({
    vector,
    topK,
    filter,
    includeMetadata,
  });

  // Always return an array (avoid null/undefined)
  return res.matches || [];
}

/**
 * Hybrid query: runs both imageVec and textVec against Pinecone
 * and combines the results using Reciprocal Rank Fusion (RRF).
 *
 * This way, if you pass both text ("white shirt") and image (shirt photo),
 * you get results ranked by both signals.
 */
export async function hybridQueryUserNs(params: {
  userId: string;
  imageVec?: number[];
  textVec?: number[];
  topK?: number;
  filter?: PCFilter;
}) {
  const { userId, imageVec, textVec, topK = 20, filter } = params;

  if (!imageVec && !textVec) throw new Error('Need at least one vector');

  const ns = index.namespace(userId);

  // Run both queries in parallel
  const [imageRes, textRes] = await Promise.all([
    imageVec
      ? ns.query({ vector: imageVec, topK, filter, includeMetadata: true })
      : Promise.resolve({ matches: [] }),
    textVec
      ? ns.query({ vector: textVec, topK, filter, includeMetadata: true })
      : Promise.resolve({ matches: [] }),
  ]);

  // Fuse results: key = item.id, score = combined rank score
  const fuse: Record<string, { score: number; meta?: any }> = {};

  // Reciprocal Rank Fusion scoring function
  // Lower rank (better match) → higher contribution
  const rrf = (rank: number) => 1 / (60 + rank);

  // Merge results from both queries
  [imageRes.matches || [], textRes.matches || []].forEach((list) => {
    list.forEach((m, i) => {
      const key = m.id!;
      if (!fuse[key]) fuse[key] = { score: 0, meta: m.metadata };
      fuse[key].score += rrf(i + 1);
    });
  });

  // Sort by fused score, return topK matches
  return Object.entries(fuse)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, topK)
    .map(([id, v]) => ({ id, score: v.score, metadata: v.meta }));
}

//////////////////////

// import { index } from './pineconeUtils';

// export type PCFilter = Record<string, any>;

// export async function queryUserNs(params: {
//   userId: string;
//   vector: number[];
//   topK?: number;
//   filter?: PCFilter;
//   includeMetadata?: boolean;
// }) {
//   const { userId, vector, topK = 20, filter, includeMetadata = true } = params;
//   const ns = index.namespace(userId);

//   const res = await ns.query({
//     vector,
//     topK,
//     filter,
//     includeMetadata,
//   });

//   return res.matches || [];
// }

// export async function hybridQueryUserNs(params: {
//   userId: string;
//   imageVec?: number[];
//   textVec?: number[];
//   topK?: number;
//   filter?: PCFilter;
// }) {
//   const { userId, imageVec, textVec, topK = 20, filter } = params;
//   if (!imageVec && !textVec) throw new Error('Need at least one vector');

//   const ns = index.namespace(userId);

//   const [imageRes, textRes] = await Promise.all([
//     imageVec
//       ? ns.query({ vector: imageVec, topK, filter, includeMetadata: true })
//       : Promise.resolve({ matches: [] }),
//     textVec
//       ? ns.query({ vector: textVec, topK, filter, includeMetadata: true })
//       : Promise.resolve({ matches: [] }),
//   ]);

//   const fuse: Record<string, { score: number; meta?: any }> = {};
//   const rrf = (rank: number) => 1 / (60 + rank); // reciprocal-rank fusion

//   [imageRes.matches || [], textRes.matches || []].forEach((list) => {
//     list.forEach((m, i) => {
//       const key = m.id!;
//       if (!fuse[key]) fuse[key] = { score: 0, meta: m.metadata };
//       fuse[key].score += rrf(i + 1);
//     });
//   });

//   return Object.entries(fuse)
//     .sort((a, b) => b[1].score - a[1].score)
//     .slice(0, topK)
//     .map(([id, v]) => ({ id, score: v.score, metadata: v.meta }));
// }
