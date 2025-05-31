import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'budgetAndBrands';

export default function BudgetAndBrandsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const allBrands = [
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

  const [budget, setBudget] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => {
        if (data) {
          const parsed = JSON.parse(data);
          setBudget(parsed.budget || '');
          setSelectedBrands(parsed.brands || []);
        }
      })
      .catch(() => Alert.alert('Error loading preferences'));
  }, []);

  const toggleBrand = (label: string, selected: boolean) => {
    const updated = selected
      ? [...selectedBrands, label]
      : selectedBrands.filter(b => b !== label);
    setSelectedBrands(updated);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({budget, brands: updated}),
    );
  };

  const handleBudgetChange = (value: string) => {
    setBudget(value);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({budget: value, brands: selectedBrands}),
    );
  };

  return (
    <View style={styles.container}>
      <BackHeader
        title="Style Profile"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView style={{backgroundColor: colors.background}}>
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
          value={budget}
          onChangeText={handleBudgetChange}
        />
        <Text
          style={[styles.subtitle, {marginTop: 20, color: colors.foreground}]}>
          Your Favorite Brands:
        </Text>
        <View style={styles.chipGroup}>
          {allBrands.map(brand => (
            <Chip
              key={brand}
              label={brand}
              selected={selectedBrands.includes(brand)}
              onPress={selected => toggleBrand(brand, selected)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
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
