// theme.ts
import { tokens } from "styles/tokens";

export const theme = {
  light: {
    colors: {
      primary: '#000000',
      secondary: '#202124',
      background: '#fdfdfd',
      foreground: '#1C1C1C',
      foreground2: '#707070',
      header: '#D9D9D9',
      muted: '#EAEAEA',
      input: '#EAEAEA',
      surface: '#EAEAEA',
      surfaceBorder: '#D1D5DB',
      inputBorder: '#6a6a6a',
      accents: '#676769',
      separator: '#676769',
      error: '#FF6B6B',
      success: '#4CAF50',
      warning: '#FFC107',
      frostedGlass: 'rgba(38, 38, 38, 0.2)',
      skeletonLoader: '#e6e3e3',
    },
    ...tokens,
    shadows: {
      ...tokens.shadows,
      background: '0px 4px 8px rgba(0, 0, 0, 0.2), 0px 8px 16px rgba(0, 0, 0, 0.1)',
    },
  },
  dark: {
    colors: {
      primary: '#F1F1F1',
      secondary: '#B0B0B0',
      background: '#1b1b1b',
      foreground: '#f0eff1',
      foreground2: '#ededed',
      header: '#1E1E1E',
      muted: '#757575',
      input: '#EAEAEA',
      surface: '#282828',
      surfaceBorder: '#D1D5DB',
      inputBorder: '#676769',
      accents: '#676769',
      separator: '#434343',
      error: '#FF6B6B',
      success: '#4CAF50',
      warning: '#FFC107',
      frostedGlass: 'rgba(255, 255, 255, 0.15)',
      skeletonLoader: '#e6e3e3',
    },
    ...tokens,
    shadows: {
      ...tokens.shadows,
      background: '0px 4px 8px rgba(0, 0, 0, 0.6), 0px 8px 16px rgba(0, 0, 0, 0.4)',
    },
  },
};