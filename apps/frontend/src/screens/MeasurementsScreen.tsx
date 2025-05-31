import React from 'react';
import {View, Text, StyleSheet, TextInput, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

export default function MeasurementsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const fields = [
    'Height (in)',
    'Weight (lbs)',
    'Chest (in)',
    'Waist (in)',
    'Inseam (in)',
    'Shoe Size',
  ];

  return (
    <View style={styles.container}>
      <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />
      <ScrollView
        style={[styles.container, {backgroundColor: colors.background}]}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Measurements
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Fill out your body measurements to tailor fit suggestions:
        </Text>
        {fields.map(f => (
          <TextInput
            key={f}
            placeholder={f}
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {borderColor: colors.surface, color: colors.foreground},
            ]}
            keyboardType="numeric"
          />
        ))}
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
});
