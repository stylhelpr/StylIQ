import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';

const STORAGE_KEY = 'savedOutfits';

export type SavedOutfit = {
  name: string;
  items: WardrobeItem[];
  favorited: boolean;
};

export function useSavedOutfits() {
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOutfits = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          setSavedOutfits(JSON.parse(data));
        }
      } catch (err) {
        console.warn('❌ Failed to load saved outfits:', err);
      } finally {
        setLoading(false);
      }
    };
    loadOutfits();
  }, []);

  const saveToStorage = async (outfits: SavedOutfit[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(outfits));
    } catch (err) {
      console.warn('❌ Failed to save outfits:', err);
    }
  };

  const saveOutfit = (items: WardrobeItem[], name: string) => {
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
    const updated = savedOutfits.filter(o => o.name !== name);
    setSavedOutfits(updated);
    saveToStorage(updated);
  };

  const toggleFavorite = (name: string) => {
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
