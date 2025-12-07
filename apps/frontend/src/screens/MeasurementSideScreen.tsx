// MeasurementSideScreen.tsx — FINAL VERSION (Audible Pauses + Smooth Transition)
// (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)

import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  NativeModules,
} from 'react-native';
import ARKitView from '../components/features/ARKitView';
import useLiveMeasurement from '../components/features/useLiveMeasurement';
import GhostOverlay from '../components/features/GhostOverlay';
import {useMeasurementStore} from '../../../../store/measurementStore';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Tts from 'react-native-tts';

const {ARKitModule} = NativeModules;

// helper delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

declare global {
  var __sideTaken: boolean | undefined;
}

type Props = {navigate: (screen: string) => void};

export default function MeasurementSideScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const joints = useLiveMeasurement();
  const captureSide = useMeasurementStore(s => s.captureSide);

  const [isStable, setIsStable] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const prevRef = useRef<any>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------
  // TTS Setup
  // -------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        await Tts.getInitStatus();
        await Tts.stop();
        await Tts.setDefaultLanguage('en-US');
        await Tts.setDefaultRate(0.47, false);
        await Tts.setDefaultPitch(1.0);
      } catch (e) {
        console.warn('TTS init failed:', e);
      }
    })();
  }, []);

  // -------------------------------------------------------
  // INTRO SEQUENCE (Sequential TTS with Pauses)
  // -------------------------------------------------------
  useEffect(() => {
    global.__sideTaken = false;
    prevRef.current = null;

    (async () => {
      try {
        await Tts.stop();

        Tts.speak('Side capture ready.', {} as any);
        await sleep(2000);

        Tts.speak(
          'Please rotate sideways by turning slowly to your left and staying in the exact same spot.',
          {} as any,
        );
        await sleep(4000);

        Tts.speak('Do not move forward or backward.', {} as any);
        await sleep(3000);

        Tts.speak(
          'The camera will automatically capture when you hold still.',
          {} as any,
        );
        await sleep(4000);

        setShowInstructions(false);
      } catch (err) {
        console.warn('TTS entry failed:', err);
        setShowInstructions(false);
      }
    })();

    // ✅ Resume same ARKit session to prevent realignment
    setTimeout(() => {
      try {
        ARKitModule.resumeTracking();
      } catch (err) {
        console.warn('ARKit resume failed:', err);
      }
    }, 400);

    // ✅ Clean up properly
    return () => {
      try {
        ARKitModule.pauseTracking();
      } catch (_) {}
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // -------------------------------------------------------
  // STABILITY DETECTION
  // -------------------------------------------------------
  useEffect(() => {
    if (showInstructions) return;

    const keys = Object.keys(joints);
    if (!keys.length) return;

    if (keys.length < 50) {
      setIsStable(false);
      prevRef.current = joints;
      return;
    }

    if (!prevRef.current) {
      prevRef.current = joints;
      return;
    }

    let diff = 0;
    let count = 0;
    keys.forEach(k => {
      const a = prevRef.current[k];
      const b = joints[k];
      if (!a || !b) return;
      diff +=
        Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      count++;
    });
    prevRef.current = joints;

    const avgDiff = count > 0 ? diff / count : 999;
    const threshold = 0.04;
    const nowStable = avgDiff < threshold;

    clearTimeout((isStable as any)?._timer);
    if (nowStable && !isStable) {
      const t = setTimeout(() => setIsStable(true), 1000);
      (isStable as any)._timer = t;
    } else if (!nowStable && isStable) {
      const t = setTimeout(() => setIsStable(false), 1000);
      (isStable as any)._timer = t;
    }
  }, [joints, showInstructions]);

  // -------------------------------------------------------
  // COUNTDOWN + AUTO CAPTURE
  // -------------------------------------------------------
  useEffect(() => {
    if (showInstructions) return;

    if (isStable && countdown === null && !global.__sideTaken) {
      let timeLeft = 3;
      setCountdown(timeLeft);
      ReactNativeHapticFeedback.trigger('impactMedium');
      Tts.speak('Hold still. Three');

      countdownRef.current = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft > 0) {
          setCountdown(timeLeft);
          ReactNativeHapticFeedback.trigger('impactMedium');
          if (timeLeft === 2) Tts.speak('Two');
          if (timeLeft === 1) Tts.speak('One');
        } else {
          clearInterval(countdownRef.current!);
          setCountdown(0);
          captureShot();
        }
      }, 1000);
    }

    if (!isStable && countdown !== null) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isStable, showInstructions]);

  // -------------------------------------------------------
  // CAPTURE SIDE POSE
  // -------------------------------------------------------
  const captureShot = () => {
    if (global.__sideTaken) return;
    global.__sideTaken = true;

    ReactNativeHapticFeedback.trigger('impactMedium');
    Tts.speak('Capturing now.');
    showFlash();

    captureSide(joints);

    try {
      ARKitModule.pauseTracking();
    } catch (_) {}

    setTimeout(async () => {
      try {
        await Tts.stop();

        // 🕓 Big pause BEFORE "All captures complete"
        await sleep(2500); // ⬅️ 3.5-second pause after flash before speaking

        Tts.speak('All captures complete.', {} as any);
        await sleep(1000);

        Tts.speak('Thank you.', {} as any);
        await sleep(1000);

        Tts.speak('You can review your results now.', {} as any);
      } catch (err) {
        console.warn('TTS completion failed:', err);
      }

      setTimeout(() => {
        navigate('MeasurementResultsManualScreen');
      }, 1500);
    }, 800);
  };

  // -------------------------------------------------------
  // FLASH EFFECT
  // -------------------------------------------------------
  const showFlash = () => {
    setFlashVisible(true);
    flashAnim.setValue(0);

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start(() => setFlashVisible(false));
  };

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------
  const styles = StyleSheet.create({
    container: {flex: 1},
    statusBox: {
      position: 'absolute',
      bottom: 120,
      width: '100%',
      alignItems: 'center',
    },
    readyTopText: {
      position: 'absolute',
      top: 120,
      zIndex: 9999,
      alignSelf: 'center',
      color: theme.colors.foreground,
      fontSize: 36,
      fontWeight: '700',
      textAlign: 'center',
    },
    holdText: {
      color: theme.colors.foreground,
      fontSize: 28,
      fontWeight: '600',
      textAlign: 'center',
    },
    countdownText: {
      position: 'absolute',
      top: '40%',
      alignSelf: 'center',
      color: theme.colors.foreground,
      fontSize: Math.min(
        200,
        Math.round(0.25 * Dimensions.get('window').height),
      ),
      fontWeight: '900',
      textAlign: 'center',
    },
    flashOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'white',
      opacity: flashAnim,
      zIndex: 9999,
    },
  });

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ARKitView style={StyleSheet.absoluteFill} />

      <GhostOverlay mode="side" isStable={isStable} />

      <Text style={styles.readyTopText}>Ready for side photo</Text>

      {countdown !== null && countdown > 0 && (
        <Text style={styles.countdownText}>{countdown}</Text>
      )}

      {flashVisible && <Animated.View style={styles.flashOverlay} />}

      <View style={styles.statusBox}>
        {!isStable && countdown === null ? (
          <Text style={styles.holdText}>Hold Still…</Text>
        ) : countdown === 0 ? (
          <Text style={styles.holdText}>Capturing…</Text>
        ) : countdown !== null ? (
          <Text style={styles.holdText}>Hold that pose</Text>
        ) : (
          <Text style={styles.holdText}>Align yourself…</Text>
        )}
      </View>
    </View>
  );
}

