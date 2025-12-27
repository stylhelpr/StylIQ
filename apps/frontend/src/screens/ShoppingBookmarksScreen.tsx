import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {useShoppingStore} from '../../../../store/shoppingStore';
import {shoppingAnalytics} from '../../../../store/shoppingAnalytics';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import PriceAlertModal from '../components/PriceAlertModal/PriceAlertModal';
import {usePriceAlerts} from '../hooks/usePriceAlerts';

type Props = {
  navigate?: (screen: any, params?: any) => void;
};

export default function ShoppingBookmarksScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {bookmarks, removeBookmark, history} = useShoppingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'brand' | 'name'>('recent');
  const {createAlert} = usePriceAlerts();
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<any>(null);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);

  // Track page view on mount
  useEffect(() => {
    console.log('[Analytics] Shopping Bookmarks screen mounted');
    shoppingAnalytics.recordPageVisitQueue(
      'https://styliq.com/shopping/bookmarks',
      'Shopping Bookmarks',
      0,
      0,
    );
  }, []);

  const filteredBookmarks = bookmarks
    .filter(
      item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return b.addedAt - a.addedAt;
      } else if (sortBy === 'brand') {
        return (a.brand || '').localeCompare(b.brand || '');
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Remove Bookmark', `Remove "${title}" from bookmarks?`, [
      {text: 'Cancel', onPress: () => {}, style: 'cancel'},
      {
        text: 'Remove',
        onPress: () => removeBookmark(id),
        style: 'destructive',
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginTop: -14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingHorizontal: 12,
      height: 36,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.foreground,
      fontSize: 14,
      padding: 0,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.primary,
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    filterButtonTextActive: {
      color: theme.colors.foreground,
    },
    listContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    bookmarkCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bookmarkContent: {
      flex: 1,
      marginRight: 12,
    },
    bookmarkTitle: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    bookmarkBrand: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    bookmarkUrl: {
      fontSize: 11,
      color: theme.colors.foreground,
    },
    bookmarkActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.foreground,
      textAlign: 'center',
      marginBottom: 20,
    },
  });

  return (
    <SafeAreaView style={[styles.container, {marginTop: 70}]}>
      {/* Header */}
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <AppleTouchFeedback
            style={[styles.backButton, {padding: 8}]}
            onPress={() => navigate?.('ShoppingDashboard')}>
            <MaterialIcons
              name="arrow-back-ios"
              size={22}
              color={theme.colors.foreground}
            />
          </AppleTouchFeedback>
          <Text style={styles.headerTitle}>Bookmarks</Text>
          <View style={{width: 38}} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <MaterialIcons
            name="search"
            size={18}
            color={theme.colors.foreground}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search bookmarks..."
            placeholderTextColor={theme.colors.foreground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {searchQuery !== '' && (
            <View style={{position: 'absolute', right: 6}}>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={() => setSearchQuery('')}>
                <View
                  style={{
                    padding: 8,
                    borderRadius: 8,
                  }}>
                  <MaterialIcons
                    name="clear"
                    size={16}
                    color={theme.colors.foreground3}
                  />
                </View>
              </AppleTouchFeedback>
            </View>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {(['recent', 'brand', 'name'] as const).map(filter => (
            <AppleTouchFeedback
              hapticStyle="impactLight"
              key={filter}
              style={[
                styles.filterButton,
                sortBy === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSortBy(filter)}>
              <Text
                style={[
                  styles.filterButtonText,
                  sortBy === filter && styles.filterButtonTextActive,
                ]}>
                {filter === 'recent'
                  ? 'Recent'
                  : filter === 'brand'
                    ? 'Brand'
                    : 'A-Z'}
              </Text>
            </AppleTouchFeedback>
          ))}
        </View>
      </Animatable.View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="bookmark-outline"
            size={48}
            color={theme.colors.foreground3}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>No bookmarks yet</Text>
          <Text style={styles.emptySubtext}>
            Save items from your favorite stores while browsing
          </Text>
          <AppleTouchFeedback
            onPress={() => navigate?.('WebBrowser')}
            hapticStyle="impactLight"
            style={[globalStyles.buttonPrimary, {minWidth: 160}]}>
            <Text
              style={{
                color: theme.colors.buttonText1,
                fontWeight: tokens.fontWeight.semiBold,
              }}>
              Start Shopping
            </Text>
          </AppleTouchFeedback>
        </View>
      ) : (
        <FlatList
          data={filteredBookmarks}
          renderItem={({item, index}) => (
            <Animatable.View animation="slideInLeft" delay={index * 50}>
              <View style={styles.bookmarkCard}>
                <View style={styles.bookmarkContent}>
                  <Text style={styles.bookmarkTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.brand && (
                    <Text style={styles.bookmarkBrand}>{item.brand}</Text>
                  )}
                  <Text style={styles.bookmarkUrl} numberOfLines={1}>
                    {item.source}
                  </Text>
                </View>
                <View style={styles.bookmarkActions}>
                  <AppleTouchFeedback
                    style={styles.actionButton}
                    onPress={() => navigate?.('WebBrowser', {url: item.url})}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="open-in-new"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </AppleTouchFeedback>
                  <AppleTouchFeedback
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedBookmark(item);
                      setAlertModalVisible(true);
                    }}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="notifications"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </AppleTouchFeedback>
                  <AppleTouchFeedback
                    style={styles.actionButton}
                    onPress={() => handleDelete(item.id, item.title)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="delete"
                      size={20}
                      color={theme.colors.foreground3}
                    />
                  </AppleTouchFeedback>
                </View>
              </View>
            </Animatable.View>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
        />
      )}
      <PriceAlertModal
        visible={alertModalVisible}
        currentPrice={selectedBookmark?.price || 0}
        itemTitle={selectedBookmark?.title || ''}
        onDismiss={() => setAlertModalVisible(false)}
        onConfirm={async targetPrice => {
          if (selectedBookmark) {
            setIsCreatingAlert(true);
            try {
              await createAlert('dummy-token', {
                url: selectedBookmark.url,
                title: selectedBookmark.title,
                currentPrice: selectedBookmark.price || 0,
                targetPrice,
                brand: selectedBookmark.brand,
                source: selectedBookmark.source,
              });
            } catch (err) {
              console.error('Failed to create alert:', err);
            } finally {
              setIsCreatingAlert(false);
            }
          }
        }}
        isLoading={isCreatingAlert}
      />
    </SafeAreaView>
  );
}

//////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   Alert,
//   TextInput,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingBookmarksScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {bookmarks, removeBookmark, history} = useShoppingStore();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [sortBy, setSortBy] = useState<'recent' | 'brand' | 'name'>('recent');

//   const filteredBookmarks = bookmarks
//     .filter(
//       item =>
//         item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         item.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
//     )
//     .sort((a, b) => {
//       if (sortBy === 'recent') {
//         return b.addedAt - a.addedAt;
//       } else if (sortBy === 'brand') {
//         return (a.brand || '').localeCompare(b.brand || '');
//       } else {
//         return a.title.localeCompare(b.title);
//       }
//     });

//   const handleDelete = (id: string, title: string) => {
//     Alert.alert('Remove Bookmark', `Remove "${title}" from bookmarks?`, [
//       {text: 'Cancel', onPress: () => {}, style: 'cancel'},
//       {
//         text: 'Remove',
//         onPress: () => removeBookmark(id),
//         style: 'destructive',
//       },
//     ]);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,

//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     headerTitle: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 16,
//     },
//     searchBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       height: 36,
//       marginBottom: 12,
//     },
//     searchInput: {
//       flex: 1,
//       color: theme.colors.foreground,
//       fontSize: 14,
//       padding: 0,
//     },
//     filterRow: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     filterButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.background,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     filterButtonActive: {
//       backgroundColor: theme.colors.background,
//       borderColor: theme.colors.primary,
//     },
//     filterButtonText: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     filterButtonTextActive: {
//       color: theme.colors.foreground,
//     },
//     listContainer: {
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//     },
//     bookmarkCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     bookmarkContent: {
//       flex: 1,
//       marginRight: 12,
//     },
//     bookmarkTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkBrand: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkUrl: {
//       fontSize: 11,
//       color: theme.colors.foreground,
//     },
//     bookmarkActions: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     actionButton: {
//       padding: 8,
//     },
//     emptyContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingHorizontal: 32,
//     },
//     emptyIcon: {
//       marginBottom: 16,
//     },
//     emptyText: {
//       fontSize: 16,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       marginBottom: 8,
//     },
//     emptySubtext: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       marginBottom: 20,
//     },
//   });

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 70}]}>
//       {/* Header */}
//       <Animatable.View animation="fadeInDown" style={styles.header}>
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: 12,
//           }}>
//           <AppleTouchFeedback
//             style={[styles.backButton, {padding: 8}]}
//             onPress={() => navigate?.('ShoppingDashboard')}>
//             <MaterialIcons
//               name="arrow-back-ios"
//               size={22}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>
//           <Text style={styles.headerTitle}>Bookmarks</Text>
//           <View style={{width: 38}} />
//         </View>

