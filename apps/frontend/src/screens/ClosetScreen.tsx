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
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {getInferredCategory} from '../utils/categoryUtils';
import {MainCategory, Subcategory} from '../types/categoryTypes';

const ITEM_MARGIN = 3;
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

export default function ClosetScreen({navigate, wardrobe}: Props) {
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
    (screenWidth - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

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

  const toggleFavorite = (id: string) => {
    const updated = wardrobe.map(item =>
      item.id === id ? {...item, favorite: !item.favorite} : item,
    );
    navigate('Closet', {updatedWardrobe: updated});
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: ITEM_MARGIN,
      paddingTop: 16,
      backgroundColor: theme.colors.background,
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
    },
    card: {
      width: imageSize,
      marginBottom: ITEM_MARGIN * 2,
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
        <Text style={styles.title}>Closet</Text>

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
    </View>
  );
}

////////////////

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

// const ITEM_MARGIN = 5;
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
//     (screenWidth - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

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
//       paddingHorizontal: ITEM_MARGIN,
//       paddingTop: 16,
//       backgroundColor: theme.colors.background,
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
//       backgroundColor: theme.colors.surface,
//       elevation: 2,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     card: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 2,
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
//       backgroundColor: theme.colors.primary,
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
//         <Text style={styles.title}>Closet</Text>

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
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {getInferredCategory} from '../utils/categoryUtils';
// import {MainCategory} from '../types/categoryTypes';

// const ITEM_MARGIN = 5;
// const MIN_ITEM_WIDTH = 160;

// const categories: ('All' | MainCategory)[] = [
//   'All',
//   'Tops',
//   'Bottoms',
//   'Shoes',
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
//     (screenWidth - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

//   const filtered = wardrobe
//     .map(item => ({
//       ...item,
//       inferredCategory: getInferredCategory(item.name),
//     }))
//     .filter(item => {
//       if (selectedCategory === 'All') return true;
//       return item.inferredCategory === selectedCategory;
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
//       paddingHorizontal: ITEM_MARGIN,
//       paddingTop: 16,
//       backgroundColor: theme.colors.background,
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
//       backgroundColor: theme.colors.surface,
//       elevation: 2,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     card: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 2,
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
//       backgroundColor: theme.colors.primary,
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

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.title}>Closet</Text>

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

//         {(['Tops', 'Bottoms', 'Shoes'] as MainCategory[]).map(section => {
//           const sectionItems = filtered.filter(
//             item => item.inferredCategory === section,
//           );

//           if (sectionItems.length === 0) {
//             console.log(`📭 No items in ${section}`);
//             return null;
//           }

//           return (
//             <View key={section} style={{marginBottom: 24}}>
//               <Text style={styles.sectionTitle}>{section}</Text>
//               <View style={styles.grid}>
//                 {sectionItems.map(item => (
//                   <Pressable
//                     key={item.id}
//                     style={styles.card}
//                     onPress={() =>
//                       navigate('ItemDetail', {itemId: item.id, item})
//                     }>
//                     <Image source={{uri: item.image}} style={styles.image} />
//                     <TouchableOpacity
//                       onPress={() => toggleFavorite(item.id)}
//                       style={{
//                         position: 'absolute',
//                         top: 8,
//                         right: 8,
//                         zIndex: 10,
//                         padding: 4,
//                       }}>
//                       <MaterialIcons
//                         name={item.favorite ? 'star' : 'star-border'}
//                         size={22}
//                         color={item.favorite ? theme.colors.primary : '#999'}
//                       />
//                     </TouchableOpacity>
//                     <View style={styles.labelContainer}>
//                       <Text style={styles.label}>{item.name}</Text>
//                     </View>
//                   </Pressable>
//                 ))}
//               </View>
//             </View>
//           );
//         })}
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

////////////

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
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const ITEM_MARGIN = 5;
// const MIN_ITEM_WIDTH = 160;

