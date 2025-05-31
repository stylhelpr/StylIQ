import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';

type Props = {
  navigate: (screen: string) => void;
};

const skinTones = [
  'Fair',
  'Light',
  'Medium',
  'Olive',
  'Tan',
  'Brown',
  'Dark Brown',
  'Deep',
];

export default function SkinToneScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('skinTone').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (label: string) => {
    setSelected(label);
    await AsyncStorage.setItem('skinTone', label);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Skin Tone"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Your Skin Tone
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Select the tone that best matches your natural skin:
        </Text>
        <View style={styles.chipGroup}>
          {skinTones.map(tone => (
            <Chip
              key={tone}
              label={tone}
              selected={selected === tone}
              onPress={() => handleSelect(tone)}
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
