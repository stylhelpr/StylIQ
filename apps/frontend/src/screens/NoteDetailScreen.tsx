import React, {useState, useEffect} from 'react';
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
  Linking,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {SafeAreaView} from 'react-native-safe-area-context';

type SavedNote = {
  id: string;
  user_id: string;
  url?: string;
  title?: string;
  content?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
};

type Props = {
  navigate: (screen: any, params?: any) => void;
  params?: {
    note: SavedNote;
  };
};

export default function NoteDetailScreen({navigate, params}: Props) {
  const userId = useUUID();
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const note = params?.note;

  const [title, setTitle] = useState(note?.title || '');
  const [url, setUrl] = useState(note?.url || '');
  const [content, setContent] = useState(note?.content || '');
  const [tagsInput, setTagsInput] = useState(note?.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  // Track changes
  useEffect(() => {
    if (!note) return;
    const changed =
      title !== (note.title || '') ||
      url !== (note.url || '') ||
      content !== (note.content || '') ||
      tagsInput !== (note.tags?.join(', ') || '');
    setHasChanges(changed);
  }, [title, url, content, tagsInput, note]);

  const handleSave = async () => {
    if (!note) return;

    setSaving(true);
    h('impactMedium');

    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await fetch(`${API_BASE_URL}/saved-notes/${note.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
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
      setHasChanges(false);
      navigate('Notes');
    } catch (err) {
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    h('impactMedium');
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE_URL}/saved-notes/${note.id}`, {
              method: 'DELETE',
            });
            h('notificationSuccess');
            navigate('Notes');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  };

  const openUrl = () => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open URL');
      });
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert('Unsaved Changes', 'Do you want to save your changes?', [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigate('Notes'),
        },
        {text: 'Cancel', style: 'cancel'},
        {text: 'Save', onPress: handleSave},
      ]);
    } else {
      navigate('Notes');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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
      paddingVertical: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    backText: {
      fontSize: 17,
      color: theme.colors.primary,
    },
    saveBtn: {
      opacity: hasChanges ? 1 : 0.4,
    },
    saveBtnText: {
      fontSize: 17,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    dateText: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 20,
    },
    formContainer: {
      flex: 1,
    },
    titleInput: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
      paddingVertical: 8,
      marginBottom: 8,
    },
    urlContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.input2,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
      gap: 8,
    },
    urlInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
    },
    urlOpenBtn: {
      padding: 4,
    },
    contentInput: {
      fontSize: 16,
      color: colors.foreground,
      lineHeight: 24,
      minHeight: 200,
      textAlignVertical: 'top',
    },
    tagsContainer: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.inputBorder,
    },
    tagsLabel: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 8,
    },
    tagsInput: {
      fontSize: 15,
      color: colors.foreground,
      paddingVertical: 8,
    },
  });

  if (!userId || !note) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerLeft} onPress={handleBack}>
              <MaterialIcons
                name="arrow-back-ios"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.backText}>Notes</Text>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleDelete}>
                <MaterialIcons
                  name="delete-outline"
                  size={24}
                  color={colors.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={!hasChanges || saving}>
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving...' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.dateText}>
            {formatDate(note.updated_at || note.created_at)}
          </Text>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <TextInput
              placeholder="Title"
              placeholderTextColor={colors.muted}
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
            />

            {(url || !content) && (
              <View style={styles.urlContainer}>
                <MaterialIcons name="link" size={20} color={colors.muted} />
                <TextInput
                  placeholder="URL"
                  placeholderTextColor={colors.muted}
                  style={styles.urlInput}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                {url ? (
                  <TouchableOpacity style={styles.urlOpenBtn} onPress={openUrl}>
                    <MaterialIcons
                      name="open-in-new"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <TextInput
              placeholder="Start typing..."
              placeholderTextColor={colors.muted}
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              multiline
            />

            {/* <View style={styles.tagsContainer}>
              <Text style={styles.tagsLabel}>TAGS</Text>
              <TextInput
                placeholder="Add tags separated by commas"
                placeholderTextColor={colors.muted}
                style={styles.tagsInput}
                value={tagsInput}
                onChangeText={setTagsInput}
              />
            </View> */}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
//   Linking,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {SafeAreaView} from 'react-native-safe-area-context';

// type SavedNote = {
//   id: string;
//   user_id: string;
//   url?: string;
//   title?: string;
//   content?: string;
//   tags?: string[];
//   created_at: string;
//   updated_at: string;
// };

// type Props = {
//   navigate: (screen: any, params?: any) => void;
//   params?: {
//     note: SavedNote;
//   };
// };

// export default function NoteDetailScreen({navigate, params}: Props) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const note = params?.note;

//   const [title, setTitle] = useState(note?.title || '');
//   const [url, setUrl] = useState(note?.url || '');
//   const [content, setContent] = useState(note?.content || '');
//   const [tagsInput, setTagsInput] = useState(note?.tags?.join(', ') || '');
//   const [saving, setSaving] = useState(false);
//   const [hasChanges, setHasChanges] = useState(false);

//   const h = (
//     type:
//       | 'impactLight'
//       | 'impactMedium'
//       | 'impactHeavy'
//       | 'notificationSuccess',
//   ) =>
//     ReactNativeHapticFeedback.trigger(type, {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // Track changes
//   useEffect(() => {
//     if (!note) return;
//     const changed =
//       title !== (note.title || '') ||
//       url !== (note.url || '') ||
//       content !== (note.content || '') ||
//       tagsInput !== (note.tags?.join(', ') || '');
//     setHasChanges(changed);
//   }, [title, url, content, tagsInput, note]);

//   const handleSave = async () => {
//     if (!note) return;

//     setSaving(true);
//     h('impactMedium');

//     try {
//       const tags = tagsInput
//         .split(',')
//         .map(t => t.trim())
//         .filter(t => t.length > 0);

//       const res = await fetch(`${API_BASE_URL}/saved-notes/${note.id}`, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           url: url.trim() || null,
//           title: title.trim() || null,
//           content: content.trim() || null,
//           tags: tags.length > 0 ? tags : null,
//         }),
//       });

//       if (!res.ok) {
//         throw new Error('Failed to save note');
//       }

//       h('notificationSuccess');
//       setHasChanges(false);
//       navigate('Notes');
//     } catch (err) {
//       Alert.alert('Error', 'Failed to save note. Please try again.');
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = () => {
//     if (!note) return;
//     h('impactMedium');
//     Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           try {
//             await fetch(`${API_BASE_URL}/saved-notes/${note.id}`, {
//               method: 'DELETE',
//             });
//             h('notificationSuccess');
//             navigate('Notes');
//           } catch (err) {
//             Alert.alert('Error', 'Failed to delete note');
//           }
//         },
//       },
//     ]);
//   };

//   const openUrl = () => {
//     if (url) {
//       Linking.openURL(url).catch(() => {
//         Alert.alert('Error', 'Could not open URL');
//       });
//     }
//   };

//   const handleBack = () => {
//     if (hasChanges) {
//       Alert.alert('Unsaved Changes', 'Do you want to save your changes?', [
//         {text: 'Discard', style: 'destructive', onPress: () => navigate('Notes')},
//         {text: 'Cancel', style: 'cancel'},
//         {text: 'Save', onPress: handleSave},
//       ]);
//     } else {
//       navigate('Notes');
//     }
//   };

//   const formatDate = (dateStr: string) => {
//     const date = new Date(dateStr);
//     return date.toLocaleDateString('en-US', {
//       weekday: 'long',
//       month: 'long',
//       day: 'numeric',
//       year: 'numeric',
//       hour: 'numeric',
//       minute: '2-digit',
//     });
//   };

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       paddingTop: 60,
//     },
//     container: {
//       flex: 1,
//       paddingHorizontal: 16,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingVertical: 12,
//     },
//     headerLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 8,
//     },
//     headerRight: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 16,
//     },
//     backText: {
//       fontSize: 17,
//       color: theme.colors.primary,
//     },
//     saveBtn: {
//       opacity: hasChanges ? 1 : 0.4,
//     },
//     saveBtnText: {
//       fontSize: 17,
//       color: theme.colors.primary,
//       fontWeight: '600',
//     },
//     dateText: {
//       fontSize: 13,
//       color: colors.muted,
//       textAlign: 'center',
//       marginBottom: 20,
//     },
//     formContainer: {
//       flex: 1,
//     },
//     titleInput: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: colors.foreground,
//       paddingVertical: 8,
//       marginBottom: 8,
//     },
//     urlContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.input2,
//       borderRadius: 8,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       marginBottom: 16,
//       gap: 8,
//     },
//     urlInput: {
//       flex: 1,
//       fontSize: 15,
//       color: colors.foreground,
//     },
//     urlOpenBtn: {
//       padding: 4,
//     },
//     contentInput: {
//       fontSize: 16,
//       color: colors.foreground,
//       lineHeight: 24,
//       minHeight: 200,
//       textAlignVertical: 'top',
//     },
//     tagsContainer: {
//       marginTop: 20,
//       paddingTop: 16,
//       borderTopWidth: StyleSheet.hairlineWidth,
//       borderTopColor: theme.colors.inputBorder,
//     },
//     tagsLabel: {
//       fontSize: 13,
//       color: colors.muted,
//       marginBottom: 8,
//     },
//     tagsInput: {
//       fontSize: 15,
//       color: colors.foreground,
//       paddingVertical: 8,
//     },
//   });

//   if (!userId || !note) return null;

//   return (
//     <SafeAreaView style={styles.screen} edges={['top']}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={{flex: 1}}>
//         <View style={styles.container}>
//           <View style={styles.header}>
//             <TouchableOpacity
//               style={styles.headerLeft}
//               onPress={handleBack}>
//               <MaterialIcons
//                 name="arrow-back-ios"
//                 size={20}
//                 color={theme.colors.primary}
//               />
//               <Text style={styles.backText}>Notes</Text>
//             </TouchableOpacity>
//             <View style={styles.headerRight}>
//               <TouchableOpacity onPress={handleDelete}>
//                 <MaterialIcons
//                   name="delete-outline"
//                   size={24}
//                   color={colors.muted}
//                 />
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={styles.saveBtn}
//                 onPress={handleSave}
//                 disabled={!hasChanges || saving}>
//                 <Text style={styles.saveBtnText}>
//                   {saving ? 'Saving...' : 'Done'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           <Text style={styles.dateText}>
//             {formatDate(note.updated_at || note.created_at)}
//           </Text>

//           <ScrollView
//             style={styles.formContainer}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="handled">
//             <TextInput
//               placeholder="Title"
//               placeholderTextColor={colors.muted}
//               style={styles.titleInput}
//               value={title}
//               onChangeText={setTitle}
//             />

//             {(url || !content) && (
//               <View style={styles.urlContainer}>
//                 <MaterialIcons name="link" size={20} color={colors.muted} />
//                 <TextInput
//                   placeholder="URL"
//                   placeholderTextColor={colors.muted}
//                   style={styles.urlInput}
//                   value={url}
//                   onChangeText={setUrl}
//                   autoCapitalize="none"
//                   autoCorrect={false}
//                   keyboardType="url"
//                 />
//                 {url ? (
//                   <TouchableOpacity style={styles.urlOpenBtn} onPress={openUrl}>
//                     <MaterialIcons
//                       name="open-in-new"
//                       size={20}
//                       color={theme.colors.primary}
//                     />
//                   </TouchableOpacity>
//                 ) : null}
//               </View>
//             )}

//             <TextInput
//               placeholder="Start typing..."
//               placeholderTextColor={colors.muted}
//               style={styles.contentInput}
//               value={content}
//               onChangeText={setContent}
//               multiline
//             />

//             <View style={styles.tagsContainer}>
//               <Text style={styles.tagsLabel}>TAGS</Text>
//               <TextInput
//                 placeholder="Add tags separated by commas"
//                 placeholderTextColor={colors.muted}
//                 style={styles.tagsInput}
//                 value={tagsInput}
//                 onChangeText={setTagsInput}
//               />
//             </View>
//           </ScrollView>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }
