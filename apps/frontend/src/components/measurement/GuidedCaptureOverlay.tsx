// src/components/measurement/GuidedCaptureOverlay.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';

type Props = {
  mode: 'front' | 'side';
  guidance: string;
};

export default function GuidedCaptureOverlay({mode, guidance}: Props) {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <View style={styles.stepBox}>
        <Text style={styles.stepText}>
          {mode === 'front' ? 'Step 1 of 2' : 'Step 2 of 2'}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.silhouetteContainer,
          {
            transform: [{scale: pulseAnim}],
            borderColor: 'rgba(255,255,255,0.7)',
          },
        ]}>
        {mode === 'front' ? (
          <View style={styles.frontOutline} />
        ) : (
          <View style={styles.sideOutline} />
        )}
      </Animated.View>

      <Text style={styles.instructionText}>{guidance}</Text>
    </View>
  );
}

const OUTLINE_WIDTH = 240;
const OUTLINE_HEIGHT = 520;

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepBox: {
    position: 'absolute',
    top: 70,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  stepText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  silhouetteContainer: {
    width: OUTLINE_WIDTH,
    height: OUTLINE_HEIGHT,
    borderWidth: 2,
    borderRadius: OUTLINE_WIDTH * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frontOutline: {
    width: OUTLINE_WIDTH * 0.8,
    height: OUTLINE_HEIGHT * 0.85,
    borderWidth: 2,
    borderRadius: 120,
    borderColor: 'transparent',
  },
  sideOutline: {
    width: OUTLINE_WIDTH * 0.55,
    height: OUTLINE_HEIGHT * 0.85,
    borderWidth: 2,
    borderRadius: 140,
    borderColor: 'transparent',
  },
  instructionText: {
    marginTop: 24,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
});

/////////////////

// // src/components/measurement/GuidedCaptureOverlay.tsx
// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';

// type Props = {
//   mode: 'front' | 'side';
//   guidance: string;
// };

// export default function GuidedCaptureOverlay({mode, guidance}: Props) {
//   const [pulseAnim] = useState(new Animated.Value(1));

//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulseAnim, {
//           toValue: 1.15,
//           duration: 600,
//           useNativeDriver: true,
//         }),
//         Animated.timing(pulseAnim, {
//           toValue: 1,
//           duration: 600,
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, []);

//   return (
//     <View style={styles.overlayContainer} pointerEvents="none">
//       {/* 🔥 Step Indicator (SAFE ADDITION) */}
//       <View style={styles.stepBox}>
//         <Text style={styles.stepText}>
//           {mode === 'front' ? 'Step 1 of 2' : 'Step 2 of 2'}
//         </Text>
//       </View>

//       <Animated.View
//         style={[
//           styles.silhouetteContainer,
//           {
//             transform: [{scale: pulseAnim}],
//             borderColor: 'rgba(255,255,255,0.7)',
//           },
//         ]}>
//         {mode === 'front' ? (
//           <View style={styles.frontOutline} />
//         ) : (
//           <View style={styles.sideOutline} />
//         )}
//       </Animated.View>

//       <Text style={styles.instructionText}>{guidance}</Text>
//     </View>
//   );
// }

// const OUTLINE_WIDTH = 240;
// const OUTLINE_HEIGHT = 520;

// const styles = StyleSheet.create({
//   overlayContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   stepBox: {
//     position: 'absolute',
//     top: 70,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     paddingVertical: 6,
//     paddingHorizontal: 16,
//     borderRadius: 12,
//   },
//   stepText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   silhouetteContainer: {
//     width: OUTLINE_WIDTH,
//     height: OUTLINE_HEIGHT,
//     borderWidth: 2,
//     borderRadius: OUTLINE_WIDTH * 0.45,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   frontOutline: {
//     width: OUTLINE_WIDTH * 0.8,
//     height: OUTLINE_HEIGHT * 0.85,
//     borderWidth: 2,
//     borderRadius: 120,
//     borderColor: 'transparent',
//   },
//   sideOutline: {
//     width: OUTLINE_WIDTH * 0.55,
//     height: OUTLINE_HEIGHT * 0.85,
//     borderWidth: 2,
//     borderRadius: 140,
//     borderColor: 'transparent',
//   },
//   instructionText: {
//     marginTop: 24,
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//     textShadowColor: '#000',
//     textShadowOffset: {width: 1, height: 1},
//     textShadowRadius: 4,
//   },
// });

