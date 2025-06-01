import React, {useRef} from 'react';
import {
  Animated,
  Image,
  PanResponder,
  StyleProp,
  StyleSheet,
  ImageStyle,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';

type Props = {
  imageUri: string;
  defaultStyle: StyleProp<ImageStyle>;
};

export default function OverlayItem({imageUri, defaultStyle}: Props) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const initialDistance = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x.__getValue(),
          y: pan.y.__getValue(),
        });
      },
      onPanResponderMove: (
        e: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        if (e.nativeEvent.touches.length === 2) {
          const [touch1, touch2] = e.nativeEvent.touches;
          const dx = touch1.pageX - touch2.pageX;
          const dy = touch1.pageY - touch2.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (initialDistance.current === 0) {
            initialDistance.current = distance;
          } else {
            const scaleFactor =
              (distance / initialDistance.current) * lastScale.current;
            scale.setValue(scaleFactor);
          }
        } else {
          Animated.event([null, {dx: pan.x, dy: pan.y}], {
            useNativeDriver: false,
          })(e, gestureState);
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        lastScale.current = scale.__getValue();
        initialDistance.current = 0;
      },
    }),
  ).current;

  if (!imageUri) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        defaultStyle,
        {transform: [...pan.getTranslateTransform(), {scale}]},
      ]}
      {...panResponder.panHandlers}>
      <Image
        source={{uri: imageUri}}
        style={styles.image}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

///////////////

// import React, {useRef} from 'react';
// import {
//   Animated,
//   Image,
//   PanResponder,
//   StyleProp,
//   StyleSheet,
//   ViewStyle,
//   ImageStyle,
//   View,
//   GestureResponderEvent,
//   PanResponderGestureState,
// } from 'react-native';

// type Props = {
//   imageUri: string;
//   defaultStyle: StyleProp<ImageStyle>;
// };

// export default function OverlayItem({imageUri, defaultStyle}: Props) {
//   const pan = useRef(new Animated.ValueXY()).current;
//   const scale = useRef(new Animated.Value(1)).current;
//   const lastScale = useRef(1);
//   const initialDistance = useRef(0);

//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: () => {
//         pan.setOffset({
//           x: (pan as any).__getValue().x,
//           y: (pan as any).__getValue().y,
//         });
//       },
//       onPanResponderMove: (
//         e: GestureResponderEvent,
//         gestureState: PanResponderGestureState,
//       ) => {
//         if (e.nativeEvent.touches.length === 2) {
//           const [touch1, touch2] = e.nativeEvent.touches;
//           const dx = touch1.pageX - touch2.pageX;
//           const dy = touch1.pageY - touch2.pageY;
//           const distance = Math.sqrt(dx * dx + dy * dy);

//           if (initialDistance.current === 0) {
//             initialDistance.current = distance;
//           } else {
//             const scaleFactor =
//               (distance / initialDistance.current) * lastScale.current;
//             scale.setValue(scaleFactor);
//           }
//         } else {
//           Animated.event([null, {dx: pan.x, dy: pan.y}], {
//             useNativeDriver: false,
//           })(e, gestureState);
//         }
//       },
//       onPanResponderRelease: () => {
//         pan.flattenOffset();
//         lastScale.current = (scale as any).__getValue();
//         initialDistance.current = 0;
//       },
//     }),
//   ).current;

//   return (
//     <Animated.View
//       style={[
//         defaultStyle,
//         {transform: [...pan.getTranslateTransform(), {scale}]},
//       ]}
//       {...panResponder.panHandlers}>
//       <Image
//         source={{uri: imageUri}}
//         style={StyleSheet.absoluteFill}
//         resizeMode="contain"
//       />
//     </Animated.View>
//   );
// }
