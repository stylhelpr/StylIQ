// src/context/ThemeContext.tsx
import React, {createContext, useContext, useState} from 'react';
import {theme as themes} from '../styles/tokens/theme';

type ThemeType = 'light' | 'dark';

type ThemeShape = (typeof themes)[keyof typeof themes];

interface ThemeContextType {
  mode: ThemeType;
  theme: ThemeShape;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  theme: themes.light,
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeType>('light');

  const toggleTheme = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{mode, theme: themes[mode], toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  );
};
