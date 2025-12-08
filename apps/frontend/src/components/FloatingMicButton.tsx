// // src/components/FloatingMicButton.tsx
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   Platform,
//   StyleSheet,
//   View,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useAppTheme} from '../context/ThemeContext';
// import {routeVoiceCommand} from '../utils/VoiceUtils/voiceCommandRouter';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {moderateScale} from '../utils/scale';
// import {VoiceTarget} from '../utils/VoiceUtils/voiceTarget';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// const BUTTON_SIZE = 78;

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function FloatingMicButton({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {isRecording, startVoiceCommand} = useVoiceControl();

//   const styles = StyleSheet.create({
//     draggableContainer: {
//       position: 'absolute',
//       left: 0,
//       top: 0,
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     glassOrb: {
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE,
//       borderRadius: BUTTON_SIZE / 2,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 5},
//       overflow: 'hidden',
//     },
//   });

//   // 🟣 starting position
//   const pan = useRef(
//     new Animated.ValueXY({
//       x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
//       y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
//     }),
//   ).current;

//   // 🖐️ drag logic
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: () => {
//         pan.setOffset({
//           x: (pan.x as any)._value,
//           y: (pan.y as any)._value,
//         });
//         pan.setValue({x: 0, y: 0});
//       },
//       onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
//         useNativeDriver: false,
//       }),
//       onPanResponderRelease: () => {
//         pan.flattenOffset();
//         ReactNativeHapticFeedback.trigger('impactLight', {
//           enableVibrateFallback: true,
//         });

//         const finalX = Math.min(
//           Math.max(0, (pan.x as any)._value),
//           SCREEN_WIDTH - BUTTON_SIZE,
//         );
//         const finalY = Math.min(
//           Math.max(0, (pan.y as any)._value),
//           SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 60 : 0),
//         );

//         Animated.spring(pan, {
//           toValue: {x: finalX, y: finalY},
//           useNativeDriver: false,
//           bounciness: 10,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleVoiceCommand = async (cmd: string) => {
//     const lower = cmd.toLowerCase();
//     console.log('🎙️ Floating mic voice command received:', lower);

//     if (VoiceTarget.currentSetter) {
//       VoiceTarget.applyText(lower);
//       ReactNativeHapticFeedback.trigger('impactLight');
//       return;
//     }

//     ReactNativeHapticFeedback.trigger('impactLight');
//     await routeVoiceCommand(lower, navigate);
//   };

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       style={[
//         styles.draggableContainer,
//         {transform: [{translateX: pan.x}, {translateY: pan.y}]},
//       ]}>
//       {/* 🧊 True Liquid Glass orb */}

//       {/* <LiquidGlassView
//         style={[
//           styles.glassOrb,
//           !isLiquidGlassSupported && {
//             backgroundColor: 'rgba(4, 4, 4, 0.47)',
//           },
//           {
//             borderWidth: 3,
//             borderColor: theme.colors.button1,
//           },
//         ]}
//         // interactive
//         effect="clear"
//         tintColor="rgba(0, 0, 0, 0.46)"
//         colorScheme="system">
//         <AppleTouchFeedback
//           style={{
//             width: '100%',
//             height: '100%',
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}
//           hapticStyle="impactMedium"
//           onPress={() => startVoiceCommand(handleVoiceCommand)}>
//           <MaterialIcons
//             name="mic"
//             size={52}
//             color={isRecording ? theme.colors.primary : '#fff'}
//             style={{
//               shadowColor: '#000',
//               shadowOpacity: 0.3,
//               shadowRadius: 2,
//               shadowOffset: {width: 0, height: 4},
//             }}
//           />
//         </AppleTouchFeedback>
//       </LiquidGlassView> */}

//       {isLiquidGlassSupported ? (
//         <LiquidGlassView
//           style={[
//             styles.glassOrb,
//             {
//               borderWidth: 3,
//               borderColor: theme.colors.button1,
//             },
//           ]}
//           effect="clear"
//           tintColor="rgba(0,0,0,0.46)"
//           colorScheme="system"
//           pointerEvents="box-none">
//           <AppleTouchFeedback
//             style={{
//               width: '100%',
//               height: '100%',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}
//             hapticStyle="impactMedium"
//             onPress={() => startVoiceCommand(handleVoiceCommand)}>
//             <MaterialIcons
//               name="mic"
//               size={52}
//               color={isRecording ? theme.colors.primary : '#fff'}
//               style={{
//                 shadowColor: '#000',
//                 shadowOpacity: 0.3,
//                 shadowRadius: 2,
//                 shadowOffset: {width: 0, height: 4},
//               }}
//             />
//           </AppleTouchFeedback>
//         </LiquidGlassView>
//       ) : (
//         <View
//           style={[
//             styles.glassOrb,
//             {
//               backgroundColor: 'rgba(4, 4, 4, 0.47)',
//               borderWidth: 3,
//               borderColor: theme.colors.button1,
//             },
//           ]}>
//           <AppleTouchFeedback
//             style={{
//               width: '100%',
//               height: '100%',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}
//             hapticStyle="impactMedium"
//             onPress={() => startVoiceCommand(handleVoiceCommand)}>
//             <MaterialIcons
//               name="mic"
//               size={52}
//               color={isRecording ? theme.colors.primary : '#fff'}
//               style={{
//                 shadowColor: '#000',
//                 shadowOpacity: 0.3,
//                 shadowRadius: 2,
//                 shadowOffset: {width: 0, height: 4},
//               }}
//             />
//           </AppleTouchFeedback>
//         </View>
//       )}

//       {/* Optional overlay text for debugging */}
//       {__DEV__ && (
//         <View style={{position: 'absolute', bottom: -24, alignSelf: 'center'}}>
//           <Animated.Text
//             style={{
//               color: '#aaa',
//               fontSize: 11,
//               fontWeight: '600',
//               opacity: 0.8,
//             }}>
//             {/* {isLiquidGlassSupported ? '🧊 Real Glass' : 'Fallback'} */}
//           </Animated.Text>
//         </View>
//       )}
//     </Animated.View>
//   );
// }

//////////////////////

// src/components/FloatingMicButton.tsx
import React, {useRef} from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
import {useVoiceControl} from '../hooks/useVoiceControl';
import {useAppTheme} from '../context/ThemeContext';
import {routeVoiceCommand} from '../utils/VoiceUtils/voiceCommandRouter';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {moderateScale} from '../utils/scale';
import {VoiceTarget} from '../utils/VoiceUtils/voiceTarget';
import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';
const DISABLE_LIQUID_GLASS = true;

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const BUTTON_SIZE = 78;

type Props = {
  navigate: (screen: string) => void;
};

export default function FloatingMicButton({navigate}: Props) {
  const {theme} = useAppTheme();
  const {isRecording, startVoiceCommand} = useVoiceControl();

  const styles = StyleSheet.create({
    draggableContainer: {
      position: 'absolute',
      left: 18,
      top: -40,
      zIndex: 9999,
      elevation: 9999,
    },
    glassOrb: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 5},
      overflow: 'hidden',
    },
  });

  // 🟣 starting position
  const pan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
      y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
    }),
  ).current;

  // 🖐️ drag logic
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({x: 0, y: 0});
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        ReactNativeHapticFeedback.trigger('impactLight', {
          enableVibrateFallback: true,
        });

        const finalX = Math.min(
          Math.max(0, (pan.x as any)._value),
          SCREEN_WIDTH - BUTTON_SIZE,
        );
        const finalY = Math.min(
          Math.max(0, (pan.y as any)._value),
          SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 60 : 0),
        );

        Animated.spring(pan, {
          toValue: {x: finalX, y: finalY},
          useNativeDriver: false,
          bounciness: 10,
        }).start();
      },
    }),
  ).current;

  const handleVoiceCommand = async (cmd: string) => {
    const lower = cmd.toLowerCase();
    console.log('🎙️ Floating mic voice command received:', lower);

    if (VoiceTarget.currentSetter) {
      VoiceTarget.applyText(lower);
      ReactNativeHapticFeedback.trigger('impactLight');
      return;
    }

    ReactNativeHapticFeedback.trigger('impactLight');
    await routeVoiceCommand(lower, navigate);
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableContainer,
        {transform: [{translateX: pan.x}, {translateY: pan.y}]},
      ]}>
      {!DISABLE_LIQUID_GLASS && isLiquidGlassSupported ? (
        <LiquidGlassView
          style={[
            styles.glassOrb,
            {
              borderWidth: 3,
              borderColor: theme.colors.button1,
            },
          ]}
          effect="clear"
          tintColor="rgba(0, 0, 0, 0.46)"
          colorScheme="system">
          <AppleTouchFeedback
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hapticStyle="impactMedium"
            onPress={() => startVoiceCommand(handleVoiceCommand)}>
            <MaterialIcons
              name="mic"
              size={52}
              color={isRecording ? theme.colors.primary : '#fff'}
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 2,
                shadowOffset: {width: 0, height: 4},
              }}
            />
          </AppleTouchFeedback>
        </LiquidGlassView>
      ) : (
        // ⚡ Simple fallback view for testing performance
        <View
          style={[
            styles.glassOrb,
            {
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderWidth: 3,
              borderColor: theme.colors.button1,
            },
          ]}>
          <AppleTouchFeedback
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hapticStyle="impactMedium"
            onPress={() => startVoiceCommand(handleVoiceCommand)}>
            <MaterialIcons
              name="mic"
              size={52}
              color={isRecording ? theme.colors.primary : '#fff'}
            />
          </AppleTouchFeedback>
        </View>
      )}
    </Animated.View>
  );
}

