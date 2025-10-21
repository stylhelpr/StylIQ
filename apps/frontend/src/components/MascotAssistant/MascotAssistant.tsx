import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
  View,
  Text,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

// 📏 Baseline (iPhone 14 = 390 × 844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const scaleX = SCREEN_WIDTH / BASE_WIDTH;
const scaleY = SCREEN_HEIGHT / BASE_HEIGHT;

// 🧠 Visual finesse curves
function finesseY(v: number) {
  return v * scaleY * 0.96 + (SCREEN_HEIGHT > 850 ? 4 : 0);
}
function finesseX(v: number) {
  return v * scaleX * 1.02;
}

type Props = {
  size?: number;
  position?: ViewStyle; // {bottom, right, top, left}
  message?: string;
};

export default function MascotAssistant({
  size = 120,
  position = {bottom: 80, right: 20},
  message = '',
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const float = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const [showBubble, setShowBubble] = useState(false);
  const insets = useSafeAreaInsets();

  // 🪶 Floating idle animation
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

  // 📐 Normalize numeric positioning (safely)
  const getNum = (v: unknown, fallback: number) =>
    typeof v === 'number' ? v : fallback;

  const normalized: ViewStyle = {};
  if (position.top !== undefined)
    normalized.top = finesseY(getNum(position.top, 0)) + insets.top;
  if (position.bottom !== undefined)
    normalized.bottom = finesseY(getNum(position.bottom, 0)) + insets.bottom;
  if (position.left !== undefined)
    normalized.left = finesseX(getNum(position.left, 0));
  if (position.right !== undefined)
    normalized.right = finesseX(getNum(position.right, 0));

  const mascotStyle: ViewStyle = {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
    transform: [{translateY: float}],
    ...normalized,
  };

  // 💭 Toggle thought bubble
  const handlePress = () => {
    if (showBubble) {
      Animated.timing(bubbleAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => setShowBubble(false));
    } else {
      setShowBubble(true);
      Animated.spring(bubbleAnim, {
        toValue: 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }).start();
    }
  };

  // 🔢 Numeric values for offsets
  const rightNum = getNum(position.right, 20);
  const bottomNum = getNum(position.bottom, 80);

  return (
    <>
      {/* 💭 Thought Bubble */}
      {showBubble && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: rightNum + size * 0.7,
            bottom: bottomNum + size * 1.5,
            backgroundColor: '#fff',
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 14,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 2},
            transform: [
              {scale: bubbleAnim},
              {
                translateY: bubbleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
            opacity: bubbleAnim,
            zIndex: 10000,
            elevation: 10000,
            maxWidth: 220,
          }}>
          <Text
            style={{
              color: theme.colors.background,
              fontSize: 15,
              fontWeight: '700',
              zIndex: 999999,
              elevation: 999999,
            }}>
            {message}
          </Text>
          {/* Tail */}
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              right: 12,
              width: 12,
              height: 12,
              backgroundColor: '#fff',
              transform: [{rotate: '45deg'}],
            }}
          />
        </Animated.View>
      )}

      {/* 🪄 Mascot Always Visible */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={mascotStyle}>
        <Animated.View style={{transform: [{translateY: float}]}}>
          <Image
            source={require('../../assets/animations/AnimaBot.gif')}
            style={{
              width: size * scaleX * 0.98,
              height: size * scaleX * 0.98,
              resizeMode: 'contain',
            }}
          />
        </Animated.View>
      </TouchableOpacity>
    </>
  );
}
//////////////////

// import React, {useEffect, useRef} from 'react';
// import {Animated, Easing, Image, Dimensions, ViewStyle} from 'react-native';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';

// // 📏 Baseline (iPhone 14 = 390 × 844)
// const BASE_WIDTH = 390;
// const BASE_HEIGHT = 844;
// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// const scaleX = SCREEN_WIDTH / BASE_WIDTH;
// const scaleY = SCREEN_HEIGHT / BASE_HEIGHT;

// // 🧠 Visual “finesse” curves (keep elements optically identical)
// function finesseY(v: number) {
//   return v * scaleY * 0.96 + (SCREEN_HEIGHT > 850 ? 4 : 0); // subtle vertical trim
// }
// function finesseX(v: number) {
//   return v * scaleX * 1.02; // slight optical expansion on wide devices
// }

// type Props = {
//   size?: number;
//   position?: ViewStyle; // {bottom, right, top, left}
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

//   const normalized: ViewStyle = {};
//   if (position.top !== undefined)
//     normalized.top = finesseY(position.top) + insets.top;
//   if (position.bottom !== undefined)
//     normalized.bottom = finesseY(position.bottom) + insets.bottom;
//   if (position.left !== undefined) normalized.left = finesseX(position.left);
//   if (position.right !== undefined) normalized.right = finesseX(position.right);

//   const style: ViewStyle = {
//     position: 'absolute',
//     zIndex: 9999,
//     elevation: 9999,
//     transform: [{translateY: float}],
//     ...normalized,
//   };

//   return (
//     <Animated.View style={style}>
//       <Image
//         source={require('../../assets/animations/AnimaBot.gif')}
//         style={{
//           width: size * scaleX * 0.98,
//           height: size * scaleX * 0.98,
//           resizeMode: 'contain',
//         }}
//       />
//     </Animated.View>
//   );
// }

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
