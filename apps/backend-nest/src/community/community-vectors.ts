// Community post embeddings - uses isolated 'community' namespace
// This does NOT touch user wardrobe namespaces

import { index, VECTOR_DIMS } from '../pinecone/pineconeUtils';

const COMMUNITY_NAMESPACE = 'community';

/**
 * Store a community post's embedding in the 'community' namespace.
 * Completely isolated from user wardrobe vectors.
 */
export async function upsertPostEmbedding(params: {
  postId: string;
  vector: number[];
  metadata: {
    userId: string;
    tags: string[];
    description?: string;
    createdAt: string;
  };
}) {
  const { postId, vector, metadata } = params;

  if (vector.length !== VECTOR_DIMS) {
    throw new Error(`Vector dim ${vector.length} != ${VECTOR_DIMS}`);
  }

  const ns = index.namespace(COMMUNITY_NAMESPACE);

  await ns.upsert([
    {
      id: postId,
      values: vector,
      metadata: {
        ...metadata,
        postId,
      },
    },
  ]);

  console.log(`📌 Community post ${postId} embedded in Pinecone`);
}

/**
 * Query similar posts from the 'community' namespace.
 */
export async function querySimilarPosts(params: {
  vector: number[];
  topK?: number;
  excludePostIds?: string[];
  excludeUserIds?: string[];
}) {
  const {
    vector,
    topK = 50,
    excludePostIds = [],
    excludeUserIds = [],
  } = params;

  const ns = index.namespace(COMMUNITY_NAMESPACE);

  const res = await ns.query({
    vector,
    topK: topK + excludePostIds.length + 20, // fetch extra to filter
    includeMetadata: true,
  });

  // Filter out excluded posts and users
  const filtered = (res.matches || []).filter((match) => {
    if (excludePostIds.includes(match.id)) return false;
    const userId = match.metadata?.userId as string;
    if (userId && excludeUserIds.includes(userId)) return false;
    return true;
  });

  return filtered.slice(0, topK);
}

/**
 * Delete a post's embedding from the 'community' namespace.
 */
export async function deletePostEmbedding(postId: string) {
  const ns = index.namespace(COMMUNITY_NAMESPACE);
  await ns.deleteMany([postId]);
  // console.log(`🗑️ Deleted community post ${postId} from Pinecone`);
}

/**
 * Fetch multiple post embeddings by ID.
 */
export async function fetchPostEmbeddings(postIds: string[]) {
  if (postIds.length === 0) return {};

  const ns = index.namespace(COMMUNITY_NAMESPACE);
  const res = await ns.fetch(postIds);

  return (res as any).records || (res as any).vectors || {};
}
