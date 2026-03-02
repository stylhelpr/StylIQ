/**
 * Hook to fetch the authenticated user's gender_presentation from /users/me.
 * Returns the raw string (e.g. "male", "female", "other") or undefined if not yet loaded.
 */
import {useQuery} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';
import {useUUID} from '../context/UUIDContext';

export function useGenderPresentation(): string | undefined {
  const uuid = useUUID();

  const {data} = useQuery({
    queryKey: ['user', uuid, 'gender_presentation'],
    enabled: !!uuid,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get('/users/me');
      return res.data?.gender_presentation as string | undefined;
    },
  });

  return data ?? undefined;
}