//         {/* Search */}
//         <View style={styles.searchBar}>
//           <MaterialIcons
//             name="search"
//             size={18}
//             color={theme.colors.foreground}
//           />

//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search bookmarks..."
//             placeholderTextColor={theme.colors.foreground}
//             value={searchQuery}
//             onChangeText={setSearchQuery}
//           />

//           {searchQuery !== '' && (
//             <View style={{position: 'absolute', right: 6}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => setSearchQuery('')}>
//                 <View
//                   style={{
//                     padding: 8,
//                     borderRadius: 8,
//                   }}>
//                   <MaterialIcons
//                     name="clear"
//                     size={16}
//                     color={theme.colors.foreground3}
//                   />
//                 </View>
//               </AppleTouchFeedback>
//             </View>
//           )}
//         </View>

//         {/* Filters */}
//         <View style={styles.filterRow}>
//           {(['recent', 'brand', 'name'] as const).map(filter => (
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               key={filter}
//               style={[
//                 styles.filterButton,
//                 sortBy === filter && styles.filterButtonActive,
//               ]}
//               onPress={() => setSortBy(filter)}>
//               <Text
//                 style={[
//                   styles.filterButtonText,
//                   sortBy === filter && styles.filterButtonTextActive,
//                 ]}>
//                 {filter === 'recent'
//                   ? 'Recent'
//                   : filter === 'brand'
//                   ? 'Brand'
//                   : 'A-Z'}
//               </Text>
//             </AppleTouchFeedback>
//           ))}
//         </View>
//       </Animatable.View>

