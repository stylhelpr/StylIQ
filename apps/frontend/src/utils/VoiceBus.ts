import {NativeEventEmitter} from 'react-native';

class SimpleEmitter {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  on(event: string, cb: (...args: any[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: string, cb: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }
}

export const VoiceBus = new SimpleEmitter();
