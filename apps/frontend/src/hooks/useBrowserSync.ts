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
 * - Re-syncs when user logs in (after logout)
 */
export function useBrowserSync() {
  const {getCredentials, user} = useAuth0();
  const appState = useRef(AppState.currentState);
  const hasInitialSynced = useRef(false);
  const initialSyncSucceeded = useRef(false);
  // Track the last user ID to detect login changes
  const lastUserId = useRef<string | null>(null);

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
    console.log('[useBrowserSync] performSync called');
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

      console.log('[useBrowserSync] Performing sync...');
      const result = await browserSyncService.sync(credentials.accessToken);
      console.log('[useBrowserSync] Sync result:', result);
      initialSyncSucceeded.current = result;
      return result;
    } catch (error) {
      // console.error('[useBrowserSync] Sync error:', error);
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

  // Re-sync when user changes (login after logout, or different user)
  // This is the KEY fix: detect when user.sub changes and force a fresh sync
  useEffect(() => {
    const currentUserId = user?.sub || null;
    const previousUserId = lastUserId.current;

    // User logged in (was null, now has value) or switched users
    if (currentUserId && currentUserId !== previousUserId) {
      // console.log('[useBrowserSync] User changed, triggering sync:', {
      //   from: previousUserId,
      //   to: currentUserId,
      // });
      lastUserId.current = currentUserId;
      // Reset sync state and force a fresh sync
      initialSyncSucceeded.current = false;

      // Add a small delay to ensure Auth0 credentials are fully available
      // This prevents race conditions where we try to sync before token is ready
      setTimeout(() => {
        // console.log('[useBrowserSync] Delayed sync after user change');
        performSync();
      }, 500);
    } else if (!currentUserId && previousUserId) {
      // User logged out - reset tracking
      // console.log('[useBrowserSync] User logged out, resetting sync state');
      lastUserId.current = null;
      initialSyncSucceeded.current = false;
    }
  }, [user?.sub, performSync]);

  // Retry sync when user becomes available (after login) - fallback
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
