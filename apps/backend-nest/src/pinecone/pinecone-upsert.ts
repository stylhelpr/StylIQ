// apps/backend-nest/src/pinecone/pinecone-upsert.ts
import { index } from './pineconeUtils';

export async function upsertItemNs(params: {
  userId: string;
  itemId: string;
  imageVec: number[];
  textVec: number[];
  meta: Record<string, any>;
}) {
  const ns = index.namespace(params.userId);
  await ns.upsert([
    {
      id: `${params.itemId}:image`,
      values: params.imageVec,
      metadata: { ...params.meta, kind: 'image' },
    },
    {
      id: `${params.itemId}:text`,
      values: params.textVec,
      metadata: { ...params.meta, kind: 'text' },
    },
  ]);
}
