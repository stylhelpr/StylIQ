import React, {useRef} from 'react';
import {Pressable, Animated, ViewStyle} from 'react-native';
import {triggerHaptic} from '../../utils/haptics';

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void; // <-- added
  hapticStyle?:
    | 'impactLight'
    | 'impactMedium'
    | 'impactHeavy'
    | 'notificationSuccess'
    | 'notificationWarning'
    | 'notificationError';
  style?: ViewStyle;
};

export default function AppleTouchFeedback({
  children,
  onPress,
  onLongPress, // <-- destructure here
  hapticStyle = 'impactLight',
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (hapticStyle) {
      triggerHaptic(hapticStyle);
    }
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 10,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress} // <-- pass it here
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <Animated.View
        style={[
          {transform: [{scale}]},
          style, // Apply layout styles here so scaling + layout are synced
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

////////

// import React, {useRef} from 'react';
// import {Pressable, Animated, ViewStyle} from 'react-native';
// import {triggerHaptic} from '../../utils/haptics';

// type Props = {
//   children: React.ReactNode;
//   onPress: () => void;
//   hapticStyle?:
//     | 'impactLight'
//     | 'impactMedium'
//     | 'impactHeavy'
//     | 'notificationSuccess'
//     | 'notificationWarning'
//     | 'notificationError';
//   style?: ViewStyle;
// };

// export default function AppleTouchFeedback({
//   children,
//   onPress,
//   hapticStyle = 'impactLight',
//   style,
// }: Props) {
//   const scale = useRef(new Animated.Value(1)).current;

//   const handlePressIn = () => {
//     if (hapticStyle) {
//       triggerHaptic(hapticStyle);
//     }
//     Animated.spring(scale, {
//       toValue: 0.96,
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
//       onPressIn={handlePressIn}
//       onPressOut={handlePressOut}
//       // Remove style here to avoid conflicts
//     >
//       <Animated.View
//         style={[
//           {transform: [{scale}]},
//           style, // Apply layout styles here so scaling + layout are synced
//         ]}>
//         {children}
//       </Animated.View>
//     </Pressable>
//   );
// }
