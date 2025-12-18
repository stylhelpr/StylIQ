/* eslint-disable react-native/no-inline-styles */
import React, {useRef} from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

declare global {
  var goingBack: boolean | undefined;
  var __rootGoBack: (() => void) | undefined;
}

if (typeof global.goingBack === 'undefined') {
  global.goingBack = false;
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const EDGE_WIDTH = 50;
const BACK_THRESHOLD = SCREEN_WIDTH * 0.3;
const VELOCITY_THRESHOLD = 0.3;

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
  const startX = useRef(0);
  const isGestureActive = useRef(false);

  const isModal = typeof onModalSwipeDown === 'function';

  const haptic = () => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (e, g) => {
        if (isGestureActive.current) return false;

        const touchX = e.nativeEvent.pageX - g.dx;
        const fromEdge = touchX <= EDGE_WIDTH;
        const isHorizontalSwipe = fromEdge && g.dx > 15 && Math.abs(g.dy) < 30;
        const isVerticalSwipe = isModal && g.dy > 50 && Math.abs(g.dx) < 30;

        if (isHorizontalSwipe || isVerticalSwipe) {
          startX.current = touchX;
          return true;
        }
        return false;
      },

      onPanResponderGrant: () => {
        isGestureActive.current = true;
      },

      onPanResponderMove: (_, g) => {
        if (startX.current <= EDGE_WIDTH && g.dx > 0) {
          panX.setValue(g.dx);
        }
        if (isModal && g.dy > 0) {
          panY.setValue(g.dy);
        }
      },

      onPanResponderRelease: (_, g) => {
        isGestureActive.current = false;

        const shouldGoBack =
          startX.current <= EDGE_WIDTH &&
          (g.dx > BACK_THRESHOLD || g.vx > VELOCITY_THRESHOLD);

        const shouldDismissModal =
          isModal &&
          (g.dy > SCREEN_HEIGHT * 0.25 || g.vy > 0.5);

        if (shouldGoBack) {
          haptic();

          // Just reset and navigate - no extra animation
          panX.setValue(0);
          panY.setValue(0);

          if (onEdgeSwipeBack) {
            onEdgeSwipeBack();
          } else if (global.__rootGoBack) {
            global.__rootGoBack();
          }
        } else if (shouldDismissModal) {
          haptic();
          panX.setValue(0);
          panY.setValue(0);
          onModalSwipeDown?.();
        } else {
          // Snap back
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }

        startX.current = 0;
      },

      onPanResponderTerminate: () => {
        isGestureActive.current = false;
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        startX.current = 0;
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [{translateX: panX}, {translateY: panY}],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
