import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

export default function PreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

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

  return (
    <View style={styles.container}>
      <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />
      <ScrollView
        style={[styles.container, {backgroundColor: colors.background}]}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Style Preferences
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Select the styles you’re most drawn to:
        </Text>
        <View style={styles.chipGroup}>
          {preferences.map(p => (
            <Chip key={p} label={p} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
