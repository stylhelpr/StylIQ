import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

const styleIcons = [
  'Kanye West',
  'Rihanna',
  'Zayn Malik',
  'Hailey Bieber',
  'David Beckham',
  'Zendaya',
  'Harry Styles',
  'Pharrell',
  'ASAP Rocky',
  'Rosie Huntington-Whiteley',
  'Timothée Chalamet',
  'Victoria Beckham',
];

export default function StyleIconsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('styleIcons');
      if (stored) setSelectedIcons(JSON.parse(stored));
    };
    load();
  }, []);

  const toggleIcon = async (icon: string) => {
    const updated = selectedIcons.includes(icon)
      ? selectedIcons.filter(i => i !== icon)
      : [...selectedIcons, icon];
    setSelectedIcons(updated);
    await AsyncStorage.setItem('styleIcons', JSON.stringify(updated));
  };

  return (
    <View style={styles.container}>
      <BackHeader
        title="Style Icons"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, {color: colors.primary}]}>
          Who Inspires Your Style?
        </Text>
        <View style={styles.chipGroup}>
          {styleIcons.map(icon => (
            <Chip
              key={icon}
              label={icon}
              selected={selectedIcons.includes(icon)}
              onPress={() => toggleIcon(icon)}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
