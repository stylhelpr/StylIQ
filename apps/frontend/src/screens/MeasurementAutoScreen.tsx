// MeasurementAutoScreen.tsx
// StylIQ — Transition screen after front capture

import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {fontScale, moderateScale} from '../utils/scale';

interface MeasurementAutoScreenProps {
  navigate: (screen: string, params?: any) => void;
}

export default function MeasurementAutoScreen({
  navigate,
}: MeasurementAutoScreenProps) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [countdown, setCountdown] = useState(3);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    centerBox: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
    },
    countdown: {
      fontSize: 80,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 20,
    },
  });

  // ---------------------------------------------------
  // 🌀 Fade-in animation
  // ---------------------------------------------------
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // ---------------------------------------------------
  // ⏳ Countdown → Navigate to Side Screen
  // ---------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      setTimeout(
        () => navigate('MeasurementSideScreen', {from: 'autoTransition'}),
        400,
      );
    }
  }, [countdown]);

  // ---------------------------------------------------
  // 💬 Display text states
  // ---------------------------------------------------
  const message =
    countdown > 0 ? 'Turn to your side' : 'Starting side capture…';

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Animated.View style={[styles.centerBox, {opacity: fadeAnim}]}>
        <Text style={[styles.title, {color: theme.colors.foreground}]}>
          {message}
        </Text>

        {countdown > 0 && (
          <Text style={[styles.countdown, {color: theme.colors.foreground}]}>
            {countdown}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

//////////////////

// // src/screens/MeasurementsScreen.tsx
// import React, {useRef, useState, useCallback, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   TouchableOpacity,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import GuidedCaptureOverlay from '../components/measurement/GuidedCaptureOverlay';
// import {measureBody} from '../native/measurementModule';

// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   // CAMERA DEVICES
//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   // FLOW STATE
//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   const [guidance, setGuidance] = useState('Stand facing forward');

//   // FULL automatic step engine
//   const [step, setStep] = useState<
//     | 'front_start'
//     | 'front_hold'
//     | 'front_capture'
//     | 'side_start'
//     | 'side_hold'
//     | 'side_capture'
//     | 'finished'
//   >('front_start');

//   const [mode, setMode] = useState<'front' | 'side'>('front');

//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);

//   if (!device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={{color: '#fff'}}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // -------------------------------------------------------
//   // AUTO CAPTURE FUNCTION
//   // -------------------------------------------------------
//   const capturePhoto = useCallback(async () => {
//     try {
//       const cam = cameraRef.current;
//       if (!cam) return;

//       const photo = await cam.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });

//       if (!photo?.path) return;

//       if (mode === 'front') {
//         setFrontPhoto(photo.path);
//       } else {
//         setSidePhoto(photo.path);
//       }
//     } catch (err) {
//       console.log('❌ capture error:', err);
//     }
//   }, [mode]);

//   // -------------------------------------------------------
//   // STEP ENGINE — FULLY AUTOMATIC
//   // -------------------------------------------------------
//   useEffect(() => {
//     let timer;

//     if (step === 'front_start') {
//       setGuidance('Stand facing forward');
//       timer = setTimeout(() => setStep('front_hold'), 2000);
//     } else if (step === 'front_hold') {
//       setGuidance('Hold still…');
//       timer = setTimeout(() => setStep('front_capture'), 1500);
//     } else if (step === 'front_capture') {
//       setGuidance('Capturing…');
//       timer = setTimeout(async () => {
//         await capturePhoto();
//         setMode('side');
//         setStep('side_start');
//       }, 1200);
//     } else if (step === 'side_start') {
//       setGuidance('Turn sideways');
//       timer = setTimeout(() => setStep('side_hold'), 2000);
//     } else if (step === 'side_hold') {
//       setGuidance('Hold still…');
//       timer = setTimeout(() => setStep('side_capture'), 1500);
//     } else if (step === 'side_capture') {
//       setGuidance('Capturing…');
//       timer = setTimeout(async () => {
//         await capturePhoto();
//         setGuidance('Ready to measure');
//         setStep('finished');
//       }, 1200);
//     }

//     return () => clearTimeout(timer);
//   }, [step]);

//   // -------------------------------------------------------
//   // MEASUREMENT CALCULATION
//   // -------------------------------------------------------
//   const runMeasurement = useCallback(async () => {
//     if (!frontPhoto || !sidePhoto) {
//       Alert.alert('Error', 'Missing photos');
//       return;
//     }

//     try {
//       setIsProcessing(true);

//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       const result = await measureBody(cleanFront, cleanSide, 178);
//       setMeasurementResult(result);
//     } catch (err) {
//       console.log('❌ Measurement Error:', err);
//       Alert.alert('Error', 'Measurement failed');
//     }

//     setIsProcessing(false);
//   }, [frontPhoto, sidePhoto]);

//   // -------------------------------------------------------
//   // SAVE
//   // -------------------------------------------------------
//   const saveToProfile = useCallback(async () => {
//     if (!measurementResult) return;

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());

//       Alert.alert('Saved', 'Measurements saved.');
//     } catch (err) {
//       Alert.alert('Error', 'Save failed.');
//     }
//   }, [measurementResult]);

//   // -------------------------------------------------------
//   // RESULT SCREEN
//   // -------------------------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([k, v]) => (
//             <View key={k} style={styles.row}>
//               <Text style={styles.label}>{k}</Text>
//               <Text style={styles.value}>{v} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>Save to Profile</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => {
//             setFrontPhoto(null);
//             setSidePhoto(null);
//             setMeasurementResult(null);
//             setStep('front_start');
//             setMode('front');
//             setGuidance('Stand facing forward');
//           }}
//           style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // -------------------------------------------------------
//   // MAIN CAMERA UI
//   // -------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         style={{flex: 1}}
//         photo={true}
//         isActive={true}
//         enableBufferCompression={true}
//       />

//       <GuidedCaptureOverlay mode={mode} guidance={guidance} />

//       {step === 'finished' && (
//         <TouchableOpacity onPress={runMeasurement} style={styles.measureButton}>
//           <Text style={{color: '#000', fontSize: 18}}>Measure</Text>
//         </TouchableOpacity>
//       )}

//       {isProcessing && (
//         <View style={styles.processingOverlay}>
//           <ActivityIndicator size="large" color="#fff" />
//           <Text style={{color: '#fff', marginTop: 10}}>Measuring…</Text>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   header: {color: '#fff', fontSize: 32, margin: 20, fontWeight: '700'},
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#fff',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#000',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   measureButton: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//     backgroundColor: '#fff',
//     paddingVertical: 14,
//     paddingHorizontal: 28,
//     borderRadius: 50,
//   },
//   processingOverlay: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     top: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0,0,0,0.55)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

//////////////////////

// // src/screens/MeasurementsScreen.tsx
// import React, {useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import GuidedCaptureOverlay from '../components/measurement/GuidedCaptureOverlay';
// import {measureBody} from '../native/measurementModule';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);
//   const [mode, setMode] = useState<'front' | 'side'>('front');

//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);

//   if (!device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={{color: '#fff'}}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // -----------------------------------------------------
//   // FIX: stable capture callback (identical identity)
//   // -----------------------------------------------------
//   const capturePhoto = useCallback(async () => {
//     try {
//       const cam = cameraRef.current;
//       if (!cam) return;

//       const photo = await cam.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });

//       if (!photo?.path) return;

//       if (mode === 'front') {
//         setFrontPhoto(photo.path);
//         setMode('side');
//       } else {
//         setSidePhoto(photo.path);
//       }
//     } catch (err) {
//       console.log('❌ capture error:', err);
//     }
//   }, [mode]);

//   const runMeasurement = useCallback(async () => {
//     if (!frontPhoto || !sidePhoto) {
//       Alert.alert('Error', 'Capture both photos first.');
//       return;
//     }

//     try {
//       setIsProcessing(true);

//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       const result = await measureBody(cleanFront, cleanSide, 178);
//       setMeasurementResult(result);
//     } catch (err) {
//       console.log('❌ Measurement Error:', err);
//       Alert.alert('Error', 'Failed to measure body.');
//     }

//     setIsProcessing(false);
//   }, [frontPhoto, sidePhoto]);

//   const saveToProfile = useCallback(async () => {
//     if (!measurementResult) return;

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());

//       Alert.alert('Saved', 'Measurements saved to profile.');
//     } catch (err) {
//       Alert.alert('Error', 'Could not save measurements.');
//     }
//   }, [measurementResult]);

//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([k, v]) => (
//             <View key={k} style={styles.row}>
//               <Text style={styles.label}>{k}</Text>
//               <Text style={styles.value}>{v} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>Save To Profile</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => {
//             setFrontPhoto(null);
//             setSidePhoto(null);
//             setMeasurementResult(null);
//             setMode('front');
//           }}
//           style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   return (
//     <View style={{flex: 1}}>
//       {/* THE WORKING FREEZE CAMERA */}
//       <Camera
//         ref={cameraRef}
//         device={device}
//         style={{flex: 1}}
//         photo={true}
//         isActive={true}
//         enableBufferCompression={true}
//       />

//       <GuidedCaptureOverlay mode={mode} />

//       <TouchableOpacity onPress={capturePhoto} style={styles.captureButton}>
//         <Text style={{color: '#fff', fontSize: 18}}>Capture</Text>
//       </TouchableOpacity>

//       {frontPhoto && sidePhoto && (
//         <TouchableOpacity onPress={runMeasurement} style={styles.measureButton}>
//           <Text style={{color: '#000', fontSize: 18}}>Measure</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   header: {color: '#fff', fontSize: 32, margin: 20, fontWeight: '700'},
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#fff',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#000',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   captureButton: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     paddingVertical: 14,
//     paddingHorizontal: 28,
//     borderRadius: 50,
//   },
//   measureButton: {
//     position: 'absolute',
//     bottom: 100,
//     alignSelf: 'center',
//     backgroundColor: '#fff',
//     paddingVertical: 14,
//     paddingHorizontal: 28,
//     borderRadius: 50,
//   },
// });

//////////////////A

// // src/screens/MeasurementsScreen.tsx
// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import Orientation from 'react-native-orientation-locker';

// import GuidedCaptureOverlay from '../components/measurement/GuidedCaptureOverlay';
// import {measureBody} from '../native/measurementModule';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [cameraReady, setCameraReady] = useState(false);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // ----------------------------------------
//   // CLEANUP
//   // ----------------------------------------
//   useEffect(() => {
//     return () => {
//       console.log('🛑 MeasurementsScreen UNMOUNT');
//       Orientation.unlockAllOrientations();
//     };
//   }, []);

//   // ----------------------------------------
//   // PERMISSIONS
//   // ----------------------------------------
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ----------------------------------------
//   // ORIENTATION LOCK
//   // ----------------------------------------
//   useEffect(() => {
//     if (hasPermission) {
//       Orientation.lockToPortrait();
//     }
//   }, [hasPermission]);

//   // ----------------------------------------
//   // MEASUREMENT WHEN BOTH PHOTOS EXIST
//   // ----------------------------------------
//   useEffect(() => {
//     async function runMeasurement() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);
//       try {
//         const cleanFront = frontPhoto.replace('file://', '');
//         const cleanSide = sidePhoto.replace('file://', '');

//         console.log('📏 Running measurements...');
//         const result = await measureBody(cleanFront, cleanSide, 178); // TODO: plug in real user height
//         console.log('📐 RESULT:', result);
//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//         Alert.alert('Error', 'Failed to compute measurements.');
//       }
//       setIsProcessing(false);
//     }

//     runMeasurement();
//   }, [frontPhoto, sidePhoto]);

//   // ----------------------------------------
//   // SAVE TO PROFILE
//   // ----------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;
//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());

//       Alert.alert('Saved', 'Measurements saved to profile');
//     } catch (err) {
//       console.log('❌ Save error:', err);
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // ----------------------------------------
//   // CAPTURE FRONT / SIDE (TAPS ONLY)
//   // ----------------------------------------
//   async function captureFront() {
//     if (!cameraRef.current) return;
//     try {
//       console.log('📸 Taking FRONT photo...');
//       const p = await cameraRef.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });
//       console.log('📸 FRONT RESULT:', p);
//       if (p?.path) setFrontPhoto(p.path);
//     } catch (err) {
//       console.log('❌ FRONT capture error:', err);
//     }
//   }

//   async function captureSide() {
//     if (!cameraRef.current) return;
//     try {
//       console.log('📸 Taking SIDE photo...');
//       const p = await cameraRef.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });
//       console.log('📸 SIDE RESULT:', p);
//       if (p?.path) setSidePhoto(p.path);
//     } catch (err) {
//       console.log('❌ SIDE capture error:', err);
//     }
//   }

//   // ----------------------------------------
//   // RESET
//   // ----------------------------------------
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setIsProcessing(false);
//   }

//   // ----------------------------------------
//   // LOADING CAMERA
//   // ----------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ----------------------------------------
//   // SHOW RESULTS
//   // ----------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([k, v]) => (
//             <View key={k} style={styles.row}>
//               <Text style={styles.label}>{k}</Text>
//               <Text style={styles.value}>{v} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>
//             {isSaving ? 'Saving…' : 'Save To Profile'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // ----------------------------------------
//   // CAMERA VIEW (NO AUTO CAPTURE)
//   // ----------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         photo={true}
//         preset="photo"
//         style={{flex: 1}}
//         onInitialized={() => {
//           console.log('📸 Camera READY');
//           setCameraReady(true);
//         }}
//       />

//       {/* If your overlay expects an "aligned" prop, keep it dumb for now */}
//       <GuidedCaptureOverlay aligned />

//       {/* Controls */}
//       <View style={styles.footer}>
//         {!frontPhoto && (
//           <TouchableOpacity onPress={captureFront} style={styles.captureButton}>
//             <Text style={styles.captureText}>Capture FRONT</Text>
//           </TouchableOpacity>
//         )}

//         {frontPhoto && !sidePhoto && (
//           <TouchableOpacity onPress={captureSide} style={styles.captureButton}>
//             <Text style={styles.captureText}>Capture SIDE</Text>
//           </TouchableOpacity>
//         )}

//         {frontPhoto && sidePhoto && (
//           <View style={styles.statusPill}>
//             <Text style={styles.statusText}>
//               {isProcessing
//                 ? 'Processing measurements…'
//                 : 'Both photos captured'}
//             </Text>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   text: {color: '#fff'},
//   header: {color: '#fff', fontSize: 32, margin: 20, fontWeight: '700'},
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//     marginBottom: 120,
//   },
//   retakeButton: {
//     backgroundColor: '#111',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//     marginBottom: 120,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   footer: {
//     position: 'absolute',
//     bottom: 40,
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     gap: 12,
//   },
//   captureButton: {
//     backgroundColor: '#00D67F',
//     paddingVertical: 14,
//     paddingHorizontal: 40,
//     borderRadius: 18,
//     marginBottom: 120,
//   },
//   captureText: {
//     color: '#000',
//     fontSize: 18,
//     fontWeight: '700',
//   },
//   statusPill: {
//     backgroundColor: '#222',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 999,
//   },
//   statusText: {
//     color: '#fff',
//     fontSize: 14,
//   },
// });

// ////////////////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import Orientation from 'react-native-orientation-locker';

// import GuidedCaptureOverlay, {
//   OverlayRef,
// } from '../components/measurement/GuidedCaptureOverlay';

// import {measureBody} from '../native/measurementModule';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const overlayRef = useRef<OverlayRef>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [cameraReady, setCameraReady] = useState(false);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   const [isAligned, setIsAligned] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);

//   // ----------------------------------------
//   // CLEANUP
//   // ----------------------------------------
//   useEffect(() => {
//     return () => {
//       console.log('🛑 MeasurementsScreen UNMOUNT');
//       Orientation.unlockAllOrientations();
//     };
//   }, []);

//   // ----------------------------------------
//   // PERMISSIONS
//   // ----------------------------------------
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ----------------------------------------
//   // ORIENTATION LOCK
//   // ----------------------------------------
//   useEffect(() => {
//     if (hasPermission) {
//       Orientation.lockToPortrait();
//     }
//   }, [hasPermission]);

//   // ----------------------------------------
//   // AFTER BOTH PHOTOS → RUN MEASUREMENTS
//   // ----------------------------------------
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);

//       try {
//         const cleanFront = frontPhoto.replace('file://', '');
//         const cleanSide = sidePhoto.replace('file://', '');

//         console.log('📏 Running measurements...');
//         const result = await measureBody(cleanFront, cleanSide, 178);
//         console.log('📐 RESULT:', result);

//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }

//       setIsProcessing(false);
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // ----------------------------------------
//   // SAVE TO PROFILE
//   // ----------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;

//     setIsSaving(true);
//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());
//       Alert.alert('Saved', 'Measurements saved to profile');
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // ----------------------------------------
//   // CAPTURE FRONT / SIDE
//   // ----------------------------------------
//   async function capture(type: 'front' | 'side') {
//     if (!cameraRef.current) return;
//     if (!isAligned) return;

//     try {
//       console.log(`📸 Taking ${type.toUpperCase()} photo...`);
//       const p = await cameraRef.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });

//       console.log(`📸 ${type.toUpperCase()} RESULT:`, p);

//       if (p?.path) {
//         if (type === 'front') setFrontPhoto(p.path);
//         else setSidePhoto(p.path);
//       }
//     } catch (err) {
//       console.log('❌ Capture error:', err);
//     }
//   }

//   // ----------------------------------------
//   // RESET
//   // ----------------------------------------
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setIsAligned(false);
//   }

//   // ----------------------------------------
//   // LOADING CAMERA
//   // ----------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ----------------------------------------
//   // SHOW RESULTS
//   // ----------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([k, v]) => (
//             <View key={k} style={styles.row}>
//               <Text style={styles.label}>{k}</Text>
//               <Text style={styles.value}>{v} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>
//             {isSaving ? 'Saving…' : 'Save To Profile'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // ----------------------------------------
//   // CAMERA VIEW
//   // ----------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         photo={true}
//         preset="photo"
//         style={{flex: 1}}
//         onInitialized={() => {
//           console.log('📸 Camera READY');
//           setCameraReady(true);
//         }}
//         onFrameProcessorPerformanceSuggestionAvailable={() => {}}
//         onError={err => console.log('Camera error:', err)}
//         onPreviewStopped={() => {}}
//         onPreviewStarted={() => {}}
//         onStarted={() => {}}
//         onStopped={() => {}}
//         onPreviewOrientationChanged={() => {}}
//         onOutputOrientationChanged={() => {}}
//         onViewReady={() => {}}
//         // Here we pass raw metadata to the overlay
//         onShutter={() => {}}
//         onFrame={frame => {
//           // We only need metadata, not pixel data
//           overlayRef.current?.updateFrame(frame);
//         }}
//       />

//       {/* Overlay */}
//       <GuidedCaptureOverlay
//         ref={overlayRef}
//         mode={!frontPhoto ? 'front' : 'side'}
//         onAlignmentChange={setIsAligned}
//       />

//       {/* Capture Button */}
//       <View style={styles.footer}>
//         {!frontPhoto && (
//           <TouchableOpacity
//             onPress={() => capture('front')}
//             style={[styles.captureButton, !isAligned && styles.captureDisabled]}
//             disabled={!isAligned}>
//             <Text style={styles.captureText}>Capture Front</Text>
//           </TouchableOpacity>
//         )}

//         {frontPhoto && !sidePhoto && (
//           <TouchableOpacity
//             onPress={() => capture('side')}
//             style={[styles.captureButton, !isAligned && styles.captureDisabled]}
//             disabled={!isAligned}>
//             <Text style={styles.captureText}>Capture Side</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   text: {color: '#fff'},
//   header: {color: '#fff', fontSize: 32, margin: 20, fontWeight: '700'},
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#111',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   footer: {
//     position: 'absolute',
//     bottom: 240,
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//   },
//   captureButton: {
//     backgroundColor: '#00D67F',
//     paddingVertical: 16,
//     paddingHorizontal: 40,
//     borderRadius: 14,
//   },
//   captureDisabled: {
//     backgroundColor: '#444',
//   },
//   captureText: {
//     color: '#000',
//     fontSize: 18,
//     fontWeight: '700',
//   },
// });

// //////////////////////

// // src/screens/MeasurementsScreen.tsx
// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import Orientation from 'react-native-orientation-locker';

// import GuidedCaptureOverlay from '../components/measurement/GuidedCaptureOverlay';
// import {measureBody} from '../native/measurementModule';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen({navigation}: any) {
//   const cameraRef = useRef<Camera>(null);
//   const isNavigatingRef = useRef(false);

//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [cameraMounted, setCameraMounted] = useState(true);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   const [flashVisible, setFlashVisible] = useState(false);
//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);

//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // --------------------------------------------------------------------------
//   // SAFE TEARDOWN — CRITICAL FIX FOR err=-17281 / FigCaptureSourceRemote
//   // --------------------------------------------------------------------------
//   useEffect(() => {
//     return () => {
//       console.log('🛑 MeasurementsScreen UNMOUNT');

//       // Immediately unmount camera component
//       setCameraMounted(false);

//       // Safety delay: allow AVCaptureSession to fully close
//       setTimeout(() => {
//         Orientation.unlockAllOrientations();
//       }, 300);
//     };
//   }, []);

//   // Request camera permissions
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // Lock to portrait
//   useEffect(() => {
//     Orientation.lockToPortrait();
//   }, []);

//   // --------------------------------------------------------------------------
//   // SAFE NAVIGATION
//   // Prevents double-push on camera screens (CAUSES XPC ERRORS)
//   // --------------------------------------------------------------------------
//   function safeNavigate(screenName: string) {
//     if (isNavigatingRef.current) {
//       console.log('⛔ Prevented double navigation to:', screenName);
//       return;
//     }
//     isNavigatingRef.current = true;

//     setTimeout(() => {
//       isNavigatingRef.current = false;
//     }, 500);

//     navigation.navigate(screenName);
//   }

//   // --------------------------------------------------------------------------
//   // MANUAL TAP CAPTURE — FRONT
//   // --------------------------------------------------------------------------
//   const takeFrontPhoto = async () => {
//     try {
//       if (!cameraRef.current) return;

//       console.log('📸 Taking FRONT photo...');
//       const p = await cameraRef.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });

//       if (p?.path) {
//         setFrontPhoto(p.path);
//         setFlashVisible(true);
//         setTimeout(() => setFlashVisible(false), 120);
//       }
//     } catch (err) {
//       console.log('❌ FRONT ERROR:', err);
//     }
//   };

//   // --------------------------------------------------------------------------
//   // MANUAL TAP CAPTURE — SIDE
//   // --------------------------------------------------------------------------
//   const takeSidePhoto = async () => {
//     try {
//       if (!cameraRef.current) return;

//       console.log('📸 Taking SIDE photo...');
//       const p = await cameraRef.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });

//       if (p?.path) {
//         setSidePhoto(p.path);
//         setFlashVisible(true);
//         setTimeout(() => setFlashVisible(false), 120);
//       }
//     } catch (err) {
//       console.log('❌ SIDE ERROR:', err);
//     }
//   };

//   // --------------------------------------------------------------------------
//   // RUN MEASUREMENTS (MANUAL)
//   // --------------------------------------------------------------------------
//   async function runMeasurement() {
//     if (!frontPhoto || !sidePhoto) {
//       Alert.alert('Missing photos', 'Capture both photos first.');
//       return;
//     }

//     setIsProcessing(true);

//     try {
//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       console.log('📏 Running measurements...');
//       const result = await measureBody(cleanFront, cleanSide, 178);

//       console.log('📐 RESULT:', result);
//       setMeasurementResult(result);
//     } catch (err) {
//       console.log('❌ Measurement Error:', err);
//       Alert.alert('Error', 'Measurement failed.');
//     }

//     setIsProcessing(false);
//   }

//   // --------------------------------------------------------------------------
//   // SAVE MEASUREMENTS TO PROFILE
//   // --------------------------------------------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;

//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());

//       Alert.alert('Saved', 'Measurements saved to profile.');
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // --------------------------------------------------------------------------
//   // RESET
//   // --------------------------------------------------------------------------
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//   }

//   // --------------------------------------------------------------------------
//   // LOADING CAMERA
//   // --------------------------------------------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // --------------------------------------------------------------------------
//   // SHOW RESULTS
//   // --------------------------------------------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([k, v]) => (
//             <View key={k} style={styles.row}>
//               <Text style={styles.label}>{k}</Text>
//               <Text style={styles.value}>{v} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>
//             {isSaving ? 'Saving…' : 'Save To Profile'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // --------------------------------------------------------------------------
//   // CAMERA VIEW
//   // --------------------------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       {cameraMounted && device && (
//         <Camera
//           key={device.id}
//           ref={cameraRef}
//           device={device}
//           isActive={true}
//           photo={true}
//           preset="photo"
//           orientation="portrait"
//           style={{flex: 1}}
//           onInitialized={() => {
//             console.log('📸 Camera READY');
//           }}
//         />
//       )}

//       <GuidedCaptureOverlay aligned={true} />

//       {flashVisible && <View style={styles.flashOverlay} />}

//       {/* MANUAL CAPTURE BUTTONS */}
//       <View style={styles.bottomControls}>
//         {!frontPhoto && (
//           <TouchableOpacity onPress={takeFrontPhoto} style={styles.captureBtn}>
//             <Text style={styles.captureText}>Take Front Photo</Text>
//           </TouchableOpacity>
//         )}

//         {frontPhoto && !sidePhoto && (
//           <TouchableOpacity onPress={takeSidePhoto} style={styles.captureBtn}>
//             <Text style={styles.captureText}>Take Side Photo</Text>
//           </TouchableOpacity>
//         )}

//         {frontPhoto && sidePhoto && (
//           <TouchableOpacity onPress={runMeasurement} style={styles.captureBtn}>
//             <Text style={styles.captureText}>
//               {isProcessing ? 'Processing…' : 'Run Measurement'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   text: {color: '#fff'},
//   header: {color: '#fff', fontSize: 32, margin: 20, fontWeight: '700'},
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#111',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   flashOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'white',
//     opacity: 0.9,
//     zIndex: 9999,
//   },

//   bottomControls: {
//     position: 'absolute',
//     bottom: 35,
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//   },

//   captureBtn: {
//     backgroundColor: '#222',
//     paddingVertical: 14,
//     paddingHorizontal: 22,
//     borderRadius: 40,
//     marginBottom: 10,
//   },

//   captureText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });

// ////////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import Orientation from 'react-native-orientation-locker';

// import GuidedCaptureOverlay from '../components/measurement/GuidedCaptureOverlay';
// import {measureBody} from '../native/measurementModule';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [cameraMounted, setCameraMounted] = useState(true);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   const [flashVisible, setFlashVisible] = useState(false);

//   const [cameraReady, setCameraReady] = useState(false);
//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // Cleanup
//   useEffect(() => {
//     return () => {
//       console.log('🛑 MeasurementsScreen UNMOUNT');
//       Orientation.unlockAllOrientations();
//       setCameraMounted(false);
//     };
//   }, []);

//   // Permissions
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // Lock orientation
//   useEffect(() => {
//     Orientation.lockToPortrait();
//   }, []);

