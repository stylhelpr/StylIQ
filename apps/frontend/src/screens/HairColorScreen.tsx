import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const hairColors = [
  'Black',
  'Brown',
  'Blonde',
  'Red',
  'Gray',
  'White',
  'Dyed - Bold',
  'Dyed - Subtle',
];

export default function HairColorScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string | null>(null);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    subtitle: {
      fontSize: 17,
      marginBottom: 20,
    },
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    AsyncStorage.getItem('hairColor').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (label: string) => {
    setSelected(label);
    await AsyncStorage.setItem('hairColor', label);
    updateProfile('hair_color', label);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Hair Color
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section}>
        <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Select your current natural or styled hair color:
        </Text>
        <View style={globalStyles.pillContainer}>
          {hairColors.map(color => (
            <Chip
              key={color}
              label={color}
              selected={selected === color}
              onPress={() => handleSelect(color)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
