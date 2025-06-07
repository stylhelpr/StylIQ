// hooks/useFavorites.ts
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {Platform} from 'react-native';

const LOCAL_IP = '192.168.0.106'; // ✅ match your LAN IP
const PORT = 3001;

const BASE_URL =
  Platform.OS === 'android'
    ? `http://10.0.2.2:${PORT}/api/outfit-favorites`
    : `http://${LOCAL_IP}:${PORT}/api/outfit-favorites`;

export function useFavorites(userId: string) {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/${userId}`);
      return response.data;
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

  return {
    favorites: favoritesQuery.data,
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    refetchFavorites: favoritesQuery.refetch,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
  };
}
