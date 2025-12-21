import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {
  navigate: (screen: string) => void;
};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type as any, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const presetIcons = [
  'Kanye West',
  'Rihanna',
  'Zayn Malik',
  'Hailey Bieber',
  'David Beckham',
  'Zendaya',
  'Harry Styles',
  'Pharrell',
  'ASAP Rocky',
  'Rosie Huntington-Whiteley',
  'Timothée Chalamet',
  'Victoria Beckham',
];

export default function StyleIconsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const insets = useSafeAreaInsets();

  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
  const [customIcon, setCustomIcon] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch, isLoading} =
    useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (!styleProfile) return;
    if (styleProfile.style_icons) {
      const icons = Array.isArray(styleProfile.style_icons)
        ? styleProfile.style_icons
        : typeof styleProfile.style_icons === 'string'
          ? styleProfile.style_icons
              .replace(/[{}"]/g, '')
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];
      setSelectedIcons(icons);
    }
  }, [styleProfile]);

  const toggleIcon = (icon: string) => {
    h('impactLight');

    const updated = selectedIcons.includes(icon)
      ? selectedIcons.filter(i => i !== icon)
      : [...selectedIcons, icon];

    setSelectedIcons(updated);

    try {
      updateProfile('style_icons', updated);
    } catch {
      h('notificationError');
    }
  };

  const addCustomIcon = () => {
    const trimmed = customIcon.trim();
    if (!trimmed || selectedIcons.includes(trimmed)) return;

    h('impactMedium');
    const updated = [...selectedIcons, trimmed];
    setSelectedIcons(updated);
    setCustomIcon('');

    try {
      updateProfile('style_icons', updated);
    } catch {
      h('notificationError');
    }
  };

  // Get custom icons (ones not in preset list)
  const customIcons = selectedIcons.filter(icon => !presetIcons.includes(icon));

  const styles = StyleSheet.create({
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      gap: 10,
    },
    input: {
      flex: 1,
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: tokens.borderRadius.md,
      padding: 12,
      fontSize: 16,
      backgroundColor: theme.colors.input2,
      color: theme.colors.foreground,
      borderColor: theme.colors.inputBorder,
    },
    addButton: {
      backgroundColor: theme.colors.button1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: tokens.borderRadius.md,
    },
    addButtonText: {
      color: theme.colors.buttonText1,
      fontSize: 16,
      fontWeight: '600',
    },
    customSection: {
      marginTop: 20,
    },
    customLabel: {
      fontSize: 14,
      color: theme.colors.muted,
      marginBottom: 8,
    },
  });

  if (isLoading) {
    return (
      <View
        style={[
          globalStyles.container,
          {
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <View
        style={{
          height: insets.top + 60,
          backgroundColor: theme.colors.background,
        }}
      />
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Style Icons
      </Text>

      <View style={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={() => navigate('StyleProfileScreen')}>
            <BackHeader
              title=""
              onBack={() => navigate('StyleProfileScreen')}
            />
          </AppleTouchFeedback>
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          <Text style={globalStyles.sectionTitle4}>
            Who Inspires Your Style?
          </Text>
          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {presetIcons.map(icon => (
                <Chip
                  key={icon}
                  label={icon}
                  selected={selectedIcons.includes(icon)}
                  onPress={() => toggleIcon(icon)}
                />
              ))}
            </View>

            {customIcons.length > 0 && (
              <View style={styles.customSection}>
                <Text style={styles.customLabel}>Your custom icons:</Text>
                <View style={globalStyles.pillContainer}>
                  {customIcons.map(icon => (
                    <Chip
                      key={icon}
                      label={icon}
                      selected={true}
                      onPress={() => toggleIcon(icon)}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={customIcon}
                onChangeText={setCustomIcon}
                placeholder="Add your own style icon..."
                placeholderTextColor={theme.colors.muted}
                onSubmitEditing={addCustomIcon}
                returnKeyType="done"
              />
              <AppleTouchFeedback
                hapticStyle="impactMedium"
                onPress={addCustomIcon}
                style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </AppleTouchFeedback>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