// const categories = ['All', 'Tops', 'Bottoms', 'Shoes'];
// const sortOptions = [
//   {label: 'Name A-Z', value: 'az'},
//   {label: 'Name Z-A', value: 'za'},
//   {label: 'Favorites First', value: 'favorites'},
// ];

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: {
//     id: string;
//     image: string;
//     name: string;
//     category?: string;
//     color?: string;
//     tags?: string[];
//     favorite?: boolean;
//   }[];
// };

// export default function ClosetScreen({navigate, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const [screenWidth, setScreenWidth] = useState(
//     Dimensions.get('window').width,
//   );
//   const [selectedCategory, setSelectedCategory] = useState('All');
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
//     (screenWidth - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

//   const filtered = wardrobe
//     .filter(item => {
//       const name = item.name.toLowerCase();

//       const inferredCategory =
//         name.includes('shirt') ||
//         name.includes('sweater') ||
//         name.includes('jacket') ||
//         name.includes('blazer')
//           ? 'tops'
//           : name.includes('pants') ||
//             name.includes('jeans') ||
//             name.includes('chinos') ||
//             name.includes('trousers')
//           ? 'bottoms'
//           : name.includes('sneakers') ||
//             name.includes('loafers') ||
//             name.includes('boots') ||
//             name.includes('oxfords')
//           ? 'shoes'
//           : null;

//       if (selectedCategory === 'All') return true;
//       return inferredCategory === selectedCategory.toLowerCase();
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
//       paddingHorizontal: ITEM_MARGIN,
//       paddingTop: 16,
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: 28,
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
//       backgroundColor: theme.colors.surface,
//       elevation: 2,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     card: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 2,
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
//       backgroundColor: theme.colors.primary,
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

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.title}>Closet</Text>

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

//         {['Tops', 'Bottoms', 'Shoes'].map(section => {
//           const sectionItems = filtered.filter(item => {
//             const name = item.name.toLowerCase();

//             const inferredCategory =
//               name.includes('shirt') ||
//               name.includes('sweater') ||
//               name.includes('jacket') ||
//               name.includes('blazer')
//                 ? 'tops'
//                 : name.includes('pants') ||
//                   name.includes('jeans') ||
//                   name.includes('chinos') ||
//                   name.includes('trousers')
//                 ? 'bottoms'
//                 : name.includes('sneakers') ||
//                   name.includes('loafers') ||
//                   name.includes('boots') ||
//                   name.includes('oxfords')
//                 ? 'shoes'
//                 : null;

//             return inferredCategory === section.toLowerCase();
//           });

//           if (sectionItems.length === 0) {
//             console.log(`📭 No items in ${section}`);
//             return null;
//           }

//           return (
//             <View key={section} style={{marginBottom: 24}}>
//               <Text style={[styles.title, {fontSize: 22}]}>{section}</Text>
//               <View style={styles.grid}>
//                 {sectionItems.map(item => (
//                   <Pressable
//                     key={item.id}
//                     style={styles.card}
//                     onPress={() =>
//                       navigate('ItemDetail', {itemId: item.id, item})
//                     }>
//                     <Image source={{uri: item.image}} style={styles.image} />
//                     <TouchableOpacity
//                       onPress={() => toggleFavorite(item.id)}
//                       style={{
//                         position: 'absolute',
//                         top: 8,
//                         right: 8,
//                         zIndex: 10,
//                         padding: 4,
//                       }}>
//                       <MaterialIcons
//                         name={item.favorite ? 'star' : 'star-border'}
//                         size={22}
//                         color={item.favorite ? theme.colors.primary : '#999'}
//                       />
//                     </TouchableOpacity>
//                     <View style={styles.labelContainer}>
//                       <Text style={styles.label}>{item.name}</Text>
//                     </View>
//                   </Pressable>
//                 ))}
//               </View>
//             </View>
//           );
//         })}
//       </ScrollView>

//       <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
//         <MaterialIcons name="add" size={28} color="#fff" />
//       </TouchableOpacity>

//       {/* Filter Modal */}
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

//       {/* Sort Modal */}
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
