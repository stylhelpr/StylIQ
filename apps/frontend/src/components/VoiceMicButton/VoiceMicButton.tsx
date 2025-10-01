import React, {useEffect, useRef} from 'react';
import {
  TouchableOpacity,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useVoiceControl} from '../../hooks/useVoiceCommands';
import {useAppTheme} from '../../context/ThemeContext';
import {handleVoiceNavigation} from '../../utils/voiceNavigationCommands';
import Voice from '@react-native-voice/voice';
import * as Animatable from 'react-native-animatable';

type Props = {
  navigate: (screen: string) => void;
};

const VoiceMicButton: React.FC<Props> = ({navigate}) => {
  const {isRecording, startListening, stopListening, speech} =
    useVoiceControl();
  const {theme} = useAppTheme();

  const position = useRef(new Animated.ValueXY({x: 24, y: 600})).current;

  const styles = StyleSheet.create({
    micContainer: {
      position: 'absolute',
      zIndex: 999,
      alignItems: 'center',
    },
    micButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 10,
      opacity: 0.9,
    },
    label: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground2,
      opacity: 0.7,
      textAlign: 'center',
    },
  });

  // 🫱 Make button draggable
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, {dx: position.x, dy: position.y}],
        {useNativeDriver: false},
      ),
      onPanResponderRelease: () => position.flattenOffset(),
      onPanResponderGrant: () => {
        position.setOffset({x: position.x._value, y: position.y._value});
        position.setValue({x: 0, y: 0});
      },
    }),
  ).current;

  // 🎤 Voice → Navigation and teardown
  useEffect(() => {
    if (speech) {
      console.log('[🎤 Voice Command Captured]:', speech);
      handleVoiceNavigation(speech, navigate);

      const fullyStopVoice = async () => {
        try {
          console.log('[🎤] Stopping voice session...');
          await Voice.stop();
          await Voice.cancel();
          await Voice.destroy();
          Voice.removeAllListeners();
          console.log('[🎤] Voice session fully destroyed ✅');
        } catch (err) {
          console.warn('[🎤] Voice stop error:', err);
        } finally {
          stopListening();
        }
      };

      // Ensure teardown after navigation
      setTimeout(fullyStopVoice, 500);
    }
  }, [speech, navigate, stopListening]);

  // 🔄 Handle mic press
  const handlePress = () => {
    isRecording ? stopListening() : startListening();
  };

  return (
    <Animated.View
      style={[styles.micContainer, position.getLayout()]}
      {...panResponder.panHandlers}>
      <Animatable.View
        animation={isRecording ? 'pulse' : undefined}
        iterationCount="infinite"
        easing="ease-in-out"
        style={[
          styles.micButton,
          {
            backgroundColor: isRecording
              ? theme.colors.error
              : theme.colors.button1,
            shadowColor: isRecording ? theme.colors.error : '#000',
          },
        ]}>
        <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
          <Icon
            name={isRecording ? 'mic-off' : 'mic'}
            size={34}
            color={theme.colors.foreground}
          />
        </TouchableOpacity>
      </Animatable.View>

      {/* 👇 Clarifies that this mic is single-tap voice assistant */}
      {!isRecording && (
        <Text style={[styles.label, {color: theme.colors.muted}]}>
          Tap to Ask
        </Text>
      )}
    </Animated.View>
  );
};

export default VoiceMicButton;

//////////////////

// // src/components/VoiceMicButton/VoiceMicButton.tsx
// import React, {useEffect, useRef} from 'react';
// import {
//   TouchableOpacity,
//   Animated,
//   PanResponder,
//   StyleSheet,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useVoiceControl} from '../../hooks/useVoiceCommands';
// import {useAppTheme} from '../../context/ThemeContext';
// import {handleVoiceNavigation} from '../../utils/voiceNavigationCommands';
// import Voice from '@react-native-voice/voice';
// import * as Animatable from 'react-native-animatable';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const VoiceMicButton: React.FC<Props> = ({navigate}) => {
//   const {isRecording, startListening, stopListening, speech} =
//     useVoiceControl();
//   const {theme} = useAppTheme();

