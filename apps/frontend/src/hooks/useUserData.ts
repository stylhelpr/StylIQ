// hooks/useUserData.ts
// TanStack Query hook for fetching user data by ID
// Replaces direct fetch call in RootNavigator.tsx routeAfterLogin
import {useQuery} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';
import {queryClient} from '../lib/queryClient';

export type UserData = {
  id?: string | number;
  onboarding_complete?: boolean;
  email?: string;
  name?: string;
};

/**
 * Fetches user data from /users/me
 * - Cached and deduplicated via TanStack Query
 * - Prevents duplicate requests during navigation
 */
export function useUserData(userId: string | null) {
  return useQuery<UserData | null>({
    queryKey: ['user', userId],
    enabled: !!userId,
    staleTime: 30000, // Match default staleTime
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiClient.get('/users/me');
      return response.data;
    },
  });
}

/**
 * Imperative fetch for user data - uses TanStack Query for caching
 * This is for use in async functions like routeAfterLogin where hooks can't be used
 * Returns cached data if available and fresh, otherwise fetches from server
 */
export async function fetchUserData(userId: string): Promise<UserData | null> {
  try {
    return await queryClient.fetchQuery({
      queryKey: ['user', userId],
      staleTime: 30000,
      queryFn: async () => {
        const response = await apiClient.get('/users/me');
        return response.data;
      },
    });
  } catch {
    return null;
  }
}
