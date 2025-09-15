// apps/mobile/src/components/VoiceControlComponent/VoiceControlComponent.tsx
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  /** Called once with the final utterance when user stops holding the mic */
  onPromptResult?: (text: string) => void;
  /** If true, auto-resume STT after TTS ends when the user is still holding the mic */
  autoResumeAfterTTS?: boolean;
  /** Extra logging */
  debug?: boolean;
};

const VoiceControlComponent: React.FC<Props> = ({
  onPromptResult,
  autoResumeAfterTTS = true,
  debug = false,
}) => {
  const {theme} = useAppTheme();

  // UI state
  const [isPressed, setIsPressed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Refs
  const onPromptResultRef = useRef(onPromptResult);
  useEffect(() => {
    onPromptResultRef.current = onPromptResult;
  }, [onPromptResult]);

  const finalSpeechRef = useRef(''); // holds last stable text
  const isPressedRef = useRef(false); // track long-press state across async
  const wasRecordingBeforeTTSRef = useRef(false); // to resume after TTS
  const committedRef = useRef(false); // to avoid double-calling result
  const commitFallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const log = (...args: any[]) => {
    if (debug) console.log('[VoiceControl]', ...args);
  };

  // ---- Helpers ----
  const requestMic = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'We need access to your microphone for voice input.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const clearCommitFallback = () => {
    if (commitFallbackTimerRef.current) {
      clearTimeout(commitFallbackTimerRef.current);
      commitFallbackTimerRef.current = null;
    }
  };

  const commitResult = (source: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    clearCommitFallback();

    const spoken = finalSpeechRef.current.trim();
    log('commitResult from', source, '=>', spoken);

    if (onPromptResultRef.current && spoken) {
      try {
        onPromptResultRef.current(spoken);
      } catch (err) {
        console.warn('onPromptResult error', err);
      }
    }
    // reset after commit
    finalSpeechRef.current = '';
    setTranscript('');
  };

  const scheduleCommitFallback = () => {
    clearCommitFallback();
    // some devices delay onSpeechEnd/results — fallback ensures delivery
    commitFallbackTimerRef.current = setTimeout(() => {
      commitResult('fallbackTimer');
    }, 700);
  };

  // ---- Start/Stop recording ----
  const startRecording = async () => {
    log('startRecording()');
    if (!(await requestMic())) {
      log('Mic permission denied');
      return;
    }
    try {
      // stop TTS so we don't capture our own speech
      await Tts.stop();

      committedRef.current = false;
      finalSpeechRef.current = '';
      setTranscript('');
      // Start voice
      await Voice.start('en-US');
      setIsRecording(true);
      log('Voice.start OK');
    } catch (e) {
      console.error('Voice.start error', e);
      setIsRecording(false);
      scheduleCommitFallback();
    }
  };

  const stopRecording = async () => {
    log('stopRecording()');
    try {
      await Voice.stop();
      // onSpeechEnd should fire; fallback just in case:
      scheduleCommitFallback();
    } catch (e) {
      console.error('Voice.stop error', e);
      scheduleCommitFallback();
    } finally {
      setIsRecording(false);
    }
  };

  // ---- Effects: wire listeners once ----
  useEffect(() => {
    // TTS init
    (async () => {
      try {
        await Tts.getInitStatus();
        await Tts.setDefaultLanguage('en-US');
        if (Platform.OS === 'ios') {
          // Make TTS audible over silent switch if desired
          // @ts-ignore
          Tts.setIgnoreSilentSwitch?.('ignore');
        }
      } catch (e) {
        console.warn('TTS init error', e);
      }
    })();

    // Voice listeners
    const handleResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      log('onSpeechResults:', text);
      setTranscript(text);
      finalSpeechRef.current = text;
    };

    const handlePartial = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      log('onSpeechPartialResults:', text);
      setTranscript(text);
      finalSpeechRef.current = text;
    };

    const handleEnd = () => {
      log('onSpeechEnd');
      setIsRecording(false);
      // commit quickly; results might already be in finalSpeechRef
      commitResult('onSpeechEnd');
    };

    const handleError = (e: SpeechErrorEvent) => {
      // Native sometimes says: "Sending onSpeechError with no listeners registered"
      // This means no active JS listener at that moment. We *do* have one now,
      // so log the native error and ensure we still try to deliver something.
      const code = (e as any)?.error?.code;
      const msg = (e as any)?.error?.message;
      console.warn('onSpeechError:', code, msg);
      setIsRecording(false);
      // try committing whatever we have
      scheduleCommitFallback();
    };

    Voice.onSpeechResults = handleResults;
    Voice.onSpeechPartialResults = handlePartial;
    Voice.onSpeechEnd = handleEnd;
    Voice.onSpeechError = handleError;

    // TTS listeners to pause STT while speaking and optionally resume
    const subStart = Tts.addEventListener('tts-start', async () => {
      try {
        wasRecordingBeforeTTSRef.current = isRecording;
        if (isRecording) {
          log('tts-start: cancelling Voice');
          await Voice.cancel(); // cancel to avoid capturing TTS audio
          setIsRecording(false);
        }
      } catch (err) {
        console.warn('Error cancelling Voice on tts-start', err);
      }
    });

    const resumeIfNeeded = async (why: 'tts-finish' | 'tts-cancel') => {
      try {
        log(
          why,
          '— pressed?',
          isPressedRef.current,
          'wasRecording?',
          wasRecordingBeforeTTSRef.current,
        );
        if (
          autoResumeAfterTTS &&
          wasRecordingBeforeTTSRef.current &&
          isPressedRef.current
        ) {
          await Voice.start('en-US');
          setIsRecording(true);
          log('Resumed Voice after TTS');
        }
      } catch (err) {
        console.warn('Error restarting Voice after TTS', err);
      } finally {
        wasRecordingBeforeTTSRef.current = false;
      }
    };

    const subFinish = Tts.addEventListener('tts-finish', () =>
      resumeIfNeeded('tts-finish'),
    );
    const subCancel = Tts.addEventListener('tts-cancel', () =>
      resumeIfNeeded('tts-cancel'),
    );

    return () => {
      // Clean up everything on unmount
      try {
        Voice.destroy().then(Voice.removeAllListeners);
      } catch {}
      // @ts-ignore new RN-TTS returns emitter subs with remove()
      subStart?.remove?.();
      // @ts-ignore
      subFinish?.remove?.();
      // @ts-ignore
      subCancel?.remove?.();
      clearCommitFallback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResumeAfterTTS, isRecording]);

  // ---- UI (press-and-hold to record) ----
  return (
    <View style={{flex: 1, justifyContent: 'center'}}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={{
          flexDirection: 'row',
          backgroundColor: isPressed
            ? theme.colors.primary
            : theme.colors.surface2,
          borderRadius: tokens.borderRadius.md,
          paddingVertical: 16,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: theme.colors.surfaceBorder,
        }}
        onPressIn={() => {
          setIsPressed(true);
          isPressedRef.current = true;
          startRecording();
        }}
        onPressOut={() => {
          setIsPressed(false);
          isPressedRef.current = false;
          stopRecording();
        }}>
        <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
          {isRecording
            ? transcript
              ? transcript
              : 'Listening…'
            : 'Hold to Talk'}
        </Text>
        <MaterialIcons name="mic" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default VoiceControlComponent;

/**
 * Speak helper you can import anywhere:
 *   import { speak } from '@/components/VoiceControlComponent/VoiceControlComponent';
 *   await speak("Here's an outfit I think you'll love.");
 */
export async function speak(text: string) {
  try {
    await Tts.stop(); // clear any pending
    await Tts.speak(text);
  } catch (e) {
    console.warn('TTS speak error', e);
  }
}

///////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   StyleSheet,
//   PermissionsAndroid,
//   Platform,
//   TouchableOpacity,
//   Text,
// } from 'react-native';
// import Voice from '@react-native-voice/voice';
// import Tts from 'react-native-tts';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   onPromptResult?: (text: string) => void;
// };

// const VoiceControlComponent: React.FC<Props> = ({onPromptResult}) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [speech, setSpeech] = useState('');
//   const [isPressed, setIsPressed] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);

//   const styles = StyleSheet.create({
//     chatContainer: {
//       flex: 1,
//       justifyContent: 'center',
//     },
//     stylingCard: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface2,
//       borderRadius: tokens.borderRadius.md,
//       paddingVertical: 16,
//       paddingHorizontal: 16,
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     stylingCardPressed: {
//       backgroundColor: '#3366FF',
//     },
//     cardText: {
//       color: '#fff',
//       fontWeight: '500',
//       fontSize: 16,
//     },
//   });

//   const onPromptResultRef = useRef(onPromptResult);
//   useEffect(() => {
//     onPromptResultRef.current = onPromptResult;
//   }, [onPromptResult]);

//   const isRecordingRef = useRef(isRecording);
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // Keep track of full final speech text here
//   let finalSpeech = '';

//   useEffect(() => {
//     const initTts = async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.setDefaultLanguage('en-US');
//       } catch (e) {
//         console.warn('TTS init error', e);
//       }
//     };
//     initTts();

//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//       finalSpeech = text; // update latest recognized text
//     };

//     Voice.onSpeechEnd = () => {
//       setIsRecording(false);
//       if (onPromptResultRef.current && finalSpeech.trim() !== '') {
//         onPromptResultRef.current(finalSpeech.trim());
//         finalSpeech = ''; // clear for next use
//       }
//     };

//     Voice.onSpeechError = e => {
//       console.warn('Speech recognition error:', e.error);
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
//           message: 'App needs mic access.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMic())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('Voice.start error', e);
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//     } catch (e) {
//       console.error('Voice.stop error', e);
//     }
//   };

//   return (
//     <View style={styles.chatContainer}>
//       <TouchableOpacity
//         style={[styles.stylingCard, isPressed && styles.stylingCardPressed]}
//         onPressIn={() => {
//           setIsPressed(true);
//           startRecording();
//         }}
//         onPressOut={() => {
//           setIsPressed(false);
//           stopRecording();
//         }}>
//         <Text style={styles.cardText}>Chat</Text>
//         <MaterialIcons name="mic" size={22} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default VoiceControlComponent;
