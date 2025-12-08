import {Animated} from 'react-native';

export {};

declare global {
  var _motionHistoryFront: number[] | undefined;
  var _motionHistorySide: number[] | undefined;
  var showCountdown: (() => void) | undefined;
  var __navScrollY: Animated.Value | undefined;
}
