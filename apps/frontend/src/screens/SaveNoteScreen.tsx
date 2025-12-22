import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

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

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 60, // Space for GlobalHeader
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
    },
    saveBtn: {
      backgroundColor: theme.colors.button1,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: theme.colors.buttonText1,

      fontWeight: '600',
      fontSize: 15,
    },
    formContainer: {
      flex: 1,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.input2,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
    },
    textArea: {
      minHeight: 150,
      textAlignVertical: 'top',
    },
    helperText: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 6,
    },
  });

  if (!userId) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <View style={styles.container}>
          <View style={styles.header}>
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
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                placeholder="Note title"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>URL</Text>
              <TextInput
                placeholder="https://example.com"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.helperText}>
                Save a link from the browser
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                placeholder="Write your notes here..."
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
              />
            </View>

            {/* <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags</Text>
              <TextInput
                placeholder="fashion, inspiration, shoes"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={tagsInput}
                onChangeText={setTagsInput}
              />
              <Text style={styles.helperText}>Separate tags with commas</Text>
            </View> */}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
