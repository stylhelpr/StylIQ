import React from 'react';
import {View, Text, StyleSheet, TextInput, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

export default function BudgetAndBrandsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const brands = [
    'Zara',
    'UNIQLO',
    'Ferragamo',
    'Burberry',
    'Amiri',
    'GOBI',
    'Eton',
    'Ralph Lauren',
    'Gucci',
    'Theory',
  ];

  return (
    <View style={styles.container}>
      <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />
      <ScrollView
        style={[styles.container, {backgroundColor: colors.background}]}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Budget & Brands
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Your Monthly Style Budget:
        </Text>
        <TextInput
          placeholder="$ Amount"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {borderColor: colors.surface, color: colors.foreground},
          ]}
          keyboardType="numeric"
        />
        <Text
          style={[styles.subtitle, {marginTop: 20, color: colors.foreground}]}>
          Your Favorite Brands:
        </Text>
        <View style={styles.chipGroup}>
          {brands.map(b => (
            <Chip key={b} label={b} />
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
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
