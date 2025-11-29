// MeasurementLiveScreen.tsx
// StylIQ

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
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
    </View>
  );
}

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
