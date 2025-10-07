// src/utils/scale.ts
import {Dimensions, PixelRatio} from 'react-native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const BASE_WIDTH = 390; // iPhone 14 baseline
const MIN_SCALE = 0.92; // never shrink UI too much
const MAX_SCALE = 1.05; // never bloat UI on big phones
const rawFactor = SCREEN_WIDTH / BASE_WIDTH;
const scaleFactor = Math.max(MIN_SCALE, Math.min(rawFactor, MAX_SCALE));

// ✅ Spacing / sizes scale (NOT fonts)
export const scale = (size: number) => size * scaleFactor;

// Gentler scaler for paddings, margins, radii, icons, thumbnails
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// ✅ Fonts DO NOT scale with screen width (Apple-style consistency)
// (We still round to pixel grid; let user Accessibility font scaling apply naturally.)
export const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(size));

// Optional: hairline that respects density
export const hairline = Math.max(1, PixelRatio.get()) >= 3 ? 0.5 : 1;

/////////////////

// // src/utils/scale.ts
// import {Dimensions, PixelRatio} from 'react-native';

// const {width: SCREEN_WIDTH} = Dimensions.get('window');
// const BASE_WIDTH = 390; // iPhone 14 base width

// // 🔁 Scales a value based on screen width
// export const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

// // 📊 Moderate scaling (less aggressive)
// export const moderateScale = (size: number, factor = 0.5) =>
//   size + (scale(size) - size) * factor;

// // 📐 Font scaling with pixel ratio safety
// export const fontScale = (size: number) =>
//   Math.round(PixelRatio.roundToNearestPixel(moderateScale(size, 0.45)));

//////////////////

// // utils/scale.ts
// import {Dimensions} from 'react-native';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// const guidelineBaseWidth = 375;
// const guidelineBaseHeight = 812;

// export const scale = (size: number) =>
//   (SCREEN_WIDTH / guidelineBaseWidth) * size;
// export const verticalScale = (size: number) =>
//   (SCREEN_HEIGHT / guidelineBaseHeight) * size;
// export const moderateScale = (size: number, factor = 0.5) =>
//   size + (scale(size) - size) * factor;
