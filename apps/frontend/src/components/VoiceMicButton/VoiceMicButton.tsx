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
      opacity: 0.8,
      borderWidth: 2,
      borderColor: theme.colors.buttonText1,
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
