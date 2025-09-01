import { index, VECTOR_DIMS } from './pineconeUtils';

export async function upsertItemNs(params: {
  userId: string;
  itemId: string;
  imageVec: number[];
  textVec: number[];
  meta: Record<string, any>;
}) {
  if (params.imageVec.length !== VECTOR_DIMS) {
    throw new Error(`imageVec dim ${params.imageVec.length} != ${VECTOR_DIMS}`);
  }
  if (params.textVec.length !== VECTOR_DIMS) {
    throw new Error(`textVec dim ${params.textVec.length} != ${VECTOR_DIMS}`);
  }

  const ns = index.namespace(params.userId);

  await ns.upsert([
    {
      id: `${params.itemId}:image`,
      values: params.imageVec,
      metadata: {
        ...params.meta,
        kind: 'image',
        userId: params.userId,
        itemId: params.itemId,
      },
    },
    {
      id: `${params.itemId}:text`,
      values: params.textVec,
      metadata: {
        ...params.meta,
        kind: 'text',
        userId: params.userId,
        itemId: params.itemId,
      },
    },
  ]);
}

export async function deleteItemNs(userId: string, itemId: string) {
  const ns = index.namespace(userId);
  await ns.deleteMany([`${itemId}:image`, `${itemId}:text`]);
}

////////////////

// // apps/backend-nest/src/pinecone/pinecone-upsert.ts
// import { index } from './pineconeUtils';

// export async function upsertItemNs(params: {
//   userId: string;
//   itemId: string;
//   imageVec: number[];
//   textVec: number[];
//   meta: Record<string, any>;
// }) {
//   const ns = index.namespace(params.userId);
//   await ns.upsert([
//     {
//       id: `${params.itemId}:image`,
//       values: params.imageVec,
//       metadata: { ...params.meta, kind: 'image' },
//     },
//     {
//       id: `${params.itemId}:text`,
//       values: params.textVec,
//       metadata: { ...params.meta, kind: 'text' },
//     },
//   ]);
// }
