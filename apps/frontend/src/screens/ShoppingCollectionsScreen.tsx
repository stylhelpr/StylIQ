import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {useShoppingStore} from '../../../../store/shoppingStore';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

const COLORS = [
  '#6366f1',
  '#ec4899',
  '#f97316',
  '#06b6d4',
  '#10b981',
  '#8b5cf6',
];

type Props = {
  navigate?: (screen: any, params?: any) => void;
  route?: {params?: {id?: string}};
};

export default function ShoppingCollectionsScreen({navigate, route}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {collections, createCollection, deleteCollection} = useShoppingStore();
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(route?.params?.id || null);

  const selectedCollection = collections.find(
    c => c.id === selectedCollectionId,
  );

  const handleCreateCollection = () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }
    createCollection(newName, newDescription, selectedColor);
    setNewName('');
    setNewDescription('');
    setSelectedColor(COLORS[0]);
    setShowNewCollection(false);
  };

  const handleDeleteCollection = (id: string, name: string) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${name}"? This will remove the collection but keep the items.`,
      [
        {text: 'Cancel', onPress: () => {}, style: 'cancel'},
        {
          text: 'Delete',
          onPress: () => {
            deleteCollection(id);
            setSelectedCollectionId(null);
          },
          style: 'destructive',
        },
      ],
    );
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    collectionGrid: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    collectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    collectionBadge: {
      width: '100%',
      height: 120,
      borderRadius: 8,
      marginBottom: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    collectionName: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    collectionInfo: {
      fontSize: 12,
      color: theme.colors.foreground3,
      marginBottom: 8,
    },
    collectionActions: {
      flexDirection: 'row',
      gap: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    newCollectionButton: {
      backgroundColor: theme.colors.button1,
      borderColor: theme.colors.primary,
    },
    newCollectionButtonText: {
      color: '#fff',
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
      color: theme.colors.foreground3,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 16,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.foreground,
      marginBottom: 12,
      fontSize: 14,
    },
    colorPicker: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    collectionItemCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
    },
    itemBrand: {
      fontSize: 11,
      color: theme.colors.foreground3,
    },
  });

  if (selectedCollection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCollectionId(null)}>
            <MaterialIcons
              name="arrow-back-ios"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedCollection.name}
          </Text>
          <TouchableOpacity
            onPress={() =>
              handleDeleteCollection(
                selectedCollection.id,
                selectedCollection.name,
              )
            }>
            <MaterialIcons
              name="delete"
              size={24}
              color={theme.colors.foreground3}
            />
          </TouchableOpacity>
        </View>

        {selectedCollection.items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="shopping-bag"
              size={48}
              color={theme.colors.foreground3}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptySubtext}>
              Add items from your bookmarks to this collection
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedCollection.items}
            renderItem={({item}) => (
              <View style={styles.collectionItemCard}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.brand && (
                    <Text style={styles.itemBrand}>{item.brand}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() =>
                    navigate?.('EnhancedWebBrowser', {url: item.url})
                  }>
                  <MaterialIcons
                    name="open-in-new"
                    size={18}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.collectionGrid}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {marginTop: 70}]}>
      <View
        style={[
          styles.header,
          {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        ]}>
        <TouchableOpacity
          style={{padding: 8}}
          onPress={() => navigate?.('ShoppingDashboard')}>
          <MaterialIcons
            name="arrow-back-ios"
            size={22}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlists</Text>
        <View style={{width: 38}} />
      </View>

      {collections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="collections"
            size={48}
            color={theme.colors.foreground3}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>No collections yet</Text>
          <Text style={styles.emptySubtext}>
            Create collections to organize your saved items
          </Text>
          <AppleTouchFeedback
            onPress={() => setShowNewCollection(true)}
            hapticStyle="impactLight"
            style={[globalStyles.buttonPrimary, {minWidth: 180}]}>
            <MaterialIcons
              name="add"
              size={20}
              color="#fff"
              style={{marginRight: 8}}
            />
            <Text
              style={{
                color: theme.colors.buttonText1,
                fontWeight: tokens.fontWeight.semiBold,
              }}>
              New Collection
            </Text>
          </AppleTouchFeedback>
        </View>
      ) : (
        <>
          <FlatList
            data={collections}
            renderItem={({item, index}) => (
              <Animatable.View
                animation="slideInLeft"
                delay={index * 50}
                style={styles.collectionCard}>
                <View
                  style={[
                    styles.collectionBadge,
                    {backgroundColor: item.color},
                  ]}>
                  <MaterialIcons name="collections" size={40} color="#fff" />
                </View>
                <Text style={styles.collectionName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.collectionInfo}>{item.description}</Text>
                )}
                <Text style={styles.collectionInfo}>
                  {item.items.length} items
                </Text>
                <View style={styles.collectionActions}>
                  <AppleTouchFeedback
                    style={styles.actionButton}
                    onPress={() => setSelectedCollectionId(item.id)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="open-in-new"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.actionButtonText}>View</Text>
                  </AppleTouchFeedback>
                  <AppleTouchFeedback
                    style={[styles.actionButton, styles.newCollectionButton]}
                    onPress={() => handleDeleteCollection(item.id, item.name)}
                    hapticStyle="impactLight">
                    <MaterialIcons name="delete" size={16} color="#fff" />
                    <Text
                      style={[
                        styles.actionButtonText,
                        styles.newCollectionButtonText,
                      ]}>
                      Delete
                    </Text>
                  </AppleTouchFeedback>
                </View>
              </Animatable.View>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.collectionGrid}
            ListFooterComponent={
              <AppleTouchFeedback
                onPress={() => setShowNewCollection(true)}
                hapticStyle="impactLight"
                style={[
                  styles.actionButton,
                  styles.newCollectionButton,
                  {marginTop: 20},
                ]}>
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.newCollectionButtonText,
                  ]}>
                  New Collection
                </Text>
              </AppleTouchFeedback>
            }
          />
        </>
      )}

      {/* New Collection Modal */}
      <Modal
        visible={showNewCollection}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewCollection(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowNewCollection(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Collection</Text>

              <TextInput
                style={styles.input}
                placeholder="Collection name"
                placeholderTextColor={theme.colors.foreground3}
                value={newName}
                onChangeText={setNewName}
              />

              <TextInput
                style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
                placeholder="Description (optional)"
                placeholderTextColor={theme.colors.foreground3}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
              />

              <Text
                style={{...styles.modalTitle, fontSize: 14, marginBottom: 10}}>
                Color
              </Text>
              <View style={styles.colorPicker}>
                {COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: color,
                        borderColor:
                          selectedColor === color
                            ? theme.colors.primary
                            : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedColor(color)}>
                    {selectedColor === color && (
                      <MaterialIcons name="check" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{flexDirection: 'row', gap: 12}}>
                <AppleTouchFeedback
                  onPress={() => setShowNewCollection(false)}
                  hapticStyle="impactLight"
                  style={[globalStyles.buttonPrimary]}>
                  <Text
                    style={{
                      color: theme.colors.foreground,
                      fontWeight: tokens.fontWeight.semiBold,
                    }}>
                    Cancel
                  </Text>
                </AppleTouchFeedback>
                <AppleTouchFeedback
                  onPress={handleCreateCollection}
                  hapticStyle="impactLight"
                  style={[globalStyles.buttonPrimary]}>
                  <Text
                    style={{
                      color: 'white',
                      fontWeight: tokens.fontWeight.semiBold,
                    }}>
                    Create
                  </Text>
                </AppleTouchFeedback>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   FlatList,
//   TextInput,
//   Modal,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const COLORS = ['#6366f1', '#ec4899', '#f97316', '#06b6d4', '#10b981', '#8b5cf6'];

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
//   route?: {params?: {id?: string}};
// };

// export default function ShoppingCollectionsScreen({navigate, route}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {collections, createCollection, deleteCollection} = useShoppingStore();
//   const [showNewCollection, setShowNewCollection] = useState(false);
//   const [newName, setNewName] = useState('');
//   const [newDescription, setNewDescription] = useState('');
//   const [selectedColor, setSelectedColor] = useState(COLORS[0]);
//   const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
//     route?.params?.id || null,
//   );

//   const selectedCollection = collections.find(c => c.id === selectedCollectionId);

//   const handleCreateCollection = () => {
//     if (!newName.trim()) {
//       Alert.alert('Error', 'Please enter a collection name');
//       return;
//     }
//     createCollection(newName, newDescription, selectedColor);
//     setNewName('');
//     setNewDescription('');
//     setSelectedColor(COLORS[0]);
//     setShowNewCollection(false);
//   };

//   const handleDeleteCollection = (id: string, name: string) => {
//     Alert.alert(
//       'Delete Collection',
//       `Delete "${name}"? This will remove the collection but keep the items.`,
//       [
//         {text: 'Cancel', onPress: () => {}, style: 'cancel'},
//         {
//           text: 'Delete',
//           onPress: () => {
//             deleteCollection(id);
//             setSelectedCollectionId(null);
//           },
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
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     headerTitle: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     collectionGrid: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//     },
//     collectionCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     collectionBadge: {
//       width: '100%',
//       height: 120,
//       borderRadius: 8,
//       marginBottom: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     collectionName: {
//       fontSize: 16,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     collectionInfo: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginBottom: 8,
//     },
//     collectionActions: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     actionButton: {
//       flex: 1,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       borderRadius: 6,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       justifyContent: 'center',
//       alignItems: 'center',
//       flexDirection: 'row',
//       gap: 6,
//     },
//     actionButtonText: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     newCollectionButton: {
//       backgroundColor: theme.colors.primary,
//       borderColor: theme.colors.primary,
//     },
//     newCollectionButtonText: {
//       color: '#fff',
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
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       borderTopLeftRadius: 20,
//       borderTopRightRadius: 20,
//       padding: 20,
//     },
//     modalTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 16,
//     },
//     input: {
//       backgroundColor: theme.colors.background,
//       borderRadius: 8,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//       fontSize: 14,
//     },
//     colorPicker: {
//       flexDirection: 'row',
//       gap: 10,
//       marginBottom: 16,
//     },
//     colorOption: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       borderWidth: 2,
//       borderColor: 'transparent',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     collectionItemCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 10,
//       marginBottom: 8,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     itemTitle: {
//       flex: 1,
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//     },
//     itemBrand: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//     },
//   });

//   if (selectedCollection) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => setSelectedCollectionId(null)}>
//             <MaterialIcons
//               name="arrow-back-ios"
//               size={24}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle} numberOfLines={1}>
//             {selectedCollection.name}
//           </Text>
//           <TouchableOpacity
//             onPress={() =>
//               handleDeleteCollection(selectedCollection.id, selectedCollection.name)
//             }>
//             <MaterialIcons
//               name="delete"
//               size={24}
//               color={theme.colors.foreground3}
//             />
//           </TouchableOpacity>
//         </View>

//         {selectedCollection.items.length === 0 ? (
//           <View style={styles.emptyContainer}>
//             <MaterialIcons
//               name="shopping-bag"
//               size={48}
//               color={theme.colors.foreground3}
//               style={styles.emptyIcon}
//             />
//             <Text style={styles.emptyText}>No items yet</Text>
//             <Text style={styles.emptySubtext}>
//               Add items from your bookmarks to this collection
//             </Text>
//           </View>
//         ) : (
//           <FlatList
//             data={selectedCollection.items}
//             renderItem={({item}) => (
//               <View style={styles.collectionItemCard}>
//                 <View style={{flex: 1}}>
//                   <Text style={styles.itemTitle} numberOfLines={1}>
//                     {item.title}
//                   </Text>
//                   {item.brand && (
//                     <Text style={styles.itemBrand}>{item.brand}</Text>
//                   )}
//                 </View>
//                 <TouchableOpacity
//                   onPress={() => navigate?.('EnhancedWebBrowser', {url: item.url})}>
//                   <MaterialIcons
//                     name="open-in-new"
//                     size={18}
//                     color={theme.colors.primary}
//                   />
//                 </TouchableOpacity>
//               </View>
//             )}
//             keyExtractor={item => item.id}
//             contentContainerStyle={styles.collectionGrid}
//           />
//         )}
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 70}]}>
//       <View style={[styles.header, {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]}>
//         <TouchableOpacity
//           style={{padding: 8}}
//           onPress={() => navigate?.('ShoppingDashboard')}>
//           <MaterialIcons
//             name="arrow-back-ios"
//             size={22}
//             color={theme.colors.primary}
//           />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Collections</Text>
//         <View style={{width: 38}} />
//       </View>

