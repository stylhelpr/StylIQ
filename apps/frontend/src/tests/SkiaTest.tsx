// import React, {useState} from 'react';
// import {StyleSheet, View} from 'react-native';
// import {
//   Canvas,
//   Circle,
//   SweepGradient,
//   LinearGradient,
//   Group,
//   vec,
//   BlurMask,
// } from '@shopify/react-native-skia';
// import Animated, {
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

// const ORB_SIZE = 260;
// const CENTER = vec(ORB_SIZE / 2, ORB_SIZE / 2);

// export const SkiaTest = () => {
//   const rot1 = useSharedValue(0);
//   const rot2 = useSharedValue(0);
//   const driver = useSharedValue(0);
//   const [s1, setS1] = useState(1);
//   const [r1, setR1] = useState(0);
//   const [r2, setR2] = useState(0);

//   // Smooth continuous driver using sine-like easing
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

//     // this drives a 0→1→0→1 wave forever
//     driver.value = withRepeat(
//       withTiming(2 * Math.PI, {
//         duration: 3200,
//         easing: Easing.linear,
//       }),
//       -1,
//       false,
//     );
//   }, []);

//   const pulse = useDerivedValue(() => {
//     // Smooth sine wave between 0.96 and 1.06
//     return 1.01 + 0.05 * Math.sin(driver.value);
//   });

//   useAnimatedReaction(
//     () => ({p: pulse.value, a: rot1.value, b: rot2.value}),
//     v => {
//       runOnJS(setS1)(v.p);
//       runOnJS(setR1)(v.a);
//       runOnJS(setR2)(v.b);
//     },
//   );

//   return (
//     <View style={styles.root} pointerEvents="none">
//       <Animated.View
//         entering={FadeIn.duration(500)}
//         exiting={FadeOut.duration(300)}
//         style={{transform: [{scale: s1}]}}>
//         <Canvas style={styles.canvas}>
//           {/* Layer 1: soft blue-purple base */}
//           <Group transform={[{rotate: (r1 * Math.PI) / 180}]} origin={CENTER}>
//             <Circle cx={CENTER.x} cy={CENTER.y} r={120}>
//               <SweepGradient
//                 c={CENTER}
//                 colors={['#60A5FA', '#A78BFA', '#93C5FD', '#60A5FA']}
//               />
//               <BlurMask blur={45} style="solid" />
//             </Circle>
//           </Group>

//           {/* Layer 2: warmer pink flow */}
//           <Group transform={[{rotate: (r2 * Math.PI) / 180}]} origin={CENTER}>
//             <Circle cx={CENTER.x} cy={CENTER.y} r={110}>
//               <LinearGradient
//                 start={vec(0, 0)}
//                 end={vec(ORB_SIZE, ORB_SIZE)}
//                 colors={['#F9A8D4', '#A5B4FC', '#fa0000ff']}
//               />
//               <BlurMask blur={30} style="normal" />
//             </Circle>
//           </Group>

//           {/* Inner glow */}
//           <Circle
//             cx={CENTER.x}
//             cy={CENTER.y}
//             r={40}
//             color="rgba(0, 17, 255, 1)">
//             <BlurMask blur={25} style="normal" />
//           </Circle>
//         </Canvas>
//       </Animated.View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   root: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'transparent', // ensure React Native background is clear
//     zIndex: 9999,
//     pointerEvents: 'none',
//   },
//   canvas: {
//     width: ORB_SIZE,
//     height: ORB_SIZE,
//     backgroundColor: 'rgba(0,0,0,0)', // ✅ absolute transparency for Skia surface
//     opacity: 1,
//     // The following line fixes iOS GPU composition keeping a square:
//     borderRadius: ORB_SIZE / 1, // ⬅️ ensures Skia renders circular surface
//     overflow: 'hidden',
//   },
// });

///////////////////

