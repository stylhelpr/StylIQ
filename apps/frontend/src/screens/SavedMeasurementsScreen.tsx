import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  TextInput,
  Switch,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {useUUID} from '../context/UUIDContext';
import {useSavedMeasurements} from '../hooks/useSavedMeasurements';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';

type Props = {
  navigate: (screen: string) => void;
};

export default function SavedMeasurementsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const uuid = useUUID();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const {data: savedMeasurements, isLoading} = useSavedMeasurements(uuid);

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>(
    'metric',
  );

  // Conversion functions
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 100) / 100;
  const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 100) / 100;
  const cmToInches = (cm: number) => cm / 2.54;

  // Format measurement with both cm and inches
  const formatMeasurement = (cm: number) => {
    const inches = cmToInches(cm);
    return `${cm.toFixed(1)} cm (${inches.toFixed(1)}″)`;
  };

  // Get height in display format
  const getHeightDisplay = () => {
    if (!height) return '';
    const heightNum = parseFloat(height);
    if (unitPreference === 'imperial') {
      const totalInches = heightNum / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round((totalInches % 12) * 100) / 100;
      return `${feet}'${inches}"`;
    }
    return height;
  };

  // Initialize values from savedMeasurements
  useEffect(() => {
    if (savedMeasurements) {
      setHeight(
        savedMeasurements.height ? String(savedMeasurements.height) : '',
      );
      setWeight(
        savedMeasurements.weight ? String(savedMeasurements.weight) : '',
      );
      setShoeSize(
        savedMeasurements.shoe_size ? String(savedMeasurements.shoe_size) : '',
      );
    }
  }, [savedMeasurements]);

  const saveAdditionalInfo = async () => {
    if (!uuid) return;

    try {
      setIsSaving(true);
      const token = await getAccessToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/style-profiles/${uuid}/measurements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          shoe_size: shoeSize ? parseFloat(shoeSize) : null,
        }),
      });
    } catch (error) {
      console.error('Error saving additional info:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const styles = StyleSheet.create({
    screen: {flex: 1},
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.xxl,
      borderColor: theme.colors.surfaceBorder,
      borderWidth: 1,
      padding: 20,
      marginBottom: 20,
    },
    measurementRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.separator2,
    },
    measurementLabel: {
      fontSize: 15,
      color: theme.colors.muted,
      fontWeight: '500',
    },
    measurementValue: {
      fontSize: 15,
      color: theme.colors.foreground,
      fontWeight: '600',
    },
  });

  if (isLoading) {
    return (
      <View
        style={[globalStyles.container, {backgroundColor: colors.background}]}>
        <View
          style={{
            height: insets.top + 60,
            backgroundColor: theme.colors.background,
          }}
        />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{color: 'gray', marginTop: 12}}>
          Loading measurements...
        </Text>
      </View>
    );
  }

  if (!savedMeasurements?.chest) {
    return (
      <View
        style={[globalStyles.container, {backgroundColor: colors.background}]}>
        <View
          style={{
            height: insets.top + 60,
            backgroundColor: theme.colors.background,
          }}
        />
        <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
          Saved Measurements
        </Text>

        <View style={globalStyles.section}>
          <View style={globalStyles.backContainer}>
            <BackHeader
              title=""
              onBack={() => navigate('StyleProfileScreen')}
            />
            <Text style={globalStyles.backText}>Back</Text>
          </View>

          <View style={globalStyles.centeredSection}>
            <Text
              style={{
                color: theme.colors.muted,
                textAlign: 'center',
                fontSize: 16,
              }}>
              No measurements saved yet. Get measured to see your results here!
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        globalStyles.container,
        {
          backgroundColor: colors.background,
          opacity: fadeAnim,
        },
      ]}>
      <View
        style={{
          height: insets.top + 60,
          backgroundColor: theme.colors.background,
        }}
      />
      <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
        Saved Measurements
      </Text>

      <View style={globalStyles.section}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[globalStyles.section, {paddingBottom: 500}]}>
            <View style={globalStyles.centeredSection}>
              {/* Additional Info */}
              <View style={styles.card}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: theme.colors.foreground,
                    }}>
                    Additional Info
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                    <Text style={{color: theme.colors.muted, fontSize: 12}}>
                      Units:{' '}
                      {unitPreference === 'imperial' ? 'in/lbs' : 'cm/kg'}
                    </Text>
                    <Switch
                      value={unitPreference === 'metric'}
                      onValueChange={val =>
                        setUnitPreference(val ? 'metric' : 'imperial')
                      }
                      trackColor={{
                        false: colors.muted,
                        true: theme.colors.button1,
                      }}
                      thumbColor={colors.foreground}
                    />
                  </View>
                </View>

                <View style={{marginBottom: 12}}>
                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 14,
                      marginBottom: 6,
                      fontWeight: '500',
                    }}>
                    Height {unitPreference === 'imperial' ? '(ft/in)' : '(cm)'}
                  </Text>
                  <TextInput
                    placeholder="Enter height"
                    placeholderTextColor={colors.muted}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.inputBorder || colors.muted,
                      borderRadius: 8,
                      padding: 12,
                      color: colors.foreground,
                      fontSize: 15,
                    }}
                    keyboardType="number-pad"
                    value={
                      unitPreference === 'metric' ? height : getHeightDisplay()
                    }
                    onChangeText={val => {
                      if (unitPreference === 'metric') {
                        setHeight(val);
                      } else {
                        // Parse feet and inches from input like "6 0" or "6'0"
                        const cleanVal = val.replace(/[^\d.]/g, ' ').trim();
                        const parts = cleanVal.split(/\s+/);
                        if (parts.length === 2) {
                          const feet = parseFloat(parts[0]) || 0;
                          const inches = parseFloat(parts[1]) || 0;
                          const cm =
                            Math.round((feet * 30.48 + inches * 2.54) * 100) /
                            100;
                          setHeight(String(cm));
                        }
                      }
                    }}
                  />
                </View>

                <View style={{marginBottom: 12}}>
                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 14,
                      marginBottom: 6,
                      fontWeight: '500',
                    }}>
                    Weight {unitPreference === 'imperial' ? 'lbs)' : '(kg)'}
                  </Text>
                  <TextInput
                    placeholder="Enter weight"
                    placeholderTextColor={colors.muted}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.inputBorder || colors.muted,
                      borderRadius: 8,
                      padding: 12,
                      color: colors.foreground,
                      fontSize: 15,
                    }}
                    keyboardType="number-pad"
                    value={
                      unitPreference === 'imperial'
                        ? weight
                        : weight
                        ? String(kgToLbs(parseFloat(weight)))
                        : ''
                    }
                    onChangeText={val => {
                      if (unitPreference === 'imperial') {
                        setWeight(val);
                      } else {
                        // Convert lbs to kg
                        const kg = val ? lbsToKg(parseFloat(val)) : '';
                        setWeight(String(kg));
                      }
                    }}
                  />
                </View>

                <View style={{marginBottom: 12}}>
                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 14,
                      marginBottom: 6,
                      fontWeight: '500',
                    }}>
                    Shoe Size (US)
                  </Text>
                  <TextInput
                    placeholder="Enter shoe size"
                    placeholderTextColor={colors.muted}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.inputBorder || colors.muted,
                      borderRadius: 8,
                      padding: 12,
                      color: colors.foreground,
                      fontSize: 15,
                    }}
                    keyboardType="decimal-pad"
                    value={shoeSize}
                    onChangeText={setShoeSize}
                  />
                </View>

                <AppleTouchFeedback
                  onPress={saveAdditionalInfo}
                  hapticStyle="impactLight"
                  style={{
                    backgroundColor: theme.colors.button1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 4,
                  }}>
                  <Text
                    style={{
                      color: theme.colors.buttonText1,
                      fontSize: 14,
                      fontWeight: '600',
                    }}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Text>
                </AppleTouchFeedback>
              </View>

              {/* Core Measurements */}
              <View style={styles.card}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.colors.foreground,
                    marginBottom: 16,
                  }}>
                  Core Measurements
                </Text>

                <View style={styles.measurementRow}>
                  <Text style={styles.measurementLabel}>Chest</Text>
                  <Text style={styles.measurementValue}>
                    {formatMeasurement(
                      parseFloat(String(savedMeasurements.chest || 0)),
                    )}
                  </Text>
                </View>

                <View style={styles.measurementRow}>
                  <Text style={styles.measurementLabel}>Waist</Text>
                  <Text style={styles.measurementValue}>
                    {formatMeasurement(
                      parseFloat(String(savedMeasurements.waist || 0)),
                    )}
                  </Text>
                </View>

                <View style={styles.measurementRow}>
                  <Text style={styles.measurementLabel}>Hip</Text>
                  <Text style={styles.measurementValue}>
                    {formatMeasurement(
                      parseFloat(String(savedMeasurements.hip || 0)),
                    )}
                  </Text>
                </View>

                <View style={styles.measurementRow}>
                  <Text style={styles.measurementLabel}>Shoulder Width</Text>
                  <Text style={styles.measurementValue}>
                    {formatMeasurement(
                      parseFloat(String(savedMeasurements.shoulder_width || 0)),
                    )}
                  </Text>
                </View>

                <View style={[styles.measurementRow, {borderBottomWidth: 0}]}>
                  <Text style={styles.measurementLabel}>Inseam</Text>
                  <Text style={styles.measurementValue}>
                    {formatMeasurement(
                      parseFloat(String(savedMeasurements.inseam || 0)),
                    )}
                  </Text>
                </View>
              </View>

              {/* All Measurements */}
              {savedMeasurements.all_measurements &&
                Object.keys(savedMeasurements.all_measurements).length > 0 && (
                  <View style={styles.card}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: theme.colors.foreground,
                        marginBottom: 16,
                      }}>
                      All 30 Measurements
                    </Text>

                    {Object.entries(savedMeasurements.all_measurements).map(
                      ([label, value], idx, arr) => (
                        <View
                          key={label}
                          style={[
                            styles.measurementRow,
                            {borderBottomWidth: idx === arr.length - 1 ? 0 : 1},
                          ]}>
                          <Text style={styles.measurementLabel}>{label}</Text>
                          <Text style={styles.measurementValue}>
                            {formatMeasurement(parseFloat(String(value || 0)))}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                )}

              {/* Retake Measurements Button */}
              <AppleTouchFeedback
                onPress={() => navigate('MeasurementLiveScreen')}
                hapticStyle="impactMedium"
                style={{
                  backgroundColor: theme.colors.button1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                <Text
                  style={{
                    color: theme.colors.buttonText1,
                    fontSize: 17,
                    fontWeight: '600',
                  }}>
                  Retake Measurements
                </Text>
              </AppleTouchFeedback>
            </View>
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}
