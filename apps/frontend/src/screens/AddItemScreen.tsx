// apps/frontend/screens/AddItemScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
import {uploadImageToGCS} from '../api/uploadImageToGCS';
import {postWardrobeItem} from '../api/postWardrobeItem';
import {listWardrobe, searchText as apiSearchText} from '../lib/wardrobe';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';

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

  // Optional extras (safe to leave blank)
  const [subcategory, setSubcategory] = useState('');
  const [material, setMaterial] = useState('');
  const [fit, setFit] = useState('');
  const [size, setSize] = useState('');
  const [brand, setBrand] = useState('');

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    input: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: theme.colors.foreground,
      marginBottom: 12,
      backgroundColor: theme.colors.input2,
    },
    imagePreview: {
      width: '100%',
      height: 320,
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: '#eee',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
      flexWrap: 'wrap',
      gap: 12,
    },
    label: {...globalStyles.title},
    secondaryBtn: {
      ...globalStyles.buttonPrimary,
      backgroundColor: 'rgb(153,153,153)',
    },
    debugBtn: {
      ...globalStyles.buttonPrimary,
      backgroundColor: 'rgb(60,60,60)',
    },
  });

  // Normal flow: Save Item
  const handleSave = async () => {
    if (!imageUri || !name.trim()) {
      Alert.alert('Missing Fields', 'Please select an image and enter a name.');
      return;
    }
    try {
      const filename = imageUri.split('/').pop() ?? 'upload.jpg';
      const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
        localUri: imageUri,
        filename,
        userId,
      });

      const cleanedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      console.log('[AddItem] upload ok', {publicUrl, objectKey, gsutilUri});
      const res = await postWardrobeItem({
        userId,
        image_url: publicUrl,
        objectKey,
        gsutilUri,
        name,
        category,
        color,
        subcategory,
        material,
        fit,
        size,
        brand,
        tags: cleanedTags,
      });
      console.log('[AddItem] postWardrobeItem ok', res);
      navigate('Closet');
    } catch (err: any) {
      console.error('[AddItem] Save error:', err?.message || err);
      Alert.alert(
        'Upload Failed',
        err?.message || 'There was a problem uploading your item.',
      );
    }
  };

  // FRONTEND-ONLY: upload → create → GCS HEAD → DB list → Pinecone search (clean ids)
  const handleDebugUpload = async () => {
    if (!imageUri || !name.trim()) {
      Alert.alert('Missing Fields', 'Pick an image and enter a name first.');
      return;
    }
    try {
      const filename = imageUri.split('/').pop() ?? 'upload.jpg';
      console.log('[Debug] starting uploadImageToGCS', {filename, userId});

      const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
        localUri: imageUri,
        filename,
        userId,
      });

      console.log('[Debug] upload done', {publicUrl, objectKey, gsutilUri});

      const cleanedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payloadPreview = {
        userId,
        image_url: publicUrl,
        objectKey,
        gsutilUri,
        name,
        category,
        color,
        subcategory,
        material,
        fit,
        size,
        brand,
        tags: cleanedTags,
      };

      console.log('[Debug] postWardrobeItem payload', payloadPreview);

      const apiRes = await postWardrobeItem(payloadPreview);
      console.log('[Debug] API response', apiRes);

      const newId = apiRes?.item?.id as string;
      const newPublicUrl = apiRes?.item?.image_url as string;

      // (1) GCS HEAD
      let gcsOk = false;
      let gcsStatus = 0;
      try {
        const head = await fetch(newPublicUrl, {method: 'HEAD'});
        gcsOk = head.ok;
        gcsStatus = head.status;
        console.log('[Check] GCS exists?', gcsOk, gcsStatus);
      } catch (e: any) {
        console.log('[Check] GCS failed:', e?.message || e);
      }

      // (2) DB LIST
      let inDb = false;
      let listCount = 0;
      try {
        const list = await listWardrobe(userId);
        listCount = Array.isArray(list) ? list.length : 0;
        inDb = Array.isArray(list) && list.some((r: any) => r.id === newId);
        console.log('[Check] DB has new row?', inDb, 'rows:', listCount);
      } catch (e: any) {
        console.log('[Check] DB list failed:', e?.message || e);
      }

      // (3) PINECONE SEARCH – backend now returns clean id + modality
      let inSearch = false;
      let searchTop: Array<{id: string; score: number; modality?: string}> = [];
      try {
        const q =
          `${apiRes?.item?.color || ''} ${
            apiRes?.item?.main_category || ''
          }`.trim() ||
          apiRes?.item?.name ||
          'new item';

        const results = await apiSearchText(userId, q, 20);
        searchTop = Array.isArray(results)
          ? results
              .map((m: any) => ({
                id: m.id,
                score: m.score,
                modality: m.modality,
              }))
              .slice(0, 10)
          : [];
        inSearch = searchTop.some(m => m.id === newId);
        console.log(
          '[Check] Pinecone has vector?',
          inSearch,
          'top:',
          searchTop,
        );
      } catch (e: any) {
        console.log('[Check] Pinecone search failed:', e?.message || e);
      }

      Alert.alert(
        'Debug Results',
        [
          `GCS: ${gcsOk ? 'OK' : 'MISS'} (status ${gcsStatus || 'n/a'})`,
          `DB: ${inDb ? 'OK' : 'MISS'} (rows ${listCount})`,
          `Search: ${inSearch ? 'OK' : 'MISS'}${
            searchTop.length
              ? ` (top[0]: ${searchTop[0].id}${
                  searchTop[0].modality ? ':' + searchTop[0].modality : ''
                } • ${
                  typeof searchTop[0].score === 'number'
                    ? searchTop[0].score.toFixed(3)
                    : searchTop[0].score
                })`
              : ''
          }`,
        ].join('\n'),
      );
    } catch (err: any) {
      console.error('[Debug] upload error', err?.message || err);
      Alert.alert(
        'Debug Upload Failed',
        err?.message || 'See console for details.',
      );
    }
  };

  const handleCancel = () => navigate('Closet');

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={globalStyles.modalSection3}>
        <View
          style={[
            globalStyles.cardStyles3,
            {backgroundColor: theme.colors.surface, borderRadius: 25},
          ]}>
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

            {/* Optional extras */}
            <Text style={styles.label}>Subcategory (optional)</Text>
            <TextInput
              value={subcategory}
              onChangeText={setSubcategory}
              style={styles.input}
              placeholder="e.g. Dress Shirt, Chinos"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Material (optional)</Text>
            <TextInput
              value={material}
              onChangeText={setMaterial}
              style={styles.input}
              placeholder="e.g. Cotton, Wool, Linen"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Fit (optional)</Text>
            <TextInput
              value={fit}
              onChangeText={setFit}
              style={styles.input}
              placeholder="e.g. Slim, Regular"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Size (optional)</Text>
            <TextInput
              value={size}
              onChangeText={setSize}
              style={styles.input}
              placeholder="e.g. M, L, 32x32"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Brand (optional)</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              style={styles.input}
              placeholder="e.g. Ferragamo"
              placeholderTextColor={theme.colors.muted}
            />

            <View style={styles.buttonRow}>
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
                style={[styles.secondaryBtn, {width: 160}]}>
                <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
              </AppleTouchFeedback>

              {/* FRONTEND-ONLY E2E: upload → create → GCS HEAD → DB list → search */}
              <AppleTouchFeedback
                onPress={handleDebugUpload}
                hapticStyle="impactLight"
                style={[styles.debugBtn, {width: 220}]}>
                <Text style={globalStyles.buttonPrimaryText}>
                  Debug: Test Upload + Checks
                </Text>
              </AppleTouchFeedback>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/////////////

