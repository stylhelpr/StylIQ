// src/components/LiquidGlassCard/LiquidGlassCard.tsx
// -----------------------------------------------------------------------------
// 🪩 LiquidGlassCard — Full Apple-grade Implementation
// -----------------------------------------------------------------------------
// • True iOS “systemUltraThinMaterial” blur (UIVisualEffectView)
// • Animated specular shimmer & refractive rim
// • Adaptive tint based on appearance (light/dark)
// • Ultra-low-opacity shadow for realistic floating depth
// -----------------------------------------------------------------------------

import React, {useRef, useEffect} from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
  useColorScheme,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {fontScale, moderateScale} from '../../utils/scale';
import {useGlobalStyles} from '../..//styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';

type AppleMaterial =
  | 'systemUltraThinMaterial'
  | 'systemThinMaterial'
  | 'systemMaterial'
  | 'systemChromeMaterial';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  blurAmount?: number;
  blurType?: AppleMaterial;
  blurOpacity?: number;
}

const LiquidGlassCard: React.FC<Props> = ({
  children,
  style,
  borderRadius = tokens.borderRadius['2xl'],
  blurAmount = 8,
  blurType = 'systemUltraThinMaterial',
  blurOpacity = 0.85,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const {theme, setSkin} = useAppTheme();
  const globalStyles = useGlobalStyles();

  // Continuous “living” shimmer loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  // Interpolated tint + highlight shimmer
  const shimmerTint = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)'],
  });

  const rimHighlight = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.28)'],
  });

  const styles = StyleSheet.create({
    card: {
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: Platform.OS === 'ios' ? 0.05 : 0.12,
      shadowRadius: 8,
      shadowOffset: {width: 0, height: 6},
      elevation: 6,
      borderColor: theme.colors.foreground,
      borderWidth: tokens.borderWidth.hairline,
    },
    content: {
      // padding: 60,
    },
  });

  return (
    <View style={[styles.card, {borderRadius}, style]}>
      {/* 🧊 True Apple Blur */}
      <BlurView
        style={[StyleSheet.absoluteFill, {borderRadius, opacity: blurOpacity}]}
        blurType={blurType as any}
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor="transparent"
      />

      {/* 💫 Dynamic Specular Shimmer */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            backgroundColor: shimmerTint,
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 20],
                }),
              },
            ],
          },
        ]}
      />

      {/* 🌈 Adaptive Refraction Rim */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            borderWidth: 0.75,
            borderColor: rimHighlight,
            // slight adaptive tint by color mode
            shadowColor: isDark
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.35)',
          },
        ]}
      />

      {/* 📦 Foreground content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

export default LiquidGlassCard;

//////////////////

// // src/components/LiquidGlassCard/LiquidGlassCard.tsx
// // -----------------------------------------------------------------------------
// // 🪩 LiquidGlassCard — Full Apple-grade Implementation
// // -----------------------------------------------------------------------------
// // • True iOS “systemUltraThinMaterial” blur (UIVisualEffectView)
// // • Animated specular shimmer & refractive rim
// // • Adaptive tint based on appearance (light/dark)
// // • Ultra-low-opacity shadow for realistic floating depth
// // -----------------------------------------------------------------------------

// import React, {useRef, useEffect} from 'react';
// import {
//   View,
//   Animated,
//   Easing,
//   StyleSheet,
//   StyleProp,
//   ViewStyle,
//   Platform,
//   useColorScheme,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {useGlobalStyles} from '../..//styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type AppleMaterial =
//   | 'systemUltraThinMaterial'
//   | 'systemThinMaterial'
//   | 'systemMaterial'
//   | 'systemChromeMaterial';

// interface Props {
//   children?: React.ReactNode;
//   style?: StyleProp<ViewStyle>;
//   borderRadius?: number;
//   blurAmount?: number;
//   blurType?: AppleMaterial;
//   blurOpacity?: number;
// }

// const LiquidGlassCard: React.FC<Props> = ({
//   children,
//   style,
//   borderRadius = tokens.borderRadius['2xl'],
//   blurAmount = 8,
//   blurType = 'systemUltraThinMaterial',
//   blurOpacity = 0.85,
// }) => {
//   const shimmer = useRef(new Animated.Value(0)).current;
//   const colorScheme = useColorScheme();
//   const isDark = colorScheme === 'dark';
//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // Continuous “living” shimmer loop
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(shimmer, {
//           toValue: 1,
//           duration: 8000,
//           easing: Easing.inOut(Easing.sin),
//           useNativeDriver: true,
//         }),
//         Animated.timing(shimmer, {
//           toValue: 0,
//           duration: 8000,
//           easing: Easing.inOut(Easing.sin),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, [shimmer]);

//   // Interpolated tint + highlight shimmer
//   const shimmerTint = shimmer.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)'],
//   });

//   const rimHighlight = shimmer.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.28)'],
//   });

//   const styles = StyleSheet.create({
//     card: {
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: Platform.OS === 'ios' ? 0.05 : 0.12,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 6},
//       elevation: 6,
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//     },
//     content: {
//       // padding: 60,
//     },
//   });

//   return (
//     <View style={[styles.card, {borderRadius}, style]}>
//       {/* 🧊 True Apple Blur */}
//       <BlurView
//         style={[StyleSheet.absoluteFill, {borderRadius, opacity: blurOpacity}]}
//         blurType={blurType as any}
//         blurAmount={blurAmount}
//         reducedTransparencyFallbackColor="transparent"
//       />

