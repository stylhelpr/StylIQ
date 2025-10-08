/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useEffect} from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// ✅ Declare global helpers
declare global {
  var goingBack: boolean | undefined;
  var __rootGoBack: (() => void) | undefined;
}

if (typeof global.goingBack === 'undefined') {
  global.goingBack = false;
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const DEBUG = true;
const EDGE_WIDTH = 44;
const BACK_DIST = SCREEN_WIDTH * 0.18;
const BACK_VEL = 0.45;
const DOWN_DIST = SCREEN_HEIGHT * 0.24;
const DOWN_VEL = 0.9;

function d(...args: any[]) {
  if (DEBUG) console.log('[GlobalGesture]', ...args);
}

type Props = {
  children: React.ReactNode;
  onEdgeSwipeBack?: () => void;
  onModalSwipeDown?: () => void;
};

export default function GlobalGestureHandler({
  children,
  onEdgeSwipeBack,
  onModalSwipeDown,
}: Props) {
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const initialTouchXRef = useRef<number | null>(null);
  const panResponderEnabled = useRef(true);

  const isModal = typeof onModalSwipeDown === 'function';

  const haptic = () => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  };

  // ✅ Safety: check for global.__rootGoBack on mount
  useEffect(() => {
    if (!global.__rootGoBack) {
      console.warn(
        '[GlobalGesture] ⚠️ global.__rootGoBack is not defined. Make sure RootNavigator sets it in useEffect.',
      );
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e, g) => {
        initialTouchXRef.current = e.nativeEvent.pageX;
        d('START pageX:', e.nativeEvent.pageX, 'x0:', g.x0);
        return false;
      },

      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponderCapture: (e, g) => {
        if (!panResponderEnabled.current) return false;

        const initialX =
          initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
        const fromEdge = initialX <= EDGE_WIDTH;
        const horizontalIntent = fromEdge && g.dx > 12 && Math.abs(g.dy) < 40;
        const downwardIntent = isModal && g.dy > 72 && Math.abs(g.dx) < 28;
        return (
          panResponderEnabled.current && (horizontalIntent || downwardIntent)
        );
      },

      onMoveShouldSetPanResponder: (e, g) => {
        if (!panResponderEnabled.current) return false;

        const initialX =
          initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
        const fromEdge = initialX <= EDGE_WIDTH;
        const horizontalIntent = fromEdge && g.dx > 12 && Math.abs(g.dy) < 40;
        const downwardIntent = isModal && g.dy > 72 && Math.abs(g.dx) < 28;

        d('MOVE-SHOULD-SET', {
          pageX: e.nativeEvent.pageX,
          x0: g.x0,
          initialX,
          dx: g.dx,
          dy: g.dy,
          vx: g.vx,
          vy: g.vy,
          fromEdge,
          horizontalIntent,
          downwardIntent,
          take: horizontalIntent || downwardIntent,
        });

        return (
          panResponderEnabled.current && (horizontalIntent || downwardIntent)
        );
      },

      onPanResponderGrant: (e, g) => {
        d('GRANT from initialX:', initialTouchXRef.current, 'g.x0:', g.x0);
      },

      onPanResponderMove: (_e, g) => {
        if (!panResponderEnabled.current) return;

        const initialX =
          initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
        const fromEdge = initialX <= EDGE_WIDTH;

        if (fromEdge && g.dx > 0) {
          panX.setValue(Math.min(g.dx, SCREEN_WIDTH));
        }

        if (isModal && g.dy > 0 && Math.abs(g.dx) < 56) {
          panY.setValue(Math.min(g.dy, SCREEN_HEIGHT));
        }
      },

      onPanResponderRelease: (_e, g) => {
        if (!panResponderEnabled.current) {
          d('🚫 Gesture ignored because responder disabled');
          initialTouchXRef.current = null;
          return;
        }

        const initialX =
          initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
        const fromEdge = initialX <= EDGE_WIDTH;

        const backTriggered = fromEdge && (g.dx > BACK_DIST || g.vx > BACK_VEL);
        const downTriggered = isModal && (g.dy > DOWN_DIST || g.vy > DOWN_VEL);

        d('RELEASE', {
          initialX,
          dx: g.dx,
          dy: g.dy,
          vx: g.vx,
          vy: g.vy,
          backTriggered,
          downTriggered,
        });

        if (backTriggered) {
          haptic();

          if (global.goingBack) {
            d('⚠️ Gesture ignored because already going back');
            return;
          }

          global.goingBack = true;
          setTimeout(() => {
            global.goingBack = false;
          }, 400);

          // ✅ Trigger goBack now — try prop first, fallback to global.__rootGoBack
          d('⬅️ Triggering goBack from gesture');
          if (onEdgeSwipeBack) {
            onEdgeSwipeBack();
          } else if (global.__rootGoBack) {
            global.__rootGoBack();
          } else {
            console.warn('[GlobalGesture] ❌ No goBack handler defined.');
          }

          panResponderEnabled.current = false;
          setTimeout(() => {
            panResponderEnabled.current = true;
          }, 500);

          Animated.timing(panX, {
            toValue: SCREEN_WIDTH,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            panX.setValue(0);
          });

          Animated.timing(panY, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }).start();

          initialTouchXRef.current = null;
          return;
        }

        if (downTriggered) {
          haptic();
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            panY.setValue(0);
            onModalSwipeDown?.();
          });

          Animated.timing(panX, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }

        initialTouchXRef.current = null;
      },

      onPanResponderTerminationRequest: () => false,

      onPanResponderTerminate: () => {
        d('TERMINATE -> reset');
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
        initialTouchXRef.current = null;
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {transform: [{translateX: panX}, {translateY: panY}]},
      ]}>
      {DEBUG && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: EDGE_WIDTH,
            backgroundColor: 'rgba(255,0,0,0.08)',
          }}
        />
      )}

      <View style={{flex: 1}} pointerEvents="box-none">
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {flex: 1, backgroundColor: 'transparent'},
});

///////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   StyleSheet,
//   View,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// const DEBUG = true; // turn off when done
// const EDGE_WIDTH = 44; // widened for reliable back detection
// const BACK_DIST = SCREEN_WIDTH * 0.18;
// const BACK_VEL = 0.45;

// // Only arm down-dismiss on real modals/sheets
// const DOWN_DIST = SCREEN_HEIGHT * 0.24; // a bit harder to arm
// const DOWN_VEL = 0.9;

// function d(...args: any[]) {
//   if (DEBUG) console.log('[GlobalGesture]', ...args);
// }

// type Props = {
//   children: React.ReactNode;
//   onEdgeSwipeBack?: () => void;
//   onModalSwipeDown?: () => void; // pass ONLY on modal/sheet screens
// };

// export default function GlobalGestureHandler({
//   children,
//   onEdgeSwipeBack,
//   onModalSwipeDown,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current;
//   const initialTouchXRef = useRef<number | null>(null);

//   const isModal = typeof onModalSwipeDown === 'function';

//   const haptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: (e, g) => {
//         initialTouchXRef.current = e.nativeEvent.pageX;
//         d('START pageX:', e.nativeEvent.pageX, 'x0:', g.x0);
//         return false;
//       },
//       //   onStartShouldSetPanResponderCapture: e => {
//       //     initialTouchXRef.current = e.nativeEvent.pageX;
//       //     return false;
//       //   },

//       //   onStartShouldSetPanResponderCapture: e => {
//       //     const x = e.nativeEvent.pageX;
//       //     initialTouchXRef.current = x;
//       //     // 👇 If we start inside the edge band, capture immediately so ScrollView can't steal it
//       //     return x <= EDGE_WIDTH;
//       //   },

//       onStartShouldSetPanResponderCapture: () => false,

//       onMoveShouldSetPanResponderCapture: (e, g) => {
//         const initialX =
//           initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
//         const fromEdge = initialX <= EDGE_WIDTH;
//         const horizontalIntent = fromEdge && g.dx > 12 && Math.abs(g.dy) < 40;
//         const downwardIntent = isModal && g.dy > 72 && Math.abs(g.dx) < 28;
//         return horizontalIntent || downwardIntent; // only capture once it’s actually a swipe
//       },

//       onMoveShouldSetPanResponder: (e, g) => {
//         const initialX =
//           initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
//         const fromEdge = initialX <= EDGE_WIDTH;

//         // iOS-like arming: small horizontal move with low vertical noise
//         const horizontalIntent = fromEdge && g.dx > 12 && Math.abs(g.dy) < 40;
//         // Only allow downward intent if this is a real modal
//         const downwardIntent = isModal && g.dy > 72 && Math.abs(g.dx) < 28;

//         d('MOVE-SHOULD-SET', {
//           pageX: e.nativeEvent.pageX,
//           x0: g.x0,
//           initialX,
//           dx: g.dx,
//           dy: g.dy,
//           vx: g.vx,
//           vy: g.vy,
//           fromEdge,
//           horizontalIntent,
//           downwardIntent,
//           take: horizontalIntent || downwardIntent,
//         });

//         return horizontalIntent || downwardIntent;
//       },

//       onPanResponderGrant: (e, g) => {
//         d('GRANT from initialX:', initialTouchXRef.current, 'g.x0:', g.x0);
//       },

//       onPanResponderMove: (_e, g) => {
//         const initialX =
//           initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
//         const fromEdge = initialX <= EDGE_WIDTH;

//         // Edge-back: move right only
//         if (fromEdge && g.dx > 0) {
//           panX.setValue(Math.min(g.dx, SCREEN_WIDTH));
//         }

//         // Down dismiss (only if enabled)
//         if (isModal && g.dy > 0 && Math.abs(g.dx) < 56) {
//           panY.setValue(Math.min(g.dy, SCREEN_HEIGHT));
//         }
//       },

//       onPanResponderRelease: (_e, g) => {
//         const initialX =
//           initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
//         const fromEdge = initialX <= EDGE_WIDTH;

//         const backTriggered = fromEdge && (g.dx > BACK_DIST || g.vx > BACK_VEL);
//         const downTriggered = isModal && (g.dy > DOWN_DIST || g.vy > DOWN_VEL);

//         d('RELEASE', {
//           initialX,
//           dx: g.dx,
//           dy: g.dy,
//           vx: g.vx,
//           vy: g.vy,
//           backTriggered,
//           downTriggered,
//         });

//         if (backTriggered && onEdgeSwipeBack) {
//           haptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onEdgeSwipeBack?.(); // POP the stack in your screen
//           });
//           Animated.timing(panY, {
//             toValue: 0,
//             duration: 1,
//             useNativeDriver: true,
//           }).start();
//           initialTouchXRef.current = null;
//           return; // ✅ do not evaluate down/reset in the same frame
//         }

