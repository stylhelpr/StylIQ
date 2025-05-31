// This file defines all the extended Style Profile screens and data model updates for high-quality AI styling recommendations.

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';

export default function FashionGoalsScreen({navigate}) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [goals, setGoals] = useState('');
  const [confidence, setConfidence] = useState('');
  const [boldness, setBoldness] = useState('');

  const styles = StyleSheet.create({
    container: {flex: 1, padding: 20, backgroundColor: colors.background},
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      marginTop: 14,
      color: colors.foreground,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.foreground,
      marginTop: 8,
    },
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8},
  });

  return (
    <ScrollView style={styles.container}>
      <BackHeader
        title="Fashion Goals"
        onBack={() => navigate('StyleProfileScreen')}
      />

      <Text style={styles.title}>🎯 Fashion Goals</Text>

      <Text style={styles.label}>What are your style goals?</Text>
      <TextInput
        style={styles.input}
        value={goals}
        onChangeText={setGoals}
        placeholder="E.g., Upgrade wardrobe, try new looks"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>How confident do you feel in your style?</Text>
      <View style={styles.chipRow}>
        {['Very confident', 'Somewhat', 'Need help'].map(option => (
          <Chip
            key={option}
            label={option}
            onPress={() => setConfidence(option)}
          />
        ))}
      </View>

      <Text style={styles.label}>Do you prefer bold or subtle looks?</Text>
      <View style={styles.chipRow}>
        {['Bold standout pieces', 'Neutral and subtle', 'Mix of both'].map(
          option => (
            <Chip
              key={option}
              label={option}
              onPress={() => setBoldness(option)}
            />
          ),
        )}
      </View>
    </ScrollView>
  );
}
