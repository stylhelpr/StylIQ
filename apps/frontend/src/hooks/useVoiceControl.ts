// src/hooks/useVoiceControl.ts
// -----------------------------------------------------------------------------
// 🎙️ useVoiceControl — unified voice recognition + instant TTS feedback
// -----------------------------------------------------------------------------
// ✅ Fixes & Enhancements
//  • Overlay now shows real spoken text (no more “Listening…” stuck state)
//  • Instant Siri-style TTS cues (“Listening”, “Done”, “Okay”, “Got it”)
//  • Uses VoiceBus helpers: updateSpeech / startListening / stopListening
//  • Keeps last spoken phrase visible across navigation
// -----------------------------------------------------------------------------

import {useEffect, useRef, useState} from 'react';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';
import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
import Tts from 'react-native-tts';
import {VoiceBus} from '../utils/VoiceUtils/VoiceBus';
import {VoiceTarget} from '../utils/VoiceUtils/voiceTarget';
import {routeVoiceCommand} from '../utils/VoiceUtils/voiceCommandRouter';
import {globalNavigate} from '../MainApp';
import {instantSpeak} from '../utils/VoiceUtils/instantTts';
import {AudioMode} from '../utils/VoiceUtils/AudioMode';
import {
  isPassiveMode,
  processWakeWordResult,
  processWakeWordPartial,
  onWakeSpeechStart,
  onWakeSpeechEnd,
  onWakeSpeechError,
} from '../utils/VoiceUtils/WakeWordManager';
import {isVideoFeedVoiceActive, getVideoFeedCallbacks} from '../voice/VideoFeedVoiceSession';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

const {RCTVoice} = NativeModules as {
  RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
};

// Module-level flag to prevent multiple components from registering Voice handlers
// The first component to mount (usually FloatingMicButton) will register handlers,
// and subsequent mounts will skip registration
let voiceHandlersRegistered = false;

/**
 * Reset the voice handler registration flag.
 * Call this when a screen-scoped voice session (like VideoFeed) ends
 * to allow the global voice system to re-register its handlers.
 */
export function resetVoiceHandlerRegistration(): void {
  console.log('[VOICE] 🔄 Force resetting voiceHandlersRegistered flag');
  voiceHandlersRegistered = false;
}

// Store the handler registration function so it can be called externally
let registerHandlersFn: (() => void) | null = null;

/**
 * Force re-registration of global voice handlers.
 * Call this after a screen-scoped voice session ends.
 */
export function forceReregisterVoiceHandlers(): void {
  console.log('[VOICE] 🔄 Force re-registering global voice handlers');
  voiceHandlersRegistered = false;
  if (registerHandlersFn) {
    registerHandlersFn();
  }
}

