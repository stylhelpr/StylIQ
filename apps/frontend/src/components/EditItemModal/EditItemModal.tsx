import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import type {WardrobeItem} from '../../hooks/useOutfitSuggestion';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  visible: boolean;
  item: WardrobeItem;
  onClose: () => void;
  onSave: (updatedItem: WardrobeItem) => void;
  onDelete: (itemId: string) => void; // ✅ Add this
};

export default function EditItemModal({visible, item, onClose, onSave}: Props) {
  const {theme} = useAppTheme();
  const [editedItem, setEditedItem] = useState<WardrobeItem>(item);

  useEffect(() => {
    setEditedItem({
      ...item,
      name: item.name || '',
      color: item.color || '',
      mainCategory: item.mainCategory || '',
      subCategory: item.subCategory || '',
      material: item.material || '',
      fit: item.fit || '',
      size: item.size || '',
      notes: item.notes || '',
      tags: item.tags || [],
      category: item.category || '',
      favorite: item.favorite || false,
    });
  }, [item]);

  const handleChange = (key: keyof WardrobeItem, value: any) => {
    setEditedItem(prev => ({...prev, [key]: value}));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View
          style={[styles.modal, {backgroundColor: theme.colors.background}]}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Edit Item
          </Text>

          <ScrollView>
            {editedItem.image && (
              <Image
                source={{uri: editedItem.image}}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 8,
                  alignSelf: 'center',
                  marginBottom: 12,
                }}
              />
            )}

            {[
              'name',
              'mainCategory',
              'subCategory',
              'color',
              'material',
              'fit',
              'size',
              'notes',
              'category',
              'tags',
            ].map(field => (
              <View key={field} style={{marginBottom: 16}}>
                <Text style={{color: theme.colors.foreground, marginBottom: 6}}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
                <TextInput
                  placeholder={field}
                  placeholderTextColor={theme.colors.muted}
                  value={
                    Array.isArray((editedItem as any)[field])
                      ? (editedItem as any)[field].join(', ')
                      : String((editedItem as any)[field] ?? '')
                  }
                  onChangeText={text =>
                    handleChange(
                      field as keyof WardrobeItem,
                      field === 'tags'
                        ? text.split(',').map(t => t.trim())
                        : text,
                    )
                  }
                  style={[
                    styles.input,
                    {
                      color: theme.colors.foreground,
                      borderColor: theme.colors.surface,
                    },
                  ]}
                />
              </View>
            ))}

            <View style={styles.switchRow}>
              <Text
                style={[styles.switchLabel, {color: theme.colors.foreground}]}>
                Favorite
              </Text>
              <Switch
                value={editedItem.favorite || false}
                onValueChange={val => handleChange('favorite', val)}
                thumbColor={theme.colors.primary}
              />
            </View>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, {backgroundColor: '#888'}]}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(editedItem)}
              style={[styles.button, {backgroundColor: theme.colors.primary}]}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Delete Item',
                'Are you sure you want to delete this item?',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete(item.id),
                  },
                ],
              );
            }}>
            <Text style={styles.deleteButtonText}>Delete Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
  },
});

/////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   Modal,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import type {WardrobeItem} from '../../hooks/useOutfitSuggestion';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   visible: boolean;
//   item: WardrobeItem;
//   onClose: () => void;
//   onSave: (updatedItem: WardrobeItem) => void;
// };

// export default function EditItemModal({visible, item, onClose, onSave}: Props) {
//   const {theme} = useAppTheme();
//   const [editedItem, setEditedItem] = useState(item);

//   const handleChange = (key: keyof WardrobeItem, value: any) => {
//     setEditedItem({...editedItem, [key]: value});
//   };

//   return (
//     <Modal visible={visible} animationType="slide" transparent>
//       <View style={styles.overlay}>
//         <View
//           style={[styles.modal, {backgroundColor: theme.colors.background}]}>
//           <Text style={[styles.title, {color: theme.colors.foreground}]}>
//             Edit Item
//           </Text>

//           <ScrollView>
//             {[
//               'name',
//               'mainCategory',
//               'subCategory',
//               'color',
//               'material',
//               'fit',
//               'size',
//               'notes',
//             ].map(field => (
//               <TextInput
//                 key={field}
//                 placeholder={field}
//                 placeholderTextColor={theme.colors.muted}
//                 value={(editedItem as any)[field]}
//                 onChangeText={text =>
//                   handleChange(field as keyof WardrobeItem, text)
//                 }
//                 style={[
//                   styles.input,
//                   {
//                     color: theme.colors.foreground,
//                     borderColor: theme.colors.surface,
//                   },
//                 ]}
//               />
//             ))}
//           </ScrollView>

//           <View style={styles.buttons}>
//             <TouchableOpacity
//               onPress={onClose}
//               style={[styles.button, {backgroundColor: '#aaa'}]}>
//               <Text style={styles.buttonText}>Cancel</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               onPress={() => onSave(editedItem)}
//               style={[styles.button, {backgroundColor: theme.colors.primary}]}>
//               <Text style={styles.buttonText}>Save</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     justifyContent: 'center',
//     padding: 20,
//   },
//   modal: {
//     borderRadius: 20,
//     padding: 20,
//     maxHeight: '90%',
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginBottom: 12,
//   },
//   input: {
//     borderWidth: 1,
//     borderRadius: 8,
//     padding: 10,
//     marginBottom: 12,
//     fontSize: 16,
//   },
//   buttons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 8,
//   },
//   button: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginHorizontal: 6,
//     alignItems: 'center',
//   },
//   buttonText: {
//     color: '#fff',
//     fontWeight: '600',
//   },
// });
