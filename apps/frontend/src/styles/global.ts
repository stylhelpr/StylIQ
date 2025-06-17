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
      fontSize: 19,
      fontWeight: '700',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 10,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    subLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground2,
    },
    buttonPrimary: {
      width: '100%',
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius.md,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonPrimaryText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#fff',
    },
    buttonSecondary: {
      width: 186,
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius.md,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonSecondaryText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#fff',
    },
    image1: {
      width: 92,
      height: 92,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: '#eee',
    },
  });
