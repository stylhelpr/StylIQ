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
  TouchableOpacity,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
import {uploadImageToGCS} from '../api/uploadImageToGCS';
import {postWardrobeItem} from '../api/postWardrobeItem';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '@tokens/tokens';
import {ActivityIndicator} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// --- input normalizers (unchanged) ---
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

// --- lightweight enrichers (unchanged) ---
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

// Fallback name if user didn’t type one (only used in fallback path)
const autoNameFrom = (uriOrFilename: string) => {
  const base = uriOrFilename.split('/').pop() || uriOrFilename;
  const noExt = base.replace(/\.[^.]+$/, '');
  return noExt || 'Untitled';
};

// small concurrency helper
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const runners = new Array(Math.min(limit, items.length))
    .fill(null)
    .map(async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await worker(items[idx], idx);
      }
    });
  await Promise.all(runners);
  return out;
}

export default function AddItemScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {user} = useAuth0();
  const userId = useUUID();

  const insets = useSafeAreaInsets();

  if (!userId) {
    console.error('❌ UUID not available yet');
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const hSelect = () =>
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  const hSuccess = () =>
    ReactNativeHapticFeedback.trigger('notificationSuccess', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  const hWarn = () =>
    ReactNativeHapticFeedback.trigger('notificationWarning', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  // single + multi
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);

  // optional fields (applied to all in batch if provided)
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

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{done: number; total: number}>({
    done: 0,
    total: 0,
  });

  // hidden-by-default advanced fields toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      marginBottom: 8,
      backgroundColor: '#eee',
    },
    label: {...globalStyles.title},
    secondaryBtn: {
      ...globalStyles.buttonPrimary,
      backgroundColor: 'rgb(153,153,153)',
    },
    helperText: {
      color: theme.colors.foreground,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 16,
      paddingHorizontal: 12,
    },
    selectedThumbWrap: {
      width: 100,
      height: 100,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#eee',
      margin: 6,
      marginRight: '4.3%',
    },
    selectedThumb: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    selectedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.frostedGlass,
      borderRadius: 30,
      paddingVertical: 22,
    },
    advancedIconBtn: {
      alignSelf: 'flex-end',
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    advancedIconText: {
      fontSize: 18,
      color: theme.colors.muted,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
  });

  const handleSave = async () => {
    const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
    if (!selected.length) {
      Alert.alert('Missing Images', 'Please select at least one image.');
      return;
    }

    setSaving(true);
    setProgress({done: 0, total: selected.length});

    const cleanedTags = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const occasion_tags = inferOccasionTags(cleanedTags);
    const dress_code = inferDressCode(category, subcategory, cleanedTags);
    const anchor_role = inferAnchorRole(cleanedTags);
    const color_family = inferColorFamily(color);
    const mainCategory = (category?.trim() || 'Uncategorized') as string;

    try {
      // 1) Upload all to GCS
      const uploaded = await mapWithConcurrency(selected, 3, async uri => {
        const filename = uri.split('/').pop() ?? 'upload.jpg';
        const up = await uploadImageToGCS({localUri: uri, filename, userId});
        return {uri, filename, ...up};
      });

      // 2) For each uploaded image:
      let ok = 0,
        failed = 0,
        aiUsed = 0,
        fallbackUsed = 0;

      await mapWithConcurrency(uploaded, 3, async u => {
        const userProvidedName = name?.trim() || undefined;

        try {
          await autoCreateWithAI({
            user_id: userId,
            image_url: u.publicUrl,
            gsutil_uri: u.gsutilUri,
            name: userProvidedName,
            object_key: u.objectKey,
          });
          aiUsed++;
          ok++;
        } catch (e) {
          try {
            const fallbackName = userProvidedName || autoNameFrom(u.filename);
            const payload: any = {
              userId: userId,
              image_url: u.publicUrl,
              objectKey: u.objectKey,
              gsutilUri: u.gsutilUri,
              name: fallbackName,
              category: mainCategory,
              main_category: mainCategory,
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
              dress_code,
              occasion_tags,
              anchor_role,
              color_family,
            };

            await postWardrobeItem(payload);
            fallbackUsed++;
            ok++;
          } catch (e2) {
            failed++;
            console.error('[AddItem] AI+fallback failed for', u.filename, e2);
          }
        }

        setProgress(p => ({...p, done: p.done + 1}));
      });

      if (failed === 0) {
        hSuccess();
        navigate('Closet');
      } else {
        hWarn();
        Alert.alert(
          'Upload finished',
          `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
        );
      }
    } catch (err: any) {
      console.error('[AddItem] Batch save error:', err?.message || err);
      Alert.alert(
        'Upload Failed',
        err?.message || 'There was a problem uploading your items.',
      );
    } finally {
      setSaving(false);
      setProgress({done: 0, total: 0});
    }
  };

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

  const handleAutoFillAI = async () => {
    if (!imageUri) {
      Alert.alert('Missing Image', 'Pick an image first.');
      return;
    }
    try {
      const filename = imageUri.split('/').pop() ?? 'upload.jpg';
      const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
        localUri: imageUri,
        filename,
        userId,
      });
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
    }
  };

  const handleOneTapSaveAI = async () => {
    if (!imageUri) {
      Alert.alert('Missing Image', 'Pick an image first.');
      return;
    }
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
        name: name?.trim() || undefined,
        object_key: objectKey,
      });

      navigate('Closet');
    } catch (e: any) {
      console.error('[AI] one-tap error', e?.message || e);
      Alert.alert('One-tap failed', e?.message || 'See console for details.');
    }
  };

  const handleCancel = () => navigate('Closet');

  // UI — grid should always render single or multiple
  const selectedGrid = imageUris.length
    ? imageUris
    : imageUri
    ? [imageUri]
    : [];

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={{flex: 1, backgroundColor: theme.colors.background}}>
      {/* 🔹 Spacer to match your old navbar height */}
      <View
        style={{
          height: insets.top + 60, // ⬅️ same pattern as your other screens
          backgroundColor: theme.colors.background,
        }}
      />
      <ScrollView
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingBottom: 400}}>
        <View style={globalStyles.modalSection3}>
          <AppleTouchFeedback
            onPress={() => setShowAdvanced(v => !v)}
            hapticStyle="impactLight"
            style={styles.advancedIconBtn}
            disabled={false}
            accessibilityLabel={
              showAdvanced ? 'Hide optional fields' : 'Show optional fields'
            }>
            <Text style={styles.advancedIconText}>
              {showAdvanced ? '✕' : '⚙︎'}
            </Text>
          </AppleTouchFeedback>

          <View
            style={[
              globalStyles.cardStyles3,
              {backgroundColor: theme.colors.surface, borderRadius: 25},
            ]}>
            <View style={globalStyles.section3}>
              <Text
                style={[
                  globalStyles.sectionTitle,
                  {marginBottom: 16, textAlign: 'center'},
                ]}>
                Select Image(s)
              </Text>
              <ImagePickerGrid
                onSelectImage={uri => {
                  hSelect();
                  setImageUri(uri);
                  setImageUris([uri]);
                }}
                onSelectImages={uris => {
                  hSelect();
                  setImageUris(uris);
                  setImageUri(uris[0] ?? null);
                }}
              />
            </View>

            {/* ✅ Always show grid if any selection (single or multiple) */}
            {/* {selectedGrid.length > 0 && (
            <View style={styles.selectedGrid}>
              {selectedGrid.map((uri, idx) => (
                <AppleTouchFeedback
                  key={uri + idx}
                  style={styles.selectedThumbWrap}
                  hapticStyle="impactLight"
                  onPress={() => setImageUri(uri)}>
                  <Image source={{uri}} style={styles.selectedThumb} />
                </AppleTouchFeedback>
              ))}
            </View>
          )} */}

            {selectedGrid.length > 0 && (
              <View
                style={{width: '100%', alignItems: 'center', marginBottom: 16}}>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignSelf: 'center',
                    maxWidth: 340, // ✅ keeps it balanced even on iPhone SE / Mini
                    paddingVertical: 10,
                    backgroundColor: theme.colors.frostedGlass,
                    borderRadius: 24,
                  }}>
                  {selectedGrid.map((uri, idx) => (
                    <AppleTouchFeedback
                      key={uri + idx}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 10,
                        overflow: 'hidden',
                        backgroundColor: '#eee',
                        margin: 6,
                      }}
                      hapticStyle="impactLight"
                      onPress={() => setImageUri(uri)}>
                      <Image
                        source={{uri}}
                        style={{
                          width: '100%',
                          height: '100%',
                          resizeMode: 'cover',
                        }}
                      />
                    </AppleTouchFeedback>
                  ))}
                </View>
              </View>
            )}

            <View style={globalStyles.section}>
              {showAdvanced && (
                <>
                  <Text style={styles.label}>
                    Name (optional, applied to all)
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    placeholder="e.g. White Button-down"
                    placeholderTextColor={theme.colors.muted}
                  />
                  <Text style={styles.label}>
                    Category (optional, applied to all)
                  </Text>
                  <TextInput
                    value={category}
                    onChangeText={setCategory}
                    style={styles.input}
                    placeholder="e.g. Shirt, Pants"
                    placeholderTextColor={theme.colors.muted}
                  />
                  <Text style={styles.label}>
                    Color (optional, applied to all)
                  </Text>
                  <TextInput
                    value={color}
                    onChangeText={setColor}
                    style={styles.input}
                    placeholder="e.g. Navy, White"
                    placeholderTextColor={theme.colors.muted}
                  />
                  <Text style={styles.label}>
                    Tags (optional, applied to all)
                  </Text>
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
                  <Text style={styles.label}>Pattern (optional)</Text>
                  <TextInput
                    value={pattern}
                    onChangeText={setPattern}
                    style={styles.input}
                    placeholder="e.g. Striped, Plaid"
                    placeholderTextColor={theme.colors.muted}
                  />
                  <Text style={styles.label}>Pattern Scale (optional)</Text>
                  <TextInput
                    value={patternScale}
                    onChangeText={setPatternScale}
                    style={styles.input}
                    placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
                    placeholderTextColor={theme.colors.muted}
                  />
                  <Text style={styles.label}>Seasonality (optional)</Text>
                  <TextInput
                    value={seasonality}
                    onChangeText={setSeasonality}
                    style={styles.input}
                    placeholder="e.g. SS, FW, ALL_SEASON"
                    placeholderTextColor={theme.colors.muted}
                  />
                  <Text style={styles.label}>Layering (optional)</Text>
                  <TextInput
                    value={layering}
                    onChangeText={setLayering}
                    style={styles.input}
                    placeholder="e.g. BASE, MID, SHELL, ACCENT"
                    placeholderTextColor={theme.colors.muted}
                  />
                </>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center', // ✅ centers the pair in container
                  alignItems: 'center',
                  width: '100%',
                  marginTop: 8,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: 320, // ✅ total width of both buttons + spacing
                  }}>
                  <AppleTouchFeedback
                    onPress={handleSave}
                    hapticStyle="impactMedium"
                    style={[
                      globalStyles.buttonPrimary,
                      {
                        width: 155, // ✅ keep consistent button width
                        justifyContent: 'center',
                        borderRadius: 25,
                        opacity: saving ? 0.7 : 1,
                      },
                    ]}
                    disabled={saving || (!imageUri && !imageUris.length)}>
                    <Text
                      style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
                      {saving
                        ? `Uploading ${progress.done}/${progress.total}…`
                        : 'Upload All'}
                    </Text>
                  </AppleTouchFeedback>

                  <AppleTouchFeedback
                    onPress={handleCancel}
                    hapticStyle="impactLight"
                    style={[
                      styles.secondaryBtn,
                      {
                        width: 155,
                        justifyContent: 'center',
                        borderRadius: 25,
                      },
                    ]}
                    disabled={saving}>
                    <Text
                      style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
                      Cancel
                    </Text>
                  </AppleTouchFeedback>
                </View>
              </View>
            </View>
          </View>
        </View>
        {saving && (
          <View style={styles.spinnerOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.spinnerText}>Saving your changes…</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

//////////////////

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
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '@tokens/tokens';
// import {ActivityIndicator} from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

// export default function AddItemScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {user} = useAuth0();
//   const userId = useUUID();

//   const insets = useSafeAreaInsets();

//   if (!userId) {
//     console.error('❌ UUID not available yet');
//     return (
//       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//         <Text>Loading...</Text>
//       </View>
//     );
//   }

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hSuccess = () =>
//     ReactNativeHapticFeedback.trigger('notificationSuccess', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hWarn = () =>
//     ReactNativeHapticFeedback.trigger('notificationWarning', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     helperText: {
//       color: theme.colors.foreground,
//       fontSize: 13,
//       fontWeight: '600',
//       marginTop: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//     },
//     selectedThumbWrap: {
//       width: 100,
//       height: 100,
//       borderRadius: 10,
//       overflow: 'hidden',
//       backgroundColor: '#eee',
//       margin: 6,
//       marginRight: '4.3%',
//     },
//     selectedThumb: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     selectedGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       paddingHorizontal: 16,
//       marginBottom: 16,
//       backgroundColor: theme.colors.frostedGlass,
//       borderRadius: 30,
//       paddingVertical: 22,
//     },
//     advancedIconBtn: {
//       alignSelf: 'flex-end',
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 6,
//     },
//     advancedIconText: {
//       fontSize: 18,
//       color: theme.colors.muted,
//       includeFontPadding: false,
//       textAlignVertical: 'center',
//     },
//   });

//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         hSuccess();
//         navigate('Closet');
//       } else {
//         hWarn();
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined,
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   // UI — grid should always render single or multiple
//   const selectedGrid = imageUris.length
//     ? imageUris
//     : imageUri
//     ? [imageUri]
//     : [];

//   return (
//     <SafeAreaView
//       edges={['left', 'right']}
//       style={{flex: 1, backgroundColor: theme.colors.background}}>
//       {/* 🔹 Spacer to match your old navbar height */}
//       <View
//         style={{
//           height: insets.top + 60, // ⬅️ same pattern as your other screens
//           backgroundColor: theme.colors.background,
//         }}
//       />
//       <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//         <View style={globalStyles.modalSection3}>
//           <AppleTouchFeedback
//             onPress={() => setShowAdvanced(v => !v)}
//             hapticStyle="impactLight"
//             style={styles.advancedIconBtn}
//             disabled={false}
//             accessibilityLabel={
//               showAdvanced ? 'Hide optional fields' : 'Show optional fields'
//             }>
//             <Text style={styles.advancedIconText}>
//               {showAdvanced ? '✕' : '⚙︎'}
//             </Text>
//           </AppleTouchFeedback>

//           <View
//             style={[
//               globalStyles.cardStyles3,
//               {backgroundColor: theme.colors.surface, borderRadius: 25},
//             ]}>
//             <View style={globalStyles.section3}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle,
//                   {marginBottom: 16, textAlign: 'center'},
//                 ]}>
//                 Select Image(s)
//               </Text>
//               <ImagePickerGrid
//                 onSelectImage={uri => {
//                   hSelect();
//                   setImageUri(uri);
//                   setImageUris([uri]);
//                 }}
//                 onSelectImages={uris => {
//                   hSelect();
//                   setImageUris(uris);
//                   setImageUri(uris[0] ?? null);
//                 }}
//               />
//             </View>

//             {/* ✅ Always show grid if any selection (single or multiple) */}
//             {/* {selectedGrid.length > 0 && (
//             <View style={styles.selectedGrid}>
//               {selectedGrid.map((uri, idx) => (
//                 <AppleTouchFeedback
//                   key={uri + idx}
//                   style={styles.selectedThumbWrap}
//                   hapticStyle="impactLight"
//                   onPress={() => setImageUri(uri)}>
//                   <Image source={{uri}} style={styles.selectedThumb} />
//                 </AppleTouchFeedback>
//               ))}
//             </View>
//           )} */}

//             {selectedGrid.length > 0 && (
//               <View
//                 style={{width: '100%', alignItems: 'center', marginBottom: 16}}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'center',
//                     alignSelf: 'center',
//                     maxWidth: 340, // ✅ keeps it balanced even on iPhone SE / Mini
//                     paddingVertical: 10,
//                     backgroundColor: theme.colors.frostedGlass,
//                     borderRadius: 24,
//                   }}>
//                   {selectedGrid.map((uri, idx) => (
//                     <AppleTouchFeedback
//                       key={uri + idx}
//                       style={{
//                         width: 100,
//                         height: 100,
//                         borderRadius: 10,
//                         overflow: 'hidden',
//                         backgroundColor: '#eee',
//                         margin: 6,
//                       }}
//                       hapticStyle="impactLight"
//                       onPress={() => setImageUri(uri)}>
//                       <Image
//                         source={{uri}}
//                         style={{
//                           width: '100%',
//                           height: '100%',
//                           resizeMode: 'cover',
//                         }}
//                       />
//                     </AppleTouchFeedback>
//                   ))}
//                 </View>
//               </View>
//             )}

//             <View style={globalStyles.section}>
//               {showAdvanced && (
//                 <>
//                   <Text style={styles.label}>
//                     Name (optional, applied to all)
//                   </Text>
//                   <TextInput
//                     value={name}
//                     onChangeText={setName}
//                     style={styles.input}
//                     placeholder="e.g. White Button-down"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>
//                     Category (optional, applied to all)
//                   </Text>
//                   <TextInput
//                     value={category}
//                     onChangeText={setCategory}
//                     style={styles.input}
//                     placeholder="e.g. Shirt, Pants"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>
//                     Color (optional, applied to all)
//                   </Text>
//                   <TextInput
//                     value={color}
//                     onChangeText={setColor}
//                     style={styles.input}
//                     placeholder="e.g. Navy, White"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>
//                     Tags (optional, applied to all)
//                   </Text>
//                   <TextInput
//                     value={tags}
//                     onChangeText={setTags}
//                     style={styles.input}
//                     placeholder="Comma separated: casual, winter, linen"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Subcategory (optional)</Text>
//                   <TextInput
//                     value={subcategory}
//                     onChangeText={setSubcategory}
//                     style={styles.input}
//                     placeholder="e.g. Dress Shirt, Chinos"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Material (optional)</Text>
//                   <TextInput
//                     value={material}
//                     onChangeText={setMaterial}
//                     style={styles.input}
//                     placeholder="e.g. Cotton, Wool, Linen"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Fit (optional)</Text>
//                   <TextInput
//                     value={fit}
//                     onChangeText={setFit}
//                     style={styles.input}
//                     placeholder="e.g. Slim, Regular"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Size (optional)</Text>
//                   <TextInput
//                     value={size}
//                     onChangeText={setSize}
//                     style={styles.input}
//                     placeholder="e.g. M, L, 32x32"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Brand (optional)</Text>
//                   <TextInput
//                     value={brand}
//                     onChangeText={setBrand}
//                     style={styles.input}
//                     placeholder="e.g. Ferragamo"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Pattern (optional)</Text>
//                   <TextInput
//                     value={pattern}
//                     onChangeText={setPattern}
//                     style={styles.input}
//                     placeholder="e.g. Striped, Plaid"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Pattern Scale (optional)</Text>
//                   <TextInput
//                     value={patternScale}
//                     onChangeText={setPatternScale}
//                     style={styles.input}
//                     placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Seasonality (optional)</Text>
//                   <TextInput
//                     value={seasonality}
//                     onChangeText={setSeasonality}
//                     style={styles.input}
//                     placeholder="e.g. SS, FW, ALL_SEASON"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                   <Text style={styles.label}>Layering (optional)</Text>
//                   <TextInput
//                     value={layering}
//                     onChangeText={setLayering}
//                     style={styles.input}
//                     placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                     placeholderTextColor={theme.colors.muted}
//                   />
//                 </>
//               )}

//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'center', // ✅ centers the pair in container
//                   alignItems: 'center',
//                   width: '100%',
//                   marginTop: 8,
//                 }}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     justifyContent: 'space-between',
//                     width: 320, // ✅ total width of both buttons + spacing
//                   }}>
//                   <AppleTouchFeedback
//                     onPress={handleSave}
//                     hapticStyle="impactMedium"
//                     style={[
//                       globalStyles.buttonPrimary,
//                       {
//                         width: 155, // ✅ keep consistent button width
//                         justifyContent: 'center',
//                         borderRadius: 25,
//                         opacity: saving ? 0.7 : 1,
//                       },
//                     ]}
//                     disabled={saving || (!imageUri && !imageUris.length)}>
//                     <Text
//                       style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
//                       {saving
//                         ? `Uploading ${progress.done}/${progress.total}…`
//                         : 'Upload All'}
//                     </Text>
//                   </AppleTouchFeedback>

//                   <AppleTouchFeedback
//                     onPress={handleCancel}
//                     hapticStyle="impactLight"
//                     style={[
//                       styles.secondaryBtn,
//                       {
//                         width: 155,
//                         justifyContent: 'center',
//                         borderRadius: 25,
//                       },
//                     ]}
//                     disabled={saving}>
//                     <Text
//                       style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
//                       Cancel
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               </View>
//             </View>
//           </View>
//         </View>
//         {saving && (
//           <View style={styles.spinnerOverlay}>
//             <ActivityIndicator size="large" color={theme.colors.primary} />
//             <Text style={styles.spinnerText}>Saving your changes…</Text>
//           </View>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

//////////////////

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
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '@tokens/tokens';
// import {ActivityIndicator} from 'react-native';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hSuccess = () =>
//     ReactNativeHapticFeedback.trigger('notificationSuccess', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hWarn = () =>
//     ReactNativeHapticFeedback.trigger('notificationWarning', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     helperText: {
//       color: theme.colors.foreground,
//       fontSize: 13,
//       fontWeight: '600',
//       marginTop: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//     },
//     selectedThumbWrap: {
//       width: 100,
//       height: 100,
//       borderRadius: 10,
//       overflow: 'hidden',
//       backgroundColor: '#eee',
//       margin: 6,
//       marginRight: '4.3%',
//     },
//     selectedThumb: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     selectedGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       paddingHorizontal: 16,
//       marginBottom: 16,
//       backgroundColor: theme.colors.frostedGlass,
//       borderRadius: 30,
//       paddingVertical: 22,
//     },
//     advancedIconBtn: {
//       alignSelf: 'flex-end',
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 6,
//     },
//     advancedIconText: {
//       fontSize: 18,
//       color: theme.colors.muted,
//       includeFontPadding: false,
//       textAlignVertical: 'center',
//     },
//   });

//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         hSuccess();
//         navigate('Closet');
//       } else {
//         hWarn();
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined,
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   // UI — grid should always render single or multiple
//   const selectedGrid = imageUris.length
//     ? imageUris
//     : imageUri
//     ? [imageUri]
//     : [];

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         <AppleTouchFeedback
//           onPress={() => setShowAdvanced(v => !v)}
//           hapticStyle="impactLight"
//           style={styles.advancedIconBtn}
//           disabled={false}
//           accessibilityLabel={
//             showAdvanced ? 'Hide optional fields' : 'Show optional fields'
//           }>
//           <Text style={styles.advancedIconText}>
//             {showAdvanced ? '✕' : '⚙︎'}
//           </Text>
//         </AppleTouchFeedback>

//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {backgroundColor: theme.colors.surface, borderRadius: 25},
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {marginBottom: 16, textAlign: 'center'},
//               ]}>
//               Select Image(s)
//             </Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 hSelect();
//                 setImageUri(uri);
//                 setImageUris([uri]);
//               }}
//               onSelectImages={uris => {
//                 hSelect();
//                 setImageUris(uris);
//                 setImageUri(uris[0] ?? null);
//               }}
//             />
//           </View>

//           {/* ✅ Always show grid if any selection (single or multiple) */}
//           {/* {selectedGrid.length > 0 && (
//             <View style={styles.selectedGrid}>
//               {selectedGrid.map((uri, idx) => (
//                 <AppleTouchFeedback
//                   key={uri + idx}
//                   style={styles.selectedThumbWrap}
//                   hapticStyle="impactLight"
//                   onPress={() => setImageUri(uri)}>
//                   <Image source={{uri}} style={styles.selectedThumb} />
//                 </AppleTouchFeedback>
//               ))}
//             </View>
//           )} */}

//           {selectedGrid.length > 0 && (
//             <View
//               style={{width: '100%', alignItems: 'center', marginBottom: 16}}>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'center',
//                   alignSelf: 'center',
//                   maxWidth: 340, // ✅ keeps it balanced even on iPhone SE / Mini
//                   paddingVertical: 10,
//                   backgroundColor: theme.colors.frostedGlass,
//                   borderRadius: 24,
//                 }}>
//                 {selectedGrid.map((uri, idx) => (
//                   <AppleTouchFeedback
//                     key={uri + idx}
//                     style={{
//                       width: 100,
//                       height: 100,
//                       borderRadius: 10,
//                       overflow: 'hidden',
//                       backgroundColor: '#eee',
//                       margin: 6,
//                     }}
//                     hapticStyle="impactLight"
//                     onPress={() => setImageUri(uri)}>
//                     <Image
//                       source={{uri}}
//                       style={{
//                         width: '100%',
//                         height: '100%',
//                         resizeMode: 'cover',
//                       }}
//                     />
//                   </AppleTouchFeedback>
//                 ))}
//               </View>
//             </View>
//           )}

//           <View style={globalStyles.section}>
//             {showAdvanced && (
//               <>
//                 <Text style={styles.label}>
//                   Name (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={styles.input}
//                   placeholder="e.g. White Button-down"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Category (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={category}
//                   onChangeText={setCategory}
//                   style={styles.input}
//                   placeholder="e.g. Shirt, Pants"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Color (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={color}
//                   onChangeText={setColor}
//                   style={styles.input}
//                   placeholder="e.g. Navy, White"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Tags (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={tags}
//                   onChangeText={setTags}
//                   style={styles.input}
//                   placeholder="Comma separated: casual, winter, linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Subcategory (optional)</Text>
//                 <TextInput
//                   value={subcategory}
//                   onChangeText={setSubcategory}
//                   style={styles.input}
//                   placeholder="e.g. Dress Shirt, Chinos"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Material (optional)</Text>
//                 <TextInput
//                   value={material}
//                   onChangeText={setMaterial}
//                   style={styles.input}
//                   placeholder="e.g. Cotton, Wool, Linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Fit (optional)</Text>
//                 <TextInput
//                   value={fit}
//                   onChangeText={setFit}
//                   style={styles.input}
//                   placeholder="e.g. Slim, Regular"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Size (optional)</Text>
//                 <TextInput
//                   value={size}
//                   onChangeText={setSize}
//                   style={styles.input}
//                   placeholder="e.g. M, L, 32x32"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Brand (optional)</Text>
//                 <TextInput
//                   value={brand}
//                   onChangeText={setBrand}
//                   style={styles.input}
//                   placeholder="e.g. Ferragamo"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Pattern (optional)</Text>
//                 <TextInput
//                   value={pattern}
//                   onChangeText={setPattern}
//                   style={styles.input}
//                   placeholder="e.g. Striped, Plaid"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Pattern Scale (optional)</Text>
//                 <TextInput
//                   value={patternScale}
//                   onChangeText={setPatternScale}
//                   style={styles.input}
//                   placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Seasonality (optional)</Text>
//                 <TextInput
//                   value={seasonality}
//                   onChangeText={setSeasonality}
//                   style={styles.input}
//                   placeholder="e.g. SS, FW, ALL_SEASON"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Layering (optional)</Text>
//                 <TextInput
//                   value={layering}
//                   onChangeText={setLayering}
//                   style={styles.input}
//                   placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//               </>
//             )}

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'center', // ✅ centers the pair in container
//                 alignItems: 'center',
//                 width: '100%',
//                 marginTop: 8,
//               }}>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'space-between',
//                   width: 320, // ✅ total width of both buttons + spacing
//                 }}>
//                 <AppleTouchFeedback
//                   onPress={handleSave}
//                   hapticStyle="impactMedium"
//                   style={[
//                     globalStyles.buttonPrimary,
//                     {
//                       width: 155, // ✅ keep consistent button width
//                       justifyContent: 'center',
//                       borderRadius: 25,
//                       opacity: saving ? 0.7 : 1,
//                     },
//                   ]}
//                   disabled={saving || (!imageUri && !imageUris.length)}>
//                   <Text
//                     style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
//                     {saving
//                       ? `Uploading ${progress.done}/${progress.total}…`
//                       : 'Upload All'}
//                   </Text>
//                 </AppleTouchFeedback>

//                 <AppleTouchFeedback
//                   onPress={handleCancel}
//                   hapticStyle="impactLight"
//                   style={[
//                     styles.secondaryBtn,
//                     {
//                       width: 155,
//                       justifyContent: 'center',
//                       borderRadius: 25,
//                     },
//                   ]}
//                   disabled={saving}>
//                   <Text
//                     style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
//                     Cancel
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         </View>
//       </View>
//       {saving && (
//         <View style={styles.spinnerOverlay}>
//           <ActivityIndicator size="large" color={theme.colors.primary} />
//           <Text style={styles.spinnerText}>Saving your changes…</Text>
//         </View>
//       )}
//     </ScrollView>
//   );
// }

/////////////////////

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
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '@tokens/tokens';
// import {ActivityIndicator} from 'react-native';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hSuccess = () =>
//     ReactNativeHapticFeedback.trigger('notificationSuccess', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hWarn = () =>
//     ReactNativeHapticFeedback.trigger('notificationWarning', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     helperText: {
//       color: theme.colors.foreground,
//       fontSize: 13,
//       fontWeight: '600',
//       marginTop: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//     },
//     selectedThumbWrap: {
//       width: 100,
//       height: 100,
//       borderRadius: 10,
//       overflow: 'hidden',
//       backgroundColor: '#eee',
//       margin: 6,
//       marginRight: '4.3%',
//     },
//     selectedThumb: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     selectedGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       paddingHorizontal: 16,
//       marginBottom: 16,
//       backgroundColor: theme.colors.frostedGlass,
//       borderRadius: 30,
//       paddingVertical: 22,
//     },
//     advancedIconBtn: {
//       alignSelf: 'flex-end',
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 6,
//     },
//     advancedIconText: {
//       fontSize: 18,
//       color: theme.colors.muted,
//       includeFontPadding: false,
//       textAlignVertical: 'center',
//     },
//   });

//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         hSuccess();
//         navigate('Closet');
//       } else {
//         hWarn();
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined,
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   // UI — grid should always render single or multiple
//   const selectedGrid = imageUris.length
//     ? imageUris
//     : imageUri
//     ? [imageUri]
//     : [];

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         <AppleTouchFeedback
//           onPress={() => setShowAdvanced(v => !v)}
//           hapticStyle="impactLight"
//           style={styles.advancedIconBtn}
//           disabled={false}
//           accessibilityLabel={
//             showAdvanced ? 'Hide optional fields' : 'Show optional fields'
//           }>
//           <Text style={styles.advancedIconText}>
//             {showAdvanced ? '✕' : '⚙︎'}
//           </Text>
//         </AppleTouchFeedback>

//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {backgroundColor: theme.colors.surface, borderRadius: 25},
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {marginBottom: 16, textAlign: 'center'},
//               ]}>
//               Select Image(s)
//             </Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 hSelect();
//                 setImageUri(uri);
//                 setImageUris([uri]);
//               }}
//               onSelectImages={uris => {
//                 hSelect();
//                 setImageUris(uris);
//                 setImageUri(uris[0] ?? null);
//               }}
//             />
//           </View>

//           {/* ✅ Always show grid if any selection (single or multiple) */}
//           {selectedGrid.length > 0 && (
//             <View style={styles.selectedGrid}>
//               {selectedGrid.map((uri, idx) => (
//                 <AppleTouchFeedback
//                   key={uri + idx}
//                   style={styles.selectedThumbWrap}
//                   hapticStyle="impactLight"
//                   onPress={() => setImageUri(uri)}>
//                   <Image source={{uri}} style={styles.selectedThumb} />
//                 </AppleTouchFeedback>
//               ))}
//             </View>
//           )}

//           <View style={globalStyles.section}>
//             {showAdvanced && (
//               <>
//                 <Text style={styles.label}>
//                   Name (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={styles.input}
//                   placeholder="e.g. White Button-down"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Category (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={category}
//                   onChangeText={setCategory}
//                   style={styles.input}
//                   placeholder="e.g. Shirt, Pants"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Color (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={color}
//                   onChangeText={setColor}
//                   style={styles.input}
//                   placeholder="e.g. Navy, White"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Tags (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={tags}
//                   onChangeText={setTags}
//                   style={styles.input}
//                   placeholder="Comma separated: casual, winter, linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Subcategory (optional)</Text>
//                 <TextInput
//                   value={subcategory}
//                   onChangeText={setSubcategory}
//                   style={styles.input}
//                   placeholder="e.g. Dress Shirt, Chinos"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Material (optional)</Text>
//                 <TextInput
//                   value={material}
//                   onChangeText={setMaterial}
//                   style={styles.input}
//                   placeholder="e.g. Cotton, Wool, Linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Fit (optional)</Text>
//                 <TextInput
//                   value={fit}
//                   onChangeText={setFit}
//                   style={styles.input}
//                   placeholder="e.g. Slim, Regular"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Size (optional)</Text>
//                 <TextInput
//                   value={size}
//                   onChangeText={setSize}
//                   style={styles.input}
//                   placeholder="e.g. M, L, 32x32"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Brand (optional)</Text>
//                 <TextInput
//                   value={brand}
//                   onChangeText={setBrand}
//                   style={styles.input}
//                   placeholder="e.g. Ferragamo"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Pattern (optional)</Text>
//                 <TextInput
//                   value={pattern}
//                   onChangeText={setPattern}
//                   style={styles.input}
//                   placeholder="e.g. Striped, Plaid"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Pattern Scale (optional)</Text>
//                 <TextInput
//                   value={patternScale}
//                   onChangeText={setPatternScale}
//                   style={styles.input}
//                   placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Seasonality (optional)</Text>
//                 <TextInput
//                   value={seasonality}
//                   onChangeText={setSeasonality}
//                   style={styles.input}
//                   placeholder="e.g. SS, FW, ALL_SEASON"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Layering (optional)</Text>
//                 <TextInput
//                   value={layering}
//                   onChangeText={setLayering}
//                   style={styles.input}
//                   placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//               </>
//             )}

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'center', // ✅ centers the pair in container
//                 alignItems: 'center',
//                 width: '100%',
//                 marginTop: 8,
//               }}>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'space-between',
//                   width: 320, // ✅ total width of both buttons + spacing
//                 }}>
//                 <AppleTouchFeedback
//                   onPress={handleSave}
//                   hapticStyle="impactMedium"
//                   style={[
//                     globalStyles.buttonPrimary,
//                     {
//                       width: 155, // ✅ keep consistent button width
//                       justifyContent: 'center',
//                       borderRadius: 25,
//                       opacity: saving ? 0.7 : 1,
//                     },
//                   ]}
//                   disabled={saving || (!imageUri && !imageUris.length)}>
//                   <Text
//                     style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
//                     {saving
//                       ? `Uploading ${progress.done}/${progress.total}…`
//                       : 'Upload All'}
//                   </Text>
//                 </AppleTouchFeedback>

//                 <AppleTouchFeedback
//                   onPress={handleCancel}
//                   hapticStyle="impactLight"
//                   style={[
//                     styles.secondaryBtn,
//                     {
//                       width: 155,
//                       justifyContent: 'center',
//                       borderRadius: 25,
//                     },
//                   ]}
//                   disabled={saving}>
//                   <Text
//                     style={[globalStyles.buttonPrimaryText, {fontSize: 15}]}>
//                     Cancel
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         </View>
//       </View>
//       {saving && (
//         <View style={styles.spinnerOverlay}>
//           <ActivityIndicator size="large" color={theme.colors.primary} />
//           <Text style={styles.spinnerText}>Saving your changes…</Text>
//         </View>
//       )}
//     </ScrollView>
//   );
// }

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
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '@tokens/tokens';
// import {ActivityIndicator} from 'react-native';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hSuccess = () =>
//     ReactNativeHapticFeedback.trigger('notificationSuccess', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hWarn = () =>
//     ReactNativeHapticFeedback.trigger('notificationWarning', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     helperText: {
//       color: theme.colors.foreground,
//       fontSize: 13,
//       fontWeight: '600',
//       marginTop: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//     },
//     selectedThumbWrap: {
//       width: 100,
//       height: 100,
//       borderRadius: 10,
//       overflow: 'hidden',
//       backgroundColor: '#eee',
//       margin: 6,
//       marginRight: '4.3%',
//     },
//     selectedThumb: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     selectedGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       paddingHorizontal: 16,
//       marginBottom: 16,
//       backgroundColor: theme.colors.frostedGlass,
//       borderRadius: 30,
//       paddingVertical: 22,
//     },
//     advancedIconBtn: {
//       alignSelf: 'flex-end',
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 6,
//     },
//     advancedIconText: {
//       fontSize: 18,
//       color: theme.colors.muted,
//       includeFontPadding: false,
//       textAlignVertical: 'center',
//     },
//   });

//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         hSuccess();
//         navigate('Closet');
//       } else {
//         hWarn();
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined,
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   // UI — grid should always render single or multiple
//   const selectedGrid = imageUris.length
//     ? imageUris
//     : imageUri
//     ? [imageUri]
//     : [];

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         <AppleTouchFeedback
//           onPress={() => setShowAdvanced(v => !v)}
//           hapticStyle="impactLight"
//           style={styles.advancedIconBtn}
//           disabled={false}
//           accessibilityLabel={
//             showAdvanced ? 'Hide optional fields' : 'Show optional fields'
//           }>
//           <Text style={styles.advancedIconText}>
//             {showAdvanced ? '✕' : '⚙︎'}
//           </Text>
//         </AppleTouchFeedback>

//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {backgroundColor: theme.colors.surface, borderRadius: 25},
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {marginBottom: 16, textAlign: 'center'},
//               ]}>
//               Select Image(s)
//             </Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 hSelect();
//                 setImageUri(uri);
//                 setImageUris([uri]);
//               }}
//               onSelectImages={uris => {
//                 hSelect();
//                 setImageUris(uris);
//                 setImageUri(uris[0] ?? null);
//               }}
//             />
//           </View>

//           {/* ✅ Always show grid if any selection (single or multiple) */}
//           {selectedGrid.length > 0 && (
//             <View style={styles.selectedGrid}>
//               {selectedGrid.map((uri, idx) => (
//                 <AppleTouchFeedback
//                   key={uri + idx}
//                   style={styles.selectedThumbWrap}
//                   hapticStyle="impactLight"
//                   onPress={() => setImageUri(uri)}>
//                   <Image source={{uri}} style={styles.selectedThumb} />
//                 </AppleTouchFeedback>
//               ))}
//             </View>
//           )}

//           <View style={globalStyles.section}>
//             {showAdvanced && (
//               <>
//                 <Text style={styles.label}>
//                   Name (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={styles.input}
//                   placeholder="e.g. White Button-down"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Category (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={category}
//                   onChangeText={setCategory}
//                   style={styles.input}
//                   placeholder="e.g. Shirt, Pants"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Color (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={color}
//                   onChangeText={setColor}
//                   style={styles.input}
//                   placeholder="e.g. Navy, White"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>
//                   Tags (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={tags}
//                   onChangeText={setTags}
//                   style={styles.input}
//                   placeholder="Comma separated: casual, winter, linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Subcategory (optional)</Text>
//                 <TextInput
//                   value={subcategory}
//                   onChangeText={setSubcategory}
//                   style={styles.input}
//                   placeholder="e.g. Dress Shirt, Chinos"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Material (optional)</Text>
//                 <TextInput
//                   value={material}
//                   onChangeText={setMaterial}
//                   style={styles.input}
//                   placeholder="e.g. Cotton, Wool, Linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Fit (optional)</Text>
//                 <TextInput
//                   value={fit}
//                   onChangeText={setFit}
//                   style={styles.input}
//                   placeholder="e.g. Slim, Regular"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Size (optional)</Text>
//                 <TextInput
//                   value={size}
//                   onChangeText={setSize}
//                   style={styles.input}
//                   placeholder="e.g. M, L, 32x32"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Brand (optional)</Text>
//                 <TextInput
//                   value={brand}
//                   onChangeText={setBrand}
//                   style={styles.input}
//                   placeholder="e.g. Ferragamo"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Pattern (optional)</Text>
//                 <TextInput
//                   value={pattern}
//                   onChangeText={setPattern}
//                   style={styles.input}
//                   placeholder="e.g. Striped, Plaid"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Pattern Scale (optional)</Text>
//                 <TextInput
//                   value={patternScale}
//                   onChangeText={setPatternScale}
//                   style={styles.input}
//                   placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Seasonality (optional)</Text>
//                 <TextInput
//                   value={seasonality}
//                   onChangeText={setSeasonality}
//                   style={styles.input}
//                   placeholder="e.g. SS, FW, ALL_SEASON"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//                 <Text style={styles.label}>Layering (optional)</Text>
//                 <TextInput
//                   value={layering}
//                   onChangeText={setLayering}
//                   style={styles.input}
//                   placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//               </>
//             )}

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//                 marginTop: 8,
//               }}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: saving ? 0.7 : 1},
//                 ]}
//                 disabled={saving || (!imageUri && !imageUris.length)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {saving
//                     ? `Uploading ${progress.done}/${progress.total}…`
//                     : 'Upload All'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}
//                 disabled={saving}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//       {saving && (
//         <View style={styles.spinnerOverlay}>
//           <ActivityIndicator size="large" color={theme.colors.primary} />
//           <Text style={styles.spinnerText}>Saving your changes…</Text>
//         </View>
//       )}
//     </ScrollView>
//   );
// }

/////////////////

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
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '@tokens/tokens';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hSuccess = () =>
//     ReactNativeHapticFeedback.trigger('notificationSuccess', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hWarn = () =>
//     ReactNativeHapticFeedback.trigger('notificationWarning', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     helperText: {
//       color: theme.colors.foreground,
//       fontSize: 13,
//       fontWeight: '600',
//       marginTop: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//     },
//     selectedThumbWrap: {
//       width: 100, // ✅ fixed width
//       height: 100, // ✅ fixed height
//       borderRadius: 10,
//       overflow: 'hidden',
//       backgroundColor: '#eee',
//       margin: 6, // ✅ consistent spacing
//       marginRight: '4.3%',
//     },
//     selectedThumb: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover', // ✅ fills the square consistently
//     },
//     selectedGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start', // ✅ keep left alignment base
//       paddingHorizontal: 16,
//       marginBottom: 16,
//       backgroundColor: theme.colors.frostedGlass,
//       borderRadius: 30,
//       paddingVertical: 22,
//     },
//     advancedIconBtn: {
//       alignSelf: 'flex-end',
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 6,
//     },
//     advancedIconText: {
//       fontSize: 18,
//       color: theme.colors.muted,
//       includeFontPadding: false,
//       textAlignVertical: 'center',
//     },
//   });

//   // -------------------
//   // Save Item(s) — AI per image (rich), fallback to manual payload
//   // -------------------
//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     // Shared metadata for fallback only (AI path ignores these unless user typed a name)
//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         // Only send name if user typed one; otherwise let AI title it richly
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           // Fallback to manual post with your original derivations
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         hSuccess();
//         navigate('Closet');
//       } else {
//         hWarn();
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

//   // ---- AI helpers (single-image optional flows) ----
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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined, // keep same rule for single
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   // UI — preview zone
//   const hasMany = imageUris.length > 1;

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         {/* Tiny icon to toggle optional inputs */}
//         <AppleTouchFeedback
//           onPress={() => setShowAdvanced(v => !v)}
//           hapticStyle="impactLight"
//           style={styles.advancedIconBtn}
//           disabled={false}
//           accessibilityLabel={
//             showAdvanced ? 'Hide optional fields' : 'Show optional fields'
//           }>
//           <Text style={styles.advancedIconText}>
//             {showAdvanced ? '✕' : '⚙︎'}
//           </Text>
//         </AppleTouchFeedback>
//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {backgroundColor: theme.colors.surface, borderRadius: 25},
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {marginBottom: 16, textAlign: 'center'},
//               ]}>
//               Select Image(s)
//             </Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 hSelect();
//                 setImageUri(uri);
//                 setImageUris([uri]); // single selection
//               }}
//               onSelectImages={uris => {
//                 hSelect();
//                 setImageUris(uris); // batch selection
//                 setImageUri(uris[0] ?? null);
//               }}
//             />
//           </View>

//           {/* Preview: show grid for multiple, large preview for single */}
//           {hasMany ? (
//             <View style={styles.selectedGrid}>
//               {imageUris.map((uri, idx) => (
//                 <AppleTouchFeedback
//                   key={uri + idx}
//                   style={styles.selectedThumbWrap}
//                   hapticStyle="impactLight"
//                   onPress={() => setImageUri(uri)}>
//                   <Image
//                     source={{uri}}
//                     style={styles.selectedThumb}
//                     resizeMode="cover"
//                   />
//                 </AppleTouchFeedback>
//               ))}
//               <Text style={styles.helperText}>
//                 “We’ll automatically generate metadata for all of your images
//                 now. After this process finishes, you can tap any image
//                 individually to review or further edit its details.”
//               </Text>
//             </View>
//           ) : (
//             imageUri && (
//               <>
//                 {/* <Image
//                   source={{uri: imageUri}}
//                   style={styles.imagePreview}
//                   resizeMode="cover"
//                 /> */}
//               </>
//             )
//           )}

//           <View style={globalStyles.section}>
//             {/* Optional fields — rendered only when expanded */}
//             {showAdvanced && (
//               <>
//                 <Text style={styles.label}>
//                   Name (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={styles.input}
//                   placeholder="e.g. White Button-down"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Category (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={category}
//                   onChangeText={setCategory}
//                   style={styles.input}
//                   placeholder="e.g. Shirt, Pants"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Color (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={color}
//                   onChangeText={setColor}
//                   style={styles.input}
//                   placeholder="e.g. Navy, White"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Tags (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={tags}
//                   onChangeText={setTags}
//                   style={styles.input}
//                   placeholder="Comma separated: casual, winter, linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 {/* Advanced optional fields */}
//                 <Text style={styles.label}>Subcategory (optional)</Text>
//                 <TextInput
//                   value={subcategory}
//                   onChangeText={setSubcategory}
//                   style={styles.input}
//                   placeholder="e.g. Dress Shirt, Chinos"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Material (optional)</Text>
//                 <TextInput
//                   value={material}
//                   onChangeText={setMaterial}
//                   style={styles.input}
//                   placeholder="e.g. Cotton, Wool, Linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Fit (optional)</Text>
//                 <TextInput
//                   value={fit}
//                   onChangeText={setFit}
//                   style={styles.input}
//                   placeholder="e.g. Slim, Regular"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Size (optional)</Text>
//                 <TextInput
//                   value={size}
//                   onChangeText={setSize}
//                   style={styles.input}
//                   placeholder="e.g. M, L, 32x32"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Brand (optional)</Text>
//                 <TextInput
//                   value={brand}
//                   onChangeText={setBrand}
//                   style={styles.input}
//                   placeholder="e.g. Ferragamo"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern (optional)</Text>
//                 <TextInput
//                   value={pattern}
//                   onChangeText={setPattern}
//                   style={styles.input}
//                   placeholder="e.g. Striped, Plaid"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern Scale (optional)</Text>
//                 <TextInput
//                   value={patternScale}
//                   onChangeText={setPatternScale}
//                   style={styles.input}
//                   placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Seasonality (optional)</Text>
//                 <TextInput
//                   value={seasonality}
//                   onChangeText={setSeasonality}
//                   style={styles.input}
//                   placeholder="e.g. SS, FW, ALL_SEASON"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Layering (optional)</Text>
//                 <TextInput
//                   value={layering}
//                   onChangeText={setLayering}
//                   style={styles.input}
//                   placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//               </>
//             )}

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//                 marginTop: 8,
//               }}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: saving ? 0.7 : 1},
//                 ]}
//                 disabled={saving || (!imageUri && !imageUris.length)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {saving
//                     ? `Uploading ${progress.done}/${progress.total}…`
//                     : 'Upload All'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}
//                 disabled={saving}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

////////////////////////

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
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hSuccess = () =>
//     ReactNativeHapticFeedback.trigger('notificationSuccess', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const hWarn = () =>
//     ReactNativeHapticFeedback.trigger('notificationWarning', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     helperText: {
//       color: theme.colors.muted,
//       fontSize: 13,
//       marginTop: 0,
//       marginBottom: 8,
//       paddingHorizontal: 12,
//     },
//     // grid for selected thumbnails (multi)
//     selectedGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       marginBottom: 8,
//       paddingHorizontal: 16,
//     },
//     selectedThumbWrap: {
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     selectedThumb: {
//       width: 88,
//       height: 88,
//       borderRadius: 10,
//       backgroundColor: '#eee',
//     },

//     // tiny icon toggle for advanced fields
//     advancedIconBtn: {
//       alignSelf: 'flex-end',
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 6,
//     },
//     advancedIconText: {
//       fontSize: 18,
//       color: theme.colors.muted,
//       includeFontPadding: false,
//       textAlignVertical: 'center',
//     },
//   });

//   // -------------------
//   // Save Item(s) — AI per image (rich), fallback to manual payload
//   // -------------------
//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     // Shared metadata for fallback only (AI path ignores these unless user typed a name)
//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         // Only send name if user typed one; otherwise let AI title it richly
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           // Fallback to manual post with your original derivations
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         hSuccess();
//         navigate('Closet');
//       } else {
//         hWarn();
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

//   // ---- AI helpers (single-image optional flows) ----
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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined, // keep same rule for single
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   // UI — preview zone
//   const hasMany = imageUris.length > 1;

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         {/* Tiny icon to toggle optional inputs */}
//         <AppleTouchFeedback
//           onPress={() => setShowAdvanced(v => !v)}
//           hapticStyle="impactLight"
//           style={styles.advancedIconBtn}
//           disabled={false}
//           accessibilityLabel={
//             showAdvanced ? 'Hide optional fields' : 'Show optional fields'
//           }>
//           <Text style={styles.advancedIconText}>
//             {showAdvanced ? '✕' : '⚙︎'}
//           </Text>
//         </AppleTouchFeedback>
//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {backgroundColor: theme.colors.surface, borderRadius: 25},
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text style={[globalStyles.sectionTitle, {marginBottom: 12}]}>
//               Select Image(s)
//             </Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 hSelect();
//                 setImageUri(uri);
//                 setImageUris([uri]); // single selection
//               }}
//               onSelectImages={uris => {
//                 hSelect();
//                 setImageUris(uris); // batch selection
//                 setImageUri(uris[0] ?? null);
//               }}
//             />
//           </View>

//           {/* Preview: show grid for multiple, large preview for single */}
//           {hasMany ? (
//             <View style={styles.selectedGrid}>
//               {imageUris.map((uri, idx) => (
//                 <AppleTouchFeedback
//                   key={uri + idx}
//                   style={styles.selectedThumbWrap}
//                   hapticStyle="impactLight"
//                   onPress={() => setImageUri(uri)}>
//                   <Image
//                     source={{uri}}
//                     style={styles.selectedThumb}
//                     resizeMode="cover"
//                   />
//                 </AppleTouchFeedback>
//               ))}
//               <Text style={styles.helperText}>
//                 We’ll auto-fill metadata. You can edit later from the item
//                 screen, or tap the tiny gear to reveal optional fields.
//               </Text>
//             </View>
//           ) : (
//             imageUri && (
//               <>
//                 {/* <Image
//                   source={{uri: imageUri}}
//                   style={styles.imagePreview}
//                   resizeMode="cover"
//                 /> */}
//                 <Text style={styles.helperText}>
//                   We’ll auto-fill metadata. You can edit later from the item
//                   screen, or tap the tiny gear to reveal optional fields.
//                 </Text>
//               </>
//             )
//           )}

//           <View style={globalStyles.section}>
//             {/* Optional fields — rendered only when expanded */}
//             {showAdvanced && (
//               <>
//                 <Text style={styles.label}>
//                   Name (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={styles.input}
//                   placeholder="e.g. White Button-down"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Category (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={category}
//                   onChangeText={setCategory}
//                   style={styles.input}
//                   placeholder="e.g. Shirt, Pants"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Color (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={color}
//                   onChangeText={setColor}
//                   style={styles.input}
//                   placeholder="e.g. Navy, White"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Tags (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={tags}
//                   onChangeText={setTags}
//                   style={styles.input}
//                   placeholder="Comma separated: casual, winter, linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 {/* Advanced optional fields */}
//                 <Text style={styles.label}>Subcategory (optional)</Text>
//                 <TextInput
//                   value={subcategory}
//                   onChangeText={setSubcategory}
//                   style={styles.input}
//                   placeholder="e.g. Dress Shirt, Chinos"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Material (optional)</Text>
//                 <TextInput
//                   value={material}
//                   onChangeText={setMaterial}
//                   style={styles.input}
//                   placeholder="e.g. Cotton, Wool, Linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Fit (optional)</Text>
//                 <TextInput
//                   value={fit}
//                   onChangeText={setFit}
//                   style={styles.input}
//                   placeholder="e.g. Slim, Regular"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Size (optional)</Text>
//                 <TextInput
//                   value={size}
//                   onChangeText={setSize}
//                   style={styles.input}
//                   placeholder="e.g. M, L, 32x32"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Brand (optional)</Text>
//                 <TextInput
//                   value={brand}
//                   onChangeText={setBrand}
//                   style={styles.input}
//                   placeholder="e.g. Ferragamo"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern (optional)</Text>
//                 <TextInput
//                   value={pattern}
//                   onChangeText={setPattern}
//                   style={styles.input}
//                   placeholder="e.g. Striped, Plaid"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern Scale (optional)</Text>
//                 <TextInput
//                   value={patternScale}
//                   onChangeText={setPatternScale}
//                   style={styles.input}
//                   placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Seasonality (optional)</Text>
//                 <TextInput
//                   value={seasonality}
//                   onChangeText={setSeasonality}
//                   style={styles.input}
//                   placeholder="e.g. SS, FW, ALL_SEASON"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Layering (optional)</Text>
//                 <TextInput
//                   value={layering}
//                   onChangeText={setLayering}
//                   style={styles.input}
//                   placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//               </>
//             )}

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//                 marginTop: 8,
//               }}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: saving ? 0.7 : 1},
//                 ]}
//                 disabled={saving || (!imageUri && !imageUris.length)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {saving
//                     ? `Uploading ${progress.done}/${progress.total}…`
//                     : 'Upload All'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}
//                 disabled={saving}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

/////////////////////

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
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import ImagePickerGrid from '../components/ImagePickerGrid/ImagePickerGrid';
// import {uploadImageToGCS} from '../api/uploadImageToGCS';
// import {postWardrobeItem} from '../api/postWardrobeItem';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     helperText: {
//       color: theme.colors.muted,
//       fontSize: 13,
//       marginBottom: 8,
//     },
//     // grid for selected thumbnails (multi)
//     selectedGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       marginBottom: 8,
//       paddingHorizontal: 16,
//     },
//     selectedThumbWrap: {
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     selectedThumb: {
//       width: 88,
//       height: 88,
//       borderRadius: 10,
//       backgroundColor: '#eee',
//     },

//     // tiny icon toggle for advanced fields
//     advancedIconBtn: {
//       alignSelf: 'flex-end',
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 6,
//     },
//     advancedIconText: {
//       fontSize: 18,
//       color: theme.colors.muted,
//       includeFontPadding: false,
//       textAlignVertical: 'center',
//     },
//   });

//   // -------------------
//   // Save Item(s) — AI per image (rich), fallback to manual payload
//   // -------------------
//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     // Shared metadata for fallback only (AI path ignores these unless user typed a name)
//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         // Only send name if user typed one; otherwise let AI title it richly
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           // Fallback to manual post with your original derivations
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         navigate('Closet');
//       } else {
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

//   // ---- AI helpers (single-image optional flows) ----
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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined, // keep same rule for single
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
//     }
//   };

//   const handleCancel = () => navigate('Closet');

//   // UI — preview zone
//   const hasMany = imageUris.length > 1;

//   return (
//     <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.modalSection3}>
//         {/* Tiny icon to toggle optional inputs */}
//         <AppleTouchFeedback
//           onPress={() => setShowAdvanced(v => !v)}
//           hapticStyle="impactLight"
//           style={styles.advancedIconBtn}
//           disabled={false}
//           accessibilityLabel={
//             showAdvanced ? 'Hide optional fields' : 'Show optional fields'
//           }>
//           <Text style={styles.advancedIconText}>
//             {showAdvanced ? '✕' : '⚙︎'}
//           </Text>
//         </AppleTouchFeedback>
//         <View
//           style={[
//             globalStyles.cardStyles3,
//             {backgroundColor: theme.colors.surface, borderRadius: 25},
//           ]}>
//           <View style={globalStyles.section3}>
//             <Text style={globalStyles.sectionTitle}>Select Image(s)</Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 setImageUri(uri);
//                 setImageUris([uri]); // single selection
//               }}
//               onSelectImages={uris => {
//                 setImageUris(uris); // batch selection
//                 setImageUri(uris[0] ?? null);
//               }}
//               selectedUri={imageUri}
//             />
//           </View>

//           {/* Preview: show grid for multiple, large preview for single */}
//           {hasMany ? (
//             <View style={styles.selectedGrid}>
//               {imageUris.map((uri, idx) => (
//                 <TouchableOpacity
//                   key={uri + idx}
//                   style={styles.selectedThumbWrap}
//                   onPress={() => setImageUri(uri)}
//                   activeOpacity={0.8}>
//                   <Image
//                     source={{uri}}
//                     style={styles.selectedThumb}
//                     resizeMode="cover"
//                   />
//                 </TouchableOpacity>
//               ))}
//             </View>
//           ) : (
//             imageUri && (
//               <>
//                 <Image
//                   source={{uri: imageUri}}
//                   style={styles.imagePreview}
//                   resizeMode="cover"
//                 />
//                 <Text style={styles.helperText}>
//                   We’ll auto-fill metadata. You can edit later from the item
//                   screen, or tap the tiny gear to reveal optional fields.
//                 </Text>
//               </>
//             )
//           )}

//           <View style={globalStyles.section}>
//             {/* Optional fields — rendered only when expanded */}
//             {showAdvanced && (
//               <>
//                 <Text style={styles.label}>
//                   Name (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={styles.input}
//                   placeholder="e.g. White Button-down"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Category (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={category}
//                   onChangeText={setCategory}
//                   style={styles.input}
//                   placeholder="e.g. Shirt, Pants"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Color (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={color}
//                   onChangeText={setColor}
//                   style={styles.input}
//                   placeholder="e.g. Navy, White"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Tags (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={tags}
//                   onChangeText={setTags}
//                   style={styles.input}
//                   placeholder="Comma separated: casual, winter, linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 {/* Advanced optional fields */}
//                 <Text style={styles.label}>Subcategory (optional)</Text>
//                 <TextInput
//                   value={subcategory}
//                   onChangeText={setSubcategory}
//                   style={styles.input}
//                   placeholder="e.g. Dress Shirt, Chinos"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Material (optional)</Text>
//                 <TextInput
//                   value={material}
//                   onChangeText={setMaterial}
//                   style={styles.input}
//                   placeholder="e.g. Cotton, Wool, Linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Fit (optional)</Text>
//                 <TextInput
//                   value={fit}
//                   onChangeText={setFit}
//                   style={styles.input}
//                   placeholder="e.g. Slim, Regular"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Size (optional)</Text>
//                 <TextInput
//                   value={size}
//                   onChangeText={setSize}
//                   style={styles.input}
//                   placeholder="e.g. M, L, 32x32"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Brand (optional)</Text>
//                 <TextInput
//                   value={brand}
//                   onChangeText={setBrand}
//                   style={styles.input}
//                   placeholder="e.g. Ferragamo"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern (optional)</Text>
//                 <TextInput
//                   value={pattern}
//                   onChangeText={setPattern}
//                   style={styles.input}
//                   placeholder="e.g. Striped, Plaid"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern Scale (optional)</Text>
//                 <TextInput
//                   value={patternScale}
//                   onChangeText={setPatternScale}
//                   style={styles.input}
//                   placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Seasonality (optional)</Text>
//                 <TextInput
//                   value={seasonality}
//                   onChangeText={setSeasonality}
//                   style={styles.input}
//                   placeholder="e.g. SS, FW, ALL_SEASON"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Layering (optional)</Text>
//                 <TextInput
//                   value={layering}
//                   onChangeText={setLayering}
//                   style={styles.input}
//                   placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//               </>
//             )}

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//                 marginTop: 8,
//               }}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: saving ? 0.7 : 1},
//                 ]}
//                 disabled={saving || (!imageUri && !imageUris.length)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {saving
//                     ? `Uploading ${progress.done}/${progress.total}…`
//                     : 'Upload All'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}
//                 disabled={saving}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

///////////////////////

// // // //BELOW HERE IS LOGIC TO KEEP FOR BATCH UPLOAD ITEMS - KEEP VERSION 3

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
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

//   // NEW: hidden-by-default advanced fields toggle
//   const [showAdvanced, setShowAdvanced] = useState(false);

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
//       marginBottom: 8,
//       backgroundColor: '#eee',
//     },
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//     // NEW: subtle toggle button
//     advancedToggle: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: theme.colors.input2,
//       borderColor: theme.colors.inputBorder,
//       borderWidth: 1,
//       width: '100%',
//       marginTop: 8,
//       marginBottom: 8,
//     },
//     helperText: {
//       color: theme.colors.muted,
//       fontSize: 13,
//       marginBottom: 8,
//     },
//   });

//   // -------------------
//   // Save Item(s) — AI per image (rich), fallback to manual payload
//   // -------------------
//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     // Shared metadata for fallback only (AI path ignores these unless user typed a name)
//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         // Only send name if user typed one; otherwise let AI title it richly
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           // Fallback to manual post with your original derivations
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,
//               name: fallbackName,
//               category: mainCategory,
//               main_category: mainCategory,
//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         navigate('Closet');
//       } else {
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

//   // ---- AI helpers (single-image optional flows) ----
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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined, // keep same rule for single
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
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
//             <Text style={globalStyles.sectionTitle}>Select Image(s)</Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 setImageUri(uri);
//                 setImageUris([uri]); // single selection
//               }}
//               onSelectImages={uris => {
//                 setImageUris(uris); // batch selection
//                 setImageUri(uris[0] ?? null);
//               }}
//               selectedUri={imageUri}
//             />
//           </View>

//           {imageUri && (
//             <>
//               <Image
//                 source={{uri: imageUri}}
//                 style={styles.imagePreview}
//                 resizeMode="cover"
//               />
//               <Text style={styles.helperText}>
//                 We’ll auto-fill metadata. You can edit anytime from the item
//                 screen, or expand optional fields below.
//               </Text>
//             </>
//           )}

//           <View style={globalStyles.section}>
//             {/* NEW: Toggle to show/hide all optional inputs */}
//             <AppleTouchFeedback
//               onPress={() => setShowAdvanced(v => !v)}
//               hapticStyle="impactLight"
//               style={styles.advancedToggle}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 {showAdvanced ? 'Hide optional fields' : 'Show optional fields'}
//               </Text>
//             </AppleTouchFeedback>

//             {/* Optional fields — rendered only when expanded */}
//             {showAdvanced && (
//               <>
//                 <Text style={styles.label}>
//                   Name (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={styles.input}
//                   placeholder="e.g. White Button-down"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Category (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={category}
//                   onChangeText={setCategory}
//                   style={styles.input}
//                   placeholder="e.g. Shirt, Pants"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Color (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={color}
//                   onChangeText={setColor}
//                   style={styles.input}
//                   placeholder="e.g. Navy, White"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>
//                   Tags (optional, applied to all)
//                 </Text>
//                 <TextInput
//                   value={tags}
//                   onChangeText={setTags}
//                   style={styles.input}
//                   placeholder="Comma separated: casual, winter, linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 {/* Advanced optional fields */}
//                 <Text style={styles.label}>Subcategory (optional)</Text>
//                 <TextInput
//                   value={subcategory}
//                   onChangeText={setSubcategory}
//                   style={styles.input}
//                   placeholder="e.g. Dress Shirt, Chinos"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Material (optional)</Text>
//                 <TextInput
//                   value={material}
//                   onChangeText={setMaterial}
//                   style={styles.input}
//                   placeholder="e.g. Cotton, Wool, Linen"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Fit (optional)</Text>
//                 <TextInput
//                   value={fit}
//                   onChangeText={setFit}
//                   style={styles.input}
//                   placeholder="e.g. Slim, Regular"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Size (optional)</Text>
//                 <TextInput
//                   value={size}
//                   onChangeText={setSize}
//                   style={styles.input}
//                   placeholder="e.g. M, L, 32x32"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Brand (optional)</Text>
//                 <TextInput
//                   value={brand}
//                   onChangeText={setBrand}
//                   style={styles.input}
//                   placeholder="e.g. Ferragamo"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern (optional)</Text>
//                 <TextInput
//                   value={pattern}
//                   onChangeText={setPattern}
//                   style={styles.input}
//                   placeholder="e.g. Striped, Plaid"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Pattern Scale (optional)</Text>
//                 <TextInput
//                   value={patternScale}
//                   onChangeText={setPatternScale}
//                   style={styles.input}
//                   placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Seasonality (optional)</Text>
//                 <TextInput
//                   value={seasonality}
//                   onChangeText={setSeasonality}
//                   style={styles.input}
//                   placeholder="e.g. SS, FW, ALL_SEASON"
//                   placeholderTextColor={theme.colors.muted}
//                 />

//                 <Text style={styles.label}>Layering (optional)</Text>
//                 <TextInput
//                   value={layering}
//                   onChangeText={setLayering}
//                   style={styles.input}
//                   placeholder="e.g. BASE, MID, SHELL, ACCENT"
//                   placeholderTextColor={theme.colors.muted}
//                 />
//               </>
//             )}

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//                 marginTop: 8,
//               }}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: saving ? 0.7 : 1},
//                 ]}
//                 disabled={saving || (!imageUri && !imageUris.length)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {saving
//                     ? `Uploading ${progress.done}/${progress.total}…`
//                     : 'Upload All'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}
//                 disabled={saving}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

/////////////////////////

// // //BELOW HERE IS LOGIC TO KEEP FOR BATCH UPLOAD ITEMS - KEEP VERSION 2

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
// import {analyzeImage, autoCreateWithAI} from '../api/analyzeImage';

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback name if user didn’t type one (only used in fallback path)
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // small concurrency helper
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied to all in batch if provided)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

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
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//   });

//   // -------------------
//   // Save Item(s) — AI per image (rich), fallback to manual payload
//   // -------------------
//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     // Shared metadata for fallback only (AI path ignores these unless user typed a name)
//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);
//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image:
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async u => {
//         // ⚠️ IMPORTANT: only send `name` if the user actually typed one.
//         // Otherwise omit it so the AI generates a descriptive title.
//         const userProvidedName = name?.trim() || undefined;

//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: userProvidedName, // <-- key fix (omit if undefined)
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           // Fallback to manual post with your original derivations
//           try {
//             const fallbackName = userProvidedName || autoNameFrom(u.filename);
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,

//               name: fallbackName,

//               // both keys to satisfy server variations
//               category: mainCategory,
//               main_category: mainCategory,

//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,

//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       if (failed === 0) {
//         navigate('Closet');
//       } else {
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

//   // ---- AI helpers (single-image optional flows) ----
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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name?.trim() || undefined, // keep same rule for single
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
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
//             <Text style={globalStyles.sectionTitle}>Select Image(s)</Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 setImageUri(uri);
//                 setImageUris([uri]); // single selection
//               }}
//               onSelectImages={uris => {
//                 setImageUris(uris); // batch selection
//                 setImageUri(uris[0] ?? null);
//               }}
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
//             {/* Optional fields — applied to every item in the batch if provided */}
//             <Text style={styles.label}>Name (optional, applied to all)</Text>
//             <TextInput
//               value={name}
//               onChangeText={setName}
//               style={styles.input}
//               placeholder="e.g. White Button-down"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>
//               Category (optional, applied to all)
//             </Text>
//             <TextInput
//               value={category}
//               onChangeText={setCategory}
//               style={styles.input}
//               placeholder="e.g. Shirt, Pants"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Color (optional, applied to all)</Text>
//             <TextInput
//               value={color}
//               onChangeText={setColor}
//               style={styles.input}
//               placeholder="e.g. Navy, White"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Tags (optional, applied to all)</Text>
//             <TextInput
//               value={tags}
//               onChangeText={setTags}
//               style={styles.input}
//               placeholder="Comma separated: casual, winter, linen"
//               placeholderTextColor={theme.colors.muted}
//             />

//             {/* Advanced optional fields */}
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

//             <Text style={styles.label}>Pattern (optional)</Text>
//             <TextInput
//               value={pattern}
//               onChangeText={setPattern}
//               style={styles.input}
//               placeholder="e.g. Striped, Plaid"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Pattern Scale (optional)</Text>
//             <TextInput
//               value={patternScale}
//               onChangeText={setPatternScale}
//               style={styles.input}
//               placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Seasonality (optional)</Text>
//             <TextInput
//               value={seasonality}
//               onChangeText={setSeasonality}
//               style={styles.input}
//               placeholder="e.g. SS, FW, ALL_SEASON"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Layering (optional)</Text>
//             <TextInput
//               value={layering}
//               onChangeText={setLayering}
//               style={styles.input}
//               placeholder="e.g. BASE, MID, SHELL, ACCENT"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//               }}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: saving ? 0.7 : 1},
//                 ]}
//                 disabled={saving || (!imageUri && !imageUris.length)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {saving
//                     ? `Uploading ${progress.done}/${progress.total}…`
//                     : 'Upload All'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}
//                 disabled={saving}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

///////////////////

//BELOW HERE IS LOGIC TO KEEP FOR BATCH UPLOAD ITEMS - KEEP VERSION 1

// apps/frontend/screens/AddItemScreen.tsx
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

// // --- input normalizers (unchanged) ---
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

// // --- lightweight enrichers (unchanged) ---
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

// // Fallback: name from filename when left blank
// const autoNameFrom = (uriOrFilename: string) => {
//   const base = uriOrFilename.split('/').pop() || uriOrFilename;
//   const noExt = base.replace(/\.[^.]+$/, '');
//   return noExt || 'Untitled';
// };

// // tiny concurrency helper (no deps)
// async function mapWithConcurrency<T, R>(
//   items: T[],
//   limit: number,
//   worker: (item: T, index: number) => Promise<R>,
// ): Promise<R[]> {
//   const out: R[] = new Array(items.length);
//   let i = 0;
//   const runners = new Array(Math.min(limit, items.length))
//     .fill(null)
//     .map(async () => {
//       while (i < items.length) {
//         const idx = i++;
//         out[idx] = await worker(items[idx], idx);
//       }
//     });
//   await Promise.all(runners);
//   return out;
// }

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

//   // single + multi
//   const [imageUri, setImageUri] = useState<string | null>(null);
//   const [imageUris, setImageUris] = useState<string[]>([]);

//   // optional fields (applied as defaults across batch, same as before)
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

//   const [saving, setSaving] = useState(false);
//   const [progress, setProgress] = useState<{done: number; total: number}>({
//     done: 0,
//     total: 0,
//   });

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
//     label: {...globalStyles.title},
//     secondaryBtn: {
//       ...globalStyles.buttonPrimary,
//       backgroundColor: 'rgb(153,153,153)',
//     },
//   });

//   // -------------------
//   // Save Item(s) — batch with AI per image, fallback to manual payload
//   // -------------------
//   const handleSave = async () => {
//     const selected = imageUris.length ? imageUris : imageUri ? [imageUri] : [];
//     if (!selected.length) {
//       Alert.alert('Missing Images', 'Please select at least one image.');
//       return;
//     }

//     setSaving(true);
//     setProgress({done: 0, total: selected.length});

//     // Shared metadata derived once (used in fallback path)
//     const cleanedTags = tags
//       .split(',')
//       .map(t => t.trim())
//       .filter(Boolean);

//     const occasion_tags = inferOccasionTags(cleanedTags);
//     const dress_code = inferDressCode(category, subcategory, cleanedTags);
//     const anchor_role = inferAnchorRole(cleanedTags);
//     const color_family = inferColorFamily(color);
//     const mainCategory = (category?.trim() || 'Uncategorized') as string;

//     try {
//       // 1) Upload all to GCS (limit concurrency to be nice to OS/network)
//       const uploaded = await mapWithConcurrency(selected, 3, async uri => {
//         const filename = uri.split('/').pop() ?? 'upload.jpg';
//         const up = await uploadImageToGCS({localUri: uri, filename, userId});
//         return {uri, filename, ...up};
//       });

//       // 2) For each uploaded image: prefer AI create; fallback to manual postWardrobeItem
//       let ok = 0,
//         failed = 0,
//         aiUsed = 0,
//         fallbackUsed = 0;

//       await mapWithConcurrency(uploaded, 3, async (u, idx) => {
//         const overrideName = name?.trim() || autoNameFrom(u.filename);

//         // First try: rich AI path (same as single One-Tap)
//         try {
//           await autoCreateWithAI({
//             user_id: userId,
//             image_url: u.publicUrl,
//             gsutil_uri: u.gsutilUri,
//             name: overrideName,
//             object_key: u.objectKey,
//           });
//           aiUsed++;
//           ok++;
//         } catch (e) {
//           // Fallback: your original payload logic (ensures record still gets created)
//           try {
//             const payload: any = {
//               userId: userId,
//               image_url: u.publicUrl,
//               objectKey: u.objectKey,
//               gsutilUri: u.gsutilUri,

//               name: overrideName,

//               // send both to satisfy any validator variations
//               category: mainCategory, // legacy mapping to main_category
//               main_category: mainCategory, // explicit for strict validators

//               subcategory,
//               color,
//               material,
//               fit,
//               size,
//               brand,
//               pattern,
//               pattern_scale: normalizePatternScale(patternScale),
//               seasonality: normalizeSeasonality(seasonality),
//               layering: normalizeLayering(layering),
//               tags: cleanedTags,

//               // derived extras
//               dress_code,
//               occasion_tags,
//               anchor_role,
//               color_family,
//             };

//             await postWardrobeItem(payload);
//             fallbackUsed++;
//             ok++;
//           } catch (e2) {
//             failed++;
//             console.error('[AddItem] AI+fallback failed for', u.filename, e2);
//           }
//         }

//         setProgress(p => ({...p, done: p.done + 1}));
//       });

//       // 3) Summary + navigate
//       if (failed === 0) {
//         navigate('Closet');
//       } else {
//         Alert.alert(
//           'Upload finished',
//           `Saved ${ok}/${selected.length} items.\nAI: ${aiUsed} • Fallback: ${fallbackUsed} • Failed: ${failed}`,
//         );
//       }
//     } catch (err: any) {
//       console.error('[AddItem] Batch save error:', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was a problem uploading your items.',
//       );
//     } finally {
//       setSaving(false);
//       setProgress({done: 0, total: 0});
//     }
//   };

//   // ---- AI helpers (single-image paths kept intact; optional) ----
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

//   const handleAutoFillAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
//     try {
//       const filename = imageUri.split('/').pop() ?? 'upload.jpg';
//       const {publicUrl, objectKey, gsutilUri} = await uploadImageToGCS({
//         localUri: imageUri,
//         filename,
//         userId,
//       });
//       // preview cloud URL
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
//     }
//   };

//   const handleOneTapSaveAI = async () => {
//     if (!imageUri) {
//       Alert.alert('Missing Image', 'Pick an image first.');
//       return;
//     }
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
//         name: name || undefined,
//         object_key: objectKey,
//       });

//       navigate('Closet');
//     } catch (e: any) {
//       console.error('[AI] one-tap error', e?.message || e);
//       Alert.alert('One-tap failed', e?.message || 'See console for details.');
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
//             <Text style={globalStyles.sectionTitle}>Select Image(s)</Text>
//             <ImagePickerGrid
//               onSelectImage={uri => {
//                 setImageUri(uri);
//                 setImageUris([uri]); // single selection
//               }}
//               onSelectImages={uris => {
//                 setImageUris(uris); // batch selection
//                 setImageUri(uris[0] ?? null);
//               }}
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
//             {/* Optional fields — applied to every item in the batch as defaults if provided */}
//             <Text style={styles.label}>Name (optional, applied to all)</Text>
//             <TextInput
//               value={name}
//               onChangeText={setName}
//               style={styles.input}
//               placeholder="e.g. White Button-down"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>
//               Category (optional, applied to all)
//             </Text>
//             <TextInput
//               value={category}
//               onChangeText={setCategory}
//               style={styles.input}
//               placeholder="e.g. Shirt, Pants"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Color (optional, applied to all)</Text>
//             <TextInput
//               value={color}
//               onChangeText={setColor}
//               style={styles.input}
//               placeholder="e.g. Navy, White"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Tags (optional, applied to all)</Text>
//             <TextInput
//               value={tags}
//               onChangeText={setTags}
//               style={styles.input}
//               placeholder="Comma separated: casual, winter, linen"
//               placeholderTextColor={theme.colors.muted}
//             />

//             {/* Advanced/optional fields */}
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

//             <Text style={styles.label}>Pattern (optional)</Text>
//             <TextInput
//               value={pattern}
//               onChangeText={setPattern}
//               style={styles.input}
//               placeholder="e.g. Striped, Plaid"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Pattern Scale (optional)</Text>
//             <TextInput
//               value={patternScale}
//               onChangeText={setPatternScale}
//               style={styles.input}
//               placeholder="e.g. subtle / medium / bold or 0 / 1 / 2"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Seasonality (optional)</Text>
//             <TextInput
//               value={seasonality}
//               onChangeText={setSeasonality}
//               style={styles.input}
//               placeholder="e.g. SS, FW, ALL_SEASON"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <Text style={styles.label}>Layering (optional)</Text>
//             <TextInput
//               value={layering}
//               onChangeText={setLayering}
//               style={styles.input}
//               placeholder="e.g. BASE, MID, SHELL, ACCENT"
//               placeholderTextColor={theme.colors.muted}
//             />

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//               }}>
//               <AppleTouchFeedback
//                 onPress={handleSave}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: saving ? 0.7 : 1},
//                 ]}
//                 disabled={saving || (!imageUri && !imageUris.length)}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {saving
//                     ? `Uploading ${progress.done}/${progress.total}…`
//                     : 'Upload All'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}
//                 disabled={saving}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

/////////////////////

//BELOW HERE IS LOGIC TO KEEP FOR SINGLE UPLOAD ITEMS - KEEP

// apps/frontend/screens/AddItemScreen.tsx
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

//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 paddingHorizontal: 15,
//               }}>
//               {/* ⬇️ NEW: One-tap save (AI) */}
//               <AppleTouchFeedback
//                 onPress={handleOneTapSaveAI}
//                 hapticStyle="impactMedium"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 160, opacity: loadingAI ? 0.7 : 1},
//                 ]}
//                 disabled={!imageUri || loadingAI}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   {loadingAI ? 'Saving…' : 'Save Item'}
//                 </Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 onPress={handleCancel}
//                 hapticStyle="impactLight"
//                 style={[styles.secondaryBtn, {width: 160}]}>
//                 <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }
