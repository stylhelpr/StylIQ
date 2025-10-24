// src/components/VoiceOverlay/VoiceOverlay.tsx
// -----------------------------------------------------------------------------
// 💜 VoiceOverlay — Purple Pulse Edition
// -----------------------------------------------------------------------------
// • Clean floating mic overlay (no screen blur)
// • Glowing purple pulse and ripple ring
// • Subtle frosted mic bubble
// • Smooth spring fade transitions
// -----------------------------------------------------------------------------

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'react-native-haptic-feedback';
import {useAppTheme} from '../../context/ThemeContext';
import {moderateScale, fontScale} from '../../utils/scale';
import {tokens} from '../../styles/tokens/tokens';

const {width} = Dimensions.get('window');

type Props = {
  isListening: boolean;
  partialText?: string;
};

export const VoiceOverlay: React.FC<Props> = ({isListening, partialText}) => {
  const {theme} = useAppTheme();

  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  // 🎨 Pure purple glow tone (keeps consistency across dark/light)
  const pulseColor = '#9000ffff'; // vivid violet
  const ringColor = '#b26bff'; // lighter gradient edge

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    glow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      shadowOpacity: 0.6,
      shadowRadius: 30,
    },
    ring: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      borderWidth: 2,
    },
    inner: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
    },
    micBlur: {
      width: 90,
      height: 90,
      borderRadius: 45,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    text: {
      marginTop: moderateScale(tokens.spacing.xsm),
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.medium,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
  });

  // 🔹 Animate appearance & pulse
  useEffect(() => {
    if (isListening) {
      Haptics.trigger('impactMedium');
      Animated.parallel([
        Animated.spring(fade, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 120,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(ring, {
              toValue: 1,
              duration: 2400,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ring, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]).start();
    } else {
      Haptics.trigger('impactLight');
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      pulse.stopAnimation();
      ring.stopAnimation();
    }
  }, [isListening]);

  // 🔹 Interpolations
  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: fade,
        },
      ]}>
      {/* 💜 Pulsing purple glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: pulseColor,
            transform: [{scale: glowScale}],
            opacity: glowOpacity,
            shadowColor: pulseColor,
          },
        ]}
      />

      {/* 💫 Expanding purple ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            transform: [{scale: ringScale}],
            opacity: ringOpacity,
          },
        ]}
      />

      {/* 🎙 Center frosted mic bubble */}
      <View style={styles.inner}>
        {Platform.OS === 'ios' ? (
          <BlurView
            style={styles.micBlur}
            blurType={theme.mode === 'dark' ? 'dark' : 'light'}
            blurAmount={25}
            reducedTransparencyFallbackColor={
              theme.mode === 'dark'
                ? 'rgba(80,0,130,0.4)'
                : 'rgba(161, 0, 254, 1)'
            }>
            <Icon
              name="graphic-eq"
              size={46}
              color="white"
              style={{opacity: 0.95}}
            />
          </BlurView>
        ) : (
          <View
            style={[
              styles.micBlur,
              {
                backgroundColor:
                  theme.mode === 'dark'
                    ? 'rgba(80,0,130,0.25)'
                    : 'rgba(210,150,255,0.25)',
              },
            ]}>
            <Icon
              name="graphic-eq"
              size={46}
              color={theme.colors.buttonText1}
              style={{opacity: 0.95}}
            />
          </View>
        )}

        <Text
          numberOfLines={1}
          style={[
            styles.text,
            {
              color: theme.colors.foreground,
              maxWidth: width * 0.8,
            },
          ]}>
          {isListening
            ? partialText?.length
              ? partialText
              : 'Listening...'
            : ''}
        </Text>
      </View>
    </Animated.View>
  );
};

//////////////////////

// // src/components/VoiceOverlay/VoiceOverlay.tsx
// // -----------------------------------------------------------------------------
// // 🪩 VoiceOverlay — Clean Floating Edition
// // -----------------------------------------------------------------------------
// // • No full-screen dim or fade
// // • Pulsating multi-layer glow & ripple ring
// // • Frosted glass mic aura (center only)
// // • Smooth fade in/out on listening state
// // • Works over any screen content seamlessly
// // -----------------------------------------------------------------------------

