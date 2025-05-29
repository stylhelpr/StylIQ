import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
import {Alert} from 'react-native';
import uuid from 'react-native-uuid';

type Props = {
  navigate: (screen: string) => void;
  addItem: (item: any) => void;
};

export default function AddItemScreen({navigate, addItem}: Props) {
  const {theme} = useAppTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [tags, setTags] = useState('');

  const handleSave = () => {
    console.log('🧪 imageUri:', imageUri);
    console.log('🧪 name:', name);

    if (!imageUri || !name.trim()) {
      Alert.alert('Missing Fields', 'Please select an image and enter a name.');
      return;
    }

    const newItem = {
      id: uuid.v4(),
      image: imageUri,
      name,
      category,
      color,
      tags: tags.split(',').map(t => t.trim()),
    };

    addItem(newItem);
    navigate('Closet');
  };

  const handleCancel = () => {
    navigate('Closet');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    imagePreview: {
      width: '100%',
      height: 300,
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
    cancelButton: {
      backgroundColor: theme.colors.surface,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    cancelButtonText: {
      color: theme.colors.foreground,
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Select Image</Text>
      <ImagePickerGrid onSelectImage={setImageUri} />

      {/* {imageUri && (
        <Image source={{uri: imageUri}} style={styles.imagePreview} />
      )} */}

      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <TextInput
        value={category}
        onChangeText={setCategory}
        style={styles.input}
        placeholder="e.g. Shirt, Pants"
      />

      <Text style={styles.label}>Color</Text>
      <TextInput
        value={color}
        onChangeText={setColor}
        style={styles.input}
        placeholder="e.g. Navy, White"
      />

      <Text style={styles.label}>Tags</Text>
      <TextInput
        value={tags}
        onChangeText={setTags}
        style={styles.input}
        placeholder="Comma separated: casual, winter, linen"
      />

      <Pressable style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Item</Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

/////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   Pressable,
//   ScrollView,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {v4 as uuidv4} from 'uuid';

// // ⚠️ You will later connect this to useWardrobe()
// const mockAddItem = (item: any) => {
//   console.log('✅ New item added:', item);
// };

// type Props = {
//   navigate: (screen: string) => void;
//   addItem: (item: any) => void;
// };

// export default function AddItemScreen({navigate, addItem}: Props) {
//   const {theme} = useAppTheme();
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [name, setName] = useState('');
//   const [category, setCategory] = useState('');
//   const [color, setColor] = useState('');
//   const [tags, setTags] = useState('');

//   const handleSave = () => {
//     if (!imageUri || !name.trim()) return;

//     const newItem = {
//       id: uuidv4(),
//       image: imageUri,
//       name,
//       category,
//       color,
//       tags: tags.split(',').map(t => t.trim()),
//     };

//     console.log('✅ Saving item:', newItem); // ← Add this

//     addItem(newItem);
//     navigate('Closet');
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       padding: 16,
//       backgroundColor: theme.colors.background,
//     },
//     imagePreview: {
//       width: '100%',
//       height: 300,
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
//       <Text style={styles.label}>Select Image</Text>
//       <ImagePickerGrid onSelectImage={setImageUri} />

//       {imageUri && (
//         <Image source={{uri: imageUri}} style={styles.imagePreview} />
//       )}

//       <Text style={styles.label}>Name</Text>
//       <TextInput value={name} onChangeText={setName} style={styles.input} />

//       <Text style={styles.label}>Category</Text>
//       <TextInput
//         value={category}
//         onChangeText={setCategory}
//         style={styles.input}
//         placeholder="e.g. Shirt, Pants"
//       />

//       <Text style={styles.label}>Color</Text>
//       <TextInput
//         value={color}
//         onChangeText={setColor}
//         style={styles.input}
//         placeholder="e.g. Navy, White"
//       />

//       <Text style={styles.label}>Tags</Text>
//       <TextInput
//         value={tags}
//         onChangeText={setTags}
//         style={styles.input}
//         placeholder="Comma separated: casual, winter, linen"
//       />

//       <View style={styles.buttonRow}>
//         <Pressable
//           style={[styles.button, styles.cancelButton]}
//           onPress={() => navigate('Closet')}>
//           <Text style={styles.buttonText}>Cancel</Text>
//         </Pressable>
//         <Pressable style={styles.button} onPress={handleSave}>
//           <Text style={styles.buttonText}>Save Item</Text>
//         </Pressable>
//       </View>
//     </ScrollView>
//   );
// }

///////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   Pressable,
//   ScrollView,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {v4 as uuidv4} from 'uuid';

// // ⚠️ You will later connect this to useWardrobe()
// const mockAddItem = (item: any) => {
//   console.log('✅ New item added:', item);
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function AddItemScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [name, setName] = useState('');
//   const [category, setCategory] = useState('');
//   const [color, setColor] = useState('');
//   const [tags, setTags] = useState('');

//   const handleSave = () => {
//     if (!imageUri || !name.trim()) {
//       //   alert('Image and name are required');
//       return;
//     }

//     const newItem = {
//       id: uuidv4(),
//       image: imageUri,
//       name,
//       category,
//       color,
//       tags: tags.split(',').map(t => t.trim()),
//     };

//     mockAddItem(newItem);
//     navigate('Closet');
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       padding: 16,
//       backgroundColor: theme.colors.background,
//     },
//     imagePreview: {
//       width: '100%',
//       height: 300,
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
//       <Text style={styles.label}>Select Image</Text>
//       <ImagePickerGrid onSelectImage={setImageUri} />

//       {imageUri && (
//         <Image source={{uri: imageUri}} style={styles.imagePreview} />
//       )}

//       <Text style={styles.label}>Name</Text>
//       <TextInput value={name} onChangeText={setName} style={styles.input} />

//       <Text style={styles.label}>Category</Text>
//       <TextInput
//         value={category}
//         onChangeText={setCategory}
//         style={styles.input}
//         placeholder="e.g. Shirt, Pants"
//       />

//       <Text style={styles.label}>Color</Text>
//       <TextInput
//         value={color}
//         onChangeText={setColor}
//         style={styles.input}
//         placeholder="e.g. Navy, White"
//       />

//       <Text style={styles.label}>Tags</Text>
//       <TextInput
//         value={tags}
//         onChangeText={setTags}
//         style={styles.input}
//         placeholder="Comma separated: casual, winter, linen"
//       />

//       <Pressable style={styles.button} onPress={handleSave}>
//         <Text style={styles.buttonText}>Save Item</Text>
//       </Pressable>
//     </ScrollView>
//   );
// }