export const useVoiceControl = () => {
  const [speech, setSpeech] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const finalRef = useRef('');
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  // 🔒 Microphone permission
  const requestMic = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Mic Permission',
          message: 'StylHelpr needs microphone access for voice input.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  // 📡 Keep overlay synced
  useEffect(() => {
    if (isRecording) VoiceBus.startListening();
    else VoiceBus.stopListening();
  }, [isRecording]);

  // 🧹 Stop current session (preserves handlers for next use)
  const forceStop = async (source = 'forceStop') => {
    log('🧹 forceStop()', source);
    try {
      await Voice.stop();
    } catch {}
    // NOTE: Don't call Voice.destroy() here - it removes all event handlers
    // The handlers are set once in useEffect and must persist
    setIsRecording(false);
    VoiceBus.stopListening();
    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    // Reset AudioMode if we were in listening mode
    if (AudioMode.mode === 'listening') {
      await AudioMode.setMode('idle');
    }
  };

  // 🎙️ Start listening cleanly
  const startListening = async () => {
    log('🎙️ startListening()');

    // Check if AudioMode allows mic access
    if (!AudioMode.canUseMic()) {
      log('❌ AudioMode blocks mic access, current mode:', AudioMode.mode);
      return;
    }

    if (!(await requestMic())) {
      log('❌ Mic permission denied');
      return;
    }

    try {
      // Wrap Tts.stop() in try-catch to handle iOS bridge type conversion errors
      // The library sometimes throws "Error while converting JavaScript argument 0 to Objective C type BOOL"
      try {
        await Tts.stop();
      } catch (ttsErr) {
        log('⚠️ Tts.stop() error (non-fatal):', ttsErr);
      }
      await forceStop('pre-start');
      await new Promise(res => setTimeout(res, 120));

      // Set AudioMode to 'listening' before starting voice recognition
      // This triggers the native audio session switch (playback → voice)
      const modeSet = await AudioMode.setMode('listening');
      if (!modeSet) {
        log('❌ Failed to set AudioMode to listening');
        return;
      }

      // Wait for iOS audio session to fully reconfigure after category switch
      // The native AudioSessionManager needs time to deactivate, switch category, and reactivate
      // Longer delay needed when switching from video playback mode
      await new Promise(res => setTimeout(res, 500));

      finalRef.current = '';
      setSpeech('');
      VoiceBus.startListening();

      // Voice.start() internally sets up its own audio recording tap
      // Adding retry logic in case the first attempt fails due to timing
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          await Voice.start('en-US');
          break; // Success, exit loop
        } catch (voiceErr: any) {
          attempts++;
          log(`Voice.start attempt ${attempts} failed:`, voiceErr?.message);
          if (attempts < maxAttempts) {
            await new Promise(res => setTimeout(res, 300));
          } else {
            throw voiceErr; // Re-throw on final attempt
          }
        }
      }

      setIsRecording(true);
      log('✅ Voice listening started, AudioMode:', AudioMode.mode);
    } catch (err) {
      log('Voice.start ERROR', err);
      setIsRecording(false);
      // Reset AudioMode on error
      await AudioMode.setMode('idle');
    }
  };

  // 🛑 Stop listening gracefully
  const stopListening = async (from = '') => {
    log('🛑 stopListening()', from);
    try {
      await Voice.stop();
    } catch (err) {
      log('Voice.stop ERROR', err);
    }
    setIsRecording(false);
    VoiceBus.stopListening();

    // Reset AudioMode to idle when done listening
    if (AudioMode.mode === 'listening') {
      await AudioMode.setMode('idle');
      log('✅ AudioMode reset to idle');
    }
  };

  // 💬 Commit final recognized text
  const commitIfAny = async (source: string) => {
    const text = finalRef.current.trim();
    if (!text) return;

    log('💬 commitIfAny', source, '=>', text);
    setSpeech(text);
    VoiceBus.updateSpeech(text);

    const looksLikeCommand = /^(go to|open|show me|take me to)\b/i.test(text);
    if (looksLikeCommand) VoiceTarget.lock();

    if (VoiceTarget.currentSetter && !looksLikeCommand) {
      VoiceTarget.applyText(text);
      // instantSpeak('Done'); // 👈 confirm text applied
    } else {
      try {
        await routeVoiceCommand(text, globalNavigate);
        // instantSpeak('Okay'); // 👈 confirm navigation/command
      } catch (err) {
        console.log('⚠️ routeVoiceCommand failed', err);
        // instantSpeak("Sorry, I didn't catch that");
      }
    }
  };

  // 🔗 Setup speech listeners
  // IMPORTANT: This is the SINGLE source of truth for Voice event handlers.
  // WakeWordManager exports functions that we call when in passive/wake mode.
  // Only the FIRST component to mount registers handlers (prevents overwrites).
  useEffect(() => {
    if (voiceHandlersRegistered) {
      log('⚠️ Voice handlers already registered by another component, skipping');
      return;
    }
    voiceHandlersRegistered = true;
    log('🎧 Registering Voice handlers (first mount)');

    Voice.onSpeechStart = (e: SpeechStartEvent) => {
      log('onSpeechStart', {event: e, isPassive: isPassiveMode(), audioMode: AudioMode.mode});

      // Forward to VideoFeed if its session owns voice
      if (isVideoFeedVoiceActive()) {
        log('📹 Forwarding onSpeechStart to VideoFeed');
        // onListeningStart is called at session start, not here
        return;
      }

      // Delegate to WakeWordManager if in passive wake mode
      if (isPassiveMode()) {
        onWakeSpeechStart();
        return;
      }

      // Active voice recognition mode
      log('✅ Setting isRecording = true');
      setIsRecording(true);
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      log('onSpeechPartialResults', {text, isPassive: isPassiveMode(), audioMode: AudioMode.mode});

      // Forward to VideoFeed if its session owns voice
      if (isVideoFeedVoiceActive()) {
        const callbacks = getVideoFeedCallbacks();
        if (callbacks) {
          log('📹 Forwarding partial result to VideoFeed:', text);
          callbacks.onPartialResult(text);
        }
        return;
      }

      // Delegate to WakeWordManager if in passive wake mode
      if (isPassiveMode()) {
        processWakeWordPartial(text);
        return;
      }

      // Active voice recognition mode
      finalRef.current = text;
      setSpeech(text);
      VoiceBus.updateSpeech(text);

      const looksLikeCommand = /^(go to|open|show me|take me to)\b/i.test(
        text.trim(),
      );

      if (looksLikeCommand) {
        if (!VoiceTarget.locked) VoiceTarget.lock();
      } else {
        VoiceTarget.applyText(text);
      }

      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        log('⏱️ Silence detected, committing...');
        stopListening('auto-end');
        commitIfAny('silence');
      }, 2500);
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';

      // Forward to VideoFeed if its session owns voice
      if (isVideoFeedVoiceActive()) {
        const callbacks = getVideoFeedCallbacks();
        if (callbacks) {
          log('📹 Forwarding final result to VideoFeed:', text);
          callbacks.onFinalResult(text);
        }
        return;
      }

      // Delegate to WakeWordManager if in passive wake mode
      if (isPassiveMode()) {
        processWakeWordResult(text);
        return;
      }

      // Active voice recognition mode
      finalRef.current = text;
      setSpeech(text);
      VoiceBus.updateSpeech(text);
      VoiceTarget.applyText(text);
    };

    Voice.onSpeechEnd = () => {
      log('onSpeechEnd');

      // Forward to VideoFeed if its session owns voice
      if (isVideoFeedVoiceActive()) {
        const callbacks = getVideoFeedCallbacks();
        if (callbacks) {
          log('📹 Forwarding onSpeechEnd to VideoFeed');
          callbacks.onListeningEnd();
        }
        return;
      }

      // Delegate to WakeWordManager if in passive wake mode
      if (isPassiveMode()) {
        onWakeSpeechEnd();
        return;
      }

      // Active voice recognition mode - grace period before commit
      log('onSpeechEnd (grace period delay)');
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        stopListening('speechEnd');
        commitIfAny('speechEnd');
      }, 1000);
    };

    Voice.onSpeechError = async (e: SpeechErrorEvent) => {
      const errorCode = e.error?.code || 'unknown';
      const errorMsg = e.error?.message || String(e.error);
      log('onSpeechError', {code: errorCode, message: errorMsg, isPassive: isPassiveMode(), audioMode: AudioMode.mode});

      // Forward to VideoFeed if its session owns voice
      if (isVideoFeedVoiceActive()) {
        const callbacks = getVideoFeedCallbacks();
        if (callbacks) {
          log('📹 Forwarding error to VideoFeed:', errorMsg);
          callbacks.onError(errorMsg);
        }
        return;
      }

      // Delegate to WakeWordManager if in passive wake mode
      if (isPassiveMode()) {
        onWakeSpeechError(e.error);
        return;
      }

      // Check if this is the iOS audio format error that can be recovered from
      const isIOSFormatError =
        errorCode === 'start_recording' &&
        errorMsg.includes('IsFormatSampleRateAndChannelCountValid');

      if (isIOSFormatError) {
        log('⚠️ iOS format error detected - this may be recoverable');
        // Don't reset state on this error - let the retry logic in startListening handle it
        return;
      }

      // Active voice recognition mode - reset state properly
      setIsRecording(false);
      VoiceBus.stopListening();

      // Reset AudioMode to idle on error to allow recovery
      if (AudioMode.mode === 'listening') {
        log('🔄 Resetting AudioMode to idle after error');
        await AudioMode.setMode('idle');
      }
    };

    const handleStop = async () => {
      log('📢 VoiceBus stopListening event received');
      await forceStop('VoiceBus.stopListening');
      VoiceTarget.clear();
    };
    VoiceBus.on('stopListening', handleStop);

    log('🎧 Voice handlers registered');

    // Track that THIS component instance registered the handlers
    const thisComponentRegistered = true;

    return () => {
      log('🧹 Cleanup voice listeners (component unmount)');
      // NOTE: Do NOT call Voice.destroy() here!
      // Multiple components use useVoiceControl, and destroying Voice when
      // any one of them unmounts would break voice for all other components.
      // Voice.destroy() should only be called on app-level cleanup.

      // Only reset the flag if THIS component was the one that registered
      if (thisComponentRegistered) {
        voiceHandlersRegistered = false;
        log('🔄 Voice handler registration flag reset');
      }
      VoiceBus.off('stopListening', handleStop);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, []);

  const handleSend = async (onSend?: (text: string) => void) => {
    log('handleSend()');
    await stopListening('handleSend');
    const text = finalRef.current.trim() || speech.trim();
    if (text) onSend?.(text);
    setSpeech('');
    finalRef.current = '';
  };

  const startVoiceCommand = async (onCommand: (text: string) => void) => {
    log('[VOICE] startVoiceCommand()');
    await forceStop('pre-command');
    await startListening();

    let lastSpeech = '';
    let stableCount = 0;
    let hasCommitted = false;

    const commitWatcher = setInterval(() => {
      const current = finalRef.current.trim();
      if (current === lastSpeech && current.length > 0) stableCount++;
      else {
        stableCount = 0;
        lastSpeech = current;
      }

      if (stableCount >= 3 && !isRecording && current) {
        hasCommitted = true;
        clearInterval(commitWatcher);
        stopListening('stable-final');
        log('[VOICE] ✅ Finalized phrase:', current);
        VoiceBus.updateSpeech(current);
        onCommand(current);
      }
    }, 500);

    setTimeout(() => {
      if (!hasCommitted) {
        clearInterval(commitWatcher);
        const final = finalRef.current.trim();
        if (final) {
          log('[VOICE] ⚠️ Timeout fallback phrase:', final);
          stopListening('timeout');
          VoiceBus.updateSpeech(final);
          onCommand(final);
        }
      }
    }, 3000);
  };

  return {
    speech,
    isRecording,
    startListening,
    stopListening,
    handleSend,
    startVoiceCommand,
  };
};