// import React, {useState} from 'react';
// import {StyleSheet, View} from 'react-native';
// import {
//   Canvas,
//   Circle,
//   SweepGradient,
//   BlurMask,
//   Group,
//   vec,
// } from '@shopify/react-native-skia';
// import Animated, {
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   withSequence,
//   Easing,
//   useAnimatedReaction,
//   runOnJS,
//   FadeIn,
//   FadeOut,
// } from 'react-native-reanimated';

// const ORB_SIZE = 280;
// const CENTER = vec(ORB_SIZE / 2, ORB_SIZE / 2);

// export const SkiaTest = () => {
//   const rotation = useSharedValue(0);
//   const pulse = useSharedValue(1);
//   const [skiaPulse, setSkiaPulse] = useState(1);
//   const [skiaRot, setSkiaRot] = useState(0);

//   React.useEffect(() => {
//     rotation.value = withRepeat(
//       withTiming(360, {duration: 5000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     pulse.value = withRepeat(
//       withSequence(
//         withTiming(1.1, {duration: 1200, easing: Easing.inOut(Easing.ease)}),
//         withTiming(1.0, {duration: 1200, easing: Easing.inOut(Easing.ease)}),
//       ),
//       -1,
//       false,
//     );
//   }, []);

//   // bridge Reanimated → React state → Skia re-render
//   useAnimatedReaction(
//     () => ({p: pulse.value, r: rotation.value}),
//     v => {
//       runOnJS(setSkiaPulse)(v.p);
//       runOnJS(setSkiaRot)(v.r);
//     },
//   );

//   const siriGradient = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#6366F1'];

//   return (
//     <View style={styles.overlayRoot} pointerEvents="none">
//       <Animated.View
//         entering={FadeIn.duration(400)}
//         exiting={FadeOut.duration(400)}
//         style={{transform: [{scale: skiaPulse}]}}>
//         <Canvas style={styles.canvas}>
//           <Group
//             transform={[
//               {rotate: (skiaRot * Math.PI) / 180},
//               {scale: skiaPulse},
//             ]}
//             origin={CENTER}>
//             <Circle cx={CENTER.x} cy={CENTER.y} r={130}>
//               <SweepGradient c={CENTER} colors={siriGradient} />
//               <BlurMask blur={60} style="solid" />
//             </Circle>

//             <Circle
//               cx={CENTER.x}
//               cy={CENTER.y}
//               r={95}
//               style="stroke"
//               strokeWidth={8}>
//               <SweepGradient c={CENTER} colors={siriGradient} />
//               <BlurMask blur={25} style="solid" />
//             </Circle>

//             <Circle
//               cx={CENTER.x}
//               cy={CENTER.y}
//               r={55}
//               color="rgba(255,255,255,0.15)">
//               <BlurMask blur={25} style="normal" />
//             </Circle>

//             <Circle cx={CENTER.x} cy={CENTER.y} r={38}>
//               <SweepGradient
//                 c={CENTER}
//                 colors={['#8B5CF6', '#EC4899', '#3B82F6', '#8B5CF6']}
//               />
//             </Circle>
//           </Group>
//         </Canvas>
//       </Animated.View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   overlayRoot: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     width: '100%',
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//     pointerEvents: 'none',
//     zIndex: 9999,
//     backgroundColor: 'transparent',
//     transform: [{translateY: 0}, {translateX: 0}],
//   },
//   canvas: {
//     width: ORB_SIZE,
//     height: ORB_SIZE,
//     backgroundColor: 'transparent',
//   },
// });

//////////////////

// import React, {useEffect} from 'react';
// import {Dimensions, StyleSheet} from 'react-native';
// import {
//   Canvas,
//   Circle,
//   SweepGradient,
//   BlurMask,
//   Group,
//   vec,
// } from '@shopify/react-native-skia';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withRepeat,
//   withTiming,
//   Easing,
// } from 'react-native-reanimated';

// const {width, height} = Dimensions.get('window');

// export const SkiaTest = () => {
//   const center = vec(width / 2, height / 2);
//   const rotation = useSharedValue(0);
//   const pulse = useSharedValue(0);

//   // ------------------------------------------------------------
//   // 🎞️ Reanimated motion loop
//   // ------------------------------------------------------------
//   useEffect(() => {
//     rotation.value = withRepeat(
//       withTiming(360, {duration: 4000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//     pulse.value = withRepeat(
//       withTiming(1, {duration: 1600, easing: Easing.inOut(Easing.ease)}),
//       -1,
//       true,
//     );
//   }, [rotation, pulse]);

//   // ------------------------------------------------------------
//   // 🎛️ Animated style (drives Skia scale + rotation)
//   // ------------------------------------------------------------
//   const animatedStyle = useAnimatedStyle(() => ({
//     transform: [
//       {rotate: `${rotation.value}deg`},
//       {scale: 1 + 0.15 * Math.sin(pulse.value * Math.PI)},
//     ],
//   }));

//   // ------------------------------------------------------------
//   // 💜 Gradient palette (Siri-like)
//   // ------------------------------------------------------------
//   const siriGradient = [
//     '#4F46E5', // indigo
//     '#9333EA', // violet
//     '#DB2777', // pink
//     '#2563EB', // blue
//     '#4F46E5',
//   ];

//   // ------------------------------------------------------------
//   // 🎨 Render canvas inside animated wrapper
//   // ------------------------------------------------------------
//   return (
//     <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
//       <Canvas style={styles.canvas}>
//         {/* Outer halo */}
//         <Group opacity={0.35}>
//           <Circle cx={center.x} cy={center.y} r={120}>
//             <SweepGradient c={center} colors={siriGradient} />
//             <BlurMask blur={40} style="solid" />
//           </Circle>
//         </Group>

//         {/* Middle swirl ring */}
//         <Group opacity={0.7}>
//           <Circle
//             cx={center.x}
//             cy={center.y}
//             r={90}
//             style="stroke"
//             strokeWidth={8}
//             color="#a855f7">
//             <SweepGradient c={center} colors={siriGradient} />
//             <BlurMask blur={20} style="solid" />
//           </Circle>
//         </Group>

//         {/* Core bubble */}
//         <Group>
//           <Circle
//             cx={center.x}
//             cy={center.y}
//             r={55}
//             color="rgba(255,255,255,0.15)">
//             <BlurMask blur={30} style="normal" />
//           </Circle>
//           <Circle cx={center.x} cy={center.y} r={35}>
//             <SweepGradient
//               c={center}
//               colors={['#7C3AED', '#DB2777', '#2563EB', '#7C3AED']}
//             />
//           </Circle>
//         </Group>
//       </Canvas>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   canvas: {
//     width,
//     height,
//     backgroundColor: 'transparent',
//   },
// });

///////////////////

// // VoiceOverlaySiri.tsx
// import React, {useEffect, useMemo, useRef, useState} from 'react';
// import {Dimensions, StyleSheet} from 'react-native';
// import {
//   Canvas,
//   Group,
//   Path,
//   Skia,
//   LinearGradient,
//   vec,
//   BlurMask,
// } from '@shopify/react-native-skia';
// import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

// const {width, height} = Dimensions.get('window');
// const CENTER_Y = height / 2;

// // 4 ribbons like modern Siri (multicolor)
// const COLORS: [string, string][] = [
//   ['#00E0FF', '#007AFF'], // cyan → blue
//   ['#5856D6', '#AF52DE'], // indigo → violet
//   ['#C644FC', '#E82EAA'], // magenta → pink
//   ['#00FFD1', '#00B4FF'], // mint → aqua
// ];

// type WaveSpec = {
//   offset: number; // phase offset
//   amplitude: number; // relative size
//   width: number; // stroke width
//   blur: number; // glow
//   colors: [string, string];
// };

