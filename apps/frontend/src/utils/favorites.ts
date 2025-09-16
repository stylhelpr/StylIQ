import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favoriteOutfits';

export const saveFavoriteOutfit = async (outfit: any) => {
  try {
    const existing = await AsyncStorage.getItem(FAVORITES_KEY);
    const favorites = existing ? JSON.parse(existing) : [];
    favorites.push(outfit);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('Failed to save favorite outfit:', err);
  }
};

export const getFavoriteOutfits = async () => {
  try {
    const saved = await AsyncStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Failed to load favorite outfits:', err);
    return [];
  }
};
