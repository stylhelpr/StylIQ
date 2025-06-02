import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import {mockClothingItems} from '../../components/mockClothingItems/mockClothingItems';

type Props = {
  route: any;
  navigation: any;
};

export default function ItemDetailScreen({route, navigation}: Props) {
  const {theme} = useAppTheme();
  const {itemId, item: routeItem} = route.params;
  const item = routeItem ?? mockClothingItems.find(i => i.id === itemId);

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (item) {
      setCategory(item.name.split(' ').slice(1).join(' '));
      setColor(item.name.split(' ')[0]);
      setTags('');
    }
  }, [item]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
      backgroundColor: theme.colors.background,
    },
    image: {
      width: '100%',
      height: 320,
      borderRadius: 16,
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.foreground,
      marginBottom: 4,
      marginTop: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      fontSize: 15,
      color: theme.colors.foreground,
      backgroundColor: theme.colors.surface,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 30,
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
    },
    cancelText: {
      color: theme.colors.foreground,
      fontWeight: 'bold',
      fontSize: 16,
    },
    saveButton: {
      backgroundColor: '#405de6',
    },
    saveText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
    buttonWithMarginRight: {
      marginRight: 12,
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {item?.image && <Image source={{uri: item.image}} style={styles.image} />}

      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <TextInput
        value={category}
        onChangeText={setCategory}
        style={styles.input}
        placeholder="e.g. Shirt, Pants, Shoes"
        placeholderTextColor={theme.colors.muted}
      />

      <Text style={styles.label}>Color</Text>
      <TextInput
        value={color}
        onChangeText={setColor}
        style={styles.input}
        placeholder="e.g. Navy, White, Tan"
        placeholderTextColor={theme.colors.muted}
      />

      <Text style={styles.label}>Tags</Text>
      <TextInput
        value={tags}
        onChangeText={setTags}
        style={styles.input}
        placeholder="Comma separated: casual, spring, linen"
        placeholderTextColor={theme.colors.muted}
      />

      <View style={styles.buttonRow}>
        <Pressable
          style={[
            styles.button,
            styles.cancelButton,
            styles.buttonWithMarginRight,
          ]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.saveButton]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

///////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TextInput,
//   ScrollView,
//   Pressable,
// } from 'react-native';
// import {useAppTheme} from '../../context/ThemeContext';

// // Mock data lookup
// import {mockClothingItems} from '../../components/mockClothingItems/mockClothingItems';

// type Props = {
//   route: any;
//   navigation: any;
// };

// export default function ItemDetailScreen({route, navigation}: Props) {
//   const {theme} = useAppTheme();
//   const {itemId, item: routeItem} = route.params;
//   const item = routeItem ?? mockClothingItems.find(i => i.id === itemId);

//   const [name, setName] = useState(item?.name || '');
//   const [category, setCategory] = useState('');
//   const [tags, setTags] = useState('');
//   const [color, setColor] = useState('');

//   useEffect(() => {
//     if (item) {
//       setCategory(item.name.split(' ').slice(1).join(' ')); // crude category fallback
//       setColor(item.name.split(' ')[0]); // crude color fallback
//       setTags(''); // leave blank or generate from metadata
//     }
//   }, [item]);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       padding: 16,
//       backgroundColor: theme.colors.background,
//     },
//     image: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 16,
//     },
//     label: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 10,
//       marginBottom: 16,
//       color: theme.colors.foreground,
//     },
//     button: {
//       backgroundColor: theme.colors.primary,
//       padding: 14,
//       borderRadius: 12,
//       alignItems: 'center',
//       marginTop: 20,
//     },
//     buttonText: {
//       color: '#fff',
//       fontWeight: 'bold',
//       fontSize: 16,
//     },
//   });

//   return (
//     <ScrollView style={styles.container}>
//       {item?.image && <Image source={{uri: item.image}} style={styles.image} />}

//       <Text style={styles.label}>Name</Text>
//       <TextInput value={name} onChangeText={setName} style={styles.input} />

//       <Text style={styles.label}>Category</Text>
//       <TextInput
//         value={category}
//         onChangeText={setCategory}
//         style={styles.input}
//         placeholder="e.g. Shirt, Pants, Shoes"
//       />

//       <Text style={styles.label}>Color</Text>
//       <TextInput
//         value={color}
//         onChangeText={setColor}
//         style={styles.input}
//         placeholder="e.g. Navy, White, Tan"
//       />

//       <Text style={styles.label}>Tags</Text>
//       <TextInput
//         value={tags}
//         onChangeText={setTags}
//         style={styles.input}
//         placeholder="Comma separated: casual, spring, linen"
//       />

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           gap: 12,
//         }}>
//         <Pressable
//           style={[
//             styles.button,
//             {flex: 1, backgroundColor: theme.colors.surface},
//           ]}
//           onPress={() => navigation.goBack()}>
//           <Text style={[styles.buttonText, {color: theme.colors.foreground}]}>
//             Cancel
//           </Text>
//         </Pressable>

//         <Pressable
//           style={[styles.button, {flex: 1}]}
//           onPress={() => navigation.goBack()}>
//           <Text style={styles.buttonText}>Save Changes</Text>
//         </Pressable>
//       </View>
//     </ScrollView>
//   );
// }
