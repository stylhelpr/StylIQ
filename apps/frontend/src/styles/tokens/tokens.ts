// src/styles/tokens.ts
// -----------------------------------------------------------------------------
// 🔹 Purpose:
// Defines your universal **design tokens** — the single source of truth for
// spacing, sizing, typography, radii, borders, shadows, z-index, and animation.
//
// These tokens are the “atomic building blocks” of your design system.
// They allow you to maintain visual consistency across your app
// (React Native + Web if extended) and scale responsively via the `scale()` utility.
//
// -----------------------------------------------------------------------------
// 🔹 Key Relationships:
// - Relies on `scale()` from `src/utils/scale.ts` to gently adapt to device width.
// - Does NOT handle themes (that’s done in ThemeContext).
// - Fonts here are static by design — typography scaling happens via responsiveTheme.
// -----------------------------------------------------------------------------

import {scale} from '../../utils/scale';

// -----------------------------------------------------------------------------
// 🎨 TOKEN DEFINITIONS
// -----------------------------------------------------------------------------
export const tokens = {
  // ---------------------------------------------------------------------------
  // 📏 Spacing Tokens
  // Define all margin, padding, and gap values for layout spacing.
  // Automatically scaled via `scale()` to fit screen width gently.
  // ---------------------------------------------------------------------------
  spacing: {
    xxs: scale(4), // micro spacing (tight elements)
    sm: scale(8), // small gaps / padding
    md: scale(16), // standard content padding
    lg: scale(24), // section-level padding
    xl: scale(32), // large outer spacing
    xxl: scale(64), // hero sections / full-width layout padding
    xxxl: scale(80), // extended hero spacing
    card: scale(24), // card internal padding
    icon: scale(24), // icon spacing
    navbar: scale(72), // nav/header height
    section: scale(64), // section-level layout spacing
  },

  // ---------------------------------------------------------------------------
  // 🧩 Layout Tokens
  // Centralized spacing constants for consistent screen composition.
  // ---------------------------------------------------------------------------
  layout: {
    pagePadding: scale(32), // horizontal page padding
    sectionGap: scale(64), // vertical spacing between sections
    cardPadding: scale(24), // internal card padding
  },

  // ---------------------------------------------------------------------------
  // 🔤 Font Size Tokens
  // Base type scale (unscaled) — follows Apple’s fixed-tier sizing philosophy.
  // Fonts should remain static, not scaled by `scale()`.
  // Responsive adjustments happen in `responsiveTheme.ts` instead.
  // ---------------------------------------------------------------------------
  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 15,
    base: 16, // Default body size
    lg: 18,
    xl: 20,
    xxl: 22,
    '2xl': 24,
    '2.5xl': 28,
    '3xl': 30,
    '3.5xl': 32,
    '4xl': 36,
    '5xl': 48,
    '6xl': 56,
    '7xl': 64,
    '8xl': 80,
    '9xl': 90,
    '10xl': 104,
  },

  // ---------------------------------------------------------------------------
  // 🧾 Text Role Mapping
  // Defines semantic font usage tiers (body, label, heading).
  // These keys map to fontSize tokens, so typography is consistent across screens.
  // ---------------------------------------------------------------------------
  text: {
    body: 'base',
    label: 'sm',
    heading: 'xl',
  },

  // ---------------------------------------------------------------------------
  // 🟢 Border Radius Tokens
  // Defines rounding tiers for corners and shapes.
  // Used by buttons, cards, modals, and image containers.
  // ---------------------------------------------------------------------------
  borderRadius: {
    none: 0,
    sm: 8,
    md: 20,
    lg: 16,
    xl: 20,
    '2xl': 32,
    full: 9999, // circular / pill shapes
    default: 8, // fallback
  },

  // ---------------------------------------------------------------------------
  // 🧱 Border Width Tokens
  // Consistent stroke thickness for borders, dividers, and outlines.
  // ---------------------------------------------------------------------------
  borderWidth: {
    none: 0,
    hairline: 0.5, // super thin line (retina-friendly)
    sm: 0.75,
    md: 1.0,
    lg: 1.5,
    xl: 2.0,
    '2xl': 2.5,
  },

  // ---------------------------------------------------------------------------
  // 🔠 Font Weight Tokens
  // Unified font weight scale — consistent across all typography variants.
  // ---------------------------------------------------------------------------
  fontWeight: {
    thin: '100',
    extraLight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
    black: '900',
  },

  // ---------------------------------------------------------------------------
  // 🔡 Letter Spacing Tokens
  // Defines standard tracking adjustments for various text types.
  // Helps ensure consistent optical spacing across all font sizes.
  // ---------------------------------------------------------------------------
  letterSpacing: {
    tighter: -0.02,
    tight: -0.01,
    normal: 0,
    wide: 0.02,
    'extra-tight': -0.03,
    'extra-wide': 0.03,
    button: -0.05, // slightly tighter for buttons
    heading: 0.05, // slightly wider for large headings
  },

  // ---------------------------------------------------------------------------
  // 📏 Line Height Tokens
  // Controls vertical text rhythm and readability.
  // Relative multipliers applied to font size.
  // ---------------------------------------------------------------------------
  lineHeight: {
    snug: 1.375, // tight text (labels)
    relaxed: 1.625, // loose text (paragraphs)
    normal: 1.5,
    default: 1.6,
  },

  // ---------------------------------------------------------------------------
  // 🌫️ Shadow Tokens
  // Reusable shadow presets for elevation effects across themes.
  // These values are CSS-compatible but easily mapped to RN shadow props.
  // ---------------------------------------------------------------------------
  shadows: {
    none: 'none',
    sm: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0px 4px 6px rgba(0, 0, 0, 0.15)',
    lg: '0px 8px 16px rgba(0, 0, 0, 0.2)',
    xl: '0px 12px 24px rgba(0, 0, 0, 0.2)',
    '2xl': '0px 16px 32px rgba(0, 0, 0, 0.25)',
    focusRingColor: '#2196f3', // focus / highlight color (e.g., buttons)
  },

  // ---------------------------------------------------------------------------
  // 🧮 Z-Index Tokens
  // Layering scale for controlling visual stacking (modals, tooltips, etc.)
  // ---------------------------------------------------------------------------
  zIndex: {
    auto: 'auto',
    z0: 0,
    z10: 10,
    z20: 20,
    z30: 30,
    z40: 40,
    z50: 50,
  },

  // ---------------------------------------------------------------------------
  // ⚙️ Motion Tokens
  // Centralized durations and easing curves for animations and transitions.
  // Keeps motion consistent across the app.
  // ---------------------------------------------------------------------------
  motion: {
    duration: {
      fast: 150, // quick micro interactions (buttons, pills)
      normal: 300, // standard UI transitions
      slow: 500, // modals, screen transitions
    },
    easing: {
      default: 'ease-in-out', // balanced default
      entrance: 'cubic-bezier(0.16, 1, 0.3, 1)', // smooth entrance motion curve
    },
  },
} as const; // makes all tokens readonly + type-safe

