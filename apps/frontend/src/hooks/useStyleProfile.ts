// hooks/useStyleProfile.ts
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';

export function useStyleProfile(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['styleProfile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const response = await apiClient.get('/style-profile');
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updatedProfile: any) => {
      const response = await apiClient.put('/style-profile', updatedProfile);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['styleProfile', userId]});
    },
  });

  const updateProfile = (field: string, value: any) => {
    if (!query.data) return;

    const validKeys = [
      'body_type',
      'skin_tone',
      'undertone',
      'climate',
      'favorite_colors',
      'disliked_styles',
      'style_keywords',
      'budget_level',
      'budget_min',
      'budget_max',
      'preferred_brands',
      'daily_activities',
      'goals',
      'fit_preferences',
      'style_icons',
    ];

    const filtered = Object.fromEntries(
      Object.entries(query.data || {}).filter(([key]) =>
        validKeys.includes(key),
      ),
    );

    const updated = {
      ...filtered,
      [field]: value,
    };

    // console.log('✅ Sending filtered updated profile:', updated);
    mutation.mutate(updated);
  };

  return {
    styleProfile: query.data,
    updateProfile,
    refetch: query.refetch,
    isLoading: query.isLoading,
    isUpdating: mutation.isPending,
    isError: query.isError,
  };
}
