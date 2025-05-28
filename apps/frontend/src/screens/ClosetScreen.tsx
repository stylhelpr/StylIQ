// screens/ClosetScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, Image, ScrollView} from 'react-native';
import type {NavigateFunction} from '../navigation/types';
import {useAppTheme} from '../context/ThemeContext';

type Props = {
  navigate: NavigateFunction;
};

const items = [
  {
    id: '1',
    name: 'White Linen Shirt',
    image: 'https://picsum.photos/id/237/200/200',
  },
  {
    id: '2',
    name: 'Tailored Navy Blazer',
    image: 'https://picsum.photos/id/238/200/200',
  },
  {
    id: '3',
    name: 'Brown Suede Loafers',
    image: 'https://picsum.photos/id/239/200/200',
  },
  {
    id: '4',
    name: 'White Linen Shirt',
    image: 'https://picsum.photos/id/237/200/200',
  },
  {
    id: '5',
    name: 'Tailored Navy Blazer',
    image: 'https://picsum.photos/id/238/200/200',
  },
  {
    id: '6',
    name: 'Brown Suede Loafers',
    image: 'https://picsum.photos/id/239/200/200',
  },
  {
    id: '7',
    name: 'White Linen Shirt',
    image: 'https://picsum.photos/id/237/200/200',
  },
  {
    id: '8',
    name: 'Tailored Navy Blazer',
    image: 'https://picsum.photos/id/238/200/200',
  },
  {
    id: '9',
    name: 'Brown Suede Loafers',
    image: 'https://picsum.photos/id/239/200/200',
  },
];

export default function ClosetScreen({navigate}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
      color: theme.colors.primary,
    },
    scrollContainer: {
      paddingBottom: 20,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    image: {
      width: 60,
      height: 60,
      marginRight: 10,
      borderRadius: 8,
    },
    text: {
      fontSize: 16,
      color: theme.colors.foreground,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Closet</Text>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {items.map(item => (
          <View key={item.id} style={styles.item}>
            <Image source={{uri: item.image}} style={styles.image} />
            <Text style={styles.text}>{item.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

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
