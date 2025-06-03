import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: 12,
    },
    formSection: {
      marginTop: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.surface,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: theme.colors.foreground,
      marginBottom: 18,
    },
    button: {
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    buttonText: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    cancelButtonText: {
      color: theme.colors.foreground,
      fontWeight: 'bold',
      fontSize: 16,
    },
    imagePreview: {
      width: '100%',
      height: 320,
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: '#eee',
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{paddingBottom: 40}}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Select Image</Text>
      <ImagePickerGrid onSelectImage={setImageUri} selectedUri={imageUri} />

      {imageUri && (
        <Image
          source={{uri: imageUri}}
          style={{
            width: '100%',
            height: 320,
            borderRadius: 16,
            marginBottom: 20,
            marginTop: 12,
          }}
          resizeMode="cover"
        />
      )}
      <View style={styles.formSection}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="e.g. White Button-down"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          placeholder="e.g. Shirt, Pants"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>Color</Text>
        <TextInput
          value={color}
          onChangeText={setColor}
          style={styles.input}
          placeholder="e.g. Navy, White"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>Tags</Text>
        <TextInput
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          placeholder="Comma separated: casual, winter, linen"
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: '#405de6',
          },
        ]}
        onPress={handleSave}
        disabled={!imageUri || !name.trim()}>
        <Text
          style={[
            styles.buttonText,
            {
              color: 'white', // ✅ Always white
            },
          ]}>
          Save Item
        </Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

/////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   Pressable,
//   ScrollView,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import uuid from 'react-native-uuid';

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
//     if (!imageUri || !name.trim()) {
//       Alert.alert('Missing Fields', 'Please select an image and enter a name.');
//       return;
//     }

//     const newItem = {
//       id: uuid.v4(),
//       image: imageUri,
//       name,
//       category,
//       color,
//       tags: tags.split(',').map(t => t.trim()),
//     };

//     addItem(newItem);
//     navigate('Closet');
//   };

//   const handleCancel = () => {
//     navigate('Closet');
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       padding: 16,
//       backgroundColor: theme.colors.background,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.primary,
//       marginBottom: 12,
//     },
//     formSection: {
//       marginTop: 24,
//     },
//     label: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.surface,
//       borderRadius: 10,
//       padding: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginBottom: 18,
//     },
//     button: {
//       padding: 14,
//       borderRadius: 12,
//       alignItems: 'center',
//       marginTop: 20,
//     },
//     buttonText: {
//       fontWeight: 'bold',
//       fontSize: 16,
//     },
//     cancelButton: {
//       backgroundColor: theme.colors.surface,
//       padding: 14,
//       borderRadius: 12,
//       alignItems: 'center',
//       marginTop: 12,
//     },
//     cancelButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: 'bold',
//       fontSize: 16,
//     },
//   });

//   return (
//     <ScrollView
//       style={styles.container}
//       contentContainerStyle={{paddingBottom: 40}}
//       keyboardShouldPersistTaps="handled">
//       <Text style={styles.sectionTitle}>Select Image</Text>
//       <ImagePickerGrid onSelectImage={setImageUri} />

//       <View style={styles.formSection}>
//         <Text style={styles.label}>Name</Text>
//         <TextInput
//           value={name}
//           onChangeText={setName}
//           style={styles.input}
//           placeholder="e.g. White Button-down"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={styles.label}>Category</Text>
//         <TextInput
//           value={category}
//           onChangeText={setCategory}
//           style={styles.input}
//           placeholder="e.g. Shirt, Pants"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={styles.label}>Color</Text>
//         <TextInput
//           value={color}
//           onChangeText={setColor}
//           style={styles.input}
//           placeholder="e.g. Navy, White"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={styles.label}>Tags</Text>
//         <TextInput
//           value={tags}
//           onChangeText={setTags}
//           style={styles.input}
//           placeholder="Comma separated: casual, winter, linen"
//           placeholderTextColor={theme.colors.muted}
//         />
//       </View>

//       <Pressable
//         style={[
//           styles.button,
//           {
//             backgroundColor: '#405de6',
//           },
//         ]}
//         onPress={handleSave}
//         disabled={!imageUri || !name.trim()}>
//         <Text
//           style={[
//             styles.buttonText,
//             {
//               color: 'white', // ✅ Always white
//             },
//           ]}>
//           Save Item
//         </Text>
//       </Pressable>

//       <Pressable style={styles.cancelButton} onPress={handleCancel}>
//         <Text style={styles.cancelButtonText}>Cancel</Text>
//       </Pressable>
//     </ScrollView>
//   );
// }

//////////////

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
// import {Alert} from 'react-native';
// import uuid from 'react-native-uuid';

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
//     console.log('🧪 imageUri:', imageUri);
//     console.log('🧪 name:', name);

//     if (!imageUri || !name.trim()) {
//       Alert.alert('Missing Fields', 'Please select an image and enter a name.');
//       return;
//     }

//     const newItem = {
//       id: uuid.v4(),
//       image: imageUri,
//       name,
//       category,
//       color,
//       tags: tags.split(',').map(t => t.trim()),
//     };

//     addItem(newItem);
//     navigate('Closet');
//   };

//   const handleCancel = () => {
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
//     cancelButton: {
//       backgroundColor: theme.colors.surface,
//       padding: 14,
//       borderRadius: 12,
//       alignItems: 'center',
//       marginTop: 10,
//     },
//     cancelButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: 'bold',
//       fontSize: 16,
//     },
//   });

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.label}>Select Image</Text>
//       <ImagePickerGrid onSelectImage={setImageUri} />

//       {/* {imageUri && (
//         <Image source={{uri: imageUri}} style={styles.imagePreview} />
//       )} */}

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

//       <Pressable style={styles.cancelButton} onPress={handleCancel}>
//         <Text style={styles.cancelButtonText}>Cancel</Text>
//       </Pressable>
//     </ScrollView>
//   );
// }
