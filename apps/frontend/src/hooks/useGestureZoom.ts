import {useRef} from 'react';
import {Animated, GestureResponderEvent} from 'react-native';

export default function useGestureZoom() {
  const scale = useRef(new Animated.Value(1)).current;
  const position = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const initialDistance = useRef<number | null>(null);
  const lastTap = useRef<number>(0);
  const zoomLevels = [1, 2, 3];
  let currentZoomIndex = 0;

  const handleDoubleTap = () => {
    currentZoomIndex = (currentZoomIndex + 1) % zoomLevels.length;
    Animated.spring(scale, {
      toValue: zoomLevels[currentZoomIndex],
      useNativeDriver: true,
    }).start();
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    if (touches.length === 1 && scale._value > 1) {
      const touch = touches[0];
      const dx = touch.pageX - 150;
      const dy = touch.pageY - 150;
      const maxOffset = (300 * (scale._value - 1)) / 2;
      const clampedX = Math.max(-maxOffset, Math.min(maxOffset, dx));
      const clampedY = Math.max(-maxOffset, Math.min(maxOffset, dy));
      position.setValue({x: clampedX, y: clampedY});
    }

    if (touches.length === 2) {
      const [touch1, touch2] = touches;
      const distance = Math.hypot(
        touch1.pageX - touch2.pageX,
        touch1.pageY - touch2.pageY,
      );

      if (initialDistance.current === null) {
        initialDistance.current = distance;
      } else {
        const scaleFactor = Math.min(
          3,
          Math.max(1, distance / initialDistance.current),
        );
        scale.setValue(scaleFactor);
      }
    }
  };

  const handleTouchEnd = () => {
    initialDistance.current = null;
    if (scale._value <= 1) {
      Animated.parallel([
        Animated.spring(scale, {toValue: 1, useNativeDriver: true}),
        Animated.spring(position, {
          toValue: {x: 0, y: 0},
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleSwipeRelease = () => {
    const {x, y} = position.__getValue();
    const threshold = 100;

    if (Math.abs(x) > threshold || Math.abs(y) > threshold) {
      // Dismiss image
      Animated.timing(position, {
        toValue: {x: 1000 * Math.sign(x || 1), y},
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Snap back
      Animated.spring(position, {
        toValue: {x: 0, y: 0},
        useNativeDriver: true,
      }).start();
    }
  };

  return {
    scale,
    position,
    handleDoubleTap,
    handleTouchMove,
    handleTouchEnd,
    handleSwipeRelease,
  };
}