/////////////////////////

// // src/hooks/useVoiceControl.ts
// // -----------------------------------------------------------------------------
// // 🎙️ useVoiceControl — unified voice recognition + TTS control
// // -----------------------------------------------------------------------------
// // ✅ Fixes:
// //  • Overlay now shows real spoken text (no more “Listening…” stuck state)
// //  • Uses VoiceBus helpers: updateSpeech / startListening / stopListening
// //  • Keeps last spoken phrase visible across navigation
// // -----------------------------------------------------------------------------

// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
//   SpeechStartEvent,
// } from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
// import Tts from 'react-native-tts';
// import {VoiceBus} from '../utils/VoiceBus';
// import {VoiceTarget} from '../utils/voiceTarget';
// import {routeVoiceCommand} from '../utils/voiceCommandRouter';
// import {globalNavigate} from '../MainApp';

// const DEBUG = true;
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const finalRef = useRef('');
//   const silenceTimer = useRef<NodeJS.Timeout | null>(null);

//   // 🔒 Microphone permission
//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'StylHelpr needs microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   // 📡 Keep overlay synced
//   useEffect(() => {
//     if (isRecording) VoiceBus.startListening();
//     else VoiceBus.stopListening();
//   }, [isRecording]);

//   // 🧹 Full destroy (used on navigation or stuck sessions)
//   const forceStop = async (source = 'forceStop') => {
//     log('🧹 forceStop()', source);
//     try {
//       await Voice.stop();
//     } catch {}
//     try {
//       await Voice.destroy();
//     } catch {}
//     setIsRecording(false);
//     VoiceBus.stopListening();
//     if (silenceTimer.current) clearTimeout(silenceTimer.current);
//   };

//   // 🎙️ Start listening cleanly
//   const startListening = async () => {
//     log('🎙️ startListening()');
//     if (!(await requestMic())) {
//       log('❌ Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await forceStop('pre-start');
//       await new Promise(res => setTimeout(res, 120));

//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       finalRef.current = '';
//       setSpeech('');
//       VoiceBus.startListening();
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('✅ Voice listening started');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

//   // 🛑 Stop listening gracefully
//   const stopListening = async (from = '') => {
//     log('🛑 stopListening()', from);
//     try {
//       await Voice.stop();
//     } catch (err) {
//       log('Voice.stop ERROR', err);
//     }
//     setIsRecording(false);
//     VoiceBus.stopListening();
//   };

//   const commitIfAny = async (source: string) => {
//     const text = finalRef.current.trim();
//     if (!text) return;

//     log('💬 commitIfAny', source, '=>', text);
//     setSpeech(text);
//     VoiceBus.updateSpeech(text);

