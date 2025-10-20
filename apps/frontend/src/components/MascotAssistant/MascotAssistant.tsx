import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Image, StyleSheet, ViewStyle} from 'react-native';

type Props = {
  size?: number;
  position?: ViewStyle; // allows custom position like { top: 50, left: 20 }
};

export default function MascotAssistant({
  size = 120,
  position = {bottom: 70, right: 0},
}: Props) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -8,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [float]);

  return (
    <Animated.View
      style={[styles.container, position, {transform: [{translateY: float}]}]}>
      <Image
        source={require('../../assets/animations/AnimaBot.gif')}
        style={{width: size, height: size, resizeMode: 'contain'}}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
  },
});

///////////////

// import React, {useEffect, useRef} from 'react';
// import {Animated, Easing, Image, StyleSheet} from 'react-native';

// export default function MascotAssistant() {
//   const float = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(float, {
//           toValue: -8,
//           duration: 1200,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//         Animated.timing(float, {
//           toValue: 0,
//           duration: 1200,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, [float]);

//   return (
//     <Animated.View
//       style={[styles.container, {transform: [{translateY: float}]}]}>
//       <Image
//         source={require('../../assets/animations/AnimaBot.gif')}
//         style={styles.mascot}
//       />
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     position: 'absolute',
//     bottom: 70,
//     right: 0,
//     zIndex: 9999,
//     elevation: 9999,
//   },
//   mascot: {
//     width: 120,
//     height: 120,
//     resizeMode: 'contain',
//   },
// });

///////////////////////

// import React, {useEffect, useRef} from 'react';
// import {Animated, Easing, Image, StyleSheet, Dimensions} from 'react-native';

// const {width, height} = Dimensions.get('window');

// export default function MascotAssistant() {
//   const x = useRef(new Animated.Value(width * 0.7)).current;
//   const y = useRef(new Animated.Value(height * 0.7)).current;

//   function moveRandomly() {
//     const nextX = Math.random() * (width - 150);
//     const nextY = Math.random() * (height - 250);

//     Animated.timing(x, {
//       toValue: nextX,
//       duration: 3000,
//       easing: Easing.inOut(Easing.ease),
//       useNativeDriver: true,
//     }).start();

//     Animated.timing(y, {
//       toValue: nextY,
//       duration: 3000,
//       easing: Easing.inOut(Easing.ease),
//       useNativeDriver: true,
//     }).start(() => moveRandomly());
//   }

//   useEffect(() => {
//     moveRandomly();
//   }, []);

//   return (
//     <Animated.View
//       style={[
//         styles.container,
//         {
//           transform: [{translateX: x}, {translateY: y}],
//         },
//       ]}>
//       <Image
//         source={require('../../assets/animations/AnimaBot.gif')}
//         style={styles.mascot}
//       />
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     position: 'absolute',
//     zIndex: 9999,
//     elevation: 9999,
//   },
//   mascot: {
//     width: 150,
//     height: 150,
//     resizeMode: 'contain',
//   },
// });