//////////////////

// // MeasurementSideScreen.tsx — FINAL FIX (No Camera Shift)
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)
// // Keeps ARKit session continuous — no reset, no shift.

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {navigate: (screen: string) => void};

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);
//   const flashAnim = useRef(new Animated.Value(0)).current;

//   // -------------------------------------------------------
//   // TTS Setup (cross-platform safe)
//   // -------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.stop();
//         await Tts.setDefaultLanguage('en-US');
//         await Tts.setDefaultRate(0.48, false);
//         await Tts.setDefaultPitch(1.0);
//       } catch (e) {
//         console.warn('TTS init failed:', e);
//       }
//     })();
//   }, []);

//   // -------------------------------------------------------
//   // INIT / CLEANUP + Entry Voice
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     // 👂 Verbal cue when entering side capture
//     (async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'Side capture ready. Please rotate sideways by turning slowly and carefully to your left. Do not move forwards or backwards.',
//         );
//       } catch (err) {
//         console.warn('TTS entry failed:', err);
//       }
//     })();

//     // ✅ Resume instead of starting a new session
//     setTimeout(() => {
//       try {
//         ARKitModule.resumeTracking(); // keeps same world alignment
//       } catch (err) {
//         console.warn('ARKit resume failed:', err);
//       }
//     }, 400);

//     // ✅ Pause, don’t stop, when leaving
//     return () => {
//       try {
//         ARKitModule.pauseTracking(); // prevents world reset
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return;

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });
//     prevRef.current = joints;

//     const avgDiff = count > 0 ? diff / count : 999;
//     const threshold = 0.04;
//     const nowStable = avgDiff < threshold;

//     clearTimeout((isStable as any)?._timer);
//     if (nowStable && !isStable) {
//       const t = setTimeout(() => setIsStable(true), 1000);
//       (isStable as any)._timer = t;
//     } else if (!nowStable && isStable) {
//       const t = setTimeout(() => setIsStable(false), 1000);
//       (isStable as any)._timer = t;
//     }
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       Tts.speak('Hold still. Three');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           if (timeLeft === 2) Tts.speak('Two');
//           if (timeLeft === 1) Tts.speak('One');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureSide(joints);

//     try {
//       ARKitModule.pauseTracking(); // pause, don’t stop, keeps camera centered
//     } catch (_) {}

//     setTimeout(async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'All captures complete. Thank you. You can review your results now',
//         );
//       } catch (err) {
//         console.warn('TTS completion failed:', err);
//       }

//       setTimeout(() => {
//         navigate('MeasurementResultsManualScreen');
//       }, 800);
//     }, 700);
//   };

//   // -------------------------------------------------------
//   // FLASH ANIMATION
//   // -------------------------------------------------------
//   const showFlash = () => {
//     setFlashVisible(true);
//     flashAnim.setValue(0);

//     Animated.sequence([
//       // 💥 Peak brightness
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80, // very quick rise
//         useNativeDriver: true,
//       }),
//       // ⚡ small linger at full white
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       // 🌤️ smooth fade out tail
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 400,
//         useNativeDriver: true,
//       }),
//     ]).start(() => setFlashVisible(false));
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: Math.min(
//         200,
//         Math.round(0.25 * Dimensions.get('window').height),
//       ),
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       {flashVisible && <Animated.View style={styles.flashOverlay} />}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

///////////////////

// // MeasurementSideScreen.tsx — FINAL FIX (No Camera Shift)
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)
// // Keeps ARKit session continuous — no reset, no shift.

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {navigate: (screen: string) => void};

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);
//   const flashAnim = useRef(new Animated.Value(0)).current;

//   // -------------------------------------------------------
//   // TTS Setup (cross-platform safe)
//   // -------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.stop();
//         await Tts.setDefaultLanguage('en-US');
//         await Tts.setDefaultRate(0.48, false);
//         await Tts.setDefaultPitch(1.0);
//       } catch (e) {
//         console.warn('TTS init failed:', e);
//       }
//     })();
//   }, []);

//   // -------------------------------------------------------
//   // INIT / CLEANUP + Entry Voice
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     // 👂 Verbal cue when entering side capture
//     (async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'Side capture ready. Please face sideways by turning to your left and hold still.',
//         );
//       } catch (err) {
//         console.warn('TTS entry failed:', err);
//       }
//     })();

//     // ✅ Resume instead of starting a new session
//     setTimeout(() => {
//       try {
//         ARKitModule.resumeTracking(); // keeps same world alignment
//       } catch (err) {
//         console.warn('ARKit resume failed:', err);
//       }
//     }, 400);

//     // ✅ Pause, don’t stop, when leaving
//     return () => {
//       try {
//         ARKitModule.pauseTracking(); // prevents world reset
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return;

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });
//     prevRef.current = joints;

