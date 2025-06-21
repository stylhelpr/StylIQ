import React, {useState, useEffect} from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

export default function FashionGoalsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const [goals, setGoals] = useState('');
  const [confidence, setConfidence] = useState('');
  const [boldness, setBoldness] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const load = async () => {
      const g = await AsyncStorage.getItem('goals');
      const c = await AsyncStorage.getItem('fashionConfidence');
      const b = await AsyncStorage.getItem('fashionBoldness');

      if (g) setGoals(g);
      if (c) setConfidence(c);
      if (b) setBoldness(b);
    };
    load();
  }, []);

  const handleSet = async (
    key: 'goals' | 'fashionConfidence' | 'fashionBoldness',
    value: string,
  ) => {
    if (key === 'goals') {
      setGoals(value);
      await AsyncStorage.setItem('goals', value);
      updateProfile('goals', value);
    } else if (key === 'fashionConfidence') {
      setConfidence(value);
      await AsyncStorage.setItem('fashionConfidence', value);
      updateProfile('fashion_confidence', value);
    } else {
      setBoldness(value);
      await AsyncStorage.setItem('fashionBoldness', value);
      updateProfile('fashion_boldness', value);
    }
  };

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.foreground,
    },
  });

  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Fashion Goals
      </Text>

      <View style={globalStyles.section}>
        <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
        <Text style={globalStyles.sectionTitle}>
          What are your style goals?
        </Text>
        <TextInput
          style={styles.input}
          value={goals}
          onChangeText={text => handleSet('goals', text)}
          placeholder="E.g., Upgrade wardrobe, try new looks"
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>
          How confident do you feel in your style?
        </Text>
        <View style={globalStyles.pillContainer}>
          {['Very confident', 'Somewhat', 'Need help'].map(option => (
            <Chip
              key={option}
              label={option}
              selected={confidence === option}
              onPress={() => handleSet('fashionConfidence', option)}
            />
          ))}
        </View>
      </View>

      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>
          Do you prefer bold or subtle looks?
        </Text>
        <View style={globalStyles.pillContainer}>
          {['Bold standout pieces', 'Neutral and subtle', 'Mix of both'].map(
            option => (
              <Chip
                key={option}
                label={option}
                selected={boldness === option}
                onPress={() => handleSet('fashionBoldness', option)}
              />
            ),
          )}
        </View>
      </View>
    </ScrollView>
  );
}