//         if (downTriggered) {
//           haptic();
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(() => {
//             panY.setValue(0);
//             onModalSwipeDown?.();
//           });
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 1,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           Animated.spring(panX, {
//             toValue: 0,
//             useNativeDriver: true,
//             bounciness: 0,
//           }).start();
//           Animated.spring(panY, {
//             toValue: 0,
//             useNativeDriver: true,
//             bounciness: 0,
//           }).start();
//         }

//         initialTouchXRef.current = null;
//       },

//       //   onPanResponderTerminationRequest: () => true,
//       onPanResponderTerminationRequest: () => false,

//       onPanResponderTerminate: () => {
//         d('TERMINATE -> reset');
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//         Animated.spring(panY, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//         initialTouchXRef.current = null;
//       },
//     }),
//   ).current;

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       pointerEvents="box-none"
//       style={[
//         styles.wrapper,
//         {transform: [{translateX: panX}, {translateY: panY}]},
//       ]}>
//       {DEBUG && (
//         <View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             left: 0,
//             top: 0,
//             bottom: 0,
//             width: EDGE_WIDTH,
//             backgroundColor: 'rgba(255,0,0,0.08)',
//           }}
//         />
//       )}

//       <View style={{flex: 1}} pointerEvents="box-none">
//         {children}
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {flex: 1, backgroundColor: 'transparent'},
// });

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   StyleSheet,
//   View,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// const DEBUG = true; // turn off when done
// const EDGE_WIDTH = 44; // widened for reliable back detection
// const BACK_DIST = SCREEN_WIDTH * 0.18;
// const BACK_VEL = 0.45;

// // Only arm down-dismiss on real modals/sheets
// const DOWN_DIST = SCREEN_HEIGHT * 0.24; // a bit harder to arm
// const DOWN_VEL = 0.9;

// function d(...args: any[]) {
//   if (DEBUG) console.log('[GlobalGesture]', ...args);
// }

// type Props = {
//   children: React.ReactNode;
//   onEdgeSwipeBack?: () => void;
//   onModalSwipeDown?: () => void; // pass ONLY on modal/sheet screens
// };

// export default function GlobalGestureHandler({
//   children,
//   onEdgeSwipeBack,
//   onModalSwipeDown,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current;
//   const initialTouchXRef = useRef<number | null>(null);

//   const isModal = typeof onModalSwipeDown === 'function';

//   const haptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: (e, g) => {
//         initialTouchXRef.current = e.nativeEvent.pageX;
//         d('START pageX:', e.nativeEvent.pageX, 'x0:', g.x0);
//         return false;
//       },
//       //   onStartShouldSetPanResponderCapture: e => {
//       //     initialTouchXRef.current = e.nativeEvent.pageX;
//       //     return false;
//       //   },

//       onStartShouldSetPanResponderCapture: e => {
//         const x = e.nativeEvent.pageX;
//         initialTouchXRef.current = x;
//         // 👇 If we start inside the edge band, capture immediately so ScrollView can't steal it
//         return x <= EDGE_WIDTH;
//       },

//       onMoveShouldSetPanResponder: (e, g) => {
//         const initialX =
//           initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
//         const fromEdge = initialX <= EDGE_WIDTH;

//         // iOS-like arming: small horizontal move with low vertical noise
//         const horizontalIntent = fromEdge && g.dx > 12 && Math.abs(g.dy) < 40;
//         // Only allow downward intent if this is a real modal
//         const downwardIntent = isModal && g.dy > 72 && Math.abs(g.dx) < 28;

//         d('MOVE-SHOULD-SET', {
//           pageX: e.nativeEvent.pageX,
//           x0: g.x0,
//           initialX,
//           dx: g.dx,
//           dy: g.dy,
//           vx: g.vx,
//           vy: g.vy,
//           fromEdge,
//           horizontalIntent,
//           downwardIntent,
//           take: horizontalIntent || downwardIntent,
//         });

//         return horizontalIntent || downwardIntent;
//       },

//       onPanResponderGrant: (e, g) => {
//         d('GRANT from initialX:', initialTouchXRef.current, 'g.x0:', g.x0);
//       },

//       onPanResponderMove: (_e, g) => {
//         const initialX =
//           initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
//         const fromEdge = initialX <= EDGE_WIDTH;

//         // Edge-back: move right only
//         if (fromEdge && g.dx > 0) {
//           panX.setValue(Math.min(g.dx, SCREEN_WIDTH));
//         }

//         // Down dismiss (only if enabled)
//         if (isModal && g.dy > 0 && Math.abs(g.dx) < 56) {
//           panY.setValue(Math.min(g.dy, SCREEN_HEIGHT));
//         }
//       },

//       onPanResponderRelease: (_e, g) => {
//         const initialX =
//           initialTouchXRef.current ?? g.x0 ?? Number.MAX_SAFE_INTEGER;
//         const fromEdge = initialX <= EDGE_WIDTH;

//         const backTriggered = fromEdge && (g.dx > BACK_DIST || g.vx > BACK_VEL);
//         const downTriggered = isModal && (g.dy > DOWN_DIST || g.vy > DOWN_VEL);

//         d('RELEASE', {
//           initialX,
//           dx: g.dx,
//           dy: g.dy,
//           vx: g.vx,
//           vy: g.vy,
//           backTriggered,
//           downTriggered,
//         });

//         if (backTriggered && onEdgeSwipeBack) {
//           haptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onEdgeSwipeBack?.(); // POP the stack in your screen
//           });
//           Animated.timing(panY, {
//             toValue: 0,
//             duration: 1,
//             useNativeDriver: true,
//           }).start();
//           initialTouchXRef.current = null;
//           return; // ✅ do not evaluate down/reset in the same frame
//         }

//         if (downTriggered) {
//           haptic();
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(() => {
//             panY.setValue(0);
//             onModalSwipeDown?.();
//           });
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 1,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           Animated.spring(panX, {
//             toValue: 0,
//             useNativeDriver: true,
//             bounciness: 0,
//           }).start();
//           Animated.spring(panY, {
//             toValue: 0,
//             useNativeDriver: true,
//             bounciness: 0,
//           }).start();
//         }

//         initialTouchXRef.current = null;
//       },

//       //   onPanResponderTerminationRequest: () => true,
//       onPanResponderTerminationRequest: () => false,
//       onPanResponderTerminate: () => {
//         d('TERMINATE -> reset');
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//         Animated.spring(panY, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//         initialTouchXRef.current = null;
//       },
//     }),
//   ).current;

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       pointerEvents="box-none"
//       style={[
//         styles.wrapper,
//         {transform: [{translateX: panX}, {translateY: panY}]},
//       ]}>
//       {DEBUG && (
//         <View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             left: 0,
//             top: 0,
//             bottom: 0,
//             width: EDGE_WIDTH,
//             backgroundColor: 'rgba(255,0,0,0.08)',
//           }}
//         />
//       )}

//       <View style={{flex: 1}} pointerEvents="box-none">
//         {children}
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {flex: 1, backgroundColor: 'transparent'},
// });

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   StyleSheet,
//   View,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// // iOS-like thresholds — conservative to avoid accidental triggers
// const EDGE_WIDTH = 20; // left-edge grab zone
// const BACK_DIST = SCREEN_WIDTH * 0.18; // ~18% width
// const BACK_VEL = 0.45; // swipe velocity to trigger back
// const DOWN_DIST = SCREEN_HEIGHT * 0.18; // ~18% height
// const DOWN_VEL = 0.6; // downward velocity to trigger dismiss

// type Props = {
//   children: React.ReactNode;
//   onEdgeSwipeBack?: () => void; // called when edge-swipe back triggers
//   onModalSwipeDown?: () => void; // called when downward dismiss triggers
// };

// export default function GlobalGestureHandler({
//   children,
//   onEdgeSwipeBack,
//   onModalSwipeDown,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current;

//   const haptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   // guards so we don’t hijack normal scrolls
//   const panResponder = useRef(
//     PanResponder.create({
//       // Only start when:
//       // - horizontal move begins from left EDGE, or
//       // - a big downward pull (not a tiny scroll)
//       onMoveShouldSetPanResponder: (e, g) => {
//         const fromEdge = e.nativeEvent.pageX <= EDGE_WIDTH;
//         const horizontalIntent =
//           fromEdge && Math.abs(g.dx) > 24 && Math.abs(g.dy) < 32;
//         const downwardIntent = g.dy > 72 && Math.abs(g.dx) < 28; // strong downward pull
//         return horizontalIntent || downwardIntent;
//       },

//       onPanResponderMove: (e, g) => {
//         const fromEdge = e.nativeEvent.pageX <= EDGE_WIDTH;

//         // Edge-back: allow rightward translation, clamp to width
//         if (fromEdge && g.dx > 0) {
//           const nx = Math.min(g.dx, SCREEN_WIDTH);
//           panX.setValue(nx);
//         }

//         // Downward dismiss: allow positive Y translation, clamp to height
//         if (g.dy > 0 && Math.abs(g.dx) < 56) {
//           const ny = Math.min(g.dy, SCREEN_HEIGHT);
//           panY.setValue(ny);
//         }
//       },

//       onPanResponderRelease: (e, g) => {
//         const fromEdge = e.nativeEvent.pageX <= EDGE_WIDTH;

//         const backTriggered = fromEdge && (g.dx > BACK_DIST || g.vx > BACK_VEL);
//         const downTriggered = g.dy > DOWN_DIST || g.vy > DOWN_VEL;

//         if (backTriggered && onEdgeSwipeBack) {
//           haptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onEdgeSwipeBack?.();
//           });
//           // reset Y just in case
//           Animated.timing(panY, {
//             toValue: 0,
//             duration: 1,
//             useNativeDriver: true,
//           }).start();
//           return;
//         }

//         if (downTriggered && onModalSwipeDown) {
//           haptic();
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(() => {
//             panY.setValue(0);
//             onModalSwipeDown?.();
//           });
//           // reset X just in case
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 1,
//             useNativeDriver: true,
//           }).start();
//           return;
//         }

//         // Otherwise, snap back cleanly
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//         Animated.spring(panY, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//       },

//       onPanResponderTerminationRequest: () => true,
//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//         Animated.spring(panY, {
//           toValue: 0,
//           useNativeDriver: true,
//           bounciness: 0,
//         }).start();
//       },
//     }),
//   ).current;

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       // box-none lets children receive touches; we only intercept when our guards pass
//       pointerEvents="box-none"
//       style={[
//         styles.wrapper,
//         {transform: [{translateX: panX}, {translateY: panY}]},
//       ]}>
//       <View style={{flex: 1}} pointerEvents="box-none">
//         {children}
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     backgroundColor: 'transparent',
//   },
// });

/////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useEffect} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   View,
//   StyleSheet,
//   ScrollView,
//   RefreshControl,
// } from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// type Props = {
//   children: React.ReactNode;
//   onEdgeSwipeBack?: () => void;
//   onModalSwipeDown?: () => void;
//   onRefresh?: () => void;
// };

// export default function GlobalGestureHandler({
//   children,
//   onEdgeSwipeBack,
//   onModalSwipeDown,
//   onRefresh,
// }: Props) {
//   const panX = useRef(new Animated.Value(0)).current;
//   const panY = useRef(new Animated.Value(0)).current;

//   const isRefreshing = useRef(false);
//   const pullDistance = useRef(new Animated.Value(0)).current;

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   // 🌍 Global PanResponder for edge/back + modal swipe down
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (e, g) =>
//         Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
//       onPanResponderMove: (e, g) => {
//         // 🫱 Edge-swipe back
//         if (g.dx > 0 && e.nativeEvent.pageX < 20) {
//           panX.setValue(g.dx);
//         }
//         // ⬇️ Global swipe down for modal dismiss
//         if (g.dy > 0 && g.dy < SCREEN_HEIGHT * 0.4) {
//           panY.setValue(g.dy);
//         }
//       },
//       onPanResponderRelease: (e, g) => {
//         const shouldGoBack = g.dx > SCREEN_WIDTH * 0.15 || g.vx > 0.4;
//         const shouldDismiss = g.dy > SCREEN_HEIGHT * 0.15 || g.vy > 0.6;

//         if (shouldGoBack && e.nativeEvent.pageX < 20 && onEdgeSwipeBack) {
//           triggerHaptic();
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             onEdgeSwipeBack?.();
//           });
//         } else if (shouldDismiss && onModalSwipeDown) {
//           triggerHaptic();
//           Animated.timing(panY, {
//             toValue: SCREEN_HEIGHT,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(() => {
//             panY.setValue(0);
//             onModalSwipeDown?.();
//           });
//         } else {
//           Animated.spring(panX, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//           Animated.spring(panY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   // 🔄 Pull-to-refresh animation logic
//   const onScroll = (e: any) => {
//     const offsetY = e.nativeEvent.contentOffset.y;
//     if (offsetY < 0 && onRefresh) {
//       pullDistance.current.setValue(Math.abs(offsetY));
//     }
//   };

//   const handleRefreshRelease = () => {
//     if (
//       pullDistance.current._value > 80 &&
//       !isRefreshing.current &&
//       onRefresh
//     ) {
//       isRefreshing.current = true;
//       triggerHaptic();
//       onRefresh?.();
//       setTimeout(() => {
//         isRefreshing.current = false;
//         pullDistance.current.setValue(0);
//       }, 1200);
//     } else {
//       Animated.spring(pullDistance.current, {
//         toValue: 0,
//         useNativeDriver: true,
//       }).start();
//     }
//   };

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       style={[
//         styles.wrapper,
//         {
//           transform: [{translateX: panX}, {translateY: panY}],
//         },
//       ]}>
//       <ScrollView
//         scrollEventThrottle={16}
//         onScroll={onScroll}
//         onScrollEndDrag={handleRefreshRelease}
//         refreshControl={
//           onRefresh ? (
//             <RefreshControl
//               refreshing={false}
//               onRefresh={onRefresh}
//               tintColor="#999"
//               title="Pull to refresh"
//             />
//           ) : undefined
//         }
//         contentContainerStyle={{flexGrow: 1}}>
//         {children}
//       </ScrollView>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     backgroundColor: 'transparent',
//   },
// });