//     const avgDiff = count > 0 ? diff / count : 999;
//     const threshold = 0.04;
//     const nowStable = avgDiff < threshold;

//     clearTimeout((isStable as any)?._timer);
//     if (nowStable && !isStable) {
//       const t = setTimeout(() => setIsStable(true), 1000);
//       (isStable as any)._timer = t;
//     } else if (!nowStable && isStable) {
//       const t = setTimeout(() => setIsStable(false), 1000);
//       (isStable as any)._timer = t;
//     }
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       Tts.speak('Hold still. Three');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           if (timeLeft === 2) Tts.speak('Two');
//           if (timeLeft === 1) Tts.speak('One');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureSide(joints);

//     try {
//       ARKitModule.pauseTracking(); // pause, don’t stop, keeps camera centered
//     } catch (_) {}

//     setTimeout(async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'All captures complete. Thank you. You can review your results now',
//         );
//       } catch (err) {
//         console.warn('TTS completion failed:', err);
//       }

//       setTimeout(() => {
//         navigate('MeasurementResultsManualScreen');
//       }, 800);
//     }, 700);
//   };

//   // -------------------------------------------------------
//   // FLASH ANIMATION
//   // -------------------------------------------------------
//   const showFlash = () => {
//     setFlashVisible(true);
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 120,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 300,
//         delay: 100,
//         useNativeDriver: true,
//       }),
//     ]).start(() => setFlashVisible(false));
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: Math.min(
//         200,
//         Math.round(0.25 * Dimensions.get('window').height),
//       ),
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       {flashVisible && <Animated.View style={styles.flashOverlay} />}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

///////////////

// // MeasurementSideScreen.tsx — FINAL FIXED VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {navigate: (screen: string) => void};

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);
//   const flashAnim = useRef(new Animated.Value(0)).current;

//   // -------------------------------------------------------
//   // TTS Setup (cross-platform safe)
//   // -------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.stop();
//         await Tts.setDefaultLanguage('en-US');
//         // ✅ Do NOT pass a BOOL; iOS expects a float, Android allows both
//         // ✅ Use string-based rate values to bypass bridge type conversion
//         await Tts.setDefaultRate(0.48, false);
//         await Tts.setDefaultPitch(1.0);
//       } catch (e) {
//         console.warn('TTS init failed:', e);
//       }
//     })();
//   }, []);

//   // -------------------------------------------------------
//   // INIT / CLEANUP
//   // -------------------------------------------------------
//   // -------------------------------------------------------
//   // INIT / CLEANUP + Entry Voice
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     // 👂 Verbal cue when entering side capture
//     (async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'Side capture ready. Please face sideways and hold still.',
//         );
//       } catch (err) {
//         console.warn('TTS entry failed:', err);
//       }
//     })();

//     // start AR tracking slightly delayed
//     setTimeout(() => {
//       try {
//         ARKitModule.startTracking();
//       } catch (err) {
//         console.warn('ARKit start failed:', err);
//       }
//     }, 400);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION
//   // -------------------------------------------------------
//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return;

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });
//     prevRef.current = joints;

//     const avgDiff = count > 0 ? diff / count : 999;
//     const threshold = 0.04;
//     const nowStable = avgDiff < threshold;

//     // Debounce transitions to prevent flicker
//     clearTimeout((isStable as any)?._timer);
//     if (nowStable && !isStable) {
//       const t = setTimeout(() => setIsStable(true), 1000); // must be stable 1s
//       (isStable as any)._timer = t;
//     } else if (!nowStable && isStable) {
//       const t = setTimeout(() => setIsStable(false), 1000); // must be unstable 1s
//       (isStable as any)._timer = t;
//     }
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE (with voice)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       Tts.speak('Hold still. Three');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           if (timeLeft === 2) Tts.speak('Two');
//           if (timeLeft === 1) Tts.speak('One');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     // ✅ New verbal message after capture complete
//     setTimeout(async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'All captures complete. Thank you. You can review your results now',
//         );
//       } catch (err) {
//         console.warn('TTS completion failed:', err);
//       }

//       // small pause before moving to results
//       setTimeout(() => {
//         navigate('MeasurementResultsManualScreen');
//       }, 800);
//     }, 700);
//   };

//   // -------------------------------------------------------
//   // FLASH ANIMATION
//   // -------------------------------------------------------
//   const showFlash = () => {
//     setFlashVisible(true);
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 120,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 300,
//         delay: 100,
//         useNativeDriver: true,
//       }),
//     ]).start(() => setFlashVisible(false));
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: Math.min(
//         200,
//         Math.round(0.25 * Dimensions.get('window').height),
//       ),
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {/* ---- COUNTDOWN ---- */}
//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       {/* ---- FLASH EFFECT ---- */}
//       {flashVisible && <Animated.View style={styles.flashOverlay} />}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

///////////////////

// // MeasurementSideScreen.tsx — FINAL FIXED VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {navigate: (screen: string) => void};

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);
//   const flashAnim = useRef(new Animated.Value(0)).current;

//   // -------------------------------------------------------
//   // TTS Setup (cross-platform safe)
//   // -------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.stop();
//         await Tts.setDefaultLanguage('en-US');
//         // ✅ Do NOT pass a BOOL; iOS expects a float, Android allows both
//         // ✅ Use string-based rate values to bypass bridge type conversion
//         await Tts.setDefaultRate(0.48, false);
//         await Tts.setDefaultPitch(1.0);
//       } catch (e) {
//         console.warn('TTS init failed:', e);
//       }
//     })();
//   }, []);

//   // -------------------------------------------------------
//   // INIT / CLEANUP
//   // -------------------------------------------------------
//   // -------------------------------------------------------
//   // INIT / CLEANUP + Entry Voice
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     // 👂 Verbal cue when entering side capture
//     (async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'Side capture ready. Please face sideways and hold still.',
//         );
//       } catch (err) {
//         console.warn('TTS entry failed:', err);
//       }
//     })();

