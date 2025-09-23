<<<<<<< HEAD
export const tokens = {
  spacing: {
    xxs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 64,
    xxxl: 80,
    card: 24,
    icon: 24,
    navbar: 72,
    section: 64,
  },

  borderRadius: {
    none: 0,
    sm: 2,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    full: 9999,
    default: 8,
  },

  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 15,
    base: 16,
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
=======
// styles/tokens.ts
import {scale} from '../../utils/scale';

export const tokens = {
  spacing: {
    xxs: scale(4),
    sm: scale(8),
    md: scale(16),
    lg: scale(24),
    xl: scale(32),
    xxl: scale(64),
    xxxl: scale(80),
    card: scale(24),
    icon: scale(24),
    navbar: scale(72),
    section: scale(64),
  },

  layout: {
    pagePadding: scale(32),
    sectionGap: scale(64),
    cardPadding: scale(24),
  },

  fontSize: {
    xxs: scale(10),
    xs: scale(12),
    sm: scale(14),
    md: scale(15),
    base: scale(16),
    lg: scale(18),
    xl: scale(20),
    xxl: scale(22),
    '2xl': scale(24),
    '2.5xl': scale(28),
    '3xl': scale(30),
    '3.5xl': scale(32),
    '4xl': scale(36),
    '5xl': scale(48),
    '6xl': scale(56),
    '7xl': scale(64),
    '8xl': scale(80),
    '9xl': scale(90),
    '10xl': scale(104),
>>>>>>> 9-22-25-chore-mg3
  },

  text: {
    body: 'base',
    label: 'sm',
    heading: 'xl',
  },

<<<<<<< HEAD
=======
  borderRadius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    // md: 0,
    // lg: 0,
    // xl: 0,
    '2xl': 32,
    full: 9999,
    default: 8,
  },

  borderWidth: {
    none: 0,
    hairline: 0.5,
    sm: 0.75,
    md: 1.0,
    lg: 1.5,
    xl: 2.0,
    '2xl': 2.5,
  },

>>>>>>> 9-22-25-chore-mg3
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

  letterSpacing: {
    tighter: -0.02,
    tight: -0.01,
    normal: 0,
    wide: 0.02,
    'extra-tight': -0.03,
    'extra-wide': 0.03,
    button: -0.05,
    heading: 0.05,
  },

  lineHeight: {
    snug: 1.375,
    relaxed: 1.625,
    normal: 1.5,
    default: 1.6,
  },

<<<<<<< HEAD
  layout: {
    pagePadding: 'xl',
    sectionGap: 'xxl',
    cardPadding: 'lg',
  },

=======
>>>>>>> 9-22-25-chore-mg3
  shadows: {
    none: 'none',
    sm: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0px 4px 6px rgba(0, 0, 0, 0.15)',
    lg: '0px 8px 16px rgba(0, 0, 0, 0.2)',
    xl: '0px 12px 24px rgba(0, 0, 0, 0.2)',
    '2xl': '0px 16px 32px rgba(0, 0, 0, 0.25)',
    focusRingColor: '#2196f3',
  },

  zIndex: {
    auto: 'auto',
    z0: 0,
    z10: 10,
    z20: 20,
    z30: 30,
    z40: 40,
    z50: 50,
  },

  motion: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      default: 'ease-in-out',
      entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
  },
} as const;