//       {collections.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <MaterialIcons
//             name="collections"
//             size={48}
//             color={theme.colors.foreground3}
//             style={styles.emptyIcon}
//           />
//           <Text style={styles.emptyText}>No collections yet</Text>
//           <Text style={styles.emptySubtext}>
//             Create collections to organize your saved items
//           </Text>
//           <AppleTouchFeedback
//             onPress={() => setShowNewCollection(true)}
//             hapticStyle="impactLight"
//             style={[globalStyles.buttonPrimary, {minWidth: 180}]}>
//             <MaterialIcons name="add" size={20} color="#fff" style={{marginRight: 8}} />
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontWeight: tokens.fontWeight.semiBold,
//               }}>
//               New Collection
//             </Text>
//           </AppleTouchFeedback>
//         </View>
//       ) : (
//         <>
//           <FlatList
//             data={collections}
//             renderItem={({item, index}) => (
//               <Animatable.View
//                 animation="slideInLeft"
//                 delay={index * 50}
//                 style={styles.collectionCard}>
//                 <View
//                   style={[styles.collectionBadge, {backgroundColor: item.color}]}>
//                   <MaterialIcons name="collections" size={40} color="#fff" />
//                 </View>
//                 <Text style={styles.collectionName}>{item.name}</Text>
//                 {item.description && (
//                   <Text style={styles.collectionInfo}>{item.description}</Text>
//                 )}
//                 <Text style={styles.collectionInfo}>{item.items.length} items</Text>
//                 <View style={styles.collectionActions}>
//                   <AppleTouchFeedback
//                     style={styles.actionButton}
//                     onPress={() => setSelectedCollectionId(item.id)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="open-in-new"
//                       size={16}
//                       color={theme.colors.primary}
//                     />
//                     <Text style={styles.actionButtonText}>View</Text>
//                   </AppleTouchFeedback>
//                   <AppleTouchFeedback
//                     style={[styles.actionButton, styles.newCollectionButton]}
//                     onPress={() => handleDeleteCollection(item.id, item.name)}
//                     hapticStyle="impactLight">
//                     <MaterialIcons
//                       name="delete"
//                       size={16}
//                       color="#fff"
//                     />
//                     <Text
//                       style={[
//                         styles.actionButtonText,
//                         styles.newCollectionButtonText,
//                       ]}>
//                       Delete
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               </Animatable.View>
//             )}
//             keyExtractor={item => item.id}
//             contentContainerStyle={styles.collectionGrid}
//             ListFooterComponent={
//               <AppleTouchFeedback
//                 onPress={() => setShowNewCollection(true)}
//                 hapticStyle="impactLight"
//                 style={[styles.actionButton, styles.newCollectionButton, {marginTop: 20}]}>
//                 <MaterialIcons name="add" size={18} color="#fff" />
//                 <Text
//                   style={[
//                     styles.actionButtonText,
//                     styles.newCollectionButtonText,
//                   ]}>
//                   New Collection
//                 </Text>
//               </AppleTouchFeedback>
//             }
//           />
//         </>
//       )}