//////////////

// // // src/components/FloatingMicButton.tsx
// // import React, {useRef} from 'react';
// // import {
// //   Animated,
// //   PanResponder,
// //   Dimensions,
// //   Platform,
// //   StyleSheet,
// //   View,
// // } from 'react-native';
// // import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// // import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// // import {useVoiceControl} from '../hooks/useVoiceControl';
// // import {useAppTheme} from '../context/ThemeContext';
// // import {routeVoiceCommand} from '../utils/VoiceUtils/voiceCommandRouter';
// // import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// // import {moderateScale} from '../utils/scale';
// // import {VoiceTarget} from '../utils/VoiceUtils/voiceTarget';
// // import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// // const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// // const BUTTON_SIZE = 78;

// // type Props = {
// //   navigate: (screen: string) => void;
// // };

// // export default function FloatingMicButton({navigate}: Props) {
// //   const {theme} = useAppTheme();
// //   const {isRecording, startVoiceCommand} = useVoiceControl();

// //   const styles = StyleSheet.create({
// //     draggableContainer: {
// //       position: 'absolute',
// //       left: 0,
// //       top: 0,
// //       zIndex: 9999,
// //       elevation: 9999,
// //     },
// //     glassOrb: {
// //       width: BUTTON_SIZE,
// //       height: BUTTON_SIZE,
// //       borderRadius: BUTTON_SIZE / 2,
// //       alignItems: 'center',
// //       justifyContent: 'center',
// //       shadowColor: '#000',
// //       shadowOpacity: 0.25,
// //       shadowRadius: 12,
// //       shadowOffset: {width: 0, height: 5},
// //       overflow: 'hidden',
// //     },
// //   });