//       {/* 💫 Dynamic Specular Shimmer */}
//       <Animated.View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius,
//             backgroundColor: shimmerTint,
//             transform: [
//               {
//                 translateX: shimmer.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [-20, 20],
//                 }),
//               },
//             ],
//           },
//         ]}
//       />

//       {/* 🌈 Adaptive Refraction Rim */}
//       <Animated.View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius,
//             borderWidth: 0.75,
//             borderColor: rimHighlight,
//             // slight adaptive tint by color mode
//             shadowColor: isDark
//               ? 'rgba(255,255,255,0.15)'
//               : 'rgba(255,255,255,0.35)',
//           },
//         ]}
//       />

//       {/* 📦 Foreground content */}
//       <View style={styles.content}>{children}</View>
//     </View>
//   );
// };

// export default LiquidGlassCard;

//////////////////

// // src/components/LiquidGlassCard/LiquidGlassCard.tsx
// // -----------------------------------------------------------------------------
// // 🪩 LiquidGlassCard — Full Apple-grade Implementation
// // -----------------------------------------------------------------------------
// // • True iOS “systemUltraThinMaterial” blur (UIVisualEffectView)
// // • Animated specular shimmer & refractive rim
// // • Adaptive tint based on appearance (light/dark)
// // • Ultra-low-opacity shadow for realistic floating depth
// // -----------------------------------------------------------------------------

// import React, {useRef, useEffect} from 'react';
// import {
//   View,
//   Animated,
//   Easing,
//   StyleSheet,
//   StyleProp,
//   ViewStyle,
//   Platform,
//   useColorScheme,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';

// type AppleMaterial =
//   | 'systemUltraThinMaterial'
//   | 'systemThinMaterial'
//   | 'systemMaterial'
//   | 'systemChromeMaterial';

// interface Props {
//   children?: React.ReactNode;
//   style?: StyleProp<ViewStyle>;
//   borderRadius?: number;
//   blurAmount?: number;
//   blurType?: AppleMaterial;
//   blurOpacity?: number;
// }

// const LiquidGlassCard: React.FC<Props> = ({
//   children,
//   style,
//   borderRadius = 28,
//   blurAmount = 8,
//   blurType = 'systemUltraThinMaterial',
//   blurOpacity = 0.85,
// }) => {
//   const shimmer = useRef(new Animated.Value(0)).current;
//   const colorScheme = useColorScheme();
//   const isDark = colorScheme === 'dark';