//       {/* New Collection Modal */}
//       <Modal
//         visible={showNewCollection}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowNewCollection(false)}>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: 'rgba(0,0,0,0.5)',
//             justifyContent: 'flex-end',
//           }}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>New Collection</Text>

//             <TextInput
//               style={styles.input}
//               placeholder="Collection name"
//               placeholderTextColor={theme.colors.foreground3}
//               value={newName}
//               onChangeText={setNewName}
//             />

//             <TextInput
//               style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
//               placeholder="Description (optional)"
//               placeholderTextColor={theme.colors.foreground3}
//               value={newDescription}
//               onChangeText={setNewDescription}
//               multiline
//             />

//             <Text style={{...styles.modalTitle, fontSize: 14, marginBottom: 10}}>
//               Color
//             </Text>
//             <View style={styles.colorPicker}>
//               {COLORS.map(color => (
//                 <TouchableOpacity
//                   key={color}
//                   style={[
//                     styles.colorOption,
//                     {
//                       backgroundColor: color,
//                       borderColor:
//                         selectedColor === color ? theme.colors.primary : 'transparent',
//                     },
//                   ]}
//                   onPress={() => setSelectedColor(color)}>
//                   {selectedColor === color && (
//                     <MaterialIcons name="check" size={20} color="#fff" />
//                   )}
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <View style={{flexDirection: 'row', gap: 12}}>
//               <AppleTouchFeedback
//                 onPress={() => setShowNewCollection(false)}
//                 hapticStyle="impactLight"
//                 style={[
//                   globalStyles.buttonSecondary,
//                   {flex: 1, justifyContent: 'center'},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: tokens.fontWeight.semiBold,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 onPress={handleCreateCollection}
//                 hapticStyle="impactLight"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {flex: 1, justifyContent: 'center'},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontWeight: tokens.fontWeight.semiBold,
//                   }}>
//                   Create
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }
