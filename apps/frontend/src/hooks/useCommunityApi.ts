import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';
import type {
  CommunityPost,
  PostComment,
  PostFilter,
  UserProfile,
  FollowUser,
} from '../types/community';

const BASE = '/community';

// ==================== POSTS ====================

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      imageUrl?: string;
      topImage?: string;
      bottomImage?: string;
      shoesImage?: string;
      accessoryImage?: string;
      name?: string;
      description?: string;
      tags?: string[];
    }) => {
      const res = await apiClient.post(`${BASE}/posts`, data);
      return res.data as CommunityPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['community-posts']});
    },
  });
}

export function useCommunityPosts(
  currentUserId?: string,
  filter: PostFilter = 'all',
  limit: number = 20,
  offset: number = 0,
) {
  return useQuery<CommunityPost[], Error>({
    queryKey: ['community-posts', filter, currentUserId, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        filter,
        limit: String(limit),
        offset: String(offset),
      });
      if (currentUserId) params.set('currentUserId', currentUserId);
      const res = await apiClient.get(`${BASE}/posts?${params.toString()}`);
      // Debug: log first post's follow status and images
      // if (res.data?.[0]) {
      //   console.log('📡 First post status:', {
      //     postId: res.data[0].id?.slice(0, 8),
      //     author: res.data[0].user_id?.slice(0, 8),
      //     is_following_author: res.data[0].is_following_author,
      //     image_url: res.data[0].image_url,
      //     top_image: res.data[0].top_image,
      //   });
      // }
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useSearchPosts(
  query: string,
  currentUserId?: string,
  limit: number = 20,
) {
  return useQuery<CommunityPost[], Error>({
    queryKey: ['community-search', query, currentUserId],
    queryFn: async () => {
      const params = new URLSearchParams({q: query, limit: String(limit)});
      if (currentUserId) params.set('currentUserId', currentUserId);
      const res = await apiClient.get(
        `${BASE}/posts/search?${params.toString()}`,
      );
      return res.data;
    },
    enabled: query.length > 0,
    staleTime: 30000,
  });
}

export function useSavedPosts(limit: number = 20, offset: number = 0) {
  return useQuery<CommunityPost[], Error>({
    queryKey: ['community-saved', limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const res = await apiClient.get(`${BASE}/posts/saved?${params.toString()}`);
      return res.data;
    },
  });
}

export function usePostById(postId: string, currentUserId?: string) {
  return useQuery<CommunityPost, Error>({
    queryKey: ['community-post', postId, currentUserId],
    queryFn: async () => {
      const params = currentUserId ? `?currentUserId=${currentUserId}` : '';
      const res = await apiClient.get(`${BASE}/posts/${postId}${params}`);
      return res.data;
    },
    enabled: !!postId,
  });
}

// ==================== LIKES ====================

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (isLiked) {
        await apiClient.delete(`${BASE}/posts/${postId}/like`);
      } else {
        await apiClient.post(`${BASE}/posts/${postId}/like`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['community-posts']});
    },
  });
}

// ==================== COMMENTS ====================

export function usePostComments(postId: string, currentUserId?: string) {
  return useQuery<PostComment[], Error>({
    queryKey: ['community-comments', postId, currentUserId],
    queryFn: async () => {
      const params = currentUserId ? `?currentUserId=${currentUserId}` : '';
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
      content,
      replyToId,
      replyToUser,
    }: {
      postId: string;
      content: string;
      replyToId?: string;
      replyToUser?: string;
    }) => {
      const res = await apiClient.post(`${BASE}/posts/${postId}/comments`, {
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
    }: {
      postId: string;
      commentId: string;
    }) => {
      await apiClient.delete(`${BASE}/posts/${postId}/comments/${commentId}`);
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
      isLiked,
    }: {
      commentId: string;
      postId: string;
      isLiked: boolean;
    }) => {
      if (isLiked) {
        await apiClient.delete(`${BASE}/comments/${commentId}/like`);
      } else {
        await apiClient.post(`${BASE}/comments/${commentId}/like`, {});
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
      isFollowing,
    }: {
      targetUserId: string;
      isFollowing: boolean;
    }) => {
      // console.log('🔄 Follow mutation:', {targetUserId, isFollowing});
      try {
        if (isFollowing) {
          await apiClient.delete(`${BASE}/users/${targetUserId}/follow`);
          // console.log('👋 Unfollow response:', res.status, res.data);
        } else {
          await apiClient.post(`${BASE}/users/${targetUserId}/follow`, {});
          // console.log('🤝 Follow response:', res.status, res.data);
        }
      } catch (err: any) {
        // console.error('❌ Follow API error:', err?.response?.status, err?.response?.data || err?.message);
        throw err;
      }
    },
    onSuccess: () => {
      // console.log('✅ Follow mutation success, invalidating queries');
      queryClient.invalidateQueries({queryKey: ['community-posts']});
      queryClient.invalidateQueries({queryKey: ['community-user-profile']});
      queryClient.invalidateQueries({queryKey: ['community-followers']});
      queryClient.invalidateQueries({queryKey: ['community-following']});
    },
  });
}

// ==================== SAVES ====================

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      isSaved,
    }: {
      postId: string;
      isSaved: boolean;
    }) => {
      if (isSaved) {
        await apiClient.delete(`${BASE}/posts/${postId}/save`);
      } else {
        await apiClient.post(`${BASE}/posts/${postId}/save`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['community-posts']});
      queryClient.invalidateQueries({queryKey: ['community-saved']});
    },
  });
}

