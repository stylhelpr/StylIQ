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
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

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

// const ITEM_MARGIN = 19;
// const MIN_ITEM_WIDTH = 160;

const ITEM_MARGIN = 20.8;
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
  const globalStyles = useGlobalStyles();
  const queryClient = useQueryClient();
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );

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
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
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
      queryClient.invalidateQueries({queryKey: ['wardrobe', userId]});
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
    input: {
      borderWidth: 1,
      borderRadius: tokens.borderRadius.md,
      padding: 10,
      marginBottom: 12,
      fontSize: 16,
    },
    button: {
      paddingVertical: 12,
      borderRadius: tokens.borderRadius.sm,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 24,
    },
    iconButton: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: tokens.borderRadius.sm,
      backgroundColor: theme.colors.button1,
      elevation: 2,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    gridCard: {
      width: imageSize,
      // height: imageSize + 60,
      marginBottom: ITEM_MARGIN * 0.6,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    gridImage: {
      width: '100%',
      height: imageSize,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    gridTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    gridSource: {
      fontSize: 12,
      color: '#777',
    },
    image: {
      width: '100%',
      height: imageSize,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
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
      padding: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      width: '90%',
      maxWidth: 720,
      alignSelf: 'center',
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
      borderRadius: tokens.borderRadius.md,
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

  const favoriteMutation = useMutation({
    mutationFn: async ({id, favorite}: {id: string; favorite: boolean}) => {
      await fetch(`${API_BASE_URL}/wardrobe/favorite/${id}`, {
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
    <View style={[globalStyles.screen, globalStyles.container]}>
      <Text style={globalStyles.header}>Wardrobe</Text>

      <View style={globalStyles.section}>
        <View style={[styles.buttonRow]}>
          <View style={{marginRight: 8}}>
            <AppleTouchFeedback
              style={[
                globalStyles.buttonPrimary,
                {
                  paddingHorizontal: 28,

                  minWidth: 210,
                  alignSelf: 'center',
                  flexShrink: 0,
                },
              ]}
              hapticStyle="impactHeavy"
              onPress={() => navigate('OutfitBuilder')}>
              <Text
                style={globalStyles.buttonPrimaryText}
                numberOfLines={1}
                ellipsizeMode="clip"
                adjustsFontSizeToFit={false}>
                + Create New Outfit
              </Text>
            </AppleTouchFeedback>
          </View>

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
          <View key={mainCategory} style={globalStyles.section}>
            <Text style={[globalStyles.sectionTitle2]}>{mainCategory}</Text>

            {Object.entries(subMap).map(([subCategory, items]) => (
              <View key={subCategory}>
                <Text style={[globalStyles.title2]}>{subCategory}</Text>

                <View style={[styles.gridContainer]}>
                  {items.map(item => (
                    <AppleTouchFeedback
                      key={item.id}
                      style={styles.gridCard}
                      hapticStyle="impactLight"
                      onPress={() =>
                        navigate('ItemDetail', {itemId: item.id, item})
                      }
                      onLongPress={() => {
                        setEditedName(item.name ?? '');
                        setEditedColor(item.color ?? '');
                      }}>
                      <Image
                        source={{uri: item.image_url}}
                        style={styles.gridImage}
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

                      <View style={globalStyles.labelContainer}>
                        <Text
                          style={[globalStyles.cardLabel]}
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {item.name}
                        </Text>
                        <Text
                          style={[globalStyles.cardSubLabel]}
                          numberOfLines={1}>
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
              <View style={[styles.modalContent]}>
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
              <View style={[styles.modalContent]}>
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
                <View style={styles.modalContent}>
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
                        await fetch(
                          `${API_BASE_URL}/wardrobe/${selectedItemToEdit.id}`,
                          {
                            method: 'PATCH',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                              name: editedName || selectedItemToEdit.name,
                              color: editedColor || selectedItemToEdit.color,
                            }),
                          },
                        );
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

/////////////////////

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
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

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

// // const ITEM_MARGIN = 19;
// // const MIN_ITEM_WIDTH = 160;

// const ITEM_MARGIN = 20.8;
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
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );

//   const LOCAL_IP = '192.168.0.81';
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
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       // height: imageSize + 60,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       width: '100%',
//       height: imageSize,
//       borderTopLeftRadius: 10,
//       borderTopRightRadius: 10,
//     },
//     gridTitle: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     gridSource: {
//       fontSize: 12,
//       color: '#777',
//     },
//     image: {
//       width: '100%',
//       height: imageSize,
//       borderTopLeftRadius: 10,
//       borderTopRightRadius: 10,
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
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       width: '90%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     createOutfitButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       paddingHorizontal: 16,
//       borderRadius: tokens.borderRadius.md,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: theme.colors.button1,
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
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   paddingHorizontal: 28,

//                   minWidth: 210,
//                   alignSelf: 'center',
//                   flexShrink: 0,
//                 },
//               ]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text
//                 style={globalStyles.buttonPrimaryText}
//                 numberOfLines={1}
//                 ellipsizeMode="clip"
//                 adjustsFontSizeToFit={false}>
//                 + Create New Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons
//               name="filter-list"
//               size={24}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <ScrollView>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle2]}>{mainCategory}</Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title2]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map(item => (
//                     <AppleTouchFeedback
//                       key={item.id}
//                       style={styles.gridCard}
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
//                         style={styles.gridImage}
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

//                       <View style={globalStyles.labelContainer}>
//                         <Text
//                           style={[globalStyles.cardLabel]}
//                           numberOfLines={1}
//                           ellipsizeMode="tail">
//                           {item.name}
//                         </Text>
//                         <Text
//                           style={[globalStyles.cardSubLabel]}
//                           numberOfLines={1}>
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
//               <View style={[styles.modalContent]}>
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
//               <View style={[styles.modalContent]}>
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
//                 <View style={styles.modalContent}>
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

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
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
//                   </AppleTouchFeedback>

//                   {/* ✅ Properly separated Delete Button */}
//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
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
//                   </AppleTouchFeedback>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }

/////////////////

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
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

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

// // const ITEM_MARGIN = 19;
// // const MIN_ITEM_WIDTH = 160;

// const ITEM_MARGIN = 20.8;
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
//   const globalStyles = useGlobalStyles();
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
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 12,
//       fontSize: 16,
//     },
//     button: {
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.md,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 24,
//     },
//     iconButton: {
//       paddingHorizontal: 12,
//       paddingVertical: 7,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.button1,
//       elevation: 2,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.6,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       width: '100%',
//       height: imageSize,
//       borderTopLeftRadius: 10,
//       borderTopRightRadius: 10,
//     },
//     gridTitle: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     gridSource: {
//       fontSize: 12,
//       color: '#777',
//     },
//     image: {
//       width: '100%',
//       height: imageSize,
//       borderTopLeftRadius: 10,
//       borderTopRightRadius: 10,
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
//       backgroundColor: theme.colors.button1,
//       padding: 16,
//       borderRadius: 32,
//       elevation: 6,
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: tokens.borderRadius.md,
//       margin: 40,
//     },
//     modalOption: {
//       paddingVertical: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     createOutfitButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       paddingHorizontal: 16,
//       borderRadius: tokens.borderRadius.md,
//       alignSelf: 'center',
//       marginRight: 8,
//     },
//     createOutfitText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     tryOnButton: {
//       backgroundColor: theme.colors.button1,
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
//     <View style={[globalStyles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Wardrobe</Text>

//       <View style={globalStyles.section}>
//         <View style={[styles.buttonRow]}>
//           <View style={{marginRight: 8}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {paddingHorizontal: 18}]}
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('OutfitBuilder')}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 + Create New Outfit
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           <AppleTouchFeedback
//             style={{...styles.iconButton, marginRight: 8}}
//             hapticStyle="impactLight"
//             onPress={() => setShowFilter(true)}>
//             <MaterialIcons
//               name="filter-list"
//               size={24}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={{...styles.iconButton}}
//             hapticStyle="impactLight"
//             onPress={() => setShowSort(true)}>
//             <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <ScrollView>
//         {Object.entries(categorizedItems).map(([mainCategory, subMap]) => (
//           <View key={mainCategory} style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle2]}>{mainCategory}</Text>

//             {Object.entries(subMap).map(([subCategory, items]) => (
//               <View key={subCategory}>
//                 <Text style={[globalStyles.title2]}>{subCategory}</Text>

//                 <View style={[styles.gridContainer]}>
//                   {items.map(item => (
//                     <AppleTouchFeedback
//                       key={item.id}
//                       style={styles.gridCard}
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
//                         style={styles.gridImage}
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

//                       <View style={globalStyles.labelContainer}>
//                         <Text style={[globalStyles.cardLabel]}>
//                           {item.name}
//                         </Text>
//                         <Text style={[globalStyles.cardSubLabel]}>
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

//                   <AppleTouchFeedback
//                     hapticStyle="impactMedium"
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
//                   </AppleTouchFeedback>

//                   {/* ✅ Properly separated Delete Button */}
//                   <AppleTouchFeedback
//                     hapticStyle="impactHeavy"
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
//                   </AppleTouchFeedback>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       )}
//     </View>
//   );
// }
