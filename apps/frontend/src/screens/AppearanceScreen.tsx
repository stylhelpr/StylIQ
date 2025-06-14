// AppearanceScreen.tsx
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';

type Props = {
  navigate: (screen: string) => void;
};

const fields = {
  proportions: [
    'Short Legs',
    'Long Legs',
    'Short Torso',
    'Long Torso',
    'Balanced',
  ],
};

export default function AppearanceScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  const [selected, setSelected] = useState<{[key: string]: string}>({});

  useEffect(() => {
    AsyncStorage.getItem('appearance').then(val => {
      if (val) setSelected(JSON.parse(val));
    });
  }, []);

  const handleSelect = (category: string, value: string) => {
    const updated = {...selected, [category]: value};
    setSelected(updated);
    AsyncStorage.setItem('appearance', JSON.stringify(updated));
    updateProfile(category, value);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Appearance"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(fields).map(([category, options]) => (
          <View key={category}>
            <Text style={[styles.title, {color: colors.primary}]}>
              {category
                .replace(/_/g, ' ')
                .replace(/(^\w|\s\w)/g, t => t.toUpperCase())}
            </Text>
            <View style={styles.chipGroup}>
              {options.map(opt => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={selected[category] === opt}
                  onPress={() => handleSelect(category, opt)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 20},
  title: {fontSize: 16, fontWeight: '600', marginBottom: 6},
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
});
