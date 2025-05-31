import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';

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
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('fitPreferences').then(data => {
      if (data) setSelected(JSON.parse(data));
    });
  }, []);

  const toggleSelection = async (label: string) => {
    const updated = selected.includes(label)
      ? selected.filter(item => item !== label)
      : [...selected, label];
    setSelected(updated);
    await AsyncStorage.setItem('fitPreferences', JSON.stringify(updated));
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Fit Preferences"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Preferred Fits
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Choose your most comfortable and flattering fits:
        </Text>
        <View style={styles.chipGroup}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