// ==================== BLOCK/MUTE ====================

export function useBlockUser() {
  return useMutation({
    mutationFn: async ({targetUserId}: {targetUserId: string}) => {
      await apiClient.post(`${BASE}/users/${targetUserId}/block`, {});
    },
  });
}

export function useUnblockUser() {
  return useMutation({
    mutationFn: async ({targetUserId}: {targetUserId: string}) => {
      await apiClient.delete(`${BASE}/users/${targetUserId}/block`);
    },
  });
}

export function useMuteUser() {
  return useMutation({
    mutationFn: async ({
      targetUserId,
      isMuted,
    }: {
      targetUserId: string;
      isMuted: boolean;
    }) => {
      if (isMuted) {
        await apiClient.delete(`${BASE}/users/${targetUserId}/mute`);
      } else {
        await apiClient.post(`${BASE}/users/${targetUserId}/mute`, {});
      }
    },
  });
}

// ==================== REPORTS ====================

export function useReportPost() {
  return useMutation({
    mutationFn: async ({postId, reason}: {postId: string; reason: string}) => {
      await apiClient.post(`${BASE}/posts/${postId}/report`, {reason});
    },
  });
}

// ==================== VIEW TRACKING ====================

export function useTrackView() {
  return useMutation({
    mutationFn: async ({postId}: {postId: string}) => {
      await apiClient.post(`${BASE}/posts/${postId}/view`, {});
    },
  });
}

// ==================== USER BIO ====================

export function useUpdateBio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({userId, bio}: {userId: string; bio: string}) => {
      await apiClient.patch(`${BASE}/users/${userId}/bio`, {bio});
    },
    onSuccess: (_, {userId}) => {
      queryClient.invalidateQueries({queryKey: ['community-user-profile', userId]});
    },
  });
}

// ==================== DELETE/EDIT OWN POSTS ====================

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({postId}: {postId: string}) => {
      await apiClient.delete(`${BASE}/posts/${postId}`);
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
      name,
      description,
      tags,
    }: {
      postId: string;
      name?: string;
      description?: string;
      tags?: string[];
    }) => {
      await apiClient.patch(`${BASE}/posts/${postId}`, {name, description, tags});
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

// ==================== FOLLOWERS / FOLLOWING LISTS ====================

export function useFollowers(userId: string, currentUserId?: string) {
  return useQuery<FollowUser[], Error>({
    queryKey: ['community-followers', userId, currentUserId],
    queryFn: async () => {
      const params = currentUserId ? `?currentUserId=${currentUserId}` : '';
      const res = await apiClient.get(`${BASE}/users/${userId}/followers${params}`);
      return res.data;
    },
    enabled: !!userId,
  });
}

export function useFollowing(userId: string, currentUserId?: string) {
  return useQuery<FollowUser[], Error>({
    queryKey: ['community-following', userId, currentUserId],
    queryFn: async () => {
      const params = currentUserId ? `?currentUserId=${currentUserId}` : '';
      const res = await apiClient.get(`${BASE}/users/${userId}/following${params}`);
      return res.data;
    },
    enabled: !!userId,
  });
}

// ==================== GDPR DELETE ====================

export function useDeleteUserData() {
  return useMutation({
    mutationFn: async ({userId}: {userId: string}) => {
      await apiClient.delete(`${BASE}/users/${userId}/data`);
    },
  });
}

// ==================== USER SEARCH ====================

export type SearchedUser = {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  profile_picture_url?: string;
  bio?: string;
};

export type SearchUsersResponse = {
  users: SearchedUser[];
  hasMore: boolean;
};

/**
 * Search for users by name (first, last, or display name).
 * Supports debounced queries with prefix ranking.
 */
export function useSearchUsers(
  query: string,
  limit: number = 20,
  offset: number = 0,
) {
  return useQuery<SearchUsersResponse, Error>({
    queryKey: ['community-users-search', query, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
        offset: String(offset),
      });
      const res = await apiClient.get(`${BASE}/users/search?${params.toString()}`);
      return res.data;
    },
    enabled: query.trim().length > 0,
    staleTime: 30000,
  });
}

// ==================== RECOMMENDATIONS ====================

/**
 * Fetch recommended posts for "Recommended for You" carousel.
 * Uses signal-based ranking: following, frequently visited, hashtags, keywords, recency, engagement.
 * Returns 5-10 posts max, 1 per author.
 */
export function useRecommendedPosts() {
  return useQuery<CommunityPost[], Error>({
    queryKey: ['community-recommended'],
    queryFn: async () => {
      const res = await apiClient.get(`${BASE}/posts/recommended`);
      return res.data;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Track a profile visit for "frequently visited" signal.
 * Call this when viewing another user's profile.
 */
export function useTrackProfileVisit() {
  return useMutation({
    mutationFn: async ({visitedId}: {visitedId: string}) => {
      await apiClient.post(`${BASE}/users/${visitedId}/visit`, {});
    },
  });
}

/**
 * Refresh user's hashtag and keyword preferences.
 * Call this after likes/saves to update signal preferences.
 */
export function useRefreshUserSignals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post(`${BASE}/signals/refresh`, {});
    },
    onSuccess: () => {
      // Invalidate recommendations to pick up new signals
      queryClient.invalidateQueries({queryKey: ['community-recommended']});
    },
  });
}
