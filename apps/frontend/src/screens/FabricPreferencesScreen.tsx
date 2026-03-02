import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, Keyboard} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {navigate: (screen: string) => void};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const STORAGE_KEY = 'fabricPreferences';

const defaultFabrics = [
  'Cotton',
  'Linen',
  'Wool',
  'Cashmere',
  'Silk',
  'Denim',
  'Leather',
  'Suede',
  'Polyester',
  'Nylon',
  'Fleece',
  'Jersey',
  'Tweed',
  'Velvet',
  'Corduroy',
];

const AVOID_MATERIAL_OPTIONS = [
  'Cotton',
  'Linen',
  'Wool',
  'Cashmere',
  'Silk',
  'Denim',
  'Leather',
  'Suede',
  'Polyester',
  'Nylon',
  'Fleece',
  'Jersey',
  'Tweed',
  'Velvet',
  'Corduroy',
  'Faux Fur',
  'Latex',
];

const CARE_TOLERANCE_OPTIONS = [
  'Easy care only',
  'Some special care ok',
  'Any care routine ok',
];

export default function FabricPreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);
  const [customFabrics, setCustomFabrics] = useState<string[]>([]);
  const [newFabric, setNewFabric] = useState('');

  // avoid_materials state
  const [avoidSelected, setAvoidSelected] = useState<string[]>([]);
  const [customAvoidFabrics, setCustomAvoidFabrics] = useState<string[]>([]);
  const [newAvoidFabric, setNewAvoidFabric] = useState('');

  // care_tolerance state
  const [careTolerance, setCareTolerance] = useState('');

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: theme.colors.input2,
      color: colors.foreground,
      marginTop: 12,
      borderColor: theme.colors.inputBorder,
    },
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (Array.isArray(styleProfile?.fabric_preferences)) {
      setSelected(styleProfile.fabric_preferences);
      const customOnly = styleProfile.fabric_preferences.filter(
        (f: string) => !defaultFabrics.map(x => x.toLowerCase()).includes(f.toLowerCase()),
      );
      setCustomFabrics(prev => Array.from(new Set([...prev, ...customOnly])));
    }

    // avoid_materials hydration
    if (Array.isArray(styleProfile?.avoid_materials)) {
      setAvoidSelected(styleProfile.avoid_materials);
      const customOnly = styleProfile.avoid_materials.filter(
        (f: string) =>
          !AVOID_MATERIAL_OPTIONS.map(x => x.toLowerCase()).includes(f.toLowerCase()),
      );
      setCustomAvoidFabrics(prev => Array.from(new Set([...prev, ...customOnly])));
    }

    // care_tolerance hydration
    if (styleProfile?.care_tolerance) setCareTolerance(styleProfile.care_tolerance);
  }, [styleProfile]);

  const toggleSelection = async (label: string) => {
    h('impactLight');

    const updated = selected.includes(label)
      ? selected.filter(item => item !== label)
      : [...selected, label];

    try {
      setSelected(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      updateProfile('fabric_preferences', updated);
    } catch {
      h('notificationError');
    }
  };

  const handleAddFabric = async () => {
    const trimmed = newFabric.trim();
    if (!trimmed) return;

    const allFabrics = [...defaultFabrics, ...customFabrics];
    const exists = allFabrics.some(f => f.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewFabric('');
      Keyboard.dismiss();
      return;
    }

    const updatedCustom = [...customFabrics, trimmed];
    const updatedSelected = [...selected, trimmed];

    setCustomFabrics(updatedCustom);
    setSelected(updatedSelected);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSelected));
      updateProfile('fabric_preferences', updatedSelected);
      setNewFabric('');
      Keyboard.dismiss();
      h('impactLight');
    } catch {
      h('notificationError');
    }
  };

  const toggleAvoidMaterial = async (label: string) => {
    h('impactLight');
    const updated = avoidSelected.includes(label)
      ? avoidSelected.filter(item => item !== label)
      : [...avoidSelected, label];
    setAvoidSelected(updated);
    try {
      updateProfile('avoid_materials', updated);
    } catch {
      h('notificationError');
    }
  };

  const handleAddAvoidFabric = async () => {
    const trimmed = newAvoidFabric.trim();
    if (!trimmed) return;
    const all = [...AVOID_MATERIAL_OPTIONS, ...customAvoidFabrics];
    if (all.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      setNewAvoidFabric('');
      Keyboard.dismiss();
      return;
    }
    const updatedCustom = [...customAvoidFabrics, trimmed];
    const updatedSelected = [...avoidSelected, trimmed];
    setCustomAvoidFabrics(updatedCustom);
    setAvoidSelected(updatedSelected);
    try {
      updateProfile('avoid_materials', updatedSelected);
      setNewAvoidFabric('');
      Keyboard.dismiss();
      h('impactLight');
    } catch {
      h('notificationError');
    }
  };

  const handleCareTolerance = (value: string) => {
    h('impactLight');
    setCareTolerance(value);
    try {
      updateProfile('care_tolerance', value);
    } catch {
      h('notificationError');
    }
  };

  const combinedFabrics = [...defaultFabrics, ...customFabrics];

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <View
        style={{
          height: insets.top + 60,
          backgroundColor: theme.colors.background,
        }}
      />
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Fabric Preferences
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={() => navigate('StyleProfileScreen')}>
            <BackHeader
              title=""
              onBack={() => navigate('StyleProfileScreen')}
            />
          </AppleTouchFeedback>
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Select fabrics you prefer wearing:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {combinedFabrics.map(fabric => (
                <Chip
                  key={fabric}
                  label={fabric}
                  selected={selected.includes(fabric)}
                  onPress={() => toggleSelection(fabric)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a custom fabric"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={newFabric}
              onChangeText={setNewFabric}
              onSubmitEditing={handleAddFabric}
              onBlur={handleAddFabric}
              returnKeyType="done"
            />
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Materials to always avoid:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {[...AVOID_MATERIAL_OPTIONS, ...customAvoidFabrics].map(fabric => (
                <Chip
                  key={fabric}
                  label={fabric}
                  selected={avoidSelected.includes(fabric)}
                  onPress={() => toggleAvoidMaterial(fabric)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a custom material to avoid"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={newAvoidFabric}
              onChangeText={setNewAvoidFabric}
              onSubmitEditing={handleAddAvoidFabric}
              onBlur={handleAddAvoidFabric}
              returnKeyType="done"
            />
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Care tolerance:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {CARE_TOLERANCE_OPTIONS.map(opt => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={careTolerance === opt}
                  onPress={() => handleCareTolerance(opt)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
