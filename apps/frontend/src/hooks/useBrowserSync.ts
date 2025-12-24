// apps/frontend/src/hooks/useBrowserSync.ts
import {useEffect, useRef, useCallback} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useShoppingStore} from '../../../../store/shoppingStore';
import {browserSyncService} from '../services/browserSyncService';
import {useAuth0} from 'react-native-auth0';
import {useShallow} from 'zustand/react/shallow';

/**
 * Hook to handle browser data sync on app lifecycle events
 *
 * - Syncs on initial mount (app open)
 * - Syncs when app returns to foreground
 * - Pushes pending changes when app goes to background
 */
export function useBrowserSync() {
  const {getCredentials, user} = useAuth0();
  const appState = useRef(AppState.currentState);
  const hasInitialSynced = useRef(false);
  const initialSyncSucceeded = useRef(false);

  // Use useShallow to prevent infinite re-renders from object selector
  const {
    isSyncing,
    syncError,
    lastSyncTimestamp,
    _hasHydrated,
    pendingChanges,
  } = useShoppingStore(
    useShallow(state => ({
      isSyncing: state.isSyncing,
      syncError: state.syncError,
      lastSyncTimestamp: state.lastSyncTimestamp,
      _hasHydrated: state._hasHydrated,
      pendingChanges: state.pendingChanges,
    })),
  );

  const performSync = useCallback(async () => {
    try {
      let credentials;
      try {
        credentials = await getCredentials();
      } catch {
        // Auth0 throws when no cached credentials - this is normal on cold start before login
        initialSyncSucceeded.current = false;
        return false;
      }

      if (!credentials?.accessToken) {
        initialSyncSucceeded.current = false;
        return false;
      }

      const result = await browserSyncService.sync(credentials.accessToken);
      initialSyncSucceeded.current = result;
      return result;
    } catch (error) {
      console.error('[useBrowserSync] Sync error:', error);
      initialSyncSucceeded.current = false;
      return false;
    }
  }, [getCredentials]);

  const pushPendingChanges = useCallback(async () => {
    try {
      const credentials = await getCredentials();
      if (!credentials?.accessToken) {
        return false;
      }
      return await browserSyncService.pushChanges(credentials.accessToken);
    } catch {
      return false;
    }
  }, [getCredentials]);

  // Initial sync on mount (after hydration)
  useEffect(() => {
    if (_hasHydrated && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      performSync();
    }
  }, [_hasHydrated, performSync]);

  // Retry sync when user becomes available (after login)
  // The `user` object from Auth0 changes when credentials are saved
  useEffect(() => {
    if (user && hasInitialSynced.current && !initialSyncSucceeded.current) {
      performSync();
    }
  }, [user, performSync]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        const previousState = appState.current;
        appState.current = nextAppState;

        // App came to foreground
        if (
          previousState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          await performSync();
        }

        // App going to background - push any pending changes
        if (
          previousState === 'active' &&
          nextAppState.match(/inactive|background/)
        ) {
          await pushPendingChanges();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [performSync, pushPendingChanges]);

  // Check if there are pending changes
  const hasPendingChanges =
    pendingChanges.bookmarks.length > 0 ||
    pendingChanges.deletedBookmarkUrls.length > 0 ||
    pendingChanges.history.length > 0 ||
    pendingChanges.collections.length > 0 ||
    pendingChanges.deletedCollectionIds.length > 0;

  return {
    isSyncing,
    syncError,
    lastSyncTimestamp,
    hasPendingChanges,
    sync: performSync,
    pushChanges: pushPendingChanges,
  };
}
