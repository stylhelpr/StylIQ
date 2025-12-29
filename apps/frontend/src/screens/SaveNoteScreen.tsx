import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';

import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {SafeAreaView} from 'react-native-safe-area-context';

type Props = {
  navigate: (screen: any, params?: any) => void;
  params?: {
    url?: string;
    title?: string;
    content?: string;
  };
};

export default function SaveNoteScreen({navigate, params}: Props) {
  const userId = useUUID();
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [url, setUrl] = useState(params?.url || '');
  const [title, setTitle] = useState(params?.title || '');
  const [content, setContent] = useState(params?.content || '');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Animation refs
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-15)).current;
  const titleInputAnim = useRef(new Animated.Value(0)).current;
  const urlInputAnim = useRef(new Animated.Value(0)).current;
  const contentInputAnim = useRef(new Animated.Value(0)).current;
  const saveBtnScaleAnim = useRef(new Animated.Value(1)).current;
  const [titleFocused, setTitleFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);
  const [contentFocused, setContentFocused] = useState(false);

  // Entrance animations
  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(titleInputAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
      Animated.spring(urlInputAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
      Animated.spring(contentInputAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
    ]).start();
  }, []);

  // Save button press animation
  const handleSavePressIn = () => {
    Animated.spring(saveBtnScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleSavePressOut = () => {
    Animated.spring(saveBtnScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const h = (
    type:
      | 'impactLight'
      | 'impactMedium'
      | 'impactHeavy'
      | 'notificationSuccess',
  ) =>
    ReactNativeHapticFeedback.trigger(type, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  const handleSave = async () => {
    if (!title.trim() && !content.trim() && !url.trim()) {
      Alert.alert('Empty Note', 'Please add a title, content, or URL.');
      return;
    }

    setSaving(true);
    h('impactMedium');

    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await fetch(`${API_BASE_URL}/saved-notes`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          url: url.trim() || null,
          title: title.trim() || null,
          content: content.trim() || null,
          tags: tags.length > 0 ? tags : null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save note');
      }

      h('notificationSuccess');
      navigate('Notes');
    } catch (err) {
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasContent = title.trim() || content.trim() || url.trim();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 60,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    saveBtn: {
      borderRadius: 22,
      overflow: 'hidden',
    },
    saveBtnGradient: {
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    saveBtnDisabled: {
      backgroundColor: theme.colors.muted + '30',
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 15,
    },
    saveBtnTextDisabled: {
      color: colors.muted,
      fontWeight: '600',
      fontSize: 15,
    },
    formContainer: {
      flex: 1,
      paddingTop: 8,
    },
    inputGroup: {
      marginBottom: 24,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 8,
    },
    labelIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputWrapper: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: theme.colors.inputBorder,
    },
    inputWrapperFocused: {
      borderColor: theme.colors.primary,
    },
    input: {
      backgroundColor: theme.colors.input2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 16,
      color: colors.foreground,
    },
    textArea: {
      minHeight: 180,
      textAlignVertical: 'top',
      paddingTop: 16,
    },
    helperText: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 8,
      marginLeft: 4,
    },
    tipContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '10',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 24,
      gap: 10,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
  });

  if (!userId) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerFadeAnim,
                transform: [{translateY: headerSlideAnim}],
              },
            ]}>
            <View style={styles.headerLeft}>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={() => navigate('Notes')}>
                <MaterialIcons
                  name="arrow-back-ios"
                  size={24}
                  color={colors.foreground}
                />
              </AppleTouchFeedback>
              <Text style={styles.title}>New Note</Text>
            </View>
            <Animated.View
              style={[styles.saveBtn, {transform: [{scale: saveBtnScaleAnim}]}]}>
              <Pressable
                onPress={handleSave}
                onPressIn={handleSavePressIn}
                onPressOut={handleSavePressOut}
                disabled={saving || !hasContent}>
                {hasContent && !saving ? (
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.saveBtnGradient}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.saveBtnDisabled}>
                    <Text style={styles.saveBtnTextDisabled}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </Animated.View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Animated.View
              style={[
                styles.inputGroup,
                {
                  opacity: titleInputAnim,
                  transform: [
                    {
                      translateY: titleInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <View style={styles.labelRow}>
                <View style={styles.labelIcon}>
                  <MaterialIcons
                    name="title"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.label}>Title</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  titleFocused && styles.inputWrapperFocused,
                ]}>
                <TextInput
                  placeholder="Note title"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => setTitleFocused(false)}
                />
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.inputGroup,
                {
                  opacity: urlInputAnim,
                  transform: [
                    {
                      translateY: urlInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <View style={styles.labelRow}>
                <View style={styles.labelIcon}>
                  <MaterialIcons
                    name="link"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.label}>URL</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  urlFocused && styles.inputWrapperFocused,
                ]}>
                <TextInput
                  placeholder="https://example.com"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onFocus={() => setUrlFocused(true)}
                  onBlur={() => setUrlFocused(false)}
                />
              </View>
              <Text style={styles.helperText}>
                Save a link from the browser
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.inputGroup,
                {
                  opacity: contentInputAnim,
                  transform: [
                    {
                      translateY: contentInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <View style={styles.labelRow}>
                <View style={styles.labelIcon}>
                  <MaterialIcons
                    name="edit"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.label}>Notes</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  contentFocused && styles.inputWrapperFocused,
                ]}>
                <TextInput
                  placeholder="Write your notes here..."
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.textArea]}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={6}
                  onFocus={() => setContentFocused(true)}
                  onBlur={() => setContentFocused(false)}
                />
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.tipContainer,
                {
                  opacity: contentInputAnim,
                },
              ]}>
              <MaterialIcons
                name="lightbulb-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.tipText}>
                Tip: You can also save notes directly from the in-app browser
                using the share menu.
              </Text>
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
