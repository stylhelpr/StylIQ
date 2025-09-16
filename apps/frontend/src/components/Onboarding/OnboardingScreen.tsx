// OnboardingScreen.tsx (Updated)
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

export default function OnboardingScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const {theme} = useAppTheme();
  const [name, setName] = useState('');
  const [style, setStyle] = useState('');
  const [favoriteColor, setFavoriteColor] = useState('');

  const styles = StyleSheet.create({
    container: {flex: 1},
    content: {padding: 20, paddingTop: 60},
    heading: {
      fontSize: 26,
      fontWeight: '600',
      marginBottom: 10,
      color: theme.colors.foreground,
    },
    sub: {fontSize: 16, color: '#888', marginBottom: 24},
    input: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      fontSize: 16,
    },
    button: {
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    nudge: {
      marginTop: 24,
      fontSize: 14,
      color: '#aaa',
      textAlign: 'center',
    },
  });

  const handleContinue = () => {
    // save minimal profile
    // then navigate to profile or home
    navigate('Home');
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome to StylIQ</Text>
      <Text style={styles.sub}>Let’s set up your style basics</Text>

      <TextInput
        placeholder="Your Name"
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {color: theme.colors.foreground, borderColor: theme.colors.surface},
        ]}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Describe your style (e.g., modern, vintage)"
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {color: theme.colors.foreground, borderColor: theme.colors.surface},
        ]}
        value={style}
        onChangeText={setStyle}
      />

      <TextInput
        placeholder="Favorite color to wear"
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {color: theme.colors.foreground, borderColor: theme.colors.surface},
        ]}
        value={favoriteColor}
        onChangeText={setFavoriteColor}
      />

      <TouchableOpacity
        onPress={handleContinue}
        style={[styles.button, {backgroundColor: theme.colors.primary}]}>
        <Text style={[styles.buttonText, {color: theme.colors.background}]}>
          Continue
        </Text>
      </TouchableOpacity>

      <Text style={styles.nudge}>
        You can complete your full style profile later for even better outfit
        suggestions 🎯
      </Text>
    </ScrollView>
  );
}
