// context/UUIDContext.tsx
// MULTI-ACCOUNT: Integrates with activeUserManager for user-scoped storage
// CRITICAL: User identity is determined ONLY by auth0_sub from JWT, never by cached IDs

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
  clearCacheForValidation,
} from '../storage/activeUserManager';
import {rehydrateAllUserStores} from '../../../../store/userScopedZustandStorage';
import {analyticsQueue} from '../services/analyticsQueue';
import {useCalendarEventPromptStore} from '../../../../store/calendarEventPromptStore';
import {queryClient} from '../lib/queryClient';

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

  // 1) Check for token on mount - DO NOT trust cached user IDs until server validates
  useEffect(() => {
    const init = async () => {
      // Initialize active user manager (for storage scoping)
      await initializeActiveUser();

      // CRITICAL: Clear ALL React Query cache on app start
      // This ensures ALL cached user data (profile, wardrobe, etc.) is cleared
      // and prevents returning cached data from a previous user session
      // Multiple queries cache user data: ['userProfile', id], ['user-profile', id], etc.
      queryClient.clear();

      try {
        const token = await getAccessToken();
        if (token) {
          // CRITICAL: Clear the in-memory cache BEFORE triggering server validation
          // This ensures getActiveUserIdSync() returns null during the validation window,
          // preventing any storage operations from using a stale (wrong) user ID.
          // The cache will be repopulated with the CORRECT user ID when setActiveUserId()
          // is called after /auth/profile returns.
          clearCacheForValidation();

          // We have a token - let /auth/profile determine the correct user
          // DO NOT set UUID from cache here - wait for server response
          setHasToken(true);
        } else {
          // No token means user is not authenticated
          // DO NOT load cached user_id - that could be a different user's ID
          // The user needs to log in to establish identity
          setIsInitialized(true);
        }
      } catch {
        // Error getting token - user is not authenticated
        // DO NOT load cached user_id - that could be a different user's ID
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  // 2) Use TanStack Query to fetch auth profile (only when we have a token)
  const {data, isSuccess, isError, error} = useAuthProfile(hasToken);

  // 3) Process auth profile response - this is the AUTHORITATIVE source of user identity
  useEffect(() => {
    if (!hasToken) return;

    if (isSuccess) {
      const serverId = data?.id ?? data?.uuid ?? null;
      if (serverId) {
        const serverIdStr = String(serverId);

        // INVARIANT CHECK: Detect user switch and log for debugging
        AsyncStorage.getItem('user_id').then(cachedId => {
          if (cachedId && cachedId !== serverIdStr) {
            console.warn('[UUIDContext] USER SWITCH DETECTED:', {
              cachedUserId: cachedId,
              serverUserId: serverIdStr,
              action: 'Overwriting cached ID with server-provided ID (derived from auth0_sub)',
            });
          }
          console.log('[UUIDContext] Server returned user ID:', serverIdStr, cachedId ? `(was: ${cachedId})` : '(no cached ID)');
        }).catch(() => {});

        // CRITICAL: Always use server-provided ID - it's derived from JWT auth0_sub
        // This is the ONLY authoritative source of user identity
        setUUIDState(serverIdStr);
        AsyncStorage.setItem('user_id', serverIdStr).catch(() => {});

        // MULTI-ACCOUNT: Set active user and rehydrate stores
        // This ensures stores load from the correct user-scoped key
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
      } else {
        console.error('[UUIDContext] Server returned no user ID - auth0_sub lookup failed');
      }
      setIsInitialized(true);
    }

    if (isError) {
      console.log(
        '⚠️ /auth/profile check failed:',
        (error as any)?.response?.data || (error as any)?.message,
      );
      setIsInitialized(true);
    }
  }, [hasToken, isSuccess, isError, data, error, loadCalendarPrompts]);

  return (
    <UUIDContext.Provider value={{uuid, setUUID, isInitialized}}>
      {children}
    </UUIDContext.Provider>
  );
};

export const useUUID = () => useContext(UUIDContext).uuid;
export const useSetUUID = () => useContext(UUIDContext).setUUID;
export const useUUIDInitialized = () => useContext(UUIDContext).isInitialized;
