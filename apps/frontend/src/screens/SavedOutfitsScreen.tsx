import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';

type SavedOutfit = {
  name: string;
  items: WardrobeItem[];
  favorited: boolean;
};

type Props = {
  savedOutfits: SavedOutfit[];
  onDelete: (name: string) => void;
  onToggleFavorite: (name: string) => void;
};

export default function SavedOutfitsScreen({
  savedOutfits,
  onDelete,
  onToggleFavorite,
}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      padding: 12,
      paddingBottom: 40,
    },
    card: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    name: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    image: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 6,
      marginBottom: 6,
    },
  });

  const confirmDelete = (name: string) => {
    Alert.alert('Delete Outfit', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => onDelete(name)},
    ]);
  };

  return (
    <ScrollView
      style={{backgroundColor: theme.colors.background}}
      contentContainerStyle={styles.container}>
      {savedOutfits.map(item => (
        <View
          key={item.name}
          style={[styles.card, {backgroundColor: theme.colors.surface}]}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => onToggleFavorite(item.name)}>
                <Text style={{fontSize: 18}}>
                  {item.favorited ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item.name)}>
                <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.imageRow}>
            {item.items.map(i => (
              <Image key={i.id} source={{uri: i.image}} style={styles.image} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

///////////

// import React from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type SavedOutfit = {
//   name: string;
//   items: WardrobeItem[];
//   favorited: boolean;
// };

// type Props = {
//   savedOutfits: SavedOutfit[];
//   onDelete: (name: string) => void;
//   onToggleFavorite: (name: string) => void;
// };

// export default function SavedOutfitsScreen({
//   savedOutfits,
//   onDelete,
//   onToggleFavorite,
// }: Props) {
//   const {theme} = useAppTheme();

//   const confirmDelete = (name: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {text: 'Delete', style: 'destructive', onPress: () => onDelete(name)},
//     ]);
//   };

//   const renderOutfit = ({item}: {item: SavedOutfit}) => (
//     <View style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//       <View style={styles.headerRow}>
//         <Text style={styles.name}>{item.name}</Text>
//         <View style={styles.actions}>
//           <TouchableOpacity onPress={() => onToggleFavorite(item.name)}>
//             <Text style={{fontSize: 18}}>{item.favorited ? '❤️' : '🤍'}</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => confirmDelete(item.name)}>
//             <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//       <View style={styles.imageRow}>
//         {item.items.map(i => (
//           <Image key={i.id} source={{uri: i.image}} style={styles.image} />
//         ))}
//       </View>
//     </View>
//   );

//   return (
//     <FlatList
//       data={savedOutfits}
//       keyExtractor={item => item.name}
//       renderItem={renderOutfit}
//       contentContainerStyle={[
//         styles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//     />
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 12,
//   },
//   card: {
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 16,
//     elevation: 2,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   actions: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   imageRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   image: {
//     width: 60,
//     height: 60,
//     borderRadius: 8,
//     marginRight: 6,
//     marginBottom: 6,
//   },
// });