///////////////

// // src/components/measurement/GuidedCaptureOverlay.tsx
// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';

// type Props = {
//   mode: 'front' | 'side';
//   guidance: string;
// };

// export default function GuidedCaptureOverlay({mode, guidance}: Props) {
//   const [pulseAnim] = useState(new Animated.Value(1));

//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulseAnim, {
//           toValue: 1.15,
//           duration: 600,
//           useNativeDriver: true,
//         }),
//         Animated.timing(pulseAnim, {
//           toValue: 1,
//           duration: 600,
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, []);

//   return (
//     <View style={styles.overlayContainer} pointerEvents="none">
//       <Animated.View
//         style={[
//           styles.silhouetteContainer,
//           {
//             transform: [{scale: pulseAnim}],
//             borderColor: 'rgba(255,255,255,0.7)',
//           },
//         ]}>
//         {mode === 'front' ? (
//           <View style={styles.frontOutline} />
//         ) : (
//           <View style={styles.sideOutline} />
//         )}
//       </Animated.View>

//       <Text style={styles.instructionText}>{guidance}</Text>
//     </View>
//   );
// }

// const OUTLINE_WIDTH = 240;
// const OUTLINE_HEIGHT = 520;

// const styles = StyleSheet.create({
//   overlayContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   silhouetteContainer: {
//     width: OUTLINE_WIDTH,
//     height: OUTLINE_HEIGHT,
//     borderWidth: 2,
//     borderRadius: OUTLINE_WIDTH * 0.45,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   frontOutline: {
//     width: OUTLINE_WIDTH * 0.8,
//     height: OUTLINE_HEIGHT * 0.85,
//     borderWidth: 2,
//     borderRadius: 120,
//     borderColor: 'transparent',
//   },
//   sideOutline: {
//     width: OUTLINE_WIDTH * 0.55,
//     height: OUTLINE_HEIGHT * 0.85,
//     borderWidth: 2,
//     borderRadius: 140,
//     borderColor: 'transparent',
//   },
//   instructionText: {
//     marginTop: 24,
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//     textShadowColor: '#000',
//     textShadowOffset: {width: 1, height: 1},
//     textShadowRadius: 4,
//   },
// });

////////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';

// export default function GuidedCaptureOverlay({status}) {
//   if (!status) return null;

//   const {too_close, too_far, left_right, pose_ok} = status;

//   let message = '';
//   if (too_close) message = 'Move Back';
//   else if (too_far) message = 'Step Closer';
//   else if (left_right === 'left') message = 'Move Right';
//   else if (left_right === 'right') message = 'Move Left';
//   else if (pose_ok) message = 'Perfect Alignment';
//   else message = 'Align Your Body';

//   return (
//     <View style={styles.container}>
//       <Animatable.View duration={300} animation="fadeIn" style={styles.card}>
//         <BlurView style={styles.blur} blurType="light" blurAmount={10} />

//         <Text style={styles.text}>{message}</Text>
//       </Animatable.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     position: 'absolute',
//     top: 40,
//     width: '100%',
//     alignItems: 'center',
//     zIndex: 50,
//   },
//   card: {
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//   blur: {...StyleSheet.absoluteFillObject},
//   text: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
// });

///////////////////

// // src/components/measurement/GuidedCaptureOverlay.tsx

// import React, {
//   useEffect,
//   useRef,
//   useState,
//   forwardRef,
//   useImperativeHandle,
// } from 'react';
// import {View, Text, StyleSheet, Dimensions} from 'react-native';
// import Svg, {Path} from 'react-native-svg';
// import * as Animatable from 'react-native-animatable';
// import Haptic from 'react-native-haptic-feedback';

// const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// type Props = {
//   mode: 'front' | 'side';
//   onAlignmentChange: (aligned: boolean) => void;
// };

// // Imperative handle to receive metadata from MeasurementsScreen
// export type OverlayRef = {
//   updateFrame: (data: any) => void; // metadata from VisionCamera takePhoto result
// };

// const GuidedCaptureOverlay = forwardRef<OverlayRef, Props>(
//   ({mode, onAlignmentChange}, ref) => {
//     const [alignmentStatus, setAlignmentStatus] = useState<
//       'too_close' | 'too_far' | 'off_center' | 'aligned'
//     >('off_center');