//   // ----------------------------------------
//   // TAKE PHOTO (MANUAL TAP)
//   // ----------------------------------------
//   const takeFrontPhoto = async () => {
//     try {
//       if (!cameraRef.current) return;

//       console.log('📸 Taking FRONT photo...');
//       const p = await cameraRef.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });

//       console.log('📸 FRONT RESULT:', p);

//       if (p?.path) {
//         setFrontPhoto(p.path);
//         setFlashVisible(true);
//         setTimeout(() => setFlashVisible(false), 130);
//       }
//     } catch (err) {
//       console.log('❌ FRONT ERROR:', err);
//     }
//   };

//   const takeSidePhoto = async () => {
//     try {
//       if (!cameraRef.current) return;

//       console.log('📸 Taking SIDE photo...');
//       const p = await cameraRef.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });

//       console.log('📸 SIDE RESULT:', p);

//       if (p?.path) {
//         setSidePhoto(p.path);
//         setFlashVisible(true);
//         setTimeout(() => setFlashVisible(false), 130);
//       }
//     } catch (err) {
//       console.log('❌ SIDE ERROR:', err);
//     }
//   };

//   // ----------------------------------------
//   // RUN MEASUREMENTS (MANUAL TAP)
//   // ----------------------------------------
//   async function runMeasurement() {
//     if (!frontPhoto || !sidePhoto) {
//       Alert.alert('Missing photos', 'Capture both photos first.');
//       return;
//     }

//     setIsProcessing(true);

//     try {
//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       console.log('📏 Running measurements...');
//       const result = await measureBody(cleanFront, cleanSide, 178);

//       console.log('📐 RESULT:', result);
//       setMeasurementResult(result);
//     } catch (err) {
//       console.log('❌ Measurement Error:', err);
//       Alert.alert('Error', 'Measurement failed.');
//     }

//     setIsProcessing(false);
//   }

//   // ----------------------------------------
//   // SAVE TO PROFILE
//   // ----------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;

//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());

//       Alert.alert('Saved', 'Measurements saved to profile.');
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // ----------------------------------------
//   // RESET
//   // ----------------------------------------
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//   }

//   // ----------------------------------------
//   // LOADING CAMERA
//   // ----------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ----------------------------------------
//   // SHOW RESULTS
//   // ----------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([k, v]) => (
//             <View key={k} style={styles.row}>
//               <Text style={styles.label}>{k}</Text>
//               <Text style={styles.value}>{v} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>
//             {isSaving ? 'Saving…' : 'Save To Profile'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // ----------------------------------------
//   // CAMERA VIEW
//   // ----------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       {cameraMounted && device && (
//         <Camera
//           key={device.id}
//           ref={cameraRef}
//           device={device}
//           isActive={true}
//           photo={true}
//           preset="photo"
//           orientation="portrait"
//           style={{flex: 1}}
//           onInitialized={() => {
//             console.log('📸 Camera READY');
//             setCameraReady(true);
//           }}
//         />
//       )}

//       <GuidedCaptureOverlay aligned={true} />

//       {flashVisible && <View style={styles.flashOverlay} />}

//       {/* Capture Buttons */}
//       <View style={styles.bottomControls}>
//         {!frontPhoto && (
//           <TouchableOpacity onPress={takeFrontPhoto} style={styles.captureBtn}>
//             <Text style={styles.captureText}>Take Front Photo</Text>
//           </TouchableOpacity>
//         )}

//         {frontPhoto && !sidePhoto && (
//           <TouchableOpacity onPress={takeSidePhoto} style={styles.captureBtn}>
//             <Text style={styles.captureText}>Take Side Photo</Text>
//           </TouchableOpacity>
//         )}

//         {frontPhoto && sidePhoto && (
//           <TouchableOpacity onPress={runMeasurement} style={styles.captureBtn}>
//             <Text style={styles.captureText}>
//               {isProcessing ? 'Processing…' : 'Run Measurement'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   text: {color: '#fff'},
//   header: {color: '#fff', fontSize: 32, margin: 20, fontWeight: '700'},
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#111',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   flashOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'white',
//     opacity: 0.9,
//     zIndex: 9999,
//   },

//   bottomControls: {
//     position: 'absolute',
//     bottom: 35,
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//   },

//   captureBtn: {
//     backgroundColor: '#222',
//     paddingVertical: 14,
//     paddingHorizontal: 22,
//     borderRadius: 40,
//     marginBottom: 210,
//   },

//   captureText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });

// //////////////

// // src/screens/MeasurementsScreen.tsx
// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import Orientation from 'react-native-orientation-locker';

// import GuidedCaptureOverlay from '../components/measurement/GuidedCaptureOverlay';
// import {measureBody} from '../native/measurementModule';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [cameraMounted, setCameraMounted] = useState(true);
//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   const [flashVisible, setFlashVisible] = useState(false);
//   const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
//   const [cameraReady, setCameraReady] = useState(false);

//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const lastOrientationRef = useRef(Date.now());

//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // ----------------------------------------
//   // CLEANUP — MUST BE FIRST EFFECT
//   // ----------------------------------------
//   useEffect(() => {
//     return () => {
//       console.log('🛑 MeasurementsScreen UNMOUNT');
//       Orientation.unlockAllOrientations();
//       setCameraMounted(false);
//     };
//   }, []);

//   // ----------------------------------------
//   // PERMISSIONS
//   // ----------------------------------------
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ----------------------------------------
//   // ORIENTATION LISTENER
//   // ----------------------------------------
//   useEffect(() => {
//     const handler = () => {
//       lastOrientationRef.current = Date.now();
//     };

//     Orientation.addDeviceOrientationListener(handler);
//     return () => Orientation.removeDeviceOrientationListener(handler);
//   }, []);

//   // ----------------------------------------
//   // WAIT BEFORE FIRST CAPTURE
//   // ----------------------------------------
//   useEffect(() => {
//     if (!cameraReady) return;

//     Orientation.lockToPortrait(); // REQUIRED

//     const timer = setTimeout(() => safeAutoCapture(), 1500);
//     return () => clearTimeout(timer);
//   }, [cameraReady]);

//   // ----------------------------------------
//   // AFTER FRONT → TAKE SIDE
//   // ----------------------------------------
//   useEffect(() => {
//     if (frontPhoto && !sidePhoto) {
//       console.log('🔥 FRONT captured → queue SIDE...');
//       setTimeout(() => autoCapture(), 1200);
//     }
//   }, [frontPhoto]);

//   // ----------------------------------------
//   // SAFE AUTO CAPTURE
//   // ----------------------------------------
//   async function safeAutoCapture() {
//     const now = Date.now();
//     const diff = now - lastOrientationRef.current;

//     if (diff < 800) {
//       console.log('⛔ Orientation unstable → retry…');
//       setTimeout(() => safeAutoCapture(), 900);
//       return;
//     }

//     autoCapture();
//   }

//   // ----------------------------------------
//   // AUTO CAPTURE
//   // ----------------------------------------
//   async function autoCapture() {
//     console.log('🔥 autoCapture → FRONT:', frontPhoto, '| SIDE:', sidePhoto);

//     if (!autoCaptureEnabled) return;
//     setAutoCaptureEnabled(false);

//     try {
//       // FRONT
//       if (!frontPhoto) {
//         console.log('🚀 Taking FRONT photo...');
//         if (global.showCountdown) global.showCountdown();
//         const p = await cameraRef.current?.takePhoto({
//           flash: 'off',
//           enableShutterSound: false,
//         });

//         console.log('📸 FRONT RESULT:', p);

//         if (p?.path) {
//           setFrontPhoto(p.path);
//           setFlashVisible(true);
//           setTimeout(() => setFlashVisible(false), 120);
//         }

//         setTimeout(() => setAutoCaptureEnabled(true), 900);
//         return;
//       }

//       // SIDE
//       if (!sidePhoto) {
//         console.log('🚀 Taking SIDE photo...');
//         if (global.showCountdown) global.showCountdown();
//         const p = await cameraRef.current?.takePhoto({
//           flash: 'off',
//           enableShutterSound: false,
//         });

//         console.log('📸 SIDE RESULT:', p);

//         if (p?.path) {
//           setSidePhoto(p.path);
//           setFlashVisible(true);
//           setTimeout(() => setFlashVisible(false), 120);
//         }

//         setTimeout(() => setAutoCaptureEnabled(true), 900);
//         return;
//       }
//     } catch (err) {
//       console.log('❌ takePhoto ERROR:', err);
//       setAutoCaptureEnabled(true);
//     }
//   }

//   // ----------------------------------------
//   // MEASUREMENT
//   // ----------------------------------------
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);

//       try {
//         const cleanFront = frontPhoto.replace('file://', '');
//         const cleanSide = sidePhoto.replace('file://', '');

//         const result = await measureBody(cleanFront, cleanSide, 178);
//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }

//       setIsProcessing(false);
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // ----------------------------------------
//   // SAVE TO PROFILE
//   // ----------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;
//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());

//       Alert.alert('Saved', 'Measurements saved to profile');
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // ----------------------------------------
//   // RESET
//   // ----------------------------------------
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setAutoCaptureEnabled(true);
//     setCameraReady(false);
//   }

