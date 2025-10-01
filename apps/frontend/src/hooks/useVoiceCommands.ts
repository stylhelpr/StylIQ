import {useEffect, useRef, useState} from 'react';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';
import {
  PermissionsAndroid,
  Platform,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import Tts from 'react-native-tts';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[🎙️ VOICE]', ...args);

// 👂 Native iOS audio session bridge
const {RCTVoice} = NativeModules as {
  RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
};

export const useVoiceControl = () => {
  const [speech, setSpeech] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const finalRef = useRef('');
  const commitTimer = useRef<NodeJS.Timeout | null>(null);

  // 🎤 Ask mic permission (Android)
  const requestMic = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'StylHelpr needs microphone access for voice input.',
          buttonPositive: 'OK',
        },
      );
      const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasPermission(allowed);
      return allowed;
    }
    setHasPermission(true);
    return true;
  };

  // 📌 Commit final recognized speech
  const commitIfAny = (from: string) => {
    const text = finalRef.current.trim();
    log('commitIfAny(', from, ') =>', text);
    if (text) setSpeech(text);
    finalRef.current = '';
    if (commitTimer.current) clearTimeout(commitTimer.current);
  };

  // 🎙️ Start listening
  const startListening = async () => {
    log('startListening()');

    if (!(await requestMic())) {
      log('❌ Mic permission denied');
      return;
    }

    try {
      // 🔇 Stop any current TTS before listening
      await Tts.stop();
      await new Promise(res => setTimeout(res, 150));

      // 🧠 iOS: Force valid audio session
      if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
        try {
          await RCTVoice.setupAudioSession();
          log('✅ Audio session armed');
        } catch (err) {
          log('⚠️ setupAudioSession error', err);
        }
      }

      await Voice.cancel();

      finalRef.current = '';
      setSpeech('');
      log('🎤 Voice.start()...');
      await Voice.start('en-US');
      setIsRecording(true);
      log('✅ Voice listening started');
    } catch (err) {
      log('❌ Voice.start ERROR', err);
      setIsRecording(false);
    }
  };

  // 🛑 Stop listening
  const stopListening = async () => {
    log('stopListening()');
    try {
      await Voice.stop();
      commitTimer.current = setTimeout(() => commitIfAny('fallback'), 700);
    } catch (err) {
      log('Voice.stop ERROR', err);
      commitIfAny('stopError');
    } finally {
      setIsRecording(false);
    }
  };

  // 🧠 Initialize listeners and TTS
  useEffect(() => {
    (async () => {
      try {
        await Tts.getInitStatus();
        await Tts.setDefaultLanguage('en-US');
        if (Platform.OS === 'ios') {
          // @ts-ignore
          Tts.setIgnoreSilentSwitch?.('ignore');
        }
      } catch (e) {
        log('⚠️ TTS init error', e);
      }

      // 🧠 Pre-arm iOS audio session on mount
      if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
        try {
          await RCTVoice.setupAudioSession();
          log('🔊 Pre-armed audio session');
        } catch (err) {
          log('⚠️ setupAudioSession (mount) error', err);
        }
      }
    })();

    Voice.onSpeechStart = (e: SpeechStartEvent) => {
      log('onSpeechStart', e);
      setIsRecording(true);
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      log('onSpeechResults', e.value);
      const text = e.value?.[0] || '';
      finalRef.current = text;
      setSpeech(text);
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      log('onSpeechPartialResults', e.value);
      const text = e.value?.[0] || '';
      finalRef.current = text;
      setSpeech(text);
    };

    Voice.onSpeechEnd = () => {
      log('onSpeechEnd');
      setIsRecording(false);
      commitIfAny('onSpeechEnd');
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      log('onSpeechError', e);
      setIsRecording(false);
      commitIfAny('onSpeechError');
    };

    log('✅ Voice listeners attached');

    return () => {
      log('🧹 Unmount: removing listeners');
      Voice.destroy().then(Voice.removeAllListeners);
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  return {
    speech, // ✅ Final recognized text
    isRecording, // ✅ Boolean: currently listening?
    hasPermission, // ✅ Boolean: mic access granted?
    startListening, // ✅ Begin recognition
    stopListening, // ✅ Stop recognition
  };
};

/////////////////////

// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
//   SpeechStartEvent,
// } from '@react-native-voice/voice';
// import {
//   PermissionsAndroid,
//   Platform,
//   NativeModules,
//   NativeEventEmitter,
// } from 'react-native';
// import Tts from 'react-native-tts';

// const DEBUG = true;
// const log = (...args: any[]) => DEBUG && console.log('[🎙️ VOICE]', ...args);

// // 👂 Native iOS audio session bridge
// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const [hasPermission, setHasPermission] = useState(false);

//   const finalRef = useRef('');
//   const commitTimer = useRef<NodeJS.Timeout | null>(null);

//   // 🎤 Ask mic permission (Android)
//   const requestMic = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'StylHelpr needs microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
//       setHasPermission(allowed);
//       return allowed;
//     }
//     setHasPermission(true);
//     return true;
//   };

//   // 📌 Commit final recognized speech
//   const commitIfAny = (from: string) => {
//     const text = finalRef.current.trim();
//     log('commitIfAny(', from, ') =>', text);
//     if (text) setSpeech(text);
//     finalRef.current = '';
//     if (commitTimer.current) clearTimeout(commitTimer.current);
//   };

//   // 🎙️ Start listening
//   const startListening = async () => {
//     log('startListening()');

//     if (!(await requestMic())) {
//       log('❌ Mic permission denied');
//       return;
//     }

//     try {
//       // 🔇 Stop any current TTS before listening
//       await Tts.stop();
//       await new Promise(res => setTimeout(res, 150));

//       // 🧠 iOS: Force valid audio session
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//           log('✅ Audio session armed');
//         } catch (err) {
//           log('⚠️ setupAudioSession error', err);
//         }
//       }

//       await Voice.cancel();

//       finalRef.current = '';
//       setSpeech('');
//       log('🎤 Voice.start()...');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('✅ Voice listening started');
//     } catch (err) {
//       log('❌ Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

//   // 🛑 Stop listening
//   const stopListening = async () => {
//     log('stopListening()');
//     try {
//       await Voice.stop();
//       commitTimer.current = setTimeout(() => commitIfAny('fallback'), 700);
//     } catch (err) {
//       log('Voice.stop ERROR', err);
//       commitIfAny('stopError');
//     } finally {
//       setIsRecording(false);
//     }
//   };

//   // 🧠 Initialize listeners and TTS
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.setDefaultLanguage('en-US');
//         if (Platform.OS === 'ios') {
//           // @ts-ignore
//           Tts.setIgnoreSilentSwitch?.('ignore');
//         }
//       } catch (e) {
//         log('⚠️ TTS init error', e);
//       }

//       // 🧠 Pre-arm iOS audio session on mount
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//           log('🔊 Pre-armed audio session');
//         } catch (err) {
//           log('⚠️ setupAudioSession (mount) error', err);
//         }
//       }
//     })();

//     Voice.onSpeechStart = (e: SpeechStartEvent) => {
//       log('onSpeechStart', e);
//       setIsRecording(true);
//     };

//     Voice.onSpeechResults = (e: SpeechResultsEvent) => {
//       log('onSpeechResults', e.value);
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//     };

//     Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//       log('onSpeechPartialResults', e.value);
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//     };

//     Voice.onSpeechEnd = () => {
//       log('onSpeechEnd');
//       setIsRecording(false);
//       commitIfAny('onSpeechEnd');
//     };

//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);
//       commitIfAny('onSpeechError');
//     };

//     log('✅ Voice listeners attached');

//     return () => {
//       log('🧹 Unmount: removing listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//   }, []);

//   return {
//     speech, // ✅ Final recognized text
//     isRecording, // ✅ Boolean: currently listening?
//     hasPermission, // ✅ Boolean: mic access granted?
//     startListening, // ✅ Begin recognition
//     stopListening, // ✅ Stop recognition
//   };
// };
