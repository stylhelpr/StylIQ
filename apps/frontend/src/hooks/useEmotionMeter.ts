// hooks/useEmotionMeter.ts
import {useEffect, useState} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';

const {EmotionModule} = NativeModules;

export type EmotionWeights = Record<string, number>;

export function useEmotionMeter() {
  const [weights, setWeights] = useState<EmotionWeights>({});

  useEffect(() => {
    const emitter = new NativeEventEmitter(EmotionModule);
    const sub = emitter.addListener(
      'onEmotionUpdate',
      (data: EmotionWeights) => {
        setWeights(data);
      },
    );
    EmotionModule.startEmotionTracking?.();
    return () => {
      EmotionModule.stopEmotionTracking?.();
      sub.remove();
    };
  }, []);

  return weights;
}
