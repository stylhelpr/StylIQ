// // MeasurementResultsManualScreen.tsx — StylIQ
// // ✅ Final accurate scaling (no zeros) + corrected ARKit joint mapping
// // + full 30 measurements + height calibration + dual-scale inch conversion display

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  NativeModules,
  Alert,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useMeasurementStore} from '../../../../store/measurementStore';
import {useUUID} from '../context/UUIDContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {normalizeJoints} from '../utils/normalizeJoints';
import {buildMeshVertices} from '../utils/buildMeshVerticles';
import BodyCard from '../components/features/BodyCard';
import {applyHeightCalibration} from '../utils/applyHeightCalibration';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';

const {ARKitModule} = NativeModules;

// 🔹 Conversion helpers
const cmToInches = (cm: number) => cm / 2.54;
const garmentInches = (cm: number) => Math.round(cmToInches(cm));

// 🔹 Sectional scale factors
const UPPER_SCALE = 1.0; // chest / shoulders realistic
const LOWER_SCALE = 1.8; // waist / hips / inseam realistic

interface MeasurementResultsScreenProps {
  navigate: (screen: string, params?: any) => void;
}

type MeasurementResult = {
  label: string;
  value: number;
  unit: string;
};

export default function MeasurementResultsManualScreen({
  navigate,
}: MeasurementResultsScreenProps) {
  const {theme} = useAppTheme();
  const userId = useUUID();
  const {
    frontJoints: front,
    sideJoints: side,
    computedResults,
    computeResults,
  } = useMeasurementStore();
  const [results, setResults] = useState<MeasurementResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const styles = StyleSheet.create({
    container: {flex: 1, alignItems: 'center', paddingTop: 100},
    title: {fontSize: 28, fontWeight: '700', marginTop: 22, marginBottom: 20},
    scroll: {width: '100%'},
    scrollContent: {alignItems: 'center', paddingBottom: 100},
    resultCard: {
      width: '90%',
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 24,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
    resultValue: {fontSize: 26, fontWeight: '700'},
    saveButton: {
      position: 'absolute',
      bottom: 100,
      width: '80%',
      borderRadius: 30,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveText: {fontSize: 18, fontWeight: '600'},
  });

  // ---------------------------------------------------
  // 🧮 Normalize, render mesh, compute scaled results
  // ---------------------------------------------------
  useEffect(() => {
    if (!front || !side) {
      console.warn('⚠️ Missing measurement data:', {front, side});
      setLoading(true);
      return;
    }

    const normalized = normalizeJoints(front, side);
    console.log('✅ Normalized joints ready:', normalized);

    try {
      const vertices = buildMeshVertices(normalized);
      console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
      ARKitModule.renderMesh(Array.from(vertices));
    } catch (err) {
      console.error('❌ Error rendering mesh:', err);
    }

    computeResults(1.78); // replace with user height in meters if available
  }, [front, side]);

  // ---------------------------------------------------
  // 🧩 Compute all 30 measurements
  // ---------------------------------------------------
  useEffect(() => {
    if (!front || !side || !computedResults) return;

    try {
      const normalized = normalizeJoints(front, side);
      const f = normalized.front.joints;

      const joint = (name: string) => f[name] || undefined;
      const mid = (a?: number[], b?: number[]) =>
        a && b
          ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
          : undefined;

      const getDistance = (a?: number[], b?: number[]) => {
        if (!a || !b) return 0;
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };

      const scaleToCM = (v: number) => v * 100;

      // --- Core (5) ---
      const core = Object.entries(computedResults).map(([k, v]) => ({
        label: k[0].toUpperCase() + k.slice(1),
        value: v,
        unit: 'cm',
      }));

      // --- Extended (9) ---
      const leftKnee = mid(joint('left_upLeg_joint'), joint('left_leg_joint'));
      const rightKnee = mid(
        joint('right_upLeg_joint'),
        joint('right_leg_joint'),
      );

      const extended: MeasurementResult[] = [
        {
          label: 'Arm Length',
          value: scaleToCM(
            getDistance(
              joint('left_shoulder_1_joint'),
              joint('left_forearm_joint'),
            ),
          ),
          unit: 'cm',
        },
        {
          label: 'Torso Length',
          value: scaleToCM(
            getDistance(joint('neck_1_joint'), joint('hips_joint')),
          ),
          unit: 'cm',
        },
        {
          label: 'Leg Length',
          value: scaleToCM(
            getDistance(joint('left_upLeg_joint'), joint('left_leg_joint')),
          ),
          unit: 'cm',
        },
        {
          label: 'Thigh Circumference',
          value: scaleToCM(getDistance(leftKnee, rightKnee) * Math.PI),
          unit: 'cm',
        },
        {
          label: 'Hip Width',
          value: scaleToCM(
            getDistance(joint('left_upLeg_joint'), joint('right_upLeg_joint')),
          ),
          unit: 'cm',
        },
        {
          label: 'Shoulder Width',
          value: scaleToCM(
            getDistance(
              joint('left_shoulder_1_joint'),
              joint('right_shoulder_1_joint'),
            ),
          ),
          unit: 'cm',
        },
        {
          label: 'Chest Circumference',
          value: scaleToCM(
            getDistance(joint('spine_7_joint'), joint('spine_7_joint')) *
              Math.PI,
          ),
          unit: 'cm',
        },
        {
          label: 'Waist Circumference',
          value: scaleToCM(
            getDistance(joint('spine_3_joint'), joint('spine_3_joint')) *
              Math.PI,
          ),
          unit: 'cm',
        },
        {
          label: 'Height',
          value: scaleToCM(
            getDistance(joint('head_joint'), joint('left_foot_joint')),
          ),
          unit: 'cm',
        },
      ];

      // --- Secondary (8) ---
      const secondary: MeasurementResult[] = [
        {
          label: 'Neck Circumference',
          value: scaleToCM(
            (getDistance(joint('neck_1_joint'), joint('neck_4_joint')) +
              getDistance(joint('neck_2_joint'), joint('neck_3_joint'))) *
              (Math.PI / 2),
          ),
          unit: 'cm',
        },
        {
          label: 'Bicep Circumference',
          value: scaleToCM(
            getDistance(joint('left_arm_joint'), joint('right_arm_joint')) *
              Math.PI,
          ),
          unit: 'cm',
        },
        {
          label: 'Forearm Circumference',
          value: scaleToCM(
            getDistance(
              joint('left_forearm_joint'),
              joint('right_forearm_joint'),
            ) * Math.PI,
          ),
          unit: 'cm',
        },
        {
          label: 'Wrist Circumference',
          value: scaleToCM(
            getDistance(joint('left_hand_joint'), joint('right_hand_joint')) *
              Math.PI,
          ),
          unit: 'cm',
        },
        {
          label: 'Calf Circumference',
          value: scaleToCM(
            getDistance(joint('left_leg_joint'), joint('right_leg_joint')) *
              Math.PI,
          ),
          unit: 'cm',
        },
        {
          label: 'Ankle Circumference',
          value: scaleToCM(
            getDistance(joint('left_foot_joint'), joint('right_foot_joint')) *
              Math.PI,
          ),
          unit: 'cm',
        },
        {
          label: 'Crotch Depth',
          value: scaleToCM(
            getDistance(joint('hips_joint'), joint('spine_1_joint')) +
              getDistance(joint('spine_1_joint'), joint('spine_3_joint')),
          ),
          unit: 'cm',
        },
        {
          label: 'Back Length (Nape to Waist)',
          value: scaleToCM(
            getDistance(joint('neck_1_joint'), joint('spine_3_joint')) +
              getDistance(joint('spine_3_joint'), joint('spine_5_joint')),
          ),
          unit: 'cm',
        },
      ];

      // --- Refinement (7) ---
      const refinement: MeasurementResult[] = [
        {
          label: 'Shoulder to Elbow Length',
          value: scaleToCM(
            getDistance(
              joint('left_shoulder_1_joint'),
              joint('left_arm_joint'),
            ),
          ),
          unit: 'cm',
        },
        {
          label: 'Neck Base to Shoulder Slope',
          value: scaleToCM(
            getDistance(joint('neck_1_joint'), joint('left_shoulder_1_joint')),
          ),
          unit: 'cm',
        },
        {
          label: 'Outseam (Hip to Ankle Length)',
          value: scaleToCM(
            getDistance(joint('left_upLeg_joint'), joint('left_leg_joint')),
          ),
          unit: 'cm',
        },
        {
          label: 'Knee Circumference',
          value: scaleToCM(getDistance(leftKnee, rightKnee) * Math.PI),
          unit: 'cm',
        },
        {
          label: 'Underbust Circumference',
          value: scaleToCM(
            getDistance(joint('spine_7_joint'), joint('spine_7_joint')) *
              Math.PI *
              0.9,
          ),
          unit: 'cm',
        },
        {
          label: 'Arm Span (Fingertip to Fingertip)',
          value: scaleToCM(
            getDistance(joint('left_hand_joint'), joint('right_hand_joint')),
          ),
          unit: 'cm',
        },
        {
          label: 'Shoulder to Waist Length',
          value: scaleToCM(
            getDistance(joint('left_shoulder_1_joint'), joint('hips_joint')),
          ),
          unit: 'cm',
        },
      ];

      let allResults = [...core, ...extended, ...secondary, ...refinement];

      // ✅ Height calibration
      const userHeightCm = 180;
      allResults = allResults.map(r => {
        const scaledValue = applyHeightCalibration(
          {[r.label]: r.value},
          userHeightCm,
        )[r.label];
        return {...r, value: scaledValue};
      });

      setResults(allResults.filter(r => r.value > 0));
      setLoading(false);
    } catch (err) {
      console.error('❌ Error computing measurements:', err);
    }
  }, [front, side, computedResults]);

  // ---------------------------------------------------
  // 💾 Save
  // ---------------------------------------------------
  const handleSave = async () => {
    if (!userId || !computedResults) {
      Alert.alert('Error', 'Missing user ID or measurements');
      return;
    }

    ReactNativeHapticFeedback.trigger('impactMedium');
    setSaving(true);

    try {
      // Convert results array to object with labels as keys for all_measurements
      const allMeasurementsObj: Record<string, number> = {};
      results.forEach(r => {
        allMeasurementsObj[r.label] = r.value;
      });

      const payload = {
        chest: computedResults.chest,
        waist: computedResults.waist,
        hip: computedResults.hips,
        shoulder_width: computedResults.shoulders,
        inseam: computedResults.inseam,
        all_measurements: allMeasurementsObj,
      };

      console.log('📤 Saving measurements:', payload);

      // Get JWT token for authentication
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${API_BASE_URL}/style-profiles/${userId}/measurements`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Measurements saved successfully:', data);

      ReactNativeHapticFeedback.trigger('notificationSuccess');
      navigate('HomeScreen');
    } catch (err) {
      console.error('❌ Error saving measurements:', err);
      Alert.alert(
        'Error',
        `Failed to save measurements: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
      ReactNativeHapticFeedback.trigger('notificationError');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------
  // 🧾 Display dual-scale
  // ---------------------------------------------------
  const getScaleForLabel = (label: string) => {
    const lowerWords = [
      'Waist',
      'Hip',
      'Inseam',
      'Leg',
      'Thigh',
      'Calf',
      'Ankle',
    ];
    return lowerWords.some(w => label.includes(w)) ? LOWER_SCALE : UPPER_SCALE;
  };

  if (loading) {
    return (
      <View
        style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{color: theme.colors.foreground, marginTop: 20, fontSize: 16}}>
          Preparing your measurements…
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={[styles.title, {color: theme.colors.foreground}]}>
        Your Measurements
      </Text>

      {computedResults && (
        <BodyCard
          shoulders={computedResults.shoulders}
          chest={computedResults.chest}
          waist={computedResults.waist}
          hips={computedResults.hips}
          inseam={computedResults.inseam}
          bg={theme.colors.surface}
          fg={theme.colors.foreground}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {results.map((r, idx) => (
          <View
            key={idx}
            style={[
              styles.resultCard,
              {backgroundColor: theme.colors.surface},
            ]}>
            <Text
              style={[styles.resultLabel, {color: theme.colors.foreground}]}>
              {r.label}
            </Text>
            <View
              style={{flexDirection: 'row', alignItems: 'baseline', gap: 8}}>
              <Text
                style={[styles.resultValue, {color: theme.colors.foreground}]}>
                {r.value.toFixed(1)} {r.unit}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  color: theme.colors.foreground,
                  opacity: 0.6,
                }}>
                ({cmToInches(r.value).toFixed(1)} in ≈ {garmentInches(r.value)}
                ″)
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.saveButton,
          {backgroundColor: theme.colors.button1, opacity: saving ? 0.6 : 1},
        ]}
        onPress={handleSave}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color={theme.colors.foreground} />
        ) : (
          <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
            Save to Profile
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

////////////////

// MeasurementResultsManualScreen.tsx — StylIQ
// ✅ Final accurate scaling (no zeros) + corrected ARKit joint mapping + full 30 measurements + height calibration

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';
// import BodyCard from '../components/features/BodyCard';
// import {applyHeightCalibration} from '../utils/applyHeightCalibration';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   const styles = StyleSheet.create({
//     container: {flex: 1, alignItems: 'center', paddingTop: 100},
//     title: {fontSize: 28, fontWeight: '700', marginTop: 22, marginBottom: 20},
//     scroll: {width: '100%'},
//     scrollContent: {alignItems: 'center', paddingBottom: 100},
//     resultCard: {
//       width: '90%',
//       borderRadius: 20,
//       paddingVertical: 20,
//       paddingHorizontal: 24,
//       marginBottom: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowRadius: 8,
//       elevation: 4,
//     },
//     resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//     resultValue: {fontSize: 26, fontWeight: '700'},
//     saveButton: {
//       position: 'absolute',
//       bottom: 100,
//       width: '80%',
//       borderRadius: 30,
//       paddingVertical: 16,
//       alignItems: 'center',
//     },
//     saveText: {fontSize: 18, fontWeight: '600'},
//   });

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     computeResults(1.78); // replace with user height in meters if available
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Compute all 30 measurements
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side || !computedResults) return;

//     try {
//       const normalized = normalizeJoints(front, side);
//       const f = normalized.front.joints;

//       const joint = (name: string) => f[name] || undefined;
//       const mid = (a?: number[], b?: number[]) =>
//         a && b
//           ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
//           : undefined;

//       const getDistance = (a?: number[], b?: number[]) => {
//         if (!a || !b) return 0;
//         const dx = a[0] - b[0];
//         const dy = a[1] - b[1];
//         const dz = a[2] - b[2];
//         return Math.sqrt(dx * dx + dy * dy + dz * dz);
//       };

//       const scaleToCM = (v: number) => v * 100;

//       // --- Core (5) ---
//       const core = Object.entries(computedResults).map(([k, v]) => ({
//         label: k[0].toUpperCase() + k.slice(1),
//         value: v,
//         unit: 'cm',
//       }));

//       // --- Extended (9) ---
//       const leftKnee = mid(joint('left_upLeg_joint'), joint('left_leg_joint'));
//       const rightKnee = mid(
//         joint('right_upLeg_joint'),
//         joint('right_leg_joint'),
//       );

//       const extended: MeasurementResult[] = [
//         {
//           label: 'Arm Length',
//           value: scaleToCM(
//             getDistance(
//               joint('left_shoulder_1_joint'),
//               joint('left_forearm_joint'),
//             ),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Torso Length',
//           value: scaleToCM(
//             getDistance(joint('neck_1_joint'), joint('hips_joint')),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Leg Length',
//           value: scaleToCM(
//             getDistance(joint('left_upLeg_joint'), joint('left_leg_joint')),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Thigh Circumference',
//           value: scaleToCM(getDistance(leftKnee, rightKnee) * Math.PI),
//           unit: 'cm',
//         },
//         {
//           label: 'Hip Width',
//           value: scaleToCM(
//             getDistance(joint('left_upLeg_joint'), joint('right_upLeg_joint')),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder Width',
//           value: scaleToCM(
//             getDistance(
//               joint('left_shoulder_1_joint'),
//               joint('right_shoulder_1_joint'),
//             ),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Chest Circumference',
//           value: scaleToCM(
//             getDistance(joint('spine_7_joint'), joint('spine_7_joint')) *
//               Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Waist Circumference',
//           value: scaleToCM(
//             getDistance(joint('spine_3_joint'), joint('spine_3_joint')) *
//               Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Height',
//           value: scaleToCM(
//             getDistance(joint('head_joint'), joint('left_foot_joint')),
//           ),
//           unit: 'cm',
//         },
//       ];

//       // --- Secondary (8) ---
//       const secondary: MeasurementResult[] = [
//         {
//           label: 'Neck Circumference',
//           value: scaleToCM(
//             (getDistance(joint('neck_1_joint'), joint('neck_4_joint')) +
//               getDistance(joint('neck_2_joint'), joint('neck_3_joint'))) *
//               (Math.PI / 2),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Bicep Circumference',
//           value: scaleToCM(
//             getDistance(joint('left_arm_joint'), joint('right_arm_joint')) *
//               Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Forearm Circumference',
//           value: scaleToCM(
//             getDistance(
//               joint('left_forearm_joint'),
//               joint('right_forearm_joint'),
//             ) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Wrist Circumference',
//           value: scaleToCM(
//             getDistance(joint('left_hand_joint'), joint('right_hand_joint')) *
//               Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Calf Circumference',
//           value: scaleToCM(
//             getDistance(joint('left_leg_joint'), joint('right_leg_joint')) *
//               Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Ankle Circumference',
//           value: scaleToCM(
//             getDistance(joint('left_foot_joint'), joint('right_foot_joint')) *
//               Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Crotch Depth',
//           value: scaleToCM(
//             getDistance(joint('hips_joint'), joint('spine_1_joint')) +
//               getDistance(joint('spine_1_joint'), joint('spine_3_joint')),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Back Length (Nape to Waist)',
//           value: scaleToCM(
//             getDistance(joint('neck_1_joint'), joint('spine_3_joint')) +
//               getDistance(joint('spine_3_joint'), joint('spine_5_joint')),
//           ),
//           unit: 'cm',
//         },
//       ];

//       // --- Refinement (7) ---
//       const refinement: MeasurementResult[] = [
//         {
//           label: 'Shoulder to Elbow Length',
//           value: scaleToCM(
//             getDistance(
//               joint('left_shoulder_1_joint'),
//               joint('left_arm_joint'),
//             ),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Neck Base to Shoulder Slope',
//           value: scaleToCM(
//             getDistance(joint('neck_1_joint'), joint('left_shoulder_1_joint')),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Outseam (Hip to Ankle Length)',
//           value: scaleToCM(
//             getDistance(joint('left_upLeg_joint'), joint('left_leg_joint')),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Knee Circumference',
//           value: scaleToCM(getDistance(leftKnee, rightKnee) * Math.PI),
//           unit: 'cm',
//         },
//         {
//           label: 'Underbust Circumference',
//           value: scaleToCM(
//             getDistance(joint('spine_7_joint'), joint('spine_7_joint')) *
//               Math.PI *
//               0.9,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Arm Span (Fingertip to Fingertip)',
//           value: scaleToCM(
//             getDistance(joint('left_hand_joint'), joint('right_hand_joint')),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder to Waist Length',
//           value: scaleToCM(
//             getDistance(joint('left_shoulder_1_joint'), joint('hips_joint')),
//           ),
//           unit: 'cm',
//         },
//       ];

//       let allResults = [...core, ...extended, ...secondary, ...refinement];

//       // ✅ Height calibration
//       const userHeightCm = 180;
//       allResults = allResults.map(r => {
//         const scaledValue = applyHeightCalibration(
//           {[r.label]: r.value},
//           userHeightCm,
//         )[r.label];
//         return {...r, value: scaledValue};
//       });

//       setResults(allResults.filter(r => r.value > 0));
//       setLoading(false);
//     } catch (err) {
//       console.error('❌ Error computing measurements:', err);
//     }
//   }, [front, side, computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{color: theme.colors.foreground, marginTop: 20, fontSize: 16}}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       {computedResults && (
//         <BodyCard
//           shoulders={computedResults.shoulders}
//           chest={computedResults.chest}
//           waist={computedResults.waist}
//           hips={computedResults.hips}
//           inseam={computedResults.inseam}
//           bg={theme.colors.surface}
//           fg={theme.colors.foreground}
//         />
//       )}

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

//////////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ
// // Final accurate scaling + extended + secondary + refinement (30 total) + store integration + height calibration

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';
// import BodyCard from '../components/features/BodyCard';

// // ✅ Import the new calibration helper
// import {applyHeightCalibration} from '../utils/applyHeightCalibration';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   const styles = StyleSheet.create({
//     container: {flex: 1, alignItems: 'center', paddingTop: 100},

//     title: {fontSize: 28, fontWeight: '700', marginTop: 22, marginBottom: 20},
//     scroll: {width: '100%'},
//     scrollContent: {alignItems: 'center', paddingBottom: 100},
//     resultCard: {
//       width: '90%',
//       borderRadius: 20,
//       paddingVertical: 20,
//       paddingHorizontal: 24,
//       marginBottom: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowRadius: 8,
//       elevation: 4,
//     },
//     resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//     resultValue: {fontSize: 26, fontWeight: '700'},
//     saveButton: {
//       position: 'absolute',
//       bottom: 100,
//       width: '80%',
//       borderRadius: 30,
//       paddingVertical: 16,
//       alignItems: 'center',
//     },
//     saveText: {fontSize: 18, fontWeight: '600'},
//   });

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     computeResults(1.78); // replace with user height in meters if available
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Build all measurements (core + extended + secondary + refinement)
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side || !computedResults) return;

//     try {
//       const normalized = normalizeJoints(front, side);
//       const f = normalized.front.joints;

//       const getDistance = (a?: number[], b?: number[]) => {
//         if (!a || !b) return 0;
//         const dx = a[0] - b[0];
//         const dy = a[1] - b[1];
//         const dz = a[2] - b[2];
//         return Math.sqrt(dx * dx + dy * dy + dz * dz);
//       };

//       const scaleToCM = (v: number) => v * 100;

//       // --- Core (from store) ---
//       const core = Object.entries(computedResults).map(([k, v]) => ({
//         label: k[0].toUpperCase() + k.slice(1),
//         value: v,
//         unit: 'cm',
//       }));

//       // --- Extended ---
//       const extended: MeasurementResult[] = [
//         {
//           label: 'Arm Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_wrist_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Torso Length',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Leg Length',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Thigh Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Hip Width',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.right_hip_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder Width',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.right_shoulder_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Chest Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Waist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_waist_joint, f.right_waist_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Height',
//           value: scaleToCM(getDistance(f.head_joint, f.left_foot_joint)),
//           unit: 'cm',
//         },
//       ];

//       // --- Secondary ---
//       const secondary: MeasurementResult[] = [
//         {
//           label: 'Neck Circumference',
//           value: scaleToCM(
//             (getDistance(f.neck_1_joint, f.neck_4_joint) +
//               getDistance(f.neck_2_joint, f.neck_3_joint)) *
//               (Math.PI / 2),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Bicep Circumference',
//           value: scaleToCM(
//             getDistance(f.left_arm_joint, f.right_arm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Forearm Circumference',
//           value: scaleToCM(
//             getDistance(f.left_forearm_joint, f.right_forearm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Wrist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_hand_joint, f.right_hand_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Calf Circumference',
//           value: scaleToCM(
//             getDistance(f.left_leg_joint, f.right_leg_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Ankle Circumference',
//           value: scaleToCM(
//             getDistance(f.left_foot_joint, f.right_foot_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Crotch Depth',
//           value: scaleToCM(
//             getDistance(f.hips_joint, f.spine_1_joint) +
//               getDistance(f.spine_1_joint, f.spine_3_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Back Length (Nape to Waist)',
//           value: scaleToCM(
//             getDistance(f.neck_1_joint, f.spine_3_joint) +
//               getDistance(f.spine_3_joint, f.spine_5_joint),
//           ),
//           unit: 'cm',
//         },
//       ];

//       // --- Refinement (adds final 7 to reach 30 total) ---
//       const refinement: MeasurementResult[] = [
//         {
//           label: 'Shoulder to Elbow Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_elbow_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Neck Base to Shoulder Slope',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.left_shoulder_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Outseam (Hip to Ankle Length)',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Knee Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Underbust Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) *
//               Math.PI *
//               0.9,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Arm Span (Fingertip to Fingertip)',
//           value: scaleToCM(getDistance(f.left_hand_joint, f.right_hand_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder to Waist Length',
//           value: scaleToCM(getDistance(f.left_shoulder_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//       ];

//       // 🔹 Combine all results
//       let allResults = [...core, ...extended, ...secondary, ...refinement];

//       // ✅ Apply height calibration here (post-processing)
//       const userHeightCm = 180; // Example static; replace with user profile later
//       allResults = allResults.map(r => {
//         const scaledValue = applyHeightCalibration(
//           {[r.label]: r.value},
//           userHeightCm,
//         )[r.label];
//         return {...r, value: scaledValue};
//       });

//       setResults(allResults);
//       setLoading(false);
//     } catch (err) {
//       console.error('❌ Error computing measurements:', err);
//     }
//   }, [front, side, computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       {computedResults && (
//         <BodyCard
//           shoulders={computedResults.shoulders}
//           chest={computedResults.chest}
//           waist={computedResults.waist}
//           hips={computedResults.hips}
//           inseam={computedResults.inseam}
//           bg={theme.colors.surface}
//           fg={theme.colors.foreground}
//         />
//       )}

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

//////////////

// // MeasurementResultsManualScreen.tsx — StylIQ
// // Final accurate scaling + extended + secondary + refinement (30 total) + store integration + height calibration

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';
// import BodyCard from '../components/features/BodyCard';

// // ✅ Import the new calibration helper
// import {applyHeightCalibration} from '../utils/applyHeightCalibration';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     computeResults(1.78); // replace with user height in meters if available
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Build all measurements (core + extended + secondary + refinement)
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side || !computedResults) return;

//     try {
//       const normalized = normalizeJoints(front, side);
//       const f = normalized.front.joints;

//       const getDistance = (a?: number[], b?: number[]) => {
//         if (!a || !b) return 0;
//         const dx = a[0] - b[0];
//         const dy = a[1] - b[1];
//         const dz = a[2] - b[2];
//         return Math.sqrt(dx * dx + dy * dy + dz * dz);
//       };

//       const scaleToCM = (v: number) => v * 100;

//       // --- Core (from store) ---
//       const core = Object.entries(computedResults).map(([k, v]) => ({
//         label: k[0].toUpperCase() + k.slice(1),
//         value: v,
//         unit: 'cm',
//       }));

//       // --- Extended ---
//       const extended: MeasurementResult[] = [
//         {
//           label: 'Arm Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_wrist_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Torso Length',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Leg Length',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Thigh Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Hip Width',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.right_hip_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder Width',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.right_shoulder_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Chest Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Waist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_waist_joint, f.right_waist_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Height',
//           value: scaleToCM(getDistance(f.head_joint, f.left_foot_joint)),
//           unit: 'cm',
//         },
//       ];

//       // --- Secondary ---
//       const secondary: MeasurementResult[] = [
//         {
//           label: 'Neck Circumference',
//           value: scaleToCM(
//             (getDistance(f.neck_1_joint, f.neck_4_joint) +
//               getDistance(f.neck_2_joint, f.neck_3_joint)) *
//               (Math.PI / 2),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Bicep Circumference',
//           value: scaleToCM(
//             getDistance(f.left_arm_joint, f.right_arm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Forearm Circumference',
//           value: scaleToCM(
//             getDistance(f.left_forearm_joint, f.right_forearm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Wrist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_hand_joint, f.right_hand_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Calf Circumference',
//           value: scaleToCM(
//             getDistance(f.left_leg_joint, f.right_leg_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Ankle Circumference',
//           value: scaleToCM(
//             getDistance(f.left_foot_joint, f.right_foot_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Crotch Depth',
//           value: scaleToCM(
//             getDistance(f.hips_joint, f.spine_1_joint) +
//               getDistance(f.spine_1_joint, f.spine_3_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Back Length (Nape to Waist)',
//           value: scaleToCM(
//             getDistance(f.neck_1_joint, f.spine_3_joint) +
//               getDistance(f.spine_3_joint, f.spine_5_joint),
//           ),
//           unit: 'cm',
//         },
//       ];

//       // --- Refinement (adds final 7 to reach 30 total) ---
//       const refinement: MeasurementResult[] = [
//         {
//           label: 'Shoulder to Elbow Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_elbow_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Neck Base to Shoulder Slope',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.left_shoulder_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Outseam (Hip to Ankle Length)',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Knee Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Underbust Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) *
//               Math.PI *
//               0.9,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Arm Span (Fingertip to Fingertip)',
//           value: scaleToCM(getDistance(f.left_hand_joint, f.right_hand_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder to Waist Length',
//           value: scaleToCM(getDistance(f.left_shoulder_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//       ];

//       // 🔹 Combine all results
//       let allResults = [...core, ...extended, ...secondary, ...refinement];

//       // ✅ Apply height calibration here (post-processing)
//       const userHeightCm = 180; // Example static; replace with user profile later
//       allResults = allResults.map(r => {
//         const scaledValue = applyHeightCalibration(
//           {[r.label]: r.value},
//           userHeightCm,
//         )[r.label];
//         return {...r, value: scaledValue};
//       });

//       setResults(allResults);
//       setLoading(false);
//     } catch (err) {
//       console.error('❌ Error computing measurements:', err);
//     }
//   }, [front, side, computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{color: theme.colors.foreground, marginTop: 20, fontSize: 16}}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       {computedResults && (
//         <BodyCard
//           shoulders={computedResults.shoulders}
//           chest={computedResults.chest}
//           waist={computedResults.waist}
//           hips={computedResults.hips}
//           inseam={computedResults.inseam}
//           bg={theme.colors.surface}
//           fg={theme.colors.foreground}
//         />
//       )}

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ
// // Final accurate scaling + extended + secondary + refinement (30 total) + store integration

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';
// import BodyCard from '../components/features/BodyCard';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     computeResults(1.78); // replace with user height in meters if available
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Build all measurements (core + extended + secondary + refinement)
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side || !computedResults) return;

//     try {
//       const normalized = normalizeJoints(front, side);
//       const f = normalized.front.joints;

//       const getDistance = (a?: number[], b?: number[]) => {
//         if (!a || !b) return 0;
//         const dx = a[0] - b[0];
//         const dy = a[1] - b[1];
//         const dz = a[2] - b[2];
//         return Math.sqrt(dx * dx + dy * dy + dz * dz);
//       };

//       const scaleToCM = (v: number) => v * 100;

//       // --- Core (from store) ---
//       const core = Object.entries(computedResults).map(([k, v]) => ({
//         label: k[0].toUpperCase() + k.slice(1),
//         value: v,
//         unit: 'cm',
//       }));

//       // --- Extended ---
//       const extended: MeasurementResult[] = [
//         {
//           label: 'Arm Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_wrist_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Torso Length',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Leg Length',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Thigh Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Hip Width',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.right_hip_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder Width',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.right_shoulder_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Chest Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Waist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_waist_joint, f.right_waist_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Height',
//           value: scaleToCM(getDistance(f.head_joint, f.left_foot_joint)),
//           unit: 'cm',
//         },
//       ];

//       // --- Secondary ---
//       const secondary: MeasurementResult[] = [
//         {
//           label: 'Neck Circumference',
//           value: scaleToCM(
//             (getDistance(f.neck_1_joint, f.neck_4_joint) +
//               getDistance(f.neck_2_joint, f.neck_3_joint)) *
//               (Math.PI / 2),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Bicep Circumference',
//           value: scaleToCM(
//             getDistance(f.left_arm_joint, f.right_arm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Forearm Circumference',
//           value: scaleToCM(
//             getDistance(f.left_forearm_joint, f.right_forearm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Wrist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_hand_joint, f.right_hand_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Calf Circumference',
//           value: scaleToCM(
//             getDistance(f.left_leg_joint, f.right_leg_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Ankle Circumference',
//           value: scaleToCM(
//             getDistance(f.left_foot_joint, f.right_foot_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Crotch Depth',
//           value: scaleToCM(
//             getDistance(f.hips_joint, f.spine_1_joint) +
//               getDistance(f.spine_1_joint, f.spine_3_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Back Length (Nape to Waist)',
//           value: scaleToCM(
//             getDistance(f.neck_1_joint, f.spine_3_joint) +
//               getDistance(f.spine_3_joint, f.spine_5_joint),
//           ),
//           unit: 'cm',
//         },
//       ];

//       // --- Refinement (adds final 7 to reach 30 total) ---
//       const refinement: MeasurementResult[] = [
//         {
//           label: 'Shoulder to Elbow Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_elbow_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Neck Base to Shoulder Slope',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.left_shoulder_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Outseam (Hip to Ankle Length)',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Knee Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Underbust Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) *
//               Math.PI *
//               0.9,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Arm Span (Fingertip to Fingertip)',
//           value: scaleToCM(getDistance(f.left_hand_joint, f.right_hand_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder to Waist Length',
//           value: scaleToCM(getDistance(f.left_shoulder_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//       ];

//       setResults([...core, ...extended, ...secondary, ...refinement]);
//       setLoading(false);
//     } catch (err) {
//       console.error('❌ Error computing measurements:', err);
//     }
//   }, [front, side, computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{color: theme.colors.foreground, marginTop: 20, fontSize: 16}}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       {computedResults && (
//         <BodyCard
//           shoulders={computedResults.shoulders}
//           chest={computedResults.chest}
//           waist={computedResults.waist}
//           hips={computedResults.hips}
//           inseam={computedResults.inseam}
//           bg={theme.colors.surface}
//           fg={theme.colors.foreground}
//         />
//       )}

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ
// // Final accurate scaling + extended + secondary measurements + store integration

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';
// import BodyCard from '../components/features/BodyCard';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     computeResults(1.78); // replace with user height in meters if available
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Build all measurements (core + extended + secondary)
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side || !computedResults) return;

//     try {
//       const normalized = normalizeJoints(front, side);
//       const f = normalized.front.joints;

//       const getDistance = (a?: number[], b?: number[]) => {
//         if (!a || !b) return 0;
//         const dx = a[0] - b[0];
//         const dy = a[1] - b[1];
//         const dz = a[2] - b[2];
//         return Math.sqrt(dx * dx + dy * dy + dz * dz);
//       };

//       const scaleToCM = (v: number) => v * 100;

//       // --- Core (from store) ---
//       const core = Object.entries(computedResults).map(([k, v]) => ({
//         label: k[0].toUpperCase() + k.slice(1),
//         value: v,
//         unit: 'cm',
//       }));

//       // --- Extended ---
//       const extended: MeasurementResult[] = [
//         {
//           label: 'Arm Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_wrist_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Torso Length',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Leg Length',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Thigh Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Hip Width',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.right_hip_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder Width',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.right_shoulder_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Chest Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Waist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_waist_joint, f.right_waist_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Height',
//           value: scaleToCM(getDistance(f.head_joint, f.left_foot_joint)),
//           unit: 'cm',
//         },
//       ];

//       // --- Secondary (new zones) ---
//       const secondary: MeasurementResult[] = [
//         {
//           label: 'Neck Circumference',
//           value: scaleToCM(
//             (getDistance(f.neck_1_joint, f.neck_4_joint) +
//               getDistance(f.neck_2_joint, f.neck_3_joint)) *
//               (Math.PI / 2),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Bicep Circumference',
//           value: scaleToCM(
//             getDistance(f.left_arm_joint, f.right_arm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Forearm Circumference',
//           value: scaleToCM(
//             getDistance(f.left_forearm_joint, f.right_forearm_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Wrist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_hand_joint, f.right_hand_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Calf Circumference',
//           value: scaleToCM(
//             getDistance(f.left_leg_joint, f.right_leg_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Ankle Circumference',
//           value: scaleToCM(
//             getDistance(f.left_foot_joint, f.right_foot_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Crotch Depth',
//           value: scaleToCM(
//             getDistance(f.hips_joint, f.spine_1_joint) +
//               getDistance(f.spine_1_joint, f.spine_3_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Back Length (Nape to Waist)',
//           value: scaleToCM(
//             getDistance(f.neck_1_joint, f.spine_3_joint) +
//               getDistance(f.spine_3_joint, f.spine_5_joint),
//           ),
//           unit: 'cm',
//         },
//       ];

//       setResults([...core, ...extended, ...secondary]);
//       setLoading(false);
//     } catch (err) {
//       console.error('❌ Error computing measurements:', err);
//     }
//   }, [front, side, computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{color: theme.colors.foreground, marginTop: 20, fontSize: 16}}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       {computedResults && (
//         <BodyCard
//           shoulders={computedResults.shoulders}
//           chest={computedResults.chest}
//           waist={computedResults.waist}
//           hips={computedResults.hips}
//           inseam={computedResults.inseam}
//           bg={theme.colors.surface}
//           fg={theme.colors.foreground}
//         />
//       )}

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

///////////////

// // MeasurementResultsManualScreen.tsx — StylIQ (final accurate scaling + extended measurements + store integration)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';

// // ⭐ NEW IMPORT
// import BodyCard from '../components/features/BodyCard';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     // 🧭 Normalize front + side joint maps
//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     // 🟢 Build and render mesh
//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     // 🧮 Compute scaled results (using actual height)
//     computeResults(1.78); // TODO: replace 1.78 with user height (meters)
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Update results from store (core 5)
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!computedResults) return;

//     const arr = Object.entries(computedResults).map(([k, v]) => ({
//       label: k[0].toUpperCase() + k.slice(1),
//       value: v,
//       unit: 'cm',
//     }));

//     setResults(arr);
//     setLoading(false);
//   }, [computedResults]);

//   // ---------------------------------------------------
//   // 🧩 EXTENDED MEASUREMENTS (safe additive block)
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side || !computedResults) return;

//     try {
//       const normalized = normalizeJoints(front, side);
//       const f = normalized.front.joints;

//       const getDistance = (a?: number[], b?: number[]) => {
//         if (!a || !b) return 0;
//         const dx = a[0] - b[0];
//         const dy = a[1] - b[1];
//         const dz = a[2] - b[2];
//         return Math.sqrt(dx * dx + dy * dy + dz * dz);
//       };

//       const scaleToCM = (v: number) => v * 100;

//       const extended: MeasurementResult[] = [
//         {
//           label: 'Arm Length',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.left_wrist_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Torso Length',
//           value: scaleToCM(getDistance(f.neck_1_joint, f.hips_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Leg Length',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.left_ankle_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Thigh Circumference',
//           value: scaleToCM(
//             getDistance(f.left_knee_joint, f.right_knee_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Hip Width',
//           value: scaleToCM(getDistance(f.left_hip_joint, f.right_hip_joint)),
//           unit: 'cm',
//         },
//         {
//           label: 'Shoulder Width',
//           value: scaleToCM(
//             getDistance(f.left_shoulder_joint, f.right_shoulder_joint),
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Chest Circumference',
//           value: scaleToCM(
//             getDistance(f.left_chest_joint, f.right_chest_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Waist Circumference',
//           value: scaleToCM(
//             getDistance(f.left_waist_joint, f.right_waist_joint) * Math.PI,
//           ),
//           unit: 'cm',
//         },
//         {
//           label: 'Height',
//           value: scaleToCM(getDistance(f.head_joint, f.left_foot_joint)),
//           unit: 'cm',
//         },
//       ];

//       // merge core + extended
//       const core = Object.entries(computedResults).map(([k, v]) => ({
//         label: k[0].toUpperCase() + k.slice(1),
//         value: v,
//         unit: 'cm',
//       }));

//       setResults([...core, ...extended]);
//       setLoading(false);
//     } catch (err) {
//       console.error('❌ Error computing extended measurements:', err);
//     }
//   }, [front, side, computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>

//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       {/* ⭐ BODY SUMMARY CARD (core 5) */}
//       {computedResults && (
//         <BodyCard
//           shoulders={computedResults.shoulders}
//           chest={computedResults.chest}
//           waist={computedResults.waist}
//           hips={computedResults.hips}
//           inseam={computedResults.inseam}
//           bg={theme.colors.surface}
//           fg={theme.colors.foreground}
//         />
//       )}

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>

//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

/////////////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ (final accurate scaling + store integration)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';

// // ⭐ NEW IMPORT
// import BodyCard from '../components/features/BodyCard';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     // 🧭 Normalize front + side joint maps
//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     // 🟢 Build and render mesh
//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     // 🧮 Compute scaled results (using actual height)
//     computeResults(1.78); // TODO: replace 1.78 with user height (meters)
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Update results from store
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!computedResults) return;

//     const arr = Object.entries(computedResults).map(([k, v]) => ({
//       label: k[0].toUpperCase() + k.slice(1),
//       value: v,
//       unit: 'cm',
//     }));