//     const looksLikeCommand = /^(go to|open|show me|take me to)\b/i.test(text);

//     if (looksLikeCommand) VoiceTarget.lock();

//     if (VoiceTarget.currentSetter && !looksLikeCommand) {
//       VoiceTarget.applyText(text);
//     } else {
//       try {
//         await routeVoiceCommand(text, globalNavigate);
//       } catch (err) {
//         console.log('⚠️ routeVoiceCommand failed', err);
//       }
//     }
//   };

//   // 🔗 Setup speech listeners
//   useEffect(() => {
//     Voice.onSpeechStart = (e: SpeechStartEvent) => {
//       log('onSpeechStart', e);
//       setIsRecording(true);
//     };

//     Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//       VoiceBus.updateSpeech(text); // ✅ broadcast live text

//       const looksLikeCommand = /^(go to|open|show me|take me to)\b/i.test(
//         text.trim(),
//       );

//       if (looksLikeCommand) {
//         if (!VoiceTarget.locked) VoiceTarget.lock();
//       } else {
//         VoiceTarget.applyText(text);
//       }

//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         log('⏱️ Silence detected, committing...');
//         stopListening('auto-end');
//         commitIfAny('silence');
//       }, 2500);
//     };

//     Voice.onSpeechResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//       VoiceBus.updateSpeech(text); // ✅ broadcast final text
//       VoiceTarget.applyText(text);
//     };

//     Voice.onSpeechEnd = () => {
//       log('onSpeechEnd (grace period delay)');
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         stopListening('speechEnd');
//         commitIfAny('speechEnd');
//       }, 1000);
//     };

//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);
//       VoiceBus.stopListening();
//     };

//     const handleStop = async () => {
//       await forceStop('VoiceBus.stopListening');
//       VoiceTarget.clear();
//     };
//     VoiceBus.on('stopListening', handleStop);

//     return () => {
//       log('🧹 Cleanup voice listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       VoiceBus.off('stopListening', handleStop);
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//     };
//   }, []);

//   const handleSend = async (onSend?: (text: string) => void) => {
//     log('handleSend()');
//     await stopListening('handleSend');
//     const text = finalRef.current.trim() || speech.trim();
//     if (text) onSend?.(text);
//     setSpeech('');
//     finalRef.current = '';
//   };

//   const startVoiceCommand = async (onCommand: (text: string) => void) => {
//     log('[VOICE] startVoiceCommand()');
//     await forceStop('pre-command');
//     await startListening();

//     let lastSpeech = '';
//     let stableCount = 0;
//     let hasCommitted = false;

//     const commitWatcher = setInterval(() => {
//       const current = finalRef.current.trim();
//       if (current === lastSpeech && current.length > 0) stableCount++;
//       else {
//         stableCount = 0;
//         lastSpeech = current;
//       }

//       if (stableCount >= 3 && !isRecording && current) {
//         hasCommitted = true;
//         clearInterval(commitWatcher);
//         stopListening('stable-final');
//         log('[VOICE] ✅ Finalized phrase:', current);
//         VoiceBus.updateSpeech(current);
//         onCommand(current);
//       }
//     }, 500);

//     setTimeout(() => {
//       if (!hasCommitted) {
//         clearInterval(commitWatcher);
//         const final = finalRef.current.trim();
//         if (final) {
//           log('[VOICE] ⚠️ Timeout fallback phrase:', final);
//           stopListening('timeout');
//           VoiceBus.updateSpeech(final);
//           onCommand(final);
//         }
//       }
//     }, 3000);
//   };

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//     handleSend,
//     startVoiceCommand,
//   };
// };

//////////////////

// // src/hooks/useVoiceControl.ts
// // -----------------------------------------------------------------------------
// // 🎙️ useVoiceControl — unified voice recognition + TTS control
// // -----------------------------------------------------------------------------
// // ✅ Fixes:
// //  • Mic “hangs” after navigating between screens
// //  • Ensures clean shutdown before each start
// //  • Adds forced destroy on VoiceBus.stopListening
// //  • Integrates with VoiceTarget to inject text into focused inputs
// // -----------------------------------------------------------------------------

// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
//   SpeechStartEvent,
// } from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
// import Tts from 'react-native-tts';
// import {VoiceBus} from '../utils/VoiceBus';
// import {VoiceTarget} from '../utils/voiceTarget';
// import {routeVoiceCommand} from '../utils/voiceCommandRouter';
// import {globalNavigate} from '../MainApp';

// const DEBUG = true;
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const finalRef = useRef('');
//   const silenceTimer = useRef<NodeJS.Timeout | null>(null);

//   // 🔒 Microphone permission
//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'StylHelpr needs microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   // 📡 Broadcast recording + speech status to overlay
//   useEffect(() => {
//     VoiceBus.emit('status', {speech, isRecording});
//   }, [speech, isRecording]);

//   // 🧹 Full destroy (used on navigation or stuck sessions)
//   const forceStop = async (source = 'forceStop') => {
//     log('🧹 forceStop()', source);
//     try {
//       await Voice.stop();
//     } catch {}
//     try {
//       await Voice.destroy();
//     } catch {}
//     setIsRecording(false);
//     if (silenceTimer.current) clearTimeout(silenceTimer.current);
//   };

//   // 🎙️ Start listening cleanly
//   const startListening = async () => {
//     log('🎙️ startListening()');
//     if (!(await requestMic())) {
//       log('❌ Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await forceStop('pre-start');
//       await new Promise(res => setTimeout(res, 120));

//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       finalRef.current = '';
//       setSpeech('');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('✅ Voice listening started');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

//   // 🛑 Stop listening gracefully
//   const stopListening = async (from = '') => {
//     log('🛑 stopListening()', from);
//     try {
//       await Voice.stop();
//     } catch (err) {
//       log('Voice.stop ERROR', err);
//     }
//     setIsRecording(false);
//   };

