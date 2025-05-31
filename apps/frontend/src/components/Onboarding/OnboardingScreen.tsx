import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

export default function OnboardingScreen() {
  const {theme} = useAppTheme();
  const [form, setForm] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    chest: '',
    waist: '',
    hips: '',
    inseam: '',
    shoeSize: '',
    shirtSize: '',
    pantSize: '',
    bodyType: '',
    skinTone: '',
    gender: '',
    favoriteBrands: '',
    fitPreference: '',
    preferredColors: '',
    occasions: '',
    styleGoal: '',
    lifestyle: '',
    budget: '',
    boldness: '',
    helpAreas: '',
  });

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.title, {color: theme.colors.primary}]}>
        Welcome to StylIQ
      </Text>

      {Object.entries(form).map(([key, value]) => (
        <View key={key} style={styles.inputGroup}>
          <Text style={[styles.label, {color: theme.colors.foreground}]}>
            {key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.foreground,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.surface,
              },
            ]}
            placeholder={`Enter ${key}`}
            placeholderTextColor="#999"
            value={value}
            onChangeText={text => handleChange(key, text)}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.submitButton}>
        <Text style={styles.submitText}>Save & Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: '#405de6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 30,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
