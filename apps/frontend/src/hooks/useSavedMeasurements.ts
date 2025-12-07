import {useQuery} from '@tanstack/react-query';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';

export interface SavedMeasurements {
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder_width?: number;
  inseam?: number;
  height?: number;
  weight?: number;
  shoe_size?: number;
  all_measurements?: Record<string, number>;
  updated_at?: string;
}

export const useSavedMeasurements = (userId: string | null | undefined) => {
  return useQuery<SavedMeasurements | null>({
    queryKey: ['savedMeasurements', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      const token = await getAccessToken();
      if (!token) return null;

      const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return null;
      const data = await res.json();

      return {
        chest: data.chest,
        waist: data.waist,
        hip: data.hip,
        shoulder_width: data.shoulder_width,
        inseam: data.inseam,
        height: data.height,
        weight: data.weight,
        shoe_size: data.shoe_size,
        all_measurements: data.all_measurements,
        updated_at: data.updated_at,
      };
    },
  });
};
