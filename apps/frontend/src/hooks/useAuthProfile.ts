// hooks/useAuthProfile.ts
// TanStack Query hook for fetching authenticated user profile
// Replaces direct axios call in UUIDContext.tsx
import {useQuery} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';

export type AuthProfile = {
  id?: string | number;
  uuid?: string;
  email?: string;
  name?: string;
};

/**
 * Fetches the authenticated user's profile from /auth/profile
 * - Cached and deduplicated via TanStack Query
 * - Only runs when enabled=true (i.e., when we have a token)
 * - staleTime: Infinity ensures it only fetches once per session
 */
export function useAuthProfile(enabled: boolean) {
  return useQuery<AuthProfile | null>({
    queryKey: ['auth', 'profile'],
    enabled,
    staleTime: Infinity, // Only fetch once per app session
    queryFn: async () => {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    },
  });
}
