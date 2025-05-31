import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';

type Props = {
  navigate: (screen: string) => void;
};

export default function StyleProfileScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },
    link: {
      fontSize: 16,
      paddingVertical: 12,
      color: theme.colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surface,
    },
  });

  return (
    <View style={styles.container}>
      <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigate('Preferences')}>
          <Text style={styles.link}>👗 Style Preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('Measurements')}>
          <Text style={styles.link}>📏 Measurements</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('BudgetAndBrands')}>
          <Text style={styles.link}>💰 Budget & Brands</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