//     const [label, setLabel] = useState('Align your body');
//     const lastAlignedRef = useRef(false);

//     // Expose updateFrame to parent
//     useImperativeHandle(ref, () => ({
//       updateFrame: data => {
//         if (!data || !data.metadata) return;

//         const regions =
//           data.metadata?.['{ExifAux}']?.Regions?.RegionList ?? null;

//         if (!regions || regions.length === 0) {
//           setStatus('off_center');
//           return;
//         }

//         // Face region (the only RegionList entry in your logs)
//         const face = regions[0];

//         // Face bounding box relative dimensions
//         const faceW = face.Width; // ratio 0–1
//         const faceX = face.X; // center-ish
//         const faceY = face.Y;

//         // === DISTANCE CHECK ===
//         if (faceW > 0.08) {
//           setStatus('too_close');
//           return;
//         }
//         if (faceW < 0.03) {
//           setStatus('too_far');
//           return;
//         }

//         // === CENTER CHECK ===
//         // If face X is near 0.5 horizontally we consider user centered.
//         const centerThreshold = 0.15; // tweakable
//         if (Math.abs(faceX - 0.5) > centerThreshold) {
//           setStatus('off_center');
//           return;
//         }

//         // If all checks passed
//         setStatus('aligned');
//       },
//     }));

//     // Set alignment and send callback
//     function setStatus(status: typeof alignmentStatus) {
//       setAlignmentStatus(status);

//       let lbl = '';

//       switch (status) {
//         case 'too_close':
//           lbl = 'Move Back';
//           break;
//         case 'too_far':
//           lbl = 'Move Closer';
//           break;
//         case 'off_center':
//           lbl = 'Center Yourself';
//           break;
//         case 'aligned':
//           lbl =
//             mode === 'front'
//               ? 'Perfect — Capture Front'
//               : 'Perfect — Capture Side';
//           break;
//       }

//       setLabel(lbl);

//       const isAligned = status === 'aligned';
//       onAlignmentChange(isAligned);

//       // Haptic feedback only on the moment alignment becomes true
//       if (isAligned && !lastAlignedRef.current) {
//         Haptic.trigger('impactMedium');
//       }
//       lastAlignedRef.current = isAligned;
//     }

//     return (
//       <View pointerEvents="none" style={styles.container}>
//         {/* Silhouette */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.silhouetteContainer}>
//           <Svg
//             width={SCREEN_WIDTH * 0.6}
//             height={SCREEN_HEIGHT * 0.6}
//             viewBox="0 0 200 600">
//             {/* Full body unisex silhouette outline */}
//             <Path
//               d="
//                 M100 5
//                 C80 20 60 45 60 80
//                 C60 120 80 150 100 150
//                 C120 150 140 120 140 80
//                 C140 45 120 20 100 5
//                 Z

//                 M100 150
//                 C60 160 45 200 45 250
//                 C45 300 60 350 100 360
//                 C140 350 155 300 155 250
//                 C155 200 140 160 100 150
//                 Z

//                 M60 360
//                 C50 420 55 480 70 540
//                 L90 540
//                 C95 480 95 420 90 360
//                 Z

//                 M140 360
//                 C150 420 145 480 130 540
//                 L110 540
//                 C105 480 105 420 110 360
//                 Z
//               "
//               stroke="#FFFFFF"
//               strokeWidth={4}
//               fill="none"
//               opacity={alignmentStatus === 'aligned' ? 1 : 0.6}
//             />
//           </Svg>
//         </Animatable.View>

//         {/* Instructions */}
//         <Animatable.Text
//           key={label}
//           animation="fadeInUp"
//           duration={250}
//           style={[
//             styles.label,
//             alignmentStatus === 'aligned' && {color: '#4CFF99'},
//             alignmentStatus === 'too_close' && {color: '#FF4444'},
//             alignmentStatus === 'too_far' && {color: '#FFBB33'},
//             alignmentStatus === 'off_center' && {color: '#FFFFFF'},
//           ]}>
//           {label}
//         </Animatable.Text>
//       </View>
//     );
//   },
// );

// export default GuidedCaptureOverlay;

// const styles = StyleSheet.create({
//   container: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   silhouetteContainer: {
//     marginBottom: 80,
//   },
//   label: {
//     fontSize: 22,
//     fontWeight: '600',
//     textAlign: 'center',
//     marginTop: 20,
//     color: '#fff',
//   },
// });