// // apps/frontend/screens/AddItemScreen.tsx
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
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
//   // Optional extras (can remain blank)
//   const [subcategory, setSubcategory] = useState('');
//   const [material, setMaterial] = useState('');
//   const [fit, setFit] = useState('');
//   const [size, setSize] = useState('');
//   const [brand, setBrand] = useState('');

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputBorder,
//       borderRadius: 10,
//       padding: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//       backgroundColor: theme.colors.input2,
//     },
//     imagePreview: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 16,
//       backgroundColor: '#eee',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginTop: 12,
//       flexWrap: 'wrap',
//       gap: 12,
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     debugBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(60,60,60)',
//     },
//   });

//   // Normal flow used by “Save Item”
//   const handleSave = async () => {
//     if (!imageUri || !name.trim()) {
//       Alert.alert('Missing Fields', 'Please select an image and enter a name.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });

//       const cleanedTags = tags
//         .split(',')
//         .map(t => t.trim())
//         .filter(Boolean);

//       console.log('[AddItem] upload ok', {publicUrl, objectKey, gsutilUri});
//       const res = await postWardrobeItem({
//         userId,
//         image_url: publicUrl,
//         objectKey,
//         gsutilUri, // camelCase here; postWardrobeItem maps to snake_case
//         name,
//         category,
//         color,
//         tags: cleanedTags,
//       });

//       console.log('[AddItem] postWardrobeItem ok', res);
//       navigate('Closet');
//     } catch (err: any) {
//       console.error('[AddItem] Save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your item.',
//       );
//     }
//   };

