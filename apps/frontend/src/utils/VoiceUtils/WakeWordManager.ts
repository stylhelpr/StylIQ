// src/utils/WakeWordManager.ts
// -----------------------------------------------------------------------------
// 💤 WakeWordManager — resilient (iOS + Android)
// Keeps "Hey Charlie" detection alive indefinitely, even after idle or iOS freeze
// -----------------------------------------------------------------------------
// AUDIO MODE INTEGRATION:
// This module respects AudioMode state and will NOT claim the microphone when:
//   - AudioMode === 'video'    (video playback active)
//   - AudioMode === 'listening' (active voice recognition)
//   - AudioMode === 'speaking'  (TTS output active)
// Use suspend() before video playback and resume() after.
// -----------------------------------------------------------------------------

import Voice from '@react-native-voice/voice';
import {Platform} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {VoiceBus} from './VoiceBus';
import {AudioMode} from './AudioMode';

let passive = false;
let inSession = false;
let wakeTriggered = false;
let rearmTimer: NodeJS.Timeout | null = null;
let suspended = false; // Explicitly suspended by external caller

/**
 * 🛑 Suspend wake word detection immediately
 * Call this before video playback or when another audio mode takes priority.
 * NOTE: We only stop(), not destroy(), to preserve Voice handlers set by useVoiceControl
 */
export async function suspend(): Promise<void> {
  if (suspended) {
    console.log('[WakeWord] Already suspended');
    return;
  }

  console.log('[WakeWord] 🛑 Suspending wake word detection');
  suspended = true;
  passive = false;
  clearRearmTimer();

  try {
    // Only stop the current session, don't destroy
    // Voice.destroy() would remove all listeners including useVoiceControl's
    await Voice.stop();
  } catch (err) {
    console.warn('[WakeWord] Error during suspend cleanup:', err);
  }

  inSession = false;
  console.log('[WakeWord] ✅ Suspended successfully');
}

/**
 * ▶️ Resume wake word detection
 * Only restarts if AudioMode === 'idle'. Otherwise waits for idle state.
 */
export async function resume(): Promise<void> {
  if (!suspended) {
    console.log('[WakeWord] Not suspended, nothing to resume');
    return;
  }

  console.log('[WakeWord] ▶️ Resume requested');
  suspended = false;

  // Only restart if AudioMode is idle
  if (AudioMode.mode !== 'idle') {
    console.log(
      `[WakeWord] Cannot resume yet — AudioMode is '${AudioMode.mode}', waiting for idle`,
    );
    return;
  }

  console.log('[WakeWord] AudioMode is idle → restarting wake listener');
  wakeTriggered = false;
  await startWakeListener(true);
}

/**
 * Check if wake word can start based on current AudioMode
 */
function canStartWakeListener(): boolean {
  const mode = AudioMode.mode;
  if (mode === 'video' || mode === 'listening' || mode === 'speaking') {
    console.log(
      `[WakeWord] ⚠️ Cannot start — AudioMode is '${mode}', mic not available`,
    );
    return false;
  }
  return true;
}

/**
 * 💤 Start or restart passive "Hey Charlie" listener
 */
export async function startWakeListener(force = false) {
  // Respect suspension state
  if (suspended) {
    console.log('[WakeWord] Cannot start — currently suspended');
    return;
  }

  // Respect AudioMode state
  if (!canStartWakeListener()) {
    return;
  }

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

// =============================================================================
// IMPORTANT: Voice event handlers are ONLY for wake word detection.
// When AudioMode !== 'idle', useVoiceControl manages its own handlers.
// We DO NOT set global Voice handlers here to avoid conflicts.
// Instead, useVoiceControl will call WakeWordManager functions when needed.
// =============================================================================

/**
 * Process speech results for wake word detection
 * Called by useVoiceControl when in passive/wake mode
 */
export function processWakeWordResult(transcript: string): boolean {
  const text = transcript.toLowerCase().trim();
  if (!text) return false;

  console.log('🎧 [WakeWord] Checking:', text);

  if (matchesWakeWord(text)) {
    triggerWake();
    return true; // Consumed by wake word
  }
  return false; // Not a wake word, let caller handle it
}

/**
 * Process partial results for fast wake word detection
 */
export function processWakeWordPartial(partial: string): boolean {
  const text = partial.toLowerCase().trim();
  if (!text) return false;

  if (passive && matchesWakeWord(text)) {
    console.log('🪄 Wake word (partial) detected fast!');
    triggerWake();
    return true;
  }
  return false;
}

/**
 * Track speech start for wake word session
 */
export function onWakeSpeechStart(): void {
  if (AudioMode.mode === 'idle' && passive) {
    console.log('[WakeWord] onSpeechStart → session active');
    inSession = true;
  }
}

/**
 * Check if currently in passive wake word mode
 */
export function isPassiveMode(): boolean {
  return passive && !suspended && AudioMode.mode === 'idle';
}

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
 * Respects suspension and AudioMode state
 */
VoiceBus.on('assistant:done', () => {
  console.log('🔁 Assistant done → checking if can re-arm');

  if (suspended) {
    console.log('[WakeWord] Cannot re-arm — currently suspended');
    return;
  }

  if (!canStartWakeListener()) {
    console.log('[WakeWord] Cannot re-arm — AudioMode blocks mic access');
    return;
  }

  console.log('[WakeWord] Re-arming passive wake listener');
  wakeTriggered = false;
  scheduleRearm(1000);
});

/**
 * 🔁 Handle speech end for wake word mode
 * Called by useVoiceControl when AudioMode is idle
 */
export function onWakeSpeechEnd(): void {
  if (AudioMode.mode !== 'idle') {
    return; // Not in wake word mode
  }

  console.log('[WakeWord] onSpeechEnd → auto-rearm safeguard', {
    passive,
    wakeTriggered,
  });
  inSession = false;
  if (passive && !wakeTriggered) scheduleRearm(800);
}

/**
 * 🚨 Handle speech error for wake word mode
 * Called by useVoiceControl when AudioMode is idle
 */
export function onWakeSpeechError(error: any): void {
  if (AudioMode.mode !== 'idle') {
    return; // Not in wake word mode
  }

  console.log('⚠️ [WakeWord] error:', error);
  inSession = false;
  if (passive && !wakeTriggered) scheduleRearm(1200);
}

/**
 * 🩺 Watchdog — ensures hotword stays armed every 15 s
 * Respects suspension and AudioMode state
 */
setInterval(() => {
  if (suspended) return; // Don't restart if suspended
  if (!canStartWakeListener()) return; // Don't restart if AudioMode blocks it

  if (passive && !inSession && !wakeTriggered) {
    console.log('🩺 Watchdog → restarting listener');
    startWakeListener();
  }
}, 15000);

/**
 * Utility: schedule re-arm safely
 * Respects suspension and AudioMode state
 */
function scheduleRearm(delay = 1000) {
  clearRearmTimer();
  rearmTimer = setTimeout(() => {
    if (suspended) return;
    if (!canStartWakeListener()) return;
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

/**
 * Check if wake word detection is currently suspended
 */
export function isSuspended(): boolean {
  return suspended;
}
