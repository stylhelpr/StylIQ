import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const options = [
  'Slim Fit',
  'Relaxed Fit',
  'Tailored',
  'Boxy',
  'Skinny',
  'Oversized',
];

export default function FitPreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);

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

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const loadData = async () => {
      const data = await AsyncStorage.getItem('fitPreferences');
      if (data) setSelected(JSON.parse(data));
    };
    loadData();
  }, []);

  const toggleSelection = async (label: string) => {
    const updated = selected.includes(label)
      ? selected.filter(item => item !== label)
      : [...selected, label];
    setSelected(updated);
    await AsyncStorage.setItem('fitPreferences', JSON.stringify(updated));
    updateProfile('fit_preferences', updated);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Fit Preferences
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section}>
        <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Choose your most comfortable and flattering fits:
        </Text>
        <View style={globalStyles.pillContainer}>
          {options.map(option => (
            <Chip
              key={option}
              label={option}
              selected={selected.includes(option)}
              onPress={() => toggleSelection(option)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
