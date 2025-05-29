import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {mockClothingItems as items} from '../components/mockClothingItems/mockClothingItems';

const {width} = Dimensions.get('window');
const ITEM_MARGIN = 12;
const numColumns = 2;
const imageSize = (width - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

type Props = {
  navigate: (screen: string, params?: any) => void;
};

export default function ClosetScreen({navigate}: Props) {
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
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Closet</Text>
      <View style={styles.grid}>
        {items.map(item => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => navigate('ItemDetail', {itemId: item.id})}>
            <Image source={{uri: item.image}} style={styles.image} />
            <View style={styles.labelContainer}>
              <Text style={styles.label}>{item.name}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

////////////

// // screens/ClosetScreen.tsx
// import React from 'react';
// import {View, Text, StyleSheet, Image, ScrollView} from 'react-native';
// import type {NavigateFunction} from '../navigation/types';
// import {useAppTheme} from '../context/ThemeContext';

// type Props = {
//   navigate: NavigateFunction;
// };

// const items = [
//   {
//     id: '1',
//     name: 'White Linen Shirt',
//     image: 'https://picsum.photos/id/237/200/200',
//   },
//   {
//     id: '2',
//     name: 'Tailored Navy Blazer',
//     image: 'https://picsum.photos/id/238/200/200',
//   },
//   {
//     id: '3',
//     name: 'Brown Suede Loafers',
//     image: 'https://picsum.photos/id/239/200/200',
//   },
//   {
//     id: '4',
//     name: 'White Linen Shirt',
//     image: 'https://picsum.photos/id/237/200/200',
//   },
//   {
//     id: '5',
//     name: 'Tailored Navy Blazer',
//     image: 'https://picsum.photos/id/238/200/200',
//   },
//   {
//     id: '6',
//     name: 'Brown Suede Loafers',
//     image: 'https://picsum.photos/id/239/200/200',
//   },
//   {
//     id: '7',
//     name: 'White Linen Shirt',
//     image: 'https://picsum.photos/id/237/200/200',
//   },
//   {
//     id: '8',
//     name: 'Tailored Navy Blazer',
//     image: 'https://picsum.photos/id/238/200/200',
//   },
//   {
//     id: '9',
//     name: 'Brown Suede Loafers',
//     image: 'https://picsum.photos/id/239/200/200',
//   },
// ];

// export default function ClosetScreen({navigate}: Props) {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       padding: 20,
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: 'bold',
//       marginBottom: 10,
//       color: theme.colors.primary,
//     },
//     scrollContainer: {
//       paddingBottom: 20,
//     },
//     item: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 15,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       marginRight: 10,
//       borderRadius: 8,
//     },
//     text: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Closet</Text>
//       <ScrollView contentContainerStyle={styles.scrollContainer}>
//         {items.map(item => (
//           <View key={item.id} style={styles.item}>
//             <Image source={{uri: item.image}} style={styles.image} />
//             <Text style={styles.text}>{item.name}</Text>
//           </View>
//         ))}
//       </ScrollView>
//     </View>
//   );
// }

////////////

// import React from 'react';
// import {View, Text, StyleSheet, Image, Button, ScrollView} from 'react-native';
// import type {NavigateFunction} from '../navigation/types';

// type Props = {
//   navigate: NavigateFunction;
// };

// const items = [
//   {
//     id: '1',
//     name: 'White Linen Shirt',
//     image: 'https://picsum.photos/id/237/200/200',
//   },
//   {
//     id: '2',
//     name: 'Tailored Navy Blazer',
//     image: 'https://picsum.photos/id/238/200/200',
//   },
//   {
//     id: '3',
//     name: 'Brown Suede Loafers',
//     image: 'https://picsum.photos/id/239/200/200',
//   },
//   {
//     id: '4',
//     name: 'White Linen Shirt',
//     image: 'https://picsum.photos/id/237/200/200',
//   },
//   {
//     id: '5',
//     name: 'Tailored Navy Blazer',
//     image: 'https://picsum.photos/id/238/200/200',
//   },
//   {
//     id: '6',
//     name: 'Brown Suede Loafers',
//     image: 'https://picsum.photos/id/239/200/200',
//   },
//   {
//     id: '7',
//     name: 'White Linen Shirt',
//     image: 'https://picsum.photos/id/237/200/200',
//   },
//   {
//     id: '8',
//     name: 'Tailored Navy Blazer',
//     image: 'https://picsum.photos/id/238/200/200',
//   },
//   {
//     id: '9',
//     name: 'Brown Suede Loafers',
//     image: 'https://picsum.photos/id/239/200/200',
//   },
// ];

// export default function ClosetScreen({navigate}: Props) {
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>👕 Your Closet</Text>

//       <ScrollView contentContainerStyle={styles.scrollContainer}>
//         {items.map(item => (
//           <View key={item.id} style={styles.item}>
//             <Image source={{uri: item.image}} style={styles.image} />
//             <Text style={styles.text}>{item.name}</Text>
//           </View>
//         ))}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   scrollContainer: {
//     paddingBottom: 20,
//   },
//   item: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   image: {
//     width: 60,
//     height: 60,
//     marginRight: 10,
//     borderRadius: 8,
//   },
//   text: {
//     fontSize: 16,
//   },
// });
