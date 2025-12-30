import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
  theme_mode?: string;
}

export interface LookMemory {
  id: string;
  tags?: string[];
  source_image_url?: string;
  generated_outfit?: any;
  created_at?: string;
}

export interface RecreatedLook {
  id: string;
  name?: string;
  source_image_url?: string;
  generated_outfit?: any;
  tags?: string[];
  created_at?: string;
}

export interface SavedLook {
  id: string;
  name?: string;
  image_url?: string;
  tags?: string[];
  created_at?: string;
}

export interface SharedLook {
  id: string;
  title?: string;
  description?: string;
  image_url?: string;
  tags?: string[];
  likes_count?: number;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────
// User Profile Hook
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user profile data (name, picture, theme)
 * This is the most frequently accessed data - shared across screens
 */
export function useUserProfile(userId: string) {
  return useQuery<UserProfile, Error>({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${userId}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute - profile data doesn't change often
  });
}

// ─────────────────────────────────────────────────────────────
// Look Memory (Recent Vibes) Hook
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user's look memory (recent vibes/outfit history)
 */
export function useLookMemory(userId: string) {
  return useQuery<LookMemory[], Error>({
    queryKey: ['look-memory', userId],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${userId}/look-memory`);
      // Handle both { data: [] } and direct array responses
      if (res.data?.data?.length) {
        return res.data.data;
      }
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

// ─────────────────────────────────────────────────────────────
// Recreated Looks Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user's recreated looks (AI-generated outfits)
 */
export function useRecreatedLooks(userId: string) {
  return useQuery<RecreatedLook[], Error>({
    queryKey: ['recreated-looks', userId],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${userId}/recreated-looks`);
      if (res.data?.data?.length) {
        return res.data.data;
      }
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Save a new recreated look
 */
export function useSaveRecreatedLook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      source_image_url,
      generated_outfit,
      tags,
    }: {
      userId: string;
      source_image_url: string;
      generated_outfit: any;
      tags?: string[];
    }) => {
      const res = await apiClient.post(`/users/${userId}/recreated-looks`, {
        source_image_url,
        generated_outfit,
        tags,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate to refetch the list
      queryClient.invalidateQueries({
        queryKey: ['recreated-looks', variables.userId],
      });
    },
  });
}

/**
 * Delete a recreated look
 */
export function useDeleteRecreatedLook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({userId, lookId}: {userId: string; lookId: string}) => {
      const res = await apiClient.delete(
        `/users/${userId}/recreated-looks/${lookId}`,
      );
      return res.data;
    },
    onMutate: async ({userId, lookId}) => {
      await queryClient.cancelQueries({queryKey: ['recreated-looks', userId]});

      const previousLooks = queryClient.getQueryData<RecreatedLook[]>([
        'recreated-looks',
        userId,
      ]);

      // Optimistically remove
      queryClient.setQueryData<RecreatedLook[]>(
        ['recreated-looks', userId],
        old => old?.filter(l => l.id !== lookId),
      );

      return {previousLooks, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousLooks) {
        queryClient.setQueryData(
          ['recreated-looks', variables.userId],
          context.previousLooks,
        );
      }
    },
  });
}

/**
 * Rename a recreated look
 */
export function useRenameRecreatedLook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      lookId,
      name,
    }: {
      userId: string;
      lookId: string;
      name: string;
    }) => {
      const res = await apiClient.patch(
        `/users/${userId}/recreated-looks/${lookId}`,
        {name},
      );
      return res.data;
    },
    onMutate: async ({userId, lookId, name}) => {
      await queryClient.cancelQueries({queryKey: ['recreated-looks', userId]});

      const previousLooks = queryClient.getQueryData<RecreatedLook[]>([
        'recreated-looks',
        userId,
      ]);

      // Optimistically update name
      queryClient.setQueryData<RecreatedLook[]>(
        ['recreated-looks', userId],
        old => old?.map(l => (l.id === lookId ? {...l, name} : l)),
      );

      return {previousLooks, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousLooks) {
        queryClient.setQueryData(
          ['recreated-looks', variables.userId],
          context.previousLooks,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Saved Looks (Inspired Looks) Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user's saved/inspired looks
 */
export function useSavedLooks(userId: string) {
  return useQuery<SavedLook[], Error>({
    queryKey: ['saved-looks', userId],
    queryFn: async () => {
      const res = await apiClient.get(`/saved-looks/${userId}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Delete a saved look
 */
export function useDeleteSavedLook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({userId, lookId}: {userId: string; lookId: string}) => {
      await apiClient.delete(`/saved-looks/${lookId}`);
      return {lookId, userId};
    },
    onMutate: async ({userId, lookId}) => {
      await queryClient.cancelQueries({queryKey: ['saved-looks', userId]});

      const previousLooks = queryClient.getQueryData<SavedLook[]>([
        'saved-looks',
        userId,
      ]);

      // Optimistically remove
      queryClient.setQueryData<SavedLook[]>(['saved-looks', userId], old =>
        old?.filter(l => l.id !== lookId),
      );

      return {previousLooks, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousLooks) {
        queryClient.setQueryData(
          ['saved-looks', variables.userId],
          context.previousLooks,
        );
      }
    },
  });
}

/**
 * Rename a saved look
 */
export function useRenameSavedLook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      lookId,
      name,
    }: {
      userId: string;
      lookId: string;
      name: string;
    }) => {
      const res = await apiClient.put(`/saved-looks/${lookId}`, {name});
      return res.data;
    },
    onMutate: async ({userId, lookId, name}) => {
      await queryClient.cancelQueries({queryKey: ['saved-looks', userId]});

      const previousLooks = queryClient.getQueryData<SavedLook[]>([
        'saved-looks',
        userId,
      ]);

      // Optimistically update name
      queryClient.setQueryData<SavedLook[]>(['saved-looks', userId], old =>
        old?.map(l => (l.id === lookId ? {...l, name} : l)),
      );

      return {previousLooks, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousLooks) {
        queryClient.setQueryData(
          ['saved-looks', variables.userId],
          context.previousLooks,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Look Memory Mutations
// ─────────────────────────────────────────────────────────────

/**
 * Save to look memory (when user shops a look)
 */
export function useSaveLookMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      image_url,
      ai_tags,
      query_used,
    }: {
      userId: string;
      image_url: string;
      ai_tags?: string[];
      query_used?: string;
    }) => {
      const res = await apiClient.post(`/users/${userId}/look-memory`, {
        image_url,
        ai_tags,
        query_used,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['look-memory', variables.userId],
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Shared Looks (Community Posts by User) Hook
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user's shared looks (community posts)
 */
export function useSharedLooks(userId: string) {
  return useQuery<SharedLook[], Error>({
    queryKey: ['shared-looks', userId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/community/posts/by-user/${userId}?limit=20`,
      );
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

// ─────────────────────────────────────────────────────────────
// Cache Invalidation Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Hook to invalidate all home-related queries for a user
 */
export function useInvalidateHomeData() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.invalidateQueries({queryKey: ['user-profile', userId]});
    queryClient.invalidateQueries({queryKey: ['look-memory', userId]});
    queryClient.invalidateQueries({queryKey: ['recreated-looks', userId]});
    queryClient.invalidateQueries({queryKey: ['saved-looks', userId]});
    queryClient.invalidateQueries({queryKey: ['shared-looks', userId]});
  };
}
