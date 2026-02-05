/**
 * User-Scoped Zustand Storage Adapter
 *
 * This adapter allows Zustand stores with persist middleware to use
 * user-scoped storage keys. The key changes based on the active user.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StateStorage} from 'zustand/middleware';
import {getActiveUserIdSync} from '../apps/frontend/src/storage/activeUserManager';
import {getUserKey} from '../apps/frontend/src/storage/userScopedStorage';

/**
 * Create a user-scoped storage adapter for Zustand persist middleware
 *
 * @param baseKey - The base storage key (e.g., 'shopping-store')
 * @returns StateStorage compatible adapter
 */
export function createUserScopedZustandStorage(baseKey: string): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      // Use SYNC version to avoid race conditions during logout
      // The cache is immediately updated when clearActiveUser() is called
      const userId = getActiveUserIdSync();
      if (!userId) {
        console.log(`[UserScopedZustandStorage] No active user for getItem(${baseKey})`);
        return null;
      }
      const scopedKey = getUserKey(userId, baseKey);
      try {
        const value = await AsyncStorage.getItem(scopedKey);
        console.log(`[UserScopedZustandStorage] getItem(${scopedKey}): ${value ? `found (${value.length} bytes)` : 'null'}`);
        return value;
      } catch (err) {
        console.error(`[UserScopedZustandStorage] getItem error:`, err);
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      // Use SYNC version to avoid race conditions during logout
      // The cache is immediately updated when clearActiveUser() is called
      const userId = getActiveUserIdSync();
      if (!userId) {
        console.log(`[UserScopedZustandStorage] No active user for setItem(${baseKey}) - SKIPPING WRITE`);
        return;
      }
      const scopedKey = getUserKey(userId, baseKey);
      try {
        await AsyncStorage.setItem(scopedKey, value);
        console.log(`[UserScopedZustandStorage] setItem(${scopedKey}): ${value.length} bytes`);
      } catch (err) {
        console.error(`[UserScopedZustandStorage] setItem error:`, err);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      // Use SYNC version to avoid race conditions during logout
      const userId = getActiveUserIdSync();
      if (!userId) {
        console.log(`[UserScopedZustandStorage] No active user for removeItem(${baseKey})`);
        return;
      }
      const scopedKey = getUserKey(userId, baseKey);
      try {
        await AsyncStorage.removeItem(scopedKey);
        console.log(`[UserScopedZustandStorage] removeItem(${scopedKey})`);
      } catch (err) {
        console.error(`[UserScopedZustandStorage] removeItem error:`, err);
      }
    },
  };
}

/**
 * Force rehydration of a Zustand store with persist middleware
 * Call this after user login to load the new user's data
 *
 * The persist.rehydrate() method re-reads from storage using the current
 * storage adapter, which will now read from the new user's scoped key.
 *
 * @param store - The Zustand store with persist middleware
 * @param storeName - Name of the store for logging
 */
export async function rehydrateStore(store: any, storeName: string): Promise<void> {
  if (store.persist?.rehydrate) {
    try {
      console.log(`[UserScopedZustandStorage] Rehydrating ${storeName}...`);
      // Trigger rehydration - this re-reads from storage
      // Works even when skipHydration: true was set at store creation
      await store.persist.rehydrate();

      // Log what was loaded
      const state = store.getState();
      if (storeName === 'shoppingStore') {
        console.log(`[UserScopedZustandStorage] ${storeName} rehydrated: tabs=${state.tabs?.length || 0}, bookmarks=${state.bookmarks?.length || 0}, history=${state.history?.length || 0}`);
      } else if (storeName === 'priceAlertStore') {
        console.log(`[UserScopedZustandStorage] ${storeName} rehydrated: alerts=${state.alerts?.length || 0}`);
      } else {
        console.log(`[UserScopedZustandStorage] ${storeName} rehydrated successfully`);
      }
    } catch (err) {
      console.error(`[UserScopedZustandStorage] ${storeName} rehydration failed:`, err);
    }
  } else {
    console.warn(`[UserScopedZustandStorage] ${storeName} has no persist.rehydrate method`);
  }
}

/**
 * Rehydrate all user-scoped Zustand stores after login
 * Import and call this from UUIDContext after setting active user
 */
export async function rehydrateAllUserStores(): Promise<void> {
  console.log('[UserScopedZustandStorage] Starting rehydration of all stores...');

  // Import stores dynamically to avoid circular dependencies
  const {useShoppingStore} = await import('./shoppingStore');
  const {usePriceAlertStore} = await import('./priceAlertStore');

  // Rehydrate Zustand persist stores sequentially
  await rehydrateStore(useShoppingStore, 'shoppingStore');
  await rehydrateStore(usePriceAlertStore, 'priceAlertStore');

  // Note: calendarEventPromptStore doesn't use Zustand persist middleware
  // It's loaded separately via loadFromStorage() called in UUIDContext

  console.log('[UserScopedZustandStorage] All Zustand persist stores rehydrated');
}

export default createUserScopedZustandStorage;
