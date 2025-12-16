// MeasurementFrontScreen.tsx — FINAL VERSION (Audible Pauses + Bright Flash)
// (Rear Camera Tripod Setup + 3s Countdown + Flash + Pre-capture Instructions)

import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {NativeModules} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Tts from 'react-native-tts';
import ARKitView from '../components/features/ARKitView';
import useLiveMeasurement from '../components/features/useLiveMeasurement';
import GhostOverlay from '../components/features/GhostOverlay';
import {useMeasurementStore} from '../../../../store/measurementStore';

const {ARKitModule} = NativeModules;

declare global {
  var __frontTaken: boolean | undefined;
}

type Props = {
  navigate: (screen: string) => void;
};

// helper for timing
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function MeasurementFrontScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const joints = useLiveMeasurement();
  const captureFront = useMeasurementStore(s => s.captureFront);

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
  // INTRO INSTRUCTIONS (Sequential TTS + Pauses)
  // -------------------------------------------------------
  // -------------------------------------------------------
  // INTRO INSTRUCTIONS (Sequential TTS + Safe Delay)
  // -------------------------------------------------------
  useEffect(() => {
    if (!showInstructions) return;
    (async () => {
      try {
        await Tts.stop();

        Tts.speak('Welcome to Styl Helpr measurement.', {} as any);
        await sleep(3000);

        Tts.speak(
          'Step back about six feet from the camera and stay centered with it.',
          {} as any,
        );
        await sleep(7000);

        Tts.speak(
          'Now, please stand straight, feet together, and keep your arms slightly away from your sides.',
          {} as any,
        );
        await sleep(9000);

        Tts.speak(
          'The camera will automatically capture when you hold still.',
          {} as any,
        );
        await sleep(5000); // ⬅️ give the last phrase time to finish

        // ✅ now safely hide instructions AFTER the TTS completes
        setShowInstructions(false);
      } catch (err) {
        console.warn('TTS intro failed:', err);
        setShowInstructions(false);
      }
    })();
  }, [showInstructions]);

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
    const nowStable = avgDiff < 0.04;

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

    if (isStable && countdown === null && !global.__frontTaken) {
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
  // CAPTURE FRONT POSE
  // -------------------------------------------------------
  const captureShot = () => {
    if (global.__frontTaken) return;
    global.__frontTaken = true;

    ReactNativeHapticFeedback.trigger('impactMedium');
    Tts.speak('Capturing now.');
    showFlash();

    captureFront(joints);

    try {
      ARKitModule.stopTracking();
    } catch (_) {}

    setTimeout(() => navigate('MeasurementAutoScreen'), 700);
  };

  // -------------------------------------------------------
  // FLASH ANIMATION
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
      alignSelf: 'center',
      zIndex: 9999,
      color: 'white',
      fontSize: 36,
      fontWeight: '700',
      textAlign: 'center',
    },
    holdText: {
      color: 'white',
      fontSize: 28,
      fontWeight: '600',
      textAlign: 'center',
    },
    countdownText: {
      position: 'absolute',
      top: '40%',
      alignSelf: 'center',
      color: 'white',
      fontSize: 160,
      fontWeight: '900',
      textAlign: 'center',
    },
    flashOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'white',
      opacity: flashAnim,
      zIndex: 9999,
    },
    instructionBox: {
      position: 'absolute',
      top: '28%',
      width: '100%',
      paddingHorizontal: 32,
    },
    instructionTitle: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      color: 'white',
      marginBottom: 12,
    },
    instructionText: {
      fontSize: 20,
      textAlign: 'center',
      color: 'white',
      opacity: 0.8,
    },
  });

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ARKitView style={StyleSheet.absoluteFill} />

      {showInstructions && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>
            Stand in front of the camera
          </Text>
          <Text style={styles.instructionText}>
            Keep your body centered, feet together, and arms slightly away.
            Capture will begin automatically when you hold still.
          </Text>
        </View>
      )}

      {!showInstructions && <GhostOverlay mode="front" isStable={isStable} />}

      <Text style={styles.readyTopText}>Ready for front photo</Text>

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

//////////////

// // MeasurementFrontScreen.tsx — FINAL VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Pre-capture Instructions)

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const [showInstructions, setShowInstructions] = useState(true);

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
//   // INTRO INSTRUCTIONS (verbal + visual)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (showInstructions) {
//       (async () => {
//         try {
//           await Tts.stop();
//           await Tts.speak(
//             'Welcome to Styl Helpr measurement. Please stand straight, feet together, and keep your arms slightly away from your sides. The camera will automatically capture when you hold still.',
//           );
//         } catch (err) {
//           console.warn('TTS intro failed:', err);
//         }
//       })();

//       const timer = setTimeout(() => setShowInstructions(false), 6500);
//       return () => clearTimeout(timer);
//     }
//   }, [showInstructions]);

//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (showInstructions) return; // 🚫 Wait until instructions are done

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
//   }, [joints, showInstructions]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE (with voice)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (showInstructions) return; // 🚫 Wait until instructions end

//     if (isStable && countdown === null && !global.__frontTaken) {
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
//   }, [isStable, showInstructions]);

//   // -------------------------------------------------------
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => navigate('MeasurementAutoScreen'), 700);
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
//       alignSelf: 'center',
//       zIndex: 9999,
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
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//     instructionBox: {
//       position: 'absolute',
//       top: '28%',
//       width: '100%',
//       paddingHorizontal: 32,
//     },
//     instructionTitle: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     instructionText: {
//       fontSize: 20,
//       textAlign: 'center',
//       color: theme.colors.foreground,
//       opacity: 0.8,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- PRE-INSTRUCTION OVERLAY ---- */}
//       {showInstructions && (
//         <View style={styles.instructionBox}>
//           <Text style={styles.instructionTitle}>
//             Stand in front of the camera
//           </Text>
//           <Text style={styles.instructionText}>
//             Keep your body centered, feet together, and arms slightly away.
//             Capture will begin automatically when you hold still.
//           </Text>
//         </View>
//       )}

//       {/* ---- GHOST OVERLAY ---- */}
//       {!showInstructions && <GhostOverlay mode="front" isStable={isStable} />}

//       <Text style={styles.readyTopText}>Ready for front photo</Text>

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

// // MeasurementFrontScreen.tsx — FINAL VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback + Pre-capture Instructions)

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashVisible, setFlashVisible] = useState(false);
//   const [showInstructions, setShowInstructions] = useState(true);

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
//   // INTRO INSTRUCTIONS (verbal + visual)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (showInstructions) {
//       (async () => {
//         try {
//           await Tts.stop();
//           await Tts.speak(
//             'Welcome to Styl Helpr measurement. Please stand straight, feet together, and keep your arms slightly away from your sides. The camera will automatically capture when you hold still.',
//           );
//         } catch (err) {
//           console.warn('TTS intro failed:', err);
//         }
//       })();

//       const timer = setTimeout(() => setShowInstructions(false), 6500);
//       return () => clearTimeout(timer);
//     }
//   }, [showInstructions]);

//   // -------------------------------------------------------
//   // STABILITY DETECTION (debounced)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (showInstructions) return; // 🚫 Wait until instructions are done

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
//   }, [joints, showInstructions]);

//   // -------------------------------------------------------
//   // COUNTDOWN + AUTO CAPTURE (with voice)
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (showInstructions) return; // 🚫 Wait until instructions end

//     if (isStable && countdown === null && !global.__frontTaken) {
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
//   }, [isStable, showInstructions]);

//   // -------------------------------------------------------
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => navigate('MeasurementAutoScreen'), 700);
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
//       alignSelf: 'center',
//       zIndex: 9999,
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
//     flashOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'white',
//       opacity: flashAnim,
//       zIndex: 9999,
//     },
//     instructionBox: {
//       position: 'absolute',
//       top: '28%',
//       width: '100%',
//       paddingHorizontal: 32,
//     },
//     instructionTitle: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     instructionText: {
//       fontSize: 20,
//       textAlign: 'center',
//       color: theme.colors.foreground,
//       opacity: 0.8,
//     },
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- PRE-INSTRUCTION OVERLAY ---- */}
//       {showInstructions && (
//         <View style={styles.instructionBox}>
//           <Text style={styles.instructionTitle}>
//             Stand in front of the camera
//           </Text>
//           <Text style={styles.instructionText}>
//             Keep your body centered, feet together, and arms slightly away.
//             Capture will begin automatically when you hold still.
//           </Text>
//         </View>
//       )}

//       {/* ---- GHOST OVERLAY ---- */}
//       {!showInstructions && <GhostOverlay mode="front" isStable={isStable} />}

