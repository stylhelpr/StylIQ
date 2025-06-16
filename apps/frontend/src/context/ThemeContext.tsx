// src/context/ThemeContext.tsx
import React, {createContext, useContext, useState} from 'react';
import {skins} from '../styles/skins';

export const allThemes = {
  ...skins, // ✅ Only using skins now
};

export type ThemeType = keyof typeof allThemes;
type ThemeShape = (typeof allThemes)[ThemeType];

interface ThemeContextType {
  mode: ThemeType;
  theme: ThemeShape;
  toggleTheme: () => void;
  setSkin: (skin: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'modernDark', // ✅ set your default here
  theme: allThemes['modernDark'],
  toggleTheme: () => {},
  setSkin: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeType>('modernDark'); // ✅ default to modernDark

  const toggleTheme = () => {
    setMode(prev => (prev === 'modernDark' ? 'modernLight' : 'modernDark'));
  };

  const setSkin = (skin: ThemeType) => {
    setMode(skin);
  };

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