//       {bookmarks.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <MaterialIcons
//             name="bookmark-outline"
//             size={48}
//             color={theme.colors.foreground3}
//             style={styles.emptyIcon}
//           />
//           <Text style={styles.emptyText}>No bookmarks yet</Text>
//           <Text style={styles.emptySubtext}>
//             Save items from your favorite stores while browsing
//           </Text>
//           <AppleTouchFeedback
//             onPress={() => navigate?.('WebBrowser')}
//             hapticStyle="impactLight"
//             style={[globalStyles.buttonPrimary, {minWidth: 160}]}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontWeight: tokens.fontWeight.semiBold,
//               }}>
//               Start Shopping
//             </Text>
//           </AppleTouchFeedback>
//         </View>
//       ) : (
//         <FlatList
//           data={filteredBookmarks}
//           renderItem={({item, index}) => (
//             <Animatable.View animation="slideInLeft" delay={index * 50}>
//               <View style={styles.bookmarkCard}>
//                 <View style={styles.bookmarkContent}>
//                   <Text style={styles.bookmarkTitle} numberOfLines={2}>
//                     {item.title}
//                   </Text>
//                   {item.brand && (
//                     <Text style={styles.bookmarkBrand}>{item.brand}</Text>
//                   )}
//                   <Text style={styles.bookmarkUrl} numberOfLines={1}>
//                     {item.source}
//                   </Text>
//                 </View>
//                 <View style={styles.bookmarkActions}>
//                   <AppleTouchFeedback
//                     style={styles.actionButton}
//                     onPress={() => navigate?.('WebBrowser', {url: item.url})}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="open-in-new"
//                       size={20}
//                       color={theme.colors.primary}
//                     />
//                   </AppleTouchFeedback>
//                   <AppleTouchFeedback
//                     style={styles.actionButton}
//                     onPress={() => handleDelete(item.id, item.title)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="delete"
//                       size={20}
//                       color={theme.colors.foreground3}
//                     />
//                   </AppleTouchFeedback>
//                 </View>
//               </View>
//             </Animatable.View>
//           )}
//           keyExtractor={item => item.id}
//           contentContainerStyle={styles.listContainer}
//           scrollEnabled={true}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

