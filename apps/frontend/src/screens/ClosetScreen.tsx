import React from 'react';
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
import {mockClothingItems as items} from '../components/mockClothingItems/mockClothingItems';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width} = Dimensions.get('window');
const ITEM_MARGIN = 12;
const numColumns = 2;
const imageSize = (width - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: {
    id: string;
    image: string;
    name: string;
    category?: string;
    color?: string;
    tags?: string[];
  }[];
};
export default function ClosetScreen({navigate, wardrobe}: Props) {
  const {theme} = useAppTheme();

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
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    image: {
      width: '100%',
      height: imageSize,
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

  return (
    <View style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Closet</Text>
        <View style={styles.grid}>
          {(wardrobe.length > 0 ? wardrobe : items).map(item => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => navigate('ItemDetail', {itemId: item.id, item})}>
              <Image source={{uri: item.image}} style={styles.image} />
              <View style={styles.labelContainer}>
                <Text style={styles.label}>{item.name}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigate('AddItem')}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

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
