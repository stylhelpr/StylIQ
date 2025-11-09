import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '../context/ThemeContext';

interface SafeScreenWrapperProps {
  children: React.ReactNode;
  topInset?: number; // optional extra padding at top
  bottomInset?: number; // optional extra padding at bottom
  keyboardOffset?: number; // optional keyboard offset override
  style?: ViewStyle;
}

/**
 * 🧩 Flexible SafeArea + Keyboard Wrapper — No scrollbars, no bounce
 * Keeps screens visually consistent while allowing per-screen overrides.
 */
export default function SafeScreenWrapper({
  children,
  topInset = 60,
  bottomInset = 20,
  keyboardOffset,
  style,
}: SafeScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const {theme} = useAppTheme();

  return (
    <SafeAreaView
      // ⬅️ Remove top edge to prevent double-padding
      edges={['left', 'right', 'bottom']}
      style={[
        styles.safeArea,
        {backgroundColor: theme.colors.background},
        style,
      ]}>
      {/* 🔹 Top spacer for legacy navbar alignment */}
      <View
        pointerEvents="none"
        style={{
          height: topInset, // no +insets.top to avoid double-count
          backgroundColor: theme.colors.background,
        }}
      />

      {/* 🧭 Main content area, keyboard-aware */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={
          keyboardOffset ?? (Platform.OS === 'ios' ? insets.top : 0)
        }>
        <View style={[styles.flex, {backgroundColor: theme.colors.background}]}>
          {children}
        </View>

        {/* 🔹 Bottom safe area spacer */}
        <View
          pointerEvents="none"
          style={{
            height: insets.bottom + bottomInset / 2, // keep minimal offset, no scroll
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
});
