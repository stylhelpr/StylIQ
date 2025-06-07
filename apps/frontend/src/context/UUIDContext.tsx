// context/UUIDContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import axios from 'axios';
import {Platform} from 'react-native';
import {getAccessToken} from '../utils/auth';

const LOCAL_IP = '192.168.0.106'; // ⚠️ Ensure this matches your machine's local IP
const LOCAL_PORT = 3001;

const API_BASE_URL =
  Platform.OS === 'ios'
    ? `http://${LOCAL_IP}:${LOCAL_PORT}`
    : `http://10.0.2.2:${LOCAL_PORT}`;

const UUIDContext = createContext<string | null>(null);

type UUIDProviderProps = {
  children: ReactNode;
};

export const UUIDProvider = ({children}: UUIDProviderProps) => {
  const [uuid, setUUID] = useState<string | null>(null);

  useEffect(() => {
    // const fetchUUID = async () => {
    //   try {
    //     const token = await getAccessToken();

    //     console.log('🔐 Access token:', token);
    //     console.log('🔐 Access token about to be used:', token);
    //     const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
    //       headers: {
    //         Authorization: `Bearer ${token}`,
    //       },
    //     });

    //     console.log('📡 Response from /auth/profile:', response.data);

    //     if (response.data?.uuid) {
    //       console.log('🧠 UUID from backend:', response.data.uuid);
    //       setUUID(response.data.uuid);
    //     } else {
    //       console.warn('⚠️ No UUID returned from backend');
    //     }
    //   } catch (err: any) {
    //     console.error(
    //       '❌ Failed to fetch UUID:',
    //       err.response?.data || err.message || err,
    //     );
    //   }
    // };
    const fetchUUID = async () => {
      try {
        const token = await getAccessToken();

        console.log('🔐 Access token:', token);

        const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('📡 FULL RESPONSE from /auth/profile:', response.data);

        if (response.data && response.data.uuid) {
          console.log('✅ UUID from backend:', response.data.uuid);
          setUUID(response.data.uuid);
        } else {
          console.log('❌ No uuid in response, got:', response.data);
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

///////////

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

// const LOCAL_IP = '192.168.0.106'; // 👈 Make sure this is your actual IP
// const LOCAL_PORT = 3001;

// const API_BASE_URL =
//   Platform.OS === 'ios'
//     ? `http://${LOCAL_IP}:${LOCAL_PORT}/api`
//     : `http://10.0.2.2:${LOCAL_PORT}/api`;

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

//         const res = await axios.get(`${API_BASE_URL}/auth/profile`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         console.log('📡 Response from /auth/profile:', res.data);

//         if (res.data?.uuid) {
//           setUUID(res.data.uuid);
//         } else {
//           console.warn('No UUID returned from backend:', res.data);
//         }
//       } catch (err) {
//         console.error('❌ Failed to fetch UUID:', err);
//       }
//     };

//     fetchUUID();
//   }, []);

//   return <UUIDContext.Provider value={uuid}>{children}</UUIDContext.Provider>;
// };

// export const useUUID = () => useContext(UUIDContext);

////////////

// import React, {createContext, useContext, useEffect, useState} from 'react';
// import axios from 'axios';
// import {Platform} from 'react-native';
// import {getAccessToken} from '../utils/auth';

// const UUIDContext = createContext<string | null>(null);
// const LOCAL_IP = '192.168.0.106';
// const LOCAL_PORT = 3000;

// const API_BASE_URL =
//   Platform.OS === 'ios'
//     ? `http://${LOCAL_IP}:${LOCAL_PORT}` // ✅ real iPhone or simulator
//     : `http://10.0.2.2:${LOCAL_PORT}`; // ✅ Android emulator (if used)

// export const UUIDProvider = ({children}: {children: React.ReactNode}) => {
//   const [uuid, setUUID] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchUUID = async () => {
//       try {
//         const token = await getAccessToken();
//         console.log('🔐 Access token:', token);

//         const res = await axios.get(`${API_BASE_URL}/auth/profile`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         console.log('📡 Response from /auth/profile:', res.data);

//         setUUID(res.data.uuid);
//       } catch (err) {
//         console.error('❌ Failed to fetch UUID:', err);
//       }
//     };

//     fetchUUID();
//   }, []);

//   return <UUIDContext.Provider value={uuid}>{children}</UUIDContext.Provider>;
// };