//     // start AR tracking slightly delayed
//     setTimeout(() => {
//       try {
//         ARKitModule.startTracking();
//       } catch (err) {
//         console.warn('ARKit start failed:', err);
//       }
//     }, 400);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION
//   // -------------------------------------------------------
//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return;

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });
//     prevRef.current = joints;

//     const avgDiff = count > 0 ? diff / count : 999;
//     const threshold = 0.04;
//     const nowStable = avgDiff < threshold;

//     // Debounce transitions to prevent flicker
//     clearTimeout((isStable as any)?._timer);
//     if (nowStable && !isStable) {
//       const t = setTimeout(() => setIsStable(true), 1000); // must be stable 1s
//       (isStable as any)._timer = t;
//     } else if (!nowStable && isStable) {
//       const t = setTimeout(() => setIsStable(false), 1000); // must be unstable 1s
//       (isStable as any)._timer = t;
//     }
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE (with voice)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       Tts.speak('Hold still. Three');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           if (timeLeft === 2) Tts.speak('Two');
//           if (timeLeft === 1) Tts.speak('One');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     // ✅ New verbal message after capture complete
//     setTimeout(async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'All captures complete. Thank you. You can review your results now',
//         );
//       } catch (err) {
//         console.warn('TTS completion failed:', err);
//       }

//       // small pause before moving to results
//       setTimeout(() => {
//         navigate('MeasurementResultsManualScreen');
//       }, 800);
//     }, 700);
//   };

//   // -------------------------------------------------------
//   // FLASH ANIMATION
//   // -------------------------------------------------------
//   const showFlash = () => {
//     setFlashVisible(true);
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 120,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 300,
//         delay: 100,
//         useNativeDriver: true,
//       }),
//     ]).start(() => setFlashVisible(false));
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: Math.min(
//         200,
//         Math.round(0.25 * Dimensions.get('window').height),
//       ),
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {/* ---- COUNTDOWN ---- */}
//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       {/* ---- FLASH EFFECT ---- */}
//       {flashVisible && <Animated.View style={styles.flashOverlay} />}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////

// // MeasurementSideScreen.tsx — FINAL FIXED VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {navigate: (screen: string) => void};

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);
//   const flashAnim = useRef(new Animated.Value(0)).current;

//   // -------------------------------------------------------
//   // TTS Setup (cross-platform safe)
//   // -------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.stop();
//         await Tts.setDefaultLanguage('en-US');
//         // ✅ Do NOT pass a BOOL; iOS expects a float, Android allows both
//         // ✅ Use string-based rate values to bypass bridge type conversion
//         await Tts.setDefaultRate(0.48, false);
//         await Tts.setDefaultPitch(1.0);
//       } catch (e) {
//         console.warn('TTS init failed:', e);
//       }
//     })();
//   }, []);

//   // -------------------------------------------------------
//   // INIT / CLEANUP
//   // -------------------------------------------------------
//   // -------------------------------------------------------
//   // INIT / CLEANUP + Entry Voice
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     // 👂 Verbal cue when entering side capture
//     (async () => {
//       try {
//         await Tts.stop();
//         await Tts.speak(
//           'Side capture ready. Please face sideways and hold still.',
//         );
//       } catch (err) {
//         console.warn('TTS entry failed:', err);
//       }
//     })();

//     // start AR tracking slightly delayed
//     setTimeout(() => {
//       try {
//         ARKitModule.startTracking();
//       } catch (err) {
//         console.warn('ARKit start failed:', err);
//       }
//     }, 400);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION
//   // -------------------------------------------------------
//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return;

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });
//     prevRef.current = joints;

//     const avgDiff = count > 0 ? diff / count : 999;
//     const threshold = 0.04;
//     const nowStable = avgDiff < threshold;

//     // Debounce transitions to prevent flicker
//     clearTimeout((isStable as any)?._timer);
//     if (nowStable && !isStable) {
//       const t = setTimeout(() => setIsStable(true), 1000); // must be stable 1s
//       (isStable as any)._timer = t;
//     } else if (!nowStable && isStable) {
//       const t = setTimeout(() => setIsStable(false), 1000); // must be unstable 1s
//       (isStable as any)._timer = t;
//     }
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE (with voice)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       Tts.speak('Hold still. Three');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           if (timeLeft === 2) Tts.speak('Two');
//           if (timeLeft === 1) Tts.speak('One');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementResultsManualScreen');
//     }, 700);
//   };

//   // -------------------------------------------------------
//   // FLASH ANIMATION
//   // -------------------------------------------------------
//   const showFlash = () => {
//     setFlashVisible(true);
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 120,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 300,
//         delay: 100,
//         useNativeDriver: true,
//       }),
//     ]).start(() => setFlashVisible(false));
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: Math.min(
//         200,
//         Math.round(0.25 * Dimensions.get('window').height),
//       ),
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {/* ---- COUNTDOWN ---- */}
//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       {/* ---- FLASH EFFECT ---- */}
//       {flashVisible && <Animated.View style={styles.flashOverlay} />}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

/////////////////////

// // MeasurementSideScreen.tsx — FINAL FIXED VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {navigate: (screen: string) => void};

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);
//   const flashAnim = useRef(new Animated.Value(0)).current;

//   // -------------------------------------------------------
//   // TTS Setup (cross-platform safe)
//   // -------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.stop();
//         await Tts.setDefaultLanguage('en-US');
//         // ✅ Do NOT pass a BOOL; iOS expects a float, Android allows both
//         // ✅ Use string-based rate values to bypass bridge type conversion
//         await Tts.setDefaultRate(0.48, false);
//         await Tts.setDefaultPitch(1.0);
//       } catch (e) {
//         console.warn('TTS init failed:', e);
//       }
//     })();
//   }, []);

//   // -------------------------------------------------------
//   // INIT / CLEANUP
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION
//   // -------------------------------------------------------
//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return;

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });
//     prevRef.current = joints;

//     const avgDiff = count > 0 ? diff / count : 999;
//     const threshold = 0.04;
//     const nowStable = avgDiff < threshold;

