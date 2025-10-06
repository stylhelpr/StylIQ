import React, {useRef} from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void; // ✅ new prop
  onSwipeActiveChange?: (active: boolean) => void;
  /** how far you must swipe (0.0 - 1.0) before triggering */
  deleteThreshold?: number;
  /** background element (e.g. red delete bar) */
  deleteBackground?: React.ReactNode;
};

export default function SwipeableCard({
  children,
  style,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown, // ✅ new
  onSwipeActiveChange,
  deleteThreshold = 0.15,
  deleteBackground,
}: Props) {
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current; // ✅ new for vertical swipe

  const triggerHaptic = () => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => onSwipeActiveChange?.(true),

      onPanResponderMove: (_e, g) => {
        const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
        const nextY = Math.max(-SCREEN_HEIGHT, Math.min(SCREEN_HEIGHT, g.dy));
        panX.setValue(nextX);
        panY.setValue(nextY);
      },

      onPanResponderRelease: (_e, g) => {
        onSwipeActiveChange?.(false);

        const swipeDistanceX = g.dx;
        const swipeVelocityX = g.vx;
        const swipeDistanceY = g.dy;
        const swipeVelocityY = g.vy;

        const leftTrigger = -SCREEN_WIDTH * deleteThreshold;
        const rightTrigger = SCREEN_WIDTH * deleteThreshold;
        const downTrigger = SCREEN_HEIGHT * 0.12; // ✅ ~12% of screen (~100px)

        // ✅ horizontal detection (unchanged)
        const shouldSwipeRight =
          swipeDistanceX > SCREEN_WIDTH * 0.08 ||
          (swipeVelocityX > 0.32 && swipeDistanceX > 3);
        const shouldSwipeLeft =
          swipeDistanceX < leftTrigger ||
          (swipeVelocityX < -0.15 && swipeDistanceX < -8);

        // ✅ new vertical detection
        const shouldSwipeDown =
          swipeDistanceY > downTrigger ||
          (swipeVelocityY > 0.25 && swipeDistanceY > 40);

        if (shouldSwipeRight) {
          Animated.timing(panX, {
            toValue: SCREEN_WIDTH + 60,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            panX.setValue(0);
            panY.setValue(0);
            onSwipeRight?.();
          });
        } else if (shouldSwipeLeft) {
          Animated.timing(panX, {
            toValue: -SCREEN_WIDTH - 60,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            panX.setValue(0);
            panY.setValue(0);
            onSwipeLeft?.();
          });
        } else if (shouldSwipeDown) {
          // ✅ swipe down to close
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT + 60,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            panX.setValue(0);
            panY.setValue(0);
            onSwipeDown?.();
          });
        } else {
          Animated.timing(panX, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }).start();
          Animated.timing(panY, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.timing(panX, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }).start();
        Animated.timing(panY, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const animatedStyle = {
    transform: [{translateX: panX}, {translateY: panY}],
  };

  return (
    <View style={{position: 'relative'}}>
      {deleteBackground && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {zIndex: 0, justifyContent: 'center'},
          ]}>
          {deleteBackground}
        </View>
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={[{zIndex: 1}, animatedStyle, style]}>
        {children}
      </Animated.View>
    </View>
  );
}

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