// //   // 🟣 starting position
// //   const pan = useRef(
// //     new Animated.ValueXY({
// //       x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
// //       y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
// //     }),
// //   ).current;

// //   // 🖐️ drag logic
// //   const panResponder = useRef(
// //     PanResponder.create({
// //       onStartShouldSetPanResponder: () => true,
// //       onMoveShouldSetPanResponder: () => true,
// //       onPanResponderGrant: () => {
// //         pan.setOffset({
// //           x: (pan.x as any)._value,
// //           y: (pan.y as any)._value,
// //         });
// //         pan.setValue({x: 0, y: 0});
// //       },
// //       onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
// //         useNativeDriver: false,
// //       }),
// //       onPanResponderRelease: () => {
// //         pan.flattenOffset();
// //         ReactNativeHapticFeedback.trigger('impactLight', {
// //           enableVibrateFallback: true,
// //         });

// //         const finalX = Math.min(
// //           Math.max(0, (pan.x as any)._value),
// //           SCREEN_WIDTH - BUTTON_SIZE,
// //         );
// //         const finalY = Math.min(
// //           Math.max(0, (pan.y as any)._value),
// //           SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 60 : 0),
// //         );

// //         Animated.spring(pan, {
// //           toValue: {x: finalX, y: finalY},
// //           useNativeDriver: false,
// //           bounciness: 10,
// //         }).start();
// //       },
// //     }),
// //   ).current;

// //   const handleVoiceCommand = async (cmd: string) => {
// //     const lower = cmd.toLowerCase();
// //     console.log('🎙️ Floating mic voice command received:', lower);

// //     if (VoiceTarget.currentSetter) {
// //       VoiceTarget.applyText(lower);
// //       ReactNativeHapticFeedback.trigger('impactLight');
// //       return;
// //     }

// //     ReactNativeHapticFeedback.trigger('impactLight');
// //     await routeVoiceCommand(lower, navigate);
// //   };

// //   return (
// //     <Animated.View
// //       {...panResponder.panHandlers}
// //       style={[
// //         styles.draggableContainer,
// //         {transform: [{translateX: pan.x}, {translateY: pan.y}]},
// //       ]}>
// //       {/* 🧊 True Liquid Glass orb */}

// //       {/* <LiquidGlassView
// //         style={[
// //           styles.glassOrb,
// //           !isLiquidGlassSupported && {
// //             backgroundColor: 'rgba(4, 4, 4, 0.47)',
// //           },
// //           {
// //             borderWidth: 3,
// //             borderColor: theme.colors.button1,
// //           },
// //         ]}
// //         // interactive
// //         effect="clear"
// //         tintColor="rgba(0, 0, 0, 0.46)"
// //         colorScheme="system">
// //         <AppleTouchFeedback
// //           style={{
// //             width: '100%',
// //             height: '100%',
// //             alignItems: 'center',
// //             justifyContent: 'center',
// //           }}
// //           hapticStyle="impactMedium"
// //           onPress={() => startVoiceCommand(handleVoiceCommand)}>
// //           <MaterialIcons
// //             name="mic"
// //             size={52}
// //             color={isRecording ? theme.colors.primary : '#fff'}
// //             style={{
// //               shadowColor: '#000',
// //               shadowOpacity: 0.3,
// //               shadowRadius: 2,
// //               shadowOffset: {width: 0, height: 4},
// //             }}
// //           />
// //         </AppleTouchFeedback>
// //       </LiquidGlassView> */}

