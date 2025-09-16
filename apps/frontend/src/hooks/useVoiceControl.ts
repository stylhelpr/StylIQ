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
const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// RN-Voice iOS native bridge
const {RCTVoice} = NativeModules as {
  RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
};

export const useVoiceControl = () => {
  const [speech, setSpeech] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const finalRef = useRef('');
  const commitTimer = useRef<NodeJS.Timeout | null>(null);

  const requestMic = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Mic Permission',
          message: 'We need microphone access for voice search.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const commitIfAny = (from: string) => {
    const text = finalRef.current.trim();
    log('commitIfAny(', from, ') =>', text);
    if (text) setSpeech(text);
    finalRef.current = '';
    if (commitTimer.current) clearTimeout(commitTimer.current);
  };

  const startListening = async () => {
    log('startListening()');

    if (!(await requestMic())) {
      log('Mic permission denied');
      return;
    }

    try {
      await Tts.stop();
      await new Promise(res => setTimeout(res, 200));

      // 💥 iOS: force valid session
      if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
        try {
          log('Calling RCTVoice.setupAudioSession()');
          await RCTVoice.setupAudioSession();
          log('Audio session armed');
        } catch (err) {
          log('setupAudioSession error', err);
        }
      }

      await Voice.cancel();

      finalRef.current = '';
      setSpeech('');
      log('Voice.start…');
      await Voice.start('en-US');
      setIsRecording(true);
      log('Voice.start OK');
    } catch (err) {
      log('Voice.start ERROR', err);
      setIsRecording(false);
    }
  };

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
        log('TTS init error', e);
      }

      // ⚡ Pre-arm audio session on iOS just once at mount
      if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
        try {
          await RCTVoice.setupAudioSession();
          log('Pre-armed audio session');
        } catch (err) {
          log('setupAudioSession at mount error', err);
        }
      }
    })();

    Voice.onSpeechStart = (e: SpeechStartEvent) => log('onSpeechStart', e);
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

    log('Listeners attached');
    return () => {
      log('Unmount: removing listeners');
      Voice.destroy().then(Voice.removeAllListeners);
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  return {speech, isRecording, startListening, stopListening};
};

///////////////////

// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
// } from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform} from 'react-native';
// import Tts from 'react-native-tts';

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   const finalSpeechRef = useRef('');
//   const isPressedRef = useRef(false);
//   const wasRecordingBeforeTTSRef = useRef(false);
//   const commitTimerRef = useRef<NodeJS.Timeout | null>(null);

//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'We need access to your microphone.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const clearTimer = () => {
//     if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
//     commitTimerRef.current = null;
//   };

//   const commitIfAny = () => {
//     if (!finalSpeechRef.current.trim()) return;
//     setSpeech(finalSpeechRef.current.trim());
//     finalSpeechRef.current = '';
//     clearTimer();
//   };

//   const startListening = async () => {
//     if (!(await requestMic())) return;
//     try {
//       await Tts.stop(); // stop any speaking
//       await new Promise(res => setTimeout(res, 250)); // let audio focus release
//       await Voice.cancel(); // clear any stuck session
//       setSpeech('');
//       finalSpeechRef.current = '';
//       await Voice.start('en-US');
//       setIsRecording(true);
//     } catch (err) {
//       console.error('Voice.start error', err);
//     }
//   };

//   const stopListening = async () => {
//     try {
//       await Voice.stop();
//       commitTimerRef.current = setTimeout(commitIfAny, 700);
//     } catch (err) {
//       console.error('Voice.stop error', err);
//     } finally {
//       setIsRecording(false);
//     }
//   };

//   useEffect(() => {
//     const handleResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//       finalSpeechRef.current = text;
//     };
//     const handlePartial = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//       finalSpeechRef.current = text;
//     };
//     const handleEnd = () => {
//       setIsRecording(false);
//       commitIfAny();
//     };
//     const handleError = (e: SpeechErrorEvent) => {
//       console.warn('Speech error', e.error);
//       setIsRecording(false);
//       commitIfAny();
//     };

//     Voice.onSpeechResults = handleResults;
//     Voice.onSpeechPartialResults = handlePartial;
//     Voice.onSpeechEnd = handleEnd;
//     Voice.onSpeechError = handleError;

//     // Pause STT while TTS is speaking
//     const subStart = Tts.addEventListener('tts-start', async () => {
//       wasRecordingBeforeTTSRef.current = isRecording;
//       if (isRecording) {
//         await Voice.cancel();
//         setIsRecording(false);
//       }
//     });
//     const maybeResume = async () => {
//       if (wasRecordingBeforeTTSRef.current && isPressedRef.current) {
//         await Voice.start('en-US');
//         setIsRecording(true);
//       }
//       wasRecordingBeforeTTSRef.current = false;
//     };
//     const subFinish = Tts.addEventListener('tts-finish', maybeResume);
//     const subCancel = Tts.addEventListener('tts-cancel', maybeResume);

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//       // @ts-ignore
//       subStart?.remove?.();
//       // @ts-ignore
//       subFinish?.remove?.();
//       // @ts-ignore
//       subCancel?.remove?.();
//       clearTimer();
//     };
//   }, [isRecording]);

//   return {
//     speech,
//     isRecording,
//     startListening: () => {
//       isPressedRef.current = true;
//       startListening();
//     },
//     stopListening: () => {
//       isPressedRef.current = false;
//       stopListening();
//     },
//   };
// };

////////////////

// // hooks/useVoiceControl.ts
// import {useEffect, useRef, useState} from 'react';
// import Voice from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform} from 'react-native';

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   const isRecordingRef = useRef(isRecording);
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//       setIsRecording(false);
//     };

//     Voice.onSpeechError = e => {
//       console.warn('Speech error:', e.error);
//       setIsRecording(false);
//     };

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const requestMic = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'This app needs access to your microphone to listen.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startListening = async () => {
//     setSpeech('');
//     if (!(await requestMic())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//     } catch (err) {
//       console.error('Voice.start error', err);
//     }
//   };

//   const stopListening = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//     } catch (err) {
//       console.error('Voice.stop error', err);
//     }
//   };

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//   };
// };
