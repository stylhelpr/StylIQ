import React, {createContext, useEffect, useState} from 'react';
import {NativeEventEmitter, NativeModules} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const {HandTrackingModule} = NativeModules;
const emitter = new NativeEventEmitter(HandTrackingModule);

type Gesture = 'pinch' | 'open' | null;
type HandPoseContextType = {
  lastGesture: Gesture;
  setPinchAction: (cb: () => void) => void;
  setOpenAction: (cb: () => void) => void;
};

const HandPoseContext = createContext<HandPoseContextType>({
  lastGesture: null,
  setPinchAction: () => {},
  setOpenAction: () => {},
});

export const HandPoseProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [lastGesture, setLastGesture] = useState<Gesture>(null);
  const [pinchAction, setPinchAction] = useState<() => void>(() => {});
  const [openAction, setOpenAction] = useState<() => void>(() => {});

  useEffect(() => {
    HandTrackingModule.startHandTracking?.();

    let lastGesture: string | null = null;
    let lastTime = 0;

    const sub = emitter.addListener('onHandGesture', ({gesture}) => {
      const now = Date.now();
      if (gesture === lastGesture && now - lastTime < 800) return; // 0.8-s debounce
      lastGesture = gesture;
      lastTime = now;

      ReactNativeHapticFeedback.trigger('impactMedium');

      if (gesture === 'pinch') pinchAction();
      if (gesture === 'open') openAction();
    });

    return () => {
      sub.remove();
      HandTrackingModule.stopHandTracking?.();
    };
  }, [pinchAction, openAction]);

  return (
    <HandPoseContext.Provider
      value={{lastGesture, setPinchAction, setOpenAction}}>
      {children}
    </HandPoseContext.Provider>
  );
};

export const useHandPose = () => React.useContext(HandPoseContext);