//   // ----------------------------------------
//   // PERMISSION / DEVICE FAIL
//   // ----------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ----------------------------------------
//   // SHOW RESULTS
//   // ----------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([k, v]) => (
//             <View key={k} style={styles.row}>
//               <Text style={styles.label}>{k}</Text>
//               <Text style={styles.value}>{v} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>
//             {isSaving ? 'Saving…' : 'Save To Profile'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // ----------------------------------------
//   // CAMERA VIEW
//   // ----------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       {cameraMounted && device && (
//         <Camera
//           key={device.id} // ←← THE FIX
//           ref={cameraRef}
//           device={device}
//           isActive={true}
//           photo={true}
//           preset="photo"
//           orientation="portrait"
//           style={{flex: 1}}
//           onInitialized={() => {
//             console.log('📸 Camera READY');
//             setCameraReady(true);
//           }}
//         />
//       )}

//       <GuidedCaptureOverlay aligned={true} />

//       {flashVisible && <View style={styles.flashOverlay} />}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   text: {color: '#fff'},
//   header: {color: '#fff', fontSize: 32, margin: 20, fontWeight: '700'},
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#111',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   flashOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'white',
//     opacity: 0.9,
//     zIndex: 9999,
//   },
// });

// ////////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';

// import GuidedCaptureOverlay from '../components/measurement/GuidedCaptureOverlay';

// import {measureBody} from '../native/measurementModule';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   // ⚠️ NO FRAME PROCESSOR → alignmentScore is always 1
//   const [alignmentScore] = useState(1);
//   const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);

//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // ---------------------------------------------------------
//   // CAMERA PERMISSIONS
//   // ---------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ---------------------------------------------------------
//   // AUTO-CAPTURE USING alignmentScore === 1
//   // ---------------------------------------------------------
//   async function autoCapture() {
//     if (!autoCaptureEnabled) return;
//     if (alignmentScore !== 1) return;

//     setAutoCaptureEnabled(false);

//     // FRONT PHOTO FIRST
//     if (!frontPhoto) {
//       const p = await cameraRef.current?.takePhoto({});
//       if (p?.path) setFrontPhoto(p.path);

//       setTimeout(() => setAutoCaptureEnabled(true), 900);
//       return;
//     }

//     // THEN SIDE PHOTO
//     if (!sidePhoto) {
//       const p = await cameraRef.current?.takePhoto({});
//       if (p?.path) setSidePhoto(p.path);

//       setTimeout(() => setAutoCaptureEnabled(true), 900);
//       return;
//     }
//   }

//   useEffect(() => {
//     if (alignmentScore === 1) {
//       autoCapture();
//     }
//   }, [alignmentScore]);

//   // ---------------------------------------------------------
//   // RUN MEASUREMENTS WHEN BOTH PHOTOS ARE READY
//   // ---------------------------------------------------------
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);

//       try {
//         const cleanFront = frontPhoto.replace('file://', '');
//         const cleanSide = sidePhoto.replace('file://', '');

//         const heightCm = 178;

//         const result = await measureBody(cleanFront, cleanSide, heightCm);
//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }

//       setIsProcessing(false);
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // ---------------------------------------------------------
//   // SAVE MEASUREMENTS
//   // ---------------------------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;
//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());
//       Alert.alert('Saved', 'Measurements saved to profile');
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // ---------------------------------------------------------
//   // RESET EVERYTHING
//   // ---------------------------------------------------------
//   const resetAll = () => {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setIsProcessing(false);
//     setAutoCaptureEnabled(true);
//   };

//   // ---------------------------------------------------------
//   // LOADING CAMERA
//   // ---------------------------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ---------------------------------------------------------
//   // RESULT SCREEN
//   // ---------------------------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([key, value]) => (
//             <View key={key} style={styles.row}>
//               <Text style={styles.label}>{key}</Text>
//               <Text style={styles.value}>{value} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>
//             {isSaving ? 'Saving…' : 'Save To Profile'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // ---------------------------------------------------------
//   // CAMERA SCREEN (NO FRAME PROCESSOR)
//   // ---------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         photo={true}
//         style={{flex: 1}}
//       />

//       <GuidedCaptureOverlay onAligned={() => {}} />

//       <View style={styles.alignmentBox}>
//         <Text style={styles.alignmentText}>Aligned</Text>
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // STYLES
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   text: {color: '#fff'},
//   header: {
//     color: '#fff',
//     fontSize: 32,
//     margin: 20,
//     fontWeight: '700',
//   },
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#111',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   alignmentBox: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },
//   alignmentText: {color: 'white', fontSize: 18, fontWeight: '600'},
// });

// //////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Image,
//   Alert,
//   Platform,
// } from 'react-native';

// import {
//   Camera,
//   useCameraDevices,
//   useFrameProcessor,
// } from 'react-native-vision-camera';
// import {runOnJS} from 'react-native-reanimated';

// import {checkAlignment} from '../components/FrameProcessors/CheckAlignment';
// import {measureBody} from '../native/measurementModule';

// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   const [alignmentScore, setAlignmentScore] = useState(0);
//   const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);

//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // PERMISSIONS
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ---------------------------------------------------------
//   // FRAME PROCESSOR — LIVE ALIGNMENT
//   // ---------------------------------------------------------
//   const frameProcessor = useFrameProcessor(frame => {
//     'worklet';
//     const score = checkAlignment(frame);
//     runOnJS(setAlignmentScore)(score);
//   }, []);

//   // ---------------------------------------------------------
//   // AUTO-CAPTURE LOGIC
//   // ---------------------------------------------------------
//   async function autoCapture() {
//     if (!autoCaptureEnabled) return;
//     if (alignmentScore < 0.92) return; // must be aligned

//     if (!frontPhoto) {
//       const p = await cameraRef.current?.takePhoto({});
//       if (p?.path) {
//         runOnJS(setFrontPhoto)(p.path);
//       }
//       return;
//     }

//     if (!sidePhoto) {
//       const p = await cameraRef.current?.takePhoto({});
//       if (p?.path) {
//         runOnJS(setSidePhoto)(p.path);
//       }
//       return;
//     }
//   }

//   // run auto-capture when alignment is high
//   useEffect(() => {
//     if (alignmentScore >= 0.92) {
//       autoCapture();
//     }
//   }, [alignmentScore]);

//   // ---------------------------------------------------------
//   // RUN MEASUREMENTS WHEN BOTH PHOTOS TAKEN
//   // ---------------------------------------------------------
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);

//       try {
//         const cleanFront = frontPhoto.replace('file://', '');
//         const cleanSide = sidePhoto.replace('file://', '');

//         const heightCm = 178;

//         const result = await measureBody(cleanFront, cleanSide, heightCm);
//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }

//       setIsProcessing(false);
//     }
//     go();
//   }, [frontPhoto, sidePhoto]);

//   // ---------------------------------------------------------
//   // SAVE MEASUREMENTS
//   // ---------------------------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;
//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();
//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error(await res.text());
//       Alert.alert('Saved', 'Measurements saved to profile');
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // RESET FLOW
//   const resetAll = () => {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setIsProcessing(false);
//     setAutoCaptureEnabled(true);
//   };

//   // ---------------------------------------------------------
//   // LOADING CAMERA
//   // ---------------------------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ---------------------------------------------------------
//   // RESULT SCREEN
//   // ---------------------------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
//         <Text style={styles.header}>Your Measurements</Text>

//         <View style={styles.card}>
//           {Object.entries(measurementResult).map(([key, value]) => (
//             <View key={key} style={styles.row}>
//               <Text style={styles.label}>{key}</Text>
//               <Text style={styles.value}>{value} cm</Text>
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={saveToProfile} style={styles.saveButton}>
//           <Text style={styles.buttonText}>
//             {isSaving ? 'Saving…' : 'Save To Profile'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.buttonText}>Restart</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // ---------------------------------------------------------
//   // CAMERA SCREEN
//   // ---------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         photo={true}
//         frameProcessor={frameProcessor}
//         frameProcessorFps={5}
//         style={{flex: 1}}
//       />

//       {/* OVERLAY */}
//       <Image
//         source={
//           !frontPhoto
//             ? require('../../assets/measurement/front_overlay.png')
//             : require('../../assets/measurement/side_overlay.png')
//         }
//         style={styles.overlay}
//         resizeMode="contain"
//       />

//       <View style={styles.alignmentBox}>
//         <Text style={styles.alignmentText}>
//           Alignment: {(alignmentScore * 100).toFixed(0)}%
//         </Text>
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // STYLES
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#000',
//   },
//   text: {color: '#fff'},
//   header: {
//     color: '#fff',
//     fontSize: 32,
//     margin: 20,
//     fontWeight: '700',
//   },
//   card: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     margin: 20,
//     padding: 16,
//     borderRadius: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },
//   label: {color: '#bbb', fontSize: 16},
//   value: {color: '#fff', fontSize: 16},
//   saveButton: {
//     backgroundColor: '#222',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 25,
//     borderRadius: 14,
//   },
//   retakeButton: {
//     backgroundColor: '#111',
//     padding: 16,
//     marginHorizontal: 20,
//     marginTop: 18,
//     borderRadius: 14,
//   },
//   buttonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   overlay: {
//     position: 'absolute',
//     width: '100%',
//     height: '100%',
//     opacity: 0.55,
//   },
//   alignmentBox: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },
//   alignmentText: {color: 'white', fontSize: 18, fontWeight: '600'},
// });

// //////////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Platform,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {measureBody} from '../native/measurementModule';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useAuth0} from 'react-native-auth0';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);
//   const {user} = useAuth0();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);
//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // CAMERA PERMISSIONS
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       console.log('📸 CAMERA PERMISSION STATUS:', status);
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ---------------------------------------------------------
//   // CAPTURE FUNCTIONS (YOU WERE MISSING THESE)
//   // ---------------------------------------------------------
//   async function captureFrontPhoto() {
//     try {
//       const photo = await cameraRef.current?.takePhoto({});
//       if (photo?.path) {
//         console.log('📸 FRONT PHOTO:', photo.path);
//         setFrontPhoto(photo.path);
//       }
//     } catch (err) {
//       console.error('❌ FRONT capture error:', err);
//     }
//   }

//   async function captureSidePhoto() {
//     try {
//       const photo = await cameraRef.current?.takePhoto({});
//       if (photo?.path) {
//         console.log('📸 SIDE PHOTO:', photo.path);
//         setSidePhoto(photo.path);
//       }
//     } catch (err) {
//       console.error('❌ SIDE capture error:', err);
//     }
//   }

//   // ---------------------------------------------------------
//   // RUN MEASUREMENTS AFTER BOTH PHOTOS TAKEN
//   // ---------------------------------------------------------
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);

//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       try {
//         const heightCm = 178; // user height for scaling
//         const result = await measureBody(cleanFront, cleanSide, heightCm);
//         console.log('📏 MEASUREMENTS RESULT:', result);

//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }

//       setIsProcessing(false);
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // ---------------------------------------------------------
//   // SAVE TO PROFILE API CALL
//   // ---------------------------------------------------------
//   async function saveToProfile() {
//     if (!measurementResult) return;

//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();

//       const userId = await AsyncStorage.getItem('user_id');
//       if (!userId) throw new Error('Missing user ID');

//       const payload = {
//         chest: Math.round(measurementResult.chestCircumferenceCm),
//         waist: Math.round(measurementResult.waistCircumferenceCm),
//         hip: Math.round(measurementResult.hipCircumferenceCm),
//         shoulder_width: Math.round(measurementResult.shoulderWidthCm),
//         inseam: Math.round(measurementResult.inseamCm || 0),
//       };

//       console.log('📤 Sending payload:', payload);

//       const res = await fetch(`${API_BASE_URL}/style-profiles/${userId}`, {
//         method: 'PATCH',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const text = await res.text();
//         throw new Error(text || 'Failed to save');
//       }

//       Alert.alert('Saved', 'Measurements saved to your profile.');
//     } catch (err) {
//       console.log('❌ Save error:', err);
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // RESET FLOW
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setIsProcessing(false);
//     setIsSaving(false);
//   }

//   // CAMERA LOADING UI
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#fff" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ---------------------------------------------------------
//   // RESULTS SCREEN
//   // ---------------------------------------------------------
//   if (measurementResult) {
//     return (
//       <ScrollView
//         style={{flex: 1, backgroundColor: '#000'}}
//         contentContainerStyle={{paddingBottom: 60}}>
//         <Text style={styles.appleHeader}>Your Measurements</Text>

//         <View style={styles.glassCard}>
//           {Object.entries(measurementResult).map(([key, value], index) => (
//             <View key={key}>
//               <View style={styles.row}>
//                 <Text style={styles.label}>{formatLabel(key)}</Text>
//                 <Text style={styles.value}>{String(value)} cm</Text>
//               </View>

//               {index !== Object.entries(measurementResult).length - 1 && (
//                 <View style={styles.separator} />
//               )}
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity
//           onPress={saveToProfile}
//           style={[styles.retakeButton, {backgroundColor: '#2c2c2e'}]}>
//           <Text style={styles.retakeText}>
//             {isSaving ? 'Saving…' : 'Save Measurements'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.retakeText}>Retake Photos</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // ---------------------------------------------------------
//   // CAMERA UI
//   // ---------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       {(!frontPhoto || !sidePhoto) && (
//         <Camera
//           ref={cameraRef}
//           device={device}
//           isActive={true}
//           photo={true}
//           style={{flex: 1}}
//         />
//       )}

//       <View style={styles.controls}>
//         {!frontPhoto ? (
//           <TouchableOpacity onPress={captureFrontPhoto} style={styles.button}>
//             <Text style={styles.text}>Capture FRONT Photo</Text>
//           </TouchableOpacity>
//         ) : !sidePhoto ? (
//           <TouchableOpacity onPress={captureSidePhoto} style={styles.button}>
//             <Text style={styles.text}>Capture SIDE Photo</Text>
//           </TouchableOpacity>
//         ) : isProcessing ? (
//           <Text style={styles.text}>Processing…</Text>
//         ) : null}
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // HELPERS
// // ---------------------------------------------------------
// function formatLabel(key: string) {
//   return key
//     .replace(/([A-Z])/g, ' $1')
//     .replace(/_/g, ' ')
//     .replace(/\bcm\b/i, '')
//     .replace(/\s+/g, ' ')
//     .trim()
//     .replace(/\b\w/g, c => c.toUpperCase());
// }

// // ---------------------------------------------------------
// // STYLES
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'black',
//   },
//   text: {color: 'white', fontSize: 16},

//   appleHeader: {
//     color: 'white',
//     fontSize: 32,
//     fontWeight: '700',
//     paddingTop: 20,
//     paddingHorizontal: 22,
//     marginBottom: 24,
//   },

//   glassCard: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     marginHorizontal: 20,
//     padding: 18,
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.15)',
//     backdropFilter: Platform.OS === 'ios' ? 'blur(20px)' : undefined,
//   },

//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },

//   label: {
//     color: '#A9A9A9',
//     fontSize: 16,
//   },
//   value: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   separator: {
//     height: 1,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//   },

//   retakeButton: {
//     backgroundColor: '#1c1c1e',
//     padding: 16,
//     marginTop: 32,
//     marginHorizontal: 20,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.12)',
//   },

//   retakeText: {
//     color: 'white',
//     fontSize: 16,
//     textAlign: 'center',
//     fontWeight: '600',
//   },

//   controls: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },

//   button: {
//     padding: 14,
//     backgroundColor: '#222',
//     borderRadius: 12,
//     marginBottom: 46,
//   },
// });

// /////////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Platform,
//   Alert,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {measureBody} from '../native/measurementModule';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);
//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // CAMERA PERMISSIONS
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       console.log('📸 CAMERA PERMISSION STATUS:', status);
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // RUN MEASUREMENT WHEN BOTH PHOTOS AVAILABLE
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);

//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       try {
//         const heightCm = 178;
//         const result = await measureBody(cleanFront, cleanSide, heightCm);
//         console.log('📏 MEASUREMENTS RESULT:', result);

//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }

//       setIsProcessing(false);
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // SAVE TO PROFILE
//   async function saveToProfile() {
//     if (!measurementResult) return;

//     setIsSaving(true);

//     try {
//       const token = await getAccessToken();

//       const res = await fetch(
//         `${API_BASE_URL}/users/style-profile/measur`,
//         {
//           method: 'PATCH',
//           headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(measurementResult),
//         },
//       );

//       if (!res.ok) throw new Error('Failed to save');

//       Alert.alert('Saved', 'Measurements saved to your profile.');
//     } catch (err) {
//       console.log('❌ Save error:', err);
//       Alert.alert('Error', 'Failed to save measurements.');
//     }

//     setIsSaving(false);
//   }

//   // RESET FLOW
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setIsProcessing(false);
//     setIsSaving(false);
//   }

//   // CAMERA LOADING UI
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#fff" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // RESULT SCREEN
//   if (measurementResult) {
//     return (
//       <ScrollView
//         style={{flex: 1, backgroundColor: '#000'}}
//         contentContainerStyle={{paddingBottom: 60}}>
//         <Text style={styles.appleHeader}>Your Measurements</Text>

//         <View style={styles.glassCard}>
//           {Object.entries(measurementResult).map(([key, value], index) => (
//             <View key={key}>
//               <View style={styles.row}>
//                 <Text style={styles.label}>{formatLabel(key)}</Text>
//                 <Text style={styles.value}>{String(value)} cm</Text>
//               </View>

//               {index !== Object.entries(measurementResult).length - 1 && (
//                 <View style={styles.separator} />
//               )}
//             </View>
//           ))}
//         </View>

//         {/* SAVE BUTTON */}
//         <TouchableOpacity
//           onPress={saveToProfile}
//           style={[styles.retakeButton, {backgroundColor: '#2c2c2e'}]}>
//           <Text style={styles.retakeText}>
//             {isSaving ? 'Saving…' : 'Save Measurements'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.retakeText}>Retake Photos</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // CAMERA UI
//   return (
//     <View style={{flex: 1}}>
//       {(!frontPhoto || !sidePhoto) && (
//         <Camera
//           ref={cameraRef}
//           device={device}
//           isActive={true}
//           photo={true}
//           style={{flex: 1}}
//         />
//       )}

