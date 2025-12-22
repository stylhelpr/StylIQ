import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  SectionList,
  Linking,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../styles/tokens/tokens';
import {fontScale, moderateScale} from '../utils/scale';
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
};

export default function NotesScreen({navigate}: Props) {
  const userId = useUUID();
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/saved-notes/${userId}`);
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    h('impactMedium');
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE_URL}/saved-notes/${id}`, {
              method: 'DELETE',
            });
            setNotes(prev => prev.filter(n => n.id !== id));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  };

  const openUrl = (url: string) => {
    if (url) {
      navigate('WebBrowser', {url});
    }
  };

  const filteredNotes = notes.filter(note => {
    const query = searchQuery.toLowerCase();
    return (
      note.title?.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query) ||
      note.url?.toLowerCase().includes(query)
    );
  });

  // Group notes by date sections like Apple Notes
  const getDateSection = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const noteDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (noteDate >= today) return 'Today';
    if (noteDate >= yesterday) return 'Yesterday';
    if (noteDate >= weekAgo) return 'Previous 7 Days';
    if (noteDate >= monthAgo) return 'Previous 30 Days';
    return date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
  };

  type SectionData = {
    title: string;
    data: SavedNote[];
  };

  const groupedNotes: SectionData[] = React.useMemo(() => {
    const groups: Record<string, SavedNote[]> = {};
    const order = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days'];

    filteredNotes.forEach(note => {
      const section = getDateSection(note.updated_at || note.created_at);
      if (!groups[section]) groups[section] = [];
      groups[section].push(note);
    });

    // Sort sections: predefined order first, then by date
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return b.localeCompare(a); // Newer months first
    });

    return sortedKeys.map(title => ({title, data: groups[title]}));
  }, [filteredNotes]);

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
      paddingVertical: 16,
      gap: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
      flex: 1,
    },
    searchContainer: {
      marginBottom: 16,
    },
    searchInput: {
      backgroundColor: theme.colors.input2,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
    },
    noteCardWrapper: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 8,
    },
    noteCardFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    noteCardLastWrapper: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    noteCard: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.inputBorder,
    },
    noteCardLast: {
      borderBottomWidth: 0,
    },
    noteTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    notePreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    noteDate: {
      fontSize: 13,
      color: colors.foreground2,
    },
    notePreview: {
      fontSize: 15,
      color: colors.foreground2,
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyText: {
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 12,
    },
    addButton: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      borderColor: theme.colors.muted,
      borderWidth: tokens.borderWidth.hairline,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    tag: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tagText: {
      fontSize: 12,
      color: theme.colors.primary,
    },
    sectionHeader: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      paddingVertical: 12,
      paddingTop: 20,
      backgroundColor: 'transparent',
    },
  });

  if (!userId) return null;

  // Format time like Apple Notes - show time for today/yesterday, day name for this week, date for older
  const formatNoteTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const noteDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (noteDate >= today) {
      // Today - show time like "3:13 PM"
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    if (noteDate >= yesterday) {
      // Yesterday
      return 'Yesterday';
    }
    if (noteDate >= weekAgo) {
      // This week - show day name like "Friday"
      return date.toLocaleDateString('en-US', {weekday: 'long'});
    }
    // Older - show date like "Dec 15"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const openNote = (note: SavedNote) => {
    h('impactLight');
    navigate('NoteDetail', {note});
  };

  // Get preview text - first line of content or URL
  const getPreview = (note: SavedNote) => {
    if (note.content) {
      return note.content.split('\n')[0].substring(0, 80);
    }
    if (note.url) {
      return note.url;
    }
    return '';
  };

  const renderNote = ({
    item,
    index,
    section,
  }: {
    item: SavedNote;
    index: number;
    section: SectionData;
  }) => {
    const isFirst = index === 0;
    const isLast = index === section.data.length - 1;

    return (
      <View
        style={[
          styles.noteCardWrapper,
          isFirst && styles.noteCardFirst,
          isLast && styles.noteCardLastWrapper,
        ]}>
        <TouchableOpacity
          style={[styles.noteCard, isLast && styles.noteCardLast]}
          onPress={() => openNote(item)}
          activeOpacity={0.7}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <View style={styles.notePreviewRow}>
            <Text style={styles.noteDate}>
              {formatNoteTime(item.updated_at || item.created_at)}
            </Text>
            <Text style={styles.notePreview} numberOfLines={1}>
              {getPreview(item)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={() => navigate('Home')}>
            <MaterialIcons
              name="arrow-back-ios"
              size={24}
              color={colors.foreground}
            />
          </AppleTouchFeedback>
          <Text style={styles.title}>MY NOTES</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search notes..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="note-add" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No notes match your search'
                : 'No notes yet.\nSave URLs and text from the browser!'}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={groupedNotes}
            keyExtractor={item => item.id}
            renderItem={({item, index, section}) =>
              renderNote({item, index, section})
            }
            renderSectionHeader={({section: {title}}) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            renderSectionFooter={() => <View style={{height: 8}} />}
            SectionSeparatorComponent={() => null}
            ItemSeparatorComponent={() => null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 100}}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.foreground}
              />
            }
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          h('impactMedium');
          navigate('SaveNote');
        }}>
        <MaterialIcons name="add" size={28} color={theme.colors.buttonText1} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