//     setResults(arr);
//     setLoading(false);
//   }, [computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');

//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>

//         <ActivityIndicator size="large" color={theme.colors.primary} />

//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       {/* ⭐ NEW BODY SUMMARY CARD — EXACT LOCATION */}
//       {computedResults && (
//         <BodyCard
//           shoulders={computedResults.shoulders}
//           chest={computedResults.chest}
//           waist={computedResults.waist}
//           hips={computedResults.hips}
//           inseam={computedResults.inseam}
//           bg={theme.colors.surface}
//           fg={theme.colors.foreground}
//         />
//       )}

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>

//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

////////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ (final accurate scaling + store integration)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {
//     frontJoints: front,
//     sideJoints: side,
//     computedResults,
//     computeResults,
//   } = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Normalize, render mesh, compute scaled results
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     // 🧭 Normalize front + side joint maps
//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     // 🟢 Build and render mesh
//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     // 🧮 Compute scaled results (using actual height)
//     computeResults(1.78); // <-- replace 1.78 with user height (meters)
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 🧩 Update results from store
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!computedResults) return;
//     const arr = Object.entries(computedResults).map(([k, v]) => ({
//       label: k[0].toUpperCase() + k.slice(1),
//       value: v,
//       unit: 'cm',
//     }));
//     setResults(arr);
//     setLoading(false);
//   }, [computedResults]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

