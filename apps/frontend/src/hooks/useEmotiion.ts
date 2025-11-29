// src/hooks/useEmotion.ts
import {useEffect, useState} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';

const {EmotionModule} = NativeModules;

// ✅ define your emotion event payload type
export interface EmotionEvent {
  emotion: string;
  confidence: number;
}

// ✅ define the hook return type
export function useEmotion(): EmotionEvent | null {
  const [emotion, setEmotion] = useState<EmotionEvent | null>(null);

  useEffect(() => {
    const emitter = new NativeEventEmitter(EmotionModule);

    const sub = emitter.addListener('onEmotionUpdate', (data: EmotionEvent) => {
      console.log('EMOTION:', data);
      setEmotion(data);
    });

    try {
      EmotionModule.startEmotionTracking();
    } catch (err) {
      console.warn('Emotion tracking start failed:', err);
    }

    return () => {
      try {
        EmotionModule.stopEmotionTracking();
      } catch (err) {
        console.warn('Emotion tracking stop failed:', err);
      }
      sub.remove();
    };
  }, []);

  return emotion;
}

////////////////

// import {useEffect, useState} from 'react';
// import {NativeModules, NativeEventEmitter} from 'react-native';

// const {EmotionModule} = NativeModules;

// export function useEmotion() {
//   const [emotion, setEmotion] = useState(null);

//   useEffect(() => {
//     const emitter = new NativeEventEmitter(EmotionModule);

//     const sub = emitter.addListener('onEmotionUpdate', data => {
//       console.log('EMOTION:', data);
//       setEmotion(data);
//     });

//     EmotionModule.startEmotionTracking();

//     return () => {
//       EmotionModule.stopEmotionTracking();
//       sub.remove();
//     };
//   }, []);

//   return emotion;
// }
