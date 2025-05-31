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
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'userMeasurements';

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

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => {
        if (data) setValues(JSON.parse(data));
      })
      .catch(() => Alert.alert('Error loading measurements'));
  }, []);

  const handleChange = (field: string, value: string) => {
    const updated = {...values, [field]: value};
    setValues(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <View style={styles.container}>
      <BackHeader
        title="Style Profile"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView style={{backgroundColor: colors.background}}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Measurements
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Fill out your body measurements to tailor fit suggestions:
        </Text>
        {fields.map(field => (
          <TextInput
            key={field}
            placeholder={field}
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {borderColor: colors.surface, color: colors.foreground},
            ]}
            keyboardType="numeric"
            value={values[field] || ''}
            onChangeText={val => handleChange(field, val)}
          />
        ))}
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
