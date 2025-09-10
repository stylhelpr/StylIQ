// screens/Onboarding/OnboardingScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

export default function OnboardingScreen() {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    // profile_picture: '',
    profession: '',
    fashion_level: '',
    gender_presentation: '',
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  const styles = StyleSheet.create({
    container: {flex: 1},
    card: {
      padding: 20,
      borderRadius: 20,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      backgroundColor: theme.colors.frostedGlass,
      margin: 6,
    },
    title: {
      fontSize: 36,
      fontWeight: '600',
      marginBottom: 22,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.primary,
      textTransform: 'capitalize',
    },
    input: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 22,
      fontSize: 15,
      backgroundColor: theme.colors.surface3,
      color: theme.colors.primary,
    },
    button: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
      backgroundColor: theme.colors.button1,
    },
    buttonText: {fontSize: 16, fontWeight: '600', color: theme.colors.primary},
  });

  return (
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
        <Text style={styles.title}>Welcome to StylHelpr</Text>

        {Object.keys(form).map(field => (
          <View key={field}>
            <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter ${field.replace(/_/g, ' ')}`}
              placeholderTextColor={theme.colors.inputText1}
              value={form[field as keyof typeof form]}
              onChangeText={val =>
                handleChange(field as keyof typeof form, val)
              }
            />
          </View>
        ))}

        <AppleTouchFeedback onPress={() => {}}>
          <TouchableOpacity style={styles.button}>
            <Text style={{fontSize: 13, color: 'white', fontWeight: '600'}}>
              Save Profile
            </Text>
          </TouchableOpacity>
        </AppleTouchFeedback>
      </Animatable.View>
    </ScrollView>
  );
}
