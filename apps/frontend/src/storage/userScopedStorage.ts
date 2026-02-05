/**
 * User-Scoped Storage
 *
 * Centralized storage wrapper that namespaces ALL user-specific data.
 * Format: user:{userId}:{key}
 *
 * This prevents data leakage between accounts on the same device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key prefixes
const USER_PREFIX = 'user:';
const DEVICE_PREFIX = 'device:';

// Keys that should be migrated from legacy (global) to user-scoped
export const LEGACY_USER_KEYS = [
  'calendarOutfits',
  'savedOutfits',
  'favoriteOutfits',
  'calendarEventPrompts',
  'analytics-queue',
  'homePrefs',
  'home_prefs_v1',
  'outfitWeights',
  'activities',
  'savedLooksOpen',
  'createdVibeOpen',
  'shoppedVibeOpen',
  'mapOpenState',
  'notifications',
  'aiStylistAutoMode',
  'aiStylist_lastSuggestion',
  'aiStylist_isExpanded',
  'outfit_feedback_logs',
  'personalityTraits',
  'preferred_brands_vocab',
  'clothingSizes',
  'occasions',
  'colorPreferences',
  'style_preferences',
  'skinTone',
  '@shopping_assistant_suggestions_disabled',
  'notificationsEnabled',
  // Zustand stores (handled separately but listed for completeness)
  'shopping-store',
  'price-alert-store',
];

/**
 * Get the scoped key for a user
 */
export function getUserKey(userId: string, key: string): string {
  return `${USER_PREFIX}${userId}:${key}`;
}

/**
 * Get a device-level key (not user-specific)
 */
export function getDeviceKey(key: string): string {
  return `${DEVICE_PREFIX}${key}`;
}

/**
 * User-scoped storage operations
 */
export const UserScopedStorage = {
  /**
   * Get an item from user-scoped storage
   */
  getItem: async (userId: string, key: string): Promise<string | null> => {
    if (!userId) {
      console.warn('[UserScopedStorage] getItem called without userId');
      return null;
    }
    const scopedKey = getUserKey(userId, key);
    return AsyncStorage.getItem(scopedKey);
  },

  /**
   * Set an item in user-scoped storage
   */
  setItem: async (userId: string, key: string, value: string): Promise<void> => {
    if (!userId) {
      console.warn('[UserScopedStorage] setItem called without userId');
      return;
    }
    const scopedKey = getUserKey(userId, key);
    await AsyncStorage.setItem(scopedKey, value);
  },

  /**
   * Remove an item from user-scoped storage
   */
  removeItem: async (userId: string, key: string): Promise<void> => {
    if (!userId) {
      console.warn('[UserScopedStorage] removeItem called without userId');
      return;
    }
    const scopedKey = getUserKey(userId, key);
    await AsyncStorage.removeItem(scopedKey);
  },

  /**
   * Get all keys for a specific user
   */
  getAllUserKeys: async (userId: string): Promise<string[]> => {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix = `${USER_PREFIX}${userId}:`;
    return allKeys.filter(key => key.startsWith(prefix));
  },

  /**
   * Clear ALL data for a specific user (Remove Account from Device)
   */
  clearUserData: async (userId: string): Promise<void> => {
    const userKeys = await UserScopedStorage.getAllUserKeys(userId);
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
      console.log(`[UserScopedStorage] Cleared ${userKeys.length} keys for user ${userId}`);
    }
  },

  /**
   * Migrate legacy (global) keys to user-scoped keys
   * Non-destructive: does NOT delete legacy keys
   */
  migrateLegacyData: async (userId: string): Promise<void> => {
    console.log(`[UserScopedStorage] Starting migration for user ${userId}`);
    let migratedCount = 0;

    for (const legacyKey of LEGACY_USER_KEYS) {
      try {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue !== null) {
          const scopedKey = getUserKey(userId, legacyKey);
          // Only migrate if scoped key doesn't already exist
          const existingScoped = await AsyncStorage.getItem(scopedKey);
          if (existingScoped === null) {
            await AsyncStorage.setItem(scopedKey, legacyValue);
            migratedCount++;
            console.log(`[UserScopedStorage] Migrated: ${legacyKey} -> ${scopedKey}`);
          }
          // DO NOT delete legacy key (rollback safety)
        }
      } catch (err) {
        console.warn(`[UserScopedStorage] Failed to migrate ${legacyKey}:`, err);
      }
    }

    // Also migrate keys with eventCalendar: prefix
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const eventCalendarKeys = allKeys.filter(k => k.startsWith('eventCalendar:'));
      for (const key of eventCalendarKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          const scopedKey = getUserKey(userId, key);
          const existingScoped = await AsyncStorage.getItem(scopedKey);
          if (existingScoped === null) {
            await AsyncStorage.setItem(scopedKey, value);
            migratedCount++;
          }
        }
      }
    } catch (err) {
      console.warn('[UserScopedStorage] Failed to migrate eventCalendar keys:', err);
    }

    console.log(`[UserScopedStorage] Migration complete. Migrated ${migratedCount} keys.`);
  },

  /**
   * Check if migration has been completed for a user
   */
  hasMigrated: async (userId: string): Promise<boolean> => {
    const migrationKey = getUserKey(userId, '_migration_complete_v1');
    const value = await AsyncStorage.getItem(migrationKey);
    return value === 'true';
  },

  /**
   * Mark migration as complete for a user
   */
  markMigrationComplete: async (userId: string): Promise<void> => {
    const migrationKey = getUserKey(userId, '_migration_complete_v1');
    await AsyncStorage.setItem(migrationKey, 'true');
  },
};

/**
 * Device-scoped storage operations (not user-specific)
 */
export const DeviceScopedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(getDeviceKey(key));
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(getDeviceKey(key), value);
  },

  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(getDeviceKey(key));
  },
};

export default UserScopedStorage;
