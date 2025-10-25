// src/utils/WakeWordManager.ts
// -----------------------------------------------------------------------------
// 💤 WakeWordManager — resilient (iOS + Android)
// Keeps “Hey Charlie” detection alive indefinitely, even after idle or iOS freeze
// -----------------------------------------------------------------------------

import Voice from '@react-native-voice/voice';
import {Platform} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {VoiceBus} from './VoiceBus';

let passive = false;
let inSession = false;
let wakeTriggered = false;
let rearmTimer: NodeJS.Timeout | null = null;

/**
 * 💤 Start or restart passive “Hey Charlie” listener
 */
export async function startWakeListener(force = false) {
  if ((inSession && !force) || wakeTriggered) return;

  passive = true;
  inSession = true;
  console.log('🎧 Passive wake listener armed');

  try {
    if (Platform.OS === 'android') {
      await Voice.start('en-US', {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 800,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 800,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1000,
      });
      console.log('🎧 Passive listening...');
    } else {
      let attempt = 0;
      let started = false;

      while (attempt < 3 && !started) {
        attempt++;
        try {
          await Voice.start('en-US');
          console.log(`🎧 Passive listening (attempt ${attempt})`);
          started = true;
        } catch (err: any) {
          console.log(
            `⚠️ iOS Voice.start() attempt ${attempt} failed:`,
            err?.message,
          );
          await new Promise(r => setTimeout(r, 400));
        }
      }

      // 🩺 Mic warm-up watchdog: if no speech start, hard-restart
      setTimeout(async () => {
        if (!inSession) {
          console.log(
            '🩺 Mic warm-up failed — forcing full Voice.destroy() & re-arm',
          );
          try {
            await Voice.destroy();
          } catch {}
          inSession = false;
          startWakeListener(true);
        }
      }, 1500);
    }
  } catch (err: any) {
    console.log('⚠️ Wake listener start error:', err?.message);
    inSession = false;
    scheduleRearm(2000);
  }
}

/**
 * 🧠 Trigger assistant and stop passive mode
 */
function triggerWake() {
  if (wakeTriggered) return;
  wakeTriggered = true;
  passive = false;
  console.log('🪄 Wake word confirmed → activating assistant');

  try {
    Voice.stop(); // release mic for active assistant
  } catch {}

  ReactNativeHapticFeedback.trigger('impactMedium', {
    enableVibrateFallback: true,
  });

  VoiceBus.emit('assistant:state', 'listening');
  VoiceBus.emit('assistant:speak', 'Yes?');

  setTimeout(() => VoiceBus.emit('startListening'), 500);
}

/**
 * ✅ Final speech results
 */
Voice.onSpeechResults = e => {
  const transcript = (e.value?.[0] || '').toLowerCase().trim();
  if (!transcript) return;
  console.log('🎧 Heard (final):', transcript);

  if (matchesWakeWord(transcript)) {
    triggerWake();
    return;
  }
  if (!passive) VoiceBus.emit('voiceCommand', transcript);
};

/**
 * 💬 Partial results (fast hotword)
 */
Voice.onSpeechPartialResults = e => {
  const partial = (e.value?.[0] || '').toLowerCase().trim();
  if (!partial) return;

  if (passive && matchesWakeWord(partial)) {
    console.log('🪄 Wake word (partial) detected fast!');
    triggerWake();
  }
};

/**
 * 👂 Track microphone open
 */
Voice.onSpeechStart = e => {
  console.log('[VOICE] onSpeechStart', e);
  inSession = true;
};

/**
 * Helper: detect wake phrase
 */
function matchesWakeWord(text: string) {
  return (
    text === 'hey charlie' ||
    text === 'charlie' ||
    text === 'charlie charlie' ||
    text.startsWith('hey charlie') ||
    text.startsWith('ok charlie') ||
    text.includes('hey charlie') ||
    text.includes('charlie')
  );
}

/**
 * 🔁 Assistant done → re-arm listener
 */
VoiceBus.on('assistant:done', () => {
  console.log('🔁 Assistant done → re-arming passive wake listener');
  wakeTriggered = false;
  scheduleRearm(1000);
});

/**
 * 🔁 iOS auto-end patch — ensures continual listening
 */
Voice.onSpeechEnd = () => {
  console.log('[VOICE] onSpeechEnd → auto-rearm safeguard', {
    passive,
    wakeTriggered,
  });
  inSession = false;
  if (passive && !wakeTriggered) scheduleRearm(800);
};

/**
 * 🚨 Error handler (mic interrupted / recognizer closed)
 */
Voice.onSpeechError = e => {
  console.log('⚠️ Wake listener error:', e.error);
  inSession = false;
  if (passive && !wakeTriggered) scheduleRearm(1200);
};

/**
 * 🩺 Watchdog — ensures hotword stays armed every 15 s
 */
setInterval(() => {
  if (passive && !inSession && !wakeTriggered) {
    console.log('🩺 Watchdog → restarting listener');
    startWakeListener();
  }
}, 15000);

/**
 * Utility: schedule re-arm safely
 */
function scheduleRearm(delay = 1000) {
  clearRearmTimer();
  rearmTimer = setTimeout(() => {
    if (!wakeTriggered) startWakeListener();
  }, delay);
}

/**
 * Utility: clear timer
 */
function clearRearmTimer() {
  if (rearmTimer) clearTimeout(rearmTimer);
  rearmTimer = null;
}