//   // const commitIfAny = async (source: string) => {
//   //   const text = finalRef.current.trim();
//   //   if (!text) return;

//   //   log('💬 commitIfAny', source, '=>', text);
//   //   setSpeech(text);

//   //   // 🧠 If an input field is active → inject text
//   //   if (VoiceTarget.currentSetter) {
//   //     VoiceTarget.applyText(text);
//   //   } else {
//   //     // 🧭 If no input is active → treat as a voice command
//   //     try {
//   //       await routeVoiceCommand(text, globalNavigate);
//   //     } catch (err) {
//   //       console.log('⚠️ routeVoiceCommand failed', err);
//   //     }
//   //   }
//   // };

//   const commitIfAny = async (source: string) => {
//     const text = finalRef.current.trim();
//     if (!text) return;

//     log('💬 commitIfAny', source, '=>', text);
//     setSpeech(text);

//     // 👇 Detect navigation-style commands
//     const looksLikeCommand = /^(go to|open|show me|take me to)\b/i.test(text);

//     // 🔒 If it's a navigation phrase, lock input injection
//     if (looksLikeCommand) {
//       VoiceTarget.lock();
//     }

//     // 🧠 If an input field is active → inject text
//     if (VoiceTarget.currentSetter && !looksLikeCommand) {
//       VoiceTarget.applyText(text);
//     } else {
//       // 🧭 If no input is active OR command mode → treat as a voice command
//       try {
//         await routeVoiceCommand(text, globalNavigate);
//       } catch (err) {
//         console.log('⚠️ routeVoiceCommand failed', err);
//       }
//     }
//   };

//   // 🔗 Setup speech listeners
//   useEffect(() => {
//     Voice.onSpeechStart = (e: SpeechStartEvent) => {
//       log('onSpeechStart', e);
//       setIsRecording(true);
//     };

//     // Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//     //   const text = e.value?.[0] || '';
//     //   finalRef.current = text;
//     //   setSpeech(text);
//     //   VoiceTarget.applyText(text); // 🟢 live inject into focused TextInput

//     //   // 🕐 reset silence timer every time partial results come in
//     //   if (silenceTimer.current) clearTimeout(silenceTimer.current);
//     //   silenceTimer.current = setTimeout(() => {
//     //     log('⏱️ Silence detected, committing...');
//     //     stopListening('auto-end');
//     //     commitIfAny('silence');
//     //   }, 2500);
//     // };

//     Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);

//       // 👇 Early detect if it looks like a navigation phrase
//       const looksLikeCommand = /^(go to|open|show me|take me to)\b/i.test(
//         text.trim(),
//       );

//       if (looksLikeCommand) {
//         // 🚫 Immediately lock so no partials go into old input
//         if (!VoiceTarget.locked) VoiceTarget.lock();
//       } else {
//         // ✍️ Otherwise still inject into active TextInput
//         VoiceTarget.applyText(text);
//       }

//       // 🕐 reset silence timer every time partial results come in
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         log('⏱️ Silence detected, committing...');
//         stopListening('auto-end');
//         commitIfAny('silence');
//       }, 2500);
//     };

//     Voice.onSpeechResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//       VoiceTarget.applyText(text); // 🟢 inject once more on final results
//     };

//     Voice.onSpeechEnd = () => {
//       log('onSpeechEnd (grace period delay)');
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         stopListening('speechEnd');
//         commitIfAny('speechEnd');
//       }, 1000);
//     };

//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);
//     };

//     const handleStop = async () => {
//       await forceStop('VoiceBus.stopListening');
//       VoiceTarget.clear(); // 🟢 ensure no lingering binding on global stop
//     };
//     VoiceBus.on('stopListening', handleStop);

//     return () => {
//       log('🧹 Cleanup voice listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       VoiceBus.off('stopListening', handleStop);
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//     };
//   }, []);

//   // ✉️ Manual text send helper
//   const handleSend = async (onSend?: (text: string) => void) => {
//     log('handleSend()');
//     await stopListening('handleSend');
//     const text = finalRef.current.trim() || speech.trim();
//     if (text) onSend?.(text);
//     setSpeech('');
//     finalRef.current = '';
//   };

//   // 🧠 Voice command wrapper
//   const startVoiceCommand = async (onCommand: (text: string) => void) => {
//     log('[VOICE] startVoiceCommand()');
//     await forceStop('pre-command');
//     await startListening();

//     let lastSpeech = '';
//     let stableCount = 0;
//     let hasCommitted = false;

//     const commitWatcher = setInterval(() => {
//       const current = finalRef.current.trim();

//       if (current === lastSpeech && current.length > 0) {
//         stableCount++;
//       } else {
//         stableCount = 0;
//         lastSpeech = current;
//       }

//       if (stableCount >= 3 && !isRecording && current) {
//         hasCommitted = true;
//         clearInterval(commitWatcher);
//         stopListening('stable-final');
//         setSpeech('');
//         log('[VOICE] ✅ Finalized phrase:', current);
//         onCommand(current);
//       }
//     }, 500);

//     setTimeout(() => {
//       if (!hasCommitted) {
//         clearInterval(commitWatcher);
//         const final = finalRef.current.trim();
//         if (final) {
//           log('[VOICE] ⚠️ Timeout fallback phrase:', final);
//           stopListening('timeout');
//           setSpeech('');
//           onCommand(final);
//         }
//       }
//     }, 3000);
//   };

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//     handleSend,
//     startVoiceCommand,
//   };
// };

/////////////////////