// // Predefine waves/ribbons
// const useWaves = (): WaveSpec[] =>
//   useMemo(
//     () => [
//       {offset: 0.0, amplitude: 1.0, width: 5, blur: 14, colors: COLORS[0]},
//       {offset: 0.6, amplitude: 0.85, width: 4, blur: 12, colors: COLORS[1]},
//       {offset: 1.2, amplitude: 0.7, width: 4, blur: 10, colors: COLORS[2]},
//       {offset: 1.8, amplitude: 0.55, width: 3, blur: 8, colors: COLORS[3]},
//     ],
//     [],
//   );

// // Build a sine path across the screen
// function buildWavePath(time: number, spec: WaveSpec) {
//   const p = Skia.Path.Make();
//   const step = 6; // horizontal sampling step (px)
//   const freq = 4 * Math.PI; // number of lobes across width
//   const ampPx = spec.amplitude * 42; // base amplitude (adjust feel)
//   const phase = time + spec.offset;

//   for (let x = 0; x <= width; x += step) {
//     const y = CENTER_Y + Math.sin((x / width) * freq + phase) * ampPx;
//     if (x === 0) p.moveTo(x, y);
//     else p.lineTo(x, y);
//   }
//   return p;
// }

// export const SkiaTest = () => {
//   const waves = useWaves();
//   const [paths, setPaths] = useState<ReturnType<typeof Skia.Path.Make>[]>([]);
//   const rafRef = useRef<number | null>(null);
//   const t0 = useRef<number | null>(null);

//   useEffect(() => {
//     const animate = (ts: number) => {
//       if (t0.current == null) t0.current = ts;
//       const t = (ts - t0.current) / 1000; // seconds since start

//       const next = waves.map(w => buildWavePath(t * 2.2, w));
//       setPaths(next);

//       rafRef.current = requestAnimationFrame(animate);
//     };
//     rafRef.current = requestAnimationFrame(animate);
//     return () => {
//       if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
//     };
//   }, [waves]);

//   return (
//     <Animated.View
//       entering={FadeIn.duration(350)}
//       exiting={FadeOut.duration(250)}
//       pointerEvents="none"
//       style={StyleSheet.absoluteFillObject}>
//       <Canvas style={styles.canvas}>
//         {paths.map((path, i) => {
//           const spec = waves[i];
//           return (
//             <Group key={i}>
//               <Path
//                 path={path}
//                 style="stroke"
//                 strokeWidth={spec.width}
//                 // round caps/joins for that fluid Siri look
//                 strokeJoin="round"
//                 strokeCap="round">
//                 <LinearGradient
//                   start={vec(0, CENTER_Y)}
//                   end={vec(width, CENTER_Y)}
//                   colors={spec.colors}
//                 />
//                 <BlurMask blur={spec.blur} style="outer" />
//               </Path>
//             </Group>
//           );
//         })}
//       </Canvas>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   canvas: {
//     width,
//     height,
//     backgroundColor: 'transparent',
//   },
// });

////////////////////

// import React, {useEffect, useMemo, useState} from 'react';
// import {StyleSheet, View} from 'react-native';
// import Animated, {
//   Easing,
//   FadeIn,
//   FadeOut,
//   interpolate,
//   useAnimatedStyle,
//   useDerivedValue,
//   useSharedValue,
//   withRepeat,
//   withTiming,
// } from 'react-native-reanimated';
// import {
//   BlurMask,
//   Canvas,
//   Path,
//   Skia,
//   SweepGradient,
//   vec,
// } from '@shopify/react-native-skia';
// // import {StatusBar} from 'expo-status-bar';

// // ------------------------------------------------------------
// // 🎨 ActivityIndicator (Skia + Reanimated)
// // ------------------------------------------------------------
// const ActivityIndicator = ({size}: {size: number}) => {
//   const strokeWidth = 10;
//   const radius = (size - strokeWidth) / 2;
//   const canvasSize = size + 30;

