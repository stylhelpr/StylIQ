import {useCallback} from 'react';
import {Animated, NativeSyntheticEvent, NativeScrollEvent} from 'react-native';

/**
 * Hook to connect a ScrollView/FlatList to the bottom navigation's
 * hide/show behavior. Returns scroll event handlers that update
 * the global nav scroll position.
 *
 * Usage:
 * ```
 * const {onScroll, scrollEventThrottle} = useNavScrollY();
 *
 * <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
 *   ...
 * </ScrollView>
 * ```
 *
 * Or with Animated.event for better performance:
 * ```
 * const {animatedScrollHandler, scrollEventThrottle} = useNavScrollY();
 *
 * <Animated.ScrollView
 *   onScroll={animatedScrollHandler}
 *   scrollEventThrottle={scrollEventThrottle}
 * >
 *   ...
 * </Animated.ScrollView>
 * ```
 */
export const useNavScrollY = () => {
  // Manual handler for regular ScrollView/FlatList
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (global.__navScrollY) {
        global.__navScrollY.setValue(event.nativeEvent.contentOffset.y);
      }
    },
    [],
  );

  // Animated.event handler for Animated.ScrollView (better performance)
  const animatedScrollHandler = global.__navScrollY
    ? Animated.event(
        [{nativeEvent: {contentOffset: {y: global.__navScrollY}}}],
        {useNativeDriver: false},
      )
    : undefined;

  return {
    onScroll,
    animatedScrollHandler,
    scrollEventThrottle: 16,
    scrollY: global.__navScrollY,
  };
};

export default useNavScrollY;
