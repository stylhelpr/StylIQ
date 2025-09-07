// apps/frontend/screens/ItemDetailScreen.tsx
import React, {useState, useEffect, useMemo} from 'react';
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
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {API_BASE_URL} from '../../config/api';
import {mockClothingItems} from '../../components/mockClothingItems/mockClothingItems';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

type Props = {
  route: any;
  navigation: any;
};

// ─────────────────────────────────────────────
// Normalizers (mirrored from AddItemScreen)
// ─────────────────────────────────────────────
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

export default function ItemDetailScreen({route, navigation}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const queryClient = useQueryClient();

  const {itemId, item: routeItem} = route.params;
  const item = useMemo(
    () => routeItem ?? mockClothingItems.find(i => i.id === itemId),
    [routeItem, itemId],
  );

  // Core/base
  const [name, setName] = useState('');
  const [category, setCategory] = useState(''); // ↔ main_category
  const [subcategory, setSubcategory] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [fit, setFit] = useState('');
  const [size, setSize] = useState('');
  const [brand, setBrand] = useState('');
  const [tags, setTags] = useState(''); // comma-separated UI

  // Enriched
  const [pattern, setPattern] = useState('');
  const [patternScale, setPatternScale] = useState(''); // text input; normalized on save
  const [seasonality, setSeasonality] = useState(''); // normalized to SS/FW/ALL_SEASON
  const [layering, setLayering] = useState(''); // normalized to BASE/MID/SHELL/ACCENT

  // Derived fields from AddItemScreen
  const [dressCode, setDressCode] = useState(''); // 'UltraCasual' | 'Casual' | ...
  const [anchorRole, setAnchorRole] = useState(''); // 'Hero' | 'Neutral' | 'Connector'
  const [colorFamily, setColorFamily] = useState(''); // e.g. Navy, Black, White
  const [occasionTags, setOccasionTags] = useState(''); // comma UI → array: Work,DateNight,...

  useEffect(() => {
    if (!item) return;

    // handle snake_case and camelCase
    setName(item.name ?? item.ai_title ?? '');
    setCategory(item.main_category ?? item.mainCategory ?? '');
    setSubcategory(item.subcategory ?? item.subCategory ?? '');
    setColor(item.color ?? '');
    setMaterial(item.material ?? '');
    setFit(item.fit ?? '');
    setSize(item.size ?? item.size_label ?? '');
    setBrand(item.brand ?? '');

    const _tags: string[] = Array.isArray(item.tags)
      ? item.tags
      : typeof (item.tags as any) === 'string'
      ? (item.tags as any)
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];
    setTags(_tags.join(', '));

    setPattern(item.pattern ?? '');
    // pattern_scale may be number or enum; show as text
    const ps = item.pattern_scale;
    setPatternScale(
      ps === 0
        ? '0'
        : ps === 1
        ? '1'
        : ps === 2
        ? '2'
        : typeof ps === 'string'
        ? ps
        : (ps ?? '').toString(),
    );

    setSeasonality(item.seasonality ?? '');
    setLayering(item.layering ?? '');

    // derived
    setDressCode(item.dress_code ?? '');
    setAnchorRole(item.anchor_role ?? '');
    setColorFamily(item.color_family ?? '');
    const _occTags: string[] = Array.isArray(item.occasion_tags)
      ? item.occasion_tags
      : [];
    setOccasionTags(_occTags.join(', '));
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!item?.id) throw new Error('Missing item ID');

      // normalize fields to backend DTO expectations
      const normPatternScale = normalizePatternScale(patternScale || '');
      const normSeasonality = normalizeSeasonality(seasonality || '');
      const normLayering = normalizeLayering(layering || '');

      const payload = {
        name,
        color,
        main_category: category,
        subcategory,
        material,
        fit,
        size,
        brand,
        pattern,
        pattern_scale: normPatternScale, // union: 'subtle'|'medium'|'bold'|undefined
        seasonality: normSeasonality, // 'SS'|'FW'|'ALL_SEASON'|undefined
        layering: normLayering, // 'BASE'|'MID'|'SHELL'|'ACCENT'|undefined
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),

        // derived fields (editable)
        dress_code: dressCode || undefined,
        anchor_role: anchorRole || undefined,
        color_family: colorFamily || undefined,
        occasion_tags: occasionTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      };

      const res = await fetch(`${API_BASE_URL}/wardrobe/${item.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(
          `Failed to update item ${res.status}: ${txt || res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['wardrobe']});
      navigation.goBack();
    },
    onError: (e: any) => {
      Alert.alert('Error', e?.message || 'Failed to save changes.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!item?.id || !item?.user_id || !item?.image_url) {
        throw new Error('Missing item info');
      }
      const res = await fetch(`${API_BASE_URL}/wardrobe`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          item_id: item.id,
          user_id: item.user_id,
          image_url: item.image_url,
        }),
      });
      if (!res.ok) throw new Error('Failed to delete item');
      return item.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['wardrobe']});
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete item.');
    },
  });

  const handleDelete = () => {
    if (!item?.id) return;
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  const styles = StyleSheet.create({
    image: {
      width: '100%',
      height: 320,
      borderRadius: tokens.borderRadius.md,
      marginBottom: 20,
    },
    input: {
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      fontSize: 15,
      color: theme.colors.foreground,
      backgroundColor: theme.colors.input2,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      marginTop: 10,
      flexWrap: 'wrap',
      gap: 12,
    },
    cancelButton: {
      backgroundColor: theme.colors.surface2,
    },
  });

  return (
    <ScrollView
      style={[useGlobalStyles().screen, useGlobalStyles().section]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View
        style={[
          useGlobalStyles().modalSection,
          useGlobalStyles().cardStyles3,
          {paddingVertical: 20},
        ]}>
        {item?.image_url && (
          <Image source={{uri: item.image_url}} style={styles.image} />
        )}

        {/* Core */}
        <Text style={useGlobalStyles().title}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={useGlobalStyles().title}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          placeholder="e.g. Shirt, Pants, Shoes"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Subcategory</Text>
        <TextInput
          value={subcategory}
          onChangeText={setSubcategory}
          style={styles.input}
          placeholder="e.g. Dress Shirt, Chinos"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Material</Text>
        <TextInput
          value={material}
          onChangeText={setMaterial}
          style={styles.input}
          placeholder="e.g. Cotton, Wool, Linen"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Fit</Text>
        <TextInput
          value={fit}
          onChangeText={setFit}
          style={styles.input}
          placeholder="e.g. Slim, Regular"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Size</Text>
        <TextInput
          value={size}
          onChangeText={setSize}
          style={styles.input}
          placeholder="e.g. M, L, 32x32"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Brand</Text>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          style={styles.input}
          placeholder="e.g. Ferragamo"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Color</Text>
        <TextInput
          value={color}
          onChangeText={setColor}
          style={styles.input}
          placeholder="e.g. Navy, White, Tan"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Tags</Text>
        <TextInput
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          placeholder="Comma separated: casual, spring, linen"
          placeholderTextColor={theme.colors.muted}
        />

        {/* Enriched */}
        <Text style={useGlobalStyles().title}>Pattern</Text>
        <TextInput
          value={pattern}
          onChangeText={setPattern}
          style={styles.input}
          placeholder="e.g. Striped, Plaid"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Pattern Scale</Text>
        <TextInput
          value={patternScale}
          onChangeText={setPatternScale}
          style={styles.input}
          placeholder="subtle / medium / bold or 0 / 1 / 2"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Seasonality</Text>
        <TextInput
          value={seasonality}
          onChangeText={setSeasonality}
          style={styles.input}
          placeholder="SS, FW, or ALL_SEASON"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Layering</Text>
        <TextInput
          value={layering}
          onChangeText={setLayering}
          style={styles.input}
          placeholder="BASE, MID, SHELL, ACCENT"
          placeholderTextColor={theme.colors.muted}
        />

        {/* Derived (from AddItemScreen) */}
        <Text style={useGlobalStyles().title}>Dress Code</Text>
        <TextInput
          value={dressCode}
          onChangeText={setDressCode}
          style={styles.input}
          placeholder="UltraCasual, Casual, SmartCasual, BusinessCasual, Business, BlackTie"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Anchor Role</Text>
        <TextInput
          value={anchorRole}
          onChangeText={setAnchorRole}
          style={styles.input}
          placeholder="Hero, Neutral, Connector"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Color Family</Text>
        <TextInput
          value={colorFamily}
          onChangeText={setColorFamily}
          style={styles.input}
          placeholder="e.g. Navy, Black, White, Gray, Beige…"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={useGlobalStyles().title}>Occasion Tags</Text>
        <TextInput
          value={occasionTags}
          onChangeText={setOccasionTags}
          style={styles.input}
          placeholder="Comma separated: Work, DateNight, Travel, Gym"
          placeholderTextColor={theme.colors.muted}
        />

        <View style={styles.buttonRow}>
          <Pressable
            style={[useGlobalStyles().buttonPrimary]}
            onPress={() => updateMutation.mutate()}>
            <Text style={useGlobalStyles().buttonPrimaryText}>
              Save Changes
            </Text>
          </Pressable>
          <Pressable
            style={[useGlobalStyles().buttonPrimary, styles.cancelButton]}
            onPress={() => navigation.goBack()}>
            <Text style={useGlobalStyles().buttonPrimaryText}>Cancel</Text>
          </Pressable>
        </View>

        <View style={{justifyContent: 'center', alignItems: 'center'}}>
          <Pressable
            style={[
              useGlobalStyles().buttonPrimary,
              {backgroundColor: 'red', marginTop: 16},
            ]}
            onPress={handleDelete}>
            <Text style={useGlobalStyles().buttonPrimaryText}>Delete Item</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TextInput,
//   ScrollView,
//   Pressable,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useMutation, useQueryClient} from '@tanstack/react-query';
// import {API_BASE_URL} from '../../config/api';
// import {mockClothingItems} from '../../components/mockClothingItems/mockClothingItems';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   route: any;
//   navigation: any;
// };

// export default function ItemDetailScreen({route, navigation}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();
//   const {itemId, item: routeItem} = route.params;
//   const item = routeItem ?? mockClothingItems.find(i => i.id === itemId);

//   const [name, setName] = useState(item?.name || '');
//   const [category, setCategory] = useState('');
//   const [tags, setTags] = useState('');
//   const [color, setColor] = useState('');
//   const [subcategory, setSubcategory] = useState('');
//   const [material, setMaterial] = useState('');
//   const [fit, setFit] = useState('');
//   const [size, setSize] = useState('');
//   const [brand, setBrand] = useState('');

//   // ✅ NEW enriched fields
//   const [pattern, setPattern] = useState('');
//   const [patternScale, setPatternScale] = useState('');
//   const [seasonality, setSeasonality] = useState('');
//   const [layering, setLayering] = useState('');

//   useEffect(() => {
//     if (item) {
//       setCategory(item.main_category ?? '');
//       setColor(item.color ?? '');
//       setTags(item.tags?.join(', ') ?? '');
//       setSubcategory(item.subcategory ?? '');
//       setMaterial(item.material ?? '');
//       setFit(item.fit ?? '');
//       setSize(item.size ?? '');
//       setBrand(item.brand ?? '');
//       setPattern(item.pattern ?? '');
//       setPatternScale(item.pattern_scale?.toString() ?? '');
//       setSeasonality(item.seasonality ?? '');
//       setLayering(item.layering ?? '');
//     }
//   }, [item]);

//   const updateMutation = useMutation({
//     mutationFn: async () => {
//       if (!item?.id) throw new Error('Missing item ID');
//       const res = await fetch(`${API_BASE_URL}/wardrobe/${item.id}`, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           name,
//           color,
//           main_category: category,
//           subcategory,
//           material,
//           fit,
//           size,
//           brand,
//           pattern,
//           pattern_scale: patternScale ? Number(patternScale) : null,
//           seasonality,
//           layering,
//           tags: tags
//             .split(',')
//             .map(t => t.trim())
//             .filter(Boolean),
//         }),
//       });
//       if (!res.ok) throw new Error('Failed to update item');
//       return res.json();
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe']});
//       navigation.goBack();
//     },
//     onError: () => {
//       Alert.alert('Error', 'Failed to save changes.');
//     },
//   });

//   const deleteMutation = useMutation({
//     mutationFn: async () => {
//       if (!item?.id || !item?.user_id || !item?.image_url) {
//         throw new Error('Missing item info');
//       }

//       const res = await fetch(`${API_BASE_URL}/wardrobe`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           item_id: item.id,
//           user_id: item.user_id,
//           image_url: item.image_url,
//         }),
//       });

//       if (!res.ok) throw new Error('Failed to delete item');
//       return item.id;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['wardrobe']});
//       navigation.goBack();
//     },
//     onError: () => {
//       Alert.alert('Error', 'Failed to delete item.');
//     },
//   });

//   const handleDelete = () => {
//     if (!item?.id) return;
//     Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: () => deleteMutation.mutate(),
//       },
//     ]);
//   };

//   const styles = StyleSheet.create({
//     image: {
//       width: '100%',
//       height: 320,
//       borderRadius: tokens.borderRadius.md,
//       marginBottom: 20,
//     },
//     input: {
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       marginBottom: 14,
//       fontSize: 15,
//       color: theme.colors.foreground,
//       backgroundColor: theme.colors.input2,
//       borderWidth: 1,
//       borderColor: theme.colors.inputBorder,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-evenly',
//       marginTop: 10,
//     },
//     cancelButton: {
//       backgroundColor: theme.colors.surface2,
//     },
//     saveButton: {
//       backgroundColor: theme.colors.button1,
//     },
//   });

//   return (
//     <ScrollView
//       style={[globalStyles.screen, globalStyles.section]}
//       showsVerticalScrollIndicator={false}>
//       <View
//         style={[
//           globalStyles.modalSection,
//           globalStyles.cardStyles3,
//           {paddingVertical: 20},
//         ]}>
//         {item?.image_url && (
//           <Image source={{uri: item.image_url}} style={styles.image} />
//         )}

//         <Text style={globalStyles.title}>Name</Text>
//         <TextInput value={name} onChangeText={setName} style={styles.input} />

//         <Text style={globalStyles.title}>Category</Text>
//         <TextInput
//           value={category}
//           onChangeText={setCategory}
//           style={styles.input}
//           placeholder="e.g. Shirt, Pants, Shoes"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Subcategory</Text>
//         <TextInput
//           value={subcategory}
//           onChangeText={setSubcategory}
//           style={styles.input}
//           placeholder="e.g. Dress Shirt, Chinos"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Material</Text>
//         <TextInput
//           value={material}
//           onChangeText={setMaterial}
//           style={styles.input}
//           placeholder="e.g. Cotton, Wool, Linen"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Fit</Text>
//         <TextInput
//           value={fit}
//           onChangeText={setFit}
//           style={styles.input}
//           placeholder="e.g. Slim, Regular"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Size</Text>
//         <TextInput
//           value={size}
//           onChangeText={setSize}
//           style={styles.input}
//           placeholder="e.g. M, L, 32x32"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Brand</Text>
//         <TextInput
//           value={brand}
//           onChangeText={setBrand}
//           style={styles.input}
//           placeholder="e.g. Ferragamo"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Color</Text>
//         <TextInput
//           value={color}
//           onChangeText={setColor}
//           style={styles.input}
//           placeholder="e.g. Navy, White, Tan"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Tags</Text>
//         <TextInput
//           value={tags}
//           onChangeText={setTags}
//           style={styles.input}
//           placeholder="Comma separated: casual, spring, linen"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Pattern</Text>
//         <TextInput
//           value={pattern}
//           onChangeText={setPattern}
//           style={styles.input}
//           placeholder="e.g. Striped, Plaid"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Pattern Scale</Text>
//         <TextInput
//           value={patternScale}
//           onChangeText={setPatternScale}
//           style={styles.input}
//           placeholder="0–100"
//           placeholderTextColor={theme.colors.muted}
//           keyboardType="numeric"
//         />

//         <Text style={globalStyles.title}>Seasonality</Text>
//         <TextInput
//           value={seasonality}
//           onChangeText={setSeasonality}
//           style={styles.input}
//           placeholder="e.g. Summer, Winter"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <Text style={globalStyles.title}>Layering</Text>
//         <TextInput
//           value={layering}
//           onChangeText={setLayering}
//           style={styles.input}
//           placeholder="e.g. Base Layer, Mid Layer"
//           placeholderTextColor={theme.colors.muted}
//         />

//         <View style={styles.buttonRow}>
//           <Pressable
//             style={[globalStyles.buttonPrimary]}
//             onPress={() => updateMutation.mutate()}>
//             <Text style={globalStyles.buttonPrimaryText}>Save Changes</Text>
//           </Pressable>
//           <Pressable
//             style={[globalStyles.buttonPrimary, styles.cancelButton]}
//             onPress={() => navigation.goBack()}>
//             <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//           </Pressable>
//         </View>

//         <View style={{justifyContent: 'center', alignItems: 'center'}}>
//           <Pressable
//             style={[
//               globalStyles.buttonPrimary,
//               {backgroundColor: 'red', marginTop: 16},
//             ]}
//             onPress={handleDelete}>
//             <Text style={globalStyles.buttonPrimaryText}>Delete Item</Text>
//           </Pressable>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }
