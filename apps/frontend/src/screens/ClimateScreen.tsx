import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

const climateOptions = [
  'Tropical',
  'Arid',
  'Temperate',
  'Continental',
  'Polar',
];

const travelOptions = ['Rarely', 'Sometimes', 'Often', 'Always'];

export default function ClimateScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [selectedClimate, setSelectedClimate] = useState<string | null>(null);
  const [selectedTravel, setSelectedTravel] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const c = await AsyncStorage.getItem('climate');
      const t = await AsyncStorage.getItem('travel');
      if (c) setSelectedClimate(c);
      if (t) setSelectedTravel(t);
    };
    loadData();
  }, []);

  const handleSelect = async (type: 'climate' | 'travel', value: string) => {
    if (type === 'climate') {
      setSelectedClimate(value);
      await AsyncStorage.setItem('climate', value);
    } else {
      setSelectedTravel(value);
      await AsyncStorage.setItem('travel', value);
    }
  };

  return (
    <View style={styles.container}>
      <BackHeader
        title="Climate & Travel"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        style={{backgroundColor: colors.background}}>
        <Text style={[styles.title, {color: colors.primary}]}>Climate</Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          What type of climate do you live in?
        </Text>
        <View style={styles.chipGroup}>
          {climateOptions.map(option => (
            <Chip
              key={option}
              label={option}
              selected={selectedClimate === option}
              onPress={() => handleSelect('climate', option)}
            />
          ))}
        </View>

        <Text style={[styles.title, {color: colors.primary, marginTop: 32}]}>
          Travel Frequency
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          How often do you travel to different climates?
        </Text>
        <View style={styles.chipGroup}>
          {travelOptions.map(option => (
            <Chip
              key={option}
              label={option}
              selected={selectedTravel === option}
              onPress={() => handleSelect('travel', option)}
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 15,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
