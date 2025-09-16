// src/styles/useGlobalStyles.ts
import {useAppTheme} from '../context/ThemeContext';
import {createGlobalStyles} from './global';

export const useGlobalStyles = () => {
  const {theme} = useAppTheme();
  return createGlobalStyles(theme);
};
