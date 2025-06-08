import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
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

  const handleDelete = () => {
    if (!item?.id) return;
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          // TODO: Replace this with actual delete mutation or API call
          console.log('Deleting item:', item.id);

          // Navigate back to wardrobe screen
          navigation.goBack();
        },
      },
    ]);
  };

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
    deleteButton: {
      backgroundColor: '#cc0000',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    deleteText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
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
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.saveButton]}
          onPress={() => {
            // TODO: Hook up save mutation
            navigation.goBack();
          }}>
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
      </View>

      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete Item</Text>
      </Pressable>
    </ScrollView>
  );
}

/////////////////

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
//       setCategory(item.name.split(' ').slice(1).join(' '));
//       setColor(item.name.split(' ')[0]);
//       setTags('');
//     }
//   }, [item]);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingHorizontal: 16,
//       paddingTop: 20,
//       paddingBottom: 40,
//       backgroundColor: theme.colors.background,
//     },
//     image: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 20,
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       marginBottom: 4,
//       marginTop: 8,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.surface,
//       borderRadius: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       marginBottom: 14,
//       fontSize: 15,
//       color: theme.colors.foreground,
//       backgroundColor: theme.colors.surface,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginTop: 30,
//       gap: 12,
//     },
//     button: {
//       flex: 1,
//       paddingVertical: 14,
//       borderRadius: 12,
//       alignItems: 'center',
//     },
//     cancelButton: {
//       backgroundColor: theme.colors.surface,
//     },
//     cancelText: {
//       color: theme.colors.foreground,
//       fontWeight: 'bold',
//       fontSize: 16,
//     },
//     saveButton: {
//       backgroundColor: '#405de6',
//     },
//     saveText: {
//       color: '#fff',
//       fontWeight: 'bold',
//       fontSize: 16,
//     },
//     buttonWithMarginRight: {
//       marginRight: 12,
//     },
//   });

//   return (
//     <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//       {item?.image && <Image source={{uri: item.image}} style={styles.image} />}

//       <Text style={styles.label}>Name</Text>
//       <TextInput value={name} onChangeText={setName} style={styles.input} />

//       <Text style={styles.label}>Category</Text>
//       <TextInput
//         value={category}
//         onChangeText={setCategory}
//         style={styles.input}
//         placeholder="e.g. Shirt, Pants, Shoes"
//         placeholderTextColor={theme.colors.muted}
//       />

//       <Text style={styles.label}>Color</Text>
//       <TextInput
//         value={color}
//         onChangeText={setColor}
//         style={styles.input}
//         placeholder="e.g. Navy, White, Tan"
//         placeholderTextColor={theme.colors.muted}
//       />

//       <Text style={styles.label}>Tags</Text>
//       <TextInput
//         value={tags}
//         onChangeText={setTags}
//         style={styles.input}
//         placeholder="Comma separated: casual, spring, linen"
//         placeholderTextColor={theme.colors.muted}
//       />

//       <View style={styles.buttonRow}>
//         <Pressable
//           style={[
//             styles.button,
//             styles.cancelButton,
//             styles.buttonWithMarginRight,
//           ]}
//           onPress={() => navigation.goBack()}>
//           <Text style={styles.cancelText}>Cancel</Text>
//         </Pressable>

//         <Pressable
//           style={[styles.button, styles.saveButton]}
//           onPress={() => navigation.goBack()}>
//           <Text style={styles.saveText}>Save Changes</Text>
//         </Pressable>
//       </View>
//     </ScrollView>
//   );
// }
