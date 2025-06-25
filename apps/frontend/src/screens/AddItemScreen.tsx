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
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

export default function AddItemScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {user} = useAuth0();
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

  const handleSave = async () => {
    if (!imageUri || !name.trim()) {
      Alert.alert('Missing Fields', 'Please select an image and enter a name.');
      return;
    }
    try {
      const filename = imageUri.split('/').pop() ?? 'upload.jpg';
      const {publicUrl, objectKey} = await uploadImageToGCS({
        localUri: imageUri,
        filename,
        userId,
      });
      await postWardrobeItem({
        userId,
        image_url: publicUrl,
        objectKey,
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
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    imagePreview: {
      width: '100%',
      height: 320,
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: '#eee',
    },
    buttonSection: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
    },
  });

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={globalStyles.modalSection3}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 25,
          }}>
          <View style={globalStyles.section3}>
            <Text style={globalStyles.sectionTitle}>Select Image</Text>
            <ImagePickerGrid
              onSelectImage={setImageUri}
              selectedUri={imageUri}
            />
          </View>

          {imageUri && (
            <Image
              source={{uri: imageUri}}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          )}

          <View style={globalStyles.section}>
            <Text style={globalStyles.title}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="e.g. White Button-down"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={globalStyles.title}>Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              style={styles.input}
              placeholder="e.g. Shirt, Pants"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={globalStyles.title}>Color</Text>
            <TextInput
              value={color}
              onChangeText={setColor}
              style={styles.input}
              placeholder="e.g. Navy, White"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={globalStyles.title}>Tags</Text>
            <TextInput
              value={tags}
              onChangeText={setTags}
              style={styles.input}
              placeholder="Comma separated: casual, winter, linen"
              placeholderTextColor={theme.colors.muted}
            />

            <View style={styles.buttonSection}>
              <AppleTouchFeedback
                onPress={handleSave}
                hapticStyle="impactMedium"
                style={[globalStyles.buttonPrimary, {width: 160}]}
                disabled={!imageUri || !name.trim()}>
                <Text style={globalStyles.buttonPrimaryText}>Save Item</Text>
              </AppleTouchFeedback>

              <AppleTouchFeedback
                onPress={handleCancel}
                hapticStyle="impactLight"
                style={[
                  globalStyles.buttonPrimary,
                  {
                    marginLeft: 12,
                    width: 160,
                    backgroundColor: 'rgb(153, 153, 153)',
                  },
                ]}>
                <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
              </AppleTouchFeedback>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

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
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// export default function AddItemScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {user} = useAuth0();
//   const userId = useUUID();

//   if (!userId) {
//     console.error('❌ UUID not available yet');
//     return (
//       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//         <Text>Loading...</Text>
//       </View>
//     );
//   }

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

//       const {publicUrl, objectKey} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });

//       await postWardrobeItem({
//         userId,
//         image_url: publicUrl,
//         objectKey, // ✅ include this
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
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.surface,
//       borderRadius: 10,
//       padding: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginBottom: 12,
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
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.section3}>
//         <Text style={globalStyles.sectionTitle}>Select Image</Text>
//         <ImagePickerGrid onSelectImage={setImageUri} selectedUri={imageUri} />
//       </View>

//       {imageUri && (
//         <Image
//           source={{uri: imageUri}}
//           style={styles.imagePreview}
//           resizeMode="cover"
//         />
//       )}

//       <View style={globalStyles.section}>
//         <Text style={globalStyles.title}>Name</Text>
//         <TextInput
//           value={name}
//           onChangeText={setName}
//           style={styles.input}
//           placeholder="e.g. White Button-down"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Category</Text>
//         <TextInput
//           value={category}
//           onChangeText={setCategory}
//           style={styles.input}
//           placeholder="e.g. Shirt, Pants"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Color</Text>
//         <TextInput
//           value={color}
//           onChangeText={setColor}
//           style={styles.input}
//           placeholder="e.g. Navy, White"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Tags</Text>
//         <TextInput
//           value={tags}
//           onChangeText={setTags}
//           style={styles.input}
//           placeholder="Comma separated: casual, winter, linen"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <AppleTouchFeedback
//           onPress={handleSave}
//           hapticStyle="impactMedium"
//           style={[globalStyles.buttonPrimary, {marginBottom: 20}]}
//           disabled={!imageUri || !name.trim()}>
//           <Text style={globalStyles.buttonPrimaryText}>Save Item</Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           onPress={handleCancel}
//           hapticStyle="impactLight"
//           style={globalStyles.buttonTertiary}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </ScrollView>
//   );
// }
