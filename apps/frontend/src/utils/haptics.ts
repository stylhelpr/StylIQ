import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export const triggerHaptic = (
  style:
    | 'selection'
    | 'impactLight'
    | 'impactMedium'
    | 'impactHeavy'
    | 'notificationSuccess'
    | 'notificationWarning'
    | 'notificationError' = 'impactLight',
) => {
  ReactNativeHapticFeedback.trigger(style, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });
};
