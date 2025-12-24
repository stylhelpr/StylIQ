import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

// Create MMKV instance
export const mmkvStorage = new MMKV({
  id: 'styliq-shopping-store',
  encryptionKey: 'styliq-secure-key-v1', // Basic encryption for local data
});

// Zustand-compatible storage adapter
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

// Utility to get storage size info
export const getStorageInfo = (): { keys: number; sizeEstimate: string } => {
  const keys = mmkvStorage.getAllKeys();
  let totalSize = 0;

  for (const key of keys) {
    const value = mmkvStorage.getString(key);
    if (value) {
      totalSize += value.length;
    }
  }

  return {
    keys: keys.length,
    sizeEstimate: `${(totalSize / 1024).toFixed(2)} KB`,
  };
};

// Clear all shopping store data (for logout)
export const clearShoppingStorage = (): void => {
  mmkvStorage.clearAll();
};
