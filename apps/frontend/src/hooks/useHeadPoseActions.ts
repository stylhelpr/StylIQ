import {useEffect} from 'react';
import {useHeadPose} from '../context/HeadPoseProvider';

/**
 * Registers global head-gesture actions for the current screen.
 * Keeps them stable for the entire mount duration and cleans up when unmounted.
 */
export const useHeadPoseActions = (
  onLeft?: () => void,
  onRight?: () => void,
) => {
  const {setLeftAction, setRightAction} = useHeadPose();

  useEffect(() => {
    console.log('🎯 registering head actions for this screen');

    if (onLeft) setLeftAction(onLeft);
    if (onRight) setRightAction(onRight);

    return () => {
      console.log('🧹 clearing head actions for this screen');
      setLeftAction(() => {});
      setRightAction(() => {});
    };
  }, [onLeft, onRight]);
};
