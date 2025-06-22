import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  onPromptResult?: (text: string) => void;
};

const VoiceControlComponent: React.FC<Props> = ({onPromptResult}) => {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [speech, setSpeech] = useState('');
  const [isPressed, setIsPressed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const styles = StyleSheet.create({
    container: {},
    chatContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    stylingCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface2,
      borderRadius: tokens.borderRadius.md,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stylingCardPressed: {
      backgroundColor: '#3366FF',
    },
    cardText: {
      color: '#fff',
      fontWeight: '500',
      fontSize: 16,
    },
  });

  const onPromptResultRef = useRef(onPromptResult);
  useEffect(() => {
    onPromptResultRef.current = onPromptResult;
  }, [onPromptResult]);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Keep track of full final speech text here
  let finalSpeech = '';

  useEffect(() => {
    const initTts = async () => {
      try {
        await Tts.getInitStatus();
        await Tts.setDefaultLanguage('en-US');
      } catch (e) {
        console.warn('TTS init error', e);
      }
    };
    initTts();

    Voice.onSpeechResults = e => {
      const text = e.value?.[0] || '';
      setSpeech(text);
      finalSpeech = text; // update latest recognized text
    };

    Voice.onSpeechEnd = () => {
      setIsRecording(false);
      if (onPromptResultRef.current && finalSpeech.trim() !== '') {
        onPromptResultRef.current(finalSpeech.trim());
        finalSpeech = ''; // clear for next use
      }
    };

    Voice.onSpeechError = e => {
      console.warn('Speech recognition error:', e.error);
      setIsRecording(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const requestMic = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs mic access.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startRecording = async () => {
    if (!(await requestMic())) return;
    try {
      await Voice.start('en-US');
      setIsRecording(true);
      setSpeech('');
    } catch (e) {
      console.error('Voice.start error', e);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
    } catch (e) {
      console.error('Voice.stop error', e);
    }
  };

  return (
    <View style={styles.chatContainer}>
      <TouchableOpacity
        style={[styles.stylingCard, isPressed && styles.stylingCardPressed]}
        onPressIn={() => {
          setIsPressed(true);
          startRecording();
        }}
        onPressOut={() => {
          setIsPressed(false);
          stopRecording();
        }}>
        <Text style={styles.cardText}>Chat</Text>
        <MaterialIcons name="mic" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default VoiceControlComponent;
