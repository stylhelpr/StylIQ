// src/theme/responsiveTheme.ts
import {useResponsive} from '../hooks/useResponsive';
import {moderateScale, fontScale} from '../utils/scale';

// Central, reusable responsive tokens used across screens/components.
export const useResponsiveTheme = () => {
  const bp = useResponsive();

  // Spacing scales gently across devices
  const spacing = {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
  };

  // Icon sizes (scale gently)
  const icon = {
    sm: moderateScale(18),
    md: moderateScale(22),
    lg: moderateScale(26),
    xl: moderateScale(32),
  };

  // Radii (scaled for visual consistency)
  const radii = {
    sm: moderateScale(8),
    md: moderateScale(12),
    lg: moderateScale(16),
    xl: moderateScale(20),
  };

  // Apple-grade typography: fixed per size; optional tiny bump on tablets only
  const bump = bp.isTablet ? 0 : 0; // set to 1 or 2 if you ever want tablet-only bump
  const typography = {
    caption: fontScale(12 + bump),
    small: fontScale(14 + bump),
    body: fontScale(16 + bump),
    title: fontScale(20 + bump),
    heading: fontScale(24 + bump),
    display: fontScale(32 + bump),
  };

  // Container widths by device class
  const layout = {
    containerWidth: bp.isXS
      ? 320
      : bp.isSM
      ? 360
      : bp.isMD
      ? 390
      : bp.isLG
      ? 430
      : bp.isXL
      ? 600
      : 768,
  };

  return {
    spacing,
    icon,
    radii,
    typography,
    layout,
    ...bp, // expose breakpoint flags if needed (isXS, isTablet, etc.)
  };
};
