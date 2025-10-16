// src/utils/scale.ts
// -----------------------------------------------------------------------------
// 🔹 Purpose:
// Provides responsive scaling utilities for spacing, layout, and UI sizing
// across different screen widths — while maintaining Apple-style visual balance.
//
// This file is the mathematical backbone of your design system:
// it ensures your paddings, margins, icons, and card dimensions look consistent
// on small phones, large phones, and tablets — without over-scaling.
//
// 🔹 Design Philosophy:
// - Uses a baseline (iPhone 14 width = 390px).
// - Gently scales between 0.92x (small phones) and 1.05x (large phones).
// - Fonts are *never* automatically scaled — this mimics Apple’s fixed-type tiers.
// -----------------------------------------------------------------------------

import {Dimensions, PixelRatio} from 'react-native';

// -----------------------------------------------------------------------------
// 🧭 Get current screen width for scaling calculations
// -----------------------------------------------------------------------------
const {width: SCREEN_WIDTH} = Dimensions.get('window');

// -----------------------------------------------------------------------------
// 📏 Constants: define the reference device and scaling limits
// -----------------------------------------------------------------------------
const BASE_WIDTH = 390; // iPhone 14 baseline device width
const MIN_SCALE = 0.92; // prevent UI from shrinking too much on small devices
const MAX_SCALE = 1.05; // prevent UI from blowing up on large phones

// Compute the raw ratio between the device width and the base width
const rawFactor = SCREEN_WIDTH / BASE_WIDTH;

// Clamp the scaling factor between defined min/max bounds
const scaleFactor = Math.max(MIN_SCALE, Math.min(rawFactor, MAX_SCALE));

// -----------------------------------------------------------------------------
// 📐 1️⃣ scale(size)
// Simple linear scaling for absolute values (used for spacing, icons, etc.).
// Example: `scale(16)` → automatically adjusts based on device width.
// -----------------------------------------------------------------------------
export const scale = (size: number) => size * scaleFactor;

// -----------------------------------------------------------------------------
// 📏 2️⃣ moderateScale(size, factor)
// A gentler version of `scale()` — blends the original and scaled values
// for more subtle adjustments (good for paddings, radii, thumbnails).
//
// - `factor` (default 0.5) controls the intensity of scaling.
//   factor = 0.0 → no scaling
//   factor = 1.0 → full scale
// -----------------------------------------------------------------------------
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// -----------------------------------------------------------------------------
// 🔤 3️⃣ fontScale(size)
// Fonts never scale with device width to maintain design consistency.
// Instead, we round to the pixel grid for crisp text rendering.
// Let users rely on Accessibility settings for larger text.
// -----------------------------------------------------------------------------
export const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(size));

// -----------------------------------------------------------------------------
// 🧵 4️⃣ hairline
// Returns a hairline border width that adapts to the device’s pixel density.
// Example: on high-density screens (≥3x), use 0.5px lines for finer detail.
// -----------------------------------------------------------------------------
export const hairline = Math.max(1, PixelRatio.get()) >= 3 ? 0.5 : 1;

/////////////////

// // src/utils/scale.ts
// import {Dimensions, PixelRatio} from 'react-native';

// const {width: SCREEN_WIDTH} = Dimensions.get('window');
// const BASE_WIDTH = 390; // iPhone 14 baseline
// const MIN_SCALE = 0.92; // never shrink UI too much
// const MAX_SCALE = 1.05; // never bloat UI on big phones
// const rawFactor = SCREEN_WIDTH / BASE_WIDTH;
// const scaleFactor = Math.max(MIN_SCALE, Math.min(rawFactor, MAX_SCALE));

// // ✅ Spacing / sizes scale (NOT fonts)
// export const scale = (size: number) => size * scaleFactor;

// // Gentler scaler for paddings, margins, radii, icons, thumbnails
// export const moderateScale = (size: number, factor = 0.5) =>
//   size + (scale(size) - size) * factor;

// // ✅ Fonts DO NOT scale with screen width (Apple-style consistency)
// // (We still round to pixel grid; let user Accessibility font scaling apply naturally.)
// export const fontScale = (size: number) =>
//   Math.round(PixelRatio.roundToNearestPixel(size));

// // Optional: hairline that respects density
// export const hairline = Math.max(1, PixelRatio.get()) >= 3 ? 0.5 : 1;