//       <Text style={styles.readyTopText}>Ready for front photo</Text>

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

//////////////////////

// // MeasurementFrontScreen.tsx — FINAL VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback)

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

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
//     if (isStable && countdown === null && !global.__frontTaken) {
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
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => navigate('MeasurementAutoScreen'), 700);
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
//       alignSelf: 'center',
//       zIndex: 9999,
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
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- GHOST OVERLAY ---- */}
//       <GhostOverlay mode="front" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for front photo</Text>

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

/////////////////

// // MeasurementFrontScreen.tsx — FINAL VERSION
// // (Rear Camera Tripod Setup + 3s Audible Countdown + Flash Feedback)

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import Tts from 'react-native-tts';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

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
//     if (isStable && countdown === null && !global.__frontTaken) {
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
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     Tts.speak('Capturing now.');
//     showFlash();

//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => navigate('MeasurementAutoScreen'), 700);
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
//       alignSelf: 'center',
//       zIndex: 9999,
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
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- GHOST OVERLAY ---- */}
//       <GhostOverlay mode="front" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for front photo</Text>

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

// // MeasurementFrontScreen.tsx — FINAL FIXED VERSION (Hands-Free Auto Capture + 3s Countdown + Stable Pose)
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

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
//   // COUNTDOWN + AUTO CAPTURE
//   // -------------------------------------------------------
//   useEffect(() => {
//     if (isStable && countdown === null && !global.__frontTaken) {
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
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementAutoScreen');
//     }, 500);
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- FRONT SILHOUETTE OVERLAY ---- */}
//       <GhostOverlay mode="front" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for front photo</Text>

//       {/* ---- LARGE COUNTDOWN ---- */}
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

// // MeasurementFrontScreen.tsx — FINAL FIXED VERSION (Hands-Free Auto Capture + Stable Pose + Safe Timer)
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

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
//         if (elapsed >= 2 && !global.__frontTaken) {
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
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementAutoScreen');
//     }, 400);
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- FRONT SILHOUETTE OVERLAY ---- */}
//       <GhostOverlay mode="front" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for front photo</Text>

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

//////////////////

// // MeasurementFrontScreen.tsx — FINAL FIXED VERSION (Robot Visible + Stable Pose + Debug Overlay)
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

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

//   // -------------------------------------------------------
//   // STABILITY DETECTION (detects when user is still enough)
//   // -------------------------------------------------------
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
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementAutoScreen');
//     }, 400);
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- FRONT SILHOUETTE OVERLAY ---- */}
//       <GhostOverlay mode="front" isStable={isStable} />

//       <Text style={styles.readyTopText}>Ready for front photo</Text>

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

///////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef<any>(null);

//   useEffect(() => {
//     global.__frontTaken = false;
//     prevRef.current = null;
//     setTimeout(() => ARKitModule.startTracking(), 150);

//     return () => {
//       try {
//         ARKitModule.stopTracking();
//       } catch (_) {}
//     };
//   }, []);

//   // Detect stability
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

//     setIsStable(count > 0 && diff / count < 0.04);
//     prevRef.current = joints;
//   }, [joints]);

//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => navigate('MeasurementAutoScreen'), 400);
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay mode="front" isStable={isStable} />

//       {/* ✅ Move your text here, above the status box */}
//       <Text style={styles.readyTopText}>Ready for front photo</Text>

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

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   statusBox: {
//     position: 'absolute',
//     bottom: 120,
//     width: '100%',
//     alignItems: 'center',
//   },
//   readyTopText: {
//     position: 'absolute',
//     top: 120,
//     zIndex: 9999,
//     alignSelf: 'center',
//     color: '#ffffffff',
//     fontSize: 32,
//     fontWeight: '600',
//   },
//   holdText: {
//     color: '#fff',
//     fontSize: 26,
//     fontWeight: '600',
//   },
//   captureButton: {
//     backgroundColor: '#fff',
//     paddingHorizontal: 36,
//     paddingVertical: 14,
//     borderRadius: 30,
//   },
//   captureText: {color: '#000', fontSize: 20, fontWeight: '600'},
// });

//////////////////

// MeasurementFrontScreen.tsx — FINAL FIXED VERSION (Robot Visible + Stable Pose + Debug Overlay)
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef<any>(null);

//   // -------------------------------------------------------
//   // AR SESSION INIT — Load model first, then start tracking
//   // -------------------------------------------------------
//   // useEffect(() => {
//   //   global.__frontTaken = false;
//   //   prevRef.current = null;

//   //   setTimeout(() => {
//   //     // ✅ Load body model before session starts so robot attaches correctly
//   //     ARKitModule.loadBodyModel('biped_robot');
//   //     ARKitModule.startTracking();
//   //   }, 150);

//   //   return () => {
//   //     try {
//   //       ARKitModule.stopTracking();
//   //     } catch (_) {}
//   //   };
//   // }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION (detects when user is still enough)
//   // -------------------------------------------------------
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
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementAutoScreen');
//     }, 400);
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- FRONT SILHOUETTE OVERLAY ---- */}
//       {/* Uncomment when silhouette overlay asset is ready */}
//       <GhostOverlay mode="front" isStable={isStable} />