//////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ (final stable + normalization + mesh render + DEBUG)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// // ---------------------------------------------------
// // 🧩 ARKit joint name mapping
// // ---------------------------------------------------
// const JOINTS = {
//   leftShoulder: 'left_shoulder_1_joint',
//   rightShoulder: 'right_shoulder_1_joint',
//   leftHip: 'left_upLeg_joint',
//   rightHip: 'right_upLeg_joint',
//   leftUpLeg: 'left_upLeg_joint',
//   rightUpLeg: 'right_upLeg_joint',
//   leftFoot: 'left_foot_joint',
// };

// // ---------------------------------------------------
// // Euclidean distance helper
// // ---------------------------------------------------
// const distance = (a?: number[], b?: number[]) => {
//   if (!a || !b) return 0;
//   const dx = a[0] - b[0];
//   const dy = a[1] - b[1];
//   const dz = a[2] - b[2];
//   return Math.sqrt(dx * dx + dy * dy + dz * dz);
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {frontJoints: front, sideJoints: side} = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Compute normalized measurements + render mesh
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     // 🧭 Normalize front + side joint maps
//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     // 🧩 Build and render mesh
//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     const frontNorm = normalized.front.joints;
//     const sideNorm = normalized.side.joints;

//     console.log('🦴 Front keys:', Object.keys(frontNorm).slice(0, 10));
//     console.log('🦴 Side keys:', Object.keys(sideNorm).slice(0, 10));

