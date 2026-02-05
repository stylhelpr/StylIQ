import {useEffect, useState} from 'react';
import {UserScopedStorage} from '../storage/userScopedStorage';
import {WardrobeItem} from '../types/wardrobe';

const STORAGE_KEY = 'savedOutfits';

export type SavedOutfit = {
  name: string;
  items: WardrobeItem[];
  favorited: boolean;
};

/**
 * Hook for managing saved outfits (user-scoped)
 * @param userId - The current user's ID for scoped storage
 */
export function useSavedOutfits(userId: string | null) {
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOutfits = async () => {
      if (!userId) {
        setSavedOutfits([]);
        setLoading(false);
        return;
      }

      try {
        const data = await UserScopedStorage.getItem(userId, STORAGE_KEY);
        if (data) {
          setSavedOutfits(JSON.parse(data));
        } else {
          setSavedOutfits([]);
        }
      } catch (err) {
        console.warn('❌ Failed to load saved outfits:', err);
        setSavedOutfits([]);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadOutfits();
  }, [userId]);

  const saveToStorage = async (outfits: SavedOutfit[]) => {
    if (!userId) {
      console.warn('[useSavedOutfits] Cannot save without userId');
      return;
    }
    try {
      await UserScopedStorage.setItem(userId, STORAGE_KEY, JSON.stringify(outfits));
    } catch (err) {
      console.warn('❌ Failed to save outfits:', err);
    }
  };

  const saveOutfit = (items: WardrobeItem[], name: string) => {
    if (!userId) {
      console.warn('[useSavedOutfits] Cannot save outfit without userId');
      return;
    }
    const newOutfit: SavedOutfit = {
      name,
      items,
      favorited: false,
    };
    const updated = [newOutfit, ...savedOutfits];
    setSavedOutfits(updated);
    saveToStorage(updated);
  };

  const deleteOutfit = (name: string) => {
    if (!userId) {
      return;
    }
    const updated = savedOutfits.filter(o => o.name !== name);
    setSavedOutfits(updated);
    saveToStorage(updated);
  };

  const toggleFavorite = (name: string) => {
    if (!userId) {
      return;
    }
    const updated = savedOutfits.map(o =>
      o.name === name ? {...o, favorited: !o.favorited} : o,
    );
    setSavedOutfits(updated);
    saveToStorage(updated);
  };

  return {
    savedOutfits,
    saveOutfit,
    deleteOutfit,
    toggleFavorite,
    loading,
  };
}
