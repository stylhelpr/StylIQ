// src/hooks/useResponsive.ts
// -------------------------------------------------------------
// 🔹 Purpose:
// This hook detects the current device width, height, and orientation,
// then determines which breakpoint range the device belongs to.
// It returns convenient flags (isPhone, isTablet, etc.) that allow
// any component or style system to adapt layout and typography responsively.
//
// 🔹 Used by:
// - useResponsiveTheme.ts (for scaling layout + typography)
// - useGlobalTypography.ts (to adjust text tiers by device class)
// - createGlobalStyles.ts (to apply breakpoint-aware global styling)
// -------------------------------------------------------------

import {useWindowDimensions} from 'react-native';
import {BREAKPOINTS} from '../theme/breakpoints';

export const useResponsive = () => {
  // 🪟 Dynamically get the device's current screen width and height.
  // This hook re-runs automatically when orientation changes.
  const {width, height} = useWindowDimensions();

  // 🔄 Check if the screen is in landscape mode.
  const isLandscape = width > height;

  // 📱 Determine which breakpoint range the device width falls into.
  const isXS = width < BREAKPOINTS.SM; // ultra-small phones (e.g., iPhone SE)
  const isSM = width >= BREAKPOINTS.SM && width < BREAKPOINTS.MD; // small phones
  const isMD = width >= BREAKPOINTS.MD && width < BREAKPOINTS.LG; // normal iPhones
  const isLG = width >= BREAKPOINTS.LG && width < BREAKPOINTS.XL; // large phones / Pro Max
  const isXL = width >= BREAKPOINTS.XL && width < BREAKPOINTS.XXL; // foldables / small tablets
  const isXXL = width >= BREAKPOINTS.XXL; // large tablets or iPads

  // ✅ Return all responsive flags and metadata for use anywhere in the app.
  return {
    // Current dimensions
    width,
    height,

    // Orientation
    isLandscape,

    // Breakpoint booleans
    isXS,
    isSM,
    isMD,
    isLG,
    isXL,
    isXXL,

    // Simplified categories for convenience
    isPhone: width < BREAKPOINTS.XL, // any device smaller than a small tablet
    isTablet: width >= BREAKPOINTS.XL, // tablet and above
    isDesktopLike: width >= BREAKPOINTS.DESKTOP, // iPads or external displays

    // 🔠 Readable breakpoint label (string)
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

//////////////////

// // src/hooks/useResponsive.ts
// import {useWindowDimensions} from 'react-native';
// import {BREAKPOINTS} from '../theme/breakpoints';

// export const useResponsive = () => {
//   const {width, height} = useWindowDimensions();
//   const isLandscape = width > height;

//   const isXS = width < BREAKPOINTS.SM;
//   const isSM = width >= BREAKPOINTS.SM && width < BREAKPOINTS.MD;
//   const isMD = width >= BREAKPOINTS.MD && width < BREAKPOINTS.LG;
//   const isLG = width >= BREAKPOINTS.LG && width < BREAKPOINTS.XL;
//   const isXL = width >= BREAKPOINTS.XL && width < BREAKPOINTS.XXL;
//   const isXXL = width >= BREAKPOINTS.XXL;

//   return {
//     width,
//     height,
//     isLandscape,
//     isXS,
//     isSM,
//     isMD,
//     isLG,
//     isXL,
//     isXXL,
//     isPhone: width < BREAKPOINTS.XL,
//     isTablet: width >= BREAKPOINTS.XL,
//     isDesktopLike: width >= BREAKPOINTS.DESKTOP,
//     breakpoint: isXXL
//       ? 'XXL'
//       : isXL
//       ? 'XL'
//       : isLG
//       ? 'LG'
//       : isMD
//       ? 'MD'
//       : isSM
//       ? 'SM'
//       : 'XS',
//   };
// };
