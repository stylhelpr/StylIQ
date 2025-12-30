// hooks/useFavorites.ts
import {useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {API_BASE_URL} from '../config/api';

type FavoriteOutfit = {id: string; source: 'suggestion' | 'custom'};

export function useFavorites(userId: string) {
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<FavoriteOutfit[]>([]);

  const BASE = `${API_BASE_URL}/outfit-favorites`;

  const favoritesQuery = useQuery<FavoriteOutfit[], Error>({
    queryKey: ['favorites', userId] as const,
    enabled: !!userId,
    retry: 1,
    gcTime: 300000,
    queryFn: async () => {
      if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
        throw new Error(`❌ Invalid or missing UUID: ${userId}`);
      }
      const res = await axios.get(`${BASE}?user_id=${userId}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (favoritesQuery.data) {
      setFavorites(favoritesQuery.data);
    }
    if (favoritesQuery.error) {
      console.error('❌ Failed to fetch favorites:', favoritesQuery.error);
    }
  }, [favoritesQuery.data, favoritesQuery.error]);

  const addFavorite = useMutation({
    mutationFn: async ({
      outfitId,
      outfitType,
    }: {
      outfitId: string;
      outfitType: 'suggestion' | 'custom';
    }) => {
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

  const removeFavorite = useMutation({
    mutationFn: async ({
      outfitId,
      outfitType,
    }: {
      outfitId: string;
      outfitType: 'suggestion' | 'custom';
    }) => {
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

  const toggleFavorite = async (
    outfitId: string,
    outfitType: 'suggestion' | 'custom',
    setCombinedOutfits?: React.Dispatch<React.SetStateAction<any[]>>,
  ) => {
    const isFavorited = favorites.some(
      f => f.id === outfitId && f.source === outfitType,
    );
    const endpoint = isFavorited ? `${BASE}/remove` : `${BASE}/add`;

    try {
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

      // Update local favorites
      const updatedFavorites = isFavorited
        ? favorites.filter(f => !(f.id === outfitId && f.source === outfitType))
        : [...favorites, {id: outfitId, source: outfitType}];
      setFavorites(updatedFavorites);

      // Immediate UI update (for legacy callers)
      if (setCombinedOutfits) {
        setCombinedOutfits(prev =>
          prev.map(o =>
            o.id === outfitId ? {...o, favorited: !isFavorited} : o,
          ),
        );
      }

      // Revalidate cache (both favorites and saved-outfits)
      queryClient.invalidateQueries({queryKey: ['favorites', userId]});
      queryClient.invalidateQueries({queryKey: ['saved-outfits', userId]});
    } catch (err) {
      console.error('❌ Error toggling favorite:', err);
    }
  };

  return {
    favorites,
    setFavorites,
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    refetchFavorites: favoritesQuery.refetch,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    toggleFavorite,
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
