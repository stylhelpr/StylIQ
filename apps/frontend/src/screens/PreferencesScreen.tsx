import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'style_preferences';

const preferences = [
  'Minimalist',
  'Streetwear',
  'Formal',
  'Luxury',
  'Bohemian',
  'Preppy',
  'Sporty',
  'Vintage',
  'Trendy',
  'Business Casual',
];

export default function PreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    subtitle: {
      fontSize: 17,
      marginBottom: 20,
    },
  });

  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const loadData = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedPrefs(JSON.parse(stored));
      }
    };
    loadData();
  }, []);

  const togglePref = async (pref: string) => {
    const isSelected = selectedPrefs.includes(pref);
    const updated = isSelected
      ? selectedPrefs.filter(p => p !== pref)
      : [...selectedPrefs, pref];

    setSelectedPrefs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    updateProfile('style_preferences', updated);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Style Preferences
      </Text>

      <ScrollView style={[globalStyles.section]}>
        <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Select the styles you’re most drawn to:
        </Text>
        <View style={globalStyles.pillContainer}>
          {preferences.map(pref => (
            <AppleTouchFeedback
              key={pref}
              onPress={() => togglePref(pref)}
              hapticStyle="impactLight">
              <View>
                <Chip label={pref} selected={selectedPrefs.includes(pref)} />
              </View>
            </AppleTouchFeedback>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
