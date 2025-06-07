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
import {uploadImageToGCS} from '../api/uploadImageToGCS';
import {postWardrobeItem} from '../api/postWardrobeItem';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';

export default function AddItemScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const {theme} = useAppTheme();
  const {user} = useAuth0();
  // const userId = user?.sub || '';
  const userId = useUUID();

  if (!userId) {
    console.error('❌ UUID not available yet');
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [tags, setTags] = useState('');

  // const handleSave = async () => {
  //   if (!imageUri || !name.trim()) {
  //     Alert.alert('Missing Fields', 'Please select an image and enter a name.');
  //     return;
  //   }

  //   try {
  //     const filename = imageUri.split('/').pop() ?? 'upload.jpg';

  //     const gcsUrl = await uploadImageToGCS({
  //       localUri: imageUri,
  //       filename,
  //       userId,
  //     });

  //     await postWardrobeItem({
  //       userId,
  //       image_url: gcsUrl,
  //       name,
  //       category,
  //       color,
  //       tags: tags
  //         .split(',')
  //         .map(t => t.trim())
  //         .filter(Boolean),
  //     });

  //     navigate('Closet');
  //   } catch (err) {
  //     console.error(err);
  //     Alert.alert('Upload Failed', 'There was a problem uploading your item.');
  //   }
  // };

  const handleSave = async () => {
    if (!imageUri || !name.trim()) {
      Alert.alert('Missing Fields', 'Please select an image and enter a name.');
      return;
    }

    if (!userId) {
      console.error('❌ UUID is not available yet.');
      Alert.alert('Error', 'User ID not available. Please try again later.');
      return;
    }

    try {
      const filename = imageUri.split('/').pop() ?? 'upload.jpg';

      const gcsUrl = await uploadImageToGCS({
        localUri: imageUri,
        filename,
        userId, // ✅ Safe — now guaranteed to be string
      });

      await postWardrobeItem({
        userId,
        image_url: gcsUrl,
        name,
        category,
        color,
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      });

      navigate('Closet');
    } catch (err) {
      console.error(err);
      Alert.alert('Upload Failed', 'There was a problem uploading your item.');
    }
  };

  const handleCancel = () => navigate('Closet');

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
      backgroundColor: '#405de6',
    },
    buttonText: {
      fontWeight: 'bold',
      fontSize: 16,
      color: 'white',
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
          style={styles.imagePreview}
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
        style={styles.button}
        onPress={handleSave}
        disabled={!imageUri || !name.trim()}>
        <Text style={styles.buttonText}>Save Item</Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   Pressable,
//   ScrollView,
//   Alert,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import {useAuth0} from 'react-native-auth0';

// export default function AddItemScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const userId = user?.sub || '';

//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [name, setName] = useState('');
//   const [category, setCategory] = useState('');
//   const [color, setColor] = useState('');
//   const [tags, setTags] = useState('');

//   const handleSave = async () => {
//     if (!imageUri || !name.trim()) {
//       Alert.alert('Missing Fields', 'Please select an image and enter a name.');
//       return;
//     }

//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';

//       const gcsUrl = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });

//       await postWardrobeItem({
//         userId,
//         image_url: gcsUrl,
//         name,
//         category,
//         color,
//         tags: tags
//           .split(',')
//           .map(t => t.trim())
//           .filter(Boolean),
//       });

//       navigate('Closet');
//     } catch (err) {
//       console.error(err);
//       Alert.alert('Upload Failed', 'There was a problem uploading your item.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

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
//       backgroundColor: '#405de6',
//     },
//     buttonText: {
//       fontWeight: 'bold',
//       fontSize: 16,
//       color: 'white',
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
//     imagePreview: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 16,
//       backgroundColor: '#eee',
//     },
//   });

//   return (
//     <ScrollView
//       style={styles.container}
//       contentContainerStyle={{paddingBottom: 40}}
//       keyboardShouldPersistTaps="handled">
//       <Text style={styles.sectionTitle}>Select Image</Text>
//       <ImagePickerGrid onSelectImage={setImageUri} selectedUri={imageUri} />

//       {imageUri && (
//         <Image
//           source={{uri: imageUri}}
//           style={styles.imagePreview}
//           resizeMode="cover"
//         />
//       )}

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
//         style={styles.button}
//         onPress={handleSave}
//         disabled={!imageUri || !name.trim()}>
//         <Text style={styles.buttonText}>Save Item</Text>
//       </Pressable>

//       <Pressable style={styles.cancelButton} onPress={handleCancel}>
//         <Text style={styles.cancelButtonText}>Cancel</Text>
//       </Pressable>
//     </ScrollView>
//   );
// }

////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   Pressable,
//   ScrollView,
//   Alert,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import {useAuth0} from 'react-native-auth0';

// export default function AddItemScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const userId = user?.sub || '';

//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [name, setName] = useState('');
//   const [category, setCategory] = useState('');
//   const [color, setColor] = useState('');
//   const [tags, setTags] = useState('');

//   const handleSave = async () => {
//     if (!imageUri || !name.trim()) {
//       Alert.alert('Missing Fields', 'Please select an image and enter a name.');
//       return;
//     }

//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';

//       const gcsUrl = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });

//       await postWardrobeItem({
//         userId,
//         image_url: gcsUrl,
//         name,
//         category,
//         color,
//         tags: tags
//           .split(',')
//           .map(t => t.trim())
//           .filter(Boolean),
//       });

//       navigate('Closet');
//     } catch (err) {
//       console.error(err);
//       Alert.alert('Upload Failed', 'There was a problem uploading your item.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

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
//       backgroundColor: '#405de6',
//     },
//     buttonText: {
//       fontWeight: 'bold',
//       fontSize: 16,
//       color: 'white',
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
//     imagePreview: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 16,
//       backgroundColor: '#eee',
//     },
//   });

//   return (
//     <ScrollView
//       style={styles.container}
//       contentContainerStyle={{paddingBottom: 40}}
//       keyboardShouldPersistTaps="handled">
//       <Text style={styles.sectionTitle}>Select Image</Text>
//       <ImagePickerGrid onSelectImage={setImageUri} selectedUri={imageUri} />

//       {imageUri && (
//         <Image
//           source={{uri: imageUri}}
//           style={styles.imagePreview}
//           resizeMode="cover"
//         />
//       )}

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
//         style={styles.button}
//         onPress={handleSave}
//         disabled={!imageUri || !name.trim()}>
//         <Text style={styles.buttonText}>Save Item</Text>
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
//   Alert,
//   Image,
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
//     imagePreview: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 16,
//       backgroundColor: '#eee',
//     },
//   });

//   return (
//     <ScrollView
//       style={styles.container}
//       contentContainerStyle={{paddingBottom: 40}}
//       keyboardShouldPersistTaps="handled">
//       <Text style={styles.sectionTitle}>Select Image</Text>
//       <ImagePickerGrid onSelectImage={setImageUri} selectedUri={imageUri} />

//       {imageUri && (
//         <Image
//           source={{uri: imageUri}}
//           style={{
//             width: '100%',
//             height: 320,
//             borderRadius: 16,
//             marginBottom: 20,
//             marginTop: 12,
//           }}
//           resizeMode="cover"
//         />
//       )}
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
