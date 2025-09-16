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
import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';

// --- input normalizers ---
const normalizePatternScale = (
  raw: string,
): 'subtle' | 'medium' | 'bold' | undefined => {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return n <= 0 ? 'subtle' : n === 1 ? 'medium' : 'bold';
  }
  if (['subtle', 'small', 'micro'].includes(s)) return 'subtle';
  if (['medium', 'mid'].includes(s)) return 'medium';
  if (['bold', 'large', 'big'].includes(s)) return 'bold';
  return undefined;
};

const normalizeSeasonality = (raw: string) => {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  if (['ss', 'spring', 'summer', 'spring/summer', 's/s'].includes(s))
    return 'SS';
  if (['fw', 'fall', 'autumn', 'winter', 'fall/winter', 'f/w'].includes(s))
    return 'FW';
  if (
    [
      'all',
      'allseason',
      'all-season',
      'all season',
      'year-round',
      'year round',
      'all_season',
    ].includes(s)
  )
    return 'ALL_SEASON';
  return raw;
};

const normalizeLayering = (raw: string) => {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  if (['base', 'baselayer'].includes(s)) return 'BASE';
  if (['mid', 'midlayer'].includes(s)) return 'MID';
  if (['shell', 'outer', 'outerwear', 'jacket'].includes(s)) return 'SHELL';
  if (['accent', 'accessory', 'acc'].includes(s)) return 'ACCENT';
  return raw;
};

// --- lightweight enrichers for wow results (no UI changes) ---
const inferColorFamily = (
  c?: string,
):
  | 'Black'
  | 'White'
  | 'Blue'
  | 'Red'
  | 'Green'
  | 'Yellow'
  | 'Brown'
  | 'Gray'
  | 'Navy'
  | 'Beige'
  | 'Purple'
  | 'Orange'
  | undefined => {
  if (!c) return undefined;
  const s = c.trim().toLowerCase();
  if (/(navy)/.test(s)) return 'Navy';
  if (/(purple|violet|lavender|lilac)/.test(s)) return 'Purple';
  if (/(blue|teal|turquoise)/.test(s)) return 'Blue';
  if (/(red|maroon|burgundy)/.test(s)) return 'Red';
  if (/(green|olive|mint)/.test(s)) return 'Green';
  if (/(yellow|gold|mustard)/.test(s)) return 'Yellow';
  if (/(orange|coral|peach)/.test(s)) return 'Orange';
  if (/(brown|tan|chocolate|camel)/.test(s)) return 'Brown';
  if (/(beige|khaki|stone|sand)/.test(s)) return 'Beige';
  if (/(gray|grey|charcoal)/.test(s)) return 'Gray';
  if (/(black|jet|ink)/.test(s)) return 'Black';
  if (/(white|ivory|cream)/.test(s)) return 'White';
  return undefined;
};

const inferOccasionTags = (
  tags: string[],
): ('Work' | 'DateNight' | 'Travel' | 'Gym')[] => {
  const up = tags.map(t => t.trim()).filter(Boolean);
  const out: ('Work' | 'DateNight' | 'Travel' | 'Gym')[] = [];
  for (const t of up) {
    const k = t.replace(/\s+/g, '').toLowerCase();
    if (k === 'work') out.push('Work');
    if (k === 'datenight' || k === 'date') out.push('DateNight');
    if (k === 'travel' || k === 'trip') out.push('Travel');
    if (k === 'gym' || k === 'training') out.push('Gym');
  }
  return out.length ? out : ['Work', 'DateNight'];
};

const inferDressCode = (
  category?: string,
  subcategory?: string,
  tags: string[] = [],
):
  | 'UltraCasual'
  | 'Casual'
  | 'SmartCasual'
  | 'BusinessCasual'
  | 'Business'
  | 'BlackTie' => {
  const all = [category, subcategory, ...tags].join(' ').toLowerCase();
  if (/tux|black ?tie/.test(all)) return 'BlackTie';
  if (/suit|blazer|oxford|dress shirt|derby|loafer|heel/.test(all))
    return 'Business';
  if (/chino|button[- ]?down|sport coat|polo|skirt|chelsea/.test(all))
    return 'BusinessCasual';
  if (/jean|tee|sneaker|hoodie|cardigan|crew/.test(all)) return 'Casual';
  return 'SmartCasual';
};

const inferAnchorRole = (tags: string[]): 'Hero' | 'Neutral' | 'Connector' => {
  const s = tags.map(t => t.toLowerCase());
  if (s.includes('pick') || s.includes('hero')) return 'Hero';
  if (s.includes('connector')) return 'Connector';
  return 'Neutral';
};

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
  const [subcategory, setSubcategory] = useState('');
  const [material, setMaterial] = useState('');
  const [fit, setFit] = useState('');
  const [size, setSize] = useState('');
  const [brand, setBrand] = useState('');
  const [pattern, setPattern] = useState('');
  const [patternScale, setPatternScale] = useState('');
  const [seasonality, setSeasonality] = useState('');
  const [layering, setLayering] = useState('');
  // ⬇️ NEW: AI loading state
  const [loadingAI, setLoadingAI] = useState(false);

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
    aiBtn: {
      ...globalStyles.buttonPrimary,
      backgroundColor: 'rgb(0,122,255)',
    },
  });

  // -------------------
  // Save Item
  // -------------------
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

      // ✨ derive 4 extra signals for backend
      const occasion_tags = inferOccasionTags(cleanedTags);
      const dress_code = inferDressCode(category, subcategory, cleanedTags);
      const anchor_role = inferAnchorRole(cleanedTags);
      const color_family = inferColorFamily(color);

      // ✅ FIXED PAYLOAD
      const payload = {
        userId: userId, // camelCase for postWardrobeItem
        image_url: publicUrl,
        objectKey: objectKey,
        gsutilUri: gsutilUri,
        name,
        category, // camelCase -> maps to main_category in backend
        subcategory,
        color,
        material,
        fit,
        size,
        brand,
        pattern,
        pattern_scale: normalizePatternScale(patternScale),
        seasonality: normalizeSeasonality(seasonality),
        layering: normalizeLayering(layering),
        tags: cleanedTags,

        // added
        dress_code,
        occasion_tags,
        anchor_role,
        color_family,
      };

      console.log('[AddItem] upload ok', {publicUrl, objectKey, gsutilUri});
      const res = await postWardrobeItem(payload);
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

  // -------------------
  // Debug Flow
  // -------------------
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

      // ✨ derive 4 extra signals for backend
      const occasion_tags = inferOccasionTags(cleanedTags);
      const dress_code = inferDressCode(category, subcategory, cleanedTags);
      const anchor_role = inferAnchorRole(cleanedTags);
      const color_family = inferColorFamily(color);

      // ✅ FIXED PAYLOAD
      const payload = {
        userId: userId,
        image_url: publicUrl,
        objectKey: objectKey,
        gsutilUri: gsutilUri,
        name,
        category,
        subcategory,
        color,
        material,
        fit,
        size,
        brand,
        pattern,
        pattern_scale: normalizePatternScale(patternScale),
        seasonality: normalizeSeasonality(seasonality),
        layering: normalizeLayering(layering),
        tags: cleanedTags,

        // added
        dress_code,
        occasion_tags,
        anchor_role,
        color_family,
      };

      console.log('[Debug] postWardrobeItem payload', payload);

      const apiRes = await postWardrobeItem(payload);
      console.log('[Debug] API response', apiRes);

      // ... (rest of your debug checks stay the same)

      const newId = apiRes?.item?.id as string;
      const newPublicUrl = apiRes?.item?.image as string; // ✅ camelCase now

      // GCS HEAD
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

      // DB LIST
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

      // Pinecone SEARCH
      let inSearch = false;
      let searchTop: Array<{id: string; score: number; modality?: string}> = [];
      try {
        const q =
          `${apiRes?.item?.color || ''} ${
            apiRes?.item?.mainCategory || ''
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

  // -------------------
  // ⬇️ NEW: AI helpers
  // -------------------
  const applyDraftToState = (draft: any) => {
    if (!draft) return;
    setName(prev => prev || draft.ai_title || '');
    setCategory(prev => prev || draft.main_category || '');
    setSubcategory(prev => prev || draft.subcategory || '');
    setColor(prev => prev || draft.color || '');
    setMaterial(prev => prev || draft.material || '');
    setFit(prev => prev || draft.fit || '');
    setSize(prev => prev || draft.size || draft.size_label || '');
    setBrand(prev => prev || draft.brand || '');
    setPattern(prev => prev || draft.pattern || '');
    setPatternScale(prev => prev || (draft.pattern_scale || '').toString());
    setSeasonality(prev => prev || draft.seasonality || '');
    setLayering(prev => prev || draft.layering || '');
    if (!tags && Array.isArray(draft.tags)) setTags(draft.tags.join(', '));
  };

  // Upload → Analyze → Prefill fields
  const handleAutoFillAI = async () => {
    if (!imageUri) {
      Alert.alert('Missing Image', 'Pick an image first.');
      return;
    }
    setLoadingAI(true);
    try {
      const filename = imageUri.split('/').pop() ?? 'upload.jpg';
      const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
        localUri: imageUri,
        filename,
        userId,
      });

      // Show the cloud URL in preview (optional)
      setImageUri(publicUrl);

      const {draft} = await analyzeImage({
        user_id: userId,
        gsutil_uri: gsutilUri,
      });
      applyDraftToState(draft);
      Alert.alert('Auto-fill complete', 'Review and tap Save Item when ready.');
    } catch (e: any) {
      console.error('[AI] auto-fill error', e?.message || e);
      Alert.alert('Auto-fill failed', e?.message || 'See console for details.');
    } finally {
      setLoadingAI(false);
    }
  };

  // One-tap: Analyze + Create + Index
  const handleOneTapSaveAI = async () => {
    if (!imageUri) {
      Alert.alert('Missing Image', 'Pick an image first.');
      return;
    }
    setLoadingAI(true);
    try {
      const filename = imageUri.split('/').pop() ?? 'upload.jpg';
      const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
        localUri: imageUri,
        filename,
        userId,
      });

      await autoCreateWithAI({
        user_id: userId,
        image_url: publicUrl,
        gsutil_uri: gsutilUri,
        name: name || undefined, // optional override
        object_key: objectKey,
      });

      navigate('Closet');
    } catch (e: any) {
      console.error('[AI] one-tap error', e?.message || e);
      Alert.alert('One-tap failed', e?.message || 'See console for details.');
    } finally {
      setLoadingAI(false);
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
          <View className={globalStyles.section3}>
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

            <Text style={styles.label}>Pattern</Text>
            <TextInput
              value={pattern}
              onChangeText={setPattern}
              style={styles.input}
              placeholder="e.g. Striped, Plaid"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Pattern Scale</Text>
            <TextInput
              value={patternScale}
              onChangeText={setPatternScale}
              style={styles.input}
              placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Seasonality</Text>
            <TextInput
              value={seasonality}
              onChangeText={setSeasonality}
              style={styles.input}
              placeholder="e.g. SS, FW, ALL_SEASON"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Layering</Text>
            <TextInput
              value={layering}
              onChangeText={setLayering}
              style={styles.input}
              placeholder="e.g. BASE, MID, SHELL, ACCENT"
              placeholderTextColor={theme.colors.muted}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                paddingHorizontal: 15,
              }}>
              {/* ⬇️ NEW: One-tap save (AI) */}
              <AppleTouchFeedback
                onPress={handleOneTapSaveAI}
                hapticStyle="impactMedium"
                style={[
                  globalStyles.buttonPrimary,
                  {width: 160, opacity: loadingAI ? 0.7 : 1},
                ]}
                disabled={!imageUri || loadingAI}>
                <Text style={globalStyles.buttonPrimaryText}>
                  {loadingAI ? 'Saving…' : 'Save Item'}
                </Text>
              </AppleTouchFeedback>

              <AppleTouchFeedback
                onPress={handleCancel}
                hapticStyle="impactLight"
                style={[styles.secondaryBtn, {width: 160}]}>
                <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
              </AppleTouchFeedback>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

//////////////////////

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
// import {listWardrobe, searchText as apiSearchText} from '../lib/wardrobe';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';

// // --- input normalizers ---
// const normalizePatternScale = (
//   raw: string,
// ): 'subtle' | 'medium' | 'bold' | undefined => {
//   if (!raw) return undefined;
//   const s = raw.trim().toLowerCase();
//   if (/^-?\d+(\.\d+)?$/.test(s)) {
//     const n = Number(s);
//     return n <= 0 ? 'subtle' : n === 1 ? 'medium' : 'bold';
//   }
//   if (['subtle', 'small', 'micro'].includes(s)) return 'subtle';
//   if (['medium', 'mid'].includes(s)) return 'medium';
//   if (['bold', 'large', 'big'].includes(s)) return 'bold';
//   return undefined;
// };

// const normalizeSeasonality = (raw: string) => {
//   if (!raw) return undefined;
//   const s = raw.trim().toLowerCase();
//   if (['ss', 'spring', 'summer', 'spring/summer', 's/s'].includes(s))
//     return 'SS';
//   if (['fw', 'fall', 'autumn', 'winter', 'fall/winter', 'f/w'].includes(s))
//     return 'FW';
//   if (
//     [
//       'all',
//       'allseason',
//       'all-season',
//       'all season',
//       'year-round',
//       'year round',
//       'all_season',
//     ].includes(s)
//   )
//     return 'ALL_SEASON';
//   return raw;
// };

// const normalizeLayering = (raw: string) => {
//   if (!raw) return undefined;
//   const s = raw.trim().toLowerCase();
//   if (['base', 'baselayer'].includes(s)) return 'BASE';
//   if (['mid', 'midlayer'].includes(s)) return 'MID';
//   if (['shell', 'outer', 'outerwear', 'jacket'].includes(s)) return 'SHELL';
//   if (['accent', 'accessory', 'acc'].includes(s)) return 'ACCENT';
//   return raw;
// };

// // --- lightweight enrichers for wow results (no UI changes) ---
// const inferColorFamily = (
//   c?: string,
// ):
//   | 'Black'
//   | 'White'
//   | 'Blue'
//   | 'Red'
//   | 'Green'
//   | 'Yellow'
//   | 'Brown'
//   | 'Gray'
//   | 'Navy'
//   | 'Beige'
//   | 'Purple'
//   | 'Orange'
//   | undefined => {
//   if (!c) return undefined;
//   const s = c.trim().toLowerCase();
//   if (/(navy)/.test(s)) return 'Navy';
//   if (/(purple|violet|lavender|lilac)/.test(s)) return 'Purple';
//   if (/(blue|teal|turquoise)/.test(s)) return 'Blue';
//   if (/(red|maroon|burgundy)/.test(s)) return 'Red';
//   if (/(green|olive|mint)/.test(s)) return 'Green';
//   if (/(yellow|gold|mustard)/.test(s)) return 'Yellow';
//   if (/(orange|coral|peach)/.test(s)) return 'Orange';
//   if (/(brown|tan|chocolate|camel)/.test(s)) return 'Brown';
//   if (/(beige|khaki|stone|sand)/.test(s)) return 'Beige';
//   if (/(gray|grey|charcoal)/.test(s)) return 'Gray';
//   if (/(black|jet|ink)/.test(s)) return 'Black';
//   if (/(white|ivory|cream)/.test(s)) return 'White';
//   return undefined;
// };

// const inferOccasionTags = (
//   tags: string[],
// ): ('Work' | 'DateNight' | 'Travel' | 'Gym')[] => {
//   const up = tags.map(t => t.trim()).filter(Boolean);
//   const out: ('Work' | 'DateNight' | 'Travel' | 'Gym')[] = [];
//   for (const t of up) {
//     const k = t.replace(/\s+/g, '').toLowerCase();
//     if (k === 'work') out.push('Work');
//     if (k === 'datenight' || k === 'date') out.push('DateNight');
//     if (k === 'travel' || k === 'trip') out.push('Travel');
//     if (k === 'gym' || k === 'training') out.push('Gym');
//   }
//   return out.length ? out : ['Work', 'DateNight'];
// };

// const inferDressCode = (
//   category?: string,
//   subcategory?: string,
//   tags: string[] = [],
// ):
//   | 'UltraCasual'
//   | 'Casual'
//   | 'SmartCasual'
//   | 'BusinessCasual'
//   | 'Business'
//   | 'BlackTie' => {
//   const all = [category, subcategory, ...tags].join(' ').toLowerCase();
//   if (/tux|black ?tie/.test(all)) return 'BlackTie';
//   if (/suit|blazer|oxford|dress shirt|derby|loafer|heel/.test(all))
//     return 'Business';
//   if (/chino|button[- ]?down|sport coat|polo|skirt|chelsea/.test(all))
//     return 'BusinessCasual';
//   if (/jean|tee|sneaker|hoodie|cardigan|crew/.test(all)) return 'Casual';
//   return 'SmartCasual';
// };

// const inferAnchorRole = (tags: string[]): 'Hero' | 'Neutral' | 'Connector' => {
//   const s = tags.map(t => t.toLowerCase());
//   if (s.includes('pick') || s.includes('hero')) return 'Hero';
//   if (s.includes('connector')) return 'Connector';
//   return 'Neutral';
// };

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
//   const [subcategory, setSubcategory] = useState('');
//   const [material, setMaterial] = useState('');
//   const [fit, setFit] = useState('');
//   const [size, setSize] = useState('');
//   const [brand, setBrand] = useState('');
//   const [pattern, setPattern] = useState('');
//   const [patternScale, setPatternScale] = useState('');
//   const [seasonality, setSeasonality] = useState('');
//   const [layering, setLayering] = useState('');
//   // ⬇️ NEW: AI loading state
//   const [loadingAI, setLoadingAI] = useState(false);

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
//     aiBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(0,122,255)',
//     },
//   });

//   // -------------------
//   // Save Item
//   // -------------------
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

//       // ✨ derive 4 extra signals for backend
//       const occasion_tags = inferOccasionTags(cleanedTags);
//       const dress_code = inferDressCode(category, subcategory, cleanedTags);
//       const anchor_role = inferAnchorRole(cleanedTags);
//       const color_family = inferColorFamily(color);

//       // ✅ FIXED PAYLOAD
//       const payload = {
//         userId: userId, // camelCase for postWardrobeItem
//         image_url: publicUrl,
//         objectKey: objectKey,
//         gsutilUri: gsutilUri,
//         name,
//         category, // camelCase -> maps to main_category in backend
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         pattern,
//         pattern_scale: normalizePatternScale(patternScale),
//         seasonality: normalizeSeasonality(seasonality),
//         layering: normalizeLayering(layering),
//         tags: cleanedTags,

//         // added
//         dress_code,
//         occasion_tags,
//         anchor_role,
//         color_family,
//       };

//       console.log('[AddItem] upload ok', {publicUrl, objectKey, gsutilUri});
//       const res = await postWardrobeItem(payload);
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

//   // -------------------
//   // Debug Flow
//   // -------------------
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

//       // ✨ derive 4 extra signals for backend
//       const occasion_tags = inferOccasionTags(cleanedTags);
//       const dress_code = inferDressCode(category, subcategory, cleanedTags);
//       const anchor_role = inferAnchorRole(cleanedTags);
//       const color_family = inferColorFamily(color);

//       // ✅ FIXED PAYLOAD
//       const payload = {
//         userId: userId,
//         image_url: publicUrl,
//         objectKey: objectKey,
//         gsutilUri: gsutilUri,
//         name,
//         category,
//         subcategory,
//         color,
//         material,
//         fit,
//         size,
//         brand,
//         pattern,
//         pattern_scale: normalizePatternScale(patternScale),
//         seasonality: normalizeSeasonality(seasonality),
//         layering: normalizeLayering(layering),
//         tags: cleanedTags,

//         // added
//         dress_code,
//         occasion_tags,
//         anchor_role,
//         color_family,
//       };

//       console.log('[Debug] postWardrobeItem payload', payload);

//       const apiRes = await postWardrobeItem(payload);
//       console.log('[Debug] API response', apiRes);

//       // ... (rest of your debug checks stay the same)

//       const newId = apiRes?.item?.id as string;
//       const newPublicUrl = apiRes?.item?.image as string; // ✅ camelCase now

//       // GCS HEAD
//       let gcsOk = false;
//       let gcsStatus = 0;
//       try {
//         const head = await fetch(newPublicUrl, {method: 'HEAD'});
//         gcsOk = head.ok;
//         gcsStatus = head.status;
//         console.log('[Check] GCS exists?', gcsOk, gcsStatus);
//       } catch (e: any) {
//         console.log('[Check] GCS failed:', e?.message || e);
//       }

//       // DB LIST
//       let inDb = false;
//       let listCount = 0;
//       try {
//         const list = await listWardrobe(userId);
//         listCount = Array.isArray(list) ? list.length : 0;
//         inDb = Array.isArray(list) && list.some((r: any) => r.id === newId);
//         console.log('[Check] DB has new row?', inDb, 'rows:', listCount);
//       } catch (e: any) {
//         console.log('[Check] DB list failed:', e?.message || e);
//       }

//       // Pinecone SEARCH
//       let inSearch = false;
//       let searchTop: Array<{id: string; score: number; modality?: string}> = [];
//       try {
//         const q =
//           `${apiRes?.item?.color || ''} ${
//             apiRes?.item?.mainCategory || ''
//           }`.trim() ||
//           apiRes?.item?.name ||
//           'new item';

//         const results = await apiSearchText(userId, q, 20);
//         searchTop = Array.isArray(results)
//           ? results
//               .map((m: any) => ({
//                 id: m.id,
//                 score: m.score,
//                 modality: m.modality,
//               }))
//               .slice(0, 10)
//           : [];
//         inSearch = searchTop.some(m => m.id === newId);
//         console.log(
//           '[Check] Pinecone has vector?',
//           inSearch,
//           'top:',
//           searchTop,
//         );
//       } catch (e: any) {
//         console.log('[Check] Pinecone search failed:', e?.message || e);
//       }

//       Alert.alert(
//         'Debug Results',
//         [
//           `GCS: ${gcsOk ? 'OK' : 'MISS'} (status ${gcsStatus || 'n/a'})`,
//           `DB: ${inDb ? 'OK' : 'MISS'} (rows ${listCount})`,
//           `Search: ${inSearch ? 'OK' : 'MISS'}${
//             searchTop.length
//               ? ` (top[0]: ${searchTop[0].id}${
//                   searchTop[0].modality ? ':' + searchTop[0].modality : ''
//                 } • ${
//                   typeof searchTop[0].score === 'number'
//                     ? searchTop[0].score.toFixed(3)
//                     : searchTop[0].score
//                 })`
//               : ''
//           }`,
//         ].join('\n'),
//       );
//     } catch (err: any) {
//       console.error('[Debug] upload error', err?.message || err);
//       Alert.alert(
//         'Debug Upload Failed',
//         err?.message || 'See console for details.',
//       );
//     }
//   };

//   // -------------------
//   // ⬇️ NEW: AI helpers
//   // -------------------
//   const applyDraftToState = (draft: any) => {
//     if (!draft) return;
//     setName(prev => prev || draft.ai_title || '');
//     setCategory(prev => prev || draft.main_category || '');
//     setSubcategory(prev => prev || draft.subcategory || '');
//     setColor(prev => prev || draft.color || '');
//     setMaterial(prev => prev || draft.material || '');
//     setFit(prev => prev || draft.fit || '');
//     setSize(prev => prev || draft.size || draft.size_label || '');
//     setBrand(prev => prev || draft.brand || '');
//     setPattern(prev => prev || draft.pattern || '');
//     setPatternScale(prev => prev || (draft.pattern_scale || '').toString());
//     setSeasonality(prev => prev || draft.seasonality || '');
//     setLayering(prev => prev || draft.layering || '');
//     if (!tags && Array.isArray(draft.tags)) setTags(draft.tags.join(', '));
//   };

//   // Upload → Analyze → Prefill fields
//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     setLoadingAI(true);
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });

//       // Show the cloud URL in preview (optional)
//       setImageUri(publicUrl);

//       const {draft} = await analyzeImage({
//         user_id: userId,
//         gsutil_uri: gsutilUri,
//       });
//       applyDraftToState(draft);
//       Alert.alert('Auto-fill complete', 'Review and tap Save Item when ready.');
//     } catch (e: any) {
//       console.error('[AI] auto-fill error', e?.message || e);
//       Alert.alert('Auto-fill failed', e?.message || 'See console for details.');
//     } finally {
//       setLoadingAI(false);
//     }
//   };

//   // One-tap: Analyze + Create + Index
//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     setLoadingAI(true);
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });

//       await autoCreateWithAI({
//         user_id: userId,
//         image_url: publicUrl,
//         gsutil_uri: gsutilUri,
//         name: name || undefined, // optional override
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     } finally {
//       setLoadingAI(false);
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
//           <View className={globalStyles.section3}>
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

//             <Text style={styles.label}>Pattern</Text>
//             <TextInput
//               value={pattern}
//               onChangeText={setPattern}
//               style={styles.input}
//               placeholder="e.g. Striped, Plaid"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Pattern Scale</Text>
//             <TextInput
//               value={patternScale}
//               onChangeText={setPatternScale}
//               style={styles.input}
//               placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Seasonality</Text>
//             <TextInput
//               value={seasonality}
//               onChangeText={setSeasonality}
//               style={styles.input}
//               placeholder="e.g. SS, FW, ALL_SEASON"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Layering</Text>
//             <TextInput
//               value={layering}
//               onChangeText={setLayering}
//               style={styles.input}
//               placeholder="e.g. BASE, MID, SHELL, ACCENT"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <View style={styles.buttonRow}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: loadingAI ? 0.7 : 1},
//                 ]}
//                 disabled={!imageUri || !name.trim() || loadingAI}>
//                 <Text style={globalStyles.buttonPrimaryText}>Save Item</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleDebugUpload}
//                 hapticStyle="impactLight"
//                 style={[
//                   styles.debugBtn,
//                   {width: 220, opacity: loadingAI ? 0.7 : 1},
//                 ]}
//                 disabled={loadingAI}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Debug: Test Upload + Checks
//                 </Text>
//               </AppleTouchFeedback>

//               {/* ⬇️ NEW: Auto-fill with AI */}
//               <AppleTouchFeedback
//                 onPress={handleAutoFillAI}
//                 hapticStyle="impactLight"
//                 style={[
//                   styles.aiBtn,
//                   {width: 200, opacity: loadingAI ? 0.7 : 1},
//                 ]}
//                 disabled={!imageUri || loadingAI}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {loadingAI ? 'Analyzing…' : 'Auto-fill with AI'}
//                 </Text>
//               </AppleTouchFeedback>

//               {/* ⬇️ NEW: One-tap save (AI) */}
//               <AppleTouchFeedback
//                 onPress={handleOneTapSaveAI}
//                 hapticStyle="impactMedium"
//                 style={[
//                   styles.debugBtn,
//                   {width: 200, opacity: loadingAI ? 0.7 : 1},
//                 ]}
//                 disabled={!imageUri || loadingAI}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {loadingAI ? 'Saving…' : 'One-tap Save (AI)'}
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }
