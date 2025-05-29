import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import {format} from 'date-fns';
import {useAppTheme} from '../context/ThemeContext';
import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';

type Props = {
  wardrobe: WardrobeItem[];
};

const {width} = Dimensions.get('window');
const imageSize = width * 0.9;

export default function OutfitScreen({wardrobe}: Props) {
  const {theme} = useAppTheme();
  const outfit = useOutfitSuggestion(wardrobe);
  const today = format(new Date(), 'MMMM do, yyyy');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 24,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    date: {
      fontSize: 16,
      color: theme.colors.foreground,
      marginBottom: 24,
    },
    section: {
      marginBottom: 32,
      alignItems: 'center',
    },
    label: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    image: {
      width: imageSize,
      height: imageSize,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    placeholder: {
      width: imageSize,
      height: imageSize,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      color: theme.colors.foreground,
      fontSize: 16,
    },
  });

  const renderItem = (label: string, item?: WardrobeItem) => (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {item?.image ? (
        <Image source={{uri: item.image}} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No item selected</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Outfit Suggestion</Text>
      <Text style={styles.date}>{today}</Text>
      {renderItem('Top', outfit.top)}
      {renderItem('Bottom', outfit.bottom)}
      {renderItem('Shoes', outfit.shoes)}
    </ScrollView>
  );
}

//////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {format} from 'date-fns';

// type Props = {
//   wardrobe: WardrobeItem[];
// };

// const {width} = Dimensions.get('window');
// const imageSize = width * 0.9;

// export default function OutfitScreen({wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const [refreshKey, setRefreshKey] = useState(0);
//   const outfit = useOutfitSuggestion(wardrobe, refreshKey);

//   const handleRegenerate = () => {
//     setRefreshKey(prev => prev + 1);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingTop: 24,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.background,
//     },
//     titleRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 16,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     date: {
//       fontSize: 14,
//       color: theme.colors.subtleText,
//     },
//     regenerate: {
//       alignSelf: 'flex-end',
//       marginBottom: 24,
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//     },
//     regenerateText: {
//       color: theme.colors.foreground,
//     },
//     section: {
//       marginBottom: 32,
//       alignItems: 'center',
//     },
//     label: {
//       fontSize: 18,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     image: {
//       width: imageSize,
//       height: imageSize,
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     placeholder: {
//       width: imageSize,
//       height: imageSize,
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     placeholderText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//   });

//   const renderItem = (label: string, item?: WardrobeItem) => (
//     <View style={styles.section}>
//       <Text style={styles.label}>{label}</Text>
//       {item?.image ? (
//         <Image source={{uri: item.image}} style={styles.image} />
//       ) : (
//         <View style={styles.placeholder}>
//           <Text style={styles.placeholderText}>No item selected</Text>
//         </View>
//       )}
//     </View>
//   );

//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.titleRow}>
//         <Text style={styles.title}>Outfit Suggestion</Text>
//         <Text style={styles.date}>{format(new Date(), 'MMMM d, yyyy')}</Text>
//       </View>

//       <TouchableOpacity onPress={handleRegenerate} style={styles.regenerate}>
//         <Text style={styles.regenerateText}>Regenerate</Text>
//       </TouchableOpacity>

//       {renderItem('Top', outfit.top)}
//       {renderItem('Bottom', outfit.bottom)}
//       {renderItem('Shoes', outfit.shoes)}
//     </ScrollView>
//   );
// }

//////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   ScrollView,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   wardrobe: WardrobeItem[];
// };

// const {width} = Dimensions.get('window');
// const imageSize = width * 0.9;

// export default function OutfitScreen({wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const outfit = useOutfitSuggestion(wardrobe);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingTop: 24,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: theme.colors.primary,
//       marginBottom: 24,
//     },
//     section: {
//       marginBottom: 32,
//       alignItems: 'center',
//     },
//     label: {
//       fontSize: 18,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     image: {
//       width: imageSize,
//       height: imageSize,
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     placeholder: {
//       width: imageSize,
//       height: imageSize,
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     placeholderText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//   });

//   const renderItem = (label: string, item?: WardrobeItem) => (
//     <View style={styles.section}>
//       <Text style={styles.label}>{label}</Text>
//       {item?.image ? (
//         <Image source={{uri: item.image}} style={styles.image} />
//       ) : (
//         <View style={styles.placeholder}>
//           <Text style={styles.placeholderText}>No item selected</Text>
//         </View>
//       )}
//     </View>
//   );

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.title}>Outfit Suggestion</Text>
//       {renderItem('Top', outfit.top)}
//       {renderItem('Bottom', outfit.bottom)}
//       {renderItem('Shoes', outfit.shoes)}
//     </ScrollView>
//   );
// }