//////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   FlatList,
//   Linking,
//   RefreshControl,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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
// };

// export default function NotesScreen({navigate}: Props) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const colors = theme.colors;

//   const [notes, setNotes] = useState<SavedNote[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');

//   const h = (type: 'impactLight' | 'impactMedium' | 'impactHeavy' | 'notificationSuccess') =>
//     ReactNativeHapticFeedback.trigger(type, {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const fetchNotes = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-notes/${userId}`);
//       const data = await res.json();
//       setNotes(Array.isArray(data) ? data : []);
//     } catch (err) {
//       console.error('Failed to fetch notes:', err);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [userId]);

//   useEffect(() => {
//     fetchNotes();
//   }, [fetchNotes]);

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchNotes();
//   };

//   const deleteNote = async (id: string) => {
//     h('impactMedium');
//     Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           try {
//             await fetch(`${API_BASE_URL}/saved-notes/${id}`, {
//               method: 'DELETE',
//             });
//             setNotes(prev => prev.filter(n => n.id !== id));
//           } catch (err) {
//             Alert.alert('Error', 'Failed to delete note');
//           }
//         },
//       },
//     ]);
//   };

//   const openUrl = (url: string) => {
//     if (url) {
//       Linking.openURL(url).catch(() => {
//         Alert.alert('Error', 'Could not open URL');
//       });
//     }
//   };

//   const filteredNotes = notes.filter(note => {
//     const query = searchQuery.toLowerCase();
//     return (
//       note.title?.toLowerCase().includes(query) ||
//       note.content?.toLowerCase().includes(query) ||
//       note.url?.toLowerCase().includes(query)
//     );
//   });

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//     },
//     container: {
//       flex: 1,
//       paddingHorizontal: 16,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 16,
//       gap: 12,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: colors.foreground,
//       flex: 1,
//     },
//     searchContainer: {
//       marginBottom: 16,
//     },
//     searchInput: {
//       backgroundColor: theme.colors.input2,
//       borderRadius: 12,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       fontSize: 16,
//       color: colors.foreground,
//       borderWidth: 1,
//       borderColor: theme.colors.inputBorder,
//     },
//     noteCard: {
//       backgroundColor: theme.colors.cardBackground,
//       borderRadius: 16,
//       padding: 16,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.inputBorder,
//     },
//     noteHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       marginBottom: 8,
//     },
//     noteTitle: {
//       fontSize: 17,
//       fontWeight: '600',
//       color: colors.foreground,
//       flex: 1,
//       marginRight: 8,
//     },
//     noteContent: {
//       fontSize: 15,
//       color: colors.muted,
//       marginBottom: 8,
//       lineHeight: 22,
//     },
//     noteUrl: {
//       fontSize: 14,
//       color: theme.colors.primary,
//       marginBottom: 8,
//     },
//     noteDate: {
//       fontSize: 12,
//       color: colors.muted,
//     },
//     deleteBtn: {
//       padding: 4,
//     },
//     emptyContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingTop: 100,
//     },
//     emptyText: {
//       fontSize: 16,
//       color: colors.muted,
//       textAlign: 'center',
//       marginTop: 12,
//     },
//     addButton: {
//       position: 'absolute',
//       bottom: 30,
//       right: 20,
//       width: 56,
//       height: 56,
//       borderRadius: 28,
//       backgroundColor: theme.colors.primary,
//       justifyContent: 'center',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 4},
//       shadowOpacity: 0.3,
//       shadowRadius: 8,
//       elevation: 8,
//     },
//     tagsRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 6,
//       marginTop: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.primary + '20',
//       paddingHorizontal: 10,
//       paddingVertical: 4,
//       borderRadius: 12,
//     },
//     tagText: {
//       fontSize: 12,
//       color: theme.colors.primary,
//     },
//   });

