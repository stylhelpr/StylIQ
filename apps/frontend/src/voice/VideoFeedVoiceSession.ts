// src/voice/VideoFeedVoiceSession.ts
// -----------------------------------------------------------------------------
// 🎬 VideoFeedVoiceSession — Screen-scoped voice session for VideoFeed
// -----------------------------------------------------------------------------
// This module owns the ENTIRE voice lifecycle when on the VideoFeed screen.
// It does NOT use any global voice infrastructure (useVoiceControl, VoiceBus).
// It does NOT navigate. It does NOT touch wake word.
//
// Architecture:
//   - VideoFeed has its own mic button
//   - Pressing mic starts THIS session, not global voice
//   - Voice results are handled locally within VideoFeed
//   - Video pauses during voice, resumes after
// -----------------------------------------------------------------------------

import Voice from '@react-native-voice/voice';
import {NativeModules, Platform} from 'react-native';
import {AudioMode} from '../utils/VoiceUtils/AudioMode';

// Native audio session manager (iOS only)
const AudioSessionManager = NativeModules.AudioSessionManager as {
  setPlaybackMode?: () => Promise<string>;
  setVoiceMode?: () => Promise<string>;
} | undefined;

export type VideoFeedVoiceCallbacks = {
  onListeningStart: () => void;
  onPartialResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: string) => void;
  onListeningEnd: () => void;
  pauseVideo: () => void;
  resumeVideo: () => void;
};

let isSessionActive = false;
let currentCallbacks: VideoFeedVoiceCallbacks | null = null;

/**
 * Start a voice session scoped to VideoFeed.
 * Returns a stop function to end the session.
 */
export async function startVideoFeedVoiceSession(
  callbacks: VideoFeedVoiceCallbacks,
): Promise<() => Promise<void>> {
  if (isSessionActive) {
    console.log('[VideoFeedVoice] Session already active, ignoring');
    return async () => {};
  }

  console.log('[VideoFeedVoice] 🎤 Starting voice session');
  isSessionActive = true;
  currentCallbacks = callbacks;

  // 1. Pause video immediately
  callbacks.pauseVideo();
  callbacks.onListeningStart();

  // Wait for video player to fully release the audio session
  // The react-native-video player holds onto AVAudioSession
  // and needs time to release it after pausing
  console.log('[VideoFeedVoice] Waiting for video player to release audio...');
  await new Promise(resolve => setTimeout(resolve, 300));

  // 2. Switch iOS audio session to voice mode
  // CRITICAL: Must wait for audio hardware to fully reconfigure
  console.log('[VideoFeedVoice] Checking native module:', {
    platform: Platform.OS,
    hasManager: !!AudioSessionManager,
    hasSetVoiceMode: typeof AudioSessionManager?.setVoiceMode,
  });

  if (Platform.OS === 'ios') {
    if (AudioSessionManager?.setVoiceMode) {
      try {
        console.log('[VideoFeedVoice] Switching iOS audio session to voice mode...');
        await AudioSessionManager.setVoiceMode();
        // Additional delay AFTER native setVoiceMode returns
        // The native method has internal delays (500ms + 100ms + 300ms = 900ms)
        // but we add more time for safety
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[VideoFeedVoice] iOS audio session switched to voice mode');
      } catch (err) {
        console.warn('[VideoFeedVoice] Failed to set voice mode:', err);
        // Don't fail here - try to continue anyway
      }
    } else {
      console.warn('[VideoFeedVoice] AudioSessionManager.setVoiceMode not available!');
    }
  }

  // 3. Set AudioMode to listening (for state tracking only, no global side effects)
  await AudioMode.setMode('listening');

  // 4. NOTE: We do NOT override the global Voice handlers!
  // The global handlers in useVoiceControl already check isVideoFeedVoiceActive()
  // and skip processing when true. We use module-level callbacks instead.
  // This prevents breaking global voice when leaving VideoFeed.

  // 5. Start voice recognition with retry logic
  // iOS audio hardware sometimes needs multiple attempts after category switch
  const maxAttempts = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[VideoFeedVoice] Voice.start() attempt ${attempt}/${maxAttempts}`);
      await Voice.start('en-US');
      console.log('[VideoFeedVoice] ✅ Voice.start() successful');
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[VideoFeedVoice] Voice.start() attempt ${attempt} failed:`, err?.message);
      if (attempt < maxAttempts) {
        // Wait before retrying - give audio hardware more time
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  if (lastError) {
    console.error('[VideoFeedVoice] All Voice.start() attempts failed');
    callbacks.onError(lastError?.message || 'Failed to start voice after retries');
    await stopVideoFeedVoiceSession();
    return async () => {};
  }

  // Return the stop function
  return stopVideoFeedVoiceSession;
}

/**
 * Stop the current voice session and restore video playback.
 */
export async function stopVideoFeedVoiceSession(): Promise<void> {
  if (!isSessionActive) {
    console.log('[VideoFeedVoice] No active session to stop');
    return;
  }

  console.log('[VideoFeedVoice] 🛑 Stopping voice session');

  // 1. Stop voice recognition
  try {
    await Voice.stop();
  } catch (err) {
    console.warn('[VideoFeedVoice] Voice.stop() error:', err);
  }

  // 2. NOTE: We do NOT clear Voice handlers!
  // The global handlers in useVoiceControl are still registered and will resume
  // normal operation once isSessionActive becomes false.
  // This prevents breaking global voice when leaving VideoFeed.

  // 3. Notify listener
  currentCallbacks?.onListeningEnd();

  // 4. Reset AudioMode to video (not idle, since we're still on VideoFeed)
  await AudioMode.setMode('video');

  // 5. Switch iOS audio session back to playback mode
  if (Platform.OS === 'ios' && AudioSessionManager?.setPlaybackMode) {
    try {
      await AudioSessionManager.setPlaybackMode();
      console.log('[VideoFeedVoice] iOS audio session switched to playback mode');
    } catch (err) {
      console.warn('[VideoFeedVoice] Failed to set playback mode:', err);
    }
  }

  // 6. Resume video
  currentCallbacks?.resumeVideo();

  // 7. Cleanup state
  isSessionActive = false;
  currentCallbacks = null;

  console.log('[VideoFeedVoice] ✅ Session ended, video resumed');
}

/**
 * Check if a VideoFeed voice session is currently active
 */
export function isVideoFeedVoiceActive(): boolean {
  return isSessionActive;
}

/**
 * Get the current VideoFeed callbacks for event forwarding from global handlers
 */
export function getVideoFeedCallbacks(): VideoFeedVoiceCallbacks | null {
  return currentCallbacks;
}
