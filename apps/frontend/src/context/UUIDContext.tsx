// context/UUIDContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import axios from 'axios';
import {getAccessToken} from '../utils/auth';
import {API_BASE_URL} from '../config/api';

const UUIDContext = createContext<string | null>(null);

type UUIDProviderProps = {
  children: ReactNode;
};

export const UUIDProvider = ({children}: UUIDProviderProps) => {
  const [uuid, setUUID] = useState<string | null>(null);

  useEffect(() => {
    const fetchUUID = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          console.warn('⚠️ No access token available.');
          return;
        }

        const url = `${API_BASE_URL}/auth/profile`;

        const response = await axios.get(url, {
          headers: {Authorization: `Bearer ${token}`},
        });

        console.log('📡 /auth/profile response:', response.data);

        // ✅ Make sure you map the correct field
        if (response.data?.id) {
          // Backend returns `id` as UUID
          setUUID(response.data.id);
        } else if (response.data?.uuid) {
          // Or maybe it uses `uuid`
          setUUID(response.data.uuid);
        } else {
          console.log(
            '❌ No UUID found in /auth/profile response:',
            response.data,
          );
        }
      } catch (err: any) {
        console.error(
          '❌ fetchUUID error:',
          err?.response?.data || err.message,
        );
      }
    };

    fetchUUID();
  }, []);

  return <UUIDContext.Provider value={uuid}>{children}</UUIDContext.Provider>;
};

export const useUUID = () => useContext(UUIDContext);

/////////////

// // context/UUIDContext.tsx
// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
//   ReactNode,
// } from 'react';
// import axios from 'axios';
// import {getAccessToken} from '../utils/auth';
// import {API_BASE_URL} from '../config/api';

// const UUIDContext = createContext<string | null>(null);

// type UUIDProviderProps = {
//   children: ReactNode;
// };

// export const UUIDProvider = ({children}: UUIDProviderProps) => {
//   const [uuid, setUUID] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchUUID = async () => {
//       try {
//         const token = await getAccessToken();
//         if (!token) {
//           console.warn('⚠️ No access token available.');
//           return;
//         }

//         const url = `${API_BASE_URL}/auth/profile`;

//         const response = await axios.get(url, {
//           headers: {Authorization: `Bearer ${token}`},
//         });

//         console.log('📡 /auth/profile response:', response.data);

//         if (response.data?.uuid) {
//           setUUID(response.data.uuid);
//         } else {
//           console.log('❌ No uuid in response:', response.data);
//         }
//       } catch (err: any) {
//         console.error(
//           '❌ fetchUUID error:',
//           err?.response?.data || err.message,
//         );
//       }
//     };

//     fetchUUID();
//   }, []);

//   return <UUIDContext.Provider value={uuid}>{children}</UUIDContext.Provider>;
// };

// export const useUUID = () => useContext(UUIDContext);

/////////////////

// // context/UUIDContext.tsx
// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
//   ReactNode,
// } from 'react';
// import axios from 'axios';
// import {Platform} from 'react-native';
// import {getAccessToken} from '../utils/auth';
// import {LOCAL_IP} from '../config/localIP';
// import {PORT} from '../config/port';

// const API_BASE_URL =
//   Platform.OS === 'ios'
//     ? `http://${LOCAL_IP}:${PORT}`
//     : `http://10.0.2.2:${PORT}`;

// const UUIDContext = createContext<string | null>(null);

// type UUIDProviderProps = {
//   children: ReactNode;
// };

// export const UUIDProvider = ({children}: UUIDProviderProps) => {
//   const [uuid, setUUID] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchUUID = async () => {
//       try {
//         const token = await getAccessToken();

//         console.log('🔐 Access token:', token);

//         const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         console.log('📡 FULL RESPONSE from /auth/profile:', response.data);

//         if (response.data && response.data.uuid) {
//           console.log('✅ UUID from backend:', response.data.uuid);
//           setUUID(response.data.uuid);
//         } else {
//           console.log('❌ No uuid in response, got:', response.data);
//         }
//       } catch (err: any) {
//         console.error(
//           '❌ fetchUUID error:',
//           err?.response?.data || err.message,
//         );
//       }
//     };

//     fetchUUID();
//   }, []);

//   return <UUIDContext.Provider value={uuid}>{children}</UUIDContext.Provider>;
// };

// export const useUUID = () => useContext(UUIDContext);