//////////////////////

// // src/components/measurement/GuidedCaptureOverlay.tsx
// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';

// export default function GuidedCaptureOverlay({aligned}: {aligned: boolean}) {
//   const [countdown, setCountdown] = useState<number | null>(null);
//   const [flashOpacity] = useState(new Animated.Value(0));

//   // EXPOSED GLOBAL EVENT
//   // MeasurementsScreen will call: global.showCountdown()
//   useEffect(() => {
//     global.showCountdown = () => {
//       setCountdown(3);

//       let c = 3;
//       const interval = setInterval(() => {
//         c -= 1;
//         if (c === 0) {
//           clearInterval(interval);
//           setCountdown(null);

//           // Flash animation
//           Animated.sequence([
//             Animated.timing(flashOpacity, {
//               toValue: 1,
//               duration: 80,
//               useNativeDriver: true,
//             }),
//             Animated.timing(flashOpacity, {
//               toValue: 0,
//               duration: 160,
//               useNativeDriver: true,
//             }),
//           ]).start();
//         } else {
//           setCountdown(c);
//         }
//       }, 1000);
//     };
//   }, []);

//   return (
//     <View style={styles.overlay} pointerEvents="none">
//       {/* Alignment box */}
//       <View style={styles.boxContainer}>
//         <View style={styles.box} />
//       </View>

//       {/* Hold Still text */}
//       {aligned && !countdown && (
//         <Text style={styles.holdStill}>Hold Still…</Text>
//       )}

//       {/* Countdown */}
//       {countdown && <Text style={styles.countdown}>{countdown}</Text>}

//       {/* Flash animation */}
//       <Animated.View style={[styles.flashOverlay, {opacity: flashOpacity}]} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   // Alignment box
//   boxContainer: {
//     marginTop: 40,
//     marginBottom: 160,
//   },
//   box: {
//     width: 240,
//     height: 420,
//     borderWidth: 3,
//     borderColor: 'rgba(255,255,255,0.6)',
//     borderRadius: 20,
//   },

//   holdStill: {
//     color: '#fff',
//     fontSize: 26,
//     marginTop: 20,
//     fontWeight: '600',
//   },

//   countdown: {
//     color: '#fff',
//     fontSize: 90,
//     fontWeight: '800',
//     marginTop: 40,
//   },

//   flashOverlay: {
//     position: 'absolute',
//     backgroundColor: '#fff',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 9999,
//   },
// });

////////////////////

// import React, {useEffect, useRef} from 'react';
// import {View, Text, StyleSheet, Dimensions, Animated} from 'react-native';
// import * as Haptics from 'react-native-haptic-feedback';

// const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

// export default function GuidedCaptureOverlay({aligned}: {aligned: boolean}) {
//   const scaleAnim = useRef(new Animated.Value(1)).current;

//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(scaleAnim, {
//           toValue: 1.06,
//           duration: 950,
//           useNativeDriver: true,
//         }),
//         Animated.timing(scaleAnim, {
//           toValue: 1.0,
//           duration: 950,
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, []);

//   useEffect(() => {
//     if (aligned) Haptics.trigger('impactMedium');
//   }, [aligned]);

//   return (
//     <View pointerEvents="none" style={StyleSheet.absoluteFill}>
//       <Animated.View
//         style={[styles.outlineContainer, {transform: [{scale: scaleAnim}]}]}>
//         <View style={styles.bodyOutline} />
//       </Animated.View>

//       <View style={styles.textContainer}>
//         <Text style={[styles.text, {color: aligned ? '#4ade80' : '#ffffff'}]}>
//           {aligned ? 'Aligned' : 'Align your body inside the outline'}
//         </Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   outlineContainer: {
//     position: 'absolute',
//     top: SCREEN_H * 0.12,
//     width: SCREEN_W * 0.7,
//     height: SCREEN_H * 0.6,
//     alignSelf: 'center',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   bodyOutline: {
//     width: '100%',
//     height: '100%',
//     borderRadius: 140,
//     borderWidth: 3,
//     borderColor: 'rgba(255,255,255,0.7)',
//     backgroundColor: 'rgba(255,255,255,0.06)',
//   },
//   textContainer: {
//     position: 'absolute',
//     bottom: 85,
//     alignSelf: 'center',
//   },
//   text: {
//     fontSize: 19,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
// });
