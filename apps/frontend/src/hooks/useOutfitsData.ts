import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';
import {API_BASE_URL} from '../config/api';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type OutfitOccasion =
  | 'Work'
  | 'DateNight'
  | 'Casual'
  | 'Formal'
  | 'Travel'
  | 'Gym'
  | 'Weekend'
  | 'Party'
  | 'Interview'
  | 'Brunch';

export interface OutfitItem {
  id: string;
  name?: string;
  image: string;
}

export interface SavedOutfitData {
  id: string;
  name?: string;
  top: OutfitItem;
  bottom: OutfitItem;
  shoes: OutfitItem;
  createdAt: string;
  tags?: string[];
  notes?: string;
  rating?: number;
  favorited?: boolean;
  plannedDate?: string;
  type: 'custom' | 'ai';
  timesWorn?: number;
  occasion?: OutfitOccasion;
}

interface ScheduledOutfitData {
  ai_outfit_id?: string;
  custom_outfit_id?: string;
  scheduled_for: string;
}

interface RawOutfitData {
  id: string;
  name?: string;
  top?: {id: string; name?: string; image?: string; image_url?: string};
  bottom?: {id: string; name?: string; image?: string; image_url?: string};
  shoes?: {id: string; name?: string; image?: string; image_url?: string};
  created_at?: string;
  createdAt?: string;
  tags?: string[];
  notes?: string;
  rating?: number;
  occasion?: OutfitOccasion;
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const normalizeImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

const normalizeOutfit = (
  o: RawOutfitData,
  isCustom: boolean,
  scheduleMap: Record<string, string>,
  wornCounts: Record<string, number>,
  favorites: Array<{id: string; source: string}>,
): SavedOutfitData => {
  const outfitId = o.id;
  return {
    id: outfitId,
    name: o.name || '',
    top: o.top
      ? {
          id: o.top.id,
          name: o.top.name,
          image: normalizeImageUrl(o.top.image || o.top.image_url),
        }
      : ({} as OutfitItem),
    bottom: o.bottom
      ? {
          id: o.bottom.id,
          name: o.bottom.name,
          image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
        }
      : ({} as OutfitItem),
    shoes: o.shoes
      ? {
          id: o.shoes.id,
          name: o.shoes.name,
          image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
        }
      : ({} as OutfitItem),
    createdAt:
      o.created_at || o.createdAt
        ? new Date(o.created_at || o.createdAt!).toISOString()
        : new Date().toISOString(),
    tags: o.tags || [],
    notes: o.notes || '',
    rating: o.rating ?? undefined,
    favorited: favorites.some(
      f => f.id === outfitId && f.source === (isCustom ? 'custom' : 'suggestion'),
    ),
    plannedDate: scheduleMap[outfitId] ?? undefined,
    type: isCustom ? 'custom' : 'ai',
    timesWorn: wornCounts[outfitId] ?? 0,
    occasion: o.occasion ?? undefined,
  };
};

// ─────────────────────────────────────────────────────────────
// Main Outfits Query Hook
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all saved outfits (AI + custom) with schedule and worn count data
 */
export function useOutfitsQuery(
  userId: string,
  favorites: Array<{id: string; source: string}> = [],
) {
  return useQuery<SavedOutfitData[], Error>({
    queryKey: ['saved-outfits', userId],
    queryFn: async () => {
      // Fetch all 4 endpoints in parallel for speed
      const [aiRes, customRes, scheduledRes, wornCountsRes] = await Promise.all([
        apiClient.get('/outfit/suggestions'),
        apiClient.get('/outfit/custom'),
        apiClient.get('/scheduled-outfits'),
        apiClient.get('/scheduled-outfits/worn-counts').catch(() => ({data: {}})),
      ]);

      const aiData: RawOutfitData[] = aiRes.data || [];
      const customData: RawOutfitData[] = customRes.data || [];
      const scheduledData: ScheduledOutfitData[] = scheduledRes.data || [];
      const wornCounts: Record<string, number> = wornCountsRes.data || {};

      console.log('📦 useOutfitsQuery fetched:', {
        aiCount: aiData.length,
        customCount: customData.length,
        customData: JSON.stringify(customData, null, 2),
      });

      // Build schedule map
      const scheduleMap: Record<string, string> = {};
      for (const s of scheduledData) {
        if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
        else if (s.custom_outfit_id) scheduleMap[s.custom_outfit_id] = s.scheduled_for;
      }

      // Normalize all outfits
      const allOutfits = [
        ...aiData.map(o => normalizeOutfit(o, false, scheduleMap, wornCounts, favorites)),
        ...customData.map(o => normalizeOutfit(o, true, scheduleMap, wornCounts, favorites)),
      ];

      return allOutfits;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

// ─────────────────────────────────────────────────────────────
// Update Outfit Mutation
// ─────────────────────────────────────────────────────────────

/**
 * Update outfit name and/or occasion
 */
export function useUpdateOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
      outfitType,
      name,
      occasion,
    }: {
      userId: string;
      outfitId: string;
      outfitType: 'custom' | 'ai';
      name?: string;
      occasion?: OutfitOccasion | null;
    }) => {
      const table = outfitType === 'custom' ? 'custom' : 'suggestions';
      const res = await apiClient.put(`/outfit/${table}/${outfitId}`, {
        name: name?.trim(),
        occasion: occasion ?? null,
      });
      return res.data;
    },
    onMutate: async variables => {
      const {userId, outfitId, name, occasion} = variables;
      await queryClient.cancelQueries({queryKey: ['saved-outfits', userId]});

      const previousOutfits = queryClient.getQueryData<SavedOutfitData[]>([
        'saved-outfits',
        userId,
      ]);

      // Optimistically update
      queryClient.setQueryData<SavedOutfitData[]>(['saved-outfits', userId], old =>
        old?.map(o =>
          o.id === outfitId
            ? {
                ...o,
                name: name?.trim() ?? o.name,
                occasion: occasion === null ? undefined : occasion ?? o.occasion,
              }
            : o,
        ),
      );

      return {previousOutfits, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousOutfits) {
        queryClient.setQueryData(
          ['saved-outfits', variables.userId],
          context.previousOutfits,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Delete Outfit Mutation
// ─────────────────────────────────────────────────────────────

/**
 * Delete an outfit
 */
export function useDeleteOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
    }: {
      userId: string;
      outfitId: string;
    }) => {
      await apiClient.delete(`/outfit/${outfitId}`);
      return {outfitId, userId};
    },
    onMutate: async ({userId, outfitId}) => {
      await queryClient.cancelQueries({queryKey: ['saved-outfits', userId]});

      const previousOutfits = queryClient.getQueryData<SavedOutfitData[]>([
        'saved-outfits',
        userId,
      ]);

      // Optimistically remove
      queryClient.setQueryData<SavedOutfitData[]>(['saved-outfits', userId], old =>
        old?.filter(o => o.id !== outfitId),
      );

      return {previousOutfits, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousOutfits) {
        queryClient.setQueryData(
          ['saved-outfits', variables.userId],
          context.previousOutfits,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Schedule Outfit Mutation
// ─────────────────────────────────────────────────────────────

/**
 * Schedule an outfit for a specific date/time
 */
export function useScheduleOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
      outfitType,
      scheduledFor,
    }: {
      userId: string;
      outfitId: string;
      outfitType: 'custom' | 'ai';
      scheduledFor: string;
    }) => {
      await apiClient.post('/scheduled-outfits', {
        user_id: userId,
        outfit_id: outfitId,
        outfit_type: outfitType,
        scheduled_for: scheduledFor,
      });
      return {outfitId, scheduledFor};
    },
    onMutate: async ({userId, outfitId, scheduledFor}) => {
      await queryClient.cancelQueries({queryKey: ['saved-outfits', userId]});

      const previousOutfits = queryClient.getQueryData<SavedOutfitData[]>([
        'saved-outfits',
        userId,
      ]);

      // Optimistically update planned date and increment worn count
      queryClient.setQueryData<SavedOutfitData[]>(['saved-outfits', userId], old =>
        old?.map(o =>
          o.id === outfitId
            ? {
                ...o,
                plannedDate: scheduledFor,
                timesWorn: (o.timesWorn ?? 0) + 1,
              }
            : o,
        ),
      );

      return {previousOutfits, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousOutfits) {
        queryClient.setQueryData(
          ['saved-outfits', variables.userId],
          context.previousOutfits,
        );
      }
    },
    onSuccess: (_, variables) => {
      // Also invalidate calendar queries if they exist
      queryClient.invalidateQueries({queryKey: ['scheduled-outfits', variables.userId]});
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Cancel Scheduled Outfit Mutation
// ─────────────────────────────────────────────────────────────

/**
 * Cancel a scheduled outfit
 */
export function useCancelScheduledOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
    }: {
      userId: string;
      outfitId: string;
    }) => {
      await apiClient.delete('/scheduled-outfits', {
        data: {user_id: userId, outfit_id: outfitId},
      });
      return {outfitId, userId};
    },
    onMutate: async ({userId, outfitId}) => {
      await queryClient.cancelQueries({queryKey: ['saved-outfits', userId]});

      const previousOutfits = queryClient.getQueryData<SavedOutfitData[]>([
        'saved-outfits',
        userId,
      ]);

      // Optimistically remove planned date
      queryClient.setQueryData<SavedOutfitData[]>(['saved-outfits', userId], old =>
        old?.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
      );

      return {previousOutfits, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousOutfits) {
        queryClient.setQueryData(
          ['saved-outfits', variables.userId],
          context.previousOutfits,
        );
      }
    },
    onSuccess: (_, variables) => {
      // Also invalidate calendar queries if they exist
      queryClient.invalidateQueries({queryKey: ['scheduled-outfits', variables.userId]});
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Mark Worn Mutation
// ─────────────────────────────────────────────────────────────

/**
 * Mark an outfit as worn (increment worn count)
 */
export function useMarkOutfitWorn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
      outfitType,
    }: {
      userId: string;
      outfitId: string;
      outfitType: 'custom' | 'ai';
    }) => {
      await apiClient.post(`/outfit/mark-worn/${outfitId}/${outfitType}/${userId}`);
      return {outfitId, userId};
    },
    onMutate: async ({userId, outfitId}) => {
      await queryClient.cancelQueries({queryKey: ['saved-outfits', userId]});

      const previousOutfits = queryClient.getQueryData<SavedOutfitData[]>([
        'saved-outfits',
        userId,
      ]);

      // Optimistically increment worn count
      queryClient.setQueryData<SavedOutfitData[]>(['saved-outfits', userId], old =>
        old?.map(o =>
          o.id === outfitId ? {...o, timesWorn: (o.timesWorn ?? 0) + 1} : o,
        ),
      );

      return {previousOutfits, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousOutfits) {
        queryClient.setQueryData(
          ['saved-outfits', variables.userId],
          context.previousOutfits,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Unmark Worn Mutation
// ─────────────────────────────────────────────────────────────

/**
 * Unmark an outfit as worn (decrement worn count)
 */
export function useUnmarkOutfitWorn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
      outfitType,
    }: {
      userId: string;
      outfitId: string;
      outfitType: 'custom' | 'ai';
    }) => {
      await apiClient.delete(`/outfit/unmark-worn/${outfitId}/${outfitType}/${userId}`);
      return {outfitId, userId};
    },
    onMutate: async ({userId, outfitId}) => {
      await queryClient.cancelQueries({queryKey: ['saved-outfits', userId]});

      const previousOutfits = queryClient.getQueryData<SavedOutfitData[]>([
        'saved-outfits',
        userId,
      ]);

      // Optimistically decrement worn count
      queryClient.setQueryData<SavedOutfitData[]>(['saved-outfits', userId], old =>
        old?.map(o =>
          o.id === outfitId
            ? {...o, timesWorn: Math.max(0, (o.timesWorn ?? 0) - 1)}
            : o,
        ),
      );

      return {previousOutfits, userId};
    },
    onError: (_err, variables, context) => {
      if (context?.previousOutfits) {
        queryClient.setQueryData(
          ['saved-outfits', variables.userId],
          context.previousOutfits,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Cache Invalidation Utility
// ─────────────────────────────────────────────────────────────

/**
 * Hook to invalidate saved outfits cache
 */
export function useInvalidateSavedOutfits() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.invalidateQueries({queryKey: ['saved-outfits', userId]});
  };
}
