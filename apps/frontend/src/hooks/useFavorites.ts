import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {Platform} from 'react-native';

const LOCAL_IP = '192.168.0.106';
const PORT = 3001;

const BASE_URL =
  Platform.OS === 'android'
    ? `http://10.0.2.2:${PORT}/api/outfit-favorites`
    : `http://${LOCAL_IP}:${PORT}/api/outfit-favorites`;

export function useFavorites(userId: string) {
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<string[]>([]);

  const favoritesQuery = useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await axios.get(`${BASE_URL}?user_id=${userId}`);
      return res.data.map((o: any) => o.id);
    },
    onSuccess: (data: string[]) => {
      setFavorites(data);
    },
    onError: err => {
      console.error('❌ Failed to fetch favorites:', err);
    },
  });

  const addFavorite = useMutation({
    mutationFn: async (outfitId: string) => {
      await axios.post(`${BASE_URL}/add`, {
        user_id: userId,
        outfit_id: outfitId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['favorites', userId]});
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (outfitId: string) => {
      await axios.post(`${BASE_URL}/remove`, {
        user_id: userId,
        outfit_id: outfitId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['favorites', userId]});
    },
  });

  const toggleFavorite = async (
    outfitId: string,
    outfitType: 'suggestion' | 'custom',
    setCombinedOutfits: React.Dispatch<React.SetStateAction<any[]>>,
  ) => {
    const isFavorited = favorites.includes(outfitId);
    const endpoint = isFavorited ? `${BASE_URL}/remove` : `${BASE_URL}/add`;

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

      setFavorites(prev =>
        isFavorited ? prev.filter(id => id !== outfitId) : [...prev, outfitId],
      );

      setCombinedOutfits(prev =>
        prev.map(o =>
          o.id === outfitId ? {...o, favorited: !isFavorited} : o,
        ),
      );
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

///////////

// // hooks/useFavorites.ts
// import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
// import axios from 'axios';
// import {Platform} from 'react-native';

// const LOCAL_IP = '192.168.0.106'; // ✅ match your LAN IP
// const PORT = 3001;

// const BASE_URL =
//   Platform.OS === 'android'
//     ? `http://10.0.2.2:${PORT}/api/outfit-favorites`
//     : `http://${LOCAL_IP}:${PORT}/api/outfit-favorites`;

// export function useFavorites(userId: string) {
//   const queryClient = useQueryClient();

//   const favoritesQuery = useQuery({
//     queryKey: ['favorites', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const response = await axios.get(`${BASE_URL}/${userId}`);
//       return response.data;
//     },
//   });

//   const addFavorite = useMutation({
//     mutationFn: async (outfitId: string) => {
//       await axios.post(`${BASE_URL}/add`, {
//         user_id: userId,
//         outfit_id: outfitId,
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['favorites', userId]});
//     },
//   });

//   const removeFavorite = useMutation({
//     mutationFn: async (outfitId: string) => {
//       await axios.post(`${BASE_URL}/remove`, {
//         user_id: userId,
//         outfit_id: outfitId,
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['favorites', userId]});
//     },
//   });

//   return {
//     favorites: favoritesQuery.data,
//     isLoading: favoritesQuery.isLoading,
//     isError: favoritesQuery.isError,
//     refetchFavorites: favoritesQuery.refetch,
//     addFavorite: addFavorite.mutate,
//     removeFavorite: removeFavorite.mutate,
//   };
// }
