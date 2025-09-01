import { index, VECTOR_DIMS } from './pineconeUtils';

/**
 * Insert (or update) a wardrobe item into Pinecone under a user namespace.
 *
 * Each item is stored twice:
 *   - One entry for the image vector
 *   - One entry for the text vector
 *
 * That way, you can search by text or image interchangeably.
 */
export async function upsertItemNs(params: {
  userId: string; // UUID of the user (namespace in Pinecone)
  itemId: string; // DB ID of the wardrobe item
  imageVec: number[]; // Embedding vector for the image
  textVec: number[]; // Embedding vector for the text/metadata
  meta: Record<string, any>; // Clothing metadata (category, color, size, etc.)
}) {
  // Safety checks: ensure vectors are the correct dimensionality
  if (params.imageVec.length !== VECTOR_DIMS) {
    throw new Error(`imageVec dim ${params.imageVec.length} != ${VECTOR_DIMS}`);
  }
  if (params.textVec.length !== VECTOR_DIMS) {
    throw new Error(`textVec dim ${params.textVec.length} != ${VECTOR_DIMS}`);
  }

  // Use the userId as the Pinecone namespace
  const ns = index.namespace(params.userId);

  // Upsert both image + text embeddings for the same item
  await ns.upsert([
    {
      id: `${params.itemId}:image`, // Unique ID for image vector
      values: params.imageVec,
      metadata: {
        ...params.meta, // clothing attributes
        kind: 'image', // mark this as the image embedding
        userId: params.userId, // useful for filtering/debug
        itemId: params.itemId, // back-reference to wardrobe DB
      },
    },
    {
      id: `${params.itemId}:text`, // Unique ID for text vector
      values: params.textVec,
      metadata: {
        ...params.meta,
        kind: 'text', // mark this as the text embedding
        userId: params.userId,
        itemId: params.itemId,
      },
    },
  ]);
}

/**
 * Delete both embeddings for an item from Pinecone (image + text).
 * This is called when a wardrobe item is removed from the DB.
 */
export async function deleteItemNs(userId: string, itemId: string) {
  const ns = index.namespace(userId);

  // Remove both entries (image + text) for this wardrobe item
  await ns.deleteMany([`${itemId}:image`, `${itemId}:text`]);
}

//////////////

// import { index, VECTOR_DIMS } from './pineconeUtils';

// export async function upsertItemNs(params: {
//   userId: string;
//   itemId: string;
//   imageVec: number[];
//   textVec: number[];
//   meta: Record<string, any>;
// }) {
//   if (params.imageVec.length !== VECTOR_DIMS) {
//     throw new Error(`imageVec dim ${params.imageVec.length} != ${VECTOR_DIMS}`);
//   }
//   if (params.textVec.length !== VECTOR_DIMS) {
//     throw new Error(`textVec dim ${params.textVec.length} != ${VECTOR_DIMS}`);
//   }

//   const ns = index.namespace(params.userId);

//   await ns.upsert([
//     {
//       id: `${params.itemId}:image`,
//       values: params.imageVec,
//       metadata: {
//         ...params.meta,
//         kind: 'image',
//         userId: params.userId,
//         itemId: params.itemId,
//       },
//     },
//     {
//       id: `${params.itemId}:text`,
//       values: params.textVec,
//       metadata: {
//         ...params.meta,
//         kind: 'text',
//         userId: params.userId,
//         itemId: params.itemId,
//       },
//     },
//   ]);
// }

// export async function deleteItemNs(userId: string, itemId: string) {
//   const ns = index.namespace(userId);
//   await ns.deleteMany([`${itemId}:image`, `${itemId}:text`]);
// }
