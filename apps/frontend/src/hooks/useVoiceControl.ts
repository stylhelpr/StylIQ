// hooks/useVoiceControl.ts
import {useEffect, useRef, useState} from 'react';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import {PermissionsAndroid, Platform} from 'react-native';

export const useVoiceControl = () => {
  const [speech, setSpeech] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const isRecordingRef = useRef(isRecording);
  const wasListeningRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    const init = async () => {
      await Tts.getInitStatus();
      await Tts.setDefaultLanguage('en-US');

      const all = await Tts.voices();
      const en = all.filter(
        v =>
          v.language?.startsWith('en') &&
          !v.networkConnectionRequired &&
          !v.notInstalled,
      );
      const voice = en.find(v => v.name.toLowerCase() === 'samantha') || en[0];
      if (voice) await Tts.setDefaultVoice(voice.id);
    };

    init();

    Voice.onSpeechResults = e => {
      const text = e.value?.[0] || '';
      setSpeech(text);
      Tts.speak(`You said: ${text}`);
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
    if (!(await requestMic())) return;
    try {
      setSpeech('');
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