// // src/hooks/useVoiceControl.ts
// // -----------------------------------------------------------------------------
// // 🎙️ useVoiceControl — unified voice recognition + TTS control
// // -----------------------------------------------------------------------------
// // ✅ Fixes:
// //  • Mic “hangs” after navigating between screens
// //  • Ensures clean shutdown before each start
// //  • Adds forced destroy on VoiceBus.stopListening
// //  • Integrates with VoiceTarget to inject text into focused inputs
// // -----------------------------------------------------------------------------

// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
//   SpeechStartEvent,
// } from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
// import Tts from 'react-native-tts';
// import {VoiceBus} from '../utils/VoiceBus';
// import {VoiceTarget} from '../utils/voiceTarget';
// import {routeVoiceCommand} from '../utils/voiceCommandRouter';
// import {globalNavigate} from '../MainApp';

// const DEBUG = true;
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const finalRef = useRef('');
//   const silenceTimer = useRef<NodeJS.Timeout | null>(null);

//   // 🔒 Microphone permission
//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'StylHelpr needs microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   // 📡 Broadcast recording + speech status to overlay
//   useEffect(() => {
//     VoiceBus.emit('status', {speech, isRecording});
//   }, [speech, isRecording]);

//   // 🧹 Full destroy (used on navigation or stuck sessions)
//   const forceStop = async (source = 'forceStop') => {
//     log('🧹 forceStop()', source);
//     try {
//       await Voice.stop();
//     } catch {}
//     try {
//       await Voice.destroy();
//     } catch {}
//     setIsRecording(false);
//     if (silenceTimer.current) clearTimeout(silenceTimer.current);
//   };

//   // 🎙️ Start listening cleanly
//   const startListening = async () => {
//     log('🎙️ startListening()');
//     if (!(await requestMic())) {
//       log('❌ Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await forceStop('pre-start');
//       await new Promise(res => setTimeout(res, 120));

//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       finalRef.current = '';
//       setSpeech('');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('✅ Voice listening started');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

//   // 🛑 Stop listening gracefully
//   const stopListening = async (from = '') => {
//     log('🛑 stopListening()', from);
//     try {
//       await Voice.stop();
//     } catch (err) {
//       log('Voice.stop ERROR', err);
//     }
//     setIsRecording(false);
//   };

//   const commitIfAny = async (source: string) => {
//     const text = finalRef.current.trim();
//     if (!text) return;

//     log('💬 commitIfAny', source, '=>', text);
//     setSpeech(text);

//     // 🧠 If an input field is active → inject text
//     if (VoiceTarget.currentSetter) {
//       VoiceTarget.applyText(text);
//     } else {
//       // 🧭 If no input is active → treat as a voice command
//       try {
//         await routeVoiceCommand(text, globalNavigate);
//       } catch (err) {
//         console.log('⚠️ routeVoiceCommand failed', err);
//       }
//     }
//   };

//   // 🔗 Setup speech listeners
//   useEffect(() => {
//     Voice.onSpeechStart = (e: SpeechStartEvent) => {
//       log('onSpeechStart', e);
//       setIsRecording(true);
//     };

//     Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//       VoiceTarget.applyText(text); // 🟢 live inject into focused TextInput

//       // 🕐 reset silence timer every time partial results come in
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         log('⏱️ Silence detected, committing...');
//         stopListening('auto-end');
//         commitIfAny('silence');
//       }, 2500);
//     };

//     Voice.onSpeechResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//       VoiceTarget.applyText(text); // 🟢 inject once more on final results
//     };

//     Voice.onSpeechEnd = () => {
//       log('onSpeechEnd (grace period delay)');
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         stopListening('speechEnd');
//         commitIfAny('speechEnd');
//       }, 1000);
//     };

//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);
//     };

//     const handleStop = async () => {
//       await forceStop('VoiceBus.stopListening');
//       VoiceTarget.clear(); // 🟢 ensure no lingering binding on global stop
//     };
//     VoiceBus.on('stopListening', handleStop);

//     return () => {
//       log('🧹 Cleanup voice listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       VoiceBus.off('stopListening', handleStop);
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//     };
//   }, []);

//   // ✉️ Manual text send helper
//   const handleSend = async (onSend?: (text: string) => void) => {
//     log('handleSend()');
//     await stopListening('handleSend');
//     const text = finalRef.current.trim() || speech.trim();
//     if (text) onSend?.(text);
//     setSpeech('');
//     finalRef.current = '';
//   };

//   // 🧠 Voice command wrapper
//   const startVoiceCommand = async (onCommand: (text: string) => void) => {
//     log('[VOICE] startVoiceCommand()');
//     await forceStop('pre-command');
//     await startListening();

//     let lastSpeech = '';
//     let stableCount = 0;
//     let hasCommitted = false;

//     const commitWatcher = setInterval(() => {
//       const current = finalRef.current.trim();

//       if (current === lastSpeech && current.length > 0) {
//         stableCount++;
//       } else {
//         stableCount = 0;
//         lastSpeech = current;
//       }

//       if (stableCount >= 3 && !isRecording && current) {
//         hasCommitted = true;
//         clearInterval(commitWatcher);
//         stopListening('stable-final');
//         setSpeech('');
//         log('[VOICE] ✅ Finalized phrase:', current);
//         onCommand(current);
//       }
//     }, 500);

//     setTimeout(() => {
//       if (!hasCommitted) {
//         clearInterval(commitWatcher);
//         const final = finalRef.current.trim();
//         if (final) {
//           log('[VOICE] ⚠️ Timeout fallback phrase:', final);
//           stopListening('timeout');
//           setSpeech('');
//           onCommand(final);
//         }
//       }
//     }, 3000);
//   };

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//     handleSend,
//     startVoiceCommand,
//   };
// };

/////////////////////

// import {useEffect, useRef, useState} from 'react';
// import Voice, {
//   SpeechErrorEvent,
//   SpeechResultsEvent,
//   SpeechStartEvent,
// } from '@react-native-voice/voice';
// import {PermissionsAndroid, Platform, NativeModules} from 'react-native';
// import Tts from 'react-native-tts';
// import {VoiceBus} from '../utils/VoiceBus';

