import React, {useState, useEffect, useMemo} from 'react';
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
import {Alert} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

const categoryIcons: Partial<Record<MainCategory, string>> = {
  Tops: 'checkroom',
  Bottoms: 'drag-handle',
  Outerwear: 'ac-unit',
  Shoes: 'hiking',
  Accessories: 'watch',
  Undergarments: 'layers',
  Activewear: 'fitness-center',
  Formalwear: 'work',
  Loungewear: 'weekend',
  Sleepwear: 'hotel',
  Swimwear: 'pool',
  Maternity: 'pregnant-woman',
  Unisex: 'wc',
  Costumes: 'theater-comedy',
  'Traditional Wear': 'festival',
};

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
  image_url: string;
  name: string;
  color?: string;
  main_category?: string;
  subcategory?: string;
  fit?: string;
  size?: string;
  brand?: string;
  material?: string;
  width?: number;
  height?: number;
  favorite?: boolean;
};

type Props = {
  navigate: (screen: string, params?: any) => void;
};

export default function ClosetScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );

  const LOCAL_IP = '192.168.0.106';
  const PORT = 3001;
  const BASE_URL = `${API_BASE_URL}/wardrobe`;

  const userId = useUUID();

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
  const [editedName, setEditedName] = useState('');
  const [editedColor, setEditedColor] = useState('');

  const {
    data: wardrobe = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['wardrobe', userId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe');
      const json = await res.json();
      console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
      return json;
    },
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['wardrobe']});
    },
  });

  const filtered = useMemo(() => {
    return wardrobe
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
  }, [wardrobe, selectedCategory, sortOption]);

  const categorizedItems = useMemo(() => {
    const result: Record<string, Record<string, WardrobeItem[]>> = {};
    for (const item of filtered) {
      const main =
        item.main_category || item.inferredCategory?.main || 'Uncategorized';
      const sub = item.subcategory || item.inferredCategory?.sub || 'General';
      if (!result[main]) result[main] = {};
      if (!result[main][sub]) result[main][sub] = [];
      result[main][sub].push(item);
    }
    return result;
  }, [filtered]);

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

  const handleDeleteItem = (itemId: string) => {
    deleteMutation.mutate(itemId);
  };

  // const toggleFavorite = (id: string) => {
  //   const item = wardrobe.find(i => i.id === id);
  //   if (!item) return;
  //   favoriteMutation.mutate({id, favorite: !item.favorite});
  // };

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingTop: 24,
      paddingBottom: 60,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 12,
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
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 32,
      paddingBottom: 8,
    },
    iconButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.button1,
      elevation: 2,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    card: {
      width: 184,
      marginBottom: ITEM_MARGIN * 0.6,
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
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      backgroundColor: theme.colors.button1,
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
      backgroundColor: theme.colors.button1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignSelf: 'center',
      marginRight: 8,
    },
    createOutfitText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    tryOnButton: {
      backgroundColor: theme.colors.button1,
    },
    tryOnButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
    },
  });

  type CategorizedWardrobeItem = WardrobeItem & {
    inferredCategory: {main: MainCategory; sub: Subcategory};
  };

  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
      await fetch(`${BASE_URL}/favorite/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({favorite}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['wardrobe', userId],
      });
    },
  });

  return (
    <View style={[styles.screen, styles.container]}>
      <Text style={styles.header}>Wardrobe</Text>

      <View style={styles.section}>
        <View style={styles.buttonRow}>
          <AppleTouchFeedback
            style={styles.createOutfitButton}
            hapticStyle="impactHeavy"
            onPress={() => navigate('OutfitBuilder')}>
            <Text style={styles.createOutfitText}>+ Create New Outfit</Text>
          </AppleTouchFeedback>

          <AppleTouchFeedback
            style={{...styles.iconButton, marginRight: 8}}
            hapticStyle="impactLight"
            onPress={() => setShowFilter(true)}>
            <MaterialIcons
              name="filter-list"
              size={24}
              color={theme.colors.primary}
            />
          </AppleTouchFeedback>

          <AppleTouchFeedback
            style={{...styles.iconButton}}
            hapticStyle="impactLight"
            onPress={() => setShowSort(true)}>
            <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
          </AppleTouchFeedback>
        </View>
      </View>

      <ScrollView>
        {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
          <View key={mainCategory} style={styles.section}>
            <Text style={[styles.sectionTitle, {fontSize: 24}]}>
              {mainCategory}
            </Text>

            {Object.entries(subMap).map(([subCategory, items]) => (
              <View key={subCategory} style={{marginBottom: 24}}>
                <Text
                  style={[
                    styles.label,
                    {paddingHorizontal: 16, marginBottom: 8},
                  ]}>
                  {subCategory}
                </Text>

                {/* ✅ This wraps only the image cards for this group in a proper grid */}
                <View style={styles.grid}>
                  {items.map(item => (
                    <AppleTouchFeedback
                      key={item.id}
                      style={styles.card}
                      hapticStyle="impactLight"
                      onPress={() =>
                        navigate('ItemDetail', {itemId: item.id, item})
                      }
                      onLongPress={() => {
                        setSelectedItemToEdit(item);
                        setShowEditModal(true);
                      }}>
                      <Image
                        source={{uri: item.image_url}}
                        style={styles.image}
                        resizeMode="cover"
                      />

                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 10,
                          padding: 4,
                        }}>
                        <AppleTouchFeedback
                          hapticStyle="impactLight"
                          onPress={() =>
                            favoriteMutation.mutate({
                              id: item.id,
                              favorite: !item.favorite,
                            })
                          }>
                          <MaterialIcons
                            name={item.favorite ? 'star' : 'star-border'}
                            size={22}
                            color={
                              item.favorite ? theme.colors.primary : '#999'
                            }
                          />
                        </AppleTouchFeedback>
                      </View>

                      <View style={styles.labelContainer}>
                        <Text style={styles.label}>{item.name}</Text>
                        <Text
                          style={[styles.label, {fontSize: 12, color: '#888'}]}>
                          {subCategory}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() =>
                          navigate('TryOnOverlay', {
                            outfit: {
                              top: {
                                name: item.name,
                                imageUri: item.image_url,
                              },
                            },
                            userPhotoUri: Image.resolveAssetSource(
                              require('../assets/images/full-body-temp1.png'),
                            ).uri,
                          })
                        }
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 8,
                          backgroundColor: 'black',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}>
                        <Text style={styles.tryOnButtonText}>Try On</Text>
                      </TouchableOpacity>
                    </AppleTouchFeedback>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <AppleTouchFeedback
        style={{...styles.fab, marginRight: 16}}
        onPress={() => navigate('AddItem')}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </AppleTouchFeedback>

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
                  <TextInput
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Name"
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    value={editedColor}
                    onChangeText={setEditedColor}
                    placeholder="Color"
                    style={styles.input}
                    placeholderTextColor="#999"
                  />

                  <AppleTouchFeedback
                    hapticStyle="impactMedium"
                    onPress={async () => {
                      if (selectedItemToEdit) {
                        const inferred = getInferredCategory(
                          selectedItemToEdit.name,
                        );
                        await fetch(`${BASE_URL}/${selectedItemToEdit.id}`, {
                          method: 'PATCH',
                          headers: {'Content-Type': 'application/json'},
                          body: JSON.stringify({
                            name: selectedItemToEdit.name,
                            color: selectedItemToEdit.color,
                          }),
                        });
                        queryClient.invalidateQueries({
                          queryKey: ['wardrobe', userId],
                        });
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
                  </AppleTouchFeedback>

                  {/* ✅ Properly separated Delete Button */}
                  <AppleTouchFeedback
                    hapticStyle="impactHeavy"
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
                    style={{
                      backgroundColor: '#cc0000',
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 16,
                    }}>
                    <Text
                      style={{
                        color: '#fff',
                        textAlign: 'center',
                        fontWeight: '600',
                      }}>
                      Delete Item
                    </Text>
                  </AppleTouchFeedback>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

////////////

// import React, {useState, useEffect, useMemo} from 'react';
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
// import {Alert} from 'react-native';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const categoryIcons: Partial<Record<MainCategory, string>> = {
//   Tops: 'checkroom',
//   Bottoms: 'drag-handle',
//   Outerwear: 'ac-unit',
//   Shoes: 'hiking',
//   Accessories: 'watch',
//   Undergarments: 'layers',
//   Activewear: 'fitness-center',
//   Formalwear: 'work',
//   Loungewear: 'weekend',
//   Sleepwear: 'hotel',
//   Swimwear: 'pool',
//   Maternity: 'pregnant-woman',
//   Unisex: 'wc',
//   Costumes: 'theater-comedy',
//   'Traditional Wear': 'festival',
// };

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
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: string;
//   subcategory?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const BASE_URL = `${API_BASE_URL}/wardrobe`;

//   const userId = useUUID();

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
//   const [editedName, setEditedName] = useState('');
//   const [editedColor, setEditedColor] = useState('');

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${BASE_URL}/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe']});
//     },
//   });

//   const filtered = useMemo(() => {
//     return wardrobe
//       .map(item => ({
//         ...item,
//         inferredCategory: getInferredCategory(item.name),
//       }))
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.inferredCategory?.main === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         item.main_category || item.inferredCategory?.main || 'Uncategorized';
//       const sub = item.subcategory || item.inferredCategory?.sub || 'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

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

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   // const toggleFavorite = (id: string) => {
//   //   const item = wardrobe.find(i => i.id === id);
//   //   if (!item) return;
//   //   favoriteMutation.mutate({id, favorite: !item.favorite});
//   // };

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
//       fontSize: 13,
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
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: '#405de6',
//     },
//     tryOnButtonText: {
//       color: 'white',
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   type CategorizedWardrobeItem = WardrobeItem & {
//     inferredCategory: {main: MainCategory; sub: Subcategory};
//   };

//   const queryClient = useQueryClient();

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${BASE_URL}/favorite/${id}`, {
//         method: 'PATCH',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['wardrobe', userId],
//       });
//     },
//   });

//   return (
//     <View style={{flex: 1}}>
//       <Text style={styles.header}>Wardrobe</Text>

//       <View style={styles.filterSortRow}>
//         <AppleTouchFeedback
//           style={styles.createOutfitButton}
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('OutfitBuilder')}>
//           <Text style={styles.createOutfitText}>+ Create New Outfit</Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={{...styles.iconButton, marginRight: 8}}
//           hapticStyle="impactLight"
//           onPress={() => setShowFilter(true)}>
//           <MaterialIcons
//             name="filter-list"
//             size={24}
//             color={theme.colors.primary}
//           />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={{...styles.iconButton}}
//           hapticStyle="impactLight"
//           onPress={() => setShowSort(true)}>
//           <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//         </AppleTouchFeedback>
//       </View>

//       <ScrollView style={styles.container}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={{marginBottom: 32}}>
//             <Text style={[styles.sectionTitle, {fontSize: 24}]}>
//               {mainCategory}
//             </Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory} style={{marginBottom: 24}}>
//                 <Text
//                   style={[
//                     styles.label,
//                     {paddingHorizontal: 16, marginBottom: 8},
//                   ]}>
//                   {subCategory}
//                 </Text>

//                 {/* ✅ This wraps only the image cards for this group in a proper grid */}
//                 <View style={styles.grid}>
//                   {items.map(item => (
//                     <AppleTouchFeedback
//                       key={item.id}
//                       style={styles.card}
//                       hapticStyle="impactLight"
//                       onPress={() =>
//                         navigate('ItemDetail', {itemId: item.id, item})
//                       }
//                       onLongPress={() => {
//                         setSelectedItemToEdit(item);
//                         setShowEditModal(true);
//                       }}>
//                       <Image
//                         source={{uri: item.image_url}}
//                         style={styles.image}
//                         resizeMode="cover"
//                       />

//                       <View
//                         style={{
//                           position: 'absolute',
//                           top: 8,
//                           right: 8,
//                           zIndex: 10,
//                           padding: 4,
//                         }}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() =>
//                             favoriteMutation.mutate({
//                               id: item.id,
//                               favorite: !item.favorite,
//                             })
//                           }>
//                           <MaterialIcons
//                             name={item.favorite ? 'star' : 'star-border'}
//                             size={22}
//                             color={
//                               item.favorite ? theme.colors.primary : '#999'
//                             }
//                           />
//                         </AppleTouchFeedback>
//                       </View>

//                       <View style={styles.labelContainer}>
//                         <Text style={styles.label}>{item.name}</Text>
//                         <Text
//                           style={[styles.label, {fontSize: 12, color: '#888'}]}>
//                           {subCategory}
//                         </Text>
//                       </View>

//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: item.name,
//                                 imageUri: item.image_url,
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
//                     </AppleTouchFeedback>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ))}
//       </ScrollView>

//       <AppleTouchFeedback
//         style={{...styles.fab, marginRight: 16}}
//         onPress={() => navigate('AddItem')}>
//         <MaterialIcons name="add" size={28} color="#fff" />
//       </AppleTouchFeedback>

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
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <TouchableOpacity
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         const inferred = getInferredCategory(
//                           selectedItemToEdit.name,
//                         );
//                         await fetch(`${BASE_URL}/${selectedItemToEdit.id}`, {
//                           method: 'PATCH',
//                           headers: {'Content-Type': 'application/json'},
//                           body: JSON.stringify({
//                             name: selectedItemToEdit.name,
//                             color: selectedItemToEdit.color,
//                           }),
//                         });
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
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

//                   {/* ✅ Properly separated Delete Button */}
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
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
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

/////////

// import React, {useState, useEffect, useMemo} from 'react';
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
// import {Alert} from 'react-native';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';

// const categoryIcons: Partial<Record<MainCategory, string>> = {
//   Tops: 'checkroom',
//   Bottoms: 'drag-handle',
//   Outerwear: 'ac-unit',
//   Shoes: 'hiking',
//   Accessories: 'watch',
//   Undergarments: 'layers',
//   Activewear: 'fitness-center',
//   Formalwear: 'work',
//   Loungewear: 'weekend',
//   Sleepwear: 'hotel',
//   Swimwear: 'pool',
//   Maternity: 'pregnant-woman',
//   Unisex: 'wc',
//   Costumes: 'theater-comedy',
//   'Traditional Wear': 'festival',
// };

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
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: string;
//   subcategory?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const BASE_URL = `${API_BASE_URL}/wardrobe`;

//   const userId = useUUID();

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

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${BASE_URL}/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
//         method: 'DELETE',
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe']});
//     },
//   });

//   const filtered = useMemo(() => {
//     return wardrobe
//       .map(item => ({
//         ...item,
//         inferredCategory: getInferredCategory(item.name),
//       }))
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.inferredCategory?.main === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         item.main_category || item.inferredCategory?.main || 'Uncategorized';
//       const sub = item.subcategory || item.inferredCategory?.sub || 'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

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

//   const handleDeleteItem = (itemId: string) => {
//     deleteMutation.mutate(itemId);
//   };

//   // const toggleFavorite = (id: string) => {
//   //   const item = wardrobe.find(i => i.id === id);
//   //   if (!item) return;
//   //   favoriteMutation.mutate({id, favorite: !item.favorite});
//   // };

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
//       fontSize: 13,
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
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: '#405de6',
//     },
//     tryOnButtonText: {
//       color: 'white',
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   type CategorizedWardrobeItem = WardrobeItem & {
//     inferredCategory: {main: MainCategory; sub: Subcategory};
//   };

//   const queryClient = useQueryClient();

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${BASE_URL}/favorite/${id}`, {
//         method: 'PATCH',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['wardrobe', userId],
//       });
//     },
//   });

//   return (
//     <View style={{flex: 1}}>
//       <Text style={styles.header}>Wardrobe</Text>

//       <View style={styles.filterSortRow}>
//         <TouchableOpacity
//           style={styles.createOutfitButton}
//           onPress={() => navigate('OutfitBuilder')}>
//           <Text style={styles.createOutfitText}>+ Create New Outfit</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => setShowFilter(true)}
//           style={[styles.iconButton, {marginRight: 8}]}>
//           <MaterialIcons
//             name="filter-list"
//             size={24}
//             color={theme.colors.primary}
//           />
//         </TouchableOpacity>
//         <TouchableOpacity
//           onPress={() => setShowSort(true)}
//           style={styles.iconButton}>
//           <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//         </TouchableOpacity>
//       </View>

//       <ScrollView style={styles.container}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={{marginBottom: 32}}>
//             <Text style={[styles.sectionTitle, {fontSize: 24}]}>
//               {mainCategory}
//             </Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory} style={{marginBottom: 24}}>
//                 <Text
//                   style={[
//                     styles.label,
//                     {paddingHorizontal: 16, marginBottom: 8},
//                   ]}>
//                   {subCategory}
//                 </Text>

//                 {/* ✅ This wraps only the image cards for this group in a proper grid */}
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
//                       <Image
//                         source={{uri: item.image_url}}
//                         style={styles.image}
//                         resizeMode="cover"
//                       />
//                       <TouchableOpacity
//                         onPress={() =>
//                           favoriteMutation.mutate({
//                             id: item.id,
//                             favorite: !item.favorite,
//                           })
//                         }
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
//                           {subCategory}
//                         </Text>
//                       </View>
//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: item.name,
//                                 imageUri: item.image_url,
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
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
//                   <TextInput
//                     value={editedName}
//                     onChangeText={setEditedName}
//                     placeholder="Name"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />
//                   <TextInput
//                     value={editedColor}
//                     onChangeText={setEditedColor}
//                     placeholder="Color"
//                     style={styles.input}
//                     placeholderTextColor="#999"
//                   />

//                   <TouchableOpacity
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         const inferred = getInferredCategory(
//                           selectedItemToEdit.name,
//                         );
//                         await fetch(`${BASE_URL}/${selectedItemToEdit.id}`, {
//                           method: 'PATCH',
//                           headers: {'Content-Type': 'application/json'},
//                           body: JSON.stringify({
//                             name: selectedItemToEdit.name,
//                             color: selectedItemToEdit.color,
//                           }),
//                         });
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
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

//                   {/* ✅ Properly separated Delete Button */}
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
//                     style={{
//                       backgroundColor: '#cc0000',
//                       padding: 12,
//                       borderRadius: 8,
//                       marginTop: 16,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         textAlign: 'center',
//                         fontWeight: '600',
//                       }}>
//                       Delete Item
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

/////////

// import React, {useState, useEffect, useMemo} from 'react';
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
// import EditItemModal from '../components/EditItemModal/EditItemModal';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {Alert} from 'react-native';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';

// const categoryIcons: Partial<Record<MainCategory, string>> = {
//   Tops: 'checkroom',
//   Bottoms: 'drag-handle',
//   Outerwear: 'ac-unit',
//   Shoes: 'hiking',
//   Accessories: 'watch',
//   Undergarments: 'layers',
//   Activewear: 'fitness-center',
//   Formalwear: 'work',
//   Loungewear: 'weekend',
//   Sleepwear: 'hotel',
//   Swimwear: 'pool',
//   Maternity: 'pregnant-woman',
//   Unisex: 'wc',
//   Costumes: 'theater-comedy',
//   'Traditional Wear': 'festival',
// };

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
//   image_url: string;
//   name: string;
//   color?: string;
//   main_category?: string;
//   subcategory?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const BASE_URL = `${API_BASE_URL}/wardrobe`;

//   const userId = useUUID();

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

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${BASE_URL}/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2));
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const filtered = useMemo(() => {
//     return wardrobe
//       .map(item => ({
//         ...item,
//         inferredCategory: getInferredCategory(item.name),
//       }))
//       .filter(item => {
//         if (selectedCategory === 'All') return true;
//         return item.inferredCategory?.main === selectedCategory;
//       })
//       .sort((a, b) => {
//         if (sortOption === 'az') return a.name.localeCompare(b.name);
//         if (sortOption === 'za') return b.name.localeCompare(a.name);
//         if (sortOption === 'favorites')
//           return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//         return 0;
//       });
//   }, [wardrobe, selectedCategory, sortOption]);

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, WardrobeItem[]>> = {};
//     for (const item of filtered) {
//       const main =
//         item.main_category || item.inferredCategory?.main || 'Uncategorized';
//       const sub = item.subcategory || item.inferredCategory?.sub || 'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [filtered]);

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

//   // const handleDeleteItem = (itemId: string) => {
//   //   setWardrobe(prev => prev.filter(item => item.id !== itemId));
//   // };

//   // const toggleFavorite = (id: string) => {
//   //   const item = wardrobe.find(i => i.id === id);
//   //   if (!item) return;
//   //   favoriteMutation.mutate({id, favorite: !item.favorite});
//   // };

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
//       fontSize: 13,
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
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: '#405de6',
//     },
//     tryOnButtonText: {
//       color: 'white',
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   type CategorizedWardrobeItem = WardrobeItem & {
//     inferredCategory: {main: MainCategory; sub: Subcategory};
//   };

//   const queryClient = useQueryClient();

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${BASE_URL}/favorite/${id}`, {
//         method: 'PATCH',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['wardrobe', userId],
//       });
//     },
//   });

//   return (
//     <View style={{flex: 1}}>
//       <Text style={styles.header}>Wardrobe</Text>

//       <View style={styles.filterSortRow}>
//         <TouchableOpacity
//           style={styles.createOutfitButton}
//           onPress={() => navigate('OutfitBuilder')}>
//           <Text style={styles.createOutfitText}>+ Create New Outfit</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => setShowFilter(true)}
//           style={[styles.iconButton, {marginRight: 8}]}>
//           <MaterialIcons
//             name="filter-list"
//             size={24}
//             color={theme.colors.primary}
//           />
//         </TouchableOpacity>
//         <TouchableOpacity
//           onPress={() => setShowSort(true)}
//           style={styles.iconButton}>
//           <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//         </TouchableOpacity>
//       </View>

//       <ScrollView style={styles.container}>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={{marginBottom: 32}}>
//             <Text style={[styles.sectionTitle, {fontSize: 24}]}>
//               {mainCategory}
//             </Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory} style={{marginBottom: 24}}>
//                 <Text
//                   style={[
//                     styles.label,
//                     {paddingHorizontal: 16, marginBottom: 8},
//                   ]}>
//                   {subCategory}
//                 </Text>

//                 {/* ✅ This wraps only the image cards for this group in a proper grid */}
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
//                       <Image
//                         source={{uri: item.image_url}}
//                         style={styles.image}
//                         resizeMode="cover"
//                       />
//                       <TouchableOpacity
//                         onPress={() =>
//                           favoriteMutation.mutate({
//                             id: item.id,
//                             favorite: !item.favorite,
//                           })
//                         }
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
//                           {subCategory}
//                         </Text>
//                       </View>
//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: item.name,
//                                 imageUri: item.image_url,
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
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
//                               // handleDeleteItem(selectedItemToEdit.id);
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
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         const inferred = getInferredCategory(
//                           selectedItemToEdit.name,
//                         );
//                         await fetch(`${BASE_URL}/${selectedItemToEdit.id}`, {
//                           method: 'PATCH',
//                           headers: {'Content-Type': 'application/json'},
//                           body: JSON.stringify({
//                             name: selectedItemToEdit.name,
//                             color: selectedItemToEdit.color,
//                           }),
//                         });
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
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

///////////////

// import React, {useState, useEffect, useMemo} from 'react';
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
// import EditItemModal from '../components/EditItemModal/EditItemModal';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {Alert} from 'react-native';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';

// const categoryIcons: Partial<Record<MainCategory, string>> = {
//   Tops: 'checkroom',
//   Bottoms: 'drag-handle',
//   Outerwear: 'ac-unit',
//   Shoes: 'hiking',
//   Accessories: 'watch',
//   Undergarments: 'layers',
//   Activewear: 'fitness-center',
//   Formalwear: 'work',
//   Loungewear: 'weekend',
//   Sleepwear: 'hotel',
//   Swimwear: 'pool',
//   Maternity: 'pregnant-woman',
//   Unisex: 'wc',
//   Costumes: 'theater-comedy',
//   'Traditional Wear': 'festival',
// };

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
//   image_url: string; // ✅ your actual uploaded image URL
//   name: string;
//   color?: string;
//   main_category?: string;
//   subcategory?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   material?: string;
//   width?: number;
//   height?: number;
//   favorite?: boolean;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const BASE_URL = `${API_BASE_URL}/wardrobe`;

//   const userId = useUUID();

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

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${BASE_URL}/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       const json = await res.json();
//       console.log('👕 LOOOOOOOK', JSON.stringify(json, null, 2)); // Add this
//       return json;
//     },
//     enabled: !!userId,
//   });

//   const categorizedItems = useMemo(() => {
//     const result: Record<string, Record<string, any[]>> = {};
//     for (const item of wardrobe) {
//       const main = item.main_category || 'Uncategorized';
//       const sub = item.subcategory || 'General';
//       if (!result[main]) result[main] = {};
//       if (!result[main][sub]) result[main][sub] = [];
//       result[main][sub].push(item);
//     }
//     return result;
//   }, [wardrobe]);

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

//   // const filtered = wardrobe
//   //   .map(item => ({
//   //     ...item,
//   //     inferredCategory: getInferredCategory(item.name),
//   //   }))
//   //   .filter(item => {
//   //     if (selectedCategory === 'All') return true;
//   //     return item.inferredCategory?.main === selectedCategory;
//   //   })
//   //   .sort((a, b) => {
//   //     if (sortOption === 'az') return a.name.localeCompare(b.name);
//   //     if (sortOption === 'za') return b.name.localeCompare(a.name);
//   //     if (sortOption === 'favorites')
//   //       return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
//   //     return 0;
//   //   });

//   // const handleDeleteItem = (itemId: string) => {
//   //   setWardrobe(prev => prev.filter(item => item.id !== itemId));
//   // };

//   // const toggleFavorite = (id: string) => {
//   //   const item = wardrobe.find(i => i.id === id);
//   //   if (!item) return;
//   //   favoriteMutation.mutate({id, favorite: !item.favorite});
//   // };

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
//       fontSize: 13,
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
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: '#405de6',
//     },
//     tryOnButtonText: {
//       color: 'white',
//       fontSize: 14,
//       fontWeight: '500',
//     },
//   });

//   type CategorizedWardrobeItem = WardrobeItem & {
//     inferredCategory: {main: MainCategory; sub: Subcategory};
//   };

//   // const categorizedItems = filtered.reduce((acc, item) => {
//   //   const inferred = item.inferredCategory;
//   //   if (!inferred || !inferred.main || !inferred.sub) return acc;

//   //   const main = inferred.main;
//   //   const sub = inferred.sub;

//   //   if (!acc[main]) acc[main] = {};
//   //   if (!acc[main][sub]) acc[main][sub] = [];

//   //   acc[main][sub].push(item as CategorizedWardrobeItem);
//   //   return acc;
//   // }, {} as Partial<Record<MainCategory, Partial<Record<Subcategory, CategorizedWardrobeItem[]>>>>);

//   const queryClient = useQueryClient();

//   const favoriteMutation = useMutation({
//     mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
//       await fetch(`${BASE_URL}/favorite/${id}`, {
//         method: 'PATCH',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({favorite}),
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['wardrobe', userId],
//       });
//     },
//   });

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.header}>Wardrobe</Text>

//         <View style={styles.filterSortRow}>
//           <TouchableOpacity
//             style={styles.createOutfitButton}
//             onPress={() => navigate('OutfitBuilder')}>
//             <Text style={styles.createOutfitText}>+ Create New Outfit</Text>
//           </TouchableOpacity>

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

//         {/* {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={{marginBottom: 32}}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 paddingHorizontal: 0,
//                 marginBottom: 6,
//               }}>
//               <Text style={[styles.sectionTitle, {fontSize: 24}]}>
//                 {mainCategory}
//               </Text>
//             </View>

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
//                       <Image
//                         source={{uri: item.image_url}}
//                         style={styles.image}
//                       />

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

//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: 'Red Tee',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/red-shirt.png',
//                               },
//                               bottom: {
//                                 name: 'Black Jeans',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/black-jeans.png',
//                               },
//                               shoes: {
//                                 name: 'Sneakers',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/sneakers.png',
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',

//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
//                     </Pressable>
//                   ))}
//                 </View>
//               </View>
//             ))}
//           </View>
//         ) */}

//         {/* )} */}
//       </ScrollView>
//       <View style={styles.grid}>
//         {wardrobe.map(item => (
//           <Pressable
//             key={item.id}
//             style={styles.card}
//             onLongPress={() => {
//               setSelectedItemToEdit(item);
//               setShowEditModal(true);
//             }}
//             onPress={() => navigate('ItemDetail', {itemId: item.id, item})}>
//             <Image
//               source={{uri: item.image_url}}
//               style={styles.image}
//               resizeMode="cover"
//             />

//             <TouchableOpacity
//               onPress={() =>
//                 favoriteMutation.mutate({id: item.id, favorite: !item.favorite})
//               }
//               style={{
//                 position: 'absolute',
//                 top: 8,
//                 right: 8,
//                 zIndex: 10,
//                 padding: 4,
//               }}>
//               <MaterialIcons
//                 name={item.favorite ? 'star' : 'star-border'}
//                 size={22}
//                 color={item.favorite ? theme.colors.primary : '#999'}
//               />
//             </TouchableOpacity>

//             <View style={styles.labelContainer}>
//               <Text style={styles.label}>{item.name}</Text>
//               <Text style={[styles.label, {fontSize: 12, color: '#888'}]}>
//                 {item.subcategory || ''}
//               </Text>
//             </View>
//           </Pressable>
//         ))}
//       </View>

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
//                               // handleDeleteItem(selectedItemToEdit.id);
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
//                     onPress={async () => {
//                       if (selectedItemToEdit) {
//                         const inferred = getInferredCategory(
//                           selectedItemToEdit.name,
//                         );
//                         await fetch(`${BASE_URL}/${selectedItemToEdit.id}`, {
//                           method: 'PATCH',
//                           headers: {'Content-Type': 'application/json'},
//                           body: JSON.stringify({
//                             name: selectedItemToEdit.name,
//                             color: selectedItemToEdit.color,
//                           }),
//                         });
//                         queryClient.invalidateQueries({
//                           queryKey: ['wardrobe', userId],
//                         });
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

/////////////

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
// import EditItemModal from '../components/EditItemModal/EditItemModal';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {Alert} from 'react-native';

// const categoryIcons: Partial<Record<MainCategory, string>> = {
//   Tops: 'checkroom',
//   Bottoms: 'drag-handle',
//   Outerwear: 'ac-unit',
//   Shoes: 'hiking',
//   Accessories: 'watch',
//   Undergarments: 'layers',
//   Activewear: 'fitness-center',
//   Formalwear: 'work',
//   Loungewear: 'weekend',
//   Sleepwear: 'hotel',
//   Swimwear: 'pool',
//   Maternity: 'pregnant-woman',
//   Unisex: 'wc',
//   Costumes: 'theater-comedy',
//   'Traditional Wear': 'festival',
// };

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
//       fontSize: 13,
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
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: '#405de6',
//     },
//     tryOnButtonText: {
//       color: 'white',
//       fontSize: 14,
//       fontWeight: '500',
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
//         <Text style={styles.header}>Wardrobe</Text>

//         <View style={styles.filterSortRow}>
//           <TouchableOpacity
//             style={styles.createOutfitButton}
//             onPress={() => navigate('OutfitBuilder')}>
//             <Text style={styles.createOutfitText}>+ Create New Outfit</Text>
//           </TouchableOpacity>

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
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 paddingHorizontal: 0,
//                 marginBottom: 6,
//               }}>
//               <Text style={[styles.sectionTitle, {fontSize: 24}]}>
//                 {mainCategory}
//               </Text>
//             </View>

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

//                       {/* ✅ ADD THIS BUTTON */}
//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: 'Red Tee',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/red-shirt.png',
//                               },
//                               bottom: {
//                                 name: 'Black Jeans',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/black-jeans.png',
//                               },
//                               shoes: {
//                                 name: 'Sneakers',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/sneakers.png',
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           // borderColor: 'white',
//                           // borderWidth: 1,
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
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
//                         const inferred = getInferredCategory(
//                           selectedItemToEdit.name,
//                         );
//                         const updated = wardrobe.map(item =>
//                           item.id === selectedItemToEdit.id
//                             ? {
//                                 ...selectedItemToEdit,
//                                 inferredCategory: inferred,
//                               }
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

/////////////

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
// import EditItemModal from '../components/EditItemModal/EditItemModal';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {Alert} from 'react-native';

// const categoryIcons: Partial<Record<MainCategory, string>> = {
//   Tops: 'checkroom',
//   Bottoms: 'drag-handle',
//   Outerwear: 'ac-unit',
//   Shoes: 'hiking',
//   Accessories: 'watch',
//   Undergarments: 'layers',
//   Activewear: 'fitness-center',
//   Formalwear: 'work',
//   Loungewear: 'weekend',
//   Sleepwear: 'hotel',
//   Swimwear: 'pool',
//   Maternity: 'pregnant-woman',
//   Unisex: 'wc',
//   Costumes: 'theater-comedy',
//   'Traditional Wear': 'festival',
// };

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
//       fontSize: 13,
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
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: '#405de6',
//     },
//     tryOnButtonText: {
//       color: 'white',
//       fontSize: 14,
//       fontWeight: '500',
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
//         <Text style={styles.header}>Wardrobe</Text>

//         <View style={styles.filterSortRow}>
//           <TouchableOpacity
//             style={styles.createOutfitButton}
//             onPress={() => navigate('OutfitBuilder')}>
//             <Text style={styles.createOutfitText}>+ Create New Outfit</Text>
//           </TouchableOpacity>

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
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 paddingHorizontal: 0,
//                 marginBottom: 6,
//               }}>
//               <Text style={[styles.sectionTitle, {fontSize: 24}]}>
//                 {mainCategory}
//               </Text>
//             </View>

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

//                       {/* ✅ ADD THIS BUTTON */}
//                       <TouchableOpacity
//                         onPress={() =>
//                           navigate('TryOnOverlay', {
//                             outfit: {
//                               top: {
//                                 name: 'Red Tee',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/red-shirt.png',
//                               },
//                               bottom: {
//                                 name: 'Black Jeans',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/black-jeans.png',
//                               },
//                               shoes: {
//                                 name: 'Sneakers',
//                                 imageUri:
//                                   'https://yourdomain.com/mock/sneakers.png',
//                               },
//                             },
//                             userPhotoUri: Image.resolveAssetSource(
//                               require('../assets/images/full-body-temp1.png'),
//                             ).uri,
//                           })
//                         }
//                         style={{
//                           position: 'absolute',
//                           top: 10,
//                           left: 8,
//                           backgroundColor: 'black',
//                           // borderColor: 'white',
//                           // borderWidth: 1,
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 8,
//                         }}>
//                         <Text style={styles.tryOnButtonText}>Try On</Text>
//                       </TouchableOpacity>
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
//                         const inferred = getInferredCategory(
//                           selectedItemToEdit.name,
//                         );
//                         const updated = wardrobe.map(item =>
//                           item.id === selectedItemToEdit.id
//                             ? {
//                                 ...selectedItemToEdit,
//                                 inferredCategory: inferred,
//                               }
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
