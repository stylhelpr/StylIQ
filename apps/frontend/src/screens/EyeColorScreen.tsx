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

const eyeColors = ['Brown', 'Hazel', 'Amber', 'Green', 'Blue', 'Gray', 'Other'];

export default function EyeColorScreen({navigate}: Props) {
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
    AsyncStorage.getItem('eyeColor').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (label: string) => {
    setSelected(label);
    await AsyncStorage.setItem('eyeColor', label);
    updateProfile('eye_color', label);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Eye Color
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section}>
        <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Select your natural eye color:
        </Text>
        <View style={globalStyles.pillContainer}>
          {eyeColors.map(color => (
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
