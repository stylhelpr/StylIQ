// VoiceControlComponent.tsx
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';

const VoiceControlComponent: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [speech, setSpeech] = useState<string>('');

  useEffect(() => {
    // Initialize TTS
    Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultLanguage('en-US');
      })
      .catch(err => console.warn(err));

    // Voice event handlers
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (e: any) => {
    const text = e.value?.[0] || '';
    setSpeech(text);
    // Echo back via TTS
    Tts.speak(`You said: ${text}`);
  };

  const onSpeechError = (e: any) => {
    console.warn('Speech recognition error: ', e.error);
    setIsRecording(false);
  };

  const requestMicrophone = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs access to your microphone.',
          buttonPositive: '',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startRecording = async () => {
    const ok = await requestMicrophone();
    if (!ok) return;
    try {
      await Voice.start('en-US');
      setIsRecording(true);
      setSpeech('');
    } catch (e) {
      console.error(e);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Control</Text>

      <View style={styles.controls}>
        <Button
          title={isRecording ? 'Listening...' : 'Start Listening'}
          onPress={startRecording}
          disabled={isRecording}
        />
        <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
      </View>

      <Text style={styles.resultLabel}>Recognized:</Text>
      <Text style={styles.resultText}>{speech}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {fontSize: 24, marginBottom: 20},
  controls: {flexDirection: 'row', gap: 16, marginBottom: 20},
  resultLabel: {fontSize: 18, marginBottom: 8},
  resultText: {fontSize: 16, color: '#333'},
});

export default VoiceControlComponent;
