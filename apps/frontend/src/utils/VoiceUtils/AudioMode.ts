// src/utils/VoiceUtils/AudioMode.ts
// -----------------------------------------------------------------------------
// 🎵 AudioMode — Single source of truth for iOS audio session ownership
// -----------------------------------------------------------------------------
// Manages exclusive audio modes to prevent conflicts between:
// - Video playback
// - Voice recognition (wake word / active listening)
// - Text-to-speech
//
// MODES:
//   'idle'     - No audio activity, wake word can run
//   'video'    - Video playback active, no mic access
//   'listening'- Microphone active for voice recognition
//   'speaking' - TTS output active
//
// PRECEDENCE RULES:
// | Mode       | Mic | Speaker | Video |
// |------------|-----|---------|-------|
// | idle       | ❌  | ❌      | ❌    |
// | video      | ❌  | ✅      | ▶️    |
// | listening  | ✅  | ❌      | ⏸    |
// | speaking   | ❌  | ✅      | ⏸    |
// -----------------------------------------------------------------------------

import {Platform, NativeModules} from 'react-native';

export type AudioModeType = 'idle' | 'video' | 'listening' | 'speaking';

type AudioModeListener = (mode: AudioModeType, prevMode: AudioModeType) => void;

// Native module reference (iOS only)
const AudioSessionManager = NativeModules.AudioSessionManager as {
  setPlaybackMode?: () => Promise<string>;
  setVoiceMode?: () => Promise<string>;
} | undefined;

class AudioModeManager {
  private _mode: AudioModeType = 'idle';
  private _listeners = new Set<AudioModeListener>();

  /**
   * Get current audio mode
   */
  get mode(): AudioModeType {
    return this._mode;
  }

  /**
   * Subscribe to mode changes
   */
  subscribe(listener: AudioModeListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Check if a transition is valid based on precedence rules
   */
  private canTransition(from: AudioModeType, to: AudioModeType): boolean {
    // Always allow transition to idle
    if (to === 'idle') return true;

    // ALLOW video → listening/speaking: Voice can interrupt video playback
    // The video will pause automatically when audio session switches to voice mode
    // This enables in-place voice activation on video screens without navigation
    if (from === 'video' && (to === 'listening' || to === 'speaking')) {
      console.log(
        `[AudioMode] 🎤 Transitioning from ${from} to ${to} — video will pause`,
      );
      return true;
    }

    // Cannot start video while mic is active
    if ((from === 'listening' || from === 'speaking') && to === 'video') {
      console.warn(
        `[AudioMode] ⚠️ Cannot transition from ${from} to ${to}. Stop voice first.`,
      );
      return false;
    }

    // Cannot start listening while speaking (and vice versa)
    if (
      (from === 'listening' && to === 'speaking') ||
      (from === 'speaking' && to === 'listening')
    ) {
      console.warn(
        `[AudioMode] ⚠️ Cannot transition from ${from} to ${to}. Mutual exclusion.`,
      );
      return false;
    }

    return true;
  }

  /**
   * Request a mode change. Returns true if successful.
   */
  async setMode(newMode: AudioModeType): Promise<boolean> {
    const prevMode = this._mode;

    if (newMode === prevMode) {
      console.log(`[AudioMode] Already in ${newMode} mode`);
      return true;
    }

    if (!this.canTransition(prevMode, newMode)) {
      return false;
    }

    console.log(`[AudioMode] 🔄 ${prevMode} → ${newMode}`);

    // Configure native audio session (iOS only)
    if (Platform.OS === 'ios' && AudioSessionManager) {
      try {
        if (newMode === 'video') {
          await AudioSessionManager.setPlaybackMode?.();
        } else if (newMode === 'listening' || newMode === 'speaking') {
          await AudioSessionManager.setVoiceMode?.();
        }
        // 'idle' doesn't require specific configuration
      } catch (err) {
        console.warn('[AudioMode] Native session config failed:', err);
        // Continue anyway - the mode change is still valid
      }
    }

    this._mode = newMode;

    // Notify all listeners
    this._listeners.forEach(listener => {
      try {
        listener(newMode, prevMode);
      } catch (err) {
        console.warn('[AudioMode] Listener error:', err);
      }
    });

    return true;
  }

  /**
   * Check if microphone can be used in current mode
   * Returns true for idle, listening, or video (video → listening transition allowed)
   */
  canUseMic(): boolean {
    // Allow mic access from video mode - the transition to 'listening' is permitted
    // This enables in-place voice activation on video screens
    return this._mode === 'idle' || this._mode === 'listening' || this._mode === 'video';
  }

  /**
   * Check if speaker output is available in current mode
   */
  canUseSpeaker(): boolean {
    return this._mode === 'video' || this._mode === 'speaking';
  }

  /**
   * Check if video playback is allowed in current mode
   */
  canPlayVideo(): boolean {
    return this._mode === 'video';
  }

  /**
   * Force reset to idle (emergency use only)
   */
  forceIdle(): void {
    console.log('[AudioMode] ⚠️ Force reset to idle');
    const prevMode = this._mode;
    this._mode = 'idle';
    this._listeners.forEach(listener => {
      try {
        listener('idle', prevMode);
      } catch {}
    });
  }
}

// Singleton instance
export const AudioMode = new AudioModeManager();
