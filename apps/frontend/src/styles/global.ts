import {StyleSheet} from 'react-native';
import {tokens} from './tokens/tokens';
import type {Theme} from '../context/ThemeContext';

export const createGlobalStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingTop: 24,
      paddingBottom: 60,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 20,
    },
    header: {
      fontSize: 30,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    radius: {
      borderRadius: 50,
    },
  });
