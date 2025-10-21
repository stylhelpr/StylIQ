// import React, {useEffect, useRef} from 'react';
// import {Animated, Easing, View, ViewStyle} from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';

// type Props = {
//   size?: number;
//   style?: ViewStyle;
//   // optionally override colors if you want
//   colors?: string[];
// };

// export default function MorphingCircle({
//   size = 60,
//   style,
//   colors = ['#ff00ff', '#00eaff', '#39ff14', '#ff6ec7'],
// }: Props) {
//   // core breathing + spin
//   const coreScale = useRef(new Animated.Value(1)).current;
//   const rot = useRef(new Animated.Value(0)).current;

//   // two glow layers (scale + opacity)
//   const glow1Scale = useRef(new Animated.Value(1.25)).current;
//   const glow1Opacity = useRef(new Animated.Value(0.35)).current;

//   const glow2Scale = useRef(new Animated.Value(1.4)).current;
//   const glow2Opacity = useRef(new Animated.Value(0.22)).current;

//   // core pulse
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(coreScale, {
//           toValue: 1.1,
//           duration: 900,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//         Animated.timing(coreScale, {
//           toValue: 1.0,
//           duration: 900,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, [coreScale]);

//   // rotation
//   useEffect(() => {
//     Animated.loop(
//       Animated.timing(rot, {
//         toValue: 1,
//         duration: 7000,
//         easing: Easing.linear,
//         useNativeDriver: true,
//       }),
//     ).start();
//   }, [rot]);

//   // glow 1 pulse
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.parallel([
//           Animated.timing(glow1Scale, {
//             toValue: 1.45,
//             duration: 1100,
//             easing: Easing.inOut(Easing.ease),
//             useNativeDriver: true,
//           }),
//           Animated.timing(glow1Opacity, {
//             toValue: 0.12,
//             duration: 1100,
//             easing: Easing.inOut(Easing.ease),
//             useNativeDriver: true,
//           }),
//         ]),
//         Animated.parallel([
//           Animated.timing(glow1Scale, {
//             toValue: 1.25,
//             duration: 1100,
//             easing: Easing.inOut(Easing.ease),
//             useNativeDriver: true,
//           }),
//           Animated.timing(glow1Opacity, {
//             toValue: 0.35,
//             duration: 1100,
//             easing: Easing.inOut(Easing.ease),
//             useNativeDriver: true,
//           }),
//         ]),
//       ]),
//     ).start();
//   }, [glow1Scale, glow1Opacity]);

//   // glow 2 pulse (phase-shifted)
//   useEffect(() => {
//     const start = () => {
//       Animated.loop(
//         Animated.sequence([
//           Animated.parallel([
//             Animated.timing(glow2Scale, {
//               toValue: 1.55,
//               duration: 1200,
//               easing: Easing.inOut(Easing.ease),
//               useNativeDriver: true,
//             }),
//             Animated.timing(glow2Opacity, {
//               toValue: 0.1,
//               duration: 1200,
//               easing: Easing.inOut(Easing.ease),
//               useNativeDriver: true,
//             }),
//           ]),
//           Animated.parallel([
//             Animated.timing(glow2Scale, {
//               toValue: 1.35,
//               duration: 1200,
//               easing: Easing.inOut(Easing.ease),
//               useNativeDriver: true,
//             }),
//             Animated.timing(glow2Opacity, {
//               toValue: 0.22,
//               duration: 1200,
//               easing: Easing.inOut(Easing.ease),
//               useNativeDriver: true,
//             }),
//           ]),
//         ]),
//       ).start();
//     };
//     // small delay creates the phase offset
//     const t = setTimeout(start, 300);
//     return () => clearTimeout(t);
//   }, [glow2Scale, glow2Opacity]);

//   const rotate = rot.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '360deg'],
//   });

//   // sizes
//   const W = size;
//   const H = size;
//   const R = size / 2;

//   return (
//     <View
//       style={[
//         {width: W, height: H, alignItems: 'center', justifyContent: 'center'},
//         style,
//       ]}>
//       {/* Glow layer 2 (cyan) */}
//       <Animated.View
//         pointerEvents="none"
//         style={{
//           position: 'absolute',
//           width: W,
//           height: H,
//           borderRadius: R,
//           backgroundColor: '#00eaff',
//           transform: [{scale: glow2Scale}],
//           opacity: glow2Opacity,
//         }}
//       />

//       {/* Glow layer 1 (magenta) */}
//       <Animated.View
//         pointerEvents="none"
//         style={{
//           position: 'absolute',
//           width: W,
//           height: H,
//           borderRadius: R,
//           backgroundColor: '#ff00ff',
//           transform: [{scale: glow1Scale}],
//           opacity: glow1Opacity,
//         }}
//       />

//       {/* Core orb */}
//       <Animated.View
//         style={{
//           width: W,
//           height: H,
//           borderRadius: R,
//           overflow: 'hidden',
//           transform: [{scale: coreScale}, {rotate: rotate}],
//         }}>
//         <LinearGradient
//           colors={[colors[0], colors[1], colors[2], colors[3], colors[1]]}
//           start={{x: 0, y: 0}}
//           end={{x: 1, y: 1}}
//           style={{flex: 1}}
//         />
//       </Animated.View>
//     </View>
//   );
// }

////////////////////////

import React, {useEffect, useRef} from 'react';
import {Animated, Easing, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  size?: number;
  style?: ViewStyle;
};

export default function MorphingCircle({size = 48, style}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 🔁 Loop scale (pulsing in/out)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scaleAnim]);

  // 🔁 Loop rotation for subtle morph effect
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{scale: scaleAnim}, {rotate}],
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: {width: 0, height: 3},
          elevation: 10,
        },
        style,
      ]}>
      <LinearGradient
        colors={['#ab9affff', '#8fd3f4', '#c4f1be', '#f3c1ff']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{flex: 1}}
      />
    </Animated.View>
  );
}

////////////

// import React, {useEffect, useRef} from 'react';
// import {Animated, Easing, View, ViewStyle} from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';

// type Props = {
//   size?: number;
//   style?: ViewStyle;
// };

// export default function MorphingCircle({size = 70, style}: Props) {
//   const scaleAnim = useRef(new Animated.Value(1)).current;
//   const rotateAnim = useRef(new Animated.Value(0)).current;
//   const glowAnim = useRef(new Animated.Value(0)).current;

//   // Breathing motion
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(scaleAnim, {
//           toValue: 1.15,
//           duration: 1000,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//         Animated.timing(scaleAnim, {
//           toValue: 1,
//           duration: 1000,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, [scaleAnim]);

//   // Slow rotation
//   useEffect(() => {
//     Animated.loop(
//       Animated.timing(rotateAnim, {
//         toValue: 1,
//         duration: 9000,
//         easing: Easing.linear,
//         useNativeDriver: true,
//       }),
//     ).start();
//   }, [rotateAnim]);

//   // Glow intensity
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(glowAnim, {
//           toValue: 1,
//           duration: 1200,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//         Animated.timing(glowAnim, {
//           toValue: 0,
//           duration: 1200,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, [glowAnim]);

//   const rotate = rotateAnim.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '360deg'],
//   });

//   const glowOpacity = glowAnim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.15, 0.5],
//   });

//   return (
//     <View style={[{alignItems: 'center', justifyContent: 'center'}, style]}>
//       {/* Soft glow layer */}
//       <Animated.View
//         pointerEvents="none"
//         style={{
//           position: 'absolute',
//           width: size * 1.6,
//           height: size * 1.6,
//           borderRadius: (size * 1.6) / 2,
//           backgroundColor: '#00fff0',
//           opacity: glowOpacity,
//           transform: [{scale: scaleAnim}],
//         }}
//       />

//       {/* Core orb */}
//       <Animated.View
//         style={{
//           width: size,
//           height: size,
//           borderRadius: size / 2,
//           overflow: 'hidden',
//           transform: [{scale: scaleAnim}, {rotate}],
//         }}>
//         <LinearGradient
//           colors={['#00eaff', '#ff00f7', '#39ff14', '#00eaff']}
//           start={{x: 0, y: 0}}
//           end={{x: 1, y: 1}}
//           style={{flex: 1}}
//         />
//       </Animated.View>
//     </View>
//   );
// }
