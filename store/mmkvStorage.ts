import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';
import { getActiveUserIdSync } from '../apps/frontend/src/storage/activeUserManager';

// Base MMKV instance (device-level, for non-user data)
export const mmkvStorage = new MMKV({
  id: 'styliq-device-store',
  encryptionKey: 'styliq-secure-key-v1', // Basic encryption for local data
});

// Cache of user-specific MMKV instances
const userMMKVInstances: Map<string, MMKV> = new Map();

/**
 * Get or create a user-specific MMKV instance
 * Each user gets their own encrypted MMKV storage
 */
export function getUserMMKV(userId: string): MMKV {
  if (!userMMKVInstances.has(userId)) {
    const instance = new MMKV({
      id: `styliq-user-${userId}`,
      encryptionKey: `styliq-user-key-${userId}-v1`,
    });
    userMMKVInstances.set(userId, instance);
  }
  return userMMKVInstances.get(userId)!;
}

/**
 * Clear all MMKV data for a specific user (Remove Account from Device)
 */
export function clearUserMMKVStorage(userId: string): void {
  const userInstance = userMMKVInstances.get(userId);
  if (userInstance) {
    userInstance.clearAll();
    userMMKVInstances.delete(userId);
  }
  // Also try to clear directly in case it was created elsewhere
  try {
    const directInstance = new MMKV({
      id: `styliq-user-${userId}`,
      encryptionKey: `styliq-user-key-${userId}-v1`,
    });
    directInstance.clearAll();
  } catch (err) {
    console.warn('[MMKV] Failed to clear user storage:', err);
  }
}

/**
 * Create a user-scoped MMKV storage adapter for Zustand
 * The storage key is automatically scoped to the active user
 */
export function createUserScopedMMKVStorage(baseKey: string): StateStorage {
  return {
    getItem: (name: string): string | null => {
      const userId = getActiveUserIdSync();
      if (!userId) {
        console.log(`[MMKV] No active user for getItem(${baseKey})`);
        return null;
      }
      try {
        const userMMKV = getUserMMKV(userId);
        const value = userMMKV.getString(baseKey);
        return value ?? null;
      } catch (error) {
        console.error('[MMKV] getItem error:', error);
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      const userId = getActiveUserIdSync();
      if (!userId) {
        console.log(`[MMKV] No active user for setItem(${baseKey})`);
        return;
      }
      try {
        const userMMKV = getUserMMKV(userId);
        userMMKV.set(baseKey, value);
      } catch (error) {
        console.error('[MMKV] setItem error:', error);
      }
    },
    removeItem: (name: string): void => {
      const userId = getActiveUserIdSync();
      if (!userId) {
        console.log(`[MMKV] No active user for removeItem(${baseKey})`);
        return;
      }
      try {
        const userMMKV = getUserMMKV(userId);
        userMMKV.delete(baseKey);
      } catch (error) {
        console.error('[MMKV] removeItem error:', error);
      }
    },
  };
}

// Legacy Zustand-compatible storage adapter (device-level, not user-scoped)
export const zustandMMKVStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      const value = mmkvStorage.getString(name);
      return value ?? null;
    } catch (error) {
      console.error('[MMKV] getItem error:', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      mmkvStorage.set(name, value);
    } catch (error) {
      console.error('[MMKV] setItem error:', error);
    }
  },
  removeItem: (name: string): void => {
    try {
      mmkvStorage.delete(name);
    } catch (error) {
      console.error('[MMKV] removeItem error:', error);
    }
  },
};

// Utility to get storage size info for a user
export const getStorageInfo = (userId?: string): { keys: number; sizeEstimate: string } => {
  const storage = userId ? getUserMMKV(userId) : mmkvStorage;
  const keys = storage.getAllKeys();
  let totalSize = 0;

  for (const key of keys) {
    const value = storage.getString(key);
    if (value) {
      totalSize += value.length;
    }
  }

  return {
    keys: keys.length,
    sizeEstimate: `${(totalSize / 1024).toFixed(2)} KB`,
  };
};

// Clear all device-level shopping store data (for full reset)
export const clearShoppingStorage = (): void => {
  mmkvStorage.clearAll();
};
