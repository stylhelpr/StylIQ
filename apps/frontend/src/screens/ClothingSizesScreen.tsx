import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
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

const STORAGE_KEY = 'clothingSizes';

const shirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const pantSizes = ['28', '30', '32', '34', '36', '38', '40', '42'];
const dressSizes = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'];

export default function ClothingSizesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const [shirtSize, setShirtSize] = useState<string | null>(null);
  const [pantSize, setPantSize] = useState<string | null>(null);
  const [dressSize, setDressSize] = useState<string | null>(null);
  const [jacketSize, setJacketSize] = useState('');
  const [beltSize, setBeltSize] = useState('');

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: theme.colors.input2,
      color: colors.foreground,
      marginTop: 8,
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
    if (styleProfile?.prefs_jsonb?.clothing_sizes) {
      const sizes = styleProfile.prefs_jsonb.clothing_sizes;
      if (sizes.shirt) setShirtSize(sizes.shirt);
      if (sizes.pant) setPantSize(sizes.pant);
      if (sizes.dress) setDressSize(sizes.dress);
      if (sizes.jacket) setJacketSize(sizes.jacket);
      if (sizes.belt) setBeltSize(sizes.belt);
    }
  }, [styleProfile]);

  const saveSize = async (type: string, value: string | null) => {
    if (!value) return;

    const currentSizes = styleProfile?.prefs_jsonb?.clothing_sizes || {};
    const updatedSizes = {...currentSizes, [type]: value};
    const updatedPrefs = {
      ...(styleProfile?.prefs_jsonb || {}),
      clothing_sizes: updatedSizes,
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSizes));
      updateProfile('prefs_jsonb', updatedPrefs);
      h('impactLight');
    } catch {
      h('notificationError');
    }
  };

  const handleShirtSelect = (size: string) => {
    h('impactLight');
    setShirtSize(size);
    saveSize('shirt', size);
  };

  const handlePantSelect = (size: string) => {
    h('impactLight');
    setPantSize(size);
    saveSize('pant', size);
  };

  const handleDressSelect = (size: string) => {
    h('impactLight');
    setDressSize(size);
    saveSize('dress', size);
  };

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
        Clothing Sizes
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
            Enter your clothing sizes for better shopping recommendations:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>

            <Text style={styles.sectionLabel}>Shirt / Top Size</Text>
            <View style={globalStyles.pillContainer}>
              {shirtSizes.map(size => (
                <Chip
                  key={size}
                  label={size}
                  selected={shirtSize === size}
                  onPress={() => handleShirtSelect(size)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Pant Waist Size</Text>
            <View style={globalStyles.pillContainer}>
              {pantSizes.map(size => (
                <Chip
                  key={size}
                  label={size}
                  selected={pantSize === size}
                  onPress={() => handlePantSelect(size)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Dress Size (if applicable)</Text>
            <View style={globalStyles.pillContainer}>
              {dressSizes.map(size => (
                <Chip
                  key={size}
                  label={size}
                  selected={dressSize === size}
                  onPress={() => handleDressSelect(size)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Jacket/Blazer Size</Text>
            <TextInput
              placeholder="e.g., 40R, 42L"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={jacketSize}
              onChangeText={setJacketSize}
              onBlur={() => saveSize('jacket', jacketSize)}
              returnKeyType="done"
            />

            <Text style={styles.sectionLabel}>Belt Size</Text>
            <TextInput
              placeholder="e.g., 32, 34"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={beltSize}
              onChangeText={setBeltSize}
              onBlur={() => saveSize('belt', beltSize)}
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
