import React, {useRef} from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeActiveChange?: (active: boolean) => void;
  deleteThreshold?: number;
  deleteBackground?: React.ReactNode;
};

export default function SwipeableCard({
  children,
  style,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  onSwipeActiveChange,
  deleteThreshold = 0.15,
  deleteBackground,
}: Props) {
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // const triggerHaptic = () => {
  //   ReactNativeHapticFeedback.trigger('impactLight', {
  //     enableVibrateFallback: true,
  //     ignoreAndroidSystemSettings: false,
  //   });
  // };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,

      onPanResponderGrant: () => onSwipeActiveChange?.(true),

      onPanResponderMove: (_e, g) => {
        const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
        const nextY = Math.max(-SCREEN_HEIGHT, Math.min(SCREEN_HEIGHT, g.dy));
        panX.setValue(nextX);
        panY.setValue(nextY);
      },

      onPanResponderRelease: (_e, g) => {
        onSwipeActiveChange?.(false);

        // 🍎 More forgiving thresholds (left-hand friendly)
        const shouldSwipeRight =
          g.dx > SCREEN_WIDTH * 0.06 || (g.vx > 0.25 && g.dx > 3);

        // 🍎 New: ultra-light left swipe auto-complete detection
        // If user swipes just a little left with some intent, trigger delete.
        const barelySwipeLeft = g.dx < -SCREEN_WIDTH * 0.04 && g.vx < -0.05; // 👈 ~4% distance & light velocity

        const shouldSwipeLeft =
          g.dx < -SCREEN_WIDTH * deleteThreshold ||
          (g.vx < -0.15 && g.dx < -6) ||
          barelySwipeLeft;

        const shouldSwipeDown =
          g.dy > SCREEN_HEIGHT * 0.1 || (g.vy > 0.2 && g.dy > 32);

        if (shouldSwipeRight && onSwipeRight) {
          // triggerHaptic();
          Animated.timing(panX, {
            toValue: SCREEN_WIDTH + 80,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            panX.setValue(0);
            panY.setValue(0);
            onSwipeRight();
          });
        } else if (shouldSwipeLeft && onSwipeLeft) {
          // triggerHaptic();
          Animated.timing(panX, {
            toValue: -SCREEN_WIDTH - 80,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            panX.setValue(0);
            panY.setValue(0);
            onSwipeLeft();
          });
        } else if (shouldSwipeDown && onSwipeDown) {
          // triggerHaptic();
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT + 60,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            panX.setValue(0);
            panY.setValue(0);
            onSwipeDown();
          });
        } else {
          Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
          Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
        Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
      },
    }),
  ).current;

  return (
    <View style={{position: 'relative'}}>
      {deleteBackground && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {zIndex: 0, justifyContent: 'center'},
          ]}>
          {deleteBackground}
        </View>
      )}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {zIndex: 1},
          style,
          {transform: [{translateX: panX}, {translateY: panY}]},
        ]}>
        {children}
      </Animated.View>
    </View>
  );
}

////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   View,
//   StyleSheet,
//   ViewStyle,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SCREEN_HEIGHT = Dimensions.get('window').height;

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeDown?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
//   deleteThreshold?: number;
//   deleteBackground?: React.ReactNode;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeDown,
//   onSwipeActiveChange,
//   deleteThreshold = 0.15,
//   deleteBackground,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current;

//   // 🍎 Directional intent lock
//   const lockedDirection = useRef<'horizontal' | 'vertical' | null>(null);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => {
//         // lock direction early based on initial intent
//         if (!lockedDirection.current) {
//           if (Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy)) {
//             lockedDirection.current = 'horizontal';
//           } else if (Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx)) {
//             lockedDirection.current = 'vertical';
//           }
//         }
//         return Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3;
//       },

//       onPanResponderGrant: () => onSwipeActiveChange?.(true),

//       onPanResponderMove: (_e, g) => {
//         // Only move in the locked direction
//         if (lockedDirection.current === 'horizontal') {
//           const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//           panX.setValue(nextX);
//           panY.setValue(0); // lock out vertical motion
//         } else if (lockedDirection.current === 'vertical') {
//           const nextY = Math.max(-SCREEN_HEIGHT, Math.min(SCREEN_HEIGHT, g.dy));
//           panY.setValue(nextY);
//           panX.setValue(0); // lock out horizontal motion
//         }
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         // Reset lock
//         const direction = lockedDirection.current;
//         lockedDirection.current = null;