//   const position = useRef(new Animated.ValueXY({x: 24, y: 600})).current;

//   const styles = StyleSheet.create({
//     micContainer: {
//       position: 'absolute',
//       zIndex: 999,
//       alignItems: 'center',
//     },
//     micButton: {
//       width: 72,
//       height: 72,
//       borderRadius: 36,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowOpacity: 0.5,
//       shadowRadius: 8,
//       elevation: 10,
//       opacity: 0.92,
//     },
//   });

//   // 🫱 Make button draggable
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderMove: Animated.event(
//         [null, {dx: position.x, dy: position.y}],
//         {useNativeDriver: false},
//       ),
//       onPanResponderRelease: () => position.flattenOffset(),
//       onPanResponderGrant: () => {
//         position.setOffset({x: position.x._value, y: position.y._value});
//         position.setValue({x: 0, y: 0});
//       },
//     }),
//   ).current;

//   // 🎤 Voice → Navigation and teardown
//   useEffect(() => {
//     if (speech) {
//       console.log('[🎤 Voice Command Captured]:', speech);
//       handleVoiceNavigation(speech, navigate);

//       const fullyStopVoice = async () => {
//         try {
//           console.log('[🎤] Stopping voice session...');
//           await Voice.stop();
//           await Voice.cancel();
//           await Voice.destroy();
//           Voice.removeAllListeners();
//           console.log('[🎤] Voice session fully destroyed ✅');
//         } catch (err) {
//           console.warn('[🎤] Voice stop error:', err);
//         } finally {
//           stopListening();
//         }
//       };

//       //   // ⚡ Do it immediately for responsiveness
//       //   fullyStopVoice();

//       // Ensure teardown after navigation
//       setTimeout(fullyStopVoice, 500);
//     }
//   }, [speech, navigate, stopListening]);

//   // 🔄 Handle mic press
//   const handlePress = () => {
//     isRecording ? stopListening() : startListening();
//   };

//   return (
//     <Animated.View
//       style={[styles.micContainer, position.getLayout()]}
//       {...panResponder.panHandlers}>
//       <Animatable.View
//         animation={isRecording ? 'pulse' : undefined}
//         iterationCount="infinite"
//         easing="ease-in-out"
//         style={[
//           styles.micButton,
//           {
//             backgroundColor: isRecording
//               ? theme.colors.error
//               : theme.colors.button1,
//             shadowColor: isRecording ? theme.colors.error : '#000',
//           },
//         ]}>
//         <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
//           <Icon
//             name={isRecording ? 'mic-off' : 'mic'}
//             size={34}
//             color={theme.colors.foreground}
//           />
//         </TouchableOpacity>
//       </Animatable.View>
//     </Animated.View>
//   );
// };

// export default VoiceMicButton;

/////////////////////////

// // src/components/VoiceMicButton/VoiceMicButton.tsx
// import React, {useEffect, useRef} from 'react';
// import {
//   TouchableOpacity,
//   Animated,
//   PanResponder,
//   StyleSheet,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useVoiceControl} from '../../hooks/useVoiceCommands';
// import {useAppTheme} from '../../context/ThemeContext';
// import {handleVoiceNavigation} from '../../utils/voiceNavigationCommands';
// import Voice from '@react-native-voice/voice';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const VoiceMicButton: React.FC<Props> = ({navigate}) => {
//   const {isRecording, startListening, stopListening, speech} =
//     useVoiceControl();
//   const {theme} = useAppTheme();

//   const position = useRef(new Animated.ValueXY({x: 24, y: 600})).current;

//   const styles = StyleSheet.create({
//     micContainer: {
//       position: 'absolute',
//       zIndex: 999,
//     },
//     micButton: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.55,
//       shadowRadius: 6,
//       elevation: 6,
//       opacity: 0.8,
//     },
//   });

//   // 🫱 Make the button draggable
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderMove: Animated.event(
//         [null, {dx: position.x, dy: position.y}],
//         {useNativeDriver: false},
//       ),
//       onPanResponderRelease: () => {
//         position.flattenOffset();
//       },
//       onPanResponderGrant: () => {
//         position.setOffset({
//           x: position.x._value,
//           y: position.y._value,
//         });
//         position.setValue({x: 0, y: 0});
//       },
//     }),
//   ).current;

//   // 🎤 Voice → Navigation
//   // 🎤 Voice → Navigation
//   useEffect(() => {
//     if (speech) {
//       console.log('[🎤 Voice Command Captured]:', speech);

//       // ✅ Navigate based on recognized command
//       handleVoiceNavigation(speech, navigate);

//       // 🛑 Force shutdown of the voice session
//       const fullyStopVoice = async () => {
//         try {
//           console.log('[🎤] Stopping voice session...');
//           await Voice.stop();
//           await Voice.cancel();
//           await Voice.destroy();
//           Voice.removeAllListeners();
//           console.log('[🎤] Voice session fully destroyed ✅');
//         } catch (err) {
//           console.warn('[🎤] Voice stop error:', err);
//         } finally {
//           // ✅ Force UI state reset after teardown
//           stopListening();
//         }
//       };

//       // Small delay ensures all results are processed before shutdown
//       setTimeout(fullyStopVoice, 500);
//     }
//   }, [speech, navigate, stopListening]);

//   return (
//     <Animated.View
//       style={[styles.micContainer, position.getLayout()]}
//       {...panResponder.panHandlers}>
//       <TouchableOpacity
//         onPress={isRecording ? stopListening : startListening}
//         activeOpacity={0.8}
//         style={[
//           styles.micButton,
//           {
//             backgroundColor: isRecording
//               ? theme.colors.error
//               : theme.colors.button1,
//           },
//         ]}>
//         <Icon
//           name={isRecording ? 'mic-off' : 'mic'}
//           size={30}
//           color={theme.colors.foreground}
//         />
//       </TouchableOpacity>
//     </Animated.View>
//   );
// };

// export default VoiceMicButton;

///////////////

// // src/components/VoiceMicButton/VoiceMicButton.tsx
// import React, {useEffect, useRef, useState} from 'react';
// import {
//   TouchableOpacity,
//   Animated,
//   PanResponder,
//   StyleSheet,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useVoiceControl} from '../../hooks/useVoiceCommands';
// import {useAppTheme} from '../../context/ThemeContext';
// import {handleVoiceNavigation} from '../../utils/voiceNavigationCommands';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const VoiceMicButton: React.FC<Props> = ({navigate}) => {
//   const {isRecording, startListening, stopListening, speech} =
//     useVoiceControl();
//   const {theme} = useAppTheme();

//   const position = useRef(new Animated.ValueXY({x: 24, y: 600})).current; // 👈 starting position

//   const styles = StyleSheet.create({
//     micContainer: {
//       position: 'absolute',
//       zIndex: 999,
//     },
//     micButton: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.55,
//       shadowRadius: 6,
//       elevation: 6,
//       opacity: 0.8,
//     },
//   });

//   // 🫱 Make the button draggable
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderMove: Animated.event(
//         [null, {dx: position.x, dy: position.y}],
//         {useNativeDriver: false},
//       ),
//       onPanResponderRelease: () => {
//         position.flattenOffset();
//       },
//       onPanResponderGrant: () => {
//         position.setOffset({
//           x: position.x._value,
//           y: position.y._value,
//         });
//         position.setValue({x: 0, y: 0});
//       },
//     }),
//   ).current;

//   // 🎤 Voice → Navigation
//   useEffect(() => {
//     if (speech) {
//       console.log('[🎤 Voice Command Captured]:', speech);
//       handleVoiceNavigation(speech, navigate);
//     }
//   }, [speech, navigate]);

//   return (
//     <Animated.View
//       style={[styles.micContainer, position.getLayout()]}
//       {...panResponder.panHandlers}>
//       <TouchableOpacity
//         onPress={isRecording ? stopListening : startListening}
//         activeOpacity={0.8}
//         style={[
//           styles.micButton,
//           {
//             backgroundColor: isRecording
//               ? theme.colors.error
//               : theme.colors.button1,
//           },
//         ]}>
//         <Icon
//           name={isRecording ? 'mic-off' : 'mic'}
//           size={30}
//           color={theme.colors.foreground}
//         />
//       </TouchableOpacity>
//     </Animated.View>
//   );
// };

// export default VoiceMicButton;

////////////////////

// // src/components/VoiceMicButton/VoiceMicButton.tsx
// import React, {useEffect, useRef, useState} from 'react';
// import {
//   TouchableOpacity,
//   Animated,
//   PanResponder,
//   StyleSheet,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useVoiceControl} from '../../hooks/useVoiceCommands';
// import {useAppTheme} from '../../context/ThemeContext';
// import {handleVoiceNavigation} from '../../utils/voiceNavigationCommands';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const VoiceMicButton: React.FC<Props> = ({navigate}) => {
//   const {isRecording, startListening, stopListening, speech} =
//     useVoiceControl();
//   const {theme} = useAppTheme();

//   const position = useRef(new Animated.ValueXY({x: 24, y: 600})).current; // 👈 starting position

//   // 🫱 Make the button draggable
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderMove: Animated.event(
//         [null, {dx: position.x, dy: position.y}],
//         {useNativeDriver: false},
//       ),
//       onPanResponderRelease: () => {
//         position.flattenOffset();
//       },
//       onPanResponderGrant: () => {
//         position.setOffset({
//           x: position.x._value,
//           y: position.y._value,
//         });
//         position.setValue({x: 0, y: 0});
//       },
//     }),
//   ).current;

//   // 🎤 Voice → Navigation
//   useEffect(() => {
//     if (speech) {
//       console.log('[🎤 Voice Command Captured]:', speech);
//       handleVoiceNavigation(speech, navigate);
//     }
//   }, [speech, navigate]);

//   return (
//     <Animated.View
//       style={[styles.micContainer, position.getLayout()]}
//       {...panResponder.panHandlers}>
//       <TouchableOpacity
//         onPress={isRecording ? stopListening : startListening}
//         activeOpacity={0.8}
//         style={[
//           styles.micButton,
//           {backgroundColor: isRecording ? '#ff4d4d' : theme.colors.button1},
//         ]}>
//         <Icon name={isRecording ? 'mic-off' : 'mic'} size={30} color="#fff" />
//       </TouchableOpacity>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   micContainer: {
//     position: 'absolute',
//     zIndex: 999,
//   },
//   micButton: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.25,
//     shadowRadius: 6,
//     elevation: 6,
//   },
// });

// export default VoiceMicButton;

//////////////////

// // src/components/VoiceMicButton/VoiceMicButton.tsx
// import React, {useEffect} from 'react';
// import {TouchableOpacity} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useVoiceControl} from '../../hooks/useVoiceCommands';
// import {useAppTheme} from '../../context/ThemeContext';
// import {handleVoiceNavigation} from '../../utils/voiceNavigationCommands';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const VoiceMicButton: React.FC<Props> = ({navigate}) => {
//   const {isRecording, startListening, stopListening, speech} =
//     useVoiceControl();
//   const {theme} = useAppTheme();

//   // 👂 When speech result changes, run navigation logic
//   useEffect(() => {
//     if (speech) {
//       console.log('[🎤 Voice Command Captured]:', speech);
//       handleVoiceNavigation(speech, navigate);
//     }
//   }, [speech, navigate]);

//   return (
//     <TouchableOpacity
//       onPress={isRecording ? stopListening : startListening}
//       style={{
//         position: 'absolute',
//         bottom: 40,
//         right: 24,
//         backgroundColor: isRecording ? '#ff4d4d' : theme.colors.button1,
//         width: 64,
//         height: 64,
//         borderRadius: 32,
//         alignItems: 'center',
//         justifyContent: 'center',
//         shadowColor: '#000',
//         shadowOpacity: 0.25,
//         shadowRadius: 6,
//         elevation: 6,
//         zIndex: 999,
//       }}>
//       <Icon name={isRecording ? 'mic-off' : 'mic'} size={30} color="#fff" />
//     </TouchableOpacity>
//   );
// };

// export default VoiceMicButton;
