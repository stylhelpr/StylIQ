import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Image, Dimensions, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// 📏 Baseline (iPhone 14 = 390 × 844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const scaleX = SCREEN_WIDTH / BASE_WIDTH;
const scaleY = SCREEN_HEIGHT / BASE_HEIGHT;

// 🧠 Visual “finesse” curves (keep elements optically identical)
function finesseY(v: number) {
  return v * scaleY * 0.96 + (SCREEN_HEIGHT > 850 ? 4 : 0); // subtle vertical trim
}
function finesseX(v: number) {
  return v * scaleX * 1.02; // slight optical expansion on wide devices
}

type Props = {
  size?: number;
  position?: ViewStyle; // {bottom, right, top, left}
};

export default function MascotAssistant({
  size = 120,
  position = {bottom: 80, right: 20},
}: Props) {
  const float = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

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

  const normalized: ViewStyle = {};
  if (position.top !== undefined)
    normalized.top = finesseY(position.top) + insets.top;
  if (position.bottom !== undefined)
    normalized.bottom = finesseY(position.bottom) + insets.bottom;
  if (position.left !== undefined) normalized.left = finesseX(position.left);
  if (position.right !== undefined) normalized.right = finesseX(position.right);

  const style: ViewStyle = {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
    transform: [{translateY: float}],
    ...normalized,
  };

  return (
    <Animated.View style={style}>
      <Image
        source={require('../../assets/animations/AnimaBot.gif')}
        style={{
          width: size * scaleX * 0.98,
          height: size * scaleX * 0.98,
          resizeMode: 'contain',
        }}
      />
    </Animated.View>
  );
}

///////////////////

// import React, {useEffect, useRef} from 'react';
// import {
//   Animated,
//   Easing,
//   Image,
//   StyleSheet,
//   ViewStyle,
//   Dimensions,
// } from 'react-native';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';

// // 🧭 Baseline iPhone 14 size
// const BASE_WIDTH = 390;
// const BASE_HEIGHT = 844;

// // simple scale helpers
// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// const scaleX = SCREEN_WIDTH / BASE_WIDTH;
// const scaleY = SCREEN_HEIGHT / BASE_HEIGHT;

// type Props = {
//   size?: number;
//   position?: ViewStyle; // e.g. { bottom: 70, right: 10 }
// };

// export default function MascotAssistant({
//   size = 120,
//   position = {bottom: 80, right: 20},
// }: Props) {
//   const float = useRef(new Animated.Value(0)).current;
//   const insets = useSafeAreaInsets();

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

//   // 📏 normalize position across devices
//   const normalizedPosition: ViewStyle = {};
//   if (position.top !== undefined)
//     normalizedPosition.top = position.top * scaleY + insets.top;
//   if (position.bottom !== undefined)
//     normalizedPosition.bottom = position.bottom * scaleY + insets.bottom;
//   if (position.left !== undefined)
//     normalizedPosition.left = position.left * scaleX;
//   if (position.right !== undefined)
//     normalizedPosition.right = position.right * scaleX;

//   const positionStyle: ViewStyle = {
//     position: 'absolute',
//     zIndex: 9999,
//     elevation: 9999,
//     transform: [{translateY: float}],
//     ...normalizedPosition,
//   };

//   return (
//     <Animated.View style={positionStyle}>
//       <Image
//         source={require('../../assets/animations/AnimaBot.gif')}
//         style={{
//           width: size * scaleX,
//           height: size * scaleX,
//           resizeMode: 'contain',
//         }}
//       />
//     </Animated.View>
//   );
// }
