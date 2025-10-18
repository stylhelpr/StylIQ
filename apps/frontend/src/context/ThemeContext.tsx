// src/context/ThemeContext.tsx
import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {skins} from '../styles/skins';

export const allThemes = {...skins};
export type ThemeType = keyof typeof allThemes;
type ThemeShape = (typeof allThemes)[ThemeType];

interface ThemeContextType {
  mode: ThemeType;
  theme: Theme;
  toggleTheme: () => void;
  setSkin: (skin: ThemeType) => void;
}

const STORAGE_KEY = 'app_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'fashion1',
  theme: allThemes['fashion1'] as Theme,
  toggleTheme: () => {},
  setSkin: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeType>('fashion1');
  const [isLoaded, setIsLoaded] = useState(false);

  // 🪄 Load saved theme on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && stored in allThemes) {
          setMode(stored as ThemeType);
        }
      } catch (e) {
        console.warn('Failed to load theme from storage:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // 💾 Save theme whenever it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, mode).catch(err =>
        console.warn('Failed to save theme:', err),
      );
    }
  }, [mode, isLoaded]);

  const toggleTheme = () => {
    setMode(prev => (prev === 'modernDark' ? 'modernLight' : 'modernDark'));
  };

  const setSkin = (skin: ThemeType) => {
    setMode(skin);
  };

  // 🧩 Avoid flicker before loading saved theme
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme: allThemes[mode] as Theme,
        toggleTheme,
        setSkin,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * ✅ Extended Theme type
 * This extends the inferred type from skins.ts so we can safely
 * use optional gradient keys across the app without TypeScript errors.
 */
export type Theme = ThemeShape & {
  colors: ThemeShape['colors'] & {
    // 🌈 Optional gradient keys
    surfaceGradientStart?: string;
    surfaceGradientEnd?: string;
    buttonGradientStart?: string;
    buttonGradientEnd?: string;
  };
};
