import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'react-native-haptic-feedback';
import {useAppTheme} from '../../context/ThemeContext';
import {moderateScale, fontScale} from '../../utils/scale';
import {tokens} from '../../styles/tokens/tokens';
import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Canvas,
  Path,
  SweepGradient,
  RadialGradient,
  BlurMask,
  vec,
  Skia,
  PathOp,
} from '@shopify/react-native-skia';
import AnimatedReanimated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

export const VoiceOverlay: React.FC = () => {
  const {theme} = useAppTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const screen = Dimensions.get('screen');
  const winW = screen.width;
  const winH = screen.height - insets.top + 58; // extend the bottom ~40px

  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');

  // 🌈 Animation drivers
  const hueRotate = useSharedValue(0);
  const pulseDriver = useSharedValue(0);
  const [angle, setAngle] = useState(0);
  const [intensity, setIntensity] = useState(1);

  useEffect(() => {
    hueRotate.value = withRepeat(
      withTiming(360, {duration: 15000, easing: Easing.linear}),
      -1,
      false,
    );
    pulseDriver.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
        withTiming(0, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      false,
    );
  }, []);

  const scaleBreath = useDerivedValue(
    () => 1.0 + 0.004 * Math.sin(pulseDriver.value * Math.PI),
  );
  const blurBreath = useDerivedValue(
    () => 140 + 60 * Math.sin(pulseDriver.value * Math.PI),
  );

  useAnimatedReaction(
    () => ({a: hueRotate.value, s: scaleBreath.value, b: blurBreath.value}),
    v => {
      runOnJS(setAngle)(v.a);
      runOnJS(setIntensity)(v.s);
    },
  );

  useEffect(() => {
    const handleStatus = ({speech, isRecording}: any) => {
      setPartialText(speech);
      setIsListening(isRecording);
    };
    VoiceBus.on('status', handleStatus);
    return () => VoiceBus.off('status', handleStatus);
  }, []);

  useEffect(() => {
    if (isListening) {
      Haptics.trigger('impactMedium');
      Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
    } else {
      Haptics.trigger('impactLight');
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [isListening]);

  const siriColors = [
    'rgba(10,132,255,0.9)',
    'rgba(94,92,230,0.9)',
    'rgba(191,90,242,0.9)',
    'rgba(255,45,85,0.9)',
    'rgba(165, 10, 255, 0.9)',
    'rgba(215, 50, 182, 0.9)',
    'rgba(10,132,255,0.9)',
  ];

  const warmInner = [
    'rgba(255,140,100,0.7)',
    'rgba(255,100,80,0.3)',
    'rgba(255,80,60,0.1)',
    'rgba(255,60,50,0.0)',
  ];

  // Geometry
  const overscan = 50;
  const bezelRadius = 60;
  const inset = 5;

  const outer = Skia.Path.Make();
  outer.addRRect(
    Skia.RRectXY(Skia.XYWHRect(0, 0, winW, winH), bezelRadius, bezelRadius),
  );
  const inner = Skia.Path.Make();
  inner.addRRect(
    Skia.RRectXY(
      Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
      Math.max(bezelRadius - inset, 0),
      Math.max(bezelRadius - inset, 0),
    ),
  );
  outer.op(inner, PathOp.Difference);

  const innerGlow = Skia.Path.Make();
  innerGlow.addRRect(
    Skia.RRectXY(
      Skia.XYWHRect(
        inset + 3,
        inset + 3,
        winW - (inset + 3) * 2,
        winH - (inset + 3) * 2,
      ),
      bezelRadius - (inset + 3),
      bezelRadius - (inset + 3),
    ),
  );

  const styles = StyleSheet.create({
    micBlur: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      backgroundColor: 'rgba(93, 0, 255, 1)',
      borderColor: 'white',
      borderWidth: 1,
    },
    text: {
      marginTop: moderateScale(tokens.spacing.xsm),
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.medium,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: fade,
          zIndex: 9999,
          elevation: 9999,
          top: insets.top - 60, // move upward (negative brings it up)
          bottom: insets.bottom - 5, // move upward (negative crops less)
        },
      ]}>
      {isListening && (
        <AnimatedReanimated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(300)}
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{scale: scaleBreath}],
            },
          ]}>
          <Canvas style={{width: winW, height: winH}}>
            {/* Outer bright rainbow rim */}
            <Path
              path={outer}
              opacity={0.75 + 0.35 * Math.sin(pulseDriver.value * Math.PI)}>
              <SweepGradient
                c={vec(winW / 2, winH / 2)}
                colors={siriColors}
                transform={[{rotate: (angle * Math.PI) / 180}]}
              />
              <BlurMask blur={blurBreath.value * 1.5} style="solid" />
            </Path>

            {/* Inner warm inward glow */}
            <Path
              path={innerGlow}
              opacity={0.05 + 0.3 * Math.sin(pulseDriver.value * Math.PI)}>
              <RadialGradient
                c={vec(winW / 2, winH / 2)}
                r={Math.max(winW, winH) / 1.1}
                colors={warmInner}
              />
              <BlurMask blur={blurBreath.value * 2.5} style="solid" />
            </Path>
          </Canvas>
        </AnimatedReanimated.View>
      )}

      {/* 🎙 Mic + text */}
      <View
        style={{
          position: 'absolute',
          top: 115,
          bottom: 0,
          left: 10,
          right: 10,
          borderRadius: 50,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text
            numberOfLines={2}
            style={[
              styles.text,
              {
                color: theme.colors.foreground,
                maxWidth: 300,
                marginTop: 0,
                textAlign: 'center',
              },
            ]}>
            {isListening
              ? partialText?.length
                ? partialText
                : 'Listening...'
              : ''}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   StyleSheet,
//   Platform,
//   Dimensions,
// } from 'react-native';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {
//   Canvas,
//   Path,
//   SweepGradient,
//   RadialGradient,
//   BlurMask,
//   vec,
//   Skia,
//   PathOp,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   withSequence,
//   Easing,
//   useDerivedValue,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();
//   const fade = useRef(new Animated.Value(0)).current;
//   const insets = useSafeAreaInsets();

//   const screen = Dimensions.get('screen');
//   const winW = screen.width;
//   const winH = screen.height - insets.top + 58; // extend the bottom ~40px

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // 🌈 Animation drivers
//   const hueRotate = useSharedValue(0);
//   const pulseDriver = useSharedValue(0);
//   const [angle, setAngle] = useState(0);
//   const [intensity, setIntensity] = useState(1);

//   useEffect(() => {
//     hueRotate.value = withRepeat(
//       withTiming(360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     pulseDriver.value = withRepeat(
//       withSequence(
//         withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//         withTiming(0, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//       ),
//       -1,
//       false,
//     );
//   }, []);

//   const scaleBreath = useDerivedValue(
//     () => 1.0 + 0.004 * Math.sin(pulseDriver.value * Math.PI),
//   );
//   const blurBreath = useDerivedValue(
//     () => 140 + 60 * Math.sin(pulseDriver.value * Math.PI),
//   );

//   useAnimatedReaction(
//     () => ({a: hueRotate.value, s: scaleBreath.value, b: blurBreath.value}),
//     v => {
//       runOnJS(setAngle)(v.a);
//       runOnJS(setIntensity)(v.s);
//     },
//   );

//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   const siriColors = [
//     'rgba(10,132,255,0.9)',
//     'rgba(94,92,230,0.9)',
//     'rgba(191,90,242,0.9)',
//     'rgba(255,45,85,0.9)',
//     'rgba(165, 10, 255, 0.9)',
//     'rgba(215, 50, 182, 0.9)',
//     'rgba(10,132,255,0.9)',
//   ];

//   const warmInner = [
//     'rgba(255,140,100,0.7)',
//     'rgba(255,100,80,0.3)',
//     'rgba(255,80,60,0.1)',
//     'rgba(255,60,50,0.0)',
//   ];

//   // Geometry
//   const overscan = 50;
//   const bezelRadius = 60;
//   const inset = 5;

//   const outer = Skia.Path.Make();
//   outer.addRRect(
//     Skia.RRectXY(Skia.XYWHRect(0, 0, winW, winH), bezelRadius, bezelRadius),
//   );
//   const inner = Skia.Path.Make();
//   inner.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
//       Math.max(bezelRadius - inset, 0),
//       Math.max(bezelRadius - inset, 0),
//     ),
//   );
//   outer.op(inner, PathOp.Difference);

//   const innerGlow = Skia.Path.Make();
//   innerGlow.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(
//         inset + 3,
//         inset + 3,
//         winW - (inset + 3) * 2,
//         winH - (inset + 3) * 2,
//       ),
//       bezelRadius - (inset + 3),
//       bezelRadius - (inset + 3),
//     ),
//   );

//   const styles = StyleSheet.create({
//     micBlur: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       justifyContent: 'center',
//       alignItems: 'center',
//       overflow: 'hidden',
//       backgroundColor: 'rgba(93, 0, 255, 1)',
//       borderColor: 'white',
//       borderWidth: 1,
//     },
//     text: {
//       marginTop: moderateScale(tokens.spacing.xsm),
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.medium,
//       textAlign: 'center',
//       letterSpacing: 0.3,
//     },
//   });

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         StyleSheet.absoluteFill,
//         {
//           opacity: fade,
//           zIndex: 9999,
//           elevation: 9999,
//           top: insets.top - 60, // move upward (negative brings it up)
//           bottom: insets.bottom - 5, // move upward (negative crops less)
//         },
//       ]}>
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={[
//             StyleSheet.absoluteFill,
//             {
//               transform: [{scale: scaleBreath}],
//             },
//           ]}>
//           <Canvas style={{width: winW, height: winH}}>
//             {/* Outer bright rainbow rim */}
//             <Path
//               path={outer}
//               opacity={0.75 + 0.35 * Math.sin(pulseDriver.value * Math.PI)}>
//               <SweepGradient
//                 c={vec(winW / 2, winH / 2)}
//                 colors={siriColors}
//                 transform={[{rotate: (angle * Math.PI) / 180}]}
//               />
//               <BlurMask blur={blurBreath.value * 1.5} style="solid" />
//             </Path>

//             {/* Inner warm inward glow */}
//             <Path
//               path={innerGlow}
//               opacity={0.05 + 0.3 * Math.sin(pulseDriver.value * Math.PI)}>
//               <RadialGradient
//                 c={vec(winW / 2, winH / 2)}
//                 r={Math.max(winW, winH) / 1.1}
//                 colors={warmInner}
//               />
//               <BlurMask blur={blurBreath.value * 2.5} style="solid" />
//             </Path>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* 🎙 Mic + text */}
//       <SafeAreaView
//         style={{
//           alignItems: 'center',
//           position: 'absolute',
//           top: '39%',
//           left: 0,
//           right: 0,
//           transform: [{translateY: -45}],
//         }}>
//         <View
//           style={{
//             backgroundColor: 'rgba(0, 0, 0, 0.49)',
//             width: 250,
//             height: 250,
//             borderRadius: 150,
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <Text
//             numberOfLines={2}
//             style={[
//               styles.text,
//               {
//                 color: theme.colors.foreground,
//                 maxWidth: 160,
//                 marginTop: 0,
//                 textAlign: 'center',
//               },
//             ]}>
//             {isListening
//               ? partialText?.length
//                 ? partialText
//                 : 'Listening...'
//               : ''}
//           </Text>
//         </View>
//       </SafeAreaView>
//     </Animated.View>
//   );
// };

// //////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   StyleSheet,
//   Platform,
//   Dimensions,
//   SafeAreaView,
// } from 'react-native';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
// import {
//   Canvas,
//   Path,
//   SweepGradient,
//   RadialGradient,
//   BlurMask,
//   vec,
//   Skia,
//   PathOp,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   withSequence,
//   Easing,
//   useDerivedValue,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();
//   const fade = useRef(new Animated.Value(0)).current;
//   const insets = useSafeAreaInsets();

//   const screen = Dimensions.get('screen');
//   const winW = screen.width;
//   const winH = screen.height - insets.top + 40; // extend the bottom ~40px

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // 🌈 Animation drivers
//   const hueRotate = useSharedValue(0);
//   const pulseDriver = useSharedValue(0);
//   const [angle, setAngle] = useState(0);
//   const [intensity, setIntensity] = useState(1);

//   useEffect(() => {
//     hueRotate.value = withRepeat(
//       withTiming(360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     pulseDriver.value = withRepeat(
//       withSequence(
//         withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//         withTiming(0, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//       ),
//       -1,
//       false,
//     );
//   }, []);

//   const scaleBreath = useDerivedValue(
//     () => 1.03 + 0.009 * Math.sin(pulseDriver.value * Math.PI),
//   );
//   const blurBreath = useDerivedValue(
//     () => 140 + 60 * Math.sin(pulseDriver.value * Math.PI),
//   );

//   useAnimatedReaction(
//     () => ({a: hueRotate.value, s: scaleBreath.value, b: blurBreath.value}),
//     v => {
//       runOnJS(setAngle)(v.a);
//       runOnJS(setIntensity)(v.s);
//     },
//   );

//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   const siriColors = [
//     'rgba(10,132,255,0.9)',
//     'rgba(94,92,230,0.9)',
//     'rgba(191,90,242,0.9)',
//     'rgba(255,45,85,0.9)',
//     'rgba(255,214,10,0.9)',
//     'rgba(50,215,75,0.9)',
//     'rgba(10,132,255,0.9)',
//   ];

//   const warmInner = [
//     'rgba(255,140,100,0.7)',
//     'rgba(255,100,80,0.3)',
//     'rgba(255,80,60,0.1)',
//     'rgba(255,60,50,0.0)',
//   ];

//   // Geometry
//   const overscan = 0;
//   const bezelRadius = 60;
//   const inset = 12;

//   const outer = Skia.Path.Make();
//   outer.addRRect(
//     Skia.RRectXY(Skia.XYWHRect(0, 0, winW, winH), bezelRadius, bezelRadius),
//   );
//   const inner = Skia.Path.Make();
//   inner.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
//       Math.max(bezelRadius - inset, 0),
//       Math.max(bezelRadius - inset, 0),
//     ),
//   );
//   outer.op(inner, PathOp.Difference);

//   const innerGlow = Skia.Path.Make();
//   innerGlow.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(
//         inset + 3,
//         inset + 3,
//         winW - (inset + 3) * 2,
//         winH - (inset + 3) * 2,
//       ),
//       bezelRadius - (inset + 3),
//       bezelRadius - (inset + 3),
//     ),
//   );

//   const styles = StyleSheet.create({
//     micBlur: {
//       width: 120,
//       height: 120,
//       borderRadius: 65,
//       justifyContent: 'center',
//       alignItems: 'center',
//       overflow: 'hidden',
//       backgroundColor: 'rgba(81, 255, 0, 1)',
//     },
//     text: {
//       marginTop: moderateScale(tokens.spacing.xsm),
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.medium,
//       textAlign: 'center',
//       letterSpacing: 0.3,
//     },
//   });

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         StyleSheet.absoluteFillObject,
//         {
//           opacity: fade,
//           zIndex: 9999,
//           elevation: 9999,
//           top: insets.top - 52, // move upward (negative brings it up)
//           bottom: insets.bottom - 0, // move upward (negative crops less)
//         },
//       ]}>
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={[
//             StyleSheet.absoluteFillObject,
//             {
//               transform: [{scale: scaleBreath}],
//             },
//           ]}>
//           <Canvas style={{width: winW, height: winH}}>
//             {/* Outer bright rainbow rim */}
//             <Path
//               path={outer}
//               opacity={0.75 + 0.35 * Math.sin(pulseDriver.value * Math.PI)}>
//               <SweepGradient
//                 c={vec(winW / 2, winH / 2)}
//                 colors={siriColors}
//                 transform={[{rotate: (angle * Math.PI) / 180}]}
//               />
//               <BlurMask blur={blurBreath.value * 1.5} style="solid" />
//             </Path>

//             {/* Inner warm inward glow */}
//             <Path
//               path={innerGlow}
//               opacity={0.05 + 0.3 * Math.sin(pulseDriver.value * Math.PI)}>
//               <RadialGradient
//                 c={vec(winW / 2, winH / 2)}
//                 r={Math.max(winW, winH) / 1.1}
//                 colors={warmInner}
//               />
//               <BlurMask blur={blurBreath.value * 2.5} style="solid" />
//             </Path>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* 🎙 Mic + text */}
//       <SafeAreaView
//         style={{
//           alignItems: 'center',
//           position: 'absolute',
//           top: '50%',
//           left: 0,
//           right: 0,
//           transform: [{translateY: -45}],
//         }}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={66}
//               color={'rgba(0, 0, 0, 1)'}
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
//             />
//           </View>
//         )}

//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {color: theme.colors.foreground, maxWidth: winW * 0.8},
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </SafeAreaView>
//     </Animated.View>
//   );
// };

/////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   StyleSheet,
//   Platform,
//   Dimensions,
//   SafeAreaView,
// } from 'react-native';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
// import {
//   Canvas,
//   Path,
//   SweepGradient,
//   RadialGradient,
//   BlurMask,
//   vec,
//   Skia,
//   PathOp,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   withSequence,
//   Easing,
//   useDerivedValue,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();
//   const fade = useRef(new Animated.Value(0)).current;
//   const insets = useSafeAreaInsets();

//   const screen = Dimensions.get('screen');
//   const winW = screen.width;
//   const winH = screen.height - insets.top + 40; // extend the bottom ~40px

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // 🌈 Animation drivers
//   const hueRotate = useSharedValue(0);
//   const pulseDriver = useSharedValue(0);
//   const [angle, setAngle] = useState(0);
//   const [intensity, setIntensity] = useState(1);

//   useEffect(() => {
//     hueRotate.value = withRepeat(
//       withTiming(360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     pulseDriver.value = withRepeat(
//       withSequence(
//         withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//         withTiming(0, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//       ),
//       -1,
//       false,
//     );
//   }, []);

//   const scaleBreath = useDerivedValue(
//     () => 1.03 + 0.009 * Math.sin(pulseDriver.value * Math.PI),
//   );
//   const blurBreath = useDerivedValue(
//     () => 140 + 60 * Math.sin(pulseDriver.value * Math.PI),
//   );

//   useAnimatedReaction(
//     () => ({a: hueRotate.value, s: scaleBreath.value, b: blurBreath.value}),
//     v => {
//       runOnJS(setAngle)(v.a);
//       runOnJS(setIntensity)(v.s);
//     },
//   );

//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   const siriColors = [
//     'rgba(10,132,255,0.9)',
//     'rgba(94,92,230,0.9)',
//     'rgba(191,90,242,0.9)',
//     'rgba(255,45,85,0.9)',
//     'rgba(255,214,10,0.9)',
//     'rgba(50,215,75,0.9)',
//     'rgba(10,132,255,0.9)',
//   ];

//   const warmInner = [
//     'rgba(255,140,100,0.7)',
//     'rgba(255,100,80,0.3)',
//     'rgba(255,80,60,0.1)',
//     'rgba(255,60,50,0.0)',
//   ];

//   // Geometry
//   const overscan = 0;
//   const bezelRadius = 60;
//   const inset = 12;

//   const outer = Skia.Path.Make();
//   outer.addRRect(
//     Skia.RRectXY(Skia.XYWHRect(0, 0, winW, winH), bezelRadius, bezelRadius),
//   );
//   const inner = Skia.Path.Make();
//   inner.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
//       Math.max(bezelRadius - inset, 0),
//       Math.max(bezelRadius - inset, 0),
//     ),
//   );
//   outer.op(inner, PathOp.Difference);

//   const innerGlow = Skia.Path.Make();
//   innerGlow.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(
//         inset + 3,
//         inset + 3,
//         winW - (inset + 3) * 2,
//         winH - (inset + 3) * 2,
//       ),
//       bezelRadius - (inset + 3),
//       bezelRadius - (inset + 3),
//     ),
//   );

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         StyleSheet.absoluteFillObject,
//         {
//           opacity: fade,
//           zIndex: 9999,
//           elevation: 9999,
//           top: insets.top - 52, // move upward (negative brings it up)
//           bottom: insets.bottom - 0, // move upward (negative crops less)
//         },
//       ]}>
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={[
//             StyleSheet.absoluteFillObject,
//             {
//               transform: [{scale: scaleBreath}],
//             },
//           ]}>
//           <Canvas style={{width: winW, height: winH}}>
//             {/* Outer bright rainbow rim */}
//             <Path
//               path={outer}
//               opacity={0.75 + 0.25 * Math.sin(pulseDriver.value * Math.PI)}>
//               <SweepGradient
//                 c={vec(winW / 2, winH / 2)}
//                 colors={siriColors}
//                 transform={[{rotate: (angle * Math.PI) / 180}]}
//               />
//               <BlurMask blur={blurBreath.value * 1.5} style="solid" />
//             </Path>

//             {/* Inner warm inward glow */}
//             <Path
//               path={innerGlow}
//               opacity={0.45 + 0.3 * Math.sin(pulseDriver.value * Math.PI)}>
//               <RadialGradient
//                 c={vec(winW / 2, winH / 2)}
//                 r={Math.max(winW, winH) / 1.1}
//                 colors={warmInner}
//               />
//               <BlurMask blur={blurBreath.value * 2.5} style="solid" />
//             </Path>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* 🎙 Mic + text */}
//       <SafeAreaView
//         style={{
//           alignItems: 'center',
//           position: 'absolute',
//           top: '50%',
//           left: 0,
//           right: 0,
//           transform: [{translateY: -45}],
//         }}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color="white"
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
//             />
//           </View>
//         )}

//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {color: theme.colors.foreground, maxWidth: winW * 0.8},
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </SafeAreaView>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   micBlur: {
//     width: 90,
//     height: 90,
//     borderRadius: 45,
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   text: {
//     marginTop: moderateScale(tokens.spacing.xsm),
//     fontSize: fontScale(tokens.fontSize.lg),
//     fontWeight: tokens.fontWeight.medium,
//     textAlign: 'center',
//     letterSpacing: 0.3,
//   },
// });

////////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   StyleSheet,
//   Platform,
//   useWindowDimensions,
//   SafeAreaView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
// import {
//   Canvas,
//   Path,
//   SweepGradient,
//   RadialGradient,
//   BlurMask,
//   vec,
//   Skia,
//   PathOp,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   withSequence,
//   Easing,
//   useDerivedValue,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();
//   const fade = useRef(new Animated.Value(0)).current;
//   const {width: winW, height: winH} = useWindowDimensions();

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // 🌈 Animation drivers
//   const hueRotate = useSharedValue(0);
//   const pulseDriver = useSharedValue(0);
//   const [angle, setAngle] = useState(0);
//   const [intensity, setIntensity] = useState(1);

//   useEffect(() => {
//     hueRotate.value = withRepeat(
//       withTiming(360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     pulseDriver.value = withRepeat(
//       withSequence(
//         withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//         withTiming(0, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//       ),
//       -1,
//       false,
//     );
//   }, []);

//   const scaleBreath = useDerivedValue(
//     () => 1.03 + 0.01 * Math.sin(pulseDriver.value * Math.PI),
//   );

//   // 🌫 deeper, softer glow
//   const blurBreath = useDerivedValue(
//     () => 140 + 60 * Math.sin(pulseDriver.value * Math.PI),
//   );

//   useAnimatedReaction(
//     () => ({a: hueRotate.value, s: scaleBreath.value, b: blurBreath.value}),
//     v => {
//       runOnJS(setAngle)(v.a);
//       runOnJS(setIntensity)(v.s);
//     },
//   );

//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   // 🌈 outer cold ring colors
//   const siriColors = [
//     'rgba(10,132,255,0.9)',
//     'rgba(94,92,230,0.9)',
//     'rgba(191,90,242,0.9)',
//     'rgba(255,45,85,0.9)',
//     'rgba(255,214,10,0.9)',
//     'rgba(50,215,75,0.9)',
//     'rgba(10,132,255,0.9)',
//   ];

//   // 🔥 inner warmth bleed
//   const warmInner = [
//     'rgba(255,100,80,0.0)',
//     'rgba(255,130,90,0.3)',
//     'rgba(255,160,100,0.45)',
//     'rgba(255,120,80,0.6)',
//     'rgba(255,100,80,0.0)',
//   ];

//   // rim path geometry
//   const overscan = 5;
//   const bezelRadius = 80;
//   const inset = 15;

//   const outer = Skia.Path.Make();
//   outer.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(
//         -overscan,
//         -overscan,
//         winW + overscan * 2,
//         winH + overscan * 2,
//       ),
//       bezelRadius,
//       bezelRadius,
//     ),
//   );
//   const inner = Skia.Path.Make();
//   inner.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
//       Math.max(bezelRadius - inset, 0),
//       Math.max(bezelRadius - inset, 0),
//     ),
//   );
//   outer.op(inner, PathOp.Difference);

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         StyleSheet.absoluteFillObject,
//         {opacity: fade, zIndex: 9999, elevation: 9999},
//       ]}>
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={[
//             StyleSheet.absoluteFillObject,
//             {
//               transform: [{scale: scaleBreath}],
//             },
//           ]}>
//           <Canvas style={StyleSheet.absoluteFillObject}>
//             {/* Outer rainbow rim */}
//             <Path
//               path={outer}
//               opacity={0.75 + 0.25 * Math.sin(pulseDriver.value * Math.PI)}>
//               <SweepGradient
//                 c={vec(winW / 2, winH / 2)}
//                 colors={siriColors}
//                 transform={[{rotate: (angle * Math.PI) / 180}]}
//               />
//               <BlurMask blur={blurBreath.value * 1.8} style="solid" />
//             </Path>

//             {/* Inner warm inward glow */}
//             <Path
//               path={outer}
//               opacity={0.35 + 0.25 * Math.sin(pulseDriver.value * Math.PI)}>
//               <RadialGradient
//                 c={vec(winW / 2, winH / 2)}
//                 r={Math.max(winW, winH) / 1.2}
//                 colors={warmInner}
//               />
//               <BlurMask blur={blurBreath.value * 1.8} style="solid" />
//             </Path>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* 🎙 Mic + text */}
//       <SafeAreaView
//         style={{
//           alignItems: 'center',
//           position: 'absolute',
//           top: '50%',
//           left: 0,
//           right: 0,
//           transform: [{translateY: -45}],
//         }}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color="white"
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
//             />
//           </View>
//         )}

//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {color: theme.colors.foreground, maxWidth: winW * 0.8},
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </SafeAreaView>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   micBlur: {
//     width: 90,
//     height: 90,
//     borderRadius: 45,
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   text: {
//     marginTop: moderateScale(tokens.spacing.xsm),
//     fontSize: fontScale(tokens.fontSize.lg),
//     fontWeight: tokens.fontWeight.medium,
//     textAlign: 'center',
//     letterSpacing: 0.3,
//   },
// });

///////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   StyleSheet,
//   Platform,
//   useWindowDimensions,
//   SafeAreaView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
// import {
//   Canvas,
//   Path,
//   SweepGradient,
//   RadialGradient,
//   BlurMask,
//   vec,
//   Skia,
//   PathOp,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   withSequence,
//   Easing,
//   useDerivedValue,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();
//   const fade = useRef(new Animated.Value(0)).current;
//   const {width: winW, height: winH} = useWindowDimensions();

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // 🌈 Animation drivers
//   const hueRotate = useSharedValue(0);
//   const pulseDriver = useSharedValue(0);
//   const [angle, setAngle] = useState(0);
//   const [intensity, setIntensity] = useState(1);

//   useEffect(() => {
//     hueRotate.value = withRepeat(
//       withTiming(360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     pulseDriver.value = withRepeat(
//       withSequence(
//         withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//         withTiming(0, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//       ),
//       -1,
//       false,
//     );
//   }, []);

//   const scaleBreath = useDerivedValue(
//     () => 1.03 + 0.01 * Math.sin(pulseDriver.value * Math.PI),
//   );

//   // 🌫 deeper, softer glow
//   const blurBreath = useDerivedValue(
//     () => 140 + 60 * Math.sin(pulseDriver.value * Math.PI),
//   );

//   useAnimatedReaction(
//     () => ({a: hueRotate.value, s: scaleBreath.value, b: blurBreath.value}),
//     v => {
//       runOnJS(setAngle)(v.a);
//       runOnJS(setIntensity)(v.s);
//     },
//   );

//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   // 🌈 outer cold ring colors
//   const siriColors = [
//     'rgba(10,132,255,0.9)',
//     'rgba(94,92,230,0.9)',
//     'rgba(191,90,242,0.9)',
//     'rgba(255,45,85,0.9)',
//     'rgba(255,214,10,0.9)',
//     'rgba(50,215,75,0.9)',
//     'rgba(10,132,255,0.9)',
//   ];

//   // 🔥 inner warmth bleed
//   const warmInner = [
//     'rgba(255,100,80,0.0)',
//     'rgba(255,130,90,0.3)',
//     'rgba(255,160,100,0.45)',
//     'rgba(255,120,80,0.6)',
//     'rgba(255,100,80,0.0)',
//   ];

//   // rim path geometry
//   const overscan = 5;
//   const bezelRadius = 80;
//   const inset = 15;

//   const outer = Skia.Path.Make();
//   outer.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(
//         -overscan,
//         -overscan,
//         winW + overscan * 2,
//         winH + overscan * 2,
//       ),
//       bezelRadius,
//       bezelRadius,
//     ),
//   );
//   const inner = Skia.Path.Make();
//   inner.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
//       Math.max(bezelRadius - inset, 0),
//       Math.max(bezelRadius - inset, 0),
//     ),
//   );
//   outer.op(inner, PathOp.Difference);

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         StyleSheet.absoluteFillObject,
//         {opacity: fade, zIndex: 9999, elevation: 9999},
//       ]}>
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={[
//             StyleSheet.absoluteFillObject,
//             {
//               transform: [{scale: scaleBreath}],
//             },
//           ]}>
//           <Canvas style={StyleSheet.absoluteFillObject}>
//             {/* Outer rainbow rim */}
//             <Path
//               path={outer}
//               opacity={0.75 + 0.25 * Math.sin(pulseDriver.value * Math.PI)}>
//               <SweepGradient
//                 c={vec(winW / 2, winH / 2)}
//                 colors={siriColors}
//                 transform={[{rotate: (angle * Math.PI) / 180}]}
//               />
//               <BlurMask blur={blurBreath.value * 1.8} style="solid" />
//             </Path>

//             {/* Inner warm inward glow */}
//             <Path
//               path={outer}
//               opacity={0.35 + 0.25 * Math.sin(pulseDriver.value * Math.PI)}>
//               <RadialGradient
//                 c={vec(winW / 2, winH / 2)}
//                 r={Math.max(winW, winH) / 1.2}
//                 colors={warmInner}
//               />
//               <BlurMask blur={blurBreath.value * 1.8} style="solid" />
//             </Path>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* 🎙 Mic + text */}
//       <SafeAreaView
//         style={{
//           alignItems: 'center',
//           position: 'absolute',
//           top: '50%',
//           left: 0,
//           right: 0,
//           transform: [{translateY: -45}],
//         }}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color="white"
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
//             />
//           </View>
//         )}

//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {color: theme.colors.foreground, maxWidth: winW * 0.8},
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </SafeAreaView>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   micBlur: {
//     width: 90,
//     height: 90,
//     borderRadius: 45,
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   text: {
//     marginTop: moderateScale(tokens.spacing.xsm),
//     fontSize: fontScale(tokens.fontSize.lg),
//     fontWeight: tokens.fontWeight.medium,
//     textAlign: 'center',
//     letterSpacing: 0.3,
//   },
// });

/////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   StyleSheet,
//   Platform,
//   useWindowDimensions,
//   SafeAreaView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
// import {
//   Canvas,
//   Path,
//   SweepGradient,
//   BlurMask,
//   vec,
//   Skia,
//   PathOp,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   withSequence,
//   Easing,
//   useDerivedValue,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();
//   const fade = useRef(new Animated.Value(0)).current;
//   const {width: winW, height: winH} = useWindowDimensions();

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // 🌈 Animation drivers
//   const hueRotate = useSharedValue(0); // gradient rotation
//   const pulseDriver = useSharedValue(0); // breathing + brightness
//   const [angle, setAngle] = useState(0);
//   const [intensity, setIntensity] = useState(1);

//   useEffect(() => {
//     // continuous gradient rotation (liquid light)
//     hueRotate.value = withRepeat(
//       withTiming(360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     // breathing + glow pulse
//     pulseDriver.value = withRepeat(
//       withSequence(
//         withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//         withTiming(0, {duration: 1800, easing: Easing.inOut(Easing.ease)}),
//       ),
//       -1,
//       false,
//     );
//   }, []);

//   const scaleBreath = useDerivedValue(
//     () => 1.03 + 0.005 * Math.sin(pulseDriver.value * Math.PI),
//   );
//   const blurBreath = useDerivedValue(
//     () => 140 + 60 * Math.sin(pulseDriver.value * Math.PI),
//   );
//   useAnimatedReaction(
//     () => ({a: hueRotate.value, s: scaleBreath.value, b: blurBreath.value}),
//     v => {
//       runOnJS(setAngle)(v.a);
//       runOnJS(setIntensity)(v.s); // reusing intensity to drive scale
//     },
//   );

//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   const siriColors = [
//     '#0A84FF',
//     '#5E5CE6',
//     '#BF5AF2',
//     '#FF2D55',
//     '#FFD60A',
//     '#32D74B',
//     '#0A84FF',
//   ];

//   // rim path
//   const overscan = 15;
//   const bezelRadius = 80;
//   const inset = 15;

//   const outer = Skia.Path.Make();
//   outer.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(
//         -overscan,
//         -overscan,
//         winW + overscan * 2,
//         winH + overscan * 2,
//       ),
//       bezelRadius,
//       bezelRadius,
//     ),
//   );
//   const inner = Skia.Path.Make();
//   inner.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
//       Math.max(bezelRadius - inset, 0),
//       Math.max(bezelRadius - inset, 0),
//     ),
//   );
//   outer.op(inner, PathOp.Difference);

//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         StyleSheet.absoluteFillObject,
//         {opacity: fade, zIndex: 9999, elevation: 9999},
//       ]}>
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={[
//             StyleSheet.absoluteFillObject,
//             {
//               transform: [{scale: scaleBreath}],
//             },
//           ]}>
//           <Canvas style={StyleSheet.absoluteFillObject}>
//             <Path path={outer}>
//               <SweepGradient
//                 c={vec(winW / 2, winH / 2)}
//                 colors={siriColors}
//                 transform={[{rotate: (angle * Math.PI) / 180}]}
//               />
//               <BlurMask blur={blurBreath.valueOf()} style="solid" />
//             </Path>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* 🎙 Mic + text */}
//       <SafeAreaView
//         style={{
//           alignItems: 'center',
//           position: 'absolute',
//           top: '50%',
//           left: 0,
//           right: 0,
//           transform: [{translateY: -45}],
//         }}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color="white"
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
//             />
//           </View>
//         )}

//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {color: theme.colors.foreground, maxWidth: winW * 0.8},
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </SafeAreaView>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   micBlur: {
//     width: 90,
//     height: 90,
//     borderRadius: 45,
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   text: {
//     marginTop: moderateScale(tokens.spacing.xsm),
//     fontSize: fontScale(tokens.fontSize.lg),
//     fontWeight: tokens.fontWeight.medium,
//     textAlign: 'center',
//     letterSpacing: 0.3,
//   },
// });

////////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   StyleSheet,
//   Platform,
//   useWindowDimensions,
//   SafeAreaView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Haptics from 'react-native-haptic-feedback';
// import {useAppTheme} from '../../context/ThemeContext';
// import {moderateScale, fontScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';
// import {
//   Canvas,
//   Path,
//   SweepGradient,
//   BlurMask,
//   vec,
//   Skia,
//   PathOp,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   Easing,
//   useDerivedValue,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();
//   const fade = useRef(new Animated.Value(0)).current;
//   const {width: winW, height: winH} = useWindowDimensions();

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // animation drivers
//   const rot = useSharedValue(0);
//   const driver = useSharedValue(0);
//   const [angle, setAngle] = useState(0);
//   const [intensity, setIntensity] = useState(1);

//   useEffect(() => {
//     rot.value = withRepeat(
//       withTiming(360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     driver.value = withRepeat(
//       withTiming(2 * Math.PI, {duration: 3000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//   }, []);

//   const pulse = useDerivedValue(() => 1 + 0.15 * Math.sin(driver.value));
//   useAnimatedReaction(
//     () => ({a: rot.value, p: pulse.value}),
//     v => {
//       runOnJS(setAngle)(v.a);
//       runOnJS(setIntensity)(v.p);
//     },
//   );

//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {toValue: 1, useNativeDriver: true}).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   const siriColors = [
//     '#0A84FF',
//     '#5E5CE6',
//     '#BF5AF2',
//     '#FF2D55',
//     '#FFD60A',
//     '#32D74B',
//     '#0A84FF',
//   ];

//   // full-screen glow path
//   const overscan = 24;
//   const bezelRadius = 46;
//   const inset = 14;

//   const outer = Skia.Path.Make();
//   outer.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(
//         -overscan,
//         -overscan,
//         winW + overscan * 2,
//         winH + overscan * 2,
//       ),
//       bezelRadius,
//       bezelRadius,
//     ),
//   );

//   const inner = Skia.Path.Make();
//   inner.addRRect(
//     Skia.RRectXY(
//       Skia.XYWHRect(inset, inset, winW - inset * 2, winH - inset * 2),
//       Math.max(bezelRadius - inset, 0),
//       Math.max(bezelRadius - inset, 0),
//     ),
//   );
//   outer.op(inner, PathOp.Difference);

//   // ---- render ----
//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[
//         StyleSheet.absoluteFillObject, // ✅ fills actual screen, not parent layout
//         {opacity: fade, zIndex: 9999, elevation: 9999},
//       ]}>
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={StyleSheet.absoluteFillObject}>
//           <Canvas style={StyleSheet.absoluteFillObject}>
//             <Path path={outer}>
//               <SweepGradient
//                 c={vec(winW / 2, winH / 2)}
//                 colors={siriColors}
//                 transform={[{rotate: (angle * Math.PI) / 180}]}
//               />
//               <BlurMask blur={90 * intensity} style="solid" />
//             </Path>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* mic + text */}
//       <SafeAreaView
//         style={{
//           alignItems: 'center',
//           position: 'absolute',
//           top: '50%',
//           left: 0,
//           right: 0,
//           transform: [{translateY: -45}],
//         }}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color="white"
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
//             />
//           </View>
//         )}

//         <Text
//           numberOfLines={1}
//           style={[
//             styles.text,
//             {color: theme.colors.foreground, maxWidth: winW * 0.8},
//           ]}>
//           {isListening
//             ? partialText?.length
//               ? partialText
//               : 'Listening...'
//             : ''}
//         </Text>
//       </SafeAreaView>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   micBlur: {
//     width: 90,
//     height: 90,
//     borderRadius: 45,
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   text: {
//     marginTop: moderateScale(tokens.spacing.xsm),
//     fontSize: fontScale(tokens.fontSize.lg),
//     fontWeight: tokens.fontWeight.medium,
//     textAlign: 'center',
//     letterSpacing: 0.3,
//   },
// });

/////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Animated,
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
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';

// // 🟣 Skia imports
// import {
//   Canvas,
//   Circle,
//   SweepGradient,
//   LinearGradient,
//   Group,
//   vec,
//   BlurMask,
// } from '@shopify/react-native-skia';
// import AnimatedReanimated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   Easing,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
//   useDerivedValue,
// } from 'react-native-reanimated';

// const {width} = Dimensions.get('window');
// const ORB_SIZE = 260;
// const CENTER = vec(ORB_SIZE / 2, ORB_SIZE / 2);

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();

//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   const fade = useRef(new Animated.Value(0)).current;

//   // ------------------------------------------------------------
//   // 🟣 Skia Orb Animation Logic
//   // ------------------------------------------------------------
//   const rot1 = useSharedValue(0);
//   const rot2 = useSharedValue(0);
//   const driver = useSharedValue(0);
//   const [s1, setS1] = useState(1);
//   const [r1, setR1] = useState(0);
//   const [r2, setR2] = useState(0);

//   React.useEffect(() => {
//     rot1.value = withRepeat(
//       withTiming(360, {duration: 12000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     rot2.value = withRepeat(
//       withTiming(-360, {duration: 15000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     driver.value = withRepeat(
//       withTiming(2 * Math.PI, {duration: 3200, easing: Easing.linear}),
//       -1,
//       false,
//     );
//   }, []);

//   const pulse = useDerivedValue(() => 1.01 + 0.05 * Math.sin(driver.value));

//   useAnimatedReaction(
//     () => ({p: pulse.value, a: rot1.value, b: rot2.value}),
//     v => {
//       runOnJS(setS1)(v.p);
//       runOnJS(setR1)(v.a);
//       runOnJS(setR2)(v.b);
//     },
//   );

//   // ------------------------------------------------------------
//   // 🔊 VoiceBus Subscriptions + Fade
//   // ------------------------------------------------------------
//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => VoiceBus.off('status', handleStatus);
//   }, []);

//   useEffect(() => {
//     if (isListening) {
//       Haptics.trigger('impactMedium');
//       Animated.spring(fade, {
//         toValue: 1,
//         useNativeDriver: true,
//       }).start();
//     } else {
//       Haptics.trigger('impactLight');
//       Animated.timing(fade, {
//         toValue: 0,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [isListening]);

//   // ------------------------------------------------------------
//   // 🖌️ Styles
//   // ------------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {
//       position: 'absolute',
//       top: 0,
//       bottom: 0,
//       left: 0,
//       right: 0,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 999,
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
//     canvas: {
//       width: ORB_SIZE,
//       height: ORB_SIZE,
//       backgroundColor: 'transparent',
//       borderRadius: ORB_SIZE / 2,
//       overflow: 'hidden',
//     },
//   });

//   // ------------------------------------------------------------
//   // 🎨 Render
//   // ------------------------------------------------------------
//   return (
//     <Animated.View
//       pointerEvents="none"
//       style={[styles.container, {opacity: fade}]}>
//       {/* 🔮 Skia Orb */}
//       {isListening && (
//         <AnimatedReanimated.View
//           entering={FadeIn.duration(400)}
//           exiting={FadeOut.duration(300)}
//           style={{transform: [{scale: s1}]}}>
//           <Canvas style={styles.canvas}>
//             {/* Layer 1: soft blue-purple base */}
//             <Group transform={[{rotate: (r1 * Math.PI) / 180}]} origin={CENTER}>
//               <Circle cx={CENTER.x} cy={CENTER.y} r={120}>
//                 <SweepGradient
//                   c={CENTER}
//                   colors={['#60A5FA', '#A78BFA', '#93C5FD', '#60A5FA']}
//                 />
//                 <BlurMask blur={45} style="solid" />
//               </Circle>
//             </Group>

//             {/* Layer 2: warmer pink flow */}
//             <Group transform={[{rotate: (r2 * Math.PI) / 180}]} origin={CENTER}>
//               <Circle cx={CENTER.x} cy={CENTER.y} r={110}>
//                 <LinearGradient
//                   start={vec(0, 0)}
//                   end={vec(ORB_SIZE, ORB_SIZE)}
//                   colors={['#F9A8D4', '#A5B4FC', '#fa0000ff']}
//                 />
//                 <BlurMask blur={30} style="normal" />
//               </Circle>
//             </Group>

//             {/* Inner glow */}
//             <Circle cx={CENTER.x} cy={CENTER.y} r={40} color="rgba(0,17,255,1)">
//               <BlurMask blur={25} style="normal" />
//             </Circle>
//           </Canvas>
//         </AnimatedReanimated.View>
//       )}

//       {/* 🎙 Frosted mic bubble + live speech */}
//       <View style={{alignItems: 'center', position: 'absolute'}}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color="white"
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
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

/////////////////////

// src/components/VoiceOverlay/VoiceOverlay.tsx
// -----------------------------------------------------------------------------
// 💜 VoiceOverlay — Purple Pulse Edition (Global Reactive Version)
// -----------------------------------------------------------------------------
// • Subscribes to VoiceBus for live speech + recording updates
// • Persists across navigation transitions
// • Glowing purple pulse and ripple ring
// • Subtle frosted mic bubble
// -----------------------------------------------------------------------------

// import React, {useEffect, useRef, useState} from 'react';
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
// import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';

// const {width} = Dimensions.get('window');

// export const VoiceOverlay: React.FC = () => {
//   const {theme} = useAppTheme();

//   // 🔹 Global reactive state
//   const [isListening, setIsListening] = useState(false);
//   const [partialText, setPartialText] = useState('');

//   // 🔹 Animations
//   const fade = useRef(new Animated.Value(0)).current;
//   const pulse = useRef(new Animated.Value(0)).current;
//   const ring = useRef(new Animated.Value(0)).current;

//   const pulseColor = '#9000ffff';
//   const ringColor = '#b26bff';

//   const styles = StyleSheet.create({
//     container: {
//       position: 'absolute',
//       top: 0,
//       bottom: 0,
//       left: 0,
//       right: 0,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 999,
//     },
//     glow: {
//       position: 'absolute',
//       width: 180,
//       height: 180,
//       borderRadius: 90,
//       shadowOpacity: 0.6,
//       shadowRadius: 30,
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
//       position: 'absolute',
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

//   // 🧠 Subscribe to global VoiceBus events
//   useEffect(() => {
//     const handleStatus = ({speech, isRecording}: any) => {
//       setPartialText(speech);
//       setIsListening(isRecording);
//     };
//     VoiceBus.on('status', handleStatus);
//     return () => {
//       VoiceBus.off('status', handleStatus);
//     };
//   }, []);

//   // 💫 Animate overlay appearance and pulse
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
//     outputRange: [0.25, 0.55],
//   });
//   const ringScale = ring.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.8, 2],
//   });
//   const ringOpacity = ring.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.4, 0],
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
//       {/* 💜 Pulsing purple glow */}
//       <Animated.View
//         style={[
//           styles.glow,
//           {
//             backgroundColor: pulseColor,
//             transform: [{scale: glowScale}],
//             opacity: glowOpacity,
//             shadowColor: pulseColor,
//           },
//         ]}
//       />

//       {/* 💫 Expanding purple ring */}
//       <Animated.View
//         style={[
//           styles.ring,
//           {
//             borderColor: ringColor,
//             transform: [{scale: ringScale}],
//             opacity: ringOpacity,
//           },
//         ]}
//       />

//       {/* 🎙 Center frosted mic bubble */}
//       <View style={styles.inner}>
//         {Platform.OS === 'ios' ? (
//           <BlurView
//             style={styles.micBlur}
//             blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor={
//               theme.mode === 'dark'
//                 ? 'rgba(80,0,130,0.4)'
//                 : 'rgba(161, 0, 254, 1)'
//             }>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color="white"
//               style={{opacity: 0.95}}
//             />
//           </BlurView>
//         ) : (
//           <View
//             style={[
//               styles.micBlur,
//               {
//                 backgroundColor:
//                   theme.mode === 'dark'
//                     ? 'rgba(80,0,130,0.25)'
//                     : 'rgba(210,150,255,0.25)',
//               },
//             ]}>
//             <Icon
//               name="graphic-eq"
//               size={46}
//               color={theme.colors.buttonText1}
//               style={{opacity: 0.95}}
//             />
//           </View>
//         )}

//         {/* 🎧 Live recognized speech text */}
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
