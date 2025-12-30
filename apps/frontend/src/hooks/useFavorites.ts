// hooks/useFavorites.ts
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {API_BASE_URL} from '../config/api';

type FavoriteOutfit = {id: string; source: 'suggestion' | 'custom'};

type ToggleFavoriteParams = {
  outfitId: string;
  outfitType: 'suggestion' | 'custom';
  // Whether the item is currently favorited (captured before optimistic update)
  wasFavorited: boolean;
};

export function useFavorites(userId: string) {
  const queryClient = useQueryClient();
  const BASE = `${API_BASE_URL}/outfit-favorites`;

  // Main query for favorites - data is accessed directly via query.data
  const favoritesQuery = useQuery<FavoriteOutfit[], Error>({
    queryKey: ['favorites', userId] as const,
    enabled: !!userId,
    retry: 1,
    gcTime: 300000,
    staleTime: 60000, // Consider data fresh for 1 minute
    queryFn: async () => {
      if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
        throw new Error(`Invalid or missing UUID: ${userId}`);
      }
      const res = await axios.get(`${BASE}?user_id=${userId}`);
      return res.data;
    },
  });

  // Derived favorites array - use query data directly, with empty array fallback
  const favorites = favoritesQuery.data ?? [];

  // Toggle mutation with optimistic updates
  const toggleMutation = useMutation<
    void,
    Error,
    ToggleFavoriteParams,
    {previousFavorites: FavoriteOutfit[] | undefined}
  >({
    mutationFn: async ({outfitId, outfitType, wasFavorited}) => {
      // Use the captured state from before optimistic update
      const endpoint = wasFavorited ? `${BASE}/remove` : `${BASE}/add`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          outfit_id: outfitId,
          outfit_type: outfitType,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to toggle favorite: ${error}`);
      }
    },
    // Optimistic update before server response
    onMutate: async ({outfitId, outfitType}) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({queryKey: ['favorites', userId]});

      // Snapshot previous value for rollback
      const previousFavorites = queryClient.getQueryData<FavoriteOutfit[]>([
        'favorites',
        userId,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData<FavoriteOutfit[]>(
        ['favorites', userId],
        old => {
          const current = old ?? [];
          const isFavorited = current.some(
            f => f.id === outfitId && f.source === outfitType,
          );

          if (isFavorited) {
            return current.filter(
              f => !(f.id === outfitId && f.source === outfitType),
            );
          } else {
            return [...current, {id: outfitId, source: outfitType}];
          }
        },
      );

      return {previousFavorites};
    },
    // Rollback on error
    onError: (err, _variables, context) => {
      console.error('Error toggling favorite:', err);
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          ['favorites', userId],
          context.previousFavorites,
        );
      }
    },
    // Refetch after success or error to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['favorites', userId]});
      queryClient.invalidateQueries({queryKey: ['saved-outfits', userId]});
    },
  });

  // Add favorite mutation (standalone, for direct use)
  const addFavorite = useMutation({
    mutationFn: async ({outfitId, outfitType}: ToggleFavoriteParams) => {
      await axios.post(`${BASE}/add`, {
        user_id: userId,
        outfit_id: outfitId,
        outfit_type: outfitType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['favorites', userId]});
    },
  });

  // Remove favorite mutation (standalone, for direct use)
  const removeFavorite = useMutation({
    mutationFn: async ({outfitId, outfitType}: ToggleFavoriteParams) => {
      await axios.post(`${BASE}/remove`, {
        user_id: userId,
        outfit_id: outfitId,
        outfit_type: outfitType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['favorites', userId]});
    },
  });

  // Backward-compatible toggleFavorite function
  // The setCombinedOutfits parameter is now optional and not needed
  // since optimistic updates handle immediate UI feedback
  const toggleFavorite = (
    outfitId: string,
    outfitType: 'suggestion' | 'custom',
    _setCombinedOutfits?: React.Dispatch<React.SetStateAction<any[]>>,
  ) => {
    // Capture current favorite state BEFORE the optimistic update
    const wasFavorited = favorites.some(
      f => f.id === outfitId && f.source === outfitType,
    );
    toggleMutation.mutate({outfitId, outfitType, wasFavorited});
  };

  return {
    favorites,
    // setFavorites is removed - data is managed by TanStack Query
    // For backward compatibility, provide a no-op function that logs a warning
    setFavorites: (_newFavorites: FavoriteOutfit[]) => {
      console.warn(
        'setFavorites is deprecated. Favorites are now managed by TanStack Query cache.',
      );
    },
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    refetchFavorites: favoritesQuery.refetch,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    toggleFavorite,
    // Expose mutation state for consumers that need it
    isToggling: toggleMutation.isPending,
  };
}

//////////////

// import {useEffect, useState} from 'react';
// import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
// import axios from 'axios';
// import {Platform} from 'react-native';
// import {LOCAL_IP} from '../config/localIP';
// import {PORT} from '../config/port';

// type FavoriteOutfit = {id: string; source: 'suggestion' | 'custom'};

// const BASE_URL =
//   Platform.OS === 'android'
//     ? `http://10.0.2.2:${PORT}/api/outfit-favorites`
//     : `http://${LOCAL_IP}:${PORT}/api/outfit-favorites`;

// export function useFavorites(userId: string) {
//   const queryClient = useQueryClient();
//   const [favorites, setFavorites] = useState<FavoriteOutfit[]>([]);

//   const favoritesQuery = useQuery<FavoriteOutfit[], Error>({
//     queryKey: ['favorites', userId] as const,
//     queryFn: async () => {
//       const res = await axios.get(`${BASE_URL}?user_id=${userId}`);
//       return res.data; // Must return [{ id, source }]
//     },
//     enabled: !!userId,
//     retry: 1,
//     gcTime: 300000,
//   });

//   useEffect(() => {
//     if (favoritesQuery.data) {
//       console.log('✅ FAVORITES FETCHED:', favoritesQuery.data);
//       setFavorites(favoritesQuery.data);
//     }
//     if (favoritesQuery.error) {
//       console.error('❌ Failed to fetch favorites:', favoritesQuery.error);
//     }
//   }, [favoritesQuery.data, favoritesQuery.error]);

//   const addFavorite = useMutation({
//     mutationFn: async ({
//       outfitId,
//       outfitType,
//     }: {
//       outfitId: string;
//       outfitType: 'suggestion' | 'custom';
//     }) => {
//       await axios.post(`${BASE_URL}/add`, {
//         user_id: userId,
//         outfit_id: outfitId,
//         outfit_type: outfitType,
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['favorites', userId]});
//     },
//   });

//   const removeFavorite = useMutation({
//     mutationFn: async ({
//       outfitId,
//       outfitType,
//     }: {
//       outfitId: string;
//       outfitType: 'suggestion' | 'custom';
//     }) => {
//       await axios.post(`${BASE_URL}/remove`, {
//         user_id: userId,
//         outfit_id: outfitId,
//         outfit_type: outfitType,
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['favorites', userId]});
//     },
//   });

