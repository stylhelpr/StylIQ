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
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const ITEM_MARGIN = 12;
const MIN_ITEM_WIDTH = 160; // Minimum width per item, tweak this as needed

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: {
    id: string;
    image: string;
    name: string;
    category?: string;
    color?: string;
    tags?: string[];
    favorite?: boolean;
  }[];
};

export default function ClosetScreen({navigate, wardrobe}: Props) {
  const {theme} = useAppTheme();

  // Track screen width for responsiveness
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );

  // Update width on dimension changes (rotate device etc.)
  useEffect(() => {
    const onChange = ({window}: {window: {width: number}}) => {
      setScreenWidth(window.width);
    };
    Dimensions.addEventListener('change', onChange);

    return () => Dimensions.removeEventListener('change', onChange);
  }, []);

  // Calculate number of columns dynamically
  const numColumns =
    Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;

  // Calculate image size to fit numColumns with margins
  const imageSize =
    (screenWidth - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: ITEM_MARGIN,
      paddingTop: 24,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      marginBottom: 16,
      color: theme.colors.primary,
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
      // shadowColor: '#000',
      // shadowOffset: {width: 8, height: 7},
      // shadowOpacity: 0.5,
      // shadowRadius: 7,
      // elevation: 10,
      shadowColor: '#000', // black shadow color
      shadowOffset: {width: 10, height: 7}, // horizontal & vertical offset
      shadowOpacity: 0.7, // opacity of shadow
      shadowRadius: 7, // blur radius
      elevation: 10,
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
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 32,
      elevation: 6,
    },
  });

  const toggleFavorite = (id: string) => {
    const updated = wardrobe.map(item =>
      item.id === id ? {...item, favorite: !item.favorite} : item,
    );
    // update wardrobe in parent
    navigate('Closet', {updatedWardrobe: updated});
  };

  return (
    <View style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Closet</Text>

        {/* Wardrobe Grid */}
        <View style={styles.grid}>
          {wardrobe.map(item => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => navigate('ItemDetail', {itemId: item.id, item})}>
              <Image source={{uri: item.image}} style={styles.image} />

              {/* Favorite Toggle Button */}
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
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Add Item FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

/////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Pressable,
//   Dimensions,
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems as items} from '../components/mockClothingItems/mockClothingItems';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const {width} = Dimensions.get('window');
// const ITEM_MARGIN = 12;
// const numColumns = 2;
// const imageSize = (width - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

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
//   const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

//   const visibleItems = showFavoritesOnly
//     ? wardrobe.filter(i => i.favorite)
//     : wardrobe.length > 0
//     ? wardrobe
//     : items.map(i => ({...i, favorite: false}));

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingHorizontal: ITEM_MARGIN,
//       paddingTop: 24,
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: 28,
//       fontWeight: '600',
//       marginBottom: 16,
//       color: theme.colors.primary,
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
//       // overflow: 'hidden',
//       shadowColor: '#000', // black shadow color
//       shadowOffset: {width: 8, height: 3}, // horizontal & vertical offset
//       shadowOpacity: 0.5, // opacity of shadow
//       shadowRadius: 7, // blur radius
//       elevation: 10, // for Android shadow
//     },
//     image: {
//       width: '100%',
//       height: imageSize,
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
//   });

//   const toggleFavorite = (id: string) => {
//     const updated = wardrobe.map(item =>
//       item.id === id ? {...item, favorite: !item.favorite} : item,
//     );
//     // update wardrobe in parent
//     navigate('Closet', {updatedWardrobe: updated});
//   };

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.title}>Closet</Text>

//         {/* Toggle between All and Favorites */}
//         <View style={{flexDirection: 'row', marginBottom: 12, gap: 12}}>
//           <TouchableOpacity onPress={() => setShowFavoritesOnly(false)}>
//             <Text
//               style={{
//                 color: showFavoritesOnly ? '#999' : theme.colors.primary,
//                 fontWeight: 'bold',
//               }}>
//               All
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => setShowFavoritesOnly(true)}>
//             <Text
//               style={{
//                 color: showFavoritesOnly ? theme.colors.primary : '#999',
//                 fontWeight: 'bold',
//               }}>
//               Favorites
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Wardrobe Grid */}
//         <View style={styles.grid}>
//           {visibleItems.map(item => (
//             <Pressable
//               key={item.id}
//               style={styles.card}
//               onPress={() => navigate('ItemDetail', {itemId: item.id, item})}>
//               <Image source={{uri: item.image}} style={styles.image} />

//               {/* Favorite Toggle Button */}
//               <TouchableOpacity
//                 onPress={() => toggleFavorite(item.id)}
//                 style={{
//                   position: 'absolute',
//                   top: 8,
//                   right: 8,
//                   zIndex: 10,
//                   padding: 4,
//                 }}>
//                 <MaterialIcons
//                   name={item.favorite ? 'star' : 'star-border'}
//                   size={22}
//                   color={item.favorite ? theme.colors.primary : '#999'}
//                 />
//               </TouchableOpacity>

//               <View style={styles.labelContainer}>
//                 <Text style={styles.label}>{item.name}</Text>
//               </View>
//             </Pressable>
//           ))}
//         </View>
//       </ScrollView>

//       {/* Add Item FAB */}
//       <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
//         <MaterialIcons name="add" size={28} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

//////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Pressable,
//   Dimensions,
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems as items} from '../components/mockClothingItems/mockClothingItems';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const {width} = Dimensions.get('window');
// const ITEM_MARGIN = 12;
// const numColumns = 2;
// const imageSize = (width - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: {
//     id: string;
//     image: string;
//     name: string;
//     category?: string;
//     color?: string;
//     tags?: string[];
//   }[];
// };
// export default function ClosetScreen({navigate, wardrobe}: Props) {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingHorizontal: ITEM_MARGIN,
//       paddingTop: 24,
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: 28,
//       fontWeight: '600',
//       marginBottom: 16,
//       color: theme.colors.primary,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     card: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 2,
//       backgroundColor: theme.colors.card,
//       borderRadius: 16,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 2},
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 3,
//     },
//     image: {
//       width: '100%',
//       height: imageSize,
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
//   });

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView style={styles.container}>
//         <Text style={styles.title}>Closet</Text>
//         <View style={styles.grid}>
//           {(wardrobe.length > 0 ? wardrobe : items).map(item => (
//             <Pressable
//               key={item.id}
//               style={styles.card}
//               onPress={() => navigate('ItemDetail', {itemId: item.id})}>
//               <Image source={{uri: item.image}} style={styles.image} />
//               <View style={styles.labelContainer}>
//                 <Text style={styles.label}>{item.name}</Text>
//               </View>
//             </Pressable>
//           ))}
//         </View>
//       </ScrollView>

//       <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
//         <MaterialIcons name="add" size={28} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }
