import React, {useCallback} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useSharedValue, runOnJS} from 'react-native-reanimated';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const EDGE_WIDTH = 30;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const VELOCITY_THRESHOLD = 300;

type Props = {
  children: React.ReactNode;
  onSwipeBack: () => void;
  enabled?: boolean;
};

export default function SwipeBackHandler({
  children,
  onSwipeBack,
  enabled = true,
}: Props) {
  const startedFromEdge = useSharedValue(false);

  const doNavigate = useCallback(() => {
    onSwipeBack();
  }, [onSwipeBack]);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX(15)
    .failOffsetY([-25, 25])
    .onBegin((event) => {
      'worklet';
      startedFromEdge.value = event.x <= EDGE_WIDTH;
    })
    .onEnd((event) => {
      'worklet';
      if (!startedFromEdge.value) return;

      const shouldGoBack =
        event.translationX > SWIPE_THRESHOLD ||
        event.velocityX > VELOCITY_THRESHOLD;

      if (shouldGoBack) {
        runOnJS(doNavigate)();
      }

      startedFromEdge.value = false;
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