// const DEBUG = true;
// const log = (...args: any[]) => DEBUG && console.log('[VOICE]', ...args);

// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const finalRef = useRef('');
//   const silenceTimer = useRef<NodeJS.Timeout | null>(null);

//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'StylHelpr needs microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   useEffect(() => {
//     VoiceBus.emit('status', {speech, isRecording});
//   }, [speech, isRecording]);

//   const startListening = async () => {
//     log('🎙️ startListening()');
//     if (!(await requestMic())) {
//       log('❌ Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await new Promise(res => setTimeout(res, 120));
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       await Voice.cancel();
//       finalRef.current = '';
//       setSpeech('');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('✅ Voice listening started');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

//   const stopListening = async (from = '') => {
//     log('🛑 stopListening()', from);
//     try {
//       await Voice.stop();
//     } catch (err) {
//       log('Voice.stop ERROR', err);
//     }
//     setIsRecording(false);
//   };

//   const commitIfAny = (source: string) => {
//     const text = finalRef.current.trim();
//     if (text) {
//       log('💬 commitIfAny', source, '=>', text);
//       setSpeech(text);
//     }
//   };

//   useEffect(() => {
//     Voice.onSpeechStart = (e: SpeechStartEvent) => {
//       log('onSpeechStart', e);
//       setIsRecording(true);
//     };

//     Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);

//       // 🕐 Reset silence timer every time partial results come in
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         log('⏱️ Silence detected, committing...');
//         stopListening('auto-end');
//         commitIfAny('silence');
//       }, 2500); // <-- keeps mic open for 2.5 seconds after your last word
//     };

//     Voice.onSpeechResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//     };

//     Voice.onSpeechEnd = () => {
//       // Don’t immediately stop — wait grace period
//       log('onSpeechEnd (grace period delay)');
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         stopListening('speechEnd');
//         commitIfAny('speechEnd');
//       }, 1000);
//     };

//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);
//     };

//     return () => {
//       log('🧹 Cleanup voice listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//     };
//   }, []);

//   const handleSend = async (onSend?: (text: string) => void) => {
//     log('handleSend()');
//     await stopListening('handleSend');
//     const text = finalRef.current.trim() || speech.trim();
//     if (text) onSend?.(text);
//     setSpeech('');
//     finalRef.current = '';
//   };

//   // ✅ One-shot voice command helper (waits until final phrase is committed)
//   const startVoiceCommand = async (onCommand: (text: string) => void) => {
//     log('[VOICE] startVoiceCommand()');
//     await stopListening('pre-command');
//     await startListening();

//     let lastSpeech = '';
//     let stableCount = 0;
//     let hasCommitted = false;

//     // Watch for the final commit being made
//     const commitWatcher = setInterval(() => {
//       const current = finalRef.current.trim();

//       // Wait until speech text stabilizes (stops changing)
//       if (current === lastSpeech && current.length > 0) {
//         stableCount++;
//       } else {
//         stableCount = 0;
//         lastSpeech = current;
//       }

//       // When stable for ~1.5s AND not recording anymore, treat as final
//       if (stableCount >= 3 && !isRecording && current) {
//         hasCommitted = true;
//         clearInterval(commitWatcher);
//         stopListening('stable-final');
//         setSpeech('');
//         log('[VOICE] ✅ Finalized phrase:', current);
//         onCommand(current);
//       }
//     }, 500);

//     // Failsafe: if 8 seconds pass, stop anyway
//     setTimeout(() => {
//       if (!hasCommitted) {
//         clearInterval(commitWatcher);
//         const final = finalRef.current.trim();
//         if (final) {
//           log('[VOICE] ⚠️ Timeout fallback phrase:', final);
//           stopListening('timeout');
//           setSpeech('');
//           onCommand(final);
//         }
//       }
//     }, 3000);
//   };

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//     handleSend,
//     startVoiceCommand,
//   };
// };

/////////////////////////

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

// const {RCTVoice} = NativeModules as {
//   RCTVoice?: {setupAudioSession?: () => Promise<void> | void};
// };

// export const useVoiceControl = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const finalRef = useRef('');
//   const silenceTimer = useRef<NodeJS.Timeout | null>(null);

//   const requestMic = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Mic Permission',
//           message: 'StylHelpr needs microphone access for voice input.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startListening = async () => {
//     log('🎙️ startListening()');
//     if (!(await requestMic())) {
//       log('❌ Mic permission denied');
//       return;
//     }

//     try {
//       await Tts.stop();
//       await new Promise(res => setTimeout(res, 120));
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }

//       await Voice.cancel();
//       finalRef.current = '';
//       setSpeech('');
//       await Voice.start('en-US');
//       setIsRecording(true);
//       log('✅ Voice listening started');
//     } catch (err) {
//       log('Voice.start ERROR', err);
//       setIsRecording(false);
//     }
//   };

//   const stopListening = async (from = '') => {
//     log('🛑 stopListening()', from);
//     try {
//       await Voice.stop();
//     } catch (err) {
//       log('Voice.stop ERROR', err);
//     }
//     setIsRecording(false);
//   };

//   const commitIfAny = (source: string) => {
//     const text = finalRef.current.trim();
//     if (text) {
//       log('💬 commitIfAny', source, '=>', text);
//       setSpeech(text);
//     }
//   };

//   useEffect(() => {
//     Voice.onSpeechStart = (e: SpeechStartEvent) => {
//       log('onSpeechStart', e);
//       setIsRecording(true);
//     };

//     Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);

//       // 🕐 Reset silence timer every time partial results come in
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         log('⏱️ Silence detected, committing...');
//         stopListening('auto-end');
//         commitIfAny('silence');
//       }, 2500); // <-- keeps mic open for 2.5 seconds after your last word
//     };

