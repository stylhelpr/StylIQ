// screens/OutfitFrequencyScreen.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'outfitFrequency';

const frequencies = [
  'Casual daily outfits',
  'Office wear weekdays',
  'Evening events',
  'Weekend outings',
  'Workout attire',
  'Frequent travel',
  'Seasonal rotation',
  'Minimalist rotation',
];

export default function OutfitFrequencyScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSelected(parsed.frequencies || []);
        setNotes(parsed.notes || '');
      }
    };
    load();
  }, []);

  const toggleFrequency = (freq: string) => {
    const updated = selected.includes(freq)
      ? selected.filter(f => f !== freq)
      : [...selected, freq];
    setSelected(updated);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({frequencies: updated, notes}),
    );
  };

  const updateNotes = (text: string) => {
    setNotes(text);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({frequencies: selected, notes: text}),
    );
  };

  return (
    <View style={styles.container}>
      <BackHeader
        title="Style Profile"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView style={{backgroundColor: colors.background, padding: 20}}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Outfit Frequency
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Tell us how often you wear different types of outfits:
        </Text>
        <View style={styles.chipGroup}>
          {frequencies.map(freq => (
            <Chip
              key={freq}
              label={freq}
              selected={selected.includes(freq)}
              onPress={() => toggleFrequency(freq)}
            />
          ))}
        </View>

        <Text
          style={[styles.subtitle, {color: colors.foreground, marginTop: 30}]}>
          Additional Notes:
        </Text>
        <TextInput
          placeholder="e.g., I wear business casual 5x a week, lounge on weekends"
          placeholderTextColor={colors.surface}
          value={notes}
          onChangeText={updateNotes}
          multiline
          style={[
            styles.input,
            {color: colors.foreground, borderColor: colors.surface},
          ]}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  title: {fontSize: 22, fontWeight: '700', marginBottom: 10},
  subtitle: {fontSize: 16, marginBottom: 16},
  chipGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
