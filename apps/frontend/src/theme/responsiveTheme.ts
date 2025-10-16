// src/theme/responsiveTheme.ts
// -----------------------------------------------------------------------------
// 🔹 Purpose:
// Provides a **centralized responsive theme hook** that translates device
// breakpoints and scaling math into practical, ready-to-use design tokens.
//
// It’s the “glue” layer that connects your `useResponsive` breakpoint detection,
// `scale.ts` math utilities, and your design tokens (`tokens.ts`).
//
// The result is a unified theme object you can use anywhere in your UI
// (spacing, typography, icon sizes, and layout widths) that automatically adapts
// to phone, tablet, or large-screen form factors.
//
// Example usage:
// const { spacing, typography, isTablet } = useResponsiveTheme();
// -----------------------------------------------------------------------------

import {useResponsive} from '../hooks/useResponsive';
import {moderateScale, fontScale} from '../utils/scale';

// -----------------------------------------------------------------------------
// 🧭 useResponsiveTheme()
// Returns a dynamic theme object that updates automatically with screen size.
// -----------------------------------------------------------------------------
export const useResponsiveTheme = () => {
  // 👇 Get breakpoint flags and screen dimensions
  const bp = useResponsive(); // width, height, isTablet, isXL, etc.

  // ---------------------------------------------------------------------------
  // 📏 Spacing
  // Margins and paddings that scale gently between device sizes.
  // moderateScale() ensures subtle visual balance (not aggressive scaling).
  // ---------------------------------------------------------------------------
  const spacing = {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
  };

  // ---------------------------------------------------------------------------
  // 🧩 Icon Sizes
  // Scales icons gently across devices for consistent proportion and touch target.
  // ---------------------------------------------------------------------------
  const icon = {
    sm: moderateScale(18),
    md: moderateScale(22),
    lg: moderateScale(26),
    xl: moderateScale(32),
  };

  // ---------------------------------------------------------------------------
  // 🟢 Corner Radii
  // Ensures border radii maintain visual balance as components scale.
  // ---------------------------------------------------------------------------
  const radii = {
    sm: moderateScale(8),
    md: moderateScale(12),
    lg: moderateScale(16),
    xl: moderateScale(20),
  };

  // ---------------------------------------------------------------------------
  // 🔤 Typography
  // Apple-style typography: fixed sizes that don’t scale by screen width.
  // You can add a “bump” for tablets (e.g., +1 or +2 pt) if desired.
  // ---------------------------------------------------------------------------
  const bump = bp.isTablet ? 0 : 0; // Optional: tablet-only font increase
  const typography = {
    caption: fontScale(12 + bump),
    small: fontScale(14 + bump),
    body: fontScale(16 + bump),
    title: fontScale(20 + bump),
    heading: fontScale(24 + bump),
    display: fontScale(32 + bump),
  };

  // ---------------------------------------------------------------------------
  // 🧱 Layout Widths
  // Defines max container widths per device class — mirrors Apple’s adaptive grid.
  // Ensures centered sections don’t become too wide on large screens.
  // ---------------------------------------------------------------------------
  const layout = {
    containerWidth: bp.isXS
      ? 320 // iPhone SE, mini devices
      : bp.isSM
      ? 360 // small phones
      : bp.isMD
      ? 390 // mainstream iPhones
      : bp.isLG
      ? 430 // iPhone Pro Max / large phones
      : bp.isXL
      ? 600 // small tablets / foldables
      : 768, // iPads / larger tablets
  };

  // ---------------------------------------------------------------------------
  // 🎁 Return Unified Theme
  // Includes all responsive scales plus breakpoint flags.
  // Consumers can destructure: { spacing, typography, isTablet, ... }
  // ---------------------------------------------------------------------------
  return {
    spacing,
    icon,
    radii,
    typography,
    layout,
    ...bp, // adds width, height, isTablet, isXL, etc.
  };
};

/////////////////////

// // src/theme/responsiveTheme.ts
// import {useResponsive} from '../hooks/useResponsive';
// import {moderateScale, fontScale} from '../utils/scale';

// // Central, reusable responsive tokens used across screens/components.
// export const useResponsiveTheme = () => {
//   const bp = useResponsive();

//   // Spacing scales gently across devices
//   const spacing = {
//     xs: moderateScale(4),
//     sm: moderateScale(8),
//     md: moderateScale(16),
//     lg: moderateScale(24),
//     xl: moderateScale(32),
//     xxl: moderateScale(48),
//   };

//   // Icon sizes (scale gently)
//   const icon = {
//     sm: moderateScale(18),
//     md: moderateScale(22),
//     lg: moderateScale(26),
//     xl: moderateScale(32),
//   };

//   // Radii (scaled for visual consistency)
//   const radii = {
//     sm: moderateScale(8),
//     md: moderateScale(12),
//     lg: moderateScale(16),
//     xl: moderateScale(20),
//   };

//   // Apple-grade typography: fixed per size; optional tiny bump on tablets only
//   const bump = bp.isTablet ? 0 : 0; // set to 1 or 2 if you ever want tablet-only bump
//   const typography = {
//     caption: fontScale(12 + bump),
//     small: fontScale(14 + bump),
//     body: fontScale(16 + bump),
//     title: fontScale(20 + bump),
//     heading: fontScale(24 + bump),
//     display: fontScale(32 + bump),
//   };

//   // Container widths by device class
//   const layout = {
//     containerWidth: bp.isXS
//       ? 320
//       : bp.isSM
//       ? 360
//       : bp.isMD
//       ? 390
//       : bp.isLG
//       ? 430
//       : bp.isXL
//       ? 600
//       : 768,
//   };

//   return {
//     spacing,
//     icon,
//     radii,
//     typography,
//     layout,
//     ...bp, // expose breakpoint flags if needed (isXS, isTablet, etc.)
//   };
// };