// //       {isLiquidGlassSupported ? (
// //         <LiquidGlassView
// //           style={[
// //             styles.glassOrb,
// //             {
// //               borderWidth: 3,
// //               borderColor: theme.colors.button1,
// //             },
// //           ]}
// //           effect="clear"
// //           tintColor="rgba(0,0,0,0.46)"
// //           colorScheme="system"
// //           pointerEvents="box-none">
// //           <AppleTouchFeedback
// //             style={{
// //               width: '100%',
// //               height: '100%',
// //               alignItems: 'center',
// //               justifyContent: 'center',
// //             }}
// //             hapticStyle="impactMedium"
// //             onPress={() => startVoiceCommand(handleVoiceCommand)}>
// //             <MaterialIcons
// //               name="mic"
// //               size={52}
// //               color={isRecording ? theme.colors.primary : '#fff'}
// //               style={{
// //                 shadowColor: '#000',
// //                 shadowOpacity: 0.3,
// //                 shadowRadius: 2,
// //                 shadowOffset: {width: 0, height: 4},
// //               }}
// //             />
// //           </AppleTouchFeedback>
// //         </LiquidGlassView>
// //       ) : (
// //         <View
// //           style={[
// //             styles.glassOrb,
// //             {
// //               backgroundColor: 'rgba(4, 4, 4, 0.47)',
// //               borderWidth: 3,
// //               borderColor: theme.colors.button1,
// //             },
// //           ]}>
// //           <AppleTouchFeedback
// //             style={{
// //               width: '100%',
// //               height: '100%',
// //               alignItems: 'center',
// //               justifyContent: 'center',
// //             }}
// //             hapticStyle="impactMedium"
// //             onPress={() => startVoiceCommand(handleVoiceCommand)}>
// //             <MaterialIcons
// //               name="mic"
// //               size={52}
// //               color={isRecording ? theme.colors.primary : '#fff'}
// //               style={{
// //                 shadowColor: '#000',
// //                 shadowOpacity: 0.3,
// //                 shadowRadius: 2,
// //                 shadowOffset: {width: 0, height: 4},
// //               }}
// //             />
// //           </AppleTouchFeedback>
// //         </View>
// //       )}

// //       {/* Optional overlay text for debugging */}
// //       {__DEV__ && (
// //         <View style={{position: 'absolute', bottom: -24, alignSelf: 'center'}}>
// //           <Animated.Text
// //             style={{
// //               color: '#aaa',
// //               fontSize: 11,
// //               fontWeight: '600',
// //               opacity: 0.8,
// //             }}>
// //             {/* {isLiquidGlassSupported ? '🧊 Real Glass' : 'Fallback'} */}
// //           </Animated.Text>
// //         </View>
// //       )}
// //     </Animated.View>
// //   );
// // }

// //////////////////////