//////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   Alert,
//   TextInput,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingBookmarksScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {bookmarks, removeBookmark, history} = useShoppingStore();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [sortBy, setSortBy] = useState<'recent' | 'brand' | 'name'>('recent');

//   const filteredBookmarks = bookmarks
//     .filter(
//       item =>
//         item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         item.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
//     )
//     .sort((a, b) => {
//       if (sortBy === 'recent') {
//         return b.addedAt - a.addedAt;
//       } else if (sortBy === 'brand') {
//         return (a.brand || '').localeCompare(b.brand || '');
//       } else {
//         return a.title.localeCompare(b.title);
//       }
//     });

//   const handleDelete = (id: string, title: string) => {
//     Alert.alert('Remove Bookmark', `Remove "${title}" from bookmarks?`, [
//       {text: 'Cancel', onPress: () => {}, style: 'cancel'},
//       {
//         text: 'Remove',
//         onPress: () => removeBookmark(id),
//         style: 'destructive',
//       },
//     ]);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     headerTitle: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 16,
//     },
//     searchBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       height: 36,
//       marginBottom: 12,
//     },
//     searchInput: {
//       flex: 1,
//       color: theme.colors.foreground,
//       fontSize: 14,
//       padding: 0,
//     },
//     filterRow: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     filterButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.background,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     filterButtonActive: {
//       backgroundColor: theme.colors.primary,
//       borderColor: theme.colors.primary,
//     },
//     filterButtonText: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground3,
//     },
//     filterButtonTextActive: {
//       color: '#fff',
//     },
//     listContainer: {
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//     },
//     bookmarkCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     bookmarkContent: {
//       flex: 1,
//       marginRight: 12,
//     },
//     bookmarkTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkBrand: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginBottom: 4,
//     },
//     bookmarkUrl: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//     },
//     bookmarkActions: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     actionButton: {
//       padding: 8,
//     },
//     emptyContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingHorizontal: 32,
//     },
//     emptyIcon: {
//       marginBottom: 16,
//     },
//     emptyText: {
//       fontSize: 16,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       marginBottom: 8,
//     },
//     emptySubtext: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       textAlign: 'center',
//       marginBottom: 20,
//     },
//   });

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 70}]}>
//       {/* Header */}
//       <Animatable.View animation="fadeInDown" style={styles.header}>
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: 12,
//           }}>
//           <TouchableOpacity
//             style={[styles.backButton, {padding: 8}]}
//             onPress={() => navigate?.('ShoppingDashboard')}>
//             <MaterialIcons
//               name="arrow-back-ios"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Bookmarks</Text>
//           <View style={{width: 38}} />
//         </View>

//         {/* Search */}
//         <View style={styles.searchBar}>
//           <MaterialIcons
//             name="search"
//             size={18}
//             color={theme.colors.foreground3}
//           />
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search bookmarks..."
//             placeholderTextColor={theme.colors.foreground3}
//             value={searchQuery}
//             onChangeText={setSearchQuery}
//           />
//           {searchQuery && (
//             <TouchableOpacity onPress={() => setSearchQuery('')}>
//               <MaterialIcons
//                 name="clear"
//                 size={16}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Filters */}
//         <View style={styles.filterRow}>
//           {(['recent', 'brand', 'name'] as const).map(filter => (
//             <TouchableOpacity
//               key={filter}
//               style={[
//                 styles.filterButton,
//                 sortBy === filter && styles.filterButtonActive,
//               ]}
//               onPress={() => setSortBy(filter)}>
//               <Text
//                 style={[
//                   styles.filterButtonText,
//                   sortBy === filter && styles.filterButtonTextActive,
//                 ]}>
//                 {filter === 'recent'
//                   ? 'Recent'
//                   : filter === 'brand'
//                   ? 'Brand'
//                   : 'A-Z'}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </Animatable.View>

