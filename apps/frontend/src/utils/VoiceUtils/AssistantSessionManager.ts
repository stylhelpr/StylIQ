import {VoiceBus} from './VoiceBus';
import {startWakeListener} from './WakeWordManager';
import Tts from 'react-native-tts';

/**
 * 🧠 AssistantSessionManager
 * Handles lifecycle: idle → listening → thinking → speaking → idle
 * Ensures voice input, TTS, and wake listener stay perfectly in sync.
 */
class AssistantSessionManager {
  private state: 'idle' | 'listening' | 'thinking' | 'speaking' = 'idle';
  private lastCommand: string | null = null;
  private history: string[] = [];
  private isMuted = false;
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  /**
   * 🔌 Subscribe to global VoiceBus events
   */
  private init() {
    VoiceBus.on('startListening', () => this.startListening());
    VoiceBus.on('voiceCommand', (cmd: string) => this.onCommand(cmd));
    VoiceBus.on('assistant:speak', (text: string) => this.speak(text));
    VoiceBus.on('assistant:done', () => this.resetToIdle());
  }

  /**
   * 🎤 Begin a listening session (after wake word or button)
   */
  private startListening() {
    if (this.state !== 'idle') return;
    console.log('🎤 AssistantSessionManager → startListening()');
    this.setState('listening');
    VoiceBus.emit('status', {speech: '', isRecording: true});

    // safety timeout: auto-end listening after 10 seconds
    this.clearTimeout();
    this.timeoutHandle = setTimeout(() => {
      console.log('⏰ Listening timeout → reset');
      this.resetToIdle();
    }, 10000);
  }

  /**
   * 💬 Handle recognized speech command
   */
  private onCommand(cmd: string) {
    if (!cmd.trim()) return;
    console.log('🤖 Assistant received command:', cmd);

    this.lastCommand = cmd;
    this.history.push(cmd);
    this.setState('thinking');
    VoiceBus.emit('status', {speech: cmd, isRecording: false});

    // Route through global router (the same one used for voice nav)
    import('./voiceCommandRouter')

      .then(mod => mod.routeVoiceCommand(cmd, this.fakeNavigate))
      .catch(err => console.log('Routing failed:', err))
      .finally(() => {
        this.setState('speaking');
        VoiceBus.emit('assistant:done');
      });
  }

  /**
   * 🔊 Speak out loud (TTS response)
   */
  private async speak(text: string) {
    if (this.isMuted || !text?.trim()) return;
    console.log('🗣 Speaking:', text);

    this.setState('speaking');
    try {
      // Wrap Tts.stop() separately to handle iOS bridge type errors
      try {
        await Tts.stop();
      } catch {
        // Non-fatal: library sometimes throws bridge type errors
      }
      await Tts.speak(text);
    } catch (err) {
      console.log('TTS error:', err);
    } finally {
      this.resetToIdle();
    }
  }

  /**
   * 💤 Return to idle → re-arm wake listener
   */
  private resetToIdle() {
    console.log('💤 Assistant reset → idle');
    this.setState('idle');
    VoiceBus.emit('status', {speech: '', isRecording: false});
    startWakeListener(); // re-arm passive wake word
  }

  /**
   * 📡 Change state and broadcast to UI
   */
  private setState(newState: 'idle' | 'listening' | 'thinking' | 'speaking') {
    this.state = newState;
    VoiceBus.emit('assistant:stateChange', this.state);
  }

  /**
   * 🔇 Optional mute toggle for TTS
   */
  public toggleMute() {
    this.isMuted = !this.isMuted;
    console.log(`🔇 Assistant mute: ${this.isMuted}`);
  }

  /**
   * 🕒 Clear any pending timeout
   */
  private clearTimeout() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this.timeoutHandle = null;
  }

  /**
   * 🌐 Placeholder navigate function (can be replaced by app router)
   */
  private fakeNavigate = (screen: string, params?: any) => {
    console.log(`🧭 [Assistant Navigate] → ${screen}`, params || '');
    VoiceBus.emit(
      'assistant:speak',
      `Opening ${screen.replace(/([A-Z])/g, ' $1')}`,
    );
  };
}

// Create and export a singleton
export const AssistantSession = new AssistantSessionManager();
