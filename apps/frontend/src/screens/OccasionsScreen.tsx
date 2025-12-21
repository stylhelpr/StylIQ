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

const STORAGE_KEY = 'occasions';

const defaultOccasions = [
  'Casual Everyday',
  'Work / Office',
  'Business Formal',
  'Date Night',
  'Weekend Outings',
  'Parties / Nightlife',
  'Weddings / Events',
  'Outdoor / Active',
  'Travel',
  'Work From Home',
  'Interviews',
  'Brunch / Social',
];

export default function OccasionsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);
  const [customOccasions, setCustomOccasions] = useState<string[]>([]);
  const [newOccasion, setNewOccasion] = useState('');

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
    if (Array.isArray(styleProfile?.occasions)) {
      setSelected(styleProfile.occasions);
      const customOnly = styleProfile.occasions.filter(
        (o: string) => !defaultOccasions.map(x => x.toLowerCase()).includes(o.toLowerCase()),
      );
      setCustomOccasions(prev => Array.from(new Set([...prev, ...customOnly])));
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
      updateProfile('occasions', updated);
    } catch {
      h('notificationError');
    }
  };

  const handleAddOccasion = async () => {
    const trimmed = newOccasion.trim();
    if (!trimmed) return;

    const allOccasions = [...defaultOccasions, ...customOccasions];
    const exists = allOccasions.some(o => o.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewOccasion('');
      Keyboard.dismiss();
      return;
    }

    const updatedCustom = [...customOccasions, trimmed];
    const updatedSelected = [...selected, trimmed];

    setCustomOccasions(updatedCustom);
    setSelected(updatedSelected);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSelected));
      updateProfile('occasions', updatedSelected);
      setNewOccasion('');
      Keyboard.dismiss();
      h('impactLight');
    } catch {
      h('notificationError');
    }
  };

  const combinedOccasions = [...defaultOccasions, ...customOccasions];

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
        Occasions
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
            What occasions do you typically dress for?
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {combinedOccasions.map(occasion => (
                <Chip
                  key={occasion}
                  label={occasion}
                  selected={selected.includes(occasion)}
                  onPress={() => toggleSelection(occasion)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a custom occasion"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={newOccasion}
              onChangeText={setNewOccasion}
              onSubmitEditing={handleAddOccasion}
              onBlur={handleAddOccasion}
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
