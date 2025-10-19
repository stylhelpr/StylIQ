// New screen: EventPreferencesScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';

const commonEvents = [
  'Work/Office',
  'Business Travel',
  'Casual Outings',
  'Dates',
  'Weddings',
  'Vacations',
  'Nightlife',
  'Special Occasions',
  'Holidays',
  'Formal Dinners',
];

export default function EventPreferencesScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (item: string) => {
    setSelected(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item],
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <BackHeader
        title="Event Preferences"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView style={{padding: 20}}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Events & Settings
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Select common situations you want outfit help for:
        </Text>
        <View style={styles.chipGroup}>
          {commonEvents.map(e => (
            <Chip
              key={e}
              label={e}
              onPress={() => toggle(e)}
              selected={selected.includes(e)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
