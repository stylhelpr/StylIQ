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

// Mock data lookup
import {mockClothingItems} from '../../components/mockClothingItems/mockClothingItems';

type Props = {
  route: any;
  navigation: any;
};

export default function ItemDetailScreen({route, navigation}: Props) {
  const {theme} = useAppTheme();
  const {itemId} = route.params;
  const item = mockClothingItems.find(i => i.id === itemId);

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (item) {
      setCategory(item.name.split(' ').slice(1).join(' ')); // crude category fallback
      setColor(item.name.split(' ')[0]); // crude color fallback
      setTags(''); // leave blank or generate from metadata
    }
  }, [item]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    image: {
      width: '100%',
      height: 320,
      borderRadius: 16,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.surface,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
      color: theme.colors.foreground,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  return (
    <ScrollView style={styles.container}>
      {item?.image && <Image source={{uri: item.image}} style={styles.image} />}

      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <TextInput
        value={category}
        onChangeText={setCategory}
        style={styles.input}
        placeholder="e.g. Shirt, Pants, Shoes"
      />

      <Text style={styles.label}>Color</Text>
      <TextInput
        value={color}
        onChangeText={setColor}
        style={styles.input}
        placeholder="e.g. Navy, White, Tan"
      />

      <Text style={styles.label}>Tags</Text>
      <TextInput
        value={tags}
        onChangeText={setTags}
        style={styles.input}
        placeholder="Comma separated: casual, spring, linen"
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 12,
        }}>
        <Pressable
          style={[
            styles.button,
            {flex: 1, backgroundColor: theme.colors.surface},
          ]}
          onPress={() => navigation.goBack()}>
          <Text style={[styles.buttonText, {color: theme.colors.foreground}]}>
            Cancel
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, {flex: 1}]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Save Changes</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/////////////

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
//   const {itemId} = route.params;
//   const item = mockClothingItems.find(i => i.id === itemId);

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

//       <Pressable style={styles.button} onPress={() => navigation.goBack()}>
//         <Text style={styles.buttonText}>Save Changes</Text>
//       </Pressable>
//     </ScrollView>
//   );
// }
