import {UserScopedStorage} from '../storage/userScopedStorage';

const FAVORITES_KEY = 'favoriteOutfits';

/**
 * Save a favorite outfit (user-scoped)
 */
export const saveFavoriteOutfit = async (userId: string, outfit: any) => {
  if (!userId) {
    console.warn('[favorites] saveFavoriteOutfit called without userId');
    return;
  }
  try {
    const existing = await UserScopedStorage.getItem(userId, FAVORITES_KEY);
    const favorites = existing ? JSON.parse(existing) : [];
    favorites.push(outfit);
    await UserScopedStorage.setItem(userId, FAVORITES_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('Failed to save favorite outfit:', err);
  }
};

/**
 * Get all favorite outfits (user-scoped)
 */
export const getFavoriteOutfits = async (userId: string) => {
  if (!userId) {
    console.warn('[favorites] getFavoriteOutfits called without userId');
    return [];
  }
  try {
    const saved = await UserScopedStorage.getItem(userId, FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Failed to load favorite outfits:', err);
    return [];
  }
};

/**
 * Remove a favorite outfit (user-scoped)
 */
export const removeFavoriteOutfit = async (userId: string, outfitId: string) => {
  if (!userId) {
    console.warn('[favorites] removeFavoriteOutfit called without userId');
    return;
  }
  try {
    const existing = await UserScopedStorage.getItem(userId, FAVORITES_KEY);
    const favorites = existing ? JSON.parse(existing) : [];
    const updated = favorites.filter((o: any) => o.id !== outfitId);
    await UserScopedStorage.setItem(userId, FAVORITES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove favorite outfit:', err);
  }
};

/**
 * Clear all favorite outfits (user-scoped)
 */
export const clearFavoriteOutfits = async (userId: string) => {
  if (!userId) {
    console.warn('[favorites] clearFavoriteOutfits called without userId');
    return;
  }
  try {
    await UserScopedStorage.removeItem(userId, FAVORITES_KEY);
  } catch (err) {
    console.error('Failed to clear favorite outfits:', err);
  }
};
