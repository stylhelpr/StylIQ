import React, {useCallback} from 'react';
import {StyleSheet, Dimensions} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import FastImage from 'react-native-fast-image';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Base size for items on canvas
const BASE_ITEM_SIZE = 120;

export type CanvasItemData = {
  id: string;
  wardrobeItemId: string;
  imageUrl: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  scale: number; // 0.3-3.0
  zIndex: number;
};

type Props = {
  item: CanvasItemData;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onScaleChange: (scale: number) => void;
  onBringToFront: () => void;
  onLongPress: () => void;
};

export default function CanvasItem({
  item,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  onPositionChange,
  onScaleChange,
  onBringToFront,
  onLongPress,
}: Props) {
  // Convert normalized position to pixel position
  const itemSize = BASE_ITEM_SIZE * item.scale;
  const initialX = item.x * canvasWidth - itemSize / 2;
  const initialY = item.y * canvasHeight - itemSize / 2;

  // Shared values for animations
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const scale = useSharedValue(item.scale);
  const savedTranslateX = useSharedValue(initialX);
  const savedTranslateY = useSharedValue(initialY);
  const savedScale = useSharedValue(item.scale);

  // Convert pixel position back to normalized (0-1)
  const getNormalizedPosition = useCallback(
    (pixelX: number, pixelY: number, currentScale: number) => {
      const centerX = pixelX + (BASE_ITEM_SIZE * currentScale) / 2;
      const centerY = pixelY + (BASE_ITEM_SIZE * currentScale) / 2;
      return {
        x: Math.max(0, Math.min(1, centerX / canvasWidth)),
        y: Math.max(0, Math.min(1, centerY / canvasHeight)),
      };
    },
    [canvasWidth, canvasHeight],
  );

  // Handle position change callback
  const handlePositionChange = useCallback(
    (pixelX: number, pixelY: number, currentScale: number) => {
      const {x, y} = getNormalizedPosition(pixelX, pixelY, currentScale);
      onPositionChange(x, y);
    },
    [getNormalizedPosition, onPositionChange],
  );

  // Handle scale change callback
  const handleScaleChange = useCallback(
    (newScale: number) => {
      onScaleChange(newScale);
    },
    [onScaleChange],
  );

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(onSelect)();
      runOnJS(onBringToFront)();
    })
    .onUpdate(event => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(handlePositionChange)(
        translateX.value,
        translateY.value,
        scale.value,
      );
    });

  // Pinch gesture for scaling
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(onSelect)();
    })
    .onUpdate(event => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(3, Math.max(0.3, newScale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(handleScaleChange)(scale.value);
      runOnJS(handlePositionChange)(
        translateX.value,
        translateY.value,
        scale.value,
      );
    });

  // Long press gesture for context menu
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(onLongPress)();
    });

  // Combine gestures - long press takes priority, then simultaneous pan+pinch
  const composedGesture = Gesture.Race(
    longPressGesture,
    Gesture.Simultaneous(panGesture, pinchGesture),
  );

  // Animated style for the item
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
        {scale: scale.value},
      ],
      zIndex: item.zIndex,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          isSelected && styles.selected,
        ]}>
        <FastImage
          source={{uri: item.imageUrl}}
          style={styles.image}
          resizeMode={FastImage.resizeMode.contain}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BASE_ITEM_SIZE,
    height: BASE_ITEM_SIZE,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  selected: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
  },
});