//   const circle = useMemo(() => {
//     const skPath = Skia.Path.Make();
//     skPath.addCircle(canvasSize / 2, canvasSize / 2, radius);
//     return skPath;
//   }, [canvasSize, radius]);

//   const progress = useSharedValue(0);

//   useEffect(() => {
//     progress.value = withRepeat(
//       withTiming(1, {duration: 1000, easing: Easing.linear}),
//       -1,
//       false,
//     );
//   }, [progress]);

//   const rContainerStyle = useAnimatedStyle(() => ({
//     transform: [{rotate: `${2 * Math.PI * progress.value}rad`}],
//   }));

//   const startPath = useDerivedValue(() =>
//     interpolate(progress.value, [0, 0.5, 1], [0.6, 0.3, 0.6]),
//   );

//   return (
//     <Animated.View
//       entering={FadeIn.duration(1000)}
//       exiting={FadeOut.duration(1000)}
//       style={rContainerStyle}>
//       <Canvas style={{width: canvasSize, height: canvasSize}}>
//         <Path
//           path={circle}
//           color="red"
//           style="stroke"
//           strokeWidth={strokeWidth}
//           start={startPath}
//           end={1}
//           strokeCap="round">
//           <SweepGradient
//             c={vec(canvasSize / 2, canvasSize / 2)}
//             colors={['cyan', 'magenta', 'yellow', 'cyan']}
//           />
//           <BlurMask blur={5} style="solid" />
//         </Path>
//       </Canvas>
//     </Animated.View>
//   );
// };

// // ------------------------------------------------------------
// // 🚀 SkiaTest Root Component
// // ------------------------------------------------------------
// export const SkiaTest = () => {
//   const [isLoading] = useState(true);

//   return (
//     <View style={styles.container}>
//       {/* <StatusBar style="light" /> */}
//       {isLoading && <ActivityIndicator size={64} />}
//     </View>
//   );
// };

// // ------------------------------------------------------------
// // 💅 Styles
// // ------------------------------------------------------------
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

/////////////////

import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  BlurMask,
  Canvas,
  Path,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
// import {StatusBar} from 'expo-status-bar';

// ------------------------------------------------------------
// 🎨 ActivityIndicator (Skia + Reanimated)
// ------------------------------------------------------------
const ActivityIndicator = ({size}: {size: number}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const canvasSize = size + 30;

  const circle = useMemo(() => {
    const skPath = Skia.Path.Make();
    skPath.addCircle(canvasSize / 2, canvasSize / 2, radius);
    return skPath;
  }, [canvasSize, radius]);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {duration: 1000, easing: Easing.linear}),
      -1,
      false,
    );
  }, [progress]);

  const rContainerStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${2 * Math.PI * progress.value}rad`}],
  }));

  const startPath = useDerivedValue(() =>
    interpolate(progress.value, [0, 0.5, 1], [0.6, 0.3, 0.6]),
  );

  return (
    <Animated.View
      entering={FadeIn.duration(1000)}
      exiting={FadeOut.duration(1000)}
      style={rContainerStyle}>
      <Canvas style={{width: canvasSize, height: canvasSize}}>
        <Path
          path={circle}
          color="red"
          style="stroke"
          strokeWidth={strokeWidth}
          start={startPath}
          end={1}
          strokeCap="round">
          <SweepGradient
            c={vec(canvasSize / 2, canvasSize / 2)}
            colors={['cyan', 'magenta', 'yellow', 'cyan']}
          />
          <BlurMask blur={5} style="solid" />
        </Path>
      </Canvas>
    </Animated.View>
  );
};

// ------------------------------------------------------------
// 🚀 SkiaTest Root Component
// ------------------------------------------------------------
export const SkiaTest = () => {
  const [isLoading] = useState(true);

  return (
    <View style={styles.container}>
      {/* <StatusBar style="light" /> */}
      {isLoading && <ActivityIndicator size={64} />}
    </View>
  );
};

// ------------------------------------------------------------
// 💅 Styles
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
