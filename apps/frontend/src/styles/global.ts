// src/styles/globalStyles.ts
// ---------------------------------------------------------------------------
// 🔹 Purpose:
// Defines all global React Native styles shared across the app.
// Provides consistent design primitives (spacing, radii, typography, etc.)
// and responsive behavior across phones, Pro Max devices, and tablets.
//
// 🔹 Core Features:
// - Uses Dimensions for static device breakpoints (phone / tablet).
// - Imports design tokens (borderRadius, borderWidth, etc.) from tokens.ts.
// - Pulls the current color palette from ThemeContext (light/dark).
// - Centralizes card, button, text, image, and layout styles.
//
// 🔹 When to use:
// Call `createGlobalStyles(theme)` inside a screen or component to
// access unified styles: `const global = createGlobalStyles(theme)`
// ---------------------------------------------------------------------------

import {StyleSheet, Dimensions} from 'react-native';
import {tokens} from './tokens/tokens';
import type {Theme} from '../context/ThemeContext';
import {fontScale, scale} from '../utils/scale';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// const insets = useSafeAreaInsets();
// screen: { paddingTop: insets.top, paddingBottom: insets.bottom + tokens.spacing.lg }

// ---------------------------------------------------------------------------
// 🧭 Device breakpoints
// Determines device class once at load time. Used for static style tiers.
// ---------------------------------------------------------------------------
const {width: screenWidth} = Dimensions.get('window');
const isTablet = screenWidth >= 768; // Tablets / iPads / large foldables
const isLargePhone = screenWidth >= 430; // iPhone Pro Max & similar large phones

// ---------------------------------------------------------------------------
// 📐 Responsive constants
// Defines adaptive spacing, padding, and element dimensions for each device tier.
// These are static (computed once) for performance and predictability.
// ---------------------------------------------------------------------------
const responsivePadding = isTablet ? 38 : 20;
const sectionMarginBottom = isTablet ? 32 : 24;

const image1Width = isTablet ? 270 : 165;
const image1Height = isTablet ? 150 : 95;
const image2Width = isTablet ? 270 : 165;
const image2Height = isTablet ? 150 : 95;
const image4Size = isTablet ? 160 : 110;
const outfitCardSize = isTablet ? 164 : 110;

// ---------------------------------------------------------------------------
// 🔤 Breakpoint-based typography tiers
// Fonts never scale automatically with screen width — only through fixed tiers.
// This keeps typography visually consistent (Apple-style design philosophy).
// ---------------------------------------------------------------------------
// const font = {
//   xs: isTablet ? 14 : isLargePhone ? 13 : 12, // tiny captions
//   sm: isTablet ? 15 : isLargePhone ? 14 : 13, // labels, metadata
//   md: isTablet ? 17 : isLargePhone ? 16 : 15, // body text
//   lg: isTablet ? 19 : isLargePhone ? 18 : 17, // section titles
//   xl: isTablet ? 22 : isLargePhone ? 20 : 18, // large titles
//   heading: isTablet ? 36 : isLargePhone ? 34 : 32, // hero headers
// };

// const font = {
//   xs: isTablet ? tokens.fontSize.xs + 1 : tokens.fontSize.xs,
//   sm: isTablet ? tokens.fontSize.sm + 1 : tokens.fontSize.sm,
//   md: isTablet ? tokens.fontSize.base + 1 : tokens.fontSize.base,
//   lg: isTablet ? tokens.fontSize.lg + 1 : tokens.fontSize.lg,
//   xl: isTablet ? tokens.fontSize.xl + 2 : tokens.fontSize.xl,
//   heading: isTablet ? tokens.fontSize['3xl'] : tokens.fontSize['2.5xl'],
// };
const font = {
  xs: isTablet ? tokens.fontSize.xs + 1 : tokens.fontSize.xs,
  sm: isTablet ? tokens.fontSize.sm + 1 : tokens.fontSize.sm,
  md: isTablet ? tokens.fontSize.base + 1 : tokens.fontSize.base,
  lg: isTablet ? tokens.fontSize.lg + 1 : tokens.fontSize.lg,
  xl: isTablet ? tokens.fontSize.xl + 2 : tokens.fontSize.xl,
  heading: isTablet ? tokens.fontSize['3xl'] : tokens.fontSize['2.5xl'],
};