//       <View style={styles.controls}>
//         {!frontPhoto ? (
//           <TouchableOpacity onPress={captureFrontPhoto} style={styles.button}>
//             <Text style={styles.text}>Capture FRONT Photo</Text>
//           </TouchableOpacity>
//         ) : !sidePhoto ? (
//           <TouchableOpacity onPress={captureSidePhoto} style={styles.button}>
//             <Text style={styles.text}>Capture SIDE Photo</Text>
//           </TouchableOpacity>
//         ) : isProcessing ? (
//           <Text style={styles.text}>Processing…</Text>
//         ) : null}
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // HELPERS
// // ---------------------------------------------------------
// function formatLabel(key: string) {
//   return key
//     .replace(/([A-Z])/g, ' $1')
//     .replace(/_/g, ' ')
//     .replace(/\bcm\b/i, '')
//     .replace(/\s+/g, ' ')
//     .trim()
//     .replace(/\b\w/g, c => c.toUpperCase());
// }

// // ---------------------------------------------------------
// // STYLES
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'black',
//   },
//   text: {color: 'white', fontSize: 16},

//   appleHeader: {
//     color: 'white',
//     fontSize: 32,
//     fontWeight: '700',
//     paddingTop: 20,
//     paddingHorizontal: 22,
//     marginBottom: 24,
//   },

//   glassCard: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     marginHorizontal: 20,
//     padding: 18,
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.15)',
//     backdropFilter: Platform.OS === 'ios' ? 'blur(20px)' : undefined,
//   },

//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },

//   label: {
//     color: '#A9A9A9',
//     fontSize: 16,
//   },
//   value: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   separator: {
//     height: 1,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//   },

//   retakeButton: {
//     backgroundColor: '#1c1c1e',
//     padding: 16,
//     marginTop: 32,
//     marginHorizontal: 20,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.12)',
//   },

//   retakeText: {
//     color: 'white',
//     fontSize: 16,
//     textAlign: 'center',
//     fontWeight: '600',
//   },

//   controls: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },

//   button: {
//     padding: 14,
//     backgroundColor: '#222',
//     borderRadius: 12,
//     marginBottom: 46,
//   },
// });

// /////////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Platform,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {measureBody} from '../native/measurementModule';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);

//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);
//   const [measurementResult, setMeasurementResult] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);

//   // CAMERA PERMISSIONS
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       console.log('📸 CAMERA PERMISSION STATUS:', status);
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // RUN MEASUREMENT
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       setIsProcessing(true);

//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       try {
//         const heightCm = 178;
//         const result = await measureBody(cleanFront, cleanSide, heightCm);
//         console.log('📏 MEASUREMENTS RESULT:', result);

//         setMeasurementResult(result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }

//       setIsProcessing(false);
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // CAPTURE FRONT
//   async function captureFrontPhoto() {
//     try {
//       const photo = await cameraRef.current?.takePhoto({});
//       if (photo?.path) {
//         console.log('📸 FRONT:', photo.path);
//         setFrontPhoto(photo.path);
//       }
//     } catch (err) {
//       console.error('❌ FRONT capture error:', err);
//     }
//   }

//   // CAPTURE SIDE
//   async function captureSidePhoto() {
//     try {
//       const photo = await cameraRef.current?.takePhoto({});
//       if (photo?.path) {
//         console.log('📸 SIDE:', photo.path);
//         setSidePhoto(photo.path);
//       }
//     } catch (err) {
//       console.error('❌ SIDE capture error:', err);
//     }
//   }

//   // RESET FLOW
//   function resetAll() {
//     setFrontPhoto(null);
//     setSidePhoto(null);
//     setMeasurementResult(null);
//     setIsProcessing(false);
//   }

//   // CAMERA LOADING UI
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#fff" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // 🍎 APPLE-STYLE RESULTS UI
//   if (measurementResult) {
//     return (
//       <ScrollView
//         style={{flex: 1, backgroundColor: '#000'}}
//         contentContainerStyle={{paddingBottom: 60}}>
//         <Text style={styles.appleHeader}>Your Measurements</Text>

//         <View style={styles.glassCard}>
//           {Object.entries(measurementResult).map(([key, value], index) => (
//             <View key={key}>
//               <View style={styles.row}>
//                 <Text style={styles.label}>{formatLabel(key)}</Text>
//                 <Text style={styles.value}>{String(value)} cm</Text>
//               </View>

//               {/* Divider except last */}
//               {index !== Object.entries(measurementResult).length - 1 && (
//                 <View style={styles.separator} />
//               )}
//             </View>
//           ))}
//         </View>

//         <TouchableOpacity onPress={resetAll} style={styles.retakeButton}>
//           <Text style={styles.retakeText}>Retake Photos</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   // CAMERA UI
//   return (
//     <View style={{flex: 1}}>
//       {(!frontPhoto || !sidePhoto) && (
//         <Camera
//           ref={cameraRef}
//           device={device}
//           isActive={true}
//           photo={true}
//           style={{flex: 1}}
//         />
//       )}

//       <View style={styles.controls}>
//         {!frontPhoto ? (
//           <TouchableOpacity onPress={captureFrontPhoto} style={styles.button}>
//             <Text style={styles.text}>Capture FRONT Photo</Text>
//           </TouchableOpacity>
//         ) : !sidePhoto ? (
//           <TouchableOpacity onPress={captureSidePhoto} style={styles.button}>
//             <Text style={styles.text}>Capture SIDE Photo</Text>
//           </TouchableOpacity>
//         ) : isProcessing ? (
//           <Text style={styles.text}>Processing…</Text>
//         ) : null}
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // HELPERS
// // ---------------------------------------------------------
// function formatLabel(key: string) {
//   return key
//     .replace(/([A-Z])/g, ' $1')
//     .replace(/_/g, ' ')
//     .replace(/\bcm\b/i, '')
//     .replace(/\s+/g, ' ')
//     .trim()
//     .replace(/\b\w/g, c => c.toUpperCase());
// }

// // ---------------------------------------------------------
// // STYLES — APPLE INSPIRED
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'black',
//   },
//   text: {color: 'white', fontSize: 16},

//   appleHeader: {
//     color: 'white',
//     fontSize: 32,
//     fontWeight: '700',
//     paddingTop: 20,
//     paddingHorizontal: 22,
//     marginBottom: 24,
//   },

//   glassCard: {
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     marginHorizontal: 20,
//     padding: 18,
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.15)',
//     backdropFilter: Platform.OS === 'ios' ? 'blur(20px)' : undefined,
//   },

//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//   },

//   label: {
//     color: '#A9A9A9',
//     fontSize: 16,
//   },
//   value: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   separator: {
//     height: 1,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//   },

//   retakeButton: {
//     backgroundColor: '#1c1c1e',
//     padding: 16,
//     marginTop: 32,
//     marginHorizontal: 20,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.12)',
//   },
//   retakeText: {
//     color: 'white',
//     fontSize: 16,
//     textAlign: 'center',
//     fontWeight: '600',
//   },

//   controls: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },
//   button: {
//     padding: 14,
//     backgroundColor: '#222',
//     borderRadius: 12,
//     marginBottom: 46,
//   },
// });

// ///////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
// } from 'react-native';

// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import CameraRoll from '@react-native-camera-roll/camera-roll';
// import {measureBody} from '../native/measurementModule';

// // ---------------------------------------------------------
// // SAVE TO CAMERA ROLL HELPER
// // ---------------------------------------------------------
// async function saveToCameraRoll(path: string) {
//   try {
//     const uri = path.startsWith('file://') ? path : `file://${path}`;

//     console.log('💾 Saving to Camera Roll:', uri);

//     const saved = await CameraRoll.save(uri, {
//       type: 'photo',
//       album: 'StylHelpr Measurements',
//     });

//     console.log('📸 Saved successfully:', saved);
//   } catch (err) {
//     console.error('❌ CameraRoll save failed:', err);
//   }
// }

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);

//   // ---------------------------------------------------------
//   // DEVICE SELECTION
//   // ---------------------------------------------------------
//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   // ---------------------------------------------------------
//   // CAMERA PERMISSIONS
//   // ---------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       console.log('📸 CAMERA PERMISSION STATUS:', status);
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ---------------------------------------------------------
//   // RUN MEASUREMENT WHEN BOTH PHOTOS EXIST
//   // ---------------------------------------------------------
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       console.log('🔥 runMeasurement() called');
//       console.log('🧼 CLEAN FRONT:', cleanFront);
//       console.log('🧼 CLEAN SIDE:', cleanSide);

//       try {
//         const heightCm = 178;
//         const result = await measureBody(cleanFront, cleanSide, heightCm);
//         console.log('📏 MEASUREMENTS RESULT:', result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // ---------------------------------------------------------
//   // CAPTURE FRONT PHOTO
//   // ---------------------------------------------------------
//   async function captureFrontPhoto() {
//     try {
//       const photo = await cameraRef.current?.takePhoto({});
//       if (photo?.path) {
//         console.log('📸 FRONT:', photo.path);

//         // Save the front photo
//         await saveToCameraRoll(photo.path);

