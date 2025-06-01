import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {getInferredCategory} from '../utils/categoryUtils';
import {MainCategory, Subcategory} from '../types/categoryTypes';
import EditItemModal from '../components/EditItemModal/EditItemModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEM_MARGIN = 19;
const MIN_ITEM_WIDTH = 160;

const categories: ('All' | MainCategory)[] = [
  'All',
  'Tops',
  'Bottoms',
  'Outerwear',
  'Shoes',
  'Accessories',
  'Undergarments',
  'Activewear',
  'Formalwear',
  'Loungewear',
  'Sleepwear',
  'Swimwear',
  'Maternity',
  'Unisex',
  'Costumes',
  'Traditional Wear',
];

const sortOptions = [
  {label: 'Name A-Z', value: 'az'},
  {label: 'Name Z-A', value: 'za'},
  {label: 'Favorites First', value: 'favorites'},
];

type WardrobeItem = {
  id: string;
  image: string;
  name: string;
  category?: string;
  color?: string;
  tags?: string[];
  favorite?: boolean;
};

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: WardrobeItem[];
};

export default function ClosetScreen({
  navigate,
  wardrobe: initialWardrobe,
}: Props) {
  const {theme} = useAppTheme();
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );
  const [selectedCategory, setSelectedCategory] = useState<
    'All' | MainCategory
  >('All');
  const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItemToEdit, setSelectedItemToEdit] =
    useState<WardrobeItem | null>(null);
  const [editedItem, setEditedItem] = useState<WardrobeItem | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(initialWardrobe);

  useEffect(() => {
    const onChange = ({window}: {window: {width: number}}) => {
      setScreenWidth(window.width);
    };
    Dimensions.addEventListener('change', onChange);
    return () => Dimensions.removeEventListener('change', onChange);
  }, []);

  const numColumns =
    Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
  const imageSize =
    (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
    numColumns;

  const filtered = wardrobe
    .map(item => ({
      ...item,
      inferredCategory: getInferredCategory(item.name),
    }))
    .filter(item => {
      if (selectedCategory === 'All') return true;
      return item.inferredCategory?.main === selectedCategory;
    })
    .sort((a, b) => {
      if (sortOption === 'az') return a.name.localeCompare(b.name);
      if (sortOption === 'za') return b.name.localeCompare(a.name);
      if (sortOption === 'favorites')
        return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
      return 0;
    });

  const handleDeleteItem = (itemId: string) => {
    setWardrobe(prev => prev.filter(item => item.id !== itemId));
  };
  const toggleFavorite = (id: string) => {
    const updated = wardrobe.map(item =>
      item.id === id ? {...item, favorite: !item.favorite} : item,
    );
    navigate('Closet', {updatedWardrobe: updated});
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 16,
      backgroundColor: theme.colors.background,
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
      fontSize: 16,
    },
    button: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },

    header: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.primary,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.primary,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.primary,
      paddingHorizontal: 16,
    },
    filterSortRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    iconButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: '#405de6',
      elevation: 2,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
    },
    card: {
      width: imageSize,
      marginBottom: ITEM_MARGIN * 0.5,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: imageSize,
      borderRadius: 16,
    },
    labelContainer: {
      padding: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      backgroundColor: '#405de6',
      padding: 16,
      borderRadius: 32,
      elevation: 6,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 12,
      margin: 40,
    },
    modalOption: {
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.foreground,
    },
    createOutfitButton: {
      backgroundColor: '#4ade80',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignSelf: 'center',
      marginVertical: 10,
    },

    createOutfitText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  type CategorizedWardrobeItem = WardrobeItem & {
    inferredCategory: {main: MainCategory; sub: Subcategory};
  };

  const categorizedItems = filtered.reduce((acc, item) => {
    const inferred = item.inferredCategory;
    if (!inferred || !inferred.main || !inferred.sub) return acc;

    const main = inferred.main;
    const sub = inferred.sub;

    if (!acc[main]) acc[main] = {};
    if (!acc[main][sub]) acc[main][sub] = [];

    acc[main][sub].push(item as CategorizedWardrobeItem);
    return acc;
  }, {} as Partial<Record<MainCategory, Partial<Record<Subcategory, CategorizedWardrobeItem[]>>>>);

  return (
    <View style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Closet</Text>
        <TouchableOpacity
          style={styles.createOutfitButton}
          onPress={() => navigate('OutfitBuilder')}>
          <Text style={styles.createOutfitText}>➕ Create New Outfit</Text>
        </TouchableOpacity>

        <View style={styles.filterSortRow}>
          <TouchableOpacity
            onPress={() => setShowFilter(true)}
            style={[styles.iconButton, {marginRight: 8}]}>
            <MaterialIcons
              name="filter-list"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSort(true)}
            style={styles.iconButton}>
            <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
          <View key={mainCategory} style={{marginBottom: 32}}>
            <Text style={styles.sectionTitle}>{mainCategory}</Text>

            {Object.entries(subMap).map(([subCategory, items]) => (
              <View key={subCategory} style={{marginBottom: 24}}>
                <Text
                  style={[
                    styles.label,
                    {paddingHorizontal: 16, marginBottom: 8},
                  ]}>
                  {subCategory}
                </Text>
                <View style={styles.grid}>
                  {items.map(item => (
                    <Pressable
                      key={item.id}
                      style={styles.card}
                      onLongPress={() => {
                        setSelectedItemToEdit(item);
                        setShowEditModal(true);
                      }}
                      onPress={() =>
                        navigate('ItemDetail', {itemId: item.id, item})
                      }>
                      <Image source={{uri: item.image}} style={styles.image} />

                      <TouchableOpacity
                        onPress={() => toggleFavorite(item.id)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 10,
                          padding: 4,
                        }}>
                        <MaterialIcons
                          name={item.favorite ? 'star' : 'star-border'}
                          size={22}
                          color={item.favorite ? theme.colors.primary : '#999'}
                        />
                      </TouchableOpacity>

                      <View style={styles.labelContainer}>
                        <Text style={styles.label}>{item.name}</Text>
                        <Text
                          style={[styles.label, {fontSize: 12, color: '#888'}]}>
                          {item.inferredCategory?.sub ?? ''}
                        </Text>
                      </View>

                      {/* ✅ ADD THIS BUTTON */}
                      <TouchableOpacity
                        onPress={() =>
                          navigate('TryOnPreview', {
                            outfit: {
                              top: item,
                            },
                          })
                        }
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          backgroundColor: '#4ade80',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}>
                        <Text style={{color: '#fff', fontSize: 12}}>
                          Try On
                        </Text>
                      </TouchableOpacity>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showFilter} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowFilter(false);
                    }}>
                    <Text style={styles.modalOption}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={showSort} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {sortOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setSortOption(opt.value as any);
                      setShowSort(false);
                    }}>
                    <Text style={styles.modalOption}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {selectedItemToEdit && (
        <Modal visible={showEditModal} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, {width: '85%'}]}>
                  <Text style={[styles.label, {marginBottom: 12}]}>
                    Edit Item
                  </Text>

                  <TextInput
                    placeholder="Name"
                    value={selectedItemToEdit.name}
                    onChangeText={text =>
                      setSelectedItemToEdit(prev =>
                        prev ? {...prev, name: text} : prev,
                      )
                    }
                    style={[
                      styles.input,
                      {
                        borderColor: theme.colors.surface,
                        color: theme.colors.foreground,
                      },
                    ]}
                    placeholderTextColor={theme.colors.muted}
                  />

                  <TextInput
                    placeholder="Color"
                    value={selectedItemToEdit.color || ''}
                    onChangeText={text =>
                      setSelectedItemToEdit(prev =>
                        prev ? {...prev, color: text} : prev,
                      )
                    }
                    style={[
                      styles.input,
                      {
                        borderColor: theme.colors.surface,
                        color: theme.colors.foreground,
                      },
                    ]}
                    placeholderTextColor={theme.colors.muted}
                  />

                  {/* ✅ DELETE BUTTON */}
                  <TouchableOpacity
                    onPress={() => {
                      setShowEditModal(false);
                      setSelectedItemToEdit(null);
                    }}
                    style={[
                      styles.button,
                      {
                        backgroundColor: '#888',
                        marginTop: 8,
                      },
                    ]}>
                    <Text style={[styles.buttonText, {color: '#fff'}]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Delete Item',
                        'Are you sure you want to delete this item?',
                        [
                          {text: 'Cancel', style: 'cancel'},
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              handleDeleteItem(selectedItemToEdit.id);
                              setShowEditModal(false);
                              setSelectedItemToEdit(null);
                            },
                          },
                        ],
                      );
                    }}
                    style={[
                      styles.button,
                      {
                        backgroundColor: '#cc0000',
                        marginTop: 12,
                      },
                    ]}>
                    <Text style={[styles.buttonText, {color: '#fff'}]}>
                      Delete Item
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (selectedItemToEdit) {
                        const updated = wardrobe.map(item =>
                          item.id === selectedItemToEdit.id
                            ? selectedItemToEdit
                            : item,
                        );
                        navigate('Closet', {updatedWardrobe: updated});
                        setShowEditModal(false);
                        setSelectedItemToEdit(null);
                      }
                    }}
                    style={[
                      styles.button,
                      {
                        backgroundColor: theme.colors.primary,
                        marginTop: 12,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.buttonText,
                        {color: theme.colors.background},
                      ]}>
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

//////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Pressable,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import EditItemModal from 'components/EditItemModal/EditItemModal';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const ITEM_MARGIN = 19;
// const MIN_ITEM_WIDTH = 160;

// const categories: ('All' | MainCategory)[] = [
//   'All',
//   'Tops',
//   'Bottoms',
//   'Outerwear',
//   'Shoes',
//   'Accessories',
//   'Undergarments',
//   'Activewear',
//   'Formalwear',
//   'Loungewear',
//   'Sleepwear',
//   'Swimwear',
//   'Maternity',
//   'Unisex',
//   'Costumes',
//   'Traditional Wear',
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// type WardrobeItem = {
//   id: string;
//   image: string;
//   name: string;
//   category?: string;
//   color?: string;
//   tags?: string[];
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: WardrobeItem[];
// };

// export default function ClosetScreen({
//   navigate,
//   wardrobe: initialWardrobe,
// }: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedItem, setEditedItem] = useState<WardrobeItem | null>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(initialWardrobe);

//   useEffect(() => {
//     const onChange = ({window}: {window: {width: number}}) => {
//       setScreenWidth(window.width);
//     };
//     Dimensions.addEventListener('change', onChange);
//     return () => Dimensions.removeEventListener('change', onChange);
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const filtered = wardrobe
//     .map(item => ({
//       ...item,
//       inferredCategory: getInferredCategory(item.name),
//     }))
//     .filter(item => {
//       if (selectedCategory === 'All') return true;
//       return item.inferredCategory?.main === selectedCategory;
//     })
//     .sort((a, b) => {
//       if (sortOption === 'az') return a.name.localeCompare(b.name);
//       if (sortOption === 'za') return b.name.localeCompare(a.name);
//       if (sortOption === 'favorites')
//         return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//       return 0;
//     });

//   const handleDeleteItem = (itemId: string) => {
//     setWardrobe(prev => prev.filter(item => item.id !== itemId));
//   };
//   const toggleFavorite = (id: string) => {
//     const updated = wardrobe.map(item =>
//       item.id === id ? {...item, favorite: !item.favorite} : item,
//     );
//     navigate('Closet', {updatedWardrobe: updated});
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingTop: 16,
//       backgroundColor: theme.colors.background,
//     },
//     input: {
//       borderWidth: 1,
//       borderRadius: 10,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },

//     header: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     title: {
//       fontSize: 28,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     filterSortRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       paddingHorizontal: 16,
//       paddingBottom: 8,
//     },
//     iconButton: {
//       padding: 8,
//       borderRadius: 8,
//       backgroundColor: '#405de6',
//       elevation: 2,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 20,
//     },
//     card: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.5,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       position: 'relative',
//     },
//     image: {
//       width: '100%',
//       height: imageSize,
//       borderRadius: 16,
//     },
//     labelContainer: {
//       padding: 8,
//     },
//     label: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: '#405de6',
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 12,
//       margin: 40,
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     createOutfitButton: {
//       backgroundColor: '#4ade80',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       alignSelf: 'center',
//       marginVertical: 10,
//     },

//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//   });

//   type CategorizedWardrobeItem = WardrobeItem & {
//     inferredCategory: {main: MainCategory; sub: Subcategory};
//   };

//   const categorizedItems = filtered.reduce((acc, item) => {
//     const inferred = item.inferredCategory;
//     if (!inferred || !inferred.main || !inferred.sub) return acc;

//     const main = inferred.main;
//     const sub = inferred.sub;

//     if (!acc[main]) acc[main] = {};
//     if (!acc[main][sub]) acc[main][sub] = [];

//     acc[main][sub].push(item as CategorizedWardrobeItem);
//     return acc;
//   }, {} as Partial<Record<MainCategory, Partial<Record<Subcategory, CategorizedWardrobeItem[]>>>>);

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.header}>Closet</Text>
//         <TouchableOpacity
//           style={styles.createOutfitButton}
//           onPress={() => navigate('OutfitBuilder')}>
//           <Text style={styles.createOutfitText}>➕ Create New Outfit</Text>
//         </TouchableOpacity>

//         <View style={styles.filterSortRow}>
//           <TouchableOpacity
//             onPress={() => setShowFilter(true)}
//             style={[styles.iconButton, {marginRight: 8}]}>
//             <MaterialIcons
//               name="filter-list"
//               size={24}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setShowSort(true)}
//             style={styles.iconButton}>
//             <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//           </TouchableOpacity>
//         </View>

//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={{marginBottom: 32}}>
//             <Text style={styles.sectionTitle}>{mainCategory}</Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory} style={{marginBottom: 24}}>
//                 <Text
//                   style={[
//                     styles.label,
//                     {paddingHorizontal: 16, marginBottom: 8},
//                   ]}>
//                   {subCategory}
//                 </Text>
//                 <View style={styles.grid}>
//                   {items.map(item => (
//                     <Pressable
//                       key={item.id}
//                       style={styles.card}
//                       onLongPress={() => {
//                         setSelectedItemToEdit(item);
//                         setShowEditModal(true);
//                       }}
//                       onPress={() =>
//                         navigate('ItemDetail', {itemId: item.id, item})
//                       }>
//                       <Image source={{uri: item.image}} style={styles.image} />
//                       <TouchableOpacity
//                         onPress={() => toggleFavorite(item.id)}
//                         style={{
//                           position: 'absolute',
//                           top: 8,
//                           right: 8,
//                           zIndex: 10,
//                           padding: 4,
//                         }}>
//                         <MaterialIcons
//                           name={item.favorite ? 'star' : 'star-border'}
//                           size={22}
//                           color={item.favorite ? theme.colors.primary : '#999'}
//                         />
//                       </TouchableOpacity>
//                       <View style={styles.labelContainer}>
//                         <Text style={styles.label}>{item.name}</Text>
//                         <Text
//                           style={[styles.label, {fontSize: 12, color: '#888'}]}>
//                           {item.inferredCategory?.sub ?? ''}
//                         </Text>
//                       </View>
//                     </Pressable>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
//         <MaterialIcons name="add" size={28} color="#fff" />
//       </TouchableOpacity>

//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 {categories.map(cat => (
//                   <TouchableOpacity
//                     key={cat}
//                     onPress={() => {
//                       setSelectedCategory(cat);
//                       setShowFilter(false);
//                     }}>
//                     <Text style={styles.modalOption}>{cat}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <View style={[styles.modalContent, {width: '85%'}]}>
//                   <Text style={[styles.label, {marginBottom: 12}]}>
//                     Edit Item
//                   </Text>

//                   <TextInput
//                     placeholder="Name"
//                     value={selectedItemToEdit.name}
//                     onChangeText={text =>
//                       setSelectedItemToEdit(prev =>
//                         prev ? {...prev, name: text} : prev,
//                       )
//                     }
//                     style={[
//                       styles.input,
//                       {
//                         borderColor: theme.colors.surface,
//                         color: theme.colors.foreground,
//                       },
//                     ]}
//                     placeholderTextColor={theme.colors.muted}
//                   />

//                   <TextInput
//                     placeholder="Color"
//                     value={selectedItemToEdit.color || ''}
//                     onChangeText={text =>
//                       setSelectedItemToEdit(prev =>
//                         prev ? {...prev, color: text} : prev,
//                       )
//                     }
//                     style={[
//                       styles.input,
//                       {
//                         borderColor: theme.colors.surface,
//                         color: theme.colors.foreground,
//                       },
//                     ]}
//                     placeholderTextColor={theme.colors.muted}
//                   />

//                   {/* ✅ DELETE BUTTON */}
//                   <TouchableOpacity
//                     onPress={() => {
//                       setShowEditModal(false);
//                       setSelectedItemToEdit(null);
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: '#888',
//                         marginTop: 8,
//                       },
//                     ]}>
//                     <Text style={[styles.buttonText, {color: '#fff'}]}>
//                       Cancel
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     onPress={() => {
//                       Alert.alert(
//                         'Delete Item',
//                         'Are you sure you want to delete this item?',
//                         [
//                           {text: 'Cancel', style: 'cancel'},
//                           {
//                             text: 'Delete',
//                             style: 'destructive',
//                             onPress: () => {
//                               handleDeleteItem(selectedItemToEdit.id);
//                               setShowEditModal(false);
//                               setSelectedItemToEdit(null);
//                             },
//                           },
//                         ],
//                       );
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: '#cc0000',
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text style={[styles.buttonText, {color: '#fff'}]}>
//                       Delete Item
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     onPress={() => {
//                       if (selectedItemToEdit) {
//                         const updated = wardrobe.map(item =>
//                           item.id === selectedItemToEdit.id
//                             ? selectedItemToEdit
//                             : item,
//                         );
//                         navigate('Closet', {updatedWardrobe: updated});
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {
//                         backgroundColor: theme.colors.primary,
//                         marginTop: 12,
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

//////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Pressable,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';
// import EditItemModal from 'components/EditItemModal/EditItemModal';

// const ITEM_MARGIN = 19;
// const MIN_ITEM_WIDTH = 160;

// const categories: ('All' | MainCategory)[] = [
//   'All',
//   'Tops',
//   'Bottoms',
//   'Outerwear',
//   'Shoes',
//   'Accessories',
//   'Undergarments',
//   'Activewear',
//   'Formalwear',
//   'Loungewear',
//   'Sleepwear',
//   'Swimwear',
//   'Maternity',
//   'Unisex',
//   'Costumes',
//   'Traditional Wear',
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// type WardrobeItem = {
//   id: string;
//   image: string;
//   name: string;
//   category?: string;
//   color?: string;
//   tags?: string[];
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: WardrobeItem[];
// };

// export default function ClosetScreen({navigate, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedItemToEdit, setSelectedItemToEdit] =
//     useState<WardrobeItem | null>(null);
//   const [editedItem, setEditedItem] = useState<WardrobeItem | null>(null);

//   useEffect(() => {
//     const onChange = ({window}: {window: {width: number}}) => {
//       setScreenWidth(window.width);
//     };
//     Dimensions.addEventListener('change', onChange);
//     return () => Dimensions.removeEventListener('change', onChange);
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const filtered = wardrobe
//     .map(item => ({
//       ...item,
//       inferredCategory: getInferredCategory(item.name),
//     }))
//     .filter(item => {
//       if (selectedCategory === 'All') return true;
//       return item.inferredCategory?.main === selectedCategory;
//     })
//     .sort((a, b) => {
//       if (sortOption === 'az') return a.name.localeCompare(b.name);
//       if (sortOption === 'za') return b.name.localeCompare(a.name);
//       if (sortOption === 'favorites')
//         return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//       return 0;
//     });

//   const handleDeleteItem = (itemId: string) => {
//     setWardrobe(prev => prev.filter(item => item.id !== itemId));
//   };

//   const toggleFavorite = (id: string) => {
//     const updated = wardrobe.map(item =>
//       item.id === id ? {...item, favorite: !item.favorite} : item,
//     );
//     navigate('Closet', {updatedWardrobe: updated});
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingTop: 16,
//       backgroundColor: theme.colors.background,
//     },
//     input: {
//       borderWidth: 1,
//       borderRadius: 10,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },

//     header: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     title: {
//       fontSize: 28,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     filterSortRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       paddingHorizontal: 16,
//       paddingBottom: 8,
//     },
//     iconButton: {
//       padding: 8,
//       borderRadius: 8,
//       backgroundColor: '#405de6',
//       elevation: 2,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 20,
//     },
//     card: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.5,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       position: 'relative',
//     },
//     image: {
//       width: '100%',
//       height: imageSize,
//       borderRadius: 16,
//     },
//     labelContainer: {
//       padding: 8,
//     },
//     label: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: '#405de6',
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 12,
//       margin: 40,
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//   });

//   type CategorizedWardrobeItem = WardrobeItem & {
//     inferredCategory: {main: MainCategory; sub: Subcategory};
//   };

//   const categorizedItems = filtered.reduce((acc, item) => {
//     const inferred = item.inferredCategory;
//     if (!inferred || !inferred.main || !inferred.sub) return acc;

//     const main = inferred.main;
//     const sub = inferred.sub;

//     if (!acc[main]) acc[main] = {};
//     if (!acc[main][sub]) acc[main][sub] = [];

//     acc[main][sub].push(item as CategorizedWardrobeItem);
//     return acc;
//   }, {} as Partial<Record<MainCategory, Partial<Record<Subcategory, CategorizedWardrobeItem[]>>>>);

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.header}>Closet</Text>

//         <View style={styles.filterSortRow}>
//           <TouchableOpacity
//             onPress={() => setShowFilter(true)}
//             style={[styles.iconButton, {marginRight: 8}]}>
//             <MaterialIcons
//               name="filter-list"
//               size={24}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setShowSort(true)}
//             style={styles.iconButton}>
//             <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//           </TouchableOpacity>
//         </View>

//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={{marginBottom: 32}}>
//             <Text style={styles.sectionTitle}>{mainCategory}</Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory} style={{marginBottom: 24}}>
//                 <Text
//                   style={[
//                     styles.label,
//                     {paddingHorizontal: 16, marginBottom: 8},
//                   ]}>
//                   {subCategory}
//                 </Text>
//                 <View style={styles.grid}>
//                   {items.map(item => (
//                     <Pressable
//                       key={item.id}
//                       style={styles.card}
//                       onLongPress={() => {
//                         setSelectedItemToEdit(item);
//                         setShowEditModal(true);
//                       }}
//                       onPress={() =>
//                         navigate('ItemDetail', {itemId: item.id, item})
//                       }>
//                       <Image source={{uri: item.image}} style={styles.image} />
//                       <TouchableOpacity
//                         onPress={() => toggleFavorite(item.id)}
//                         style={{
//                           position: 'absolute',
//                           top: 8,
//                           right: 8,
//                           zIndex: 10,
//                           padding: 4,
//                         }}>
//                         <MaterialIcons
//                           name={item.favorite ? 'star' : 'star-border'}
//                           size={22}
//                           color={item.favorite ? theme.colors.primary : '#999'}
//                         />
//                       </TouchableOpacity>
//                       <View style={styles.labelContainer}>
//                         <Text style={styles.label}>{item.name}</Text>
//                         <Text
//                           style={[styles.label, {fontSize: 12, color: '#888'}]}>
//                           {item.inferredCategory?.sub ?? ''}
//                         </Text>
//                       </View>
//                     </Pressable>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
//         <MaterialIcons name="add" size={28} color="#fff" />
//       </TouchableOpacity>

//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 {categories.map(cat => (
//                   <TouchableOpacity
//                     key={cat}
//                     onPress={() => {
//                       setSelectedCategory(cat);
//                       setShowFilter(false);
//                     }}>
//                     <Text style={styles.modalOption}>{cat}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       {selectedItemToEdit && (
//         <Modal visible={showEditModal} transparent animationType="slide">
//           {selectedItemToEdit?.image && (
//             <View style={{alignItems: 'center', marginBottom: 16}}>
//               <Image
//                 source={{uri: selectedItemToEdit.image}}
//                 style={{width: 120, height: 120, borderRadius: 8}}
//               />
//             </View>
//           )}
//           <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <View style={[styles.modalContent, {width: '85%'}]}>
//                   <Text style={[styles.label, {marginBottom: 12}]}>
//                     Edit Item
//                   </Text>

//                   <TextInput
//                     placeholder="Name"
//                     value={selectedItemToEdit.name}
//                     onChangeText={text =>
//                       setSelectedItemToEdit(prev =>
//                         prev ? {...prev, name: text} : prev,
//                       )
//                     }
//                     style={[
//                       styles.input,
//                       {
//                         borderColor: theme.colors.surface,
//                         color: theme.colors.foreground,
//                       },
//                     ]}
//                     placeholderTextColor={theme.colors.muted}
//                   />

//                   <TextInput
//                     placeholder="Color"
//                     value={selectedItemToEdit.color || ''}
//                     onChangeText={text =>
//                       setSelectedItemToEdit(prev =>
//                         prev ? {...prev, color: text} : prev,
//                       )
//                     }
//                     style={[
//                       styles.input,
//                       {
//                         borderColor: theme.colors.surface,
//                         color: theme.colors.foreground,
//                       },
//                     ]}
//                     placeholderTextColor={theme.colors.muted}
//                   />

//                   <TouchableOpacity
//                     onPress={() => {
//                       if (selectedItemToEdit) {
//                         const updated = wardrobe.map(item =>
//                           item.id === selectedItemToEdit.id
//                             ? selectedItemToEdit
//                             : item,
//                         );
//                         navigate('Closet', {updatedWardrobe: updated});
//                         setShowEditModal(false);
//                         setSelectedItemToEdit(null);
//                       }
//                     }}
//                     style={[
//                       styles.button,
//                       {backgroundColor: theme.colors.primary, marginTop: 16},
//                     ]}>
//                     <Text
//                       style={[
//                         styles.buttonText,
//                         {color: theme.colors.background},
//                       ]}>
//                       Save Changes
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

//////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Pressable,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   TouchableWithoutFeedback,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory, Subcategory} from '../types/categoryTypes';

// const ITEM_MARGIN = 19;
// const MIN_ITEM_WIDTH = 160;

// const categories: ('All' | MainCategory)[] = [
//   'All',
//   'Tops',
//   'Bottoms',
//   'Outerwear',
//   'Shoes',
//   'Accessories',
//   'Undergarments',
//   'Activewear',
//   'Formalwear',
//   'Loungewear',
//   'Sleepwear',
//   'Swimwear',
//   'Maternity',
//   'Unisex',
//   'Costumes',
//   'Traditional Wear',
// ];

// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// type WardrobeItem = {
//   id: string;
//   image: string;
//   name: string;
//   category?: string;
//   color?: string;
//   tags?: string[];
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: WardrobeItem[];
// };

// export default function ClosetScreen({navigate, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [selectedCategory, setSelectedCategory] = useState<
//     'All' | MainCategory
//   >('All');
//   const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites'>('az');
//   const [showFilter, setShowFilter] = useState(false);
//   const [showSort, setShowSort] = useState(false);

//   useEffect(() => {
//     const onChange = ({window}: {window: {width: number}}) => {
//       setScreenWidth(window.width);
//     };
//     Dimensions.addEventListener('change', onChange);
//     return () => Dimensions.removeEventListener('change', onChange);
//   }, []);

//   const numColumns =
//     Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
//   const imageSize =
//     (screenWidth - ITEM_MARGIN * (numColumns - 1) - ITEM_MARGIN * 1.5) /
//     numColumns;

//   const filtered = wardrobe
//     .map(item => ({
//       ...item,
//       inferredCategory: getInferredCategory(item.name),
//     }))
//     .filter(item => {
//       if (selectedCategory === 'All') return true;
//       return item.inferredCategory?.main === selectedCategory;
//     })
//     .sort((a, b) => {
//       if (sortOption === 'az') return a.name.localeCompare(b.name);
//       if (sortOption === 'za') return b.name.localeCompare(a.name);
//       if (sortOption === 'favorites')
//         return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//       return 0;
//     });

//   const toggleFavorite = (id: string) => {
//     const updated = wardrobe.map(item =>
//       item.id === id ? {...item, favorite: !item.favorite} : item,
//     );
//     navigate('Closet', {updatedWardrobe: updated});
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingTop: 16,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     title: {
//       fontSize: 28,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     filterSortRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       paddingHorizontal: 16,
//       paddingBottom: 8,
//     },
//     iconButton: {
//       padding: 8,
//       borderRadius: 8,
//       backgroundColor: '#405de6',
//       elevation: 2,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 20,
//     },
//     card: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.5,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       position: 'relative',
//     },
//     image: {
//       width: '100%',
//       height: imageSize,
//       borderRadius: 16,
//     },
//     labelContainer: {
//       padding: 8,
//     },
//     label: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     fab: {
//       position: 'absolute',
//       bottom: 24,
//       right: 24,
//       backgroundColor: '#405de6',
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 12,
//       margin: 40,
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//   });

//   type CategorizedWardrobeItem = WardrobeItem & {
//     inferredCategory: {main: MainCategory; sub: Subcategory};
//   };

//   const categorizedItems = filtered.reduce((acc, item) => {
//     const inferred = item.inferredCategory;
//     if (!inferred || !inferred.main || !inferred.sub) return acc;

//     const main = inferred.main;
//     const sub = inferred.sub;

//     if (!acc[main]) acc[main] = {};
//     if (!acc[main][sub]) acc[main][sub] = [];

//     acc[main][sub].push(item as CategorizedWardrobeItem);
//     return acc;
//   }, {} as Partial<Record<MainCategory, Partial<Record<Subcategory, CategorizedWardrobeItem[]>>>>);

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.header}>Closet</Text>

//         <View style={styles.filterSortRow}>
//           <TouchableOpacity
//             onPress={() => setShowFilter(true)}
//             style={[styles.iconButton, {marginRight: 8}]}>
//             <MaterialIcons
//               name="filter-list"
//               size={24}
//               color={theme.colors.primary}
//             />
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setShowSort(true)}
//             style={styles.iconButton}>
//             <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//           </TouchableOpacity>
//         </View>

//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={{marginBottom: 32}}>
//             <Text style={styles.sectionTitle}>{mainCategory}</Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory} style={{marginBottom: 24}}>
//                 <Text
//                   style={[
//                     styles.label,
//                     {paddingHorizontal: 16, marginBottom: 8},
//                   ]}>
//                   {subCategory}
//                 </Text>
//                 <View style={styles.grid}>
//                   {items.map(item => (
//                     <Pressable
//                       key={item.id}
//                       style={styles.card}
//                       onPress={() =>
//                         navigate('ItemDetail', {itemId: item.id, item})
//                       }>
//                       <Image source={{uri: item.image}} style={styles.image} />
//                       <TouchableOpacity
//                         onPress={() => toggleFavorite(item.id)}
//                         style={{
//                           position: 'absolute',
//                           top: 8,
//                           right: 8,
//                           zIndex: 10,
//                           padding: 4,
//                         }}>
//                         <MaterialIcons
//                           name={item.favorite ? 'star' : 'star-border'}
//                           size={22}
//                           color={item.favorite ? theme.colors.primary : '#999'}
//                         />
//                       </TouchableOpacity>
//                       <View style={styles.labelContainer}>
//                         <Text style={styles.label}>{item.name}</Text>
//                         <Text
//                           style={[styles.label, {fontSize: 12, color: '#888'}]}>
//                           {item.inferredCategory?.sub ?? ''}
//                         </Text>
//                       </View>
//                     </Pressable>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
//         <MaterialIcons name="add" size={28} color="#fff" />
//       </TouchableOpacity>

//       <Modal visible={showFilter} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 {categories.map(cat => (
//                   <TouchableOpacity
//                     key={cat}
//                     onPress={() => {
//                       setSelectedCategory(cat);
//                       setShowFilter(false);
//                     }}>
//                     <Text style={styles.modalOption}>{cat}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       <Modal visible={showSort} transparent animationType="slide">
//         <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.3)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 {sortOptions.map(opt => (
//                   <TouchableOpacity
//                     key={opt.value}
//                     onPress={() => {
//                       setSortOption(opt.value as any);
//                       setShowSort(false);
//                     }}>
//                     <Text style={styles.modalOption}>{opt.label}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
//     </View>
//   );
// }
