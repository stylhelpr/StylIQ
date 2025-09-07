// apps/backend-nest/src/pinecone/pinecone-upsert.ts
import { index, VECTOR_DIMS } from './pineconeUtils';

/**
 * Item is stored twice:
 *   <itemId>:text
 *   <itemId>:image
 *
 * This helper keeps BOTH entries' metadata in sync on every upsert.
 */

type UpsertParams = {
  userId: string;
  itemId: string;
  imageVec?: number[];
  textVec?: number[];
  meta: Record<string, any>;
};

type VectorRecord = {
  id?: string;
  values?: number[];
  metadata?: Record<string, any>;
};
type FetchedMap = Record<string, VectorRecord>;

const buildMeta = (
  base: Record<string, any>,
  kind: 'text' | 'image',
  userId: string,
  itemId: string,
) => ({ ...base, kind, userId, itemId });

const validateDims = (vec: number[] | undefined, label: string) => {
  if (!vec) return;
  if (vec.length !== VECTOR_DIMS) {
    throw new Error(`${label} dim ${vec.length} != ${VECTOR_DIMS}`);
  }
};

/**
 * Some Pinecone SDKs return one of:
 * - { vectors: { [id]: { id, values, metadata } } }
 * - { vectors: [{ id, values, metadata }, ...] }
 * - { records: { [id]: { id, values, metadata } } }   (older clients)
 */
const fetchMap = async (
  ns: ReturnType<typeof index.namespace>,
  ids: string[],
): Promise<FetchedMap> => {
  try {
    const res: any = await ns.fetch(ids);
    const out: FetchedMap = {};

    const fromObj = (obj: any) => {
      for (const [k, v] of Object.entries(obj || {})) {
        out[k] = v as VectorRecord;
      }
    };
    const fromArr = (arr: any[]) => {
      for (const rec of arr) {
        if (rec?.id) out[rec.id] = rec as VectorRecord;
      }
    };

    if (res?.vectors && !Array.isArray(res.vectors)) fromObj(res.vectors);
    if (res?.vectors && Array.isArray(res.vectors)) fromArr(res.vectors);
    if (res?.records) fromObj(res.records);

    return out;
  } catch (err: any) {
    console.warn('⚠️ Pinecone fetch failed:', err?.message || err);
    return {};
  }
};

const hasValues = (rec?: VectorRecord) =>
  !!(rec && Array.isArray(rec.values) && rec.values.length > 0);

export async function upsertItemNs({
  userId,
  itemId,
  imageVec,
  textVec,
  meta,
}: UpsertParams) {
  const ns = index.namespace(userId);
  const textId = `${itemId}:text`;
  const imageId = `${itemId}:image`;

  validateDims(imageVec, 'imageVec');
  validateDims(textVec, 'textVec');

  // Pre-fetch to carry the sibling modality or create placeholders
  const existing = await fetchMap(ns, [textId, imageId]);
  const existingText = existing[textId];
  const existingImage = existing[imageId];

  const payload: Array<{ id: string; values: number[]; metadata: any }> = [];

  // If textVec provided, upsert it; also ensure image entry's metadata is refreshed
  if (textVec) {
    payload.push({
      id: textId,
      values: textVec,
      metadata: buildMeta(meta, 'text', userId, itemId),
    });

    if (hasValues(existingImage)) {
      // reuse image values, refresh metadata
      payload.push({
        id: imageId,
        values: existingImage.values!,
        metadata: buildMeta(meta, 'image', userId, itemId),
      });
    } else {
      // no image vector exists yet → create placeholder so metadata mirrors
      payload.push({
        id: imageId,
        values: new Array(VECTOR_DIMS).fill(0),
        metadata: buildMeta(meta, 'image', userId, itemId),
      });
    }
  }

  // If imageVec provided, upsert it; also ensure text entry's metadata is refreshed
  if (imageVec) {
    payload.push({
      id: imageId,
      values: imageVec,
      metadata: buildMeta(meta, 'image', userId, itemId),
    });

    if (hasValues(existingText)) {
      payload.push({
        id: textId,
        values: existingText.values!,
        metadata: buildMeta(meta, 'text', userId, itemId),
      });
    } else {
      payload.push({
        id: textId,
        values: new Array(VECTOR_DIMS).fill(0),
        metadata: buildMeta(meta, 'text', userId, itemId),
      });
    }
  }

  // Metadata-only change (no vectors provided):
  if (payload.length === 0) {
    if (hasValues(existingText)) {
      payload.push({
        id: textId,
        values: existingText.values!,
        metadata: buildMeta(meta, 'text', userId, itemId),
      });
    } else {
      payload.push({
        id: textId,
        values: new Array(VECTOR_DIMS).fill(0),
        metadata: buildMeta(meta, 'text', userId, itemId),
      });
    }

    if (hasValues(existingImage)) {
      payload.push({
        id: imageId,
        values: existingImage.values!,
        metadata: buildMeta(meta, 'image', userId, itemId),
      });
    } else {
      // optional: also create an image placeholder so both always exist
      payload.push({
        id: imageId,
        values: new Array(VECTOR_DIMS).fill(0),
        metadata: buildMeta(meta, 'image', userId, itemId),
      });
    }
  }

  console.log(
    '🔁 Pinecone upsert payload (count:',
    payload.length,
    '):',
    JSON.stringify(
      payload.map((p) => ({
        id: p.id,
        valuesLen: p.values.length,
        metaPreview: {
          kind: p.metadata.kind,
          name: p.metadata.name,
          ai_title: p.metadata.ai_title,
        },
      })),
      null,
      2,
    ),
  );

  await ns.upsert(payload);
}

