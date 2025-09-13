// context/UUIDContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAccessToken} from '../utils/auth';
import {API_BASE_URL} from '../config/api';

type UUIDCtx = {uuid: string | null; setUUID: (id: string | null) => void};
const UUIDContext = createContext<UUIDCtx>({uuid: null, setUUID: () => {}});

type UUIDProviderProps = {children: ReactNode};

export const UUIDProvider = ({children}: UUIDProviderProps) => {
  const [uuid, setUUID] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1) Hydrate instantly from AsyncStorage (what you store after login)
      const stored = await AsyncStorage.getItem('user_id');
      if (stored) setUUID(stored);

      // 2) If we have a token, confirm with backend
      try {
        const token = await getAccessToken();
        if (!token) return;

        const {data} = await axios.get(`${API_BASE_URL}/auth/profile`, {
          headers: {Authorization: `Bearer ${token}`},
        });

        const serverId = data?.id ?? data?.uuid ?? null;
        if (serverId && serverId !== stored) {
          setUUID(serverId);
          await AsyncStorage.setItem('user_id', String(serverId));
        }
      } catch (err: any) {
        console.log(
          '⚠️ /auth/profile check skipped:',
          err?.response?.data || err?.message,
        );
      }
    };

    init();
  }, []);

  return (
    <UUIDContext.Provider value={{uuid, setUUID}}>
      {children}
    </UUIDContext.Provider>
  );
};

export const useUUID = () => useContext(UUIDContext).uuid;
export const useSetUUID = () => useContext(UUIDContext).setUUID;

//////////////////

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

//         // ✅ Make sure you map the correct field
//         if (response.data?.id) {
//           // Backend returns `id` as UUID
//           setUUID(response.data.id);
//         } else if (response.data?.uuid) {
//           // Or maybe it uses `uuid`
//           setUUID(response.data.uuid);
//         } else {
//           console.log(
//             '❌ No UUID found in /auth/profile response:',
//             response.data,
//           );
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