//   const toggleFavorite = async (
//     outfitId: string,
//     outfitType: 'suggestion' | 'custom',
//     setCombinedOutfits: React.Dispatch<React.SetStateAction<any[]>>,
//   ) => {
//     const isFavorited = favorites.some(
//       f => f.id === outfitId && f.source === outfitType,
//     );
//     const endpoint = isFavorited ? `${BASE_URL}/remove` : `${BASE_URL}/add`;

//     try {
//       const res = await fetch(endpoint, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           outfit_id: outfitId,
//           outfit_type: outfitType,
//         }),
//       });

//       if (!res.ok) {
//         const error = await res.text();
//         throw new Error(`Failed to toggle favorite: ${error}`);
//       }

//       // ✅ Update favorites list
//       const updatedFavorites = isFavorited
//         ? favorites.filter(f => !(f.id === outfitId && f.source === outfitType))
//         : [...favorites, {id: outfitId, source: outfitType}];
//       setFavorites(updatedFavorites);

//       // ✅ IMMEDIATELY update UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === outfitId ? {...o, favorited: !isFavorited} : o,
//         ),
//       );

//       // ✅ Optional: revalidate later, but don’t rely on this
//       queryClient.invalidateQueries({queryKey: ['favorites', userId]});
//     } catch (err) {
//       console.error('❌ Error toggling favorite:', err);
//     }
//   };

//   return {
//     favorites,
//     setFavorites,
//     isLoading: favoritesQuery.isLoading,
//     isError: favoritesQuery.isError,
//     refetchFavorites: favoritesQuery.refetch,
//     addFavorite: addFavorite.mutate,
//     removeFavorite: removeFavorite.mutate,
//     toggleFavorite,
//   };
// }