//       {bookmarks.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <MaterialIcons
//             name="bookmark-outline"
//             size={48}
//             color={theme.colors.foreground3}
//             style={styles.emptyIcon}
//           />
//           <Text style={styles.emptyText}>No bookmarks yet</Text>
//           <Text style={styles.emptySubtext}>
//             Save items from your favorite stores while browsing
//           </Text>
//           <AppleTouchFeedback
//             onPress={() => navigate?.('WebBrowser')}
//             hapticStyle="impactLight"
//             style={[globalStyles.buttonPrimary, {minWidth: 160}]}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontWeight: tokens.fontWeight.semiBold,
//               }}>
//               Start Shopping
//             </Text>
//           </AppleTouchFeedback>
//         </View>
//       ) : (
//         <FlatList
//           data={filteredBookmarks}
//           renderItem={({item, index}) => (
//             <Animatable.View animation="slideInLeft" delay={index * 50}>
//               <View style={styles.bookmarkCard}>
//                 <View style={styles.bookmarkContent}>
//                   <Text style={styles.bookmarkTitle} numberOfLines={2}>
//                     {item.title}
//                   </Text>
//                   {item.brand && (
//                     <Text style={styles.bookmarkBrand}>{item.brand}</Text>
//                   )}
//                   <Text style={styles.bookmarkUrl} numberOfLines={1}>
//                     {item.source}
//                   </Text>
//                 </View>
//                 <View style={styles.bookmarkActions}>
//                   <AppleTouchFeedback
//                     style={styles.actionButton}
//                     onPress={() =>
//                       navigate?.('EnhancedWebBrowser', {url: item.url})
//                     }
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="open-in-new"
//                       size={20}
//                       color={theme.colors.primary}
//                     />
//                   </AppleTouchFeedback>
//                   <AppleTouchFeedback
//                     style={styles.actionButton}
//                     onPress={() => handleDelete(item.id, item.title)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="delete"
//                       size={20}
//                       color={theme.colors.foreground3}
//                     />
//                   </AppleTouchFeedback>
//                 </View>
//               </View>
//             </Animatable.View>
//           )}
//           keyExtractor={item => item.id}
//           contentContainerStyle={styles.listContainer}
//           scrollEnabled={true}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

//////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   Alert,
//   TextInput,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingBookmarksScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {bookmarks, removeBookmark, history} = useShoppingStore();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [sortBy, setSortBy] = useState<'recent' | 'brand' | 'name'>('recent');

//   const filteredBookmarks = bookmarks
//     .filter(
//       item =>
//         item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         item.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
//     )
//     .sort((a, b) => {
//       if (sortBy === 'recent') {
//         return b.addedAt - a.addedAt;
//       } else if (sortBy === 'brand') {
//         return (a.brand || '').localeCompare(b.brand || '');
//       } else {
//         return a.title.localeCompare(b.title);
//       }
//     });

//   const handleDelete = (id: string, title: string) => {
//     Alert.alert(
//       'Remove Bookmark',
//       `Remove "${title}" from bookmarks?`,
//       [
//         {text: 'Cancel', onPress: () => {}, style: 'cancel'},
//         {
//           text: 'Remove',
//           onPress: () => removeBookmark(id),
//           style: 'destructive',
//         },
//       ],
//     );
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     headerTitle: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 16,
//     },
//     searchBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       height: 36,
//       marginBottom: 12,
//     },
//     searchInput: {
//       flex: 1,
//       color: theme.colors.foreground,
//       fontSize: 14,
//       padding: 0,
//     },
//     filterRow: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     filterButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.background,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     filterButtonActive: {
//       backgroundColor: theme.colors.primary,
//       borderColor: theme.colors.primary,
//     },
//     filterButtonText: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground3,
//     },
//     filterButtonTextActive: {
//       color: '#fff',
//     },
//     listContainer: {
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//     },
//     bookmarkCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     bookmarkContent: {
//       flex: 1,
//       marginRight: 12,
//     },
//     bookmarkTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkBrand: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginBottom: 4,
//     },
//     bookmarkUrl: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//     },
//     bookmarkActions: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     actionButton: {
//       padding: 8,
//     },
//     emptyContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingHorizontal: 32,
//     },
//     emptyIcon: {
//       marginBottom: 16,
//     },
//     emptyText: {
//       fontSize: 16,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       marginBottom: 8,
//     },
//     emptySubtext: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       textAlign: 'center',
//       marginBottom: 20,
//     },
//   });

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 70}]}>
//       {/* Header */}
//       <Animatable.View animation="fadeInDown" style={styles.header}>
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: 12,
//           }}>
//           <TouchableOpacity
//             style={{padding: 8}}
//             onPress={() => navigate?.('ShoppingDashboard')}>
//             <MaterialIcons
//               name="arrow-back-ios"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Bookmarks</Text>
//           <View style={{width: 38}} />
//         </View>

