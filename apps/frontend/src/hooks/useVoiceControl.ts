import {useEffect, useRef, useState} from 'react';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';
import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
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
      // ✅ Always fully reset state here
      setIsRecording(false);
      finalRef.current = '';
      setSpeech('');
    }
  };

  /**
   * ✅ Call this when user presses "Send" (after using `speech`)
   * This ensures mic stops and everything resets like iOS.
   */
  const handleSend = async (onSend?: (text: string) => void) => {
    log('handleSend()');
    // Stop mic first
    await stopListening();

    // Fire the callback with current speech (if any)
    if (speech.trim()) {
      onSend?.(speech.trim());
    }

    // Clean reset
    setSpeech('');
    finalRef.current = '';
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

    // ✅ Auto-stop once speech ends (just like iOS)
    Voice.onSpeechEnd = () => {
      log('onSpeechEnd');
      stopListening();
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      log('onSpeechError', e);
      stopListening();
    };

    log('Listeners attached');
    return () => {
      log('Unmount: removing listeners');
      Voice.destroy().then(Voice.removeAllListeners);
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  return {
    speech,
    isRecording,
    startListening,
    stopListening,
    handleSend, // ✅ use this instead of manually calling stop + send
  };
};

//////////////////

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
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// // RN-Voice iOS native bridge
// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   const finalRef = useRef('');
//   const commitTimer = useRef<NodeJS.Timeout | null>(null);

//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'We need microphone access for voice search.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const commitIfAny = (from: string) => {
//     const text = finalRef.current.trim();
//     log('commitIfAny(', from, ') =>', text);
//     if (text) setSpeech(text);
//     finalRef.current = '';
//     if (commitTimer.current) clearTimeout(commitTimer.current);
//   };

//   const startListening = async () => {
//     log('startListening()');

//     if (!(await requestMic())) {
//       log('Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await new Promise(res => setTimeout(res, 200));

//       // 💥 iOS: force valid session
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           log('Calling RCTVoice.setupAudioSession()');
//           await RCTVoice.setupAudioSession();
//           log('Audio session armed');
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       await Voice.cancel();

//       finalRef.current = '';
//       setSpeech('');
//       log('Voice.start…');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('Voice.start OK');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

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
//         log('TTS init error', e);
//       }

//       // ⚡ Pre-arm audio session on iOS just once at mount
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//           log('Pre-armed audio session');
//         } catch (err) {
//           log('setupAudioSession at mount error', err);
//         }
//       }
//     })();

//     Voice.onSpeechStart = (e: SpeechStartEvent) => log('onSpeechStart', e);
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

//     log('Listeners attached');
//     return () => {
//       log('Unmount: removing listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//   }, []);

//   return {speech, isRecording, startListening, stopListening};
// };

//////////////////

// // apps/mobile/src/hooks/useVoiceControl.ts
// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
//   SpeechStartEvent,
// } from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
// import Tts from 'react-native-tts';

// const DEBUG = true;
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// /** iOS native session (guarded; methods may not exist in all projects) */
// type MaybeAVAudioSession = {
//   setCategory?: (cat: string) => Promise<void> | void;
//   setMode?: (mode: string) => Promise<void> | void;
//   setActive?: (active: boolean) => Promise<void> | void;
//   setPreferredSampleRate?: (rate: number) => Promise<void> | void;
//   setPreferredInputNumberOfChannels?: (ch: number) => Promise<void> | void;
//   overrideOutputAudioPort?: (port: 'none' | 'speaker') => Promise<void> | void;
// };
// const {AVAudioSession, RCTVoice} = NativeModules as {
//   AVAudioSession?: MaybeAVAudioSession;
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// type IOSSessionCfg = {
//   category: 'PlayAndRecord' | 'Record';
//   mode: 'VoiceChat' | 'Measurement' | 'Default';
//   sampleRate?: number;
//   mono?: boolean;
// };

// /** Escalation ladder for stubborn CoreAudio format errors */
// const IOS_TRIES: IOSSessionCfg[] = [
//   // Most reliable for stuck devices (chat-style echo canceller)
//   {category: 'PlayAndRecord', mode: 'VoiceChat', sampleRate: 16000, mono: true},
//   // Classic STT-friendly configs
//   {
//     category: 'PlayAndRecord',
//     mode: 'Measurement',
//     sampleRate: 44100,
//     mono: true,
//   },
//   {category: 'Record', mode: 'Measurement', sampleRate: 44100, mono: true},
//   {category: 'PlayAndRecord', mode: 'Default', sampleRate: 48000, mono: true},
//   {category: 'Record', mode: 'Default', sampleRate: 48000, mono: true},
// ];

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   const finalRef = useRef('');
//   const commitTimer = useRef<NodeJS.Timeout | null>(null);
//   const attemptRef = useRef(0);

//   /* ------------------------ permissions ------------------------ */
//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'We need microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true; // iOS prompts automatically if Info.plist keys exist
//   };

//   /* ------------------------ commit helpers ------------------------ */
//   const commitIfAny = (from: string) => {
//     const text = finalRef.current.trim();
//     log('commitIfAny(', from, ') =>', text);
//     if (text) setSpeech(text);
//     finalRef.current = '';
//     if (commitTimer.current) clearTimeout(commitTimer.current);
//   };

//   const scheduleFallbackCommit = () => {
//     if (commitTimer.current) clearTimeout(commitTimer.current);
//     commitTimer.current = setTimeout(() => commitIfAny('fallback'), 700);
//   };

//   /* ------------------------ iOS session reset ------------------------ */
//   async function armIOSAudioSession(cfg: IOSSessionCfg) {
//     if (Platform.OS !== 'ios' || !AVAudioSession) return;
//     try {
//       // Full teardown ➜ rebuild ➜ allow route to settle
//       if (AVAudioSession.setActive) {
//         log('AVAudioSession.setActive(false) — reset');
//         await AVAudioSession.setActive(false);
//       }

//       if (AVAudioSession.setCategory) {
//         log(`AVAudioSession.setCategory(${cfg.category})`);
//         await AVAudioSession.setCategory(cfg.category);
//       }
//       if (AVAudioSession.setMode) {
//         log(`AVAudioSession.setMode(${cfg.mode})`);
//         await AVAudioSession.setMode(cfg.mode);
//       }
//       if (
//         typeof cfg.sampleRate === 'number' &&
//         AVAudioSession.setPreferredSampleRate
//       ) {
//         log(`AVAudioSession.setPreferredSampleRate(${cfg.sampleRate})`);
//         await AVAudioSession.setPreferredSampleRate(cfg.sampleRate);
//       }
//       if (cfg.mono && AVAudioSession.setPreferredInputNumberOfChannels) {
//         log('AVAudioSession.setPreferredInputNumberOfChannels(1)');
//         await AVAudioSession.setPreferredInputNumberOfChannels(1);
//       }
//       // Favor built-in mic; avoid AirPlay/Bluetooth inputs
//       if (AVAudioSession.overrideOutputAudioPort) {
//         try {
//           await AVAudioSession.overrideOutputAudioPort('none');
//           log('overrideOutputAudioPort("none") — favor built-in mic');
//         } catch (err) {
//           log('overrideOutputAudioPort error', err);
//         }
//       }
//       if (AVAudioSession.setActive) {
//         log('AVAudioSession.setActive(true)');
//         await AVAudioSession.setActive(true);
//       }

//       if (RCTVoice?.setupAudioSession) {
//         log('RCTVoice.setupAudioSession()');
//         await RCTVoice.setupAudioSession();
//       }

//       await delay(500); // allow iOS to finalize input route
//     } catch (err) {
//       log('armIOSAudioSession error', err);
//     }
//   }

//   /* ------------------------ start/stop ------------------------ */
//   const startListening = async () => {
//     log('startListening()');
//     if (!(await requestMic())) {
//       log('Mic permission denied');
//       return;
//     }

//     try {
//       // Stop any TTS so we don’t capture ourselves
//       await Tts.stop();
//       await delay(120);

//       // Reset attempt ladder and arm iOS session with first config
//       attemptRef.current = 0;
//       await armIOSAudioSession(IOS_TRIES[attemptRef.current]);

//       // Clear any in-flight RN-Voice session & local buffers
//       await Voice.cancel();
//       finalRef.current = '';
//       setSpeech('');

//       log(`Voice.start… (attempt ${attemptRef.current + 1})`);
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('Voice.start OK');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

//   const stopListening = async () => {
//     log('stopListening()');
//     try {
//       await Voice.stop();
//       scheduleFallbackCommit();
//     } catch (err) {
//       log('Voice.stop ERROR', err);
//       commitIfAny('stopError');
//     } finally {
//       setIsRecording(false);
//     }
//   };

//   /* ------------------------ effects & listeners ------------------------ */
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
//         log('TTS init error', e);
//       }

//       // Pre-arm once on mount (helps cold starts)
//       if (Platform.OS === 'ios') {
//         await armIOSAudioSession(IOS_TRIES[0]);
//         log('Pre-armed iOS audio session');
//       }
//     })();

//     Voice.onSpeechStart = (e: SpeechStartEvent) => log('onSpeechStart', e);
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

//     Voice.onSpeechError = async (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);

//       const code = (e as any)?.error?.code;
//       const msg = String((e as any)?.error?.message || '');

//       const isIOSFormatError =
//         Platform.OS === 'ios' &&
//         code === 'start_recording' &&
//         msg.includes('IsFormatSampleRateAndChannelCountValid');

//       if (isIOSFormatError) {
//         // Escalate to next iOS audio config
//         const next = attemptRef.current + 1;
//         if (next < IOS_TRIES.length) {
//           attemptRef.current = next;
//           const cfg = IOS_TRIES[attemptRef.current];
//           log(`Format error — retry with cfg #${attemptRef.current + 1}:`, cfg);
//           try {
//             await armIOSAudioSession(cfg);
//             await Voice.cancel();
//             await delay(100);
//             log('Voice.start… (retry)');
//             await Voice.start('en-US');
//             setIsRecording(true);
//             log('Voice.start OK (after retry)');
//             return; // keep listening
//           } catch (retryErr) {
//             log('Retry start failed', retryErr);
//           }
//         }
//       }

//       // Other errors (incl. recognition_fail) — deliver whatever we had
//       commitIfAny('onSpeechError');
//     };

//     log('Listeners attached');
//     return () => {
//       log('Unmount: removing listeners');
//       try {
//         Voice.destroy().then(Voice.removeAllListeners);
//       } catch {}
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return {speech, isRecording, startListening, stopListening};
// };

// /* ------------------------ utils ------------------------ */
// function delay(ms: number) {
//   return new Promise(res => setTimeout(res, ms));
// }

///////////////////

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
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// // RN-Voice iOS native bridge
// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   const finalRef = useRef('');
//   const commitTimer = useRef<NodeJS.Timeout | null>(null);

//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'We need microphone access for voice search.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const commitIfAny = (from: string) => {
//     const text = finalRef.current.trim();
//     log('commitIfAny(', from, ') =>', text);
//     if (text) setSpeech(text);
//     finalRef.current = '';
//     if (commitTimer.current) clearTimeout(commitTimer.current);
//   };

//   const startListening = async () => {
//     log('startListening()');

//     if (!(await requestMic())) {
//       log('Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await new Promise(res => setTimeout(res, 200));

//       // 💥 iOS: force valid session
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           log('Calling RCTVoice.setupAudioSession()');
//           await RCTVoice.setupAudioSession();
//           log('Audio session armed');
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       await Voice.cancel();

//       finalRef.current = '';
//       setSpeech('');
//       log('Voice.start…');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('Voice.start OK');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

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
//         log('TTS init error', e);
//       }

//       // ⚡ Pre-arm audio session on iOS just once at mount
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//           log('Pre-armed audio session');
//         } catch (err) {
//           log('setupAudioSession at mount error', err);
//         }
//       }
//     })();

//     Voice.onSpeechStart = (e: SpeechStartEvent) => log('onSpeechStart', e);
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

//     log('Listeners attached');
//     return () => {
//       log('Unmount: removing listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//   }, []);

//   return {speech, isRecording, startListening, stopListening};
// };

///////////////

// // apps/mobile/src/hooks/useVoiceControl.ts
// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
//   SpeechStartEvent,
// } from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
// import Tts from 'react-native-tts';

// const DEBUG = true;
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// type MaybeAVAudioSession = {
//   setCategory?: (cat: string) => Promise<void> | void;
//   setMode?: (mode: string) => Promise<void> | void;
//   setActive?: (active: boolean) => Promise<void> | void;
//   setPreferredSampleRate?: (rate: number) => Promise<void> | void;
//   setPreferredInputNumberOfChannels?: (ch: number) => Promise<void> | void;
//   overrideOutputAudioPort?: (port: 'none' | 'speaker') => Promise<void> | void;
// };
// const {AVAudioSession, RCTVoice} = NativeModules as {
//   AVAudioSession?: MaybeAVAudioSession;
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   const finalRef = useRef('');
//   const commitTimer = useRef<NodeJS.Timeout | null>(null);
//   const hasRetriedRef = useRef(false);

//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'We need microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const commitIfAny = (from: string) => {
//     const text = finalRef.current.trim();
//     log('commitIfAny(', from, ') =>', text);
//     if (text) setSpeech(text);
//     finalRef.current = '';
//     if (commitTimer.current) clearTimeout(commitTimer.current);
//   };

//   const armIOSAudioSession = async () => {
//     if (Platform.OS !== 'ios') return;
//     try {
//       if (AVAudioSession?.setActive) {
//         log('AVAudioSession.setActive(false) to reset');
//         await AVAudioSession.setActive(false);
//       }

//       if (AVAudioSession?.setCategory) {
//         log('AVAudioSession.setCategory(PlayAndRecord)');
//         await AVAudioSession.setCategory('PlayAndRecord');
//       }
//       if (AVAudioSession?.setMode) {
//         log('AVAudioSession.setMode(Measurement)');
//         await AVAudioSession.setMode('Measurement');
//       }
//       if (AVAudioSession?.setPreferredSampleRate) {
//         log('AVAudioSession.setPreferredSampleRate(44100)');
//         await AVAudioSession.setPreferredSampleRate(44100);
//       }
//       if (AVAudioSession?.setPreferredInputNumberOfChannels) {
//         log('AVAudioSession.setPreferredInputNumberOfChannels(1)');
//         await AVAudioSession.setPreferredInputNumberOfChannels(1);
//       }
//       if (AVAudioSession?.overrideOutputAudioPort) {
//         try {
//           await AVAudioSession.overrideOutputAudioPort('none');
//           log('Forced built-in mic route');
//         } catch (err) {
//           log('overrideOutputAudioPort error', err);
//         }
//       }
//       if (AVAudioSession?.setActive) {
//         log('AVAudioSession.setActive(true)');
//         await AVAudioSession.setActive(true);
//       }

//       if (RCTVoice?.setupAudioSession) {
//         log('RCTVoice.setupAudioSession()');
//         await RCTVoice.setupAudioSession();
//       }

//       await delay(500); // give iOS time to rebuild route
//     } catch (err) {
//       log('armIOSAudioSession error', err);
//     }
//   };

//   const startListening = async () => {
//     log('startListening()');
//     if (!(await requestMic())) {
//       log('Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await delay(120);

//       await armIOSAudioSession();

//       await Voice.cancel();
//       finalRef.current = '';
//       setSpeech('');
//       hasRetriedRef.current = false;

//       log('Voice.start…');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('Voice.start OK');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

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
//         log('TTS init error', e);
//       }

//       if (Platform.OS === 'ios') {
//         await armIOSAudioSession();
//         log('Pre-armed iOS audio session');
//       }
//     })();

//     Voice.onSpeechStart = (e: SpeechStartEvent) => log('onSpeechStart', e);

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

//     Voice.onSpeechError = async (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);

//       const code = (e as any)?.error?.code;
//       const msg = String((e as any)?.error?.message || '');
//       const isIOSFormatError =
//         Platform.OS === 'ios' &&
//         code === 'start_recording' &&
//         msg.includes('IsFormatSampleRateAndChannelCountValid');

//       if (isIOSFormatError && !hasRetriedRef.current) {
//         hasRetriedRef.current = true;
//         log('Retrying once after iOS format error…');
//         try {
//           await armIOSAudioSession();
//           await Voice.cancel();
//           await delay(80);
//           await Voice.start('en-US');
//           setIsRecording(true);
//           log('Voice.start OK (after retry)');
//           return;
//         } catch (retryErr) {
//           log('Retry start failed', retryErr);
//         }
//       }

//       commitIfAny('onSpeechError');
//     };

//     log('Listeners attached');
//     return () => {
//       log('Unmount: removing listeners');
//       try {
//         Voice.destroy().then(Voice.removeAllListeners);
//       } catch {}
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//   }, []);

//   return {speech, isRecording, startListening, stopListening};
// };

// function delay(ms: number) {
//   return new Promise(res => setTimeout(res, ms));
// }

///////////////////

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
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// // RN-Voice iOS native bridge
// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   const finalRef = useRef('');
//   const commitTimer = useRef<NodeJS.Timeout | null>(null);

//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'We need microphone access for voice search.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const commitIfAny = (from: string) => {
//     const text = finalRef.current.trim();
//     log('commitIfAny(', from, ') =>', text);
//     if (text) setSpeech(text);
//     finalRef.current = '';
//     if (commitTimer.current) clearTimeout(commitTimer.current);
//   };

//   const startListening = async () => {
//     log('startListening()');

//     if (!(await requestMic())) {
//       log('Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await new Promise(res => setTimeout(res, 200));

//       // 💥 iOS: force valid session
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           log('Calling RCTVoice.setupAudioSession()');
//           await RCTVoice.setupAudioSession();
//           log('Audio session armed');
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       await Voice.cancel();

//       finalRef.current = '';
//       setSpeech('');
//       log('Voice.start…');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('Voice.start OK');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

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
//         log('TTS init error', e);
//       }

//       // ⚡ Pre-arm audio session on iOS just once at mount
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//           log('Pre-armed audio session');
//         } catch (err) {
//           log('setupAudioSession at mount error', err);
//         }
//       }
//     })();

//     Voice.onSpeechStart = (e: SpeechStartEvent) => log('onSpeechStart', e);
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

//     log('Listeners attached');
//     return () => {
//       log('Unmount: removing listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//   }, []);

//   return {speech, isRecording, startListening, stopListening};
// };

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