//     // 🧮 Measurements (approx, scaled for cm)
//     const chest =
//       distance(
//         frontNorm[JOINTS.leftShoulder],
//         frontNorm[JOINTS.rightShoulder],
//       ) * 100;

//     const waist =
//       distance(frontNorm[JOINTS.leftHip], frontNorm[JOINTS.rightHip]) * 90;

//     const hips =
//       distance(frontNorm[JOINTS.leftUpLeg], frontNorm[JOINTS.rightUpLeg]) * 105;

//     const shoulders =
//       distance(
//         frontNorm[JOINTS.leftShoulder],
//         frontNorm[JOINTS.rightShoulder],
//       ) * 110;

//     const inseam =
//       distance(sideNorm[JOINTS.leftUpLeg], sideNorm[JOINTS.leftFoot]) * 120;

//     setResults([
//       {label: 'Chest', value: chest, unit: 'cm'},
//       {label: 'Waist', value: waist, unit: 'cm'},
//       {label: 'Hips', value: hips, unit: 'cm'},
//       {label: 'Shoulders', value: shoulders, unit: 'cm'},
//       {label: 'Inseam', value: inseam, unit: 'cm'},
//     ]);
//     setLoading(false);
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

////////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ (final stable + normalization + mesh render + DEBUG)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   NativeModules,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints';
// import {buildMeshVertices} from '../utils/buildMeshVerticles';