//         setFrontPhoto(photo.path);
//       }
//     } catch (err) {
//       console.error('❌ FRONT capture error:', err);
//     }
//   }

//   // ---------------------------------------------------------
//   // CAPTURE SIDE PHOTO
//   // ---------------------------------------------------------
//   async function captureSidePhoto() {
//     try {
//       const photo = await cameraRef.current?.takePhoto({});
//       if (photo?.path) {
//         console.log('📸 SIDE:', photo.path);

//         // Save the side photo
//         await saveToCameraRoll(photo.path);

//         setSidePhoto(photo.path);
//       }
//     } catch (err) {
//       console.error('❌ SIDE capture error:', err);
//     }
//   }

//   // ---------------------------------------------------------
//   // LOADING UI
//   // ---------------------------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#fff" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ---------------------------------------------------------
//   // MAIN UI
//   // ---------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         photo={true}
//         style={{flex: 1}}
//       />

//       <View style={styles.controls}>
//         {!frontPhoto ? (
//           <TouchableOpacity onPress={captureFrontPhoto} style={styles.button}>
//             <Text style={styles.text}>Capture FRONT Photo</Text>
//           </TouchableOpacity>
//         ) : !sidePhoto ? (
//           <TouchableOpacity onPress={captureSidePhoto} style={styles.button}>
//             <Text style={styles.text}>Capture SIDE Photo</Text>
//           </TouchableOpacity>
//         ) : (
//           <Text style={styles.text}>Processing…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // STYLES
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'black',
//   },
//   text: {
//     color: 'white',
//     fontSize: 16,
//   },
//   controls: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },
//   button: {
//     padding: 14,
//     backgroundColor: '#222',
//     borderRadius: 12,
//     marginBottom: 46,
//   },
// });

// /////////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   Platform,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {measureBody} from '../native/measurementModule';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);

//   // ---------------------------------------------------------
//   // MATCH YOUR BARCODE SCANNER'S EXACT DEVICE SELECTION LOGIC
//   // ---------------------------------------------------------
//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   // ---------------------------------------------------------
//   // PERMISSIONS (EXACTLY LIKE YOUR WORKING SCREEN)
//   // ---------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       console.log('📸 CAMERA PERMISSION STATUS:', status);
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ---------------------------------------------------------
//   // RUN MEASUREMENT — FIXED (triggered by useEffect)
//   // ---------------------------------------------------------
//   useEffect(() => {
//     async function go() {
//       if (!frontPhoto || !sidePhoto) return;

//       const cleanFront = frontPhoto.replace('file://', '');
//       const cleanSide = sidePhoto.replace('file://', '');

//       console.log('🔥 runMeasurement() called');
//       console.log('🧼 CLEAN FRONT:', cleanFront);
//       console.log('🧼 CLEAN SIDE:', cleanSide);

//       try {
//         const heightCm = 178;
//         const result = await measureBody(cleanFront, cleanSide, heightCm);
//         console.log('📏 MEASUREMENTS RESULT:', result);
//       } catch (err) {
//         console.log('❌ Measurement Error:', err);
//       }
//     }

//     go();
//   }, [frontPhoto, sidePhoto]);

//   // ---------------------------------------------------------
//   // CAPTURE FRONT PHOTO
//   // ---------------------------------------------------------
//   async function captureFrontPhoto() {
//     const photo = await cameraRef.current?.takePhoto({quality: 90});
//     if (photo?.path) {
//       console.log('📸 FRONT:', photo.path);
//       setFrontPhoto(photo.path);
//     }
//   }

//   // ---------------------------------------------------------
//   // CAPTURE SIDE PHOTO
//   // ---------------------------------------------------------
//   async function captureSidePhoto() {
//     const photo = await cameraRef.current?.takePhoto({quality: 90});
//     if (photo?.path) {
//       console.log('📸 SIDE:', photo.path);
//       setSidePhoto(photo.path);
//     }
//   }

//   // ---------------------------------------------------------
//   // CONDITIONAL RENDER (MATCH YOUR APP PATTERN)
//   // ---------------------------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#fff" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ---------------------------------------------------------
//   // MAIN RENDER
//   // ---------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         photo={true}
//         style={{flex: 1}}
//       />

//       <View style={styles.controls}>
//         {!frontPhoto ? (
//           <TouchableOpacity onPress={captureFrontPhoto} style={styles.button}>
//             <Text style={styles.text}>Capture FRONT Photo</Text>
//           </TouchableOpacity>
//         ) : !sidePhoto ? (
//           <TouchableOpacity onPress={captureSidePhoto} style={styles.button}>
//             <Text style={styles.text}>Capture SIDE Photo</Text>
//           </TouchableOpacity>
//         ) : (
//           <Text style={styles.text}>Processing…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // STYLES
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'black',
//   },
//   text: {
//     color: 'white',
//     fontSize: 16,
//   },
//   controls: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },
//   button: {
//     padding: 14,
//     backgroundColor: '#222',
//     borderRadius: 12,
//     marginBottom: 46,
//   },
// });

// ///////////////

// // src/screens/MeasurementsScreen.tsx

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   Platform,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {measureBody} from '../native/measurementModule';

// export default function MeasurementsScreen() {
//   const cameraRef = useRef<Camera>(null);

//   // ---------------------------------------------------------
//   // MATCH YOUR BARCODE SCANNER'S EXACT DEVICE SELECTION LOGIC
//   // ---------------------------------------------------------
//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;

//   const [hasPermission, setHasPermission] = useState(false);
//   const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
//   const [sidePhoto, setSidePhoto] = useState<string | null>(null);

//   // ---------------------------------------------------------
//   // PERMISSIONS (EXACTLY LIKE YOUR WORKING SCREEN)
//   // ---------------------------------------------------------
//   useEffect(() => {
//     (async () => {
//       let status;
//       if (Platform.OS === 'ios') {
//         status = await Camera.requestCameraPermission();
//       } else {
//         status = await Camera.requestCameraPermission(); // Android handled internally
//       }

//       console.log('📸 CAMERA PERMISSION STATUS:', status);

//       // Accept both iOS ("authorized") and Android ("granted")
//       setHasPermission(status === 'authorized' || status === 'granted');
//     })();
//   }, []);

//   // ---------------------------------------------------------
//   // RUN MEASUREMENT WHEN BOTH PHOTOS EXIST
//   // ---------------------------------------------------------
//   async function runMeasurement() {
//     if (!frontPhoto || !sidePhoto) return;

//     // ---------------------------------------------------------
//     // REQUIRED FIX: Remove "file://" so Swift can load the images
//     // ---------------------------------------------------------
//     const cleanFront = frontPhoto.replace('file://', '');
//     const cleanSide = sidePhoto.replace('file://', '');

//     try {
//       const heightCm = 178; // TODO: replace with profile height
//       const result = await measureBody(cleanFront, cleanSide, heightCm);

//       console.log('📏 MEASUREMENTS:', result);
//     } catch (err) {
//       console.log('❌ Measurement Error:', err);
//     }
//   }

//   // ---------------------------------------------------------
//   // CAPTURE FRONT PHOTO
//   // ---------------------------------------------------------
//   async function captureFrontPhoto() {
//     const photo = await cameraRef.current?.takePhoto({quality: 90});
//     if (photo?.path) {
//       setFrontPhoto(photo.path);
//       console.log('📸 FRONT:', photo.path);
//     }
//   }

//   // ---------------------------------------------------------
//   // CAPTURE SIDE PHOTO
//   // ---------------------------------------------------------
//   async function captureSidePhoto() {
//     const photo = await cameraRef.current?.takePhoto({quality: 90});
//     if (photo?.path) {
//       setSidePhoto(photo.path);
//       console.log('📸 SIDE:', photo.path);

//       // auto-measure
//       runMeasurement();
//     }
//   }

//   // ---------------------------------------------------------
//   // CONDITIONAL RENDER (MATCH YOUR APP PATTERN)
//   // ---------------------------------------------------------
//   if (!hasPermission || !device) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#fff" />
//         <Text style={styles.text}>Loading camera…</Text>
//       </View>
//     );
//   }

//   // ---------------------------------------------------------
//   // MAIN RENDER
//   // ---------------------------------------------------------
//   return (
//     <View style={{flex: 1}}>
//       <Camera
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         photo={true}
//         style={{flex: 1}}
//       />

//       <View style={styles.controls}>
//         {!frontPhoto ? (
//           <TouchableOpacity onPress={captureFrontPhoto} style={styles.button}>
//             <Text style={styles.text}>Capture FRONT Photo</Text>
//           </TouchableOpacity>
//         ) : !sidePhoto ? (
//           <TouchableOpacity onPress={captureSidePhoto} style={styles.button}>
//             <Text style={styles.text}>Capture SIDE Photo</Text>
//           </TouchableOpacity>
//         ) : (
//           <Text style={styles.text}>Processing…</Text>
//         )}
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // STYLES
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'black',
//   },
//   text: {
//     color: 'white',
//     fontSize: 16,
//   },
//   controls: {
//     position: 'absolute',
//     bottom: 40,
//     alignSelf: 'center',
//   },
//   button: {
//     padding: 14,
//     backgroundColor: '#222',
//     borderRadius: 12,
//     marginBottom: 46,
//   },
// });