//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>FRONT SCREEN</Text>
//       </View>

//       {/* ---- STATUS UI ---- */}
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

// // -------------------------------------------------------
// // STYLES
// // -------------------------------------------------------
// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#FF6666',
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

// // MeasurementFrontScreen.tsx — FINAL FIXED VERSION (Robot Visible + Stable Pose + Debug Overlay)
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {NativeModules} from 'react-native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef<any>(null);

//   // -------------------------------------------------------
//   // AR SESSION INIT — Load model first, then start tracking
//   // -------------------------------------------------------
//   // useEffect(() => {
//   //   global.__frontTaken = false;
//   //   prevRef.current = null;

//   //   setTimeout(() => {
//   //     // ✅ Load body model before session starts so robot attaches correctly
//   //     ARKitModule.loadBodyModel('biped_robot');
//   //     ARKitModule.startTracking();
//   //   }, 150);

//   //   return () => {
//   //     try {
//   //       ARKitModule.stopTracking();
//   //     } catch (_) {}
//   //   };
//   // }, []);

//   // -------------------------------------------------------
//   // STABILITY DETECTION (detects when user is still enough)
//   // -------------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);
//     if (!keys.length) return setIsStable(false);

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
//   // CAPTURE FRONT POSE
//   // -------------------------------------------------------
//   const captureShot = () => {
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;

//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementAutoScreen');
//     }, 400);
//   };

//   // -------------------------------------------------------
//   // UI
//   // -------------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR CAMERA FEED ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* ---- FRONT SILHOUETTE OVERLAY ---- */}
//       {/* Uncomment when silhouette overlay asset is ready */}
//       <GhostOverlay mode="front" isStable={isStable} />

//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>FRONT SCREEN</Text>
//       </View>

//       {/* ---- STATUS UI ---- */}
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

// // -------------------------------------------------------
// // STYLES
// // -------------------------------------------------------
// const styles = StyleSheet.create({
//   container: {flex: 1},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#FF6666',
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

///////////////

// // MeasurementFrontScreen.tsx — FINAL SAFE VERSION + DEBUG BANNER
// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {NativeModules} from 'react-native';

// const {ARKitModule} = NativeModules;

// declare global {
//   var __frontTaken: boolean | undefined;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function MeasurementFrontScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const prevRef = useRef(null);

//   useEffect(() => {
//     global.__frontTaken = false;
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
//     if (global.__frontTaken) return;
//     global.__frontTaken = true;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     captureFront(joints);

//     try {
//       ARKitModule.stopTracking();
//     } catch (_) {}

//     setTimeout(() => {
//       navigate('MeasurementSideScreen');
//     }, 400);
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- AR + Overlay ---- */}
//       <ARKitView style={StyleSheet.absoluteFill} />
//       <GhostOverlay joints={joints} />

//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>FRONT SCREEN</Text>
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
//     backgroundColor: '#FF6666',
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

///////////////////

// MeasurementFrontScreen.tsx
// StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// // ✅ Fix TypeScript implicit 'any' error for global
// declare const global: typeof globalThis & {
//   _motionHistory?: number[];
// };

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<Record<string, number[]> | null>(null);

//   const STABLE_THRESHOLD = 0.05;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // Reset UI on entry
//   // ---------------------------------------------------
//   useEffect(() => {
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//     if (global._motionHistory) delete global._motionHistory;
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

//     if (!global._motionHistory) global._motionHistory = [];
//     const history = global._motionHistory;

//     history.push(avg);
//     if (history.length > 6) history.shift();