//         {/* Search */}
//         <View style={styles.searchBar}>
//           <MaterialIcons
//             name="search"
//             size={18}
//             color={theme.colors.foreground3}
//           />
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search bookmarks..."
//             placeholderTextColor={theme.colors.foreground3}
//             value={searchQuery}
//             onChangeText={setSearchQuery}
//           />
//           {searchQuery && (
//             <TouchableOpacity onPress={() => setSearchQuery('')}>
//               <MaterialIcons
//                 name="clear"
//                 size={16}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Filters */}
//         <View style={styles.filterRow}>
//           {(['recent', 'brand', 'name'] as const).map(filter => (
//             <TouchableOpacity
//               key={filter}
//               style={[
//                 styles.filterButton,
//                 sortBy === filter && styles.filterButtonActive,
//               ]}
//               onPress={() => setSortBy(filter)}>
//               <Text
//                 style={[
//                   styles.filterButtonText,
//                   sortBy === filter && styles.filterButtonTextActive,
//                 ]}>
//                 {filter === 'recent' ? 'Recent' : filter === 'brand' ? 'Brand' : 'A-Z'}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </Animatable.View>

//       {bookmarks.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <MaterialIcons
//             name="bookmark-outline"
//             size={48}
//             color={theme.colors.foreground3}
//             style={styles.emptyIcon}
//           />
//           <Text style={styles.emptyText}>No bookmarks yet</Text>
//           <Text style={styles.emptySubtext}>
//             Save items from your favorite stores while browsing
//           </Text>
//           <AppleTouchFeedback
//             onPress={() => navigate?.('WebBrowser')}
//             hapticStyle="impactLight"
//             style={[globalStyles.buttonPrimary, {minWidth: 160}]}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontWeight: tokens.fontWeight.semiBold,
//               }}>
//               Start Shopping
//             </Text>
//           </AppleTouchFeedback>
//         </View>
//       ) : (
//         <FlatList
//           data={filteredBookmarks}
//           renderItem={({item, index}) => (
//             <Animatable.View
//               animation="slideInLeft"
//               delay={index * 50}>
//               <View style={styles.bookmarkCard}>
//                 <View style={styles.bookmarkContent}>
//                   <Text style={styles.bookmarkTitle} numberOfLines={2}>
//                     {item.title}
//                   </Text>
//                   {item.brand && (
//                     <Text style={styles.bookmarkBrand}>{item.brand}</Text>
//                   )}
//                   <Text style={styles.bookmarkUrl} numberOfLines={1}>
//                     {item.source}
//                   </Text>
//                 </View>
//                 <View style={styles.bookmarkActions}>
//                   <AppleTouchFeedback
//                     style={styles.actionButton}
//                     onPress={() =>
//                       navigate?.('EnhancedWebBrowser', {url: item.url})
//                     }
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="open-in-new"
//                       size={20}
//                       color={theme.colors.primary}
//                     />
//                   </AppleTouchFeedback>
//                   <AppleTouchFeedback
//                     style={styles.actionButton}
//                     onPress={() => handleDelete(item.id, item.title)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="delete"
//                       size={20}
//                       color={theme.colors.foreground3}
//                     />
//                   </AppleTouchFeedback>
//                 </View>
//               </View>
//             </Animatable.View>
//           )}
//           keyExtractor={item => item.id}
//           contentContainerStyle={styles.listContainer}
//           scrollEnabled={true}
//         />
//       )}
//     </SafeAreaView>
//   );
// }