//     // Debounce transitions to prevent flicker
//     clearTimeout((isStable as any)?._timer);
//     if (nowStable && !isStable) {
//       const t = setTimeout(() => setIsStable(true), 1000); // must be stable 1s
//       (isStable as any)._timer = t;
//     } else if (!nowStable && isStable) {
//       const t = setTimeout(() => setIsStable(false), 1000); // must be unstable 1s
//       (isStable as any)._timer = t;
//     }
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE (with voice)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       Tts.speak('Hold still. Three');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           if (timeLeft === 2) Tts.speak('Two');
//           if (timeLeft === 1) Tts.speak('One');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementResultsManualScreen');
//     }, 700);
//   };

//   // -------------------------------------------------------
//   // FLASH ANIMATION
//   // -------------------------------------------------------
//   const showFlash = () => {
//     setFlashVisible(true);
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 120,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 300,
//         delay: 100,
//         useNativeDriver: true,
//       }),
//     ]).start(() => setFlashVisible(false));
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: Math.min(
//         200,
//         Math.round(0.25 * Dimensions.get('window').height),
//       ),
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {/* ---- COUNTDOWN ---- */}
//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       {/* ---- FLASH EFFECT ---- */}
//       {flashVisible && <Animated.View style={styles.flashOverlay} />}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

///////////////////

// // MeasurementSideScreen.tsx — FINAL FIXED VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Stable Pose)

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {navigate: (screen: string) => void};

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);
//   const flashAnim = useRef(new Animated.Value(0)).current;

//   // -------------------------------------------------------
//   // TTS Setup (cross-platform safe)
//   // -------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.stop();
//         await Tts.setDefaultLanguage('en-US');
//         // ✅ Do NOT pass a BOOL; iOS expects a float, Android allows both
//         // ✅ Use string-based rate values to bypass bridge type conversion
//         await Tts.setDefaultRate(0.48, false);
//         await Tts.setDefaultPitch(1.0);
//       } catch (e) {
//         console.warn('TTS init failed:', e);
//       }
//     })();
//   }, []);

//   // -------------------------------------------------------
//   // INIT / CLEANUP
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return setIsStable(false);

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });

//     setIsStable(count > 0 && diff / count < 0.04);
//     prevRef.current = joints;
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE (with voice)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       Tts.speak('Hold still. Three');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           if (timeLeft === 2) Tts.speak('Two');
//           if (timeLeft === 1) Tts.speak('One');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementResultsManualScreen');
//     }, 700);
//   };

//   // -------------------------------------------------------
//   // FLASH ANIMATION
//   // -------------------------------------------------------
//   const showFlash = () => {
//     setFlashVisible(true);
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 120,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 300,
//         delay: 100,
//         useNativeDriver: true,
//       }),
//     ]).start(() => setFlashVisible(false));
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: Math.min(
//         200,
//         Math.round(0.25 * Dimensions.get('window').height),
//       ),
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {/* ---- COUNTDOWN ---- */}
//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       {/* ---- FLASH EFFECT ---- */}
//       {flashVisible && <Animated.View style={styles.flashOverlay} />}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

/////////////////////

// // MeasurementSideScreen.tsx — FINAL FIXED VERSION (Hands-Free Auto Capture + 3s Countdown + Stable Pose)
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, NativeModules} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const prevRef = useRef<any>(null);
//   const countdownRef = useRef<NodeJS.Timeout | null>(null);

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 36,
//       fontWeight: '700',
//       textAlign: 'center',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 28,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     countdownText: {
//       position: 'absolute',
//       top: '40%',
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 160,
//       fontWeight: '900',
//       textAlign: 'center',
//     },
//   });

//   // -------------------------------------------------------
//   // INIT / CLEANUP
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return setIsStable(false);

//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });

//     setIsStable(count > 0 && diff / count < 0.04);
//     prevRef.current = joints;
//   }, [joints]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__sideTaken) {
//       // Start 3-second countdown after pose lock
//       let timeLeft = 3;
//       setCountdown(timeLeft);
//       ReactNativeHapticFeedback.trigger('impactMedium');

//       countdownRef.current = setInterval(() => {
//         timeLeft -= 1;
//         if (timeLeft > 0) {
//           setCountdown(timeLeft);
//           ReactNativeHapticFeedback.trigger('impactMedium');
//         } else {
//           clearInterval(countdownRef.current!);
//           setCountdown(0);
//           captureShot();
//         }
//       }, 1000);
//     }

//     if (!isStable && countdown !== null) {
//       // Reset countdown if user moves
//       if (countdownRef.current) clearInterval(countdownRef.current);
//       setCountdown(null);
//     }