//     const sorted = [...history].sort((a, b) => a - b);
//     const trimmed = sorted.slice(0, sorted.length - 1);
//     const smoothed =
//       trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;

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
//     captureFront(joints);

//     setTimeout(() => {
//       navigate('MeasurementAutoScreen', {from: 'frontPoseComplete'});
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

/////////////////////

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

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
//     if (global._motionHistory) delete global._motionHistory;
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

//     if (!global._motionHistory) global._motionHistory = [];
//     const history = global._motionHistory;

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
//     captureFront(joints);

//     setTimeout(() => {
//       navigate('MeasurementAutoScreen', {from: 'frontPoseComplete'});
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

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.05;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // Reset UI on entry
//   // ---------------------------------------------------
//   useEffect(() => {
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//     if (global._motionHistory) delete global._motionHistory;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection — SMOOTHED VERSION
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

//     if (!global._motionHistory) global._motionHistory = [];
//     const history = global._motionHistory;

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
//   // ⏱ Trigger countdown after stability hold
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
//   // ⏳ Countdown tick
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
//   // 📸 Capture & transition
//   // ---------------------------------------------------
//   const captureShot = () => {
//     ReactNativeHapticFeedback.trigger('notificationSuccess');
//     captureFront(joints);

//     // Smooth delay to show "Captured!" before moving
//     setCountdown(null);
//     setTimeout(() => {
//       navigate('MeasurementAutoScreen', {from: 'frontPoseComplete'});
//     }, 500);
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

//       {/* Main UI Messaging */}
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

//////////////////

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';

// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();

//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.05; // smoothing threshold
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // Reset UI on entry
//   // ---------------------------------------------------
//   useEffect(() => {
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection — SMOOTHED VERSION
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

//     // Filter frozen frame
//     if (avg === 0) {
//       avg = 999;
//     }

//     // Rolling smoothing window
//     if (!window._motionHistory) window._motionHistory = [];
//     const history = window._motionHistory;

//     history.push(avg);
//     if (history.length > 6) history.shift();

//     const sorted = [...history].sort((a, b) => a - b);
//     const trimmed = sorted.slice(0, sorted.length - 1); // remove spike

//     const smoothed = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

//     // Stability by smoothed value
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
//   // Countdown start after hold
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!isStable) return;

//     const now = Date.now();
//     if (now - lastStableRef.current < HOLD_DURATION) return;

//     if (countdown !== null) return;

//     setCountdown(3);
//   }, [isStable]);

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
//       900,
//     );

//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // ---------------------------------------------------
//   // Capture front pose
//   // ---------------------------------------------------
//   const captureShot = () => {
//     captureFront(joints);

//     navigate('MeasurementAutoScreen', {
//       from: 'frontPoseComplete',
//     });
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

//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
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

///////////////////

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';

// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();

//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.035;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // 🔥 Reset UI on entry
//   // ---------------------------------------------------
//   useEffect(() => {
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection — bulletproof version
//   // ---------------------------------------------------
//   useEffect(() => {
//     const keys = Object.keys(joints);

//     // 🔥 1) NO JOINTS → UNSTABLE
//     if (keys.length === 0) {
//       console.log('⚠️ No joints — unstable frame');
//       setIsStable(false);
//       setCountdown(null);
//       prevJointsRef.current = joints;
//       return;
//     }

//     // First frame
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

//       // arrays: [x,y,z]
//       totalDiff +=
//         Math.abs(curr[0] - prev[0]) +
//         Math.abs(curr[1] - prev[1]) +
//         Math.abs(curr[2] - prev[2]);

//       count++;
//     }

//     let avg = count > 0 ? totalDiff / count : 999;

//     // 🔥 2) Zero movement → ARKit frozen frame → must ignore
//     if (avg === 0) {
//       console.log('⚠️ avg=0 (frozen ARKit frame) → treat as unstable');
//       setIsStable(false);
//       setCountdown(null);
//       prevJointsRef.current = joints;
//       return;
//     }

//     console.log('avg movement:', avg);

//     if (avg < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//       setCountdown(null);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // ⏳ Start countdown after being stable long enough
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!isStable) return;

//     const now = Date.now();
//     if (now - lastStableRef.current < HOLD_DURATION) return;

//     if (countdown !== null) return;

//     setCountdown(3);
//   }, [isStable]);

//   // ---------------------------------------------------
//   // ⏱ Countdown tick
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (countdown === null) return;

