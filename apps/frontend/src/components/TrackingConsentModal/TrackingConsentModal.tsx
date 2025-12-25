import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export default function TrackingConsentModal({
  visible,
  onAccept,
  onDecline,
}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 24,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.xl,
      padding: 24,
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
    },
    iconContainer: {
      alignSelf: 'center',
      backgroundColor: theme.colors.primary + '20',
      borderRadius: 50,
      padding: 16,
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.foreground3,
      textAlign: 'center',
      marginBottom: 24,
    },
    bulletContainer: {
      marginBottom: 24,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    bulletIcon: {
      marginRight: 10,
      marginTop: 2,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.foreground,
    },
    buttonContainer: {
      gap: 12,
    },
    acceptButton: {
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius.lg,
      paddingVertical: 14,
      alignItems: 'center',
    },
    acceptButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: tokens.fontWeight.semiBold,
    },
    declineButton: {
      backgroundColor: 'transparent',
      borderRadius: tokens.borderRadius.lg,
      paddingVertical: 14,
      alignItems: 'center',
    },
    declineButtonText: {
      color: theme.colors.foreground3,
      fontSize: 16,
      fontWeight: tokens.fontWeight.medium,
    },
    footer: {
      marginTop: 16,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.foreground3,
      textAlign: 'center',
    },
  });

  const bullets = [
    {icon: 'history', text: 'Pages you visit and time spent'},
    {icon: 'bookmark-outline', text: 'Items you save and bookmark'},
    {icon: 'trending-up', text: 'Shopping patterns for recommendations'},
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name="analytics"
              size={40}
              color={theme.colors.primary}
            />
          </View>

          <Text style={styles.title}>Personalize Your Experience</Text>

          <Text style={styles.description}>
            Allow StylIQ to collect browsing analytics to give you better
            shopping recommendations?
          </Text>

          <View style={styles.bulletContainer}>
            {bullets.map((bullet, index) => (
              <View key={index} style={styles.bulletRow}>
                <MaterialIcons
                  name={bullet.icon}
                  size={18}
                  color={theme.colors.primary}
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{bullet.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
              <Text style={styles.acceptButtonText}>Allow Tracking</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
              <Text style={styles.declineButtonText}>No Thanks</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              You can change this anytime in Settings
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
