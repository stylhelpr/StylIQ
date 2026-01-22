/**
 * Active User Manager
 *
 * Manages the currently active user on this device.
 * Only ONE user can be active at a time.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {UserScopedStorage} from './userScopedStorage';

const ACTIVE_USER_KEY = 'active_user_id';

// In-memory cache for sync access
let cachedActiveUserId: string | null = null;
let isInitialized = false;

// Subscribers for user change events
type UserChangeListener = (userId: string | null) => void;
const listeners: Set<UserChangeListener> = new Set();

/**
 * Initialize the active user manager
 * Call this early in app startup
 */
export async function initializeActiveUser(): Promise<string | null> {
  try {
    const userId = await AsyncStorage.getItem(ACTIVE_USER_KEY);
    cachedActiveUserId = userId;
    isInitialized = true;
    return userId;
  } catch (err) {
    console.error('[ActiveUserManager] Failed to initialize:', err);
    isInitialized = true;
    return null;
  }
}

/**
 * Get the active user ID (sync version - uses cache)
 * Returns null if no user is active or not initialized
 */
export function getActiveUserIdSync(): string | null {
  if (!isInitialized) {
    console.warn('[ActiveUserManager] Not initialized, returning null');
  }
  return cachedActiveUserId;
}

/**
 * Get the active user ID (async version - reads from storage)
 */
export async function getActiveUserId(): Promise<string | null> {
  try {
    const userId = await AsyncStorage.getItem(ACTIVE_USER_KEY);
    cachedActiveUserId = userId;
    return userId;
  } catch (err) {
    console.error('[ActiveUserManager] Failed to get active user:', err);
    return cachedActiveUserId;
  }
}

/**
 * Set the active user ID
 * This should be called after successful login
 */
export async function setActiveUserId(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_USER_KEY, userId);
    cachedActiveUserId = userId;

    // Run migration for this user if needed
    const hasMigrated = await UserScopedStorage.hasMigrated(userId);
    if (!hasMigrated) {
      await UserScopedStorage.migrateLegacyData(userId);
      await UserScopedStorage.markMigrationComplete(userId);
    }

    // Notify listeners
    listeners.forEach(listener => listener(userId));

    console.log(`[ActiveUserManager] Active user set to: ${userId}`);
  } catch (err) {
    console.error('[ActiveUserManager] Failed to set active user:', err);
    throw err;
  }
}

/**
 * Clear the active user (on logout)
 * Does NOT delete user data - just clears the active pointer
 */
export async function clearActiveUser(): Promise<void> {
  const previousUser = cachedActiveUserId;

  // CRITICAL: Clear cache FIRST before any async operations
  // This ensures getActiveUserIdSync() returns null immediately
  // Preventing any concurrent writes to the user's storage
  cachedActiveUserId = null;
  console.log(`[ActiveUserManager] Cache cleared (was: ${previousUser})`);

  try {
    await AsyncStorage.removeItem(ACTIVE_USER_KEY);

    // Notify listeners
    listeners.forEach(listener => listener(null));

    console.log(`[ActiveUserManager] Active user fully cleared`);
  } catch (err) {
    console.error('[ActiveUserManager] Failed to clear active user:', err);
    // Don't restore the cache - keep it null for safety
    throw err;
  }
}

/**
 * Subscribe to user change events
 * Returns unsubscribe function
 */
export function subscribeToUserChanges(listener: UserChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Remove an account from this device
 * Clears ALL data for the specified user and their Auth0 credentials
 */
export async function removeAccountFromDevice(
  userId: string,
  clearAuth0Credentials: () => Promise<void>,
): Promise<void> {
  console.log(`[ActiveUserManager] Removing account from device: ${userId}`);

  // Clear all user-scoped storage
  await UserScopedStorage.clearUserData(userId);

  // Clear Auth0 credentials for this user
  await clearAuth0Credentials();

  // If this was the active user, clear the pointer
  if (cachedActiveUserId === userId) {
    await clearActiveUser();
  }

  console.log(`[ActiveUserManager] Account removed from device: ${userId}`);
}

/**
 * Check if there's an active user
 */
export function hasActiveUser(): boolean {
  return cachedActiveUserId !== null;
}

export default {
  initialize: initializeActiveUser,
  getActiveUserId,
  getActiveUserIdSync,
  setActiveUserId,
  clearActiveUser,
  subscribeToUserChanges,
  removeAccountFromDevice,
  hasActiveUser,
};