//         // 🍎 More forgiving thresholds (left-hand friendly)
//         const shouldSwipeRight =
//           direction === 'horizontal' &&
//           (g.dx > SCREEN_WIDTH * 0.06 || (g.vx > 0.25 && g.dx > 3));

//         const shouldSwipeLeft =
//           direction === 'horizontal' &&
//           (g.dx < -SCREEN_WIDTH * deleteThreshold ||
//             (g.vx < -0.15 && g.dx < -6));

//         const shouldSwipeDown =
//           direction === 'vertical' &&
//           (g.dy > SCREEN_HEIGHT * 0.1 || (g.vy > 0.2 && g.dy > 32));

//         if (shouldSwipeRight && onSwipeRight) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 80,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeRight();
//           });
//         } else if (shouldSwipeLeft && onSwipeLeft) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 80,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeLeft();
//           });
//         } else if (shouldSwipeDown && onSwipeDown) {
//           triggerHaptic();
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT + 60,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeDown();
//           });
//         } else {
//           Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//           Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         lockedDirection.current = null;
//         Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//         Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
//       },
//     }),
//   ).current;

//   return (
//     <View style={{position: 'relative'}}>
//       {deleteBackground && (
//         <View
//           style={[
//             StyleSheet.absoluteFillObject,
//             {zIndex: 0, justifyContent: 'center'},
//           ]}>
//           {deleteBackground}
//         </View>
//       )}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[
//           {zIndex: 1},
//           style,
//           {transform: [{translateX: panX}, {translateY: panY}]},
//         ]}>
//         {children}
//       </Animated.View>
//     </View>
//   );
// }

///////////////////

/* eslint-disable react-native/no-inline-styles */
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   View,
//   StyleSheet,
//   ViewStyle,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SCREEN_HEIGHT = Dimensions.get('window').height;

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeDown?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
//   deleteThreshold?: number;
//   deleteBackground?: React.ReactNode;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeDown,
//   onSwipeActiveChange,
//   deleteThreshold = 0.15,
//   deleteBackground,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) =>
//         Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,

//       onPanResponderGrant: () => onSwipeActiveChange?.(true),

//       onPanResponderMove: (_e, g) => {
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         const nextY = Math.max(-SCREEN_HEIGHT, Math.min(SCREEN_HEIGHT, g.dy));
//         panX.setValue(nextX);
//         panY.setValue(nextY);
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         // 🍎 More forgiving thresholds (left-hand friendly)
//         const shouldSwipeRight =
//           g.dx > SCREEN_WIDTH * 0.06 || (g.vx > 0.25 && g.dx > 3); // ↓ lowered velocity + distance
//         const shouldSwipeLeft =
//           g.dx < -SCREEN_WIDTH * deleteThreshold || (g.vx < -0.15 && g.dx < -6); // ↓ easier to trigger
//         const shouldSwipeDown =
//           g.dy > SCREEN_HEIGHT * 0.1 || (g.vy > 0.2 && g.dy > 32); // ↓ relaxed downward intent

//         if (shouldSwipeRight && onSwipeRight) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 80,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeRight();
//           });
//         } else if (shouldSwipeLeft && onSwipeLeft) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 80,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeLeft();
//           });
//         } else if (shouldSwipeDown && onSwipeDown) {
//           triggerHaptic();
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT + 60,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeDown();
//           });
//         } else {
//           Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//           Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//         Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
//       },
//     }),
//   ).current;