//////////////////

// // src/styles/tokens.ts
// import {scale} from '../../utils/scale';

// export const tokens = {
//   spacing: {
//     xxs: scale(4),
//     sm: scale(8),
//     md: scale(16),
//     lg: scale(24),
//     xl: scale(32),
//     xxl: scale(64),
//     xxxl: scale(80),
//     card: scale(24),
//     icon: scale(24),
//     navbar: scale(72),
//     section: scale(64),
//   },

//   layout: {
//     pagePadding: scale(32),
//     sectionGap: scale(64),
//     cardPadding: scale(24),
//   },

//   // ✅ ❗️ Fonts should NOT scale dynamically.
//   //    Keep them static here and control them via responsiveTheme if needed.
//   fontSize: {
//     xxs: 10,
//     xs: 12,
//     sm: 14,
//     md: 15,
//     base: 16,
//     lg: 18,
//     xl: 20,
//     xxl: 22,
//     '2xl': 24,
//     '2.5xl': 28,
//     '3xl': 30,
//     '3.5xl': 32,
//     '4xl': 36,
//     '5xl': 48,
//     '6xl': 56,
//     '7xl': 64,
//     '8xl': 80,
//     '9xl': 90,
//     '10xl': 104,
//   },

//   text: {
//     body: 'base',
//     label: 'sm',
//     heading: 'xl',
//   },

//   borderRadius: {
//     none: 0,
//     sm: 8,
//     md: 20,
//     lg: 16,
//     xl: 20,
//     '2xl': 32,
//     full: 9999,
//     default: 8,
//   },

//   borderWidth: {
//     none: 0,
//     hairline: 0.5,
//     sm: 0.75,
//     md: 1.0,
//     lg: 1.5,
//     xl: 2.0,
//     '2xl': 2.5,
//   },

//   fontWeight: {
//     thin: '100',
//     extraLight: '200',
//     light: '300',
//     normal: '400',
//     medium: '500',
//     semiBold: '600',
//     bold: '700',
//     extraBold: '800',
//     black: '900',
//   },

//   letterSpacing: {
//     tighter: -0.02,
//     tight: -0.01,
//     normal: 0,
//     wide: 0.02,
//     'extra-tight': -0.03,
//     'extra-wide': 0.03,
//     button: -0.05,
//     heading: 0.05,
//   },

//   lineHeight: {
//     snug: 1.375,
//     relaxed: 1.625,
//     normal: 1.5,
//     default: 1.6,
//   },

//   shadows: {
//     none: 'none',
//     sm: '0px 1px 2px rgba(0, 0, 0, 0.1)',
//     md: '0px 4px 6px rgba(0, 0, 0, 0.15)',
//     lg: '0px 8px 16px rgba(0, 0, 0, 0.2)',
//     xl: '0px 12px 24px rgba(0, 0, 0, 0.2)',
//     '2xl': '0px 16px 32px rgba(0, 0, 0, 0.25)',
//     focusRingColor: '#2196f3',
//   },

//   zIndex: {
//     auto: 'auto',
//     z0: 0,
//     z10: 10,
//     z20: 20,
//     z30: 30,
//     z40: 40,
//     z50: 50,
//   },

//   motion: {
//     duration: {
//       fast: 150,
//       normal: 300,
//       slow: 500,
//     },
//     easing: {
//       default: 'ease-in-out',
//       entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
//     },
//   },
// } as const;
