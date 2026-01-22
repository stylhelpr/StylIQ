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
 * - Cache is explicitly cleared on logout and app start (UUIDContext.tsx)
 *   to ensure fresh data when a different user logs in
 * - staleTime: 0 means always refetch when query becomes stale
 *   (but cache is cleared on app start so this mostly applies to background refetches)
 */
export function useAuthProfile(enabled: boolean) {
  return useQuery<AuthProfile | null>({
    queryKey: ['auth', 'profile'],
    enabled,
    staleTime: 0, // Always consider stale - cache cleared on app start/logout
    gcTime: 0, // Don't keep in garbage collection cache
    refetchOnMount: 'always', // Always refetch when component mounts
    queryFn: async () => {
      console.log('[useAuthProfile] Fetching /auth/profile...');
      const response = await apiClient.get('/auth/profile');
      console.log('[useAuthProfile] Server returned user ID:', response.data?.uuid || response.data?.id);
      return response.data;
    },
  });
}