//   // 🔧 DEBUG: This runs the same upload+post path with extra logging and no navigation,
//   // so you can see results immediately in Metro/Console.
//   const handleDebugUpload = async () => {
//     if (!imageUri || !name.trim()) {
//       Alert.alert('Missing Fields', 'Pick an image and enter a name first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       console.log('[Debug] starting uploadImageToGCS', {filename, userId});

//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });

//       console.log('[Debug] upload done', {publicUrl, objectKey, gsutilUri});

//       const cleanedTags = tags
//         .split(',')
//         .map(t => t.trim())
//         .filter(Boolean);

//       const payloadPreview = {
//         userId,
//         image_url: publicUrl,
//         objectKey,
//         gsutilUri,
//         name,
//         category,
//         color,
//         tags: cleanedTags,
//       };
//       console.log('[Debug] postWardrobeItem payload', payloadPreview);

//       const apiRes = await postWardrobeItem(payloadPreview);
//       console.log('[Debug] API response', apiRes);

//       Alert.alert(
//         'Debug Upload',
//         'Frontend upload + API call completed. Check logs.',
//       );
//     } catch (err: any) {
//       console.error('[Debug] upload error', err?.message || err);
//       Alert.alert(
//         'Debug Upload Failed',
//         err?.message || 'See console for details.',
//       );
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {backgroundColor: theme.colors.surface, borderRadius: 25},
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text style={globalStyles.sectionTitle}>Select Image</Text>
//             <ImagePickerGrid
//               onSelectImage={setImageUri}
//               selectedUri={imageUri}
//             />
//           </View>

//           {imageUri && (
//             <Image
//               source={{uri: imageUri}}
//               style={styles.imagePreview}
//               resizeMode="cover"
//             />
//           )}

//           <View style={globalStyles.section}>
//             <Text style={styles.label}>Name</Text>
//             <TextInput
//               value={name}
//               onChangeText={setName}
//               style={styles.input}
//               placeholder="e.g. White Button-down"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Category</Text>
//             <TextInput
//               value={category}
//               onChangeText={setCategory}
//               style={styles.input}
//               placeholder="e.g. Shirt, Pants"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Color</Text>
//             <TextInput
//               value={color}
//               onChangeText={setColor}
//               style={styles.input}
//               placeholder="e.g. Navy, White"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Tags</Text>
//             <TextInput
//               value={tags}
//               onChangeText={setTags}
//               style={styles.input}
//               placeholder="Comma separated: casual, winter, linen"
//               placeholderTextColor={theme.colors.muted}
//             />

//             {/* Optional extras; safe to leave blank */}
//             <Text style={styles.label}>Subcategory (optional)</Text>
//             <TextInput
//               value={subcategory}
//               onChangeText={setSubcategory}
//               style={styles.input}
//               placeholder="e.g. Dress Shirt, Chinos"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Material (optional)</Text>
//             <TextInput
//               value={material}
//               onChangeText={setMaterial}
//               style={styles.input}
//               placeholder="e.g. Cotton, Wool, Linen"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Fit (optional)</Text>
//             <TextInput
//               value={fit}
//               onChangeText={setFit}
//               style={styles.input}
//               placeholder="e.g. Slim, Regular"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Size (optional)</Text>
//             <TextInput
//               value={size}
//               onChangeText={setSize}
//               style={styles.input}
//               placeholder="e.g. M, L, 32x32"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Brand (optional)</Text>
//             <TextInput
//               value={brand}
//               onChangeText={setBrand}
//               style={styles.input}
//               placeholder="e.g. Ferragamo"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <View style={styles.buttonRow}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[globalStyles.buttonPrimary, {width: 160}]}
//                 disabled={!imageUri || !name.trim()}>
//                 <Text style={globalStyles.buttonPrimaryText}>Save Item</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>

//               {/* 🔥 DEBUG button that *executes the upload from the FRONTEND* with logs */}
//               <AppleTouchFeedback
//                 onPress={handleDebugUpload}
//                 hapticStyle="impactLight"
//                 style={[styles.debugBtn, {width: 200}]}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Debug: Test Upload
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

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
//   const [subcategory, setSubcategory] = useState('');
//   const [color, setColor] = useState('');
//   const [material, setMaterial] = useState('');
//   const [fit, setFit] = useState('');
//   const [size, setSize] = useState('');
//   const [brand, setBrand] = useState('');
//   const [tags, setTags] = useState('');

