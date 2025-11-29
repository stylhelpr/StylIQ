// MeshPreviewScreen.tsx — StylIQ
import React, {useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  NativeModules,
} from 'react-native';
import ARKitView from '../components/features/ARKitView';
import {buildMeshVertices} from '../utils/buildMeshVerticles';
import {normalizeJoints} from '../utils/normalizeJoints';
import {useMeasurementStore} from '../../../../store/measurementStore';
import {useAppTheme} from '../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const {ARKitModule} = NativeModules;

interface MeshPreviewScreenProps {
  navigate: (screen: string) => void;
}

export default function MeshPreviewScreen({navigate}: MeshPreviewScreenProps) {
  const {theme} = useAppTheme();
  const {frontJoints: front, sideJoints: side} = useMeasurementStore();

  useEffect(() => {
    if (!front || !side) return;
    const normalized = normalizeJoints(front, side);
    const vertices = buildMeshVertices(normalized);
    console.log(
      '🟢 MeshPreviewScreen → rendering',
      vertices.length / 3,
      'points',
    );
    ARKitModule.renderMesh(Array.from(vertices));
  }, [front, side]);

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* --- AR view --- */}
      <ARKitView style={StyleSheet.absoluteFill} />

      {/* --- overlay UI --- */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>MESH PREVIEW</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, {backgroundColor: theme.colors.button1}]}
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactMedium');
          useMeasurementStore.getState().computeResults(1.78); // user height in meters
          navigate('MeasurementResultsManualScreen');
        }}>
        <Text style={[styles.buttonText, {color: theme.colors.foreground}]}>
          Continue to Results
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  banner: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    paddingVertical: 8,
    backgroundColor: '#66FF99',
    alignItems: 'center',
    opacity: 0.85,
    zIndex: 10,
  },
  bannerText: {fontSize: 16, fontWeight: '700', color: '#000'},
  button: {
    position: 'absolute',
    bottom: 60,
    width: '80%',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {fontSize: 18, fontWeight: '600'},
});

//////////////////

// // MeshPreviewScreen.tsx — StylIQ
// import React, {useEffect} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   NativeModules,
// } from 'react-native';
// import ARKitView from '../components/features/ARKitView';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import {useAppTheme} from '../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {ARKitModule} = NativeModules;

// interface MeshPreviewScreenProps {
//   navigate: (screen: string) => void;
// }

// export default function MeshPreviewScreen({navigate}: MeshPreviewScreenProps) {
//   const {theme} = useAppTheme();
//   const {frontJoints: front, sideJoints: side} = useMeasurementStore();

//   useEffect(() => {
//     if (!front || !side) return;
//     const normalized = normalizeJoints(front, side);
//     const vertices = buildMeshVertices(normalized);
//     console.log(
//       '🟢 MeshPreviewScreen → rendering',
//       vertices.length / 3,
//       'points',
//     );
//     ARKitModule.renderMesh(Array.from(vertices));
//   }, [front, side]);

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* --- AR view --- */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* --- overlay UI --- */}
//       <View style={styles.banner}>
//         <Text style={styles.bannerText}>MESH PREVIEW</Text>
//       </View>

//       <TouchableOpacity
//         style={[styles.button, {backgroundColor: theme.colors.button1}]}
//         onPress={() => {
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           navigate('MeasurementResultsManualScreen');
//         }}>
//         <Text style={[styles.buttonText, {color: theme.colors.foreground}]}>
//           Continue to Results
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
//   banner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     paddingVertical: 8,
//     backgroundColor: '#66FF99',
//     alignItems: 'center',
//     opacity: 0.85,
//     zIndex: 10,
//   },
//   bannerText: {fontSize: 16, fontWeight: '700', color: '#000'},
//   button: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   buttonText: {fontSize: 18, fontWeight: '600'},
// });
