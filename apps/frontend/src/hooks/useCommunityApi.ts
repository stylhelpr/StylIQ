import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';
import type {
  CommunityPost,
  PostComment,
  PostFilter,
  UserProfile,
} from '../types/community';

const BASE = '/community';

// ==================== POSTS ====================

export function useCommunityPosts(
  userId?: string,
  filter: PostFilter = 'all',
  limit: number = 20,
  offset: number = 0,
) {
  return useQuery<CommunityPost[], Error>({
    queryKey: ['community-posts', filter, userId, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        filter,
        limit: String(limit),
        offset: String(offset),
      });
      if (userId) params.set('userId', userId);
      const res = await apiClient.get(`${BASE}/posts?${params.toString()}`);
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useSearchPosts(
  query: string,
  userId?: string,
  limit: number = 20,
) {
  return useQuery<CommunityPost[], Error>({
    queryKey: ['community-search', query, userId],
    queryFn: async () => {
      const params = new URLSearchParams({q: query, limit: String(limit)});
      if (userId) params.set('userId', userId);
      const res = await apiClient.get(
        `${BASE}/posts/search?${params.toString()}`,
      );
      return res.data;
    },
    enabled: query.length > 0,
    staleTime: 30000,
  });
}

export function useSavedPosts(userId?: string, limit: number = 20, offset: number = 0) {
  return useQuery<CommunityPost[], Error>({
    queryKey: ['community-saved', userId, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (userId) params.set('userId', userId);
      const res = await apiClient.get(`${BASE}/posts/saved?${params.toString()}`);
      return res.data;
    },
    enabled: !!userId,
  });
}

export function usePostById(postId: string, userId?: string) {
  return useQuery<CommunityPost, Error>({
    queryKey: ['community-post', postId, userId],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : '';
      const res = await apiClient.get(`${BASE}/posts/${postId}${params}`);
      return res.data;
    },
    enabled: !!postId,
  });
}

// ==================== LIKES ====================

export function useLikePost() {
  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      isLiked,
    }: {
      postId: string;
      userId: string;
      isLiked: boolean;
    }) => {
      if (isLiked) {
        await apiClient.delete(`${BASE}/posts/${postId}/like?userId=${userId}`);
      } else {
        await apiClient.post(`${BASE}/posts/${postId}/like`, {userId});
      }
    },
    // No cache invalidation - we use local state for optimistic UI
  });
}

// ==================== COMMENTS ====================

export function usePostComments(postId: string, userId?: string) {
  return useQuery<PostComment[], Error>({
    queryKey: ['community-comments', postId, userId],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : '';
      const res = await apiClient.get(`${BASE}/posts/${postId}/comments${params}`);
      return res.data;
    },
    enabled: !!postId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      content,
      replyToId,
      replyToUser,
    }: {
      postId: string;
      userId: string;
      content: string;
      replyToId?: string;
      replyToUser?: string;
    }) => {
      const res = await apiClient.post(`${BASE}/posts/${postId}/comments`, {
        userId,
        content,
        replyToId,
        replyToUser,
      });
      return res.data as PostComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['community-comments', variables.postId],
      });
      queryClient.invalidateQueries({queryKey: ['community-posts']});
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
      userId,
    }: {
      postId: string;
      commentId: string;
      userId: string;
    }) => {
      await apiClient.delete(`${BASE}/posts/${postId}/comments/${commentId}?userId=${userId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['community-comments', variables.postId],
      });
      queryClient.invalidateQueries({queryKey: ['community-posts']});
    },
  });
}

export function useLikeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      userId,
      isLiked,
    }: {
      commentId: string;
      postId: string;
      userId: string;
      isLiked: boolean;
    }) => {
      if (isLiked) {
        await apiClient.delete(`${BASE}/comments/${commentId}/like?userId=${userId}`);
      } else {
        await apiClient.post(`${BASE}/comments/${commentId}/like`, {userId});
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['community-comments', variables.postId],
      });
    },
  });
}

// ==================== FOLLOWS ====================

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      currentUserId,
      isFollowing,
    }: {
      targetUserId: string;
      currentUserId: string;
      isFollowing: boolean;
    }) => {
      if (isFollowing) {
        await apiClient.delete(`${BASE}/users/${targetUserId}/follow?userId=${currentUserId}`);
      } else {
        await apiClient.post(`${BASE}/users/${targetUserId}/follow`, {userId: currentUserId});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['community-posts']});
      queryClient.invalidateQueries({queryKey: ['community-user-profile']});
    },
  });
}

// ==================== SAVES ====================

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      isSaved,
    }: {
      postId: string;
      userId: string;
      isSaved: boolean;
    }) => {
      if (isSaved) {
        await apiClient.delete(`${BASE}/posts/${postId}/save?userId=${userId}`);
      } else {
        await apiClient.post(`${BASE}/posts/${postId}/save`, {userId});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['community-posts']});
      queryClient.invalidateQueries({queryKey: ['community-search']});
      queryClient.invalidateQueries({queryKey: ['community-saved']});
    },
  });
}

// ==================== BLOCK/MUTE ====================

export function useBlockUser() {
  return useMutation({
    mutationFn: async ({targetUserId, currentUserId}: {targetUserId: string; currentUserId: string}) => {
      await apiClient.post(`${BASE}/users/${targetUserId}/block`, {userId: currentUserId});
    },
    // No cache invalidation - blocked posts stay visible until manual refresh
    // This allows users to unblock from the same card
  });
}

export function useUnblockUser() {
  return useMutation({
    mutationFn: async ({targetUserId, currentUserId}: {targetUserId: string; currentUserId: string}) => {
      await apiClient.delete(`${BASE}/users/${targetUserId}/block?userId=${currentUserId}`);
    },
    // No cache invalidation - handled by local state
  });
}

export function useMuteUser() {
  return useMutation({
    mutationFn: async ({
      targetUserId,
      currentUserId,
      isMuted,
    }: {
      targetUserId: string;
      currentUserId: string;
      isMuted: boolean;
    }) => {
      if (isMuted) {
        await apiClient.delete(`${BASE}/users/${targetUserId}/mute?userId=${currentUserId}`);
      } else {
        await apiClient.post(`${BASE}/users/${targetUserId}/mute`, {userId: currentUserId});
      }
    },
    // No cache invalidation - muted posts stay visible until manual refresh
    // This allows users to unmute from the same card
  });
}

// ==================== REPORTS ====================

export function useReportPost() {
  return useMutation({
    mutationFn: async ({postId, userId, reason}: {postId: string; userId: string; reason: string}) => {
      await apiClient.post(`${BASE}/posts/${postId}/report`, {userId, reason});
    },
  });
}

// ==================== DELETE/EDIT OWN POSTS ====================

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({postId, userId}: {postId: string; userId: string}) => {
      await apiClient.delete(`${BASE}/posts/${postId}?userId=${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['community-posts']});
      queryClient.invalidateQueries({queryKey: ['community-saved']});
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      description,
      tags,
    }: {
      postId: string;
      userId: string;
      description?: string;
      tags?: string[];
    }) => {
      await apiClient.patch(`${BASE}/posts/${postId}`, {userId, description, tags});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['community-posts']});
    },
  });
}

// ==================== USER PROFILE ====================

export function useUserProfile(userId: string, currentUserId?: string) {
  return useQuery<UserProfile, Error>({
    queryKey: ['community-user-profile', userId, currentUserId],
    queryFn: async () => {
      const params = currentUserId ? `?currentUserId=${currentUserId}` : '';
      const res = await apiClient.get(`${BASE}/users/${userId}/profile${params}`);
      return res.data;
    },
    enabled: !!userId,
  });
}