export async function deleteItemNs(userId: string, itemId: string) {
  const ns = index.namespace(userId);
  await ns.deleteMany([`${itemId}:image`, `${itemId}:text`]);
  console.log(`🗑️ Deleted vectors for ${itemId} in namespace ${userId}`);
}

/**
 * Force metadata refresh without changing vectors.
 * Reuses existing values for both modalities; creates placeholders if needed.
 */
export async function forceMetadataUpdate(
  userId: string,
  itemId: string,
  meta: Record<string, any>,
) {
  const ns = index.namespace(userId);
  const textId = `${itemId}:text`;
  const imageId = `${itemId}:image`;

  const existing = await fetchMap(ns, [textId, imageId]);
  const updates: Array<{ id: string; values: number[]; metadata: any }> = [];

  if (hasValues(existing[textId])) {
    updates.push({
      id: textId,
      values: existing[textId].values!,
      metadata: buildMeta(meta, 'text', userId, itemId),
    });
  } else {
    updates.push({
      id: textId,
      values: new Array(VECTOR_DIMS).fill(0),
      metadata: buildMeta(meta, 'text', userId, itemId),
    });
  }

  if (hasValues(existing[imageId])) {
    updates.push({
      id: imageId,
      values: existing[imageId].values!,
      metadata: buildMeta(meta, 'image', userId, itemId),
    });
  } else {
    updates.push({
      id: imageId,
      values: new Array(VECTOR_DIMS).fill(0),
      metadata: buildMeta(meta, 'image', userId, itemId),
    });
  }

  console.log(
    '🟡 forceMetadataUpdate payload:',
    JSON.stringify(
      updates.map((u) => ({
        id: u.id,
        valuesLen: u.values.length,
        metaPreview: {
          kind: u.metadata.kind,
          name: u.metadata.name,
          ai_title: u.metadata.ai_title,
        },
      })),
      null,
      2,
    ),
  );
  await ns.upsert(updates);
}

/////////////////////

// // apps/backend-nest/src/pinecone/pinecone-upsert.ts
// import { index, VECTOR_DIMS } from './pineconeUtils';

// /**
//  * Insert (or update) a wardrobe item into Pinecone under a user namespace.
//  *
//  * Each item can be stored twice:
//  *   - One entry for the image vector
//  *   - One entry for the text vector
//  *
//  * That way, you can search by text or image interchangeably.
//  */
// export async function upsertItemNs(params: {
//   userId: string;
//   itemId: string;
//   imageVec?: number[];
//   textVec?: number[];
//   meta: Record<string, any>;
// }) {
//   const ns = index.namespace(params.userId);
//   const vectors: any[] = [];

//   // Image vector (if provided)
//   if (params.imageVec) {
//     if (params.imageVec.length !== VECTOR_DIMS) {
//       throw new Error(
//         `imageVec dim ${params.imageVec.length} != ${VECTOR_DIMS}`,
//       );
//     }
//     vectors.push({
//       id: `${params.itemId}:image`,
//       values: params.imageVec,
//       metadata: {
//         ...params.meta,
//         kind: 'image',
//         userId: params.userId,
//         itemId: params.itemId,
//       },
//     });
//   }

//   // Text vector (if provided)
//   if (params.textVec) {
//     if (params.textVec.length !== VECTOR_DIMS) {
//       throw new Error(`textVec dim ${params.textVec.length} != ${VECTOR_DIMS}`);
//     }
//     vectors.push({
//       id: `${params.itemId}:text`,
//       values: params.textVec,
//       metadata: {
//         ...params.meta,
//         kind: 'text',
//         userId: params.userId,
//         itemId: params.itemId,
//       },
//     });
//   }

//   if (vectors.length === 0) {
//     throw new Error('No vectors provided to upsertItemNs');
//   }

//   console.log('🟢 Upserting to Pinecone:', JSON.stringify(vectors, null, 2));
//   await ns.upsert(vectors);
// }

// /**
//  * Delete both embeddings for an item from Pinecone (image + text).
//  */
// export async function deleteItemNs(userId: string, itemId: string) {
//   const ns = index.namespace(userId);
//   await ns.deleteMany([`${itemId}:image`, `${itemId}:text`]);
//   console.log(`🗑️ Deleted vectors for ${itemId} in namespace ${userId}`);
// }

// /**
//  * Force update metadata without changing vectors.
//  * Useful when metadata has changed but vectors are the same.
//  */
// export async function forceMetadataUpdate(
//   userId: string,
//   itemId: string,
//   meta: Record<string, any>,
// ) {
//   const ns = index.namespace(userId);
//   const existing = await ns.fetch([`${itemId}:image`, `${itemId}:text`]);

//   const vectors = (existing as any).vectors as Record<
//     string,
//     { values: number[] }
//   >;

//   const updates = Object.entries(vectors).map(([id, vec]) => ({
//     id,
//     values: vec.values,
//     metadata: {
//       ...meta,
//       kind: id.endsWith(':image') ? 'image' : 'text',
//       userId,
//       itemId,
//     },
//   }));

//   if (updates.length === 0) {
//     console.warn(`⚠️ No existing vectors found for ${itemId}`);
//     return;
//   }

//   console.log(
//     '🟡 Forcing metadata update to Pinecone:',
//     JSON.stringify(updates, null, 2),
//   );
//   await ns.upsert(updates);
// }