//     Voice.onSpeechResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       finalRef.current = text;
//       setSpeech(text);
//     };

//     Voice.onSpeechEnd = () => {
//       // Don’t immediately stop — wait grace period
//       log('onSpeechEnd (grace period delay)');
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//       silenceTimer.current = setTimeout(() => {
//         stopListening('speechEnd');
//         commitIfAny('speechEnd');
//       }, 1000);
//     };

//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);
//     };

//     return () => {
//       log('🧹 Cleanup voice listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (silenceTimer.current) clearTimeout(silenceTimer.current);
//     };
//   }, []);

//   const handleSend = async (onSend?: (text: string) => void) => {
//     log('handleSend()');
//     await stopListening('handleSend');
//     const text = finalRef.current.trim() || speech.trim();
//     if (text) onSend?.(text);
//     setSpeech('');
//     finalRef.current = '';
//   };

//   // ✅ One-shot voice command helper (waits until final phrase is committed)
//   const startVoiceCommand = async (onCommand: (text: string) => void) => {
//     log('[VOICE] startVoiceCommand()');
//     await stopListening('pre-command');
//     await startListening();

//     let lastSpeech = '';
//     let stableCount = 0;
//     let hasCommitted = false;

//     // Watch for the final commit being made
//     const commitWatcher = setInterval(() => {
//       const current = finalRef.current.trim();

//       // Wait until speech text stabilizes (stops changing)
//       if (current === lastSpeech && current.length > 0) {
//         stableCount++;
//       } else {
//         stableCount = 0;
//         lastSpeech = current;
//       }

//       // When stable for ~1.5s AND not recording anymore, treat as final
//       if (stableCount >= 3 && !isRecording && current) {
//         hasCommitted = true;
//         clearInterval(commitWatcher);
//         stopListening('stable-final');
//         setSpeech('');
//         log('[VOICE] ✅ Finalized phrase:', current);
//         onCommand(current);
//       }
//     }, 500);

//     // Failsafe: if 8 seconds pass, stop anyway
//     setTimeout(() => {
//       if (!hasCommitted) {
//         clearInterval(commitWatcher);
//         const final = finalRef.current.trim();
//         if (final) {
//           log('[VOICE] ⚠️ Timeout fallback phrase:', final);
//           stopListening('timeout');
//           setSpeech('');
//           onCommand(final);
//         }
//       }
//     }, 3000);
//   };

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//     handleSend,
//     startVoiceCommand,
//   };
// };

////////////////////////

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
//       await new Promise(res => setTimeout(res, 150));
//       if (Platform.OS === 'ios' && RCTVoice?.setupAudioSession) {
//         try {
//           await RCTVoice.setupAudioSession();
//           log('Audio session armed');
//         } catch (err) {
//           log('setupAudioSession error', err);
//         }
//       }
//       await Voice.cancel();
//       finalRef.current = '';
//       setSpeech('');
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

//   const handleSend = async (onSend?: (text: string) => void) => {
//     log('handleSend()');
//     await stopListening();
//     const text = finalRef.current.trim() || speech.trim();
//     if (text) onSend?.(text);
//     setSpeech('');
//     finalRef.current = '';
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
//       const text = e.value?.[0] || '';
//       log('onSpeechResults', text);
//       finalRef.current = text;
//       setSpeech(text);
//     };
//     Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
//       const text = e.value?.[0] || '';
//       log('onSpeechPartialResults', text);
//       finalRef.current = text;
//       setSpeech(text);
//     };
//     Voice.onSpeechEnd = () => {
//       log('onSpeechEnd');
//       setIsRecording(false);
//     };
//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       setIsRecording(false);
//     };
//     return () => {
//       log('Unmount: removing listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//   }, []);

//   // ✅ One-shot voice command helper (uses finalRef directly)
//   const startVoiceCommand = async (onCommand: (text: string) => void) => {
//     log('[VOICE] startVoiceCommand()');
//     await stopListening();
//     await startListening();

//     const poll = setInterval(() => {
//       const finalText = finalRef.current.trim();
//       if (!isRecording && finalText) {
//         log('[VOICE] Command finalized:', finalText);
//         clearInterval(poll);
//         stopListening();
//         setSpeech('');
//         onCommand(finalText);
//       }
//     }, 400);
//   };

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//     handleSend,
//     startVoiceCommand,
//   };
// };

/////////////////

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
//       // ✅ Always fully reset state here
//       setIsRecording(false);
//       finalRef.current = '';
//       setSpeech('');
//     }
//   };

//   /**
//    * ✅ Call this when user presses "Send" (after using `speech`)
//    * This ensures mic stops and everything resets like iOS.
//    */
//   const handleSend = async (onSend?: (text: string) => void) => {
//     log('handleSend()');
//     // Stop mic first
//     await stopListening();

//     // Fire the callback with current speech (if any)
//     if (speech.trim()) {
//       onSend?.(speech.trim());
//     }

//     // Clean reset
//     setSpeech('');
//     finalRef.current = '';
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

//     // ✅ Auto-stop once speech ends (just like iOS)
//     Voice.onSpeechEnd = () => {
//       log('onSpeechEnd');
//       stopListening();
//     };

//     Voice.onSpeechError = (e: SpeechErrorEvent) => {
//       log('onSpeechError', e);
//       stopListening();
//     };

//     log('Listeners attached');
//     return () => {
//       log('Unmount: removing listeners');
//       Voice.destroy().then(Voice.removeAllListeners);
//       if (commitTimer.current) clearTimeout(commitTimer.current);
//     };
//   }, []);

//   return {
//     speech,
//     isRecording,
//     startListening,
//     stopListening,
//     handleSend, // ✅ use this instead of manually calling stop + send
//   };
// };

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