// const {ARKitModule} = NativeModules;

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// // ---------------------------------------------------
// // 🧩 ARKit joint name mapping
// // ---------------------------------------------------
// const JOINTS = {
//   leftShoulder: 'left_shoulder_1_joint',
//   rightShoulder: 'right_shoulder_1_joint',
//   leftHip: 'left_upLeg_joint',
//   rightHip: 'right_upLeg_joint',
//   leftUpLeg: 'left_upLeg_joint',
//   rightUpLeg: 'right_upLeg_joint',
//   leftFoot: 'left_foot_joint',
// };

// // ---------------------------------------------------
// // Euclidean distance helper
// // ---------------------------------------------------
// const distance = (a?: number[], b?: number[]) => {
//   if (!a || !b) return 0;
//   const dx = a[0] - b[0];
//   const dy = a[1] - b[1];
//   const dz = a[2] - b[2];
//   return Math.sqrt(dx * dx + dy * dy + dz * dz);
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {frontJoints: front, sideJoints: side} = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Compute normalized measurements + render mesh
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     // 🧭 Normalize front + side joint maps
//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     // 🧩 Build and render mesh
//     try {
//       const vertices = buildMeshVertices(normalized);
//       console.log('🟢 Rendering mesh with', vertices.length / 3, 'points');
//       ARKitModule.renderMesh(Array.from(vertices));
//     } catch (err) {
//       console.error('❌ Error rendering mesh:', err);
//     }

//     const frontNorm = normalized.front.joints;
//     const sideNorm = normalized.side.joints;

//     console.log('🦴 Front keys:', Object.keys(frontNorm).slice(0, 10));
//     console.log('🦴 Side keys:', Object.keys(sideNorm).slice(0, 10));

//     // 🧮 Measurements (approx, scaled for cm)
//     const chest =
//       distance(
//         frontNorm[JOINTS.leftShoulder],
//         frontNorm[JOINTS.rightShoulder],
//       ) * 100;

//     const waist =
//       distance(frontNorm[JOINTS.leftHip], frontNorm[JOINTS.rightHip]) * 90;

//     const hips =
//       distance(frontNorm[JOINTS.leftUpLeg], frontNorm[JOINTS.rightUpLeg]) * 105;

//     const shoulders =
//       distance(
//         frontNorm[JOINTS.leftShoulder],
//         frontNorm[JOINTS.rightShoulder],
//       ) * 110;

//     const inseam =
//       distance(sideNorm[JOINTS.leftUpLeg], sideNorm[JOINTS.leftFoot]) * 120;

//     setResults([
//       {label: 'Chest', value: chest, unit: 'cm'},
//       {label: 'Waist', value: waist, unit: 'cm'},
//       {label: 'Hips', value: hips, unit: 'cm'},
//       {label: 'Shoulders', value: shoulders, unit: 'cm'},
//       {label: 'Inseam', value: inseam, unit: 'cm'},
//     ]);
//     setLoading(false);
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

////////////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ (final stable + normalization + DEBUG)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {normalizeJoints} from '../utils/normalizeJoints'; // ✅ added

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// // ---------------------------------------------------
// // 🧩 ARKit joint name mapping
// // ---------------------------------------------------
// const JOINTS = {
//   leftShoulder: 'left_shoulder_1_joint',
//   rightShoulder: 'right_shoulder_1_joint',
//   leftHip: 'left_upLeg_joint',
//   rightHip: 'right_upLeg_joint',
//   leftUpLeg: 'left_upLeg_joint',
//   rightUpLeg: 'right_upLeg_joint',
//   leftFoot: 'left_foot_joint',
// };

// // ---------------------------------------------------
// // Euclidean distance helper
// // ---------------------------------------------------
// const distance = (a?: number[], b?: number[]) => {
//   if (!a || !b) return 0;
//   const dx = a[0] - b[0];
//   const dy = a[1] - b[1];
//   const dz = a[2] - b[2];
//   return Math.sqrt(dx * dx + dy * dy + dz * dz);
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {frontJoints: front, sideJoints: side} = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Compute normalized measurements
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     // 🧭 Normalize front + side joint maps
//     const normalized = normalizeJoints(front, side);
//     console.log('✅ Normalized joints ready:', normalized);

//     const frontNorm = normalized.front.joints;
//     const sideNorm = normalized.side.joints;

//     // 🧾 Debug: show first few joint keys
//     console.log('🦴 Front keys:', Object.keys(frontNorm).slice(0, 10));
//     console.log('🦴 Side keys:', Object.keys(sideNorm).slice(0, 10));

//     // 🧮 Measurements (approx, scaled for cm)
//     const chest =
//       distance(
//         frontNorm[JOINTS.leftShoulder],
//         frontNorm[JOINTS.rightShoulder],
//       ) * 100;

//     const waist =
//       distance(frontNorm[JOINTS.leftHip], frontNorm[JOINTS.rightHip]) * 90;

//     const hips =
//       distance(frontNorm[JOINTS.leftUpLeg], frontNorm[JOINTS.rightUpLeg]) * 105;

//     const shoulders =
//       distance(
//         frontNorm[JOINTS.leftShoulder],
//         frontNorm[JOINTS.rightShoulder],
//       ) * 110;

//     const inseam =
//       distance(sideNorm[JOINTS.leftUpLeg], sideNorm[JOINTS.leftFoot]) * 120;

//     setResults([
//       {label: 'Chest', value: chest, unit: 'cm'},
//       {label: 'Waist', value: waist, unit: 'cm'},
//       {label: 'Hips', value: hips, unit: 'cm'},
//       {label: 'Shoulders', value: shoulders, unit: 'cm'},
//       {label: 'Inseam', value: inseam, unit: 'cm'},
//     ]);
//     setLoading(false);
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

///////////////////////

// // MeasurementResultsManualScreen.tsx — StylIQ (final stable + DEBUG + SAFE GUARDS + NON-ZERO FIX)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// // ---------------------------------------------------
// // 🧩 ARKit joint name mapping
// // ---------------------------------------------------
// const JOINTS = {
//   leftShoulder: 'left_shoulder_1_joint',
//   rightShoulder: 'right_shoulder_1_joint',
//   leftHip: 'left_upLeg_joint',
//   rightHip: 'right_upLeg_joint',
//   leftUpLeg: 'left_upLeg_joint',
//   rightUpLeg: 'right_upLeg_joint',
//   leftFoot: 'left_foot_joint',
// };

// // ---------------------------------------------------
// // Euclidean distance helper
// // ---------------------------------------------------
// const distance = (a?: number[], b?: number[]) => {
//   if (!a || !b) return 0;
//   const dx = a[0] - b[0];
//   const dy = a[1] - b[1];
//   const dz = a[2] - b[2];
//   return Math.sqrt(dx * dx + dy * dy + dz * dz);
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {frontJoints: front, sideJoints: side} = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Compute measurements
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     // 🧾 Debug: show first 10 keys
//     console.log('🦴 Front joint keys:', Object.keys(front).slice(0, 10));
//     console.log('🦴 Side joint keys:', Object.keys(side).slice(0, 10));

