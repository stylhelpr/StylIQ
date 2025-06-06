import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {Platform} from 'react-native';

// Set your actual backend URL
const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api/style-profile' // Android emulator local
    : 'http://localhost:3000/api/style-profile'; // iOS simulator

export function useStyleProfile(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['styleProfile', userId],
    enabled: !!userId,
    queryFn: async () => {
      console.log('🔍 Fetching style profile for:', userId);
      const response = await axios.get(`${BASE_URL}/${userId}`);
      console.log('✅ Fetched style profile:', response.data);
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updatedProfile: any) => {
      const response = await axios.put(`${BASE_URL}/${userId}`, updatedProfile);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['styleProfile', userId]});
    },
  });

  const updateProfile = (field: string, value: any) => {
    if (!query.data) return;
    const updated = {...query.data, [field]: value};
    mutation.mutate(updated);
  };

  return {
    styleProfile: query.data,
    updateProfile,
    isLoading: query.isLoading,
    isUpdating: mutation.isPending,
    isError: query.isError,
  };
}

///////////////

// // hooks/useStyleProfile.ts
// import {useState} from 'react';

// export function useStyleProfile() {
//   const [styleProfile, setStyleProfile] = useState({
//     height: '',
//     weight: '',
//     bodyType: '',
//     skinTone: '',
//     hairColor: '',
//     topSize: '',
//     bottomSize: '',
//     shoeSize: '',
//     preferredFit: '',
//     primaryStyles: [],
//     colorPreferences: [],
//     patterns: [],
//     location: '',
//     dailyActivities: [],
//     occasions: [],
//     priceRange: '',
//     preferredBrands: [],
//     dislikes: [],
//     desiredImpression: '',
//     notes: '',
//   });

//   const updateProfile = (field: string, value: any) => {
//     setStyleProfile(prev => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   return {styleProfile, updateProfile};
// }