//     return () => {
//       if (countdownRef.current) clearInterval(countdownRef.current);
//     };
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementResultsManualScreen');
//     }, 500);
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       {countdown !== null && countdown > 0 && (
//         <Text style={styles.countdownText}>{countdown}</Text>
//       )}

//       <View style={styles.statusBox}>
//         {!isStable && countdown === null ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : countdown === 0 ? (
//           <Text style={styles.holdText}>Capturing…</Text>
//         ) : countdown !== null ? (
//           <Text style={styles.holdText}>Hold that pose</Text>
//         ) : (
//           <Text style={styles.holdText}>Align yourself…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////

// // MeasurementSideScreen.tsx — FINAL FIXED VERSION (Hands-Free Auto Capture + Stable Pose + Safe Timer)
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, NativeModules} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef<any>(null);

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 32,
//       fontWeight: '600',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 26,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//   });

//   // -------------------------------------------------------
//   // INIT / CLEANUP
//   // -------------------------------------------------------
//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//     };
//   }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION (detects when user is still enough)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return setIsStable(false);

//     // ✅ Pose confidence guard
//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0;
//     let count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k];
//       const b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });

//     setIsStable(count > 0 && diff / count < 0.04);
//     prevRef.current = joints;
//   }, [joints]);

//   // -------------------------------------------------------
//   // AUTO CAPTURE LOGIC (hands-free trigger after 2s stable)
//   // -------------------------------------------------------
//   useEffect(() => {
//     let elapsed = 0;
//     const timer = setInterval(() => {
//       if (isStable) {
//         elapsed += 0.2;
//         if (elapsed >= 2 && !global.__sideTaken) {
//           clearInterval(timer);
//           captureShot();
//         }
//       } else {
//         elapsed = 0;
//       }
//     }, 200);

//     return () => clearInterval(timer);
//   }, [isStable]);

//   // -------------------------------------------------------
//   // CAPTURE SIDE POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementResultsManualScreen');
//     }, 500);
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       <View style={styles.statusBox}>
//         {!isStable ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : (
//           <Text style={styles.holdText}>Capturing Automatically…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef(null);

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     statusBox: {
//       position: 'absolute',
//       bottom: 120,
//       width: '100%',
//       alignItems: 'center',
//     },
//     readyTopText: {
//       position: 'absolute',
//       top: 120,
//       zIndex: 9999,
//       alignSelf: 'center',
//       color: theme.colors.foreground,
//       fontSize: 32,
//       fontWeight: '600',
//     },
//     holdText: {
//       color: theme.colors.foreground,
//       fontSize: 26,
//       fontWeight: '600',
//     },
//     captureButton: {
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 36,
//       paddingVertical: 14,
//       borderRadius: 30,
//     },
//     captureText: {
//       color: theme.colors.foreground,
//       fontSize: 20,
//       fontWeight: '600',
//     },
//   });

//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//     };
//   }, []);

//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return setIsStable(false);

//     // ✅ NEW: pose confidence guard
//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0,
//       count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k],
//         b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });

//     setIsStable(count && diff / count < 0.04);
//     prevRef.current = joints;
//   }, [joints]);

//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementResultsManualScreen');
//     }, 500);
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay mode="side" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for side photo</Text>

//       <View style={styles.statusBox}>
//         {!isStable ? (
//           <Text style={styles.holdText}>Hold Still…</Text>
//         ) : (
//           <TouchableOpacity onPress={captureShot} style={styles.captureButton}>
//             <Text style={styles.captureText}>Take Photo</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef(null);

//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//     };
//   }, []);

//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return setIsStable(false);

//     // ✅ NEW: pose confidence guard
//     if (keys.length < 50) {
//       setIsStable(false);
//       prevRef.current = joints;
//       return;
//     }

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0,
//       count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k],
//         b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });

//     setIsStable(count && diff / count < 0.04);
//     prevRef.current = joints;
//   }, [joints]);

//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeshPreviewScreen');
//     }, 500);
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay mode="side" isStable={isStable} />

//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>SIDE SCREEN</Text>
//       </View>

//       {/* ---- STABILITY / CAPTURE UI ---- */}
//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
//         </View>
//       )}

//       {isStable && (
//         <View style={styles.captureBox}>
//           <TouchableOpacity onPress={captureShot} style={styles.captureButton}>
//             <Text style={styles.captureText}>Take Photo</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66CCFF',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   holdBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   holdText: {color: '#fff', fontSize: 26, fontWeight: '600'},
//   captureBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   captureButton: {
//     backgroundColor: '#fff',
//     paddingHorizontal: 36,
//     paddingVertical: 14,
//     borderRadius: 30,
//   },
//   captureText: {color: '#000', fontSize: 20, fontWeight: '600'},
// });

////////////////////

// // MeasurementSideScreen.tsx — FINAL SINGLE-CAPTURE VERSION + DEBUG BANNER

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __sideTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementSideScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef(null);

//   useEffect(() => {
//     global.__sideTaken = false;
//     prevRef.current = null;

//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//     };
//   }, []);

//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return setIsStable(false);

//     if (!prevRef.current) {
//       prevRef.current = joints;
//       return;
//     }

//     let diff = 0,
//       count = 0;
//     keys.forEach(k => {
//       const a = prevRef.current[k],
//         b = joints[k];
//       if (!a || !b) return;
//       diff +=
//         Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
//       count++;
//     });

//     setIsStable(count && diff / count < 0.04);
//     prevRef.current = joints;
//   }, [joints]);

//   const captureShot = () => {
//     if (global.__sideTaken) return;
//     global.__sideTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureSide(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementResultsManualScreen');
//     }, 500);
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay joints={joints} />

//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>SIDE SCREEN</Text>
//       </View>

//       {/* ---- STABILITY / CAPTURE UI ---- */}
//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
//         </View>
//       )}

//       {isStable && (
//         <View style={styles.captureBox}>
//           <TouchableOpacity onPress={captureShot} style={styles.captureButton}>
//             <Text style={styles.captureText}>Take Photo</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66CCFF', // blue for SIDE
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   holdBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   holdText: {color: '#060606ff', fontSize: 26, fontWeight: '600'},
//   captureBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   captureButton: {
//     backgroundColor: '#fff',
//     paddingHorizontal: 36,
//     paddingVertical: 14,
//     borderRadius: 30,
//   },
//   captureText: {color: '#000', fontSize: 20, fontWeight: '600'},
// });

/////////////////

// MeasurementSideScreen.tsx — StylIQ (diagnostic version)

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// // Allow custom global vars for motion smoothing
// declare global {
//   var _motionHistorySide: number[] | undefined;
//   var _takingPhoto: boolean | undefined;
// }

// const {ARKitModule} = NativeModules;

// interface MeasurementSideScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementSideScreen({
//   navigate,
// }: MeasurementSideScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.05;

//   // ---------------------------------------------------
//   // Reset UI on entry
//   // ---------------------------------------------------
//   useEffect(() => {
//     console.log('🔄 [RN] MeasurementSideScreen mounted');
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//     if (global._motionHistorySide) delete global._motionHistorySide;
//     global._takingPhoto = false;

//     return () => {
//       console.log('🧹 [RN] MeasurementSideScreen unmounted');
//     };
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection — SMOOTHED VERSION
//   // ---------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (keys.length === 0) {
//       setIsStable(false);
//       prevJointsRef.current = joints;
//       return;
//     }

//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;
//     for (const key of keys) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       totalDiff +=
//         Math.abs(curr[0] - prev[0]) +
//         Math.abs(curr[1] - prev[1]) +
//         Math.abs(curr[2] - prev[2]);
//       count++;
//     }

//     let avg = count > 0 ? totalDiff / count : 999;
//     if (avg === 0) avg = 999;

//     if (!global._motionHistorySide) global._motionHistorySide = [];
//     const history = global._motionHistorySide;

//     history.push(avg);
//     if (history.length > 6) history.shift();

//     const sorted = [...history].sort((a, b) => a - b);
//     const trimmed = sorted.slice(0, sorted.length - 1);
//     const smoothed = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

//     if (smoothed < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // 📸 Manual capture — diagnostic version
//   // ---------------------------------------------------
//   const captureShot = () => {
//     // Debounce to prevent double navigation
//     if (global._takingPhoto) {
//       console.log('⚠️ [RN] Duplicate capture prevented');
//       return;
//     }
//     global._takingPhoto = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     console.log('📸 [RN] Capture side start');
//     console.log('🦴 [RN] Joints count:', Object.keys(joints).length);
//     captureSide(joints);

//     // Stop AR session before navigation
//     try {
//       console.log('🛑 [RN] Calling ARKitModule.stopTracking()');
//       ARKitModule.stopTracking();
//     } catch (e) {
//       console.warn('⚠️ [RN] ARKit stopTracking failed:', e);
//     }

//     // Track timing of the transition
//     let step = 0;
//     const interval = setInterval(() => {
//       console.log(`⏱️ [RN] Waiting... ${++step * 200}ms`);
//       if (step > 25) clearInterval(interval);
//     }, 200);

//     // Give ARKit a moment to release camera before next screen
//     setTimeout(() => {
//       console.log('📸 [RN] Navigating → MeasurementResultsScreen');
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('MeasurementResultsScreen', {from: 'sidePoseComplete'});
//       global._takingPhoto = false;
//       clearInterval(interval);
//     }, 800);
//   };

//   // ---------------------------------------------------
//   // 🧩 Render
//   // ---------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay joints={joints} />

//       {/* Debug Overlay */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Joints: {Object.keys(joints).length}
//         </Text>
//         <Text style={styles.debugText}>Stable: {isStable ? 'YES' : 'NO'}</Text>
//       </View>

//       {/* UI State */}
//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
//         </View>
//       )}

//       {isStable && (
//         <View style={styles.captureBox}>
//           <TouchableOpacity onPress={captureShot} style={styles.captureButton}>
//             <Text style={styles.captureText}>Take Photo</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBox: {
//     position: 'absolute',
//     top: 40,
//     left: 20,
//     backgroundColor: 'rgba(0,0,0,0.35)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 8,
//     zIndex: 20,
//   },
//   debugText: {color: '#fff', fontSize: 16},
//   holdBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   holdText: {color: '#fff', fontSize: 26, fontWeight: '600'},
//   captureBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   captureButton: {
//     backgroundColor: '#fff',
//     paddingHorizontal: 36,
//     paddingVertical: 14,
//     borderRadius: 30,
//   },
//   captureText: {
//     color: '#000',
//     fontSize: 20,
//     fontWeight: '600',
//   },
// });

///////////////////

// // MeasurementSideScreen.tsx — StylIQ (final stable version)

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// // Allow custom global vars for motion smoothing
// declare global {
//   var _motionHistorySide: number[] | undefined;
// }

// const {ARKitModule} = NativeModules;

// interface MeasurementSideScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementSideScreen({
//   navigate,
// }: MeasurementSideScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.05;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // Reset UI on entry
//   // ---------------------------------------------------
//   useEffect(() => {
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//     if (global._motionHistorySide) delete global._motionHistorySide;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection — SMOOTHED VERSION
//   // ---------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (keys.length === 0) {
//       setIsStable(false);
//       prevJointsRef.current = joints;
//       return;
//     }

//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;
//     for (const key of keys) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       totalDiff +=
//         Math.abs(curr[0] - prev[0]) +
//         Math.abs(curr[1] - prev[1]) +
//         Math.abs(curr[2] - prev[2]);
//       count++;
//     }

//     let avg = count > 0 ? totalDiff / count : 999;
//     if (avg === 0) avg = 999;

//     if (!global._motionHistorySide) global._motionHistorySide = [];
//     const history = global._motionHistorySide;

//     history.push(avg);
//     if (history.length > 6) history.shift();

//     const sorted = [...history].sort((a, b) => a - b);
//     const trimmed = sorted.slice(0, sorted.length - 1);
//     const smoothed = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

//     if (smoothed < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // 📸 Manual capture — safe AR teardown
//   // ---------------------------------------------------
//   const captureShot = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');

//     console.log('📸 Capturing side pose');
//     captureSide(joints);

//     // Stop AR session before navigation
//     try {
//       ARKitModule.stopTracking();
//     } catch (e) {
//       console.warn('⚠️ ARKit stopTracking failed:', e);
//     }

//     // Give ARKit a moment to release camera before next screen
//     setTimeout(() => {
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('MeasurementResultsScreen', {from: 'sidePoseComplete'});
//     }, 600);
//   };

//   // ---------------------------------------------------
//   // 🧩 Render
//   // ---------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay joints={joints} />

//       {/* Debug Overlay */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Joints: {Object.keys(joints).length}
//         </Text>
//         <Text style={styles.debugText}>Stable: {isStable ? 'YES' : 'NO'}</Text>
//       </View>

//       {/* UI State */}
//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
//         </View>
//       )}

//       {isStable && (
//         <View style={styles.captureBox}>
//           <TouchableOpacity onPress={captureShot} style={styles.captureButton}>
//             <Text style={styles.captureText}>Take Photo</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBox: {
//     position: 'absolute',
//     top: 40,
//     left: 20,
//     backgroundColor: 'rgba(0,0,0,0.35)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 8,
//     zIndex: 20,
//   },
//   debugText: {color: '#fff', fontSize: 16},
//   holdBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   holdText: {color: '#fff', fontSize: 26, fontWeight: '600'},
//   captureBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   captureButton: {
//     backgroundColor: '#fff',
//     paddingHorizontal: 36,
//     paddingVertical: 14,
//     borderRadius: 30,
//   },
//   captureText: {
//     color: '#000',
//     fontSize: 20,
//     fontWeight: '600',
//   },
// });

//////////////////////////

// // MeasurementSideScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// interface MeasurementSideScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementSideScreen({
//   navigate,
// }: MeasurementSideScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.05;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // Reset UI on entry
//   // ---------------------------------------------------
//   useEffect(() => {
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//     if (global._motionHistorySide) delete global._motionHistorySide;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection — SMOOTHED VERSION
//   // ---------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (keys.length === 0) {
//       setIsStable(false);
//       prevJointsRef.current = joints;
//       return;
//     }

//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;
//     for (const key of keys) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       totalDiff +=
//         Math.abs(curr[0] - prev[0]) +
//         Math.abs(curr[1] - prev[1]) +
//         Math.abs(curr[2] - prev[2]);
//       count++;
//     }

//     let avg = count > 0 ? totalDiff / count : 999;
//     if (avg === 0) avg = 999;

//     if (!global._motionHistorySide) global._motionHistorySide = [];
//     const history = global._motionHistorySide;

//     history.push(avg);
//     if (history.length > 6) history.shift();

//     const sorted = [...history].sort((a, b) => a - b);
//     const trimmed = sorted.slice(0, sorted.length - 1);
//     const smoothed = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

//     if (smoothed < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // 📸 Manual capture
//   // ---------------------------------------------------
//   const captureShot = () => {
//     ReactNativeHapticFeedback.trigger('notificationSuccess');
//     captureSide(joints);

//     setTimeout(() => {
//       navigate('MeasurementResultsScreen', {from: 'sidePoseComplete'});
//     }, 300);
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay joints={joints} />

//       {/* Debug Overlay */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Joints: {Object.keys(joints).length}
//         </Text>
//         <Text style={styles.debugText}>Stable: {isStable ? 'YES' : 'NO'}</Text>
//       </View>

//       {/* Main UI */}
//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
//         </View>
//       )}

//       {isStable && (
//         <View style={styles.captureBox}>
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactMedium');
//               captureShot();
//             }}
//             style={styles.captureButton}>
//             <Text style={styles.captureText}>Take Photo</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBox: {
//     position: 'absolute',
//     top: 40,
//     left: 20,
//     backgroundColor: 'rgba(0,0,0,0.35)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 8,
//     zIndex: 20,
//   },
//   debugText: {color: '#fff', fontSize: 16},
//   holdBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   holdText: {color: '#fff', fontSize: 26, fontWeight: '600'},
//   captureBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   captureButton: {
//     backgroundColor: '#fff',
//     paddingHorizontal: 36,
//     paddingVertical: 14,
//     borderRadius: 30,
//   },
//   captureText: {
//     color: '#000',
//     fontSize: 20,
//     fontWeight: '600',
//   },
// });

///////////////////

// // MeasurementSideScreen.tsx
// // StylIQ — Side pose capture for measurement

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// interface MeasurementSideScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementSideScreen({
//   navigate,
// }: MeasurementSideScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();

//   const captureSide = useMeasurementStore(s => s.captureSide);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.05;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // Reset on mount
//   // ---------------------------------------------------
//   useEffect(() => {
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//     if (global._motionHistorySide) delete global._motionHistorySide;
//   }, []);

//   // ---------------------------------------------------
//   // Stability detection (same smoothing)
//   // ---------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (keys.length === 0) {
//       setIsStable(false);
//       setCountdown(null);
//       prevJointsRef.current = joints;
//       return;
//     }

//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;

//     for (const key of keys) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       totalDiff +=
//         Math.abs(curr[0] - prev[0]) +
//         Math.abs(curr[1] - prev[1]) +
//         Math.abs(curr[2] - prev[2]);
//       count++;
//     }

//     let avg = count > 0 ? totalDiff / count : 999;
//     if (avg === 0) avg = 999;

//     if (!global._motionHistorySide) global._motionHistorySide = [];
//     const history = global._motionHistorySide;
//     history.push(avg);
//     if (history.length > 6) history.shift();

//     const sorted = [...history].sort((a, b) => a - b);
//     const trimmed = sorted.slice(0, sorted.length - 1);
//     const smoothed = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

//     if (smoothed < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//       setCountdown(null);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // Countdown trigger
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!isStable) return;

//     const now = Date.now();
//     if (now - lastStableRef.current < HOLD_DURATION) return;

//     if (countdown === null) {
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       setCountdown(3);
//     }
//   }, [isStable, countdown]);

//   // ---------------------------------------------------
//   // Countdown tick
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (countdown === null) return;

//     if (countdown <= 0) {
//       captureShot();
//       return;
//     }

//     const timer = setTimeout(
//       () => setCountdown(c => (c !== null ? c - 1 : null)),
//       950,
//     );

//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // ---------------------------------------------------
//   // Capture side pose & navigate to results
//   // ---------------------------------------------------
//   const captureShot = () => {
//     ReactNativeHapticFeedback.trigger('notificationSuccess');
//     captureSide(joints);
//     setCountdown(null);

//     setTimeout(() => {
//       navigate('MeasurementResultsScreen', {from: 'sidePoseComplete'});
//     }, 500);
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay joints={joints} />

//       {/* Debug */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Joints: {Object.keys(joints).length}
//         </Text>
//         <Text style={styles.debugText}>Stable: {isStable ? 'YES' : 'NO'}</Text>
//       </View>

//       {!isStable && countdown === null && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
//         </View>
//       )}

//       {isStable && countdown === null && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Stable — capturing soon…</Text>
//         </View>
//       )}

//       {countdown !== null && countdown > 0 && (
//         <View style={styles.countdownBox}>
//           <Text style={styles.countdownText}>{countdown}</Text>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBox: {
//     position: 'absolute',
//     top: 40,
//     left: 20,
//     backgroundColor: 'rgba(0,0,0,0.35)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 8,
//     zIndex: 20,
//   },
//   debugText: {color: '#fff', fontSize: 16},
//   holdBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   holdText: {color: '#fff', fontSize: 26, fontWeight: '600'},
//   countdownBox: {
//     position: 'absolute',
//     bottom: 260,
//     width: '100%',
//     alignItems: 'center',
//   },
//   countdownText: {
//     color: '#fff',
//     fontSize: 90,
//     fontWeight: '700',
//   },
// });
