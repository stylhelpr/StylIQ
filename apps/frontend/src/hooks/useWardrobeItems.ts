// hooks/useWardrobeItems.ts
import {useQuery} from '@tanstack/react-query';
import {Platform} from 'react-native';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001/api'
    : 'http://localhost:3001/api';

export async function fetchWardrobeItems(userId: string) {
  const res = await fetch(`${API_BASE_URL}/wardrobe/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch wardrobe items');
  return res.json();
}

export function useWardrobeItems(userId: string) {
  return useQuery({
    queryKey: ['wardrobe', userId],
    queryFn: () => fetchWardrobeItems(userId),
    enabled: !!userId,
  });
}
