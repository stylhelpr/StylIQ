import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
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
  itemTitle: string;
  oldPrice: number;
  onDismiss: () => void;
  onConfirm: (newPrice: number) => Promise<void>;
  isLoading?: boolean;
};

export default function PriceUpdatePrompt({
  visible,
  itemTitle,
  oldPrice,
  onDismiss,
  onConfirm,
  isLoading = false,
}: Props) {
  const { theme } = useAppTheme();
  const [newPrice, setNewPrice] = useState(oldPrice.toString());
  const [error, setError] = useState<string | null>(null);

  const priceDifference = parseFloat(newPrice) - oldPrice;
  const percentChange = ((priceDifference / oldPrice) * 100).toFixed(1);

  const handleConfirm = async () => {
    setError(null);

    const price = parseFloat(newPrice);
    if (!price || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    try {
      await onConfirm(price);
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Failed to update price');
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
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    itemTitle: {
      fontSize: 12,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
      marginTop: 6,
    },
    priceSection: {
      backgroundColor: theme.colors.background,
      borderRadius: tokens.borderRadius.md,
      padding: 12,
      marginBottom: 16,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    priceLabel: {
      fontSize: 11,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
    },
    priceValue: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.surfaceBorder,
      marginVertical: 8,
    },
    changeText: {
      fontSize: 11,
      fontWeight: tokens.fontWeight.semiBold,
      marginTop: 4,
    },
    changeUp: {
      color: '#ef4444',
    },
    changeDown: {
      color: '#10b981',
    },
    inputSection: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 6,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 10,
      borderWidth: 2,
      borderColor: error ? '#ef4444' : theme.colors.surfaceBorder,
    },
    currencySymbol: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginRight: 4,
    },
    input: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.semiBold,
    },
    errorText: {
      fontSize: 11,
      color: '#ef4444',
      marginTop: 6,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    skipButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: tokens.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.surfaceBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    skipText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    updateButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: tokens.borderRadius.md,
      overflow: 'hidden',
    },
    updateText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
      color: '#fff',
      textAlign: 'center',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Update Price</Text>
            <Text style={styles.subtitle}>Saw a new price?</Text>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {itemTitle}
            </Text>
          </View>

          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Last Recorded</Text>
              <Text style={styles.priceValue}>${oldPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>New Price</Text>
              <Text style={styles.priceValue}>${parseFloat(newPrice || '0').toFixed(2)}</Text>
            </View>

            {priceDifference !== 0 && (
              <Text
                style={[
                  styles.changeText,
                  priceDifference > 0 ? styles.changeUp : styles.changeDown,
                ]}>
                {priceDifference > 0 ? '📈' : '📉'} {priceDifference > 0 ? '+' : ''}
                ${Math.abs(priceDifference).toFixed(2)} ({percentChange}%)
              </Text>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter the new price you see</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={theme.colors.foreground}
                keyboardType="decimal-pad"
                value={newPrice}
                onChangeText={value => {
                  setNewPrice(value);
                  setError(null);
                }}
                editable={!isLoading}
              />
            </View>
            {error && <Text style={styles.errorText}>❌ {error}</Text>}
          </View>

          <View style={styles.actions}>
            <AppleTouchFeedback
              style={styles.skipButton}
              onPress={onDismiss}
              disabled={isLoading}
              hapticStyle="impactLight">
              <Text style={styles.skipText}>Skip</Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              style={[styles.updateButton, isLoading && { opacity: 0.5 }]}
              onPress={handleConfirm}
              disabled={isLoading}
              hapticStyle="impactMedium">
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primary + 'dd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 10 }}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.updateText}>Update Price</Text>
                )}
              </LinearGradient>
            </AppleTouchFeedback>
          </View>
        </View>
      </View>
    </Modal>
  );
}