// // src/components/FloatingMicButton.tsx
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   Platform,
//   StyleSheet,
//   View,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useAppTheme} from '../context/ThemeContext';
// import {routeVoiceCommand} from '../utils/VoiceUtils/voiceCommandRouter';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {moderateScale} from '../utils/scale';
// import {VoiceTarget} from '../utils/VoiceUtils/voiceTarget';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';
// const DISABLE_LIQUID_GLASS = true;

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// const BUTTON_SIZE = 78;

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function FloatingMicButton({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {isRecording, startVoiceCommand} = useVoiceControl();

//   const styles = StyleSheet.create({
//     draggableContainer: {
//       position: 'absolute',
//       left: 0,
//       top: 0,
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     glassOrb: {
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE,
//       borderRadius: BUTTON_SIZE / 2,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 5},
//       overflow: 'hidden',
//     },
//   });

//   // 🟣 starting position
//   const pan = useRef(
//     new Animated.ValueXY({
//       x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
//       y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
//     }),
//   ).current;

//   // 🖐️ drag logic
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: () => {
//         pan.setOffset({
//           x: (pan.x as any)._value,
//           y: (pan.y as any)._value,
//         });
//         pan.setValue({x: 0, y: 0});
//       },
//       onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
//         useNativeDriver: false,
//       }),
//       onPanResponderRelease: () => {
//         pan.flattenOffset();
//         ReactNativeHapticFeedback.trigger('impactLight', {
//           enableVibrateFallback: true,
//         });

//         const finalX = Math.min(
//           Math.max(0, (pan.x as any)._value),
//           SCREEN_WIDTH - BUTTON_SIZE,
//         );
//         const finalY = Math.min(
//           Math.max(0, (pan.y as any)._value),
//           SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 60 : 0),
//         );

//         Animated.spring(pan, {
//           toValue: {x: finalX, y: finalY},
//           useNativeDriver: false,
//           bounciness: 10,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleVoiceCommand = async (cmd: string) => {
//     const lower = cmd.toLowerCase();
//     console.log('🎙️ Floating mic voice command received:', lower);

//     if (VoiceTarget.currentSetter) {
//       VoiceTarget.applyText(lower);
//       ReactNativeHapticFeedback.trigger('impactLight');
//       return;
//     }

//     ReactNativeHapticFeedback.trigger('impactLight');
//     await routeVoiceCommand(lower, navigate);
//   };

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       style={[
//         styles.draggableContainer,
//         {transform: [{translateX: pan.x}, {translateY: pan.y}]},
//       ]}>
//       {!DISABLE_LIQUID_GLASS && isLiquidGlassSupported ? (
//         <LiquidGlassView
//           style={[
//             styles.glassOrb,
//             {
//               borderWidth: 3,
//               borderColor: theme.colors.button1,
//             },
//           ]}
//           effect="clear"
//           tintColor="rgba(0, 0, 0, 0.46)"
//           colorScheme="system">
//           <AppleTouchFeedback
//             style={{
//               width: '100%',
//               height: '100%',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}
//             hapticStyle="impactMedium"
//             onPress={() => startVoiceCommand(handleVoiceCommand)}>
//             <MaterialIcons
//               name="mic"
//               size={52}
//               color={isRecording ? theme.colors.primary : '#fff'}
//               style={{
//                 shadowColor: '#000',
//                 shadowOpacity: 0.3,
//                 shadowRadius: 2,
//                 shadowOffset: {width: 0, height: 4},
//               }}
//             />
//           </AppleTouchFeedback>
//         </LiquidGlassView>
//       ) : (
//         // ⚡ Simple fallback view for testing performance
//         <View
//           style={[
//             styles.glassOrb,
//             {
//               backgroundColor: 'rgba(0,0,0,0.5)',
//               borderWidth: 3,
//               borderColor: theme.colors.button1,
//             },
//           ]}>
//           <AppleTouchFeedback
//             style={{
//               width: '100%',
//               height: '100%',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}
//             hapticStyle="impactMedium"
//             onPress={() => startVoiceCommand(handleVoiceCommand)}>
//             <MaterialIcons
//               name="mic"
//               size={52}
//               color={isRecording ? theme.colors.primary : '#fff'}
//             />
//           </AppleTouchFeedback>
//         </View>
//       )}
//     </Animated.View>
//   );
// }

////////////////////

// // src/components/FloatingMicButton.tsx
// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   Platform,
//   StyleSheet,
//   View,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useAppTheme} from '../context/ThemeContext';
// import {routeVoiceCommand} from '../utils/VoiceUtils/voiceCommandRouter';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {moderateScale} from '../utils/scale';
// import {VoiceTarget} from '../utils/VoiceUtils/voiceTarget';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// const BUTTON_SIZE = 78;

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function FloatingMicButton({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {isRecording, startVoiceCommand} = useVoiceControl();

//   const styles = StyleSheet.create({
//     draggableContainer: {
//       position: 'absolute',
//       left: 0,
//       top: 0,
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     glassOrb: {
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE,
//       borderRadius: BUTTON_SIZE / 2,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 5},
//       overflow: 'hidden',
//     },
//   });

//   // 🟣 starting position
//   const pan = useRef(
//     new Animated.ValueXY({
//       x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
//       y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
//     }),
//   ).current;

//   // 🖐️ drag logic
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: () => {
//         pan.setOffset({
//           x: (pan.x as any)._value,
//           y: (pan.y as any)._value,
//         });
//         pan.setValue({x: 0, y: 0});
//       },
//       onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
//         useNativeDriver: false,
//       }),
//       onPanResponderRelease: () => {
//         pan.flattenOffset();
//         ReactNativeHapticFeedback.trigger('impactLight', {
//           enableVibrateFallback: true,
//         });

//         const finalX = Math.min(
//           Math.max(0, (pan.x as any)._value),
//           SCREEN_WIDTH - BUTTON_SIZE,
//         );
//         const finalY = Math.min(
//           Math.max(0, (pan.y as any)._value),
//           SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 60 : 0),
//         );

//         Animated.spring(pan, {
//           toValue: {x: finalX, y: finalY},
//           useNativeDriver: false,
//           bounciness: 10,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleVoiceCommand = async (cmd: string) => {
//     const lower = cmd.toLowerCase();
//     console.log('🎙️ Floating mic voice command received:', lower);

//     if (VoiceTarget.currentSetter) {
//       VoiceTarget.applyText(lower);
//       ReactNativeHapticFeedback.trigger('impactLight');
//       return;
//     }

//     ReactNativeHapticFeedback.trigger('impactLight');
//     await routeVoiceCommand(lower, navigate);
//   };

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       style={[
//         styles.draggableContainer,
//         {transform: [{translateX: pan.x}, {translateY: pan.y}]},
//       ]}>
//       {/* 🧊 True Liquid Glass orb */}

//       <LiquidGlassView
//         style={[
//           styles.glassOrb,
//           !isLiquidGlassSupported && {
//             backgroundColor: 'rgba(4, 4, 4, 0.47)',
//           },
//           {
//             borderWidth: 3,
//             borderColor: theme.colors.button1,
//           },
//         ]}
//         // interactive
//         effect="clear"
//         tintColor="rgba(0, 0, 0, 0.46)"
//         colorScheme="system">
//         <AppleTouchFeedback
//           style={{
//             width: '100%',
//             height: '100%',
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}
//           hapticStyle="impactMedium"
//           onPress={() => startVoiceCommand(handleVoiceCommand)}>
//           <MaterialIcons
//             name="mic"
//             size={52}
//             color={isRecording ? theme.colors.primary : '#fff'}
//             style={{
//               shadowColor: '#000',
//               shadowOpacity: 0.3,
//               shadowRadius: 2,
//               shadowOffset: {width: 0, height: 4},
//             }}
//           />
//         </AppleTouchFeedback>
//       </LiquidGlassView>

//       {/* <LiquidGlassView
//         style={[
//           styles.glassOrb,
//           {padding: 4},
//           !isLiquidGlassSupported && {
//             backgroundColor: 'rgba(255,255,255,0.35)',
//           },
//           {borderWidth: 3, borderColor: theme.colors.button1},
//         ]}
//         interactive
//         effect="clear"
//         tintColor="rgba(255,255,255,0.25)"
//         colorScheme="system">
//         <AppleTouchFeedback
//           style={{
//             width: '100%',
//             height: '100%',
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}
//           hapticStyle="impactMedium"
//           onPress={() => startVoiceCommand(handleVoiceCommand)}>
//           <MaterialIcons
//             name="mic"
//             size={52}
//             color={isRecording ? theme.colors.primary : '#fff'}
//             style={{
//               shadowColor: '#000',
//               shadowOpacity: 0.4,
//               shadowRadius: 6,
//               shadowOffset: {width: 0, height: 3},
//             }}
//           />
//         </AppleTouchFeedback>
//       </LiquidGlassView> */}

//       {/* Optional overlay text for debugging */}
//       {__DEV__ && (
//         <View style={{position: 'absolute', bottom: -24, alignSelf: 'center'}}>
//           <Animated.Text
//             style={{
//               color: '#aaa',
//               fontSize: 11,
//               fontWeight: '600',
//               opacity: 0.8,
//             }}>
//             {/* {isLiquidGlassSupported ? '🧊 Real Glass' : 'Fallback'} */}
//           </Animated.Text>
//         </View>
//       )}
//     </Animated.View>
//   );
// }

///////////////////

// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   Platform,
//   StyleSheet,
//   View,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useAppTheme} from '../context/ThemeContext';
// import {routeVoiceCommand} from '../utils/VoiceUtils/voiceCommandRouter';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {moderateScale} from '../utils/scale';
// import LiquidGlassCard from './LiquidGlassCard/LiquidGlassCard';
// import type {Screen} from '../navigation/types';
// import {VoiceTarget} from '../utils/VoiceUtils/voiceTarget';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// const BUTTON_SIZE = 78;

// type Props = {
//   navigate: (screen: Screen) => void;
// };

// export default function FloatingMicButton({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {isRecording, startVoiceCommand} = useVoiceControl();

//   const styles = StyleSheet.create({
//     draggableContainer: {
//       position: 'absolute',
//       left: 0,
//       top: 0,
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     glassContainer: {
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE,
//       borderRadius: BUTTON_SIZE / 2,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 5},
//     },
//   });

//   // 🟣 Starting position
//   const pan = useRef(
//     new Animated.ValueXY({
//       x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
//       y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
//     }),
//   ).current;

//   // 🖐️ Drag logic
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: () => {
//         pan.setOffset({
//           x: (pan.x as any)._value,
//           y: (pan.y as any)._value,
//         });
//         pan.setValue({x: 0, y: 0});
//       },
//       onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
//         useNativeDriver: false,
//       }),
//       onPanResponderRelease: () => {
//         pan.flattenOffset();
//         ReactNativeHapticFeedback.trigger('impactLight', {
//           enableVibrateFallback: true,
//         });

//         const finalX = Math.min(
//           Math.max(0, (pan.x as any)._value),
//           SCREEN_WIDTH - BUTTON_SIZE,
//         );
//         const finalY = Math.min(
//           Math.max(0, (pan.y as any)._value),
//           SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 60 : 0),
//         );

//         Animated.spring(pan, {
//           toValue: {x: finalX, y: finalY},
//           useNativeDriver: false,
//           bounciness: 10,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleVoiceCommand = async (cmd: string) => {
//     const lower = cmd.toLowerCase();
//     console.log('🎙️ Floating mic voice command received:', lower);

//     // 🧠 If any input field has registered as the current voice target, insert text there
//     if (VoiceTarget.currentSetter) {
//       VoiceTarget.applyText(lower);
//       ReactNativeHapticFeedback.trigger('impactLight');
//       return;
//     }

//     // 🧭 Otherwise, route normally
//     ReactNativeHapticFeedback.trigger('impactLight');
//     await routeVoiceCommand(lower, navigate);
//   };

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       style={[
//         styles.draggableContainer,
//         {transform: [{translateX: pan.x}, {translateY: pan.y}]},
//       ]}>
//       {/* 🧊 Glass Orb Background */}
//       <LiquidGlassCard
//         // borderRadius={BUTTON_SIZE / 2}
//         blurAmount={20}
//         blurOpacity={0.85}
//         style={[
//           styles.glassContainer,
//           {
//             borderColor: theme.colors.button1,
//             borderWidth: 3,
//             overflow: 'hidden',
//             backgroundColor: 'rgba(255, 255, 255, 0.46)',
//           },
//         ]}
//       />

//       {/* 🎤 Mic icon rendered *above* blur card */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           alignItems: 'center',
//           justifyContent: 'center',
//           zIndex: 1000,
//         }}>
//         <AppleTouchFeedback
//           style={{
//             width: '100%',
//             height: '100%',
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}
//           hapticStyle="impactMedium"
//           onPress={() => startVoiceCommand(handleVoiceCommand)}>
//           <MaterialIcons
//             name="mic"
//             size={52}
//             // color={isRecording ? theme.colors.primary : '#fff'}
//             color={isRecording ? theme.colors.primary : '#fff'}
//             style={{
//               shadowColor: '#000',
//               shadowOpacity: 0.4,
//               shadowRadius: 6,
//               shadowOffset: {width: 0, height: 3},
//             }}
//           />
//         </AppleTouchFeedback>
//       </View>
//     </Animated.View>
//   );
// }

/////////////////////

// import React, {useRef} from 'react';
// import {
//   Animated,
//   PanResponder,
//   Dimensions,
//   Platform,
//   StyleSheet,
//   View,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useAppTheme} from '../context/ThemeContext';
// import {routeVoiceCommand} from '../utils/voiceCommandRouter';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {moderateScale} from '../utils/scale';
// import LiquidGlassCard from './LiquidGlassCard/LiquidGlassCard';
// import type {Screen} from '../navigation/types';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// const BUTTON_SIZE = 78;

// type Props = {
//   navigate: (screen: Screen) => void;
// };

// export default function FloatingMicButton({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {isRecording, startVoiceCommand} = useVoiceControl();

//   const styles = StyleSheet.create({
//     draggableContainer: {
//       position: 'absolute',
//       left: 0,
//       top: 0,
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     glassContainer: {
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE,
//       borderRadius: BUTTON_SIZE / 2,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 5},
//     },
//   });

//   // 🟣 Starting position
//   const pan = useRef(
//     new Animated.ValueXY({
//       x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
//       y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
//     }),
//   ).current;

//   // 🖐️ Drag logic
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: () => {
//         pan.setOffset({
//           x: (pan.x as any)._value,
//           y: (pan.y as any)._value,
//         });
//         pan.setValue({x: 0, y: 0});
//       },
//       onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
//         useNativeDriver: false,
//       }),
//       onPanResponderRelease: () => {
//         pan.flattenOffset();
//         ReactNativeHapticFeedback.trigger('impactLight', {
//           enableVibrateFallback: true,
//         });

//         const finalX = Math.min(
//           Math.max(0, (pan.x as any)._value),
//           SCREEN_WIDTH - BUTTON_SIZE,
//         );
//         const finalY = Math.min(
//           Math.max(0, (pan.y as any)._value),
//           SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 60 : 0),
//         );

//         Animated.spring(pan, {
//           toValue: {x: finalX, y: finalY},
//           useNativeDriver: false,
//           bounciness: 10,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleVoiceCommand = async (cmd: string) => {
//     const lower = cmd.toLowerCase();
//     console.log('🎙️ Floating mic voice command received:', lower);
//     ReactNativeHapticFeedback.trigger('impactLight');
//     await routeVoiceCommand(lower, navigate);
//   };

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       style={[
//         styles.draggableContainer,
//         {transform: [{translateX: pan.x}, {translateY: pan.y}]},
//       ]}>
//       {/* 🧊 Glass Orb Background */}
//       <LiquidGlassCard
//         // borderRadius={BUTTON_SIZE / 2}
//         blurAmount={20}
//         blurOpacity={0.85}
//         style={[
//           styles.glassContainer,
//           {
//             borderColor: theme.colors.button1,
//             borderWidth: 3,
//             overflow: 'hidden',
//             backgroundColor: 'rgba(255, 255, 255, 0.46)',
//           },
//         ]}
//       />

//       {/* 🎤 Mic icon rendered *above* blur card */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           alignItems: 'center',
//           justifyContent: 'center',
//           zIndex: 1000,
//         }}>
//         <AppleTouchFeedback
//           style={{
//             width: '100%',
//             height: '100%',
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}
//           hapticStyle="impactMedium"
//           onPress={() => startVoiceCommand(handleVoiceCommand)}>
//           <MaterialIcons
//             name="mic"
//             size={52}
//             // color={isRecording ? theme.colors.primary : '#fff'}
//             color={isRecording ? theme.colors.primary : '#fff'}
//             style={{
//               shadowColor: '#000',
//               shadowOpacity: 0.4,
//               shadowRadius: 6,
//               shadowOffset: {width: 0, height: 3},
//             }}
//           />
//         </AppleTouchFeedback>
//       </View>
//     </Animated.View>
//   );
// }

//////////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   Dimensions,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useAppTheme} from '../context/ThemeContext';
// import {routeVoiceCommand} from '../utils/voiceCommandRouter';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import type {Screen} from '../navigation/types';
// import {fontScale, moderateScale} from '../utils/scale';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
// const BUTTON_SIZE = 75;

// type Props = {
//   navigate: (screen: Screen) => void;
// };

// export default function FloatingMicButton({navigate}: Props) {
//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {isRecording, startVoiceCommand} = useVoiceControl();

//   const styles = StyleSheet.create({
//     draggableContainer: {
//       position: 'absolute',
//       left: 0,
//       top: 0,
//       zIndex: 9999,
//       elevation: 9999,
//     },
//     micCircle: {
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE,
//       borderRadius: BUTTON_SIZE / 2,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderWidth: 3,
//       borderColor: theme.colors.button1,
//       //   backgroundColor: theme.colors.button1,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 10,
//       shadowOffset: {width: 0, height: 5},
//     },
//   });

//   // 🟣 Position starts near bottom-right
//   const pan = useRef(
//     new Animated.ValueXY({
//       x: SCREEN_WIDTH - BUTTON_SIZE - moderateScale(24),
//       y: SCREEN_HEIGHT - BUTTON_SIZE - moderateScale(120),
//     }),
//   ).current;

//   // 🖐️ PanResponder for drag movement
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,

//       onPanResponderGrant: () => {
//         pan.setOffset({
//           x: (pan.x as any)._value,
//           y: (pan.y as any)._value,
//         });
//         pan.setValue({x: 0, y: 0});
//       },

//       onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
//         useNativeDriver: false,
//       }),

//       onPanResponderRelease: (_, gestureState) => {
//         pan.flattenOffset();

//         ReactNativeHapticFeedback.trigger('impactLight', {
//           enableVibrateFallback: true,
//         });

//         // ✅ Constrain within screen bounds
//         const finalX = Math.min(
//           Math.max(0, (pan.x as any)._value),
//           SCREEN_WIDTH - BUTTON_SIZE,
//         );
//         const finalY = Math.min(
//           Math.max(0, (pan.y as any)._value),
//           SCREEN_HEIGHT - BUTTON_SIZE - (Platform.OS === 'ios' ? 50 : 0),
//         );

//         Animated.spring(pan, {
//           toValue: {x: finalX, y: finalY},
//           useNativeDriver: false,
//           bounciness: 8,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleVoiceCommand = async (cmd: string) => {
//     const lower = cmd.toLowerCase();
//     console.log('🎙️ Floating mic voice command received:', lower);
//     ReactNativeHapticFeedback.trigger('impactLight');
//     await routeVoiceCommand(lower, navigate);
//   };

//   return (
//     <Animated.View
//       {...panResponder.panHandlers}
//       style={[
//         styles.draggableContainer,
//         {
//           transform: [{translateX: pan.x}, {translateY: pan.y}],
//         },
//       ]}>
//       <AppleTouchFeedback
//         style={[
//           styles.micCircle,
//           {
//             // backgroundColor: isRecording
//             //   ? theme.colors.primary
//             //   : theme.colors.surface3,
//           },
//         ]}
//         hapticStyle="impactMedium"
//         onPress={() => startVoiceCommand(handleVoiceCommand)}>
//         <MaterialIcons
//           name="mic"
//           size={51}
//           color={theme.colors.button1}
//           //   color={
//           //     isRecording ? theme.colors.background : theme.colors.buttonText1
//           //   }
//         />
//       </AppleTouchFeedback>
//     </Animated.View>
//   );
// }

///////////////////

// // src/components/FloatingMicButton.tsx
// // -----------------------------------------------------------
// // 🎤 FloatingMicButton — identical logic to GlobalHeader mic
// // -----------------------------------------------------------

// import React from 'react';
// import {View, StyleSheet} from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from './AppleTouchFeedback/AppleTouchFeedback';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useAppTheme} from '../context/ThemeContext';
// import {routeVoiceCommand} from '../utils/voiceCommandRouter';
// import {tokens} from '../styles/tokens/tokens';
// import {moderateScale} from '../utils/scale';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import type {Screen} from '../navigation/types';

// type Props = {
//   navigate: (screen: Screen) => void;
// };

// export default function FloatingMicButton({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {isRecording, startVoiceCommand} = useVoiceControl();

//   const handleVoiceCommand = async (cmd: string) => {
//     const lower = cmd.toLowerCase();
//     console.log('🎙️ Floating mic voice command received:', lower);

//     // ✅ identical haptic + routing behavior as GlobalHeader
//     ReactNativeHapticFeedback.trigger('impactLight');
//     await routeVoiceCommand(lower, navigate);
//   };

//   return (
//     <View style={styles.container}>
//       <AppleTouchFeedback
//         style={[
//           styles.micCircle,
//           {
//             backgroundColor: isRecording
//               ? theme.colors.primary
//               : theme.colors.surface3,
//           },
//         ]}
//         hapticStyle="impactMedium"
//         onPress={() => startVoiceCommand(handleVoiceCommand)}>
//         <MaterialIcons
//           name="mic"
//           size={48}
//           color={
//             isRecording ? theme.colors.background : theme.colors.buttonText1
//           }
//         />
//       </AppleTouchFeedback>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     position: 'absolute',
//     bottom: moderateScale(60),
//     right: moderateScale(24),
//     zIndex: 999, // ensure it floats above everything
//   },
//   micCircle: {
//     width: 72,
//     height: 72,
//     borderRadius: 36,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//     borderColor: 'white',
//     backgroundColor: 'purple', // to visually match header mic
//     shadowColor: '#000',
//     shadowOpacity: 0.25,
//     shadowRadius: 10,
//     shadowOffset: {width: 0, height: 5},
//   },
// });