//   // Continuous “living” shimmer loop
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(shimmer, {
//           toValue: 1,
//           duration: 8000,
//           easing: Easing.inOut(Easing.sin),
//           useNativeDriver: true,
//         }),
//         Animated.timing(shimmer, {
//           toValue: 0,
//           duration: 8000,
//           easing: Easing.inOut(Easing.sin),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, [shimmer]);

//   // Interpolated tint + highlight shimmer
//   const shimmerTint = shimmer.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)'],
//   });

//   const rimHighlight = shimmer.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.28)'],
//   });

//   const styles = StyleSheet.create({
//     card: {
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: Platform.OS === 'ios' ? 0.05 : 0.12,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 6},
//       elevation: 6,
//     },
//     content: {
//       padding: 16,
//     },
//   });

//   return (
//     <View style={[styles.card, {borderRadius}, style]}>
//       {/* 🧊 True Apple Blur */}
//       <BlurView
//         style={[StyleSheet.absoluteFill, {borderRadius, opacity: blurOpacity}]}
//         blurType={blurType as any}
//         blurAmount={blurAmount}
//         reducedTransparencyFallbackColor="transparent"
//       />

//       {/* 💫 Dynamic Specular Shimmer */}
//       <Animated.View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius,
//             backgroundColor: shimmerTint,
//             transform: [
//               {
//                 translateX: shimmer.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [-20, 20],
//                 }),
//               },
//             ],
//           },
//         ]}
//       />

//       {/* 🌈 Adaptive Refraction Rim */}
//       <Animated.View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius,
//             borderWidth: 0.75,
//             borderColor: rimHighlight,
//             // slight adaptive tint by color mode
//             shadowColor: isDark
//               ? 'rgba(255,255,255,0.15)'
//               : 'rgba(255,255,255,0.35)',
//           },
//         ]}
//       />

//       {/* 📦 Foreground content */}
//       <View style={styles.content}>{children}</View>
//     </View>
//   );
// };

// export default LiquidGlassCard;

////////////////////

// // src/components/LiquidGlassCard/LiquidGlassCard.tsx
// import React from 'react';
// import {View, StyleSheet, StyleProp, ViewStyle, Platform} from 'react-native';
// import {BlurView} from '@react-native-community/blur';

// type AppleMaterial =
//   | 'systemUltraThinMaterial'
//   | 'systemThinMaterial'
//   | 'systemMaterial'
//   | 'systemChromeMaterial';

// interface Props {
//   children?: React.ReactNode;
//   style?: StyleProp<ViewStyle>;
//   borderRadius?: number;
//   /** lower = clearer. try 6–10 for “almost clear” */
//   blurAmount?: number;
//   /** use an Apple material to avoid white tint */
//   blurType?: AppleMaterial; // iOS only
//   /** reduce blur view opacity a hair to kill remaining haze */
//   blurOpacity?: number; // 0.0–1.0
// }

// const LiquidGlassCard: React.FC<Props> = ({
//   children,
//   style,
//   borderRadius = 32,
//   blurAmount = 8,
//   blurType = 'systemUltraThinMaterial',
//   blurOpacity = 0.85,
// }) => {
//   const styles = StyleSheet.create({
//     card: {
//       overflow: 'hidden',
//       // shadows make panes look “dirty”; keep very light
//       shadowColor: '#000',
//       shadowOpacity: Platform.OS === 'ios' ? 0.04 : 0.12,
//       shadowRadius: 6,
//       shadowOffset: {width: 0, height: 4},
//       elevation: 4,
//       // IMPORTANT: no backgroundColor here — must stay fully transparent
//     },
//     content: {
//       padding: 16,
//     },
//   });

//   return (
//     <View style={[styles.card, {borderRadius}, style]}>
//       {/* PURE blur (no fill/tint layers) */}
//       <BlurView
//         style={[StyleSheet.absoluteFill, {borderRadius, opacity: blurOpacity}]}
//         blurType={blurType as any}
//         blurAmount={blurAmount}
//         reducedTransparencyFallbackColor="transparent"
//       />

//       {/* ultra-subtle rim for definition; no fill */}
//       <View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius: 32,
//             borderWidth: 1,
//             borderColor: 'rgba(255, 255, 255, 1)',
//           },
//         ]}
//       />

//       <View style={styles.content}>{children}</View>
//     </View>
//   );
// };

// export default LiquidGlassCard;

////////////////////////

// // src/components/LiquidGlassCard/LiquidGlassCard.tsx
// import React from 'react';
// import {View, StyleSheet, StyleProp, ViewStyle, Platform} from 'react-native';
// import {BlurView} from '@react-native-community/blur';

// type AppleMaterial =
//   | 'systemUltraThinMaterial'
//   | 'systemThinMaterial'
//   | 'systemMaterial'
//   | 'systemChromeMaterial';

// interface Props {
//   children?: React.ReactNode;
//   style?: StyleProp<ViewStyle>;
//   borderRadius?: number;
//   /** lower = clearer. try 6–10 for “almost clear” */
//   blurAmount?: number;
//   /** use an Apple material to avoid white tint */
//   blurType?: AppleMaterial; // iOS only
//   /** reduce blur view opacity a hair to kill remaining haze */
//   blurOpacity?: number; // 0.0–1.0
// }

// const LiquidGlassCard: React.FC<Props> = ({
//   children,
//   style,
//   borderRadius = 22,
//   blurAmount = 8,
//   blurType = 'systemUltraThinMaterial',
//   blurOpacity = 0.85,
// }) => {
//   return (
//     <View style={[styles.card, {borderRadius}, style]}>
//       {/* PURE blur (no fill/tint layers) */}
//       <BlurView
//         style={[StyleSheet.absoluteFill, {borderRadius, opacity: blurOpacity}]}
//         blurType={blurType as any}
//         blurAmount={blurAmount}
//         reducedTransparencyFallbackColor="transparent"
//       />

//       {/* ultra-subtle rim for definition; no fill */}
//       <View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius,
//             borderWidth: 1,
//             borderColor: 'rgba(255, 255, 255, 1)',
//           },
//         ]}
//       />

//       <View style={styles.content}>{children}</View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   card: {
//     overflow: 'hidden',
//     // shadows make panes look “dirty”; keep very light
//     shadowColor: '#000',
//     shadowOpacity: Platform.OS === 'ios' ? 0.04 : 0.12,
//     shadowRadius: 6,
//     shadowOffset: {width: 0, height: 4},
//     elevation: 4,
//     // IMPORTANT: no backgroundColor here — must stay fully transparent
//   },
//   content: {
//     padding: 16,
//   },
// });

// export default LiquidGlassCard;

//////////////////

// // -----------------------------------------------------------------------------
// // 🪩 LiquidGlassCard (Experimental)
// // -----------------------------------------------------------------------------
// // Emulates Apple's "Liquid Glass" material:
// // - Dynamic translucent surface
// // - Reflective tint that adapts to surrounding color
// // - Gentle parallax shimmer and light refraction illusion
// // -----------------------------------------------------------------------------

// import React, {useRef, useEffect} from 'react';
// import {
//   View,
//   Animated,
//   Easing,
//   StyleSheet,
//   StyleProp,
//   ViewStyle,
//   Platform,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';

// interface LiquidGlassCardProps {
//   children?: React.ReactNode;
//   style?: StyleProp<ViewStyle>;
//   borderRadius?: number;
//   blurAmount?: number;
//   blurType?: 'xlight' | 'light' | 'dark';
// }

// const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
//   children,
//   style,
//   borderRadius = 20,
//   blurAmount = 12,
//   blurType = 'xlight',
// }) => {
//   const shimmer = useRef(new Animated.Value(0)).current;

//   // Looping shimmer animation for light reflection
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(shimmer, {
//           toValue: 1,
//           duration: 6000,
//           easing: Easing.inOut(Easing.sin),
//           useNativeDriver: true,
//         }),
//         Animated.timing(shimmer, {
//           toValue: 0,
//           duration: 6000,
//           easing: Easing.inOut(Easing.sin),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, [shimmer]);

//   const tint = shimmer.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.09)'],
//   });

//   const highlight = shimmer.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.3)'],
//   });

//   return (
//     <View
//       style={[
//         styles.card,
//         {
//           borderRadius,
//           backgroundColor: 'rgba(255,255,255,0.02)',
//         },
//         style,
//       ]}>
//       {/* Base blur layer */}
//       <BlurView
//         style={[StyleSheet.absoluteFill, {borderRadius}]}
//         blurType={blurType}
//         blurAmount={blurAmount}
//         reducedTransparencyFallbackColor="transparent"
//       />

//       {/* Dynamic refractive tint */}
//       <Animated.View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius,
//             backgroundColor: tint,
//           },
//         ]}
//       />

//       {/* Subtle moving highlight */}
//       <Animated.View
//         pointerEvents="none"
//         style={[
//           StyleSheet.absoluteFill,
//           {
//             borderRadius,
//             borderWidth: 0.4,
//             borderColor: highlight,
//           },
//         ]}
//       />

//       <View style={styles.content}>{children}</View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   card: {
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.2,
//     shadowRadius: 10,
//     shadowOffset: {width: 0, height: 6},
//     elevation: 6,
//   },
//   content: {
//     padding: 16,
//   },
// });

// export default LiquidGlassCard;