//   const handleSave = async () => {
//     if (!imageUri || !name.trim()) {
//       Alert.alert('Missing Fields', 'Please select an image and enter a name.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
//       await postWardrobeItem({
//         userId,
//         image_url: publicUrl,
//         objectKey,
//         gsutil_uri: gsutilUri ?? null,
//         name,
//         category,
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         metadata: {}, // reserved for future
//         width: null,
//         height: null,
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
//       borderColor: theme.colors.inputBorder,
//       borderRadius: 10,
//       padding: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//       backgroundColor: theme.colors.input2,
//     },
//     imagePreview: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 16,
//       backgroundColor: '#eee',
//     },
//     buttonSection: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginTop: 12,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {
//               backgroundColor: theme.colors.surface,
//               borderRadius: 25,
//             },
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text style={globalStyles.sectionTitle}>Select Image</Text>
//             <ImagePickerGrid
//               onSelectImage={setImageUri}
//               selectedUri={imageUri}
//             />
//           </View>

//           {imageUri && (
//             <Image
//               source={{uri: imageUri}}
//               style={styles.imagePreview}
//               resizeMode="cover"
//             />
//           )}

//           <View style={globalStyles.section}>
//             <Text style={globalStyles.title}>Name</Text>
//             <TextInput
//               value={name}
//               onChangeText={setName}
//               style={styles.input}
//               placeholder="e.g. White Button-down"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Category</Text>
//             <TextInput
//               value={category}
//               onChangeText={setCategory}
//               style={styles.input}
//               placeholder="e.g. Shirt, Pants"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Subcategory</Text>
//             <TextInput
//               value={subcategory}
//               onChangeText={setSubcategory}
//               style={styles.input}
//               placeholder="e.g. Dress Shirt, Chinos"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Color</Text>
//             <TextInput
//               value={color}
//               onChangeText={setColor}
//               style={styles.input}
//               placeholder="e.g. Navy, White"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Material</Text>
//             <TextInput
//               value={material}
//               onChangeText={setMaterial}
//               style={styles.input}
//               placeholder="e.g. Cotton, Wool, Linen"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Fit</Text>
//             <TextInput
//               value={fit}
//               onChangeText={setFit}
//               style={styles.input}
//               placeholder="e.g. Slim, Regular, Relaxed"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Size</Text>
//             <TextInput
//               value={size}
//               onChangeText={setSize}
//               style={styles.input}
//               placeholder="e.g. M, L, 32x32"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Brand</Text>
//             <TextInput
//               value={brand}
//               onChangeText={setBrand}
//               style={styles.input}
//               placeholder="e.g. Ferragamo"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Tags</Text>
//             <TextInput
//               value={tags}
//               onChangeText={setTags}
//               style={styles.input}
//               placeholder="Comma separated: casual, winter, linen"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <View style={styles.buttonSection}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[globalStyles.buttonPrimary, {width: 160}]}
//                 disabled={!imageUri || !name.trim()}>
//                 <Text style={globalStyles.buttonPrimaryText}>Save Item</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {
//                     marginLeft: 12,
//                     width: 160,
//                     backgroundColor: 'rgb(153, 153, 153)',
//                   },
//                 ]}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

//////////////////

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
//         objectKey,
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
//       borderColor: theme.colors.inputBorder,
//       borderRadius: 10,
//       padding: 12,
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//       backgroundColor: theme.colors.input2,
//     },
//     imagePreview: {
//       width: '100%',
//       height: 320,
//       borderRadius: 16,
//       marginBottom: 16,
//       backgroundColor: '#eee',
//     },
//     buttonSection: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginTop: 12,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {
//               backgroundColor: theme.colors.surface,
//               borderRadius: 25,
//             },
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text style={globalStyles.sectionTitle}>Select Image</Text>
//             <ImagePickerGrid
//               onSelectImage={setImageUri}
//               selectedUri={imageUri}
//             />
//           </View>

//           {imageUri && (
//             <Image
//               source={{uri: imageUri}}
//               style={styles.imagePreview}
//               resizeMode="cover"
//             />
//           )}

//           <View style={globalStyles.section}>
//             <Text style={globalStyles.title}>Name</Text>
//             <TextInput
//               value={name}
//               onChangeText={setName}
//               style={styles.input}
//               placeholder="e.g. White Button-down"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Category</Text>
//             <TextInput
//               value={category}
//               onChangeText={setCategory}
//               style={styles.input}
//               placeholder="e.g. Shirt, Pants"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Color</Text>
//             <TextInput
//               value={color}
//               onChangeText={setColor}
//               style={styles.input}
//               placeholder="e.g. Navy, White"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={globalStyles.title}>Tags</Text>
//             <TextInput
//               value={tags}
//               onChangeText={setTags}
//               style={styles.input}
//               placeholder="Comma separated: casual, winter, linen"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <View style={styles.buttonSection}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[globalStyles.buttonPrimary, {width: 160}]}
//                 disabled={!imageUri || !name.trim()}>
//                 <Text style={globalStyles.buttonPrimaryText}>Save Item</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {
//                     marginLeft: 12,
//                     width: 160,
//                     backgroundColor: 'rgb(153, 153, 153)',
//                   },
//                 ]}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
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
