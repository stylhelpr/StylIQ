// context/UUIDContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAccessToken} from '../utils/auth';
import {useAuthProfile} from '../hooks/useAuthProfile';

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
  const [hasToken, setHasToken] = useState(false);

  // Wrapper that also persists to AsyncStorage
  const setUUID = useCallback((id: string | null) => {
    setUUIDState(id);
    if (id) {
      AsyncStorage.setItem('user_id', id).catch(() => {});
    }
  }, []);

  // 1) Hydrate from AsyncStorage and check for token on mount
  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('user_id');
      if (stored) {
        setUUIDState(stored);
      }

      try {
        const token = await getAccessToken();
        if (token) {
          setHasToken(true);
        } else {
          // No token - mark as initialized immediately
          setIsInitialized(true);
        }
      } catch {
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  // 2) Use TanStack Query to fetch auth profile (only when we have a token)
  const {data, isSuccess, isError, error} = useAuthProfile(hasToken);

  // 3) Process auth profile response
  useEffect(() => {
    if (!hasToken) return;

    if (isSuccess) {
      const serverId = data?.id ?? data?.uuid ?? null;
      if (serverId) {
        const serverIdStr = String(serverId);
        // Always update to server ID (handles account switching)
        if (serverIdStr !== uuid) {
          setUUIDState(serverIdStr);
          AsyncStorage.setItem('user_id', serverIdStr).catch(() => {});
        }
      }
      setIsInitialized(true);
    }

    if (isError) {
      console.log(
        '⚠️ /auth/profile check skipped:',
        (error as any)?.response?.data || (error as any)?.message,
      );
      setIsInitialized(true);
    }
  }, [hasToken, isSuccess, isError, data, error, uuid]);

  return (
    <UUIDContext.Provider value={{uuid, setUUID, isInitialized}}>
      {children}
    </UUIDContext.Provider>
  );
};

export const useUUID = () => useContext(UUIDContext).uuid;
export const useSetUUID = () => useContext(UUIDContext).setUUID;
export const useUUIDInitialized = () => useContext(UUIDContext).isInitialized;