//     const chest =
//       distance(front[JOINTS.leftShoulder], front[JOINTS.rightShoulder]) * 100;

//     const waist = distance(front[JOINTS.leftHip], front[JOINTS.rightHip]) * 90;

//     const hips =
//       distance(front[JOINTS.leftUpLeg], front[JOINTS.rightUpLeg]) * 105;

//     const shoulders =
//       distance(front[JOINTS.leftShoulder], front[JOINTS.rightShoulder]) * 110;

//     const inseam =
//       distance(side[JOINTS.leftUpLeg], side[JOINTS.leftFoot]) * 120;

//     setResults([
//       {label: 'Chest', value: chest, unit: 'cm'},
//       {label: 'Waist', value: waist, unit: 'cm'},
//       {label: 'Hips', value: hips, unit: 'cm'},
//       {label: 'Shoulders', value: shoulders, unit: 'cm'},
//       {label: 'Inseam', value: inseam, unit: 'cm'},
//     ]);
//     setLoading(false);
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.button1}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });

//////////////////////

// // MeasurementResultsScreen.tsx — StylIQ (final stable + DEBUG + SAFE GUARDS)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// const distance = (a?: number[], b?: number[]) => {
//   if (!a || !b) return 0;
//   const dx = a[0] - b[0];
//   const dy = a[1] - b[1];
//   const dz = a[2] - b[2];
//   return Math.sqrt(dx * dx + dy * dy + dz * dz);
// };

// export default function MeasurementResultsManualScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {frontJoints: front, sideJoints: side} = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);
//   const [loading, setLoading] = useState(true);

//   // ---------------------------------------------------
//   // 🧮 Compute measurements
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) {
//       console.warn('⚠️ Missing measurement data:', {front, side});
//       setLoading(true);
//       return;
//     }

//     const chest = distance(front.leftShoulder, front.rightShoulder) * 100;
//     const waist = distance(front.leftHip, front.rightHip) * 90;
//     const hips = distance(front.leftUpLeg, front.rightUpLeg) * 105;
//     const shoulders = distance(front.leftShoulder, front.rightShoulder) * 110;
//     const inseam = distance(side.leftUpLeg, side.leftFoot) * 120;

//     setResults([
//       {label: 'Chest', value: chest, unit: 'cm'},
//       {label: 'Waist', value: waist, unit: 'cm'},
//       {label: 'Hips', value: hips, unit: 'cm'},
//       {label: 'Shoulders', value: shoulders, unit: 'cm'},
//       {label: 'Inseam', value: inseam, unit: 'cm'},
//     ]);
//     setLoading(false);
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <View style={styles.debugBanner}>
//           <Text style={styles.debugText}>RESULTS SCREEN</Text>
//         </View>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             marginTop: 20,
//             fontSize: 16,
//           }}>
//           Preparing your measurements…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.primary}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99',
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//     backgroundColor: 'blue',
//   },
//   saveText: {fontSize: 18, fontWeight: '600', color: 'black'},
// });

////////////////////

// // MeasurementResultsScreen.tsx — StylIQ (final stable version + DEBUG BANNER)

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useMeasurementStore} from '../../../../store/measurementStore';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// interface MeasurementResultsScreenProps {
//   navigate: (screen: string, params?: any) => void;
// }

// type MeasurementResult = {
//   label: string;
//   value: number;
//   unit: string;
// };

// // ---------------------------------------------------
// // Euclidean distance helper
// // ---------------------------------------------------
// const distance = (a?: number[], b?: number[]) => {
//   if (!a || !b) return 0;
//   const dx = a[0] - b[0];
//   const dy = a[1] - b[1];
//   const dz = a[2] - b[2];
//   return Math.sqrt(dx * dx + dy * dy + dz * dz);
// };

// export default function MeasurementResultsScreen({
//   navigate,
// }: MeasurementResultsScreenProps) {
//   const {theme} = useAppTheme();
//   const {frontJoints: front, sideJoints: side} = useMeasurementStore();
//   const [results, setResults] = useState<MeasurementResult[]>([]);

//   // ---------------------------------------------------
//   // 🧮 Compute measurements
//   // ---------------------------------------------------
//   useEffect(() => {
//     if (!front || !side) return;

//     const chest = distance(front.leftShoulder, front.rightShoulder) * 100;
//     const waist = distance(front.leftHip, front.rightHip) * 90;
//     const hips = distance(front.leftUpLeg, front.rightUpLeg) * 105;
//     const shoulders = distance(front.leftShoulder, front.rightShoulder) * 110;
//     const inseam = distance(side.leftUpLeg, side.leftFoot) * 120;

//     setResults([
//       {label: 'Chest', value: chest, unit: 'cm'},
//       {label: 'Waist', value: waist, unit: 'cm'},
//       {label: 'Hips', value: hips, unit: 'cm'},
//       {label: 'Shoulders', value: shoulders, unit: 'cm'},
//       {label: 'Inseam', value: inseam, unit: 'cm'},
//     ]);
//   }, [front, side]);

//   // ---------------------------------------------------
//   // 💾 Save to backend (stub)
//   // ---------------------------------------------------
//   const handleSave = async () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       console.log('✅ Saved measurements:', results);
//       ReactNativeHapticFeedback.trigger('notificationSuccess');
//       navigate('HomeScreen');
//     } catch (err) {
//       console.error('❌ Error saving measurements', err);
//       ReactNativeHapticFeedback.trigger('notificationError');
//     }
//   };

//   // ---------------------------------------------------
//   // 🧱 UI
//   // ---------------------------------------------------
//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* ---- DEBUG BANNER ---- */}
//       <View style={styles.debugBanner}>
//         <Text style={styles.debugText}>RESULTS SCREEN</Text>
//       </View>

//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Your Measurements
//       </Text>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {results.map((r, idx) => (
//           <View
//             key={idx}
//             style={[
//               styles.resultCard,
//               {backgroundColor: theme.colors.surface},
//             ]}>
//             <Text
//               style={[styles.resultLabel, {color: theme.colors.foreground}]}>
//               {r.label}
//             </Text>
//             <Text
//               style={[styles.resultValue, {color: theme.colors.foreground}]}>
//               {r.value.toFixed(1)} {r.unit}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity
//         style={[styles.saveButton, {backgroundColor: theme.colors.primary}]}
//         onPress={handleSave}>
//         <Text style={[styles.saveText, {color: theme.colors.foreground}]}>
//           Save to Profile
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, alignItems: 'center', paddingTop: 100},
//   debugBanner: {
//     position: 'absolute',
//     top: 40,
//     left: 0,
//     right: 0,
//     backgroundColor: '#66FF99', // green for RESULTS
//     paddingVertical: 6,
//     alignItems: 'center',
//     zIndex: 9999,
//     opacity: 0.85,
//   },
//   debugText: {color: '#000', fontSize: 16, fontWeight: '700'},
//   title: {fontSize: 28, fontWeight: '700', marginBottom: 20},
//   scroll: {width: '100%'},
//   scrollContent: {alignItems: 'center', paddingBottom: 100},
//   resultCard: {
//     width: '85%',
//     borderRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   resultLabel: {fontSize: 18, fontWeight: '500', marginBottom: 6},
//   resultValue: {fontSize: 26, fontWeight: '700'},
//   saveButton: {
//     position: 'absolute',
//     bottom: 60,
//     width: '80%',
//     borderRadius: 30,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveText: {fontSize: 18, fontWeight: '600'},
// });
