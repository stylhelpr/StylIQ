export {};

declare global {
  var _motionHistoryFront: number[] | undefined;
  var _motionHistorySide: number[] | undefined;
  var showCountdown: (() => void) | undefined;
}
