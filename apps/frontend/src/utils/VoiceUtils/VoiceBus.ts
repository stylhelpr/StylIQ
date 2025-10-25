// src/utils/VoiceBus.ts
// -----------------------------------------------------------------------------
// 🎙 VoiceBus — Persistent voice state broadcaster
// -----------------------------------------------------------------------------
// • Keeps last recognized speech visible between sessions
// • Prevents overlay reset flashes during navigation
// -----------------------------------------------------------------------------

class SimpleEmitter {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();
  private lastSpeech: string = '';
  private lastIsRecording: boolean = false;

  on(event: string, cb: (...args: any[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);

    // Replay current status to new subscribers (like VoiceOverlay)
    if (event === 'status') {
      cb({speech: this.lastSpeech, isRecording: this.lastIsRecording});
    }
  }

  off(event: string, cb: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(cb => cb(...args));

    // Cache latest status
    if (event === 'status') {
      const {speech, isRecording} = args[0] || {};
      if (typeof isRecording === 'boolean') this.lastIsRecording = isRecording;

      // 🧠 Only overwrite speech if we actually have new text
      if (typeof speech === 'string' && speech.trim().length > 0) {
        this.lastSpeech = speech;
      }
    }
  }

  // ✅ Clear text only when truly restarting
  startListening() {
    this.lastSpeech = '';
    this.lastIsRecording = true;
    this.emit('status', {speech: '', isRecording: true});
  }

  updateSpeech(speech: string) {
    this.lastSpeech = speech;
    this.emit('status', {speech, isRecording: true});
  }

  // 🧠 Stop listening but preserve last speech text for overlay
  stopListening() {
    this.lastIsRecording = false;
    this.emit('status', {speech: this.lastSpeech, isRecording: false});
  }

  reset() {
    this.lastSpeech = '';
    this.lastIsRecording = false;
    this.emit('status', {speech: '', isRecording: false});
  }
}

export const VoiceBus = new SimpleEmitter();

//////////////////

// import {NativeEventEmitter} from 'react-native';

// class SimpleEmitter {
//   private listeners = new Map<string, Set<(...args: any[]) => void>>();

//   on(event: string, cb: (...args: any[]) => void) {
//     if (!this.listeners.has(event)) this.listeners.set(event, new Set());
//     this.listeners.get(event)!.add(cb);
//   }

//   off(event: string, cb: (...args: any[]) => void) {
//     this.listeners.get(event)?.delete(cb);
//   }

//   emit(event: string, ...args: any[]) {
//     this.listeners.get(event)?.forEach(cb => cb(...args));
//   }
// }

// export const VoiceBus = new SimpleEmitter();
