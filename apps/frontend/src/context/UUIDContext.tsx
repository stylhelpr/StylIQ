// context/UUIDContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAccessToken} from '../utils/auth';
import {API_BASE_URL} from '../config/api';

type UUIDCtx = {
  uuid: string | null;
  setUUID: (id: string | null) => void;
  isInitialized: boolean;
};
const UUIDContext = createContext<UUIDCtx>({
  uuid: null,
  setUUID: () => {},
  isInitialized: false,
});

type UUIDProviderProps = {children: ReactNode};

export const UUIDProvider = ({children}: UUIDProviderProps) => {
  const [uuid, setUUIDState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Wrapper that also persists to AsyncStorage
  const setUUID = useCallback((id: string | null) => {
    setUUIDState(id);
    if (id) {
      AsyncStorage.setItem('user_id', id).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // 1) Hydrate instantly from AsyncStorage (what you store after login)
      const stored = await AsyncStorage.getItem('user_id');
      if (stored) {
        setUUIDState(stored);
      }

      // 2) If we have a token, confirm with backend
      try {
        const token = await getAccessToken();
        if (!token) {
          setIsInitialized(true);
          return;
        }

        const {data} = await axios.get(`${API_BASE_URL}/auth/profile`, {
          headers: {Authorization: `Bearer ${token}`},
        });

        const serverId = data?.id ?? data?.uuid ?? null;
        if (serverId) {
          const serverIdStr = String(serverId);
          if (serverIdStr !== stored) {
            setUUIDState(serverIdStr);
            await AsyncStorage.setItem('user_id', serverIdStr);
          }
        }
      } catch (err: any) {
        console.log(
          '⚠️ /auth/profile check skipped:',
          err?.response?.data || err?.message,
        );
      } finally {
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  return (
    <UUIDContext.Provider value={{uuid, setUUID, isInitialized}}>
      {children}
    </UUIDContext.Provider>
  );
};

export const useUUID = () => useContext(UUIDContext).uuid;
export const useSetUUID = () => useContext(UUIDContext).setUUID;
export const useUUIDInitialized = () => useContext(UUIDContext).isInitialized;
