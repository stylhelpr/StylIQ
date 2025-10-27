import React, {useEffect, useRef} from 'react';
import {View, Animated, Easing, StyleSheet, Dimensions} from 'react-native';

const {width} = Dimensions.get('window');

export default function LiquidEnergyField({size = width * 0.5}) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1.05)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        // Breathing / morph scale
        Animated.sequence([
          Animated.timing(scale1, {
            toValue: 1.12,
            duration: 2300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale1, {
            toValue: 1,
            duration: 2300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale2, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale2, {
            toValue: 1.08,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // Slow rotation for the "liquid swirl"
        Animated.timing(rotate, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Subtle opacity shift
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  const rotateInterpolation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Outer faint glow */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: size * 1.4,
            height: size * 1.4,
            backgroundColor: 'rgba(30, 0, 80, 0.2)',
            transform: [{scale: scale2}, {rotate: rotateInterpolation}],
          },
        ]}
      />
      {/* Main dynamic core */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: size,
            height: size,
            opacity,
            backgroundColor: 'rgba(80, 0, 255, 0.25)',
            transform: [{scale: scale1}],
          },
        ]}
      />
      {/* Inner glow core */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: size * 0.7,
            height: size * 0.7,
            backgroundColor: 'rgba(255,255,255,0.08)',
            transform: [{scale: scale1}],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    shadowColor: '#ff0707ff',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
});

///////////////

// import React, {useRef, useEffect} from 'react';
// import {View, Animated, Easing, StyleSheet} from 'react-native';

// // No extra dependencies – pure React Native Animated
// export default function LiquidEnergyField({size = 220}) {
//   const scale = useRef(new Animated.Value(1)).current;
//   const rotate = useRef(new Animated.Value(0)).current;
//   const opacity = useRef(new Animated.Value(0.8)).current;

//   useEffect(() => {
//     // Continuous breathing + slow rotation
//     Animated.loop(
//       Animated.parallel([
//         Animated.sequence([
//           Animated.timing(scale, {
//             toValue: 1.08,
//             duration: 2000,
//             easing: Easing.inOut(Easing.sin),
//             useNativeDriver: true,
//           }),
//           Animated.timing(scale, {
//             toValue: 1,
//             duration: 2000,
//             easing: Easing.inOut(Easing.sin),
//             useNativeDriver: true,
//           }),
//         ]),
//         Animated.timing(rotate, {
//           toValue: 1,
//           duration: 8000,
//           easing: Easing.linear,
//           useNativeDriver: true,
//         }),
//         Animated.sequence([
//           Animated.timing(opacity, {
//             toValue: 1,
//             duration: 2000,
//             easing: Easing.inOut(Easing.sin),
//             useNativeDriver: true,
//           }),
//           Animated.timing(opacity, {
//             toValue: 0.7,
//             duration: 2000,
//             easing: Easing.inOut(Easing.sin),
//             useNativeDriver: true,
//           }),
//         ]),
//       ]),
//     ).start();
//   }, []);

//   const rotateInterpolate = rotate.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '360deg'],
//   });

//   return (
//     <View style={styles.container}>
//       {/* Outer glow */}
//       <Animated.View
//         style={[
//           styles.ring,
//           {
// //             width: size * 1.2,
// //             height: size * 1.2,
// //             opacity,
// //             transform: [{scale}, {rotate: rotateInterpolate}],
// //             backgroundColor: 'rgba(181, 7, 255, 0.2)',
// //           },
// //         ]}
// //       />
// //       {/* Core glow */}
// //       <Animated.View
// //         style={[
// //           styles.ring,
// //           {
// //             width: size,
// //             height: size,
// //             transform: [{scale}],
// //             backgroundColor: 'rgba(0, 8, 16, 0.85)',
// //           },
// //         ]}
// //       />
// //       {/* Inner pulse */}
// //       <Animated.View
// //         style={[
// //           styles.ring,
// //           {
// //             width: size * 0.6,
// //             height: size * 0.6,
// //             opacity,
// //             transform: [{scale}],
// //             backgroundColor: 'rgba(255, 255, 255, 0.08)',
// //           },
// //         ]}
// //       />
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   ring: {
// //     position: 'absolute',
// //     borderRadius: 9999,
// //   },
// // });
