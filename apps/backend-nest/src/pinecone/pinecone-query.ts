import { index } from './pineconeUtils';

export type PCFilter = Record<string, any>;

export async function queryUserNs(params: {
  userId: string;
  vector: number[];
  topK?: number;
  filter?: PCFilter;
  includeMetadata?: boolean;
}) {
  const { userId, vector, topK = 20, filter, includeMetadata = true } = params;
  const ns = index.namespace(userId);

  const res = await ns.query({
    vector,
    topK,
    filter,
    includeMetadata,
  });

  return res.matches || [];
}

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

  const [imageRes, textRes] = await Promise.all([
    imageVec
      ? ns.query({ vector: imageVec, topK, filter, includeMetadata: true })
      : Promise.resolve({ matches: [] }),
    textVec
      ? ns.query({ vector: textVec, topK, filter, includeMetadata: true })
      : Promise.resolve({ matches: [] }),
  ]);

  const fuse: Record<string, { score: number; meta?: any }> = {};
  const rrf = (rank: number) => 1 / (60 + rank); // reciprocal-rank fusion

  [imageRes.matches || [], textRes.matches || []].forEach((list) => {
    list.forEach((m, i) => {
      const key = m.id!;
      if (!fuse[key]) fuse[key] = { score: 0, meta: m.metadata };
      fuse[key].score += rrf(i + 1);
    });
  });

  return Object.entries(fuse)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, topK)
    .map(([id, v]) => ({ id, score: v.score, metadata: v.meta }));
}

///////////////

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
//   const res = await ns.query({ vector, topK, filter, includeMetadata });
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
//   const rrf = (rank: number) => 1 / (60 + rank);

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

///////////////

// // apps/backend-nest/src/pinecone/query.ts
// import { index } from './pineconeUtils';

// /**
//  * Query items for a specific user namespace
//  */
// export async function queryUserNs(userId: string, queryVec: number[]) {
//   const ns = index.namespace(userId);

//   const res = await ns.query({
//     topK: 20,
//     vector: queryVec,
//     filter: {
//       // example filters — adjust to your metadata schema
//       dressCode: { $in: ['smart casual'] },
//       season: { $in: ['summer'] },
//     },
//     includeMetadata: true,
//   });

//   return res.matches;
// }

// /**
//  * Query shared index with userId filter
//  */
// export async function queryShared(userId: string, queryVec: number[]) {
//   const res = await index.query({
//     topK: 20,
//     vector: queryVec,
//     filter: {
//       userId, // only return this user's items
//       dressCode: { $in: ['smart casual'] },
//       season: { $in: ['summer'] },
//     },
//     includeMetadata: true,
//   });

//   return res.matches;
// }
