// MeasurementLiveScreen.tsx
// StylIQ

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {fontScale, moderateScale} from '../utils/scale';
import ARKitView from '../components/features/ARKitView';
import useLiveMeasurement from '../components/features/useLiveMeasurement';
import GhostOverlay from '../components/features/GhostOverlay';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// ✅ Responsive imports
import {useResponsive} from '../hooks/useResponsive';
import {useResponsiveTheme} from '../theme/responsiveTheme';

type Props = {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
};

export function MeasurementLiveScreen({navigate, goBack}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const joints = useLiveMeasurement();

  // ✅ Responsive helpers
  const {isXS, isSM} = useResponsive();
  const {spacing, typography} = useResponsiveTheme();

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleBack = () => {
    if (goBack) {
      goBack();
    } else {
      navigate('StyleProfileScreen');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    debugText: {
      color: theme.colors.foreground,
      fontSize: 16,
    },
    button: {
      position: 'absolute',
      bottom: 100,
      alignSelf: 'center', // ✅ works now that parent is relative
      backgroundColor: theme.colors.button1,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      width: 300, // or '85%' for responsive
    },
    buttonText: {
      color: theme.colors.buttonText1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {/* Native ARKit camera feed */}
      <ARKitView style={StyleSheet.absoluteFill} />

      <View
        style={[globalStyles.backContainer, {marginTop: 180, paddingLeft: 16}]}>
        <AppleTouchFeedback onPress={handleBack} hapticStyle="impactMedium">
          <MaterialIcons
            name="arrow-back"
            size={moderateScale(26)}
            color={theme.colors.button3}
          />
        </AppleTouchFeedback>
        <Text
          style={[
            globalStyles.backText,
            {marginLeft: spacing.sm, fontSize: typography.body},
          ]}>
          Back
        </Text>
      </View>

      {/* Help icon button */}
      <View
        style={{
          position: 'absolute',
          top: 140,
          right: 16,
        }}>
        <AppleTouchFeedback
          onPress={() => setShowHelpModal(true)}
          hapticStyle="impactLight">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcons
              name="help-outline"
              size={moderateScale(24)}
              color={theme.colors.buttonText1}
            />
          </View>
        </AppleTouchFeedback>
      </View>

      {/* Ghost mannequin overlay */}
      <GhostOverlay joints={joints} />

      {/* Debug text */}
      {/* <View style={styles.debugBox}>
        <Text style={styles.debugText}>
          Tracking joints: {Object.keys(joints).length}
        </Text>
      </View> */}

      {/* 🔥 Add this — direct button to launch front pose flow */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigate('MeasurementFrontScreen')}>
        <Text style={styles.buttonText}>Ready To Measure</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
        {/* <Text>Go Auto</Text> */}
      </TouchableOpacity>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHelpModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              maxHeight: '80%',
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: theme.colors.foreground,
                }}>
                How to Use
              </Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <MaterialIcons
                  name="close"
                  size={28}
                  color={theme.colors.foreground}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{gap: 20}}>
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: theme.colors.foreground,
                      marginBottom: 8,
                    }}>
                    Step 1: Position Yourself
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.colors.foreground2,
                      lineHeight: 22,
                    }}>
                    Stand 5-6 feet away from your device. Make sure you're in a
                    well-lit area with good lighting.
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: theme.colors.foreground,
                      marginBottom: 8,
                    }}>
                    Step 2: Follow the Ghost Overlay
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.colors.foreground2,
                      lineHeight: 22,
                    }}>
                    Align your body with the ghost mannequin overlay on screen.
                    Make sure your full body is visible from head to toe.
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: theme.colors.foreground,
                      marginBottom: 8,
                    }}>
                    Step 3: Stay Still
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.colors.foreground2,
                      lineHeight: 22,
                    }}>
                    Once positioned, stay as still as possible. The app will
                    track your body's key points for accurate measurements.
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: theme.colors.foreground,
                      marginBottom: 8,
                    }}>
                    Step 4: Begin Measuring
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.colors.foreground2,
                      lineHeight: 22,
                    }}>
                    When ready, tap "Ready To Measure" to begin the measurement
                    process. Follow the on-screen instructions for front and
                    side poses.
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: theme.colors.surface2,
                    padding: 16,
                    borderRadius: 12,
                    marginTop: 8,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: theme.colors.foreground,
                      marginBottom: 8,
                    }}>
                    Tips for Best Results:
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.foreground2,
                      lineHeight: 20,
                    }}>
                    • Wear form-fitting clothes{'\n'}• Remove bulky items like
                    jackets{'\n'}• Stand on a plain background{'\n'}• Make sure
                    your arms are slightly away from your body
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowHelpModal(false)}
              style={{
                backgroundColor: theme.colors.button1,
                paddingVertical: 14,
                borderRadius: 12,
                marginTop: 20,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: theme.colors.buttonText1,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                Got It
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

///////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// // ✅ Responsive imports
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   goBack?: () => void;
// };

// export function MeasurementLiveScreen({navigate, goBack}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();

//   // ✅ Responsive helpers
//   const {isXS, isSM} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   const handleBack = () => {
//     if (goBack) {
//       goBack();
//     } else {
//       navigate('StyleProfileScreen');
//     }
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#000',
//     },
//     debugText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     button: {
//       position: 'absolute',
//       bottom: 100,
//       alignSelf: 'center', // ✅ works now that parent is relative
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 14,
//       paddingHorizontal: 32,
//       borderRadius: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//       width: 300, // or '85%' for responsive
//     },
//     buttonText: {
//       color: theme.colors.buttonText1,
//       textAlign: 'center',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <View
//         style={[globalStyles.backContainer, {marginTop: 180, paddingLeft: 16}]}>
//         <AppleTouchFeedback onPress={handleBack} hapticStyle="impactMedium">
//           <MaterialIcons
//             name="arrow-back"
//             size={moderateScale(26)}
//             color={theme.colors.button3}
//           />
//         </AppleTouchFeedback>
//         <Text
//           style={[
//             globalStyles.backText,
//             {marginLeft: spacing.sm, fontSize: typography.body},
//           ]}>
//           Back
//         </Text>
//       </View>

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       {/* <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View> */}

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Ready To Measure</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
//         {/* <Text>Go Auto</Text> */}
//       </TouchableOpacity>
//     </View>
//   );
// }

/////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// type Props = {navigate: (screen: string, params?: any) => void};

// export function MeasurementLiveScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#000',
//     },
//     debugText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     button: {
//       position: 'absolute',
//       bottom: 100,
//       alignSelf: 'center', // ✅ works now that parent is relative
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 14,
//       paddingHorizontal: 32,
//       borderRadius: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//       width: 300, // or '85%' for responsive
//     },
//     buttonText: {
//       color: theme.colors.buttonText1,
//       textAlign: 'center',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View>

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Ready To Measure</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
//         <Text>Go Auto</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

/////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// type Props = {navigate: (screen: string, params?: any) => void};

// export function MeasurementLiveScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#000',
//     },
//     debugText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     button: {
//       position: 'absolute',
//       bottom: 80,
//       left: 0,
//       right: 0,
//       alignSelf: 'center',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 20,
//       paddingVertical: 12,
//       borderRadius: 12,
//     },
//     buttonText: {
//       color: theme.colors.buttonText1,
//       textAlign: 'center',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View>

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Ready To Measure</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
//         <Text>Go Auto</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

///////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// type Props = {navigate: (screen: string, params?: any) => void};

// export function MeasurementLiveScreen({navigate}: Props) {
//   const joints = useLiveMeasurement();

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View>

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Test Front Pose</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   debugBox: {
//     position: 'absolute',
//     top: 40,
//     left: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     backgroundColor: 'rgba(0,0,0,0.4)',
//     borderRadius: 8,
//   },
//   debugText: {
//     color: '#fff',
//     fontSize: 16,
//   },
//   button: {
//     position: 'absolute',
//     bottom: 80,
//     left: 0,
//     right: 0,
//     alignSelf: 'center',
//     backgroundColor: '#0A84FF',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 12,
//   },
//   buttonText: {
//     color: '#fff',
//     textAlign: 'center',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });
