// MeasurementAutoScreen.tsx
// StylIQ — Auto measurements + manual correction

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import {useMeasurementStore} from '../../../../store/measurementStore';
import {useAppTheme} from '../context/ThemeContext';

// ---------------------------------------------
// 🔢 Measurement calculation (placeholder formulas)
// Will be replaced by real ARKit geometric math later.
// ---------------------------------------------
function computeMeasurements(frontJoints: any) {
  if (!frontJoints) return null;

  return {
    height: estimateHeight(frontJoints),
    chest: estimateChest(frontJoints),
    waist: estimateWaist(frontJoints),
    hips: estimateHips(frontJoints),
    shoulders: estimateShoulderWidth(frontJoints),
  };
}

// ---- simple math placeholders (replace later with real math) ----
const estimateHeight = j =>
  Number(((j.neck?.y ?? 0) - (j.left_ankle?.y ?? 0)) * 200).toFixed(1);

const estimateChest = j =>
  Number(Math.abs(j.left_shoulder?.x - j.right_shoulder?.x) * 120).toFixed(1);

const estimateWaist = j =>
  Number(Math.abs(j.left_hip?.x - j.right_hip?.x) * 110).toFixed(1);

const estimateHips = j =>
  Number(Math.abs(j.left_hip?.x - j.right_hip?.x) * 130).toFixed(1);

const estimateShoulderWidth = j =>
  Number(Math.abs(j.left_shoulder?.x - j.right_shoulder?.x) * 100).toFixed(1);

// ----------------------------------------------------

interface MeasurementAutoScreenProps {
  navigate: (screen: string, params?: any) => void;
}

export default function MeasurementJointsAutoScreen({
  navigate,
}: MeasurementAutoScreenProps) {
  const {theme} = useAppTheme();

  const frontPose = useMeasurementStore(s => s.frontJoints);

  const [measurements, setMeasurements] = useState<any>(null);

  // Manual adjustments stored locally before final save
  const [adjusted, setAdjusted] = useState<any>({});

  useEffect(() => {
    if (!frontPose) return;
    const computed = computeMeasurements(frontPose);
    setMeasurements(computed);
    setAdjusted(computed);
  }, [frontPose]);

  if (!measurements) {
    return (
      <View
        style={[styles.loading, {backgroundColor: theme.colors.background}]}>
        <Text style={styles.loadingText}>Analyzing posture…</Text>
      </View>
    );
  }

  const updateValue = (key: string, delta: number) => {
    setAdjusted((prev: any) => ({
      ...prev,
      [key]: Math.max(0, Number(prev[key]) + delta),
    }));
  };

  const saveAndContinue = () => {
    console.log('📏 FINAL MEASUREMENTS:', adjusted);

    // TODO: send to backend
    // await patchMeasurements(adjusted)

    navigate('Measurements', {updated: true});
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Your Measurements</Text>

        {Object.keys(adjusted).map(key => (
          <View key={key} style={styles.card}>
            <Text style={styles.label}>{formatLabel(key)}</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => updateValue(key, -1)}>
                <Text style={styles.adjustText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.value}>{adjusted[key]} cm</Text>

              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => updateValue(key, 1)}>
                <Text style={styles.adjustText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={saveAndContinue}>
          <Text style={styles.saveText}>Save Measurements</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const formatLabel = (key: string) => {
  switch (key) {
    case 'height':
      return 'Height';
    case 'chest':
      return 'Chest';
    case 'waist':
      return 'Waist';
    case 'hips':
      return 'Hips';
    case 'shoulders':
      return 'Shoulders';
    default:
      return key;
  }
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scrollContent: {
    padding: 22,
    paddingBottom: 80,
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  value: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#7A5CFF',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 28,
  },
  saveText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
  },
});
