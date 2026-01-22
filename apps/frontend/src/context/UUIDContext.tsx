// context/UUIDContext.tsx
// MULTI-ACCOUNT: Integrates with activeUserManager for user-scoped storage

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
import {
  initializeActiveUser,
  setActiveUserId,
  getActiveUserId,
} from '../storage/activeUserManager';
import {rehydrateAllUserStores} from '../../../../store/userScopedZustandStorage';
import {analyticsQueue} from '../services/analyticsQueue';
import {useCalendarEventPromptStore} from '../../../../store/calendarEventPromptStore';

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
  const loadCalendarPrompts = useCalendarEventPromptStore(state => state.loadFromStorage);

  // Wrapper that also persists to AsyncStorage and updates active user manager
  const setUUID = useCallback((id: string | null) => {
    setUUIDState(id);
    if (id) {
      AsyncStorage.setItem('user_id', id).catch(() => {});
      // MULTI-ACCOUNT: Also update active user manager
      // This triggers migration and enables user-scoped storage
      setActiveUserId(id).catch(err => {
        console.error('[UUIDContext] Failed to set active user:', err);
      });
    }
  }, []);

  // 1) Hydrate from AsyncStorage and check for token on mount
  useEffect(() => {
    const init = async () => {
      // MULTI-ACCOUNT: Initialize active user manager first
      const activeUserId = await initializeActiveUser();

      // Check for stored user_id (legacy compatibility)
      const stored = await AsyncStorage.getItem('user_id');
      if (stored) {
        setUUIDState(stored);
        // Sync active user manager if needed
        if (activeUserId !== stored) {
          await setActiveUserId(stored);
        }
      } else if (activeUserId) {
        setUUIDState(activeUserId);
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
        const isUserChange = serverIdStr !== uuid;

        // Update state if user changed
        if (isUserChange) {
          setUUIDState(serverIdStr);
          AsyncStorage.setItem('user_id', serverIdStr).catch(() => {});
        }

        // MULTI-ACCOUNT: ALWAYS set active user and rehydrate stores
        // This ensures stores load from the correct user-scoped key on every app launch
        setActiveUserId(serverIdStr).then(async () => {
          console.log('[UUIDContext] Active user set, rehydrating stores...');
          // Rehydrate all user-scoped Zustand stores
          await rehydrateAllUserStores();
          // Load analytics queue for this user
          await analyticsQueue.load(serverIdStr);
          // Load calendar event prompts for this user
          await loadCalendarPrompts();
          console.log('[UUIDContext] All stores rehydrated for user:', serverIdStr);
        }).catch(err => {
          console.error('[UUIDContext] Failed to set active user:', err);
        });
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
  }, [hasToken, isSuccess, isError, data, error, uuid, loadCalendarPrompts]);

  return (
    <UUIDContext.Provider value={{uuid, setUUID, isInitialized}}>
      {children}
    </UUIDContext.Provider>
  );
};

export const useUUID = () => useContext(UUIDContext).uuid;
export const useSetUUID = () => useContext(UUIDContext).setUUID;
export const useUUIDInitialized = () => useContext(UUIDContext).isInitialized;
