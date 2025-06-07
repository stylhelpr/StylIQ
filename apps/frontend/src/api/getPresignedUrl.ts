// apps/frontend/api/getPresignedUrl.ts

import axios from 'axios';
import {Platform} from 'react-native';

const LOCAL_IP = '192.168.0.106';
const PORT = 3001;

const BASE_URL =
  Platform.OS === 'android'
    ? `http://10.0.2.2:${PORT}/api/upload`
    : `http://${LOCAL_IP}:${PORT}/api/upload`;

// ✅ No contentType passed, matches backend
export const getPresignedUrl = async (userId: string, filename: string) => {
  const response = await axios.get(`${BASE_URL}/presign`, {
    params: {
      userId,
      filename,
    },
  });

  return response.data;
};
