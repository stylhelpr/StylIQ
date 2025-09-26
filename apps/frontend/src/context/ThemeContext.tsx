// src/context/ThemeContext.tsx
import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {skins} from '../styles/skins';

export const allThemes = {...skins};
export type ThemeType = keyof typeof allThemes;
type ThemeShape = (typeof allThemes)[ThemeType];

interface ThemeContextType {
  mode: ThemeType;
  theme: ThemeShape;
  toggleTheme: () => void;
  setSkin: (skin: ThemeType) => void;
}

const STORAGE_KEY = 'app_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'fashion1',
  theme: allThemes['fashion1'],
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
        theme: allThemes[mode],
        toggleTheme,
        setSkin,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};

export type Theme = ThemeShape;

///////////////

// // src/context/ThemeContext.tsx
// import React, {createContext, useContext, useState} from 'react';
// import {skins} from '../styles/skins';

// export const allThemes = {
//   ...skins, // ✅ Only using skins now
// };

// export type ThemeType = keyof typeof allThemes;
// type ThemeShape = (typeof allThemes)[ThemeType];

// interface ThemeContextType {
//   mode: ThemeType;
//   theme: ThemeShape;
//   toggleTheme: () => void;
//   setSkin: (skin: ThemeType) => void;
// }

// const ThemeContext = createContext<ThemeContextType>({
//   mode: 'fashion1',
//   theme: allThemes['fashion1'],
//   toggleTheme: () => {},
//   setSkin: () => {},
// });

// export const useAppTheme = () => useContext(ThemeContext);

// export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
//   children,
// }) => {
//   const [mode, setMode] = useState<ThemeType>('fashion1');

//   const toggleTheme = () => {
//     setMode(prev => (prev === 'modernDark' ? 'modernLight' : 'modernDark'));
//   };

//   const setSkin = (skin: ThemeType) => {
//     setMode(skin);
//   };

//   return (
//     <ThemeContext.Provider
//       value={{
//         mode,
//         theme: allThemes[mode],
//         toggleTheme,
//         setSkin,
//       }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// };

// export type Theme = ThemeShape;
