import React from 'react';
import {
  Animated,
  Image,
  GestureResponderEvent,
  TouchableWithoutFeedback,
} from 'react-native';
import useGestureZoom from '../../hooks/useGestureZoom';

interface GestureImageProps {
  uri: string;
}

export default function GestureImage({uri}: GestureImageProps) {
  const {
    scale,
    position,
    handleDoubleTap,
    handleTouchMove,
    handleTouchEnd,
    handleSwipeRelease,
  } = useGestureZoom();

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <Animated.View
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          handleTouchEnd();
          handleSwipeRelease();
        }}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: [
            {scale},
            {translateX: position.x},
            {translateY: position.y},
          ],
          alignSelf: 'center',
          marginTop: 32,
          borderRadius: 12,
          overflow: 'hidden',
        }}>
        <Image
          source={{uri}}
          style={{width: 300, height: 300}}
          resizeMode="cover"
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
