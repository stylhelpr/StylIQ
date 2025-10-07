// src/hooks/useResponsive.ts
import {useWindowDimensions} from 'react-native';
import {BREAKPOINTS} from '../theme/breakpoints';

export const useResponsive = () => {
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;

  const isXS = width < BREAKPOINTS.SM;
  const isSM = width >= BREAKPOINTS.SM && width < BREAKPOINTS.MD;
  const isMD = width >= BREAKPOINTS.MD && width < BREAKPOINTS.LG;
  const isLG = width >= BREAKPOINTS.LG && width < BREAKPOINTS.XL;
  const isXL = width >= BREAKPOINTS.XL && width < BREAKPOINTS.XXL;
  const isXXL = width >= BREAKPOINTS.XXL;

  return {
    width,
    height,
    isLandscape,
    isXS,
    isSM,
    isMD,
    isLG,
    isXL,
    isXXL,
    isPhone: width < BREAKPOINTS.XL,
    isTablet: width >= BREAKPOINTS.XL,
    isDesktopLike: width >= BREAKPOINTS.DESKTOP,
    breakpoint: isXXL
      ? 'XXL'
      : isXL
      ? 'XL'
      : isLG
      ? 'LG'
      : isMD
      ? 'MD'
      : isSM
      ? 'SM'
      : 'XS',
  };
};