//   return (
//     <View style={{position: 'relative'}}>
//       {deleteBackground && (
//         <View
//           style={[
//             StyleSheet.absoluteFillObject,
//             {zIndex: 0, justifyContent: 'center'},
//           ]}>
//           {deleteBackground}
//         </View>
//       )}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[
//           {zIndex: 1},
//           style,
//           {transform: [{translateX: panX}, {translateY: panY}]},
//         ]}>
//         {children}
//       </Animated.View>
//     </View>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   View,
//   StyleSheet,
//   ViewStyle,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SCREEN_HEIGHT = Dimensions.get('window').height;

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeDown?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
//   deleteThreshold?: number;
//   deleteBackground?: React.ReactNode;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeDown,
//   onSwipeActiveChange,
//   deleteThreshold = 0.15,
//   deleteBackground,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) =>
//         Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
//       onPanResponderGrant: () => onSwipeActiveChange?.(true),
//       onPanResponderMove: (_e, g) => {
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         const nextY = Math.max(-SCREEN_HEIGHT, Math.min(SCREEN_HEIGHT, g.dy));
//         panX.setValue(nextX);
//         panY.setValue(nextY);
//       },
//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);
//         const shouldSwipeRight =
//           g.dx > SCREEN_WIDTH * 0.08 || (g.vx > 0.3 && g.dx > 3);
//         const shouldSwipeLeft =
//           g.dx < -SCREEN_WIDTH * deleteThreshold || (g.vx < -0.2 && g.dx < -8);
//         const shouldSwipeDown =
//           g.dy > SCREEN_HEIGHT * 0.12 || (g.vy > 0.25 && g.dy > 40);

//         if (shouldSwipeRight && onSwipeRight) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 80,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeRight();
//           });
//         } else if (shouldSwipeLeft && onSwipeLeft) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 80,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeLeft();
//           });
//         } else if (shouldSwipeDown && onSwipeDown) {
//           triggerHaptic();
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT + 60,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeDown();
//           });
//         } else {
//           Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//           Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
//         }
//       },
//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//         Animated.spring(panY, {toValue: 0, useNativeDriver: true}).start();
//       },
//     }),
//   ).current;

//   return (
//     <View style={{position: 'relative'}}>
//       {deleteBackground && (
//         <View
//           style={[
//             StyleSheet.absoluteFillObject,
//             {zIndex: 0, justifyContent: 'center'},
//           ]}>
//           {deleteBackground}
//         </View>
//       )}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[
//           {zIndex: 1},
//           style,
//           {transform: [{translateX: panX}, {translateY: panY}]},
//         ]}>
//         {children}
//       </Animated.View>
//     </View>
//   );
// }

/////////////////

// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   View,
//   ViewStyle,
//   StyleSheet,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SCREEN_HEIGHT = Dimensions.get('window').height;

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeDown?: () => void; // ✅ new prop
//   onSwipeActiveChange?: (active: boolean) => void;
//   /** how far you must swipe (0.0 - 1.0) before triggering */
//   deleteThreshold?: number;
//   /** background element (e.g. red delete bar) */
//   deleteBackground?: React.ReactNode;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeDown, // ✅ new
//   onSwipeActiveChange,
//   deleteThreshold = 0.15,
//   deleteBackground,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current; // ✅ new for vertical swipe

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) =>
//         Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
//       onMoveShouldSetPanResponderCapture: (_e, g) =>
//         Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
//       onPanResponderGrant: () => onSwipeActiveChange?.(true),

//       onPanResponderMove: (_e, g) => {
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         const nextY = Math.max(-SCREEN_HEIGHT, Math.min(SCREEN_HEIGHT, g.dy));
//         panX.setValue(nextX);
//         panY.setValue(nextY);
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         const swipeDistanceX = g.dx;
//         const swipeVelocityX = g.vx;
//         const swipeDistanceY = g.dy;
//         const swipeVelocityY = g.vy;

//         const leftTrigger = -SCREEN_WIDTH * deleteThreshold;
//         const rightTrigger = SCREEN_WIDTH * deleteThreshold;
//         const downTrigger = SCREEN_HEIGHT * 0.12; // ✅ ~12% of screen (~100px)

//         // ✅ horizontal detection (unchanged)
//         const shouldSwipeRight =
//           swipeDistanceX > SCREEN_WIDTH * 0.08 ||
//           (swipeVelocityX > 0.32 && swipeDistanceX > 3);
//         const shouldSwipeLeft =
//           swipeDistanceX < leftTrigger ||
//           (swipeVelocityX < -0.15 && swipeDistanceX < -8);

