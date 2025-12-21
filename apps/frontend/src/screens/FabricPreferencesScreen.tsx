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

export default function FabricPreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);
  const [customFabrics, setCustomFabrics] = useState<string[]>([]);
  const [newFabric, setNewFabric] = useState('');

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
        </View>
      </ScrollView>
    </View>
  );
}
