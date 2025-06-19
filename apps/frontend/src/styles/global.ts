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
    },
    section: {
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    sectionScroll: {
      marginBottom: 24,
      paddingLeft: 20,
    },
    header: {
      paddingLeft: 20,
      fontSize: 30,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
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
    cardLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    subLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground2,
    },
    pillContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
    },
    pill: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 18,
      marginRight: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: {width: 0, height: 1},
      elevation: 2,
      alignSelf: 'flex-start',
    },
    pillText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    buttonPrimary: {
      width: '100%',
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius.md,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonPrimaryText: {
      fontSize: 16,
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
    image2: {
      width: 165,
      height: 95,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    promptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 12,
      height: 48,
      width: '100%',
    },
    promptInput: {
      flex: 1,
      color: 'white',
      fontSize: 16,
    },
  });