//         // ✅ new vertical detection
//         const shouldSwipeDown =
//           swipeDistanceY > downTrigger ||
//           (swipeVelocityY > 0.25 && swipeDistanceY > 40);

//         if (shouldSwipeRight) {
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 60,
//             duration: 150,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeRight?.();
//           });
//         } else if (shouldSwipeLeft) {
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 60,
//             duration: 150,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeLeft?.();
//           });
//         } else if (shouldSwipeDown) {
//           // ✅ swipe down to close
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT + 60,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             panY.setValue(0);
//             onSwipeDown?.();
//           });
//         } else {
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 140,
//             useNativeDriver: true,
//           }).start();
//           Animated.timing(panY, {
//             toValue: 0,
//             duration: 140,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.timing(panX, {
//           toValue: 0,
//           duration: 140,
//           useNativeDriver: true,
//         }).start();
//         Animated.timing(panY, {
//           toValue: 0,
//           duration: 140,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const animatedStyle = {
//     transform: [{translateX: panX}, {translateY: panY}],
//   };

//   return (
//     <View style={{position: 'relative'}}>
//       {deleteBackground && (
//         <View
//           style={[
//             StyleSheet.absoluteFillObject,
//             {zIndex: 0, justifyContent: 'center'},
//           ]}>
//           {deleteBackground}
//         </View>
//       )}

//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{zIndex: 1}, animatedStyle, style]}>
//         {children}
//       </Animated.View>
//     </View>
//   );
// }

///////////////////

// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   View,
//   ViewStyle,
//   StyleSheet,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
//   /** how far you must swipe (0.0 - 1.0) before triggering */
//   deleteThreshold?: number;
//   /** background element (e.g. red delete bar) */
//   deleteBackground?: React.ReactNode;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeActiveChange,
//   deleteThreshold = 0.15,
//   deleteBackground,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2,
//       onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 2,
//       onPanResponderGrant: () => onSwipeActiveChange?.(true),

//       onPanResponderMove: (_e, g) => {
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         panX.setValue(nextX);
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         const swipeDistance = g.dx;
//         const swipeVelocity = g.vx;

//         const leftTrigger = -SCREEN_WIDTH * deleteThreshold;
//         const rightTrigger = SCREEN_WIDTH * deleteThreshold;

//         // ✅ Feather-light Apple-style detection
//         // const shouldSwipeRight =
//         //   swipeDistance > rightTrigger ||
//         //   (swipeVelocity > 0.15 && swipeDistance > 8);
//         // ✅ Much lighter, balanced right-swipe detection
//         const shouldSwipeRight =
//           swipeDistance > SCREEN_WIDTH * 0.08 || // 👈 trigger at ~8% of screen (~30px)
//           (swipeVelocity > 0.32 && swipeDistance > 3); // 👈 tiny velocity requirement + minimal distance
//         const shouldSwipeLeft =
//           swipeDistance < leftTrigger ||
//           (swipeVelocity < -0.15 && swipeDistance < -8);

