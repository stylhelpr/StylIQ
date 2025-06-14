import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';

type Props = {
  navigate: (screen: string) => void;
};

// ✅ Removed climate to avoid overlap with ClimateScreen
const categories = {
  daily_activities: ['Work', 'Gym', 'Outdoor', 'Travel', 'Relaxing', 'Events'],
  favorite_colors: [
    'Black',
    'White',
    'Gray',
    'Navy',
    'Beige',
    'Brights',
    'Earth Tones',
  ],
};

export default function LifestyleScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  const [selected, setSelected] = useState<{[key: string]: string[]}>({});
  const [dislikes, setDislikes] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('lifestyle').then(val => {
      if (val) {
        const parsed = JSON.parse(val);
        setSelected(parsed.selected || {});
        setDislikes(parsed.dislikes || '');
      }
    });
  }, []);

  const toggleSelect = (category: string, value: string) => {
    const existing = selected[category] || [];
    const updated = existing.includes(value)
      ? existing.filter(v => v !== value)
      : [...existing, value];

    const newState = {...selected, [category]: updated};
    setSelected(newState);
    AsyncStorage.setItem(
      'lifestyle',
      JSON.stringify({selected: newState, dislikes}),
    );
    updateProfile(category, updated);
  };

  const handleDislikesChange = (text: string) => {
    setDislikes(text);
    AsyncStorage.setItem(
      'lifestyle',
      JSON.stringify({selected, dislikes: text}),
    );
    updateProfile('disliked_styles', text);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Lifestyle"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(categories).map(([category, options]) => (
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
                  selected={selected[category]?.includes(opt)}
                  onPress={() => toggleSelect(category, opt)}
                />
              ))}
            </View>
          </View>
        ))}
        <Text style={[styles.title, {color: colors.primary}]}>
          Clothing Dislikes
        </Text>
        <TextInput
          placeholder="Ex: I hate turtlenecks and pleats"
          placeholderTextColor={colors.muted}
          value={dislikes}
          onChangeText={handleDislikesChange}
          style={[
            styles.input,
            {borderColor: colors.surface, color: colors.foreground},
          ]}
        />
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 40,
  },
});
