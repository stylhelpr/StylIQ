// src/theme/breakpoints.ts
// -----------------------------------------------------------------------------
// 🔹 Purpose:
// Defines the **screen width breakpoints** used throughout your design system.
//
// These breakpoints act as semantic “device class” boundaries, letting you
// adapt layout and typography based on screen size (via useResponsive()).
//
// Instead of guessing pixel widths in every file, all responsive logic
// refers to these constants for clarity and consistency.
// -----------------------------------------------------------------------------

export const BREAKPOINTS = {
  // ---------------------------------------------------------------------------
  // 📱 Mobile Breakpoints
  // ---------------------------------------------------------------------------
  XS: 0, // ultra-small phones (iPhone SE, older Android minis)
  SM: 360, // small phones (budget Androids, compact iPhones)
  MD: 390, // standard iPhone size (iPhone 13/14 baseline)
  LG: 430, // large phones (iPhone Pro Max, Pixel XL, etc.)

  // ---------------------------------------------------------------------------
  // 💻 Tablet / Desktop Breakpoints
  // ---------------------------------------------------------------------------
  XL: 600, // foldables and small tablets (Galaxy Fold, iPad Mini)
  XXL: 768, // standard iPads / larger tablets
  DESKTOP: 1024, // laptop-sized or large-screen tablets in landscape mode
} as const;

//////////////////

// // src/theme/breakpoints.ts
// export const BREAKPOINTS = {
//   XS: 0, // ultra-small phones (SE, older Android minis)
//   SM: 360, // small phones
//   MD: 390, // mainstream iPhones
//   LG: 430, // Pro Max / large phones
//   XL: 600, // foldables / small tablets
//   XXL: 768, // iPads / larger tablets
//   DESKTOP: 1024,
// } as const;