//         if (shouldSwipeRight) {
//           // triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 60,
//             duration: 150,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeRight?.();
//           });
//         } else if (shouldSwipeLeft) {
//           // triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 60,
//             duration: 150,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeLeft?.();
//           });
//         } else {
//           // ✅ Less “springy” return: faster, no bounce
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 140,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.timing(panX, {
//           toValue: 0,
//           duration: 140,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const animatedStyle = {
//     transform: [{translateX: panX}],
//   };

//   return (
//     <View style={{position: 'relative'}}>
//       {/* ✅ Background behind swipe */}
//       {deleteBackground && (
//         <View
//           style={[
//             StyleSheet.absoluteFillObject,
//             {zIndex: 0, justifyContent: 'center'},
//           ]}>
//           {deleteBackground}
//         </View>
//       )}

//       {/* ✅ Foreground (swipeable card) */}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{zIndex: 1}, animatedStyle, style]}>
//         {children}
//       </Animated.View>
//     </View>
//   );
// }

/////////////////////

// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   View,
//   ViewStyle,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
//   /** ✅ NEW: how far you must swipe (0.0 - 1.0) before triggering */
//   deleteThreshold?: number;
//   /** ✅ NEW: background element (e.g. red delete bar) */
//   deleteBackground?: React.ReactNode;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeActiveChange,
//   deleteThreshold = 0.15,
//   deleteBackground,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2,
//       onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 2,
//       onPanResponderGrant: () => onSwipeActiveChange?.(true),

//       onPanResponderMove: (_e, g) => {
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         panX.setValue(nextX);
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         const swipeDistance = g.dx;
//         const swipeVelocity = g.vx;

//         const leftTrigger = -SCREEN_WIDTH * deleteThreshold;
//         const rightTrigger = SCREEN_WIDTH * deleteThreshold;

//         const shouldSwipeRight =
//           swipeDistance > rightTrigger ||
//           (swipeVelocity > 0.08 && swipeDistance > 4);
//         const shouldSwipeLeft =
//           swipeDistance < leftTrigger ||
//           (swipeVelocity < -0.08 && swipeDistance < -4);

//         if (shouldSwipeRight) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 60,
//             duration: 160,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeRight?.();
//           });
//         } else if (shouldSwipeLeft) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 60,
//             duration: 160,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeLeft?.();
//           });
//         } else {
//           Animated.spring(panX, {
//             toValue: 0,
//             bounciness: 12,
//             speed: 15,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         onSwipeActiveChange?.(false);
//         Animated.spring(panX, {
//           toValue: 0,
//           bounciness: 12,
//           speed: 15,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const animatedStyle = {
//     transform: [{translateX: panX}],
//   };

//   return (
//     <View style={{position: 'relative'}}>
//       {/* ✅ Background stays behind during swipe */}
//       {deleteBackground && (
//         <View
//           style={{
//             ...StyleSheet.absoluteFillObject,
//             zIndex: 0,
//             justifyContent: 'center',
//           }}>
//           {deleteBackground}
//         </View>
//       )}

//       {/* ✅ Foreground (swipeable card) */}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{zIndex: 1}, animatedStyle, style]}>
//         {children}
//       </Animated.View>
//     </View>
//   );
// }

//////////////////////

// import React, {useRef} from 'react';
// import {Animated, PanResponder, Dimensions, ViewStyle} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SWIPE_DISMISS = SCREEN_WIDTH * 0.1; // ✅ ~10% of screen — ultra-sensitive

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeActiveChange,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       // ✅ React instantly to horizontal intent
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 0,
//       onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 0,

//       onPanResponderGrant: () => {
//         onSwipeActiveChange?.(true); // 🔒 Lock vertical scroll immediately
//       },

//       onPanResponderMove: (_e, g) => {
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         panX.setValue(nextX);
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         const swipeDistance = g.dx;
//         const swipeVelocity = g.vx;

//         // ✅ Feather-light swipe conditions
//         const shouldSwipeRight =
//           swipeDistance > SWIPE_DISMISS * 0.5 ||
//           (swipeVelocity > 0.08 && swipeDistance > 4);
//         const shouldSwipeLeft =
//           swipeDistance < -SWIPE_DISMISS * 0.5 ||
//           (swipeVelocity < -0.08 && swipeDistance < -4);

//         if (shouldSwipeRight) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 60,
//             duration: 160,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeRight?.();
//           });
//         } else if (shouldSwipeLeft) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 60,
//             duration: 160,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeLeft?.();
//           });
//         } else {
//           Animated.spring(panX, {
//             toValue: 0,
//             bounciness: 12,
//             speed: 15,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         onSwipeActiveChange?.(false);
//         Animated.spring(panX, {
//           toValue: 0,
//           bounciness: 12,
//           speed: 15,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const animatedStyle = {
//     transform: [{translateX: panX}],
//     opacity: panX.interpolate({
//       inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
//       outputRange: [0.5, 1, 0.5],
//     }),
//   };

//   return (
//     <Animated.View {...panResponder.panHandlers} style={[animatedStyle, style]}>
//       {children}
//     </Animated.View>
//   );
// }

////////////////

// import React, {useRef} from 'react';
// import {Animated, PanResponder, Dimensions, ViewStyle} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SWIPE_DISMISS = SCREEN_WIDTH * 0.2; // ✅ ~20% of screen for natural trigger

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeActiveChange,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       // ✅ React to *any* horizontal intent immediately
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 0,
//       onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 0,

//       onPanResponderGrant: () => {
//         onSwipeActiveChange?.(true); // lock vertical scroll immediately
//       },

//       onPanResponderMove: (_e, g) => {
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         panX.setValue(nextX);
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         const swipeDistance = g.dx;
//         const swipeVelocity = g.vx;

//         // ✅ Much softer conditions — light drag or gentle flick triggers swipe
//         const shouldSwipeRight =
//           swipeDistance > SWIPE_DISMISS * 0.6 ||
//           (swipeVelocity > 0.15 && swipeDistance > 8);
//         const shouldSwipeLeft =
//           swipeDistance < -SWIPE_DISMISS * 0.6 ||
//           (swipeVelocity < -0.15 && swipeDistance < -8);

//         if (shouldSwipeRight) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 60,
//             duration: 170,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeRight?.();
//           });
//         } else if (shouldSwipeLeft) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 60,
//             duration: 170,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeLeft?.();
//           });
//         } else {
//           Animated.spring(panX, {
//             toValue: 0,
//             bounciness: 10,
//             speed: 14,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         onSwipeActiveChange?.(false);
//         Animated.spring(panX, {
//           toValue: 0,
//           bounciness: 10,
//           speed: 14,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const animatedStyle = {
//     transform: [{translateX: panX}],
//     opacity: panX.interpolate({
//       inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
//       outputRange: [0.5, 1, 0.5],
//     }),
//   };

//   return (
//     <Animated.View {...panResponder.panHandlers} style={[animatedStyle, style]}>
//       {children}
//     </Animated.View>
//   );
// }

///////////////

// import React, {useRef} from 'react';
// import {Animated, PanResponder, Dimensions, ViewStyle} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const SWIPE_DISMISS = SCREEN_WIDTH * 0.22; // 👈 ~22% of screen — feels natural

// type Props = {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   onSwipeLeft?: () => void;
//   onSwipeRight?: () => void;
//   onSwipeActiveChange?: (active: boolean) => void;
// };

// export default function SwipeableCard({
//   children,
//   style,
//   onSwipeLeft,
//   onSwipeRight,
//   onSwipeActiveChange,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       // ✅ Make swipe activation super responsive
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2,
//       onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 2,

//       onPanResponderGrant: () => {
//         // 🔒 Temporarily lock vertical scroll
//         onSwipeActiveChange?.(true);
//       },

//       onPanResponderMove: (_e, g) => {
//         // ✅ Limit X movement so card never drifts offscreen too far
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         panX.setValue(nextX);
//       },

//       onPanResponderRelease: (_e, g) => {
//         onSwipeActiveChange?.(false);

//         const swipeDistance = g.dx;
//         const swipeVelocity = g.vx;

//         // ✅ Direction-aware swipe logic for buttery feel
//         const shouldSwipeRight =
//           swipeDistance > SWIPE_DISMISS * 0.75 ||
//           (swipeVelocity > 0.25 && swipeDistance > 15);
//         const shouldSwipeLeft =
//           swipeDistance < -SWIPE_DISMISS ||
//           (swipeVelocity < -0.25 && swipeDistance < -15);

//         if (shouldSwipeRight) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 60,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeRight?.();
//           });
//         } else if (shouldSwipeLeft) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 60,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onSwipeLeft?.();
//           });
//         } else {
//           // ✅ Soft bounce-back if swipe isn't enough
//           Animated.spring(panX, {
//             toValue: 0,
//             bounciness: 10,
//             speed: 12,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         onSwipeActiveChange?.(false);
//         Animated.spring(panX, {
//           toValue: 0,
//           bounciness: 10,
//           speed: 12,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const animatedStyle = {
//     transform: [{translateX: panX}],
//     opacity: panX.interpolate({
//       inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
//       outputRange: [0.5, 1, 0.5],
//     }),
//   };

//   return (
//     <Animated.View {...panResponder.panHandlers} style={[animatedStyle, style]}>
//       {children}
//     </Animated.View>
//   );
// }
