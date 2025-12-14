// src/context/HeadPoseProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {NativeEventEmitter, NativeModules} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const {HeadPoseModule} = NativeModules;
const emitter = new NativeEventEmitter(HeadPoseModule);

type HeadPoseContextType = {
  lastDirection: 'left' | 'right' | null;
  setLeftAction: (cb: () => void) => void;
  setRightAction: (cb: () => void) => void;
};

const HeadPoseContext = createContext<HeadPoseContextType>({
  lastDirection: null,
  setLeftAction: () => {},
  setRightAction: () => {},
});

export const HeadPoseProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [lastDirection, setLastDirection] = useState<'left' | 'right' | null>(
    null,
  );
  const leftActionRef = useRef<() => void>(() => {});
  const rightActionRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!HeadPoseModule?.startHeadTracking) return;

    HeadPoseModule.startHeadTracking();

    const leftListener = emitter.addListener('onHeadTurnLeft', () => {
      ReactNativeHapticFeedback.trigger('impactMedium');
      leftActionRef.current();
    });

    const rightListener = emitter.addListener('onHeadTurnRight', () => {
      ReactNativeHapticFeedback.trigger('impactMedium');
      rightActionRef.current();
    });

    return () => {
      leftListener.remove();
      rightListener.remove();
      HeadPoseModule.stopHeadTracking();
    };
  }, [leftActionRef, rightActionRef]);

  // stable setters
  const setLeftAction = useCallback((cb: () => void) => {
    leftActionRef.current = cb;
  }, []);
  const setRightAction = useCallback((cb: () => void) => {
    rightActionRef.current = cb;
  }, []);

  return (
    <HeadPoseContext.Provider
      value={{lastDirection, setLeftAction, setRightAction}}>
      {children}
    </HeadPoseContext.Provider>
  );
};

export const useHeadPose = () => useContext(HeadPoseContext);
