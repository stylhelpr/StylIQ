// hooks/useVoiceControl.ts
import {useEffect, useRef, useState} from 'react';
import Voice from '@react-native-voice/voice';
import {PermissionsAndroid, Platform} from 'react-native';

export const useVoiceControl = () => {
  const [speech, setSpeech] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    Voice.onSpeechResults = e => {
      const text = e.value?.[0] || '';
      setSpeech(text);
      setIsRecording(false);
    };

    Voice.onSpeechError = e => {
      console.warn('Speech error:', e.error);
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
          message: 'This app needs access to your microphone to listen.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startListening = async () => {
    setSpeech('');
    if (!(await requestMic())) return;
    try {
      await Voice.start('en-US');
      setIsRecording(true);
    } catch (err) {
      console.error('Voice.start error', err);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
    } catch (err) {
      console.error('Voice.stop error', err);
    }
  };

  return {
    speech,
    isRecording,
    startListening,
    stopListening,
  };
};
