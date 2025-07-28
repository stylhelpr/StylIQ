import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {Platform} from 'react-native';
import {LOCAL_IP} from '../config/localIP';
import {PORT} from '../config/port';

const BASE_URL =
  Platform.OS === 'android'
    ? `http://10.0.2.2:${PORT}/api/style-profile`
    : `http://${LOCAL_IP}:${PORT}/api/style-profile`;

export function useStyleProfile(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['styleProfile', userId],
    enabled: !!userId,
    queryFn: async () => {
      console.log('🔍 Fetching style profile for:', userId);
      try {
        const response = await axios.get(`${BASE_URL}/${userId}`);
        console.log('✅ Fetched style profile:', response.data);
        return response.data;
      } catch (err: any) {
        console.error(
          '❌ Error fetching style profile:',
          err.response?.data || err.message || err,
        );
        throw err;
      }
    },
  });

  const mutation = useMutation({
    mutationFn: async (updatedProfile: any) => {
      console.log('📝 Updating style profile for:', userId);
      const response = await axios.put(`${BASE_URL}/${userId}`, updatedProfile);
      return response.data;
    },
    onSuccess: () => {
      console.log('♻️ Invalidating style profile cache for:', userId);
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
      'preferred_brands',
      'daily_activities',
      'goals',
      'fit_preferences', // make sure your field is listed here
    ];

    const updated = {
      ...Object.fromEntries(
        Object.entries(query.data || {}).filter(([key]) =>
          validKeys.includes(key),
        ),
      ),
      [field]: value,
    };

    console.log('✅ Sending filtered updated profile:', updated);
    mutation.mutate(updated);
  };

  return {
    styleProfile: query.data,
    updateProfile,
    refetch: query.refetch, // <-- expose refetch here
    isLoading: query.isLoading,
    isUpdating: mutation.isPending,
    isError: query.isError,
  };
}

/////////////

// // useStyleProfile.ts
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import axios from 'axios';
// import {Platform} from 'react-native';

// const LOCAL_IP = '192.168.0.106';
// const PORT = 3001;

// const BASE_URL =
//   Platform.OS === 'android'
//     ? `http://10.0.2.2:${PORT}/api/style-profile`
//     : `http://${LOCAL_IP}:${PORT}/api/style-profile`;

// export function useStyleProfile(userId: string) {
//   const queryClient = useQueryClient();

//   const query = useQuery({
//     queryKey: ['styleProfile', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       console.log('🔍 Fetching style profile for:', userId);
//       try {
//         const response = await axios.get(`${BASE_URL}/${userId}`);
//         console.log('✅ Fetched style profile:', response.data);
//         return response.data;
//       } catch (err: any) {
//         console.error(
//           '❌ Error fetching style profile:',
//           err.response?.data || err.message || err,
//         );
//         throw err;
//       }
//     },
//   });

//   const mutation = useMutation({
//     mutationFn: async (updatedProfile: any) => {
//       console.log('📝 Updating style profile for:', userId);
//       const response = await axios.put(`${BASE_URL}/${userId}`, updatedProfile);
//       return response.data;
//     },
//     onSuccess: () => {
//       console.log('♻️ Invalidating style profile cache for:', userId);
//       queryClient.invalidateQueries({queryKey: ['styleProfile', userId]});
//     },
//   });

//   const updateProfile = (field: string, value: any) => {
//     if (!query.data) return;

//     const validKeys = [
//       'body_type',
//       'skin_tone',
//       'undertone',
//       'climate',
//       'favorite_colors',
//       'disliked_styles',
//       'style_keywords',
//       'budget_level',
//       'preferred_brands',
//       'daily_activities',
//       'goals',
//     ];

//     const updated = {
//       ...Object.fromEntries(
//         Object.entries(query.data || {}).filter(([key]) =>
//           validKeys.includes(key),
//         ),
//       ),
//       [field]: value,
//     };

//     console.log('✅ Sending filtered updated profile:', updated);
//     mutation.mutate(updated);
//   };

//   return {
//     styleProfile: query.data,
//     updateProfile,
//     isLoading: query.isLoading,
//     isUpdating: mutation.isPending,
//     isError: query.isError,
//   };
// }
