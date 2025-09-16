// react-native-gesture-recognizers.d.ts
declare module 'react-native-gesture-recognizers' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  interface GestureRecognizerProps extends ViewProps {
    onSwipe?: (direction: string, state?: any) => void;
    onSwipeUp?: (state?: any) => void;
    onSwipeDown?: (state?: any) => void;
    onSwipeLeft?: (state?: any) => void;
    onSwipeRight?: (state?: any) => void;
    onTap?: (state?: any) => void;
    config?: {
      velocityThreshold?: number;
      directionalOffsetThreshold?: number;
    };
  }

  const GestureRecognizer: ComponentType<GestureRecognizerProps>;

  export default GestureRecognizer;
}