// import React, {useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   Easing,
//   Dimensions,
//   StyleSheet,
//   Platform,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// const {width} = Dimensions.get('window');

// type Props = {
//   isListening: boolean;
//   partialText?: string;
// };

// export const VoiceOverlay: React.FC<Props> = ({isListening, partialText}) => {
//   const {theme} = useAppTheme();

//   const fade = useRef(new Animated.Value(0)).current;
//   const pulse = useRef(new Animated.Value(0)).current;
//   const ring = useRef(new Animated.Value(0)).current;

//   const styles = StyleSheet.create({
//     container: {
//       position: 'absolute',
//       top: '45%',
//       alignSelf: 'center',
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 999,
//     },
//     glow: {
//       position: 'absolute',
//       width: 180,
//       height: 180,
//       borderRadius: 90,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 25,
//     },
//     ring: {
//       position: 'absolute',
//       width: 200,
//       height: 200,
//       borderRadius: 100,
//       borderWidth: 2,
//     },
//     inner: {
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     micBlur: {
//       width: 90,
//       height: 90,
//       borderRadius: 45,
//       justifyContent: 'center',
//       alignItems: 'center',
//       overflow: 'hidden',
//     },
//     text: {
//       marginTop: moderateScale(tokens.spacing.xsm),
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.medium,
//       textAlign: 'center',
//       letterSpacing: 0.3,
//     },
//   });

//   // 🔹 Animate appearance & pulse
//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.parallel([
//         Animated.spring(fade, {
//           toValue: 1,
//           useNativeDriver: true,
//           damping: 15,
//           stiffness: 120,
//         }),
//         Animated.loop(
//           Animated.sequence([
//             Animated.timing(pulse, {
//               toValue: 1,
//               duration: 900,
//               easing: Easing.inOut(Easing.quad),
//               useNativeDriver: true,
//             }),
//             Animated.timing(pulse, {
//               toValue: 0,
//               duration: 900,
//               easing: Easing.inOut(Easing.quad),
//               useNativeDriver: true,
//             }),
//           ]),
//         ),
//         Animated.loop(
//           Animated.sequence([
//             Animated.timing(ring, {
//               toValue: 1,
//               duration: 2400,
//               easing: Easing.out(Easing.quad),
//               useNativeDriver: true,
//             }),
//             Animated.timing(ring, {
//               toValue: 0,
//               duration: 0,
//               useNativeDriver: true,
//             }),
//           ]),
//         ),
//       ]).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//       pulse.stopAnimation();
//       ring.stopAnimation();
//     }
//   }, [isListening]);

//   // 🔹 Interpolations
//   const glowScale = pulse.interpolate({
//     inputRange: [0, 1],
//     outputRange: [1, 1.25],
//   });
//   const glowOpacity = pulse.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.2, 0.45],
//   });
//   const ringScale = ring.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.8, 2],
//   });
//   const ringOpacity = ring.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.35, 0],
//   });

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         styles.container,
//         {
//           opacity: fade,
//         },
//       ]}>
//       {/* 🌈 Pulsing glow */}
//       <Animated.View
//         style={[
//           styles.glow,
//           {
//             backgroundColor: theme.colors.foreground,
//             transform: [{scale: glowScale}],
//             opacity: glowOpacity,
//           },
//         ]}
//       />
//       {/* 💫 Expanding ring */}
//       <Animated.View
//         style={[
//           styles.ring,
//           {
//             borderColor: theme.colors.button1,
//             transform: [{scale: ringScale}],
//             opacity: ringOpacity,
//           },
//         ]}
//       />
//       {/* 🎙 Center blur mic + text */}
//       <View style={styles.inner}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(255, 0, 0, 1)'
//                 : 'rgba(0, 42, 255, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.foreground}
//               style={{opacity: 0.9}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(255, 0, 0, 1)'
//                     : 'rgba(204, 0, 255, 1)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.foreground}
//               style={{opacity: 0.9}}
//             />
//           </View>
//         )}
//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {
//               color: theme.colors.foreground,
//               maxWidth: width * 0.8,
//             },
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </View>
//     </Animated.View>
//   );
// };

/////////////////

// // src/components/VoiceOverlay/VoiceOverlay.tsx
// // -----------------------------------------------------------------------------
// // 🪩 VoiceOverlay 2.0 — “Future-Grade” Edition
// // -----------------------------------------------------------------------------
// // • Frosted-glass backdrop with dynamic tint
// // • Pulsating multi-layered glow + refractive ring
// // • Smooth fade / spring entry transitions
// // • Live transcription bubble that subtly types in
// // • Haptic feedback on state transitions
// // -----------------------------------------------------------------------------

// import React, {useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   Easing,
//   Dimensions,
//   StyleSheet,
//   Platform,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// const {width} = Dimensions.get('window');

// type Props = {
//   isListening: boolean;
//   partialText?: string;
// };

// export const VoiceOverlay: React.FC<Props> = ({isListening, partialText}) => {
//   const {theme} = useAppTheme();

//   const fade = useRef(new Animated.Value(0)).current;
//   const pulse = useRef(new Animated.Value(0)).current;
//   const ring = useRef(new Animated.Value(0)).current;

//   // 🔹 Animate appearance & glow loop
//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.parallel([
//         Animated.spring(fade, {
//           toValue: 1,
//           useNativeDriver: true,
//           damping: 15,
//           stiffness: 120,
//         }),
//         Animated.loop(
//           Animated.sequence([
//             Animated.timing(pulse, {
//               toValue: 1,
//               duration: 900,
//               easing: Easing.inOut(Easing.quad),
//               useNativeDriver: true,
//             }),
//             Animated.timing(pulse, {
//               toValue: 0,
//               duration: 900,
//               easing: Easing.inOut(Easing.quad),
//               useNativeDriver: true,
//             }),
//           ]),
//         ),
//         Animated.loop(
//           Animated.sequence([
//             Animated.timing(ring, {
//               toValue: 1,
//               duration: 2400,
//               easing: Easing.out(Easing.quad),
//               useNativeDriver: true,
//             }),
//             Animated.timing(ring, {
//               toValue: 0,
//               duration: 0,
//               useNativeDriver: true,
//             }),
//           ]),
//         ),
//       ]).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//       pulse.stopAnimation();
//       ring.stopAnimation();
//     }
//   }, [isListening]);

//   // 🔹 Derived transforms
//   const glowScale = pulse.interpolate({
//     inputRange: [0, 1],
//     outputRange: [1, 1.25],
//   });
//   const glowOpacity = pulse.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.15, 0.35],
//   });
//   const ringScale = ring.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.8, 2],
//   });
//   const ringOpacity = ring.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.35, 0],
//   });

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         styles.overlay,
//         {
//           opacity: fade,
//         },
//       ]}>
//       {/* 🪩 Frosted blur layer */}
//       {Platform.OS === 'ios' ? (
//         <BlurView
//           style={StyleSheet.absoluteFill}
//           blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//           blurAmount={20}
//           reducedTransparencyFallbackColor={
//             theme.mode === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'
//           }
//         />
//       ) : (
//         <View
//           style={[
//             StyleSheet.absoluteFill,
//             {
//               backgroundColor:
//                 theme.mode === 'dark'
//                   ? 'rgba(0,0,0,0.55)'
//                   : 'rgba(255,255,255,0.55)',
//             },
//           ]}
//         />
//       )}

//       {/* 🌈 Animated glow layers */}
//       <Animated.View
//         style={[
//           styles.glow,
//           {
//             backgroundColor: theme.colors.primary,
//             transform: [{scale: glowScale}],
//             opacity: glowOpacity,
//           },
//         ]}
//       />
//       <Animated.View
//         style={[
//           styles.ring,
//           {
//             borderColor: theme.colors.primary,
//             transform: [{scale: ringScale}],
//             opacity: ringOpacity,
//           },
//         ]}
//       />

//       {/* 🎙 Mic + transcript */}
//       <View style={styles.inner}>
//         <Icon
//           name="graphic-eq"
//           size={46}
//           color={theme.colors.primary}
//           style={{opacity: 0.9}}
//         />
//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {
//               color: theme.colors.foreground,
//               maxWidth: width * 0.8,
//             },
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </View>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   overlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 999,
//   },
//   glow: {
//     position: 'absolute',
//     width: 180,
//     height: 180,
//     borderRadius: 90,
//     shadowColor: '#000',
//     shadowOpacity: 0.35,
//     shadowRadius: 30,
//   },
//   ring: {
//     position: 'absolute',
//     width: 200,
//     height: 200,
//     borderRadius: 100,
//     borderWidth: 2,
//   },
//   inner: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 18,
//     paddingVertical: 12,
//   },
//   text: {
//     marginTop: moderateScale(tokens.spacing.xsm),
//     fontSize: fontScale(tokens.fontSize.lg),
//     fontWeight: tokens.fontWeight.medium,
//     textAlign: 'center',
//     letterSpacing: 0.3,
//   },
// });

//////////////////

// // src/components/VoiceOverlay/VoiceOverlay.tsx
// // -----------------------------------------------------------------------------
// // 🎙 VoiceOverlay
// // -----------------------------------------------------------------------------
// // • Pulsating waveform & glowing mic
// // • Displays live transcription while user speaks
// // • Subtle haptic feedback on start/stop
// // • Automatically fades in/out when listening state changes
// // -----------------------------------------------------------------------------

// import React, {useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   Easing,
//   StyleSheet,
//   Dimensions,
// } from 'react-native';
// import {useAppTheme} from '../../context/ThemeContext';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   isListening: boolean;
//   partialText?: string;
// };

// const {width} = Dimensions.get('window');

// export const VoiceOverlay: React.FC<Props> = ({isListening, partialText}) => {
//   const {theme} = useAppTheme();
//   const pulse = useRef(new Animated.Value(0)).current;
//   const fade = useRef(new Animated.Value(0)).current;

//   // 🔹 Start/stop pulse + fade animations
//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactLight');
//       Animated.parallel([
//         Animated.timing(fade, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//         Animated.loop(
//           Animated.sequence([
//             Animated.timing(pulse, {
//               toValue: 1,
//               duration: 800,
//               easing: Easing.inOut(Easing.quad),
//               useNativeDriver: true,
//             }),
//             Animated.timing(pulse, {
//               toValue: 0,
//               duration: 800,
//               easing: Easing.inOut(Easing.quad),
//               useNativeDriver: true,
//             }),
//           ]),
//         ),
//       ]).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 180,
//         useNativeDriver: true,
//       }).start();
//       pulse.stopAnimation();
//     }
//   }, [isListening]);

//   // 🔹 Animated scale for glow
//   const scale = pulse.interpolate({
//     inputRange: [0, 1],
//     outputRange: [1, 1.25],
//   });

//   const glowOpacity = pulse.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.15, 0.35],
//   });

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         styles.overlay,
//         {
//           opacity: fade,
//           backgroundColor:
//             theme.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
//         },
//       ]}>
//       <Animated.View
//         style={[
//           styles.glow,
//           {
//             transform: [{scale}],
//             backgroundColor: theme.colors.primary,
//             opacity: glowOpacity,
//           },
//         ]}
//       />
//       <View style={styles.inner}>
//         <Icon name="mic" size={42} color={theme.colors.primary} />
//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {color: theme.colors.foreground, maxWidth: width * 0.8},
//           ]}>
//           {partialText?.length ? partialText : 'Listening...'}
//         </Text>
//       </View>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   overlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 999,
//   },
//   glow: {
//     position: 'absolute',
//     width: 180,
//     height: 180,
//     borderRadius: 90,
//   },
//   inner: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   text: {
//     marginTop: moderateScale(tokens.spacing.xsm),
//     fontSize: fontScale(tokens.fontSize.lg),
//     fontWeight: tokens.fontWeight.medium,
//     textAlign: 'center',
//   },
// });
