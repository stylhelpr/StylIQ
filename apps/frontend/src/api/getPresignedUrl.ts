// apps/frontend/api/getPresignedUrl.ts
import axios from 'axios';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';

export const getPresignedUrl = async (
  userId: string,
  filename: string,
  contentType: string, // 👈 pass through the MIME
) => {
  if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
    throw new Error(`❌ Invalid or missing UUID: ${userId}`);
  }

  const accessToken = await getAccessToken();
  const response = await axios.get(`${API_BASE_URL}/upload/presign`, {
    params: {
      userId,
      filename,
      contentType, // 👈 send to backend
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

///////////////

// // apps/frontend/api/getPresignedUrl.ts
// import axios from 'axios';
// import {API_BASE_URL} from '../config/api';

// export const getPresignedUrl = async (userId: string, filename: string) => {
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const response = await axios.get(`${API_BASE_URL}/upload/presign`, {
//     params: {
//       userId,
//       filename,
//     },
//   });

//   return response.data;
// };

/////////////

// // apps/frontend/api/getPresignedUrl.ts

// import axios from 'axios';
// import {Platform} from 'react-native';
// import {LOCAL_IP} from '../config/localIP';
// import {PORT} from '../config/port';

// const BASE_URL =
//   Platform.OS === 'android'
//     ? `http://10.0.2.2:${PORT}/api/upload`
//     : `http://${LOCAL_IP}:${PORT}/api/upload`;

// // ✅ No contentType passed, matches backend
// export const getPresignedUrl = async (userId: string, filename: string) => {
//   const response = await axios.get(`${BASE_URL}/presign`, {
//     params: {
//       userId,
//       filename,
//     },
//   });

//   return response.data;
// };

/////////

// import axios from 'axios';
// import {Platform} from 'react-native';

// const LOCAL_IP = '192.168.0.106';
// const PORT = 3001;

// const BASE_URL =
//   Platform.OS === 'android'
//     ? `http://10.0.2.2:${PORT}/api/upload`
//     : `http://${LOCAL_IP}:${PORT}/api/upload`;

// export const getPresignedUrl = async (userId: string, filename: string) => {
//   const response = await axios.post(`${BASE_URL}/presign`, {
//     user_id: userId,
//     originalFilename: filename,
//   });

//   return response.data; // ✅ includes uploadUrl, publicUrl, objectKey
// };

////////////

// // apps/frontend/api/getPresignedUrl.ts

// import axios from 'axios';
// import {Platform} from 'react-native';

// const LOCAL_IP = '192.168.0.106';
// const PORT = 3001;

// const BASE_URL =
//   Platform.OS === 'android'
//     ? `http://10.0.2.2:${PORT}/api/upload`
//     : `http://${LOCAL_IP}:${PORT}/api/upload`;

// // ✅ No contentType passed, matches backend
// export const getPresignedUrl = async (userId: string, filename: string) => {
//   const response = await axios.get(`${BASE_URL}/presign`, {
//     params: {
//       userId,
//       filename,
//     },
//   });

//   return response.data;
// };
