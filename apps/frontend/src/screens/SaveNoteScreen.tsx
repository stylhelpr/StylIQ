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
  Image,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';

import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {SafeAreaView} from 'react-native-safe-area-context';
import {uploadImageToGCS} from '../api/uploadImageToGCS';

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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const pickImage = async () => {
    h('impactLight');
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    h('impactLight');
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    h('impactLight');
    setImageUri(null);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim() && !url.trim() && !imageUri) {
      Alert.alert('Empty Note', 'Please add a title, content, URL, or image.');
      return;
    }

    setSaving(true);
    h('impactMedium');

    try {
      let uploadedImageUrl: string | null = null;

      // Upload image if selected
      if (imageUri && userId) {
        setUploadingImage(true);
        const filename = `note-${Date.now()}.jpg`;
        const {publicUrl} = await uploadImageToGCS({
          localUri: imageUri,
          filename,
          userId,
        });
        uploadedImageUrl = publicUrl;
        setUploadingImage(false);
      }

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
          image_url: uploadedImageUrl,
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
      setUploadingImage(false);
    }
  };

  const hasContent = title.trim() || content.trim() || url.trim() || imageUri;

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
    imageSection: {
      marginBottom: 24,
    },
    imagePickerRow: {
      flexDirection: 'row',
      gap: 12,
    },
    imagePickerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.surface,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.inputBorder,
      borderStyle: 'dashed',
    },
    imagePickerBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    imagePreviewContainer: {
      marginTop: 12,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: {
      width: '100%',
      height: 200,
      borderRadius: 16,
    },
    removeImageBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 16,
    },
    uploadingText: {
      color: '#FFFFFF',
      marginTop: 8,
      fontSize: 14,
      fontWeight: '500',
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

            {/* Image Section */}
            <Animated.View
              style={[
                styles.imageSection,
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
                    name="image"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.label}>Image</Text>
              </View>

              {!imageUri ? (
                <View style={styles.imagePickerRow}>
                  <Pressable style={styles.imagePickerBtn} onPress={pickImage}>
                    <MaterialIcons
                      name="photo-library"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.imagePickerBtnText}>Gallery</Text>
                  </Pressable>
                  <Pressable style={styles.imagePickerBtn} onPress={takePhoto}>
                    <MaterialIcons
                      name="camera-alt"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.imagePickerBtnText}>Camera</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{uri: imageUri}}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={styles.removeImageBtn}
                    onPress={removeImage}>
                    <MaterialIcons name="close" size={20} color="#FFFFFF" />
                  </Pressable>
                  {uploadingImage && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                </View>
              )}
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