//   if (!userId) return null;

//   const formatDate = (dateStr: string) => {
//     const date = new Date(dateStr);
//     return date.toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//     });
//   };

//   const renderNote = ({item}: {item: SavedNote}) => (
//     <View style={styles.noteCard}>
//       <View style={styles.noteHeader}>
//         <Text style={styles.noteTitle} numberOfLines={2}>
//           {item.title || 'Untitled Note'}
//         </Text>
//         <TouchableOpacity
//           style={styles.deleteBtn}
//           onPress={() => deleteNote(item.id)}>
//           <MaterialIcons name="delete-outline" size={22} color={colors.muted} />
//         </TouchableOpacity>
//       </View>

//       {item.content && (
//         <Text style={styles.noteContent} numberOfLines={3}>
//           {item.content}
//         </Text>
//       )}

//       {item.url && (
//         <TouchableOpacity onPress={() => openUrl(item.url!)}>
//           <Text style={styles.noteUrl} numberOfLines={1}>
//             {item.url}
//           </Text>
//         </TouchableOpacity>
//       )}

//       {item.tags && item.tags.length > 0 && (
//         <View style={styles.tagsRow}>
//           {item.tags.map((tag, idx) => (
//             <View key={idx} style={styles.tag}>
//               <Text style={styles.tagText}>{tag}</Text>
//             </View>
//           ))}
//         </View>
//       )}

//       <Text style={styles.noteDate}>{formatDate(item.created_at)}</Text>
//     </View>
//   );

//   return (
//     <GradientBackground>
//       <SafeAreaView style={styles.screen} edges={['top']}>
//         <View style={styles.container}>
//           <View style={styles.header}>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => navigate('Home')}>
//               <MaterialIcons
//                 name="arrow-back-ios"
//                 size={24}
//                 color={colors.foreground}
//               />
//             </AppleTouchFeedback>
//             <Text style={styles.title}>My Notes</Text>
//           </View>

//           <View style={styles.searchContainer}>
//             <TextInput
//               placeholder="Search notes..."
//               placeholderTextColor={colors.muted}
//               style={styles.searchInput}
//               value={searchQuery}
//               onChangeText={setSearchQuery}
//             />
//           </View>

//           {loading ? (
//             <View style={styles.emptyContainer}>
//               <Text style={styles.emptyText}>Loading...</Text>
//             </View>
//           ) : filteredNotes.length === 0 ? (
//             <View style={styles.emptyContainer}>
//               <MaterialIcons name="note-add" size={64} color={colors.muted} />
//               <Text style={styles.emptyText}>
//                 {searchQuery
//                   ? 'No notes match your search'
//                   : 'No notes yet.\nSave URLs and text from the browser!'}
//               </Text>
//             </View>
//           ) : (
//             <FlatList
//               data={filteredNotes}
//               keyExtractor={item => item.id}
//               renderItem={renderNote}
//               showsVerticalScrollIndicator={false}
//               contentContainerStyle={{paddingBottom: 100}}
//               refreshControl={
//                 <RefreshControl
//                   refreshing={refreshing}
//                   onRefresh={onRefresh}
//                   tintColor={colors.foreground}
//                 />
//               }
//             />
//           )}
//         </View>

//         <TouchableOpacity
//           style={styles.addButton}
//           onPress={() => {
//             h('impactMedium');
//             navigate('SaveNote');
//           }}>
//           <MaterialIcons name="add" size={28} color="#fff" />
//         </TouchableOpacity>
//       </SafeAreaView>
//     </GradientBackground>
//   );
// }
