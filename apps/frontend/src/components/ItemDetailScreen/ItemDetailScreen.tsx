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
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {API_BASE_URL} from '../../config/api';
import {mockClothingItems} from '../../components/mockClothingItems/mockClothingItems';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

type Props = {
  route: any;
  navigation: any;
};

export default function ItemDetailScreen({route, navigation}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const queryClient = useQueryClient();
  const {itemId, item: routeItem} = route.params;
  const item = routeItem ?? mockClothingItems.find(i => i.id === itemId);

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (item) {
      setCategory(item.main_category ?? '');
      setColor(item.color ?? '');
      setTags(
        item.metadata?.tags && Array.isArray(item.metadata.tags)
          ? item.metadata.tags.join(', ')
          : '',
      );
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!item?.id) throw new Error('Missing item ID');
      const res = await fetch(`${API_BASE_URL}/wardrobe/${item.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name,
          color,
          main_category: category,
          tags: tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean), // remove empty strings
        }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['wardrobe']});
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save changes.');
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
    },
    cancelButton: {
      backgroundColor: theme.colors.surface2,
    },
    saveButton: {
      backgroundColor: theme.colors.button1,
    },
  });

  return (
    <ScrollView
      style={[globalStyles.screen, globalStyles.section]}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          globalStyles.modalSection,
          globalStyles.cardStyles3,
          {paddingVertical: 20},
        ]}>
        {item?.image_url && (
          <Image source={{uri: item.image_url}} style={styles.image} />
        )}

        <Text style={globalStyles.title}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={globalStyles.title}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          placeholder="e.g. Shirt, Pants, Shoes"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={globalStyles.title}>Color</Text>
        <TextInput
          value={color}
          onChangeText={setColor}
          style={styles.input}
          placeholder="e.g. Navy, White, Tan"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={globalStyles.title}>Tags</Text>
        <TextInput
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          placeholder="Comma separated: casual, spring, linen"
          placeholderTextColor={theme.colors.muted}
        />

        <View style={styles.buttonRow}>
          <Pressable
            style={[globalStyles.buttonPrimary]}
            onPress={() => updateMutation.mutate()}>
            <Text style={globalStyles.buttonPrimaryText}>Save Changes</Text>
          </Pressable>
          <Pressable
            style={[globalStyles.buttonPrimary, styles.cancelButton]}
            onPress={() => navigation.goBack()}>
            <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
          </Pressable>
        </View>

        <View style={{justifyContent: 'center', alignItems: 'center'}}>
          <Pressable
            style={[
              globalStyles.buttonPrimary,
              {backgroundColor: 'red', marginTop: 16},
            ]}
            onPress={handleDelete}>
            <Text style={globalStyles.buttonPrimaryText}>Delete Item</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

///////////////////

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

//   useEffect(() => {
//     if (item) {
//       setCategory(item.main_category ?? '');
//       setColor(item.color ?? '');
//       setTags(
//         item.metadata?.tags && Array.isArray(item.metadata.tags)
//           ? item.metadata.tags.join(', ')
//           : '',
//       );
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
//           tags: tags
//             .split(',')
//             .map(t => t.trim())
//             .filter(Boolean), // remove empty strings
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
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     image: {
//       width: '100%',
//       height: 320,
//       borderRadius: tokens.borderRadius.md,
//       marginBottom: 20,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
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
//       style={[styles.screen, globalStyles.container, globalStyles.section]}
//       showsVerticalScrollIndicator={false}>
//       {item?.image_url && (
//         <Image source={{uri: item.image_url}} style={styles.image} />
//       )}

//       <Text style={globalStyles.title}>Name</Text>
//       <TextInput value={name} onChangeText={setName} style={styles.input} />

//       <Text style={globalStyles.title}>Category</Text>
//       <TextInput
//         value={category}
//         onChangeText={setCategory}
//         style={styles.input}
//         placeholder="e.g. Shirt, Pants, Shoes"
//         placeholderTextColor={theme.colors.muted}
//       />

//       <Text style={globalStyles.title}>Color</Text>
//       <TextInput
//         value={color}
//         onChangeText={setColor}
//         style={styles.input}
//         placeholder="e.g. Navy, White, Tan"
//         placeholderTextColor={theme.colors.muted}
//       />

//       <Text style={globalStyles.title}>Tags</Text>
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
//             globalStyles.buttonPrimary,
//             styles.cancelButton,
//             {width: '48%', flexShrink: 0, alignSelf: 'stretch'},
//           ]}
//           onPress={() => navigation.goBack()}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </Pressable>

//         <Pressable
//           style={[
//             globalStyles.buttonPrimary,
//             {width: '48%', flexShrink: 0, alignSelf: 'stretch'},
//           ]}
//           onPress={() => updateMutation.mutate()}>
//           <Text style={globalStyles.buttonPrimaryText}>Save Changes</Text>
//         </Pressable>
//       </View>

//       <Pressable
//         style={[
//           globalStyles.buttonPrimary,
//           {backgroundColor: 'red', marginTop: 16},
//         ]}
//         onPress={handleDelete}>
//         <Text style={globalStyles.buttonPrimaryText}>Delete Item</Text>
//       </Pressable>
//     </ScrollView>
//   );
// }