// ---------------------------------------------------------------------------
// 🎨 Global StyleSheet factory
// Generates a complete theme-aware, responsive style map for your UI.
// Each block is organized by functional category for clarity.
// ---------------------------------------------------------------------------
export const createGlobalStyles = (theme: Theme) =>
  StyleSheet.create({
    // ============================================================
    // 🌎 Core Layout Containers
    // ============================================================
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background, // entire screen background
    },
    container: {
      paddingTop: 20,
      paddingBottom: 60,
      width: '100%',
      alignSelf: 'center',
      flexGrow: 1,
    },
    centeredSection: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center', // keeps sections centered on large devices
    },

    // ============================================================
    // 🪟 Modal Containers
    // ============================================================
    modalSection: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: responsivePadding,
      maxWidth: 720,
      alignSelf: 'center',
      borderRadius: 25,
    },
    modalSection2: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      borderRadius: 25,
    },
    modalSection3: {
      width: '100%',
      paddingHorizontal: responsivePadding,
      maxWidth: 720,
      alignSelf: 'center',
      borderRadius: 25,
    },

    // ============================================================
    // 💳 Card Styles (shadows, borders, background variants)
    // ============================================================
    cardStyles1: {
      padding: 16,
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
      borderRadius: tokens.borderRadius.xl,
      backgroundColor: theme.colors.surface,
    },
    cardStyles2: {
      padding: 14,
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      borderRadius: tokens.borderRadius.xl,
    },
    cardStyles3: {
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      borderRadius: tokens.borderRadius.xl,
    },
    cardStyles4: {
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      borderRadius: tokens.borderRadius.md,
    },

    // ============================================================
    // 🧩 Layout Sections
    // ============================================================
    section: {
      marginBottom: sectionMarginBottom,
      paddingHorizontal: responsivePadding,
    },
    section2: {
      marginBottom: sectionMarginBottom,
    },
    section3: {
      paddingHorizontal: responsivePadding,
      marginTop: 20,
      marginBottom: 20,
    },
    section4: {
      paddingHorizontal: responsivePadding,
    },
    section5: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      borderRadius: 25,
    },
    section6: {
      paddingHorizontal: responsivePadding,
    },
    sectionScroll: {
      marginBottom: 30,
      paddingLeft: responsivePadding,
    },

    // ============================================================
    // 🏷️ Typography Styles
    // ============================================================
    header: {
      paddingLeft: 20,
      fontSize: font.heading,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    backContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 100,
    },
    backText: {
      fontSize: font.md,
      fontWeight: '500',
      color: theme.colors.button3,
    },
    sectionTitle: {
      fontSize: font.lg,
      fontWeight: '800',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    sectionTitle2: {
      fontSize: font.md,
      fontWeight: '700',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 2,
    },
    sectionTitle3: {
      fontSize: font.sm,
      fontWeight: '500',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 2,
    },
    sectionTitle4: {
      fontSize: font.sm,
      fontWeight: '400',
      lineHeight: 24,
      color: theme.colors.foreground,
    },
    sectionTitle5: {
      fontSize: font.lg,
      fontWeight: '800',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 2,
      textTransform: 'uppercase',
    },

    // ============================================================
    // 🧱 Content Containers + Titles
    // ============================================================
    styleContainer1: {
      flexDirection: 'column',
      justifyContent: 'center',
      marginTop: 10,
      marginBottom: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
      paddingTop: 18,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: font.sm,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    title2: {
      fontSize: font.xs,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    title3: {
      fontSize: font.xs,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 6,
      marginTop: 4,
    },
    titleBold: {
      fontSize: font.lg,
      fontWeight: '800',
      marginBottom: -4,
      color: theme.colors.foreground,
    },

    // ============================================================
    // 🏷️ Labels + Subtext
    // ============================================================
    label: {
      fontSize: font.xs,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    label2: {
      fontSize: font.sm,
      fontWeight: '500',
      width: '25%',
      color: theme.colors.foreground,
    },
    subLabel: {
      fontSize: font.xs,
      fontWeight: '500',
      marginTop: 2,
      color: theme.colors.foreground2,
    },
    cardLabel: {
      fontSize: font.sm,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    cardSubLabel: {
      fontSize: font.xs,
      fontWeight: '500',
      marginTop: 2,
      color: theme.colors.foreground2,
    },

    // ============================================================
    // 🍔 Menus + List Sections
    // ============================================================
    menuContainer1: {
      flexDirection: 'column',
      justifyContent: 'center',
      marginTop: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 16,
    },
    menuSection1: {
      flexDirection: 'column',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 18,
    },
    menuSection2: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 26,
      paddingVertical: 18,
    },
    menuSection3: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 26,
    },
    menuLabel: {
      fontSize: font.lg,
      fontWeight: '400',
      color: theme.colors.foreground,
    },

    // ============================================================
    // 💊 Pill Elements
    // ============================================================
    labelContainer: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    labelContainer2: {
      paddingHorizontal: 12,
    },
    labelContainer3: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    labelContainer4: {
      backgroundColor: 'red',
    },
    pillContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
    },
    pill: {
      backgroundColor: theme.colors.foreground,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 18,
      marginRight: 8,
    },
    pill2: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      backgroundColor: theme.colors.pillDark2,
      borderRadius: 18,
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
      marginRight: 8,
    },
    pillText: {
      fontSize: font.sm,
      fontWeight: '500',
      color: theme.colors.background,
    },
    pillFixedWidth: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 9,
      borderRadius: 18,
      alignSelf: 'flex-start',
      width: '32%',
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    pillTextFixedWidth: {
      fontSize: font.sm,
      fontWeight: '500',
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    pillFixedWidth2: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 9,
      borderRadius: 18,
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      alignSelf: 'flex-start',
      width: '23%',
    },
    pillTextFixedWidth2: {
      fontSize: font.sm,
      fontWeight: '500',
      color: theme.colors.foreground,
      textAlign: 'center',
    },

    // ============================================================
    // 🔘 Buttons
    // ============================================================
    buttonHome: {
      width: '90%',
      maxWidth: 270,
      paddingVertical: 16,
      borderRadius: tokens.borderRadius.md,
      marginBottom: 20,
      alignItems: 'center',
      backgroundColor: 'black',
    },
    buttonHomeText: {
      fontSize: font.lg,
      fontWeight: '600',
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 3,
    },
    buttonPrimary: {
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderColor: theme.colors.surfaceBorder,
      paddingVertical: 13,
      borderWidth: 1,
    },
    buttonPrimaryText: {
      fontSize: font.md,
      fontWeight: '600',
      color: theme.colors.buttonText1,
    },
    buttonSecondary: {
      backgroundColor: theme.colors.button2,
      borderRadius: tokens.borderRadius['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderColor: theme.colors.surfaceBorder,
      paddingVertical: 13,
      borderWidth: 1,
    },
    buttonSecondaryText: {
      fontSize: font.sm,
      fontWeight: '600',
      color: '#fff',
    },
    buttonTertiary: {
      width: 90,
      maxWidth: 186,
      backgroundColor: theme.colors.surface2,
      borderRadius: tokens.borderRadius.sm,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonTertiaryText: {
      fontSize: font.sm,
      fontWeight: '600',
      color: '#fff',
    },
    buttonPrimary4: {
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderColor: theme.colors.surfaceBorder,
      paddingVertical: 8,
      borderWidth: 1,
    },
    buttonPrimaryText4: {
      fontSize: font.xs,
      fontWeight: '600',
      color: theme.colors.buttonText1,
    },

    // ============================================================
    // 🖼️ Image + Media
    // ============================================================
    image1: {
      width: 92,
      height: 92,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: '#eee',
    },
    image2: {
      width: image2Width,
      height: image2Height,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    image3: {
      width: 165,
      height: 95,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.surface,
    },
    image4: {
      width: image4Size,
      height: image4Size,
      backgroundColor: '#eee',
      borderRadius: tokens.borderRadius.md,
    },
    image5: {
      width: '100%',
      height: 120,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: tokens.borderWidth.md,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    image6: {
      width: '100%',
      backgroundColor: theme.colors.foreground,
    },

    // ============================================================
    // 🧥 Outfit Cards + Lists
    // ============================================================
    outfitCard: {
      width: outfitCardSize,
      marginRight: 12,
      alignItems: 'flex-start',
    },

    // ============================================================
    // 🎙️ Prompt Input (Voice/Chat Bar)
    // ============================================================
    promptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 12,
      width: '100%',
    },
    promptInput: {
      flex: 1,
      color: theme.colors.foreground,
      fontSize: font.md,
    },

    // ============================================================
    // ✍️ Utility + Miscellaneous
    // ============================================================
    hrLine: {
      borderBottomWidth: 1,
      borderColor: 'rgba(74, 74, 74, 0.37)',
    },
    boxShadowLight: {
      shadowColor: 'rgb(0, 0, 0)',
      shadowOffset: {width: 10, height: 8},
      shadowOpacity: 0.5,
      shadowRadius: 7,
      elevation: 6,
    },
    boxShadowDark: {
      shadowColor: 'rgb(73, 73, 73)',
      shadowOffset: {width: 10, height: 8},
      shadowOpacity: 0.5,
      shadowRadius: 7,
      elevation: 6,
    },
    missingDataMessage1: {
      color: theme.colors.muted,
      textAlign: 'left',
      marginTop: 0,
      lineHeight: 20,
      maxWidth: 400,
    },
  });

//////////////////////

// import {StyleSheet, Dimensions} from 'react-native';
// import {tokens} from './tokens/tokens';
// import type {Theme} from '../context/ThemeContext';

// const {width: screenWidth} = Dimensions.get('window');
// const isTablet = screenWidth >= 768;
// const isLargePhone = screenWidth >= 430; // iPhone Pro Max breakpoint

// // 📐 Responsive constants
// const responsivePadding = isTablet ? 38 : 20;
// const sectionMarginBottom = isTablet ? 32 : 24;
// const image1Width = isTablet ? 270 : 165;
// const image1Height = isTablet ? 150 : 95;
// const image2Width = isTablet ? 270 : 165;
// const image2Height = isTablet ? 150 : 95;
// const image4Size = isTablet ? 160 : 110;
// const outfitCardSize = isTablet ? 164 : 110;

// // ✅ Breakpoint-based typography — no scaling, just gentle tiering
// const font = {
//   xs: isTablet ? 14 : isLargePhone ? 13 : 12,
//   sm: isTablet ? 15 : isLargePhone ? 14 : 13,
//   md: isTablet ? 17 : isLargePhone ? 16 : 15,
//   lg: isTablet ? 19 : isLargePhone ? 18 : 17,
//   xl: isTablet ? 22 : isLargePhone ? 20 : 18,
//   heading: isTablet ? 36 : isLargePhone ? 34 : 32,
// };

// export const createGlobalStyles = (theme: Theme) =>
//   StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     container: {
//       paddingTop: 20,
//       paddingBottom: 60,
//       width: '100%',
//       alignSelf: 'center',
//       flexGrow: 1,
//     },
//     centeredSection: {
//       width: '100%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalSection: {
//       width: '100%',
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: responsivePadding,
//       maxWidth: 720,
//       alignSelf: 'center',
//       borderRadius: 25,
//     },
//     modalSection2: {
//       width: '100%',
//       maxWidth: 720,
//       alignSelf: 'center',
//       borderRadius: 25,
//     },
//     modalSection3: {
//       width: '100%',
//       paddingHorizontal: responsivePadding,
//       maxWidth: 720,
//       alignSelf: 'center',
//       borderRadius: 25,
//     },
//     cardStyles1: {
//       padding: 16,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       borderRadius: tokens.borderRadius.xl,
//       backgroundColor: theme.colors.surface,
//     },
//     cardStyles2: {
//       padding: 14,
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       borderRadius: tokens.borderRadius.xl,
//     },
//     cardStyles3: {
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       borderRadius: tokens.borderRadius.xl,
//     },
//     cardStyles4: {
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       borderRadius: tokens.borderRadius.md,
//     },
//     section: {
//       marginBottom: sectionMarginBottom,
//       paddingHorizontal: responsivePadding,
//     },
//     section2: {
//       marginBottom: sectionMarginBottom,
//     },
//     section3: {
//       paddingHorizontal: responsivePadding,
//       marginTop: 20,
//       marginBottom: 20,
//     },
//     section4: {
//       paddingHorizontal: responsivePadding,
//     },
//     section5: {
//       width: '100%',
//       maxWidth: 720,
//       alignSelf: 'center',
//       borderRadius: 25,
//     },
//     section6: {
//       paddingHorizontal: responsivePadding,
//     },
//     sectionScroll: {
//       marginBottom: 30,
//       paddingLeft: responsivePadding,
//     },
//     header: {
//       paddingLeft: 20,
//       fontSize: font.heading,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     backContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       width: 100,
//     },
//     backText: {
//       fontSize: font.md,
//       fontWeight: '500',
//       color: theme.colors.button3,
//     },
//     sectionTitle: {
//       fontSize: font.lg,
//       fontWeight: '800',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//       textTransform: 'uppercase',
//     },
//     sectionTitle2: {
//       fontSize: font.md,
//       fontWeight: '700',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//       marginBottom: 2,
//     },
//     sectionTitle3: {
//       fontSize: font.sm,
//       fontWeight: '500',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//       marginBottom: 2,
//     },
//     sectionTitle4: {
//       fontSize: font.sm,
//       fontWeight: '400',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//     },
//     sectionTitle5: {
//       fontSize: font.lg,
//       fontWeight: '800',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//       marginBottom: 2,
//       textTransform: 'uppercase',
//     },
//     styleContainer1: {
//       flexDirection: 'column',
//       justifyContent: 'center',
//       marginTop: 10,
//       marginBottom: 20,
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingTop: 18,
//       paddingHorizontal: 16,
//       paddingBottom: 8,
//     },
//     title: {
//       fontSize: font.sm,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     title2: {
//       fontSize: font.xs,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     title3: {
//       fontSize: font.xs,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 6,
//       marginTop: 4,
//     },
//     titleBold: {
//       fontSize: font.lg,
//       fontWeight: '800',
//       marginBottom: -4,
//       color: theme.colors.foreground,
//     },
//     label: {
//       fontSize: font.xs,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     label2: {
//       fontSize: font.sm,
//       fontWeight: '500',
//       width: '25%',
//       color: theme.colors.foreground,
//     },
//     subLabel: {
//       fontSize: font.xs,
//       fontWeight: '500',
//       marginTop: 2,
//       color: theme.colors.foreground2,
//     },
//     cardLabel: {
//       fontSize: font.sm,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     cardSubLabel: {
//       fontSize: font.xs,
//       fontWeight: '500',
//       marginTop: 2,
//       color: theme.colors.foreground2,
//     },
//     menuContainer1: {
//       flexDirection: 'column',
//       justifyContent: 'center',
//       marginTop: 8,
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 16,
//     },
//     menuSection1: {
//       flexDirection: 'column',
//       justifyContent: 'center',
//       paddingHorizontal: 8,
//       paddingVertical: 18,
//     },
//     menuSection2: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 26,
//       paddingVertical: 18,
//     },
//     menuSection3: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 26,
//     },
//     menuLabel: {
//       fontSize: font.lg,
//       fontWeight: '400',
//       color: theme.colors.foreground,
//     },
//     labelContainer: {
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//     },
//     labelContainer2: {
//       paddingHorizontal: 12,
//     },
//     labelContainer3: {
//       paddingVertical: 6,
//       paddingHorizontal: 12,
//     },
//     labelContainer4: {
//       backgroundColor: 'red',
//     },
//     pillContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       width: '100%',
//     },
//     pill: {
//       backgroundColor: theme.colors.foreground,
//       paddingHorizontal: 18,
//       paddingVertical: 9,
//       borderRadius: 18,
//       marginRight: 8,
//     },
//     pill2: {
//       paddingHorizontal: 18,
//       paddingVertical: 9,
//       backgroundColor: theme.colors.pillDark2,
//       borderRadius: 18,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       marginRight: 8,
//     },
//     pillText: {
//       fontSize: font.sm,
//       fontWeight: '500',
//       color: theme.colors.background,
//     },
//     pillFixedWidth: {
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 9,
//       borderRadius: 18,
//       alignSelf: 'flex-start',
//       width: '32%',
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//     },
//     pillTextFixedWidth: {
//       fontSize: font.sm,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//     pillFixedWidth2: {
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 9,
//       borderRadius: 18,
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       alignSelf: 'flex-start',
//       width: '23%',
//     },
//     pillTextFixedWidth2: {
//       fontSize: font.sm,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//     buttonHome: {
//       width: '90%',
//       maxWidth: 270,
//       paddingVertical: 16,
//       borderRadius: tokens.borderRadius.md,
//       marginBottom: 20,
//       alignItems: 'center',
//       backgroundColor: 'black',
//     },
//     buttonHomeText: {
//       fontSize: font.lg,
//       fontWeight: '600',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     buttonPrimary: {
//       backgroundColor: theme.colors.button1,
//       borderRadius: tokens.borderRadius['2xl'],
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 2,
//       borderColor: theme.colors.surfaceBorder,
//       paddingVertical: 13,
//       borderWidth: 1,
//     },
//     buttonPrimaryText: {
//       fontSize: font.md,
//       fontWeight: '600',
//       color: theme.colors.buttonText1,
//     },
//     buttonSecondary: {
//       backgroundColor: theme.colors.button2,
//       borderRadius: tokens.borderRadius['2xl'],
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 2,
//       borderColor: theme.colors.surfaceBorder,
//       paddingVertical: 13,
//       borderWidth: 1,
//     },
//     buttonSecondaryText: {
//       fontSize: font.sm,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     buttonTertiary: {
//       width: 90,
//       maxWidth: 186,
//       backgroundColor: theme.colors.surface2,
//       borderRadius: tokens.borderRadius.sm,
//       paddingVertical: 12,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     buttonTertiaryText: {
//       fontSize: font.sm,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     buttonPrimary4: {
//       backgroundColor: theme.colors.button1,
//       borderRadius: tokens.borderRadius['2xl'],
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 2,
//       borderColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       borderWidth: 1,
//     },
//     buttonPrimaryText4: {
//       fontSize: font.xs,
//       fontWeight: '600',
//       color: theme.colors.buttonText1,
//     },
//     image1: {
//       width: 92,
//       height: 92,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: '#eee',
//     },
//     image2: {
//       width: image2Width,
//       height: image2Height,
//       borderTopLeftRadius: 12,
//       borderTopRightRadius: 12,
//       backgroundColor: theme.colors.surface,
//     },
//     image3: {
//       width: 165,
//       height: 95,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//     },
//     image4: {
//       width: image4Size,
//       height: image4Size,
//       backgroundColor: '#eee',
//       borderRadius: tokens.borderRadius.md,
//     },
//     image5: {
//       width: '100%',
//       height: 120,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: tokens.borderWidth.md,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     image6: {
//       width: '100%',
//       backgroundColor: theme.colors.foreground,
//     },
//     outfitCard: {
//       width: outfitCardSize,
//       marginRight: 12,
//       alignItems: 'flex-start',
//     },
//     promptRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#1a1a1a',
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 12,
//       width: '100%',
//     },
//     promptInput: {
//       flex: 1,
//       color: theme.colors.foreground,
//       fontSize: font.md,
//     },
//     hrLine: {
//       borderBottomWidth: 1,
//       borderColor: 'rgba(74, 74, 74, 0.37)',
//     },
//     boxShadowLight: {
//       shadowColor: 'rgb(0, 0, 0)',
//       shadowOffset: {width: 10, height: 8},
//       shadowOpacity: 0.5,
//       shadowRadius: 7,
//       elevation: 6,
//     },
//     boxShadowDark: {
//       shadowColor: 'rgb(73, 73, 73)',
//       shadowOffset: {width: 10, height: 8},
//       shadowOpacity: 0.5,
//       shadowRadius: 7,
//       elevation: 6,
//     },
//     missingDataMessage1: {
//       color: theme.colors.muted,
//       textAlign: 'left',
//       marginTop: 0,
//       lineHeight: 20,
//       maxWidth: 400,
//     },
//   });
