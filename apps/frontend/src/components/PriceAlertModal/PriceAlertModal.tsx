import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppTheme } from '../../context/ThemeContext';
import { tokens } from '../../styles/tokens/tokens';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  visible: boolean;
  currentPrice: number;
  itemTitle: string;
  onDismiss: () => void;
  onConfirm: (targetPrice: number) => Promise<void>;
  isLoading?: boolean;
};

export default function PriceAlertModal({
  visible,
  currentPrice,
  itemTitle,
  onDismiss,
  onConfirm,
  isLoading = false,
}: Props) {
  const { theme } = useAppTheme();
  const [targetPrice, setTargetPrice] = useState(
    Math.round(currentPrice * 0.9 * 100) / 100,
  );
  const [error, setError] = useState<string | null>(null);

  const priceReduction = currentPrice - targetPrice;
  const percentReduction = Math.round((priceReduction / currentPrice) * 100);

  const handleConfirm = async () => {
    setError(null);

    if (!targetPrice || targetPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (targetPrice >= currentPrice) {
      setError('Target price must be less than current price');
      return;
    }

    try {
      await onConfirm(targetPrice);
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Failed to create price alert');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modal: {
      width: '85%',
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.foreground,
      marginTop: 8,
    },
    itemTitle: {
      fontSize: 12,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
      marginTop: 8,
    },
    priceSection: {
      backgroundColor: theme.colors.background,
      borderRadius: tokens.borderRadius.md,
      padding: 16,
      marginBottom: 20,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    priceLabel: {
      fontSize: 12,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
    },
    priceValue: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.surfaceBorder,
      marginVertical: 12,
    },
    savingsText: {
      fontSize: 12,
      color: '#10b981',
      fontWeight: tokens.fontWeight.semiBold,
    },
    inputSection: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 12,
      borderWidth: 2,
      borderColor: error ? '#ef4444' : theme.colors.surfaceBorder,
    },
    currencySymbol: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginRight: 4,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
    },
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: tokens.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.surfaceBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: tokens.borderRadius.md,
      overflow: 'hidden',
    },
    confirmText: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
      color: '#fff',
      textAlign: 'center',
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Price Alert</Text>
            <Text style={styles.subtitle}>Get notified when price drops</Text>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {itemTitle}
            </Text>
          </View>

          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Current Price</Text>
              <Text style={styles.priceValue}>${currentPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Your Target Price</Text>
              <Text style={styles.priceValue}>${targetPrice.toFixed(2)}</Text>
            </View>

            {percentReduction > 0 && (
              <Text style={styles.savingsText}>
                💰 Save ${priceReduction.toFixed(2)} ({percentReduction}%)
              </Text>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Set your target price</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={theme.colors.foreground}
                keyboardType="decimal-pad"
                value={targetPrice.toString()}
                onChangeText={value => {
                  setTargetPrice(parseFloat(value) || 0);
                  setError(null);
                }}
                editable={!isLoading}
              />
            </View>
            {error && <Text style={styles.errorText}>❌ {error}</Text>}
          </View>

          <View style={styles.actions}>
            <AppleTouchFeedback
              style={styles.cancelButton}
              onPress={onDismiss}
              disabled={isLoading}
              hapticStyle="impactLight">
              <Text style={styles.cancelText}>Cancel</Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              style={[
                styles.confirmButton,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={isLoading}
              hapticStyle="impactMedium">
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primary + 'dd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 12 }}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Create Alert</Text>
                )}
              </LinearGradient>
            </AppleTouchFeedback>
          </View>
        </View>
      </View>
    </Modal>
  );
}
