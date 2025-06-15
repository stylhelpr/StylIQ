import React, {useRef} from 'react';
import {Pressable, Animated, StyleProp, ViewStyle} from 'react-native';
import {triggerHaptic} from '../../utils/haptics';

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  hapticStyle?:
    | 'impactLight'
    | 'impactMedium'
    | 'impactHeavy'
    | 'notificationSuccess'
    | 'notificationWarning'
    | 'notificationError';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export default function AppleTouchFeedback({
  children,
  onPress,
  onLongPress,
  hapticStyle = 'impactLight',
  style,
  disabled = false,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    if (hapticStyle) {
      triggerHaptic(hapticStyle);
    }
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 10,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{opacity: disabled ? 0.5 : 1}} // Visual feedback for disabled state
    >
      <Animated.View style={[{transform: [{scale}]}, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

///////////

// import React, {useRef} from 'react';
// import {Pressable, Animated, StyleProp, ViewStyle} from 'react-native';
// import {triggerHaptic} from '../../utils/haptics';

// type Props = {
//   children: React.ReactNode;
//   onPress: () => void;
//   onLongPress?: () => void;
//   hapticStyle?:
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError';
//   style?: StyleProp<ViewStyle>; // <-- Changed here
// };

// export default function AppleTouchFeedback({
//   children,
//   onPress,
//   onLongPress,
//   hapticStyle = 'impactLight',
//   style,
// }: Props) {
//   const scale = useRef(new Animated.Value(1)).current;

//   const handlePressIn = () => {
//     if (hapticStyle) {
//       triggerHaptic(hapticStyle);
//     }
//     Animated.spring(scale, {
//       toValue: 0.9,
//       useNativeDriver: true,
//       speed: 40,
//       bounciness: 8,
//     }).start();
//   };

//   const handlePressOut = () => {
//     Animated.spring(scale, {
//       toValue: 1,
//       useNativeDriver: true,
//       speed: 30,
//       bounciness: 10,
//     }).start();
//   };

//   return (
//     <Pressable
//       onPress={onPress}
//       onLongPress={onLongPress}
//       onPressIn={handlePressIn}
//       onPressOut={handlePressOut}>
//       <Animated.View style={[{transform: [{scale}]}, style]}>
//         {children}
//       </Animated.View>
//     </Pressable>
//   );
// }