//     if (countdown <= 0) {
//       captureShot();
//       return;
//     }

//     const timer = setTimeout(
//       () => setCountdown(c => (c !== null ? c - 1 : null)),
//       900,
//     );

//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // ---------------------------------------------------
//   // 📸 Capture front pose
//   // ---------------------------------------------------
//   const captureShot = () => {
//     captureFront(joints);

//     navigate('MeasurementAutoScreen', {
//       from: 'frontPoseComplete',
//     });
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

//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
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

//////////////////

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';

// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();

//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.035;
//   const HOLD_DURATION = 1250;

//   // Reset UI when entering the screen
//   useEffect(() => {
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;

//     for (const key of Object.keys(joints)) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       // ✅ FIX — arrays, not objects
//       totalDiff +=
//         Math.abs(curr[0] - prev[0]) +
//         Math.abs(curr[1] - prev[1]) +
//         Math.abs(curr[2] - prev[2]);

//       count++;
//     }

//     const avg = count > 0 ? totalDiff / count : 999;

//     console.log('avg movement:', avg);

//     if (avg < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//       setCountdown(null);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // ⏳ Begin countdown
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!isStable) return;

//     const now = Date.now();
//     if (now - lastStableRef.current < HOLD_DURATION) return;

//     if (countdown !== null) return;

//     setCountdown(3);
//   }, [isStable]);

//   // ---------------------------------------------------
//   // ⏱ Countdown tick
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (countdown === null) return;

//     if (countdown <= 0) {
//       captureShot();
//       return;
//     }

//     const timer = setTimeout(
//       () => setCountdown(c => (c !== null ? c - 1 : null)),
//       900,
//     );

//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // ---------------------------------------------------
//   // 📸 Capture front pose
//   // ---------------------------------------------------
//   const captureShot = () => {
//     captureFront(joints);

//     navigate('MeasurementAutoScreen', {
//       from: 'frontPoseComplete',
//     });
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay joints={joints} />

//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Joints: {Object.keys(joints).length}
//         </Text>
//         <Text style={styles.debugText}>Stable: {isStable ? 'YES' : 'NO'}</Text>
//       </View>

//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
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

//////////////////

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';

// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();

//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.035;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // 🔥 Reset internal UI when entering screen
//   // ---------------------------------------------------
//   useEffect(() => {
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection
//   // ---------------------------------------------------
//   useEffect(() => {
//     // ⬅️ REQUIRED DEBUG: SHOW ACTUAL STRUCTURE
//     console.log('FRAME JOINTS:', JSON.stringify(joints, null, 2));

//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;

//     for (const key of Object.keys(joints)) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       totalDiff +=
//         Math.abs(curr.x - prev.x) +
//         Math.abs(curr.y - prev.y) +
//         Math.abs(curr.z - prev.z);
//       count++;
//     }

//     const avg = count > 0 ? totalDiff / count : 999;

//     console.log('avg movement:', avg);

//     if (avg < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//       setCountdown(null);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // ⏳ Begin countdown after stable hold
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!isStable) return;

//     const now = Date.now();
//     if (now - lastStableRef.current < HOLD_DURATION) return;

//     if (countdown !== null) return;

//     setCountdown(3);
//   }, [isStable]);

//   // ---------------------------------------------------
//   // ⏱ Countdown tick
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (countdown === null) return;

//     if (countdown <= 0) {
//       captureShot();
//       return;
//     }

//     const timer = setTimeout(
//       () => setCountdown(c => (c !== null ? c - 1 : null)),
//       900,
//     );

//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // ---------------------------------------------------
//   // 📸 Capture front pose
//   // ---------------------------------------------------
//   const captureShot = () => {
//     captureFront(joints);

//     navigate('MeasurementAutoScreen', {
//       from: 'frontPoseComplete',
//     });
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <GhostOverlay joints={joints} />

//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Joints: {Object.keys(joints).length}
//         </Text>
//         <Text style={styles.debugText}>Stable: {isStable ? 'YES' : 'NO'}</Text>
//       </View>

//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
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

/////////////////////

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';

// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();
//   const joints = useLiveMeasurement();

//   // Correct store fn
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.012;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------------
//   // 🔥 Reset state when entering this screen
//   // ---------------------------------------------------
//   useEffect(() => {
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;
//   }, []);

//   // ---------------------------------------------------
//   // 🔍 Stability detection
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;

//     for (const key of Object.keys(joints)) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       totalDiff +=
//         Math.abs(curr.x - prev.x) +
//         Math.abs(curr.y - prev.y) +
//         Math.abs(curr.z - prev.z);
//       count++;
//     }

//     const avg = count > 0 ? totalDiff / count : 999;

//     if (avg < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//       setCountdown(null);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------------
//   // ⏳ Begin countdown after stability
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!isStable) return;

//     const now = Date.now();
//     if (now - lastStableRef.current < HOLD_DURATION) return;

//     if (countdown !== null) return;

//     setCountdown(3);
//   }, [isStable]);

//   // ---------------------------------------------------
//   // ⏱ Countdown tick
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (countdown === null) return;
//     if (countdown <= 0) {
//       captureShot();
//       return;
//     }

//     const timer = setTimeout(
//       () => setCountdown(c => (c !== null ? c - 1 : null)),
//       900,
//     );

//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // ---------------------------------------------------
//   // 📸 Capture front pose
//   // ---------------------------------------------------
//   const captureShot = () => {
//     captureFront(joints);

//     // Reset internal state machine
//     setCountdown(null);
//     setIsStable(false);
//     prevJointsRef.current = null;
//     lastStableRef.current = 0;

//     navigate('MeasurementAutoScreen', {
//       from: 'frontPoseComplete',
//     });
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

//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
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

///////////////////

// // MeasurementFrontScreen.tsx
// // StylIQ

// import React, {useEffect, useState, useRef} from 'react';
// import {View, Text, StyleSheet} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';

// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';

// interface MeasurementFrontScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// export default function MeasurementFrontScreen({
//   navigate,
// }: MeasurementFrontScreenProps) {
//   const {theme} = useAppTheme();

//   const joints = useLiveMeasurement();

//   // ✅ CORRECT FUNCTION NAME
//   const captureFront = useMeasurementStore(s => s.captureFront);

//   const [isStable, setIsStable] = useState(false);
//   const [countdown, setCountdown] = useState<number | null>(null);

//   const lastStableRef = useRef<number>(0);
//   const prevJointsRef = useRef<any>(null);

//   const STABLE_THRESHOLD = 0.012;
//   const HOLD_DURATION = 1250;

//   // ---------------------------------------------
//   // 🔍 Stability detection
//   // ---------------------------------------------
//   useEffect(() => {
//     if (!prevJointsRef.current) {
//       prevJointsRef.current = joints;
//       return;
//     }

//     let totalDiff = 0;
//     let count = 0;

//     for (const key of Object.keys(joints)) {
//       const prev = prevJointsRef.current[key];
//       const curr = joints[key];
//       if (!prev || !curr) continue;

//       totalDiff +=
//         Math.abs(curr.x - prev.x) +
//         Math.abs(curr.y - prev.y) +
//         Math.abs(curr.z - prev.z);
//       count++;
//     }

//     const avg = count > 0 ? totalDiff / count : 999;

//     if (avg < STABLE_THRESHOLD) {
//       if (!isStable) lastStableRef.current = Date.now();
//       setIsStable(true);
//     } else {
//       setIsStable(false);
//       setCountdown(null);
//     }

//     prevJointsRef.current = joints;
//   }, [joints]);

//   // ---------------------------------------------
//   // ⏳ Begin countdown when stable
//   // ---------------------------------------------
//   useEffect(() => {
//     if (!isStable) return;

//     const now = Date.now();
//     if (now - lastStableRef.current < HOLD_DURATION) return;

//     if (countdown !== null) return;

//     setCountdown(3);
//   }, [isStable]);

//   // ---------------------------------------------
//   // ⏱ Countdown tick
//   // ---------------------------------------------
//   useEffect(() => {
//     if (countdown === null) return;
//     if (countdown <= 0) {
//       captureShot();
//       return;
//     }

//     const timer = setTimeout(() => {
//       setCountdown(c => (c !== null ? c - 1 : null));
//     }, 900);

//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // ---------------------------------------------
//   // 📸 Capture front shot
//   // ---------------------------------------------
//   const captureShot = () => {
//     captureFront(joints);

//     navigate('MeasurementAutoScreen', {
//       from: 'frontPoseComplete',
//     });
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

//       {!isStable && (
//         <View style={styles.holdBox}>
//           <Text style={styles.holdText}>Hold Still…</Text>
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
