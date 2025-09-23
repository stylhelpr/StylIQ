// src/context/ThemeContext.tsx
import React, {createContext, useContext, useState} from 'react';
<<<<<<< HEAD
import {theme as themes} from '../styles/tokens/theme';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeType;
  theme: typeof themes.light;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  theme: themes.light,
  toggleTheme: () => {},
=======
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
  mode: 'fashion1',
  theme: allThemes['fashion1'],
  toggleTheme: () => {},
  setSkin: () => {},
>>>>>>> 9-22-25-chore-mg3
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
<<<<<<< HEAD
  const [mode, setMode] = useState<ThemeType>('light');

  const toggleTheme = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{mode, theme: themes[mode], toggleTheme}}>
=======
  const [mode, setMode] = useState<ThemeType>('fashion1');

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
>>>>>>> 9-22-25-chore-mg3
      {children}
    </ThemeContext.Provider>
  );
};
<<<<<<< HEAD
=======

export type Theme = ThemeShape;

////////////////

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
//   mode: 'modernDark',
//   theme: allThemes['modernDark'],
//   toggleTheme: () => {},
//   setSkin: () => {},
// });

// export const useAppTheme = () => useContext(ThemeContext);

// export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
//   children,
// }) => {
//   const [mode, setMode] = useState<ThemeType>('modernDark');

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
>>>>>>> 9-22-25-chore-mg3
