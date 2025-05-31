import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';
import {useAppTheme} from '../context/ThemeContext';

type Props = {
  wardrobe: WardrobeItem[];
  navigate: (screen: string) => void;
  saveOutfit: (items: WardrobeItem[], name: string) => void;
};

export default function OutfitBuilderScreen({
  wardrobe,
  navigate,
  saveOutfit,
}: Props) {
  const {theme} = useAppTheme();
  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [saved, setSaved] = useState(false);

  const styles = StyleSheet.create({
    container: {flex: 1},
    title: {
      fontSize: 24,
      fontWeight: '600',
      marginVertical: 10,
    },
    subtitle: {
      fontSize: 16,
      marginTop: 16,
      marginBottom: 6,
    },
    selectedRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    selectedImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 6,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      paddingBottom: 100,
      gap: 8,
    },
    itemImage: {
      width: 100,
      height: 100,
      margin: 4,
      borderRadius: 10,
    },
    saveButton: {
      marginTop: 20,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  });

  const toggleItem = (item: WardrobeItem) => {
    if (selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const handleSave = () => {
    if (selectedItems.length === 0) return;

    const now = new Date();
    const name = `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    )}`;

    saveOutfit(selectedItems, name); // ✅ Actually save the outfit
    setSaved(true);
    navigate('SavedOutfits');
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={styles.title}>Build Your Outfit</Text>

      <Text style={styles.subtitle}>Selected Items:</Text>
      <View style={styles.selectedRow}>
        {selectedItems.map(item => (
          <Image
            key={item.id}
            source={{uri: item.image}}
            style={styles.selectedImage}
          />
        ))}
      </View>

      <Text style={styles.subtitle}>Tap items to add:</Text>
      <View style={styles.grid}>
        {wardrobe.map(item => {
          const isSelected = selectedItems.some(i => i.id === item.id);
          return (
            <TouchableOpacity key={item.id} onPress={() => toggleItem(item)}>
              <Image
                source={{uri: item.image}}
                style={[
                  styles.itemImage,
                  isSelected && {borderColor: '#4ade80', borderWidth: 3},
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          {backgroundColor: selectedItems.length ? '#4ade80' : '#999'},
        ]}
        onPress={handleSave}
        disabled={selectedItems.length === 0}>
        <Text style={styles.saveText}>
          {saved ? '✅ Outfit Saved' : 'Save Outfit'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

///////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {useAppTheme} from '../context/ThemeContext';
// import {useSavedOutfits} from '../hooks/useSavedOutfits';

// type Props = {
//   wardrobe: WardrobeItem[];
//   navigate: (screen: string) => void;
//   saveOutfit: (items: WardrobeItem[], name: string) => void;
// };

// export default function OutfitBuilderScreen({
//   wardrobe,
//   navigate,
//   saveOutfit,
// }: Props) {
//   const {theme} = useAppTheme();
//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [saved, setSaved] = useState(false);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       // padding: 12,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '600',
//       marginVertical: 10,
//     },
//     subtitle: {
//       fontSize: 16,
//       marginTop: 16,
//       marginBottom: 6,
//     },
//     selectedRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//     },
//     selectedImage: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       paddingBottom: 100,
//       gap: 8,
//     },
//     itemImage: {
//       width: 100,
//       height: 100,
//       margin: 4,
//       borderRadius: 10,
//     },
//     saveButton: {
//       marginTop: 20,
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     saveText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//   });

//   const toggleItem = (item: WardrobeItem) => {
//     if (selectedItems.find(i => i.id === item.id)) {
//       setSelectedItems(prev => prev.filter(i => i.id !== item.id));
//     } else {
//       setSelectedItems(prev => [...prev, item]);
//     }
//   };

//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     const name = `Outfit ${Date.now()}`;
//     saveOutfit(selectedItems, name); // ✅ ADD THIS LINE
//     setSaved(true);
//     navigate('SavedOutfits');
//   };
//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={styles.title}>Build Your Outfit</Text>

//       <Text style={styles.subtitle}>Selected Items:</Text>
//       <View style={styles.selectedRow}>
//         {selectedItems.map(item => (
//           <Image
//             key={item.id}
//             source={{uri: item.image}}
//             style={styles.selectedImage}
//           />
//         ))}
//       </View>

//       <Text style={styles.subtitle}>Tap items to add:</Text>
//       <View style={styles.grid}>
//         {wardrobe.map(item => {
//           const isSelected = selectedItems.some(i => i.id === item.id);
//           return (
//             <TouchableOpacity key={item.id} onPress={() => toggleItem(item)}>
//               <Image
//                 source={{uri: item.image}}
//                 style={[
//                   styles.itemImage,
//                   isSelected && {borderColor: '#4ade80', borderWidth: 3},
//                 ]}
//               />
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       <TouchableOpacity
//         style={[
//           styles.saveButton,
//           {backgroundColor: selectedItems.length ? '#4ade80' : '#999'},
//         ]}
//         onPress={handleSave}
//         disabled={selectedItems.length === 0}>
//         <Text style={styles.saveText}>
//           {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//         </Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

///////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {useAppTheme} from '../context/ThemeContext';

// type Props = {
//   wardrobe: WardrobeItem[];
//   onSaveOutfit: (outfit: WardrobeItem[], name: string) => void;
// };

// export default function OutfitBuilderScreen({wardrobe, onSaveOutfit}: Props) {
//   const {theme} = useAppTheme();
//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [saved, setSaved] = useState(false);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       // padding: 12,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '600',
//       marginVertical: 10,
//     },
//     subtitle: {
//       fontSize: 16,
//       marginTop: 16,
//       marginBottom: 6,
//     },
//     selectedRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//     },
//     selectedImage: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       paddingBottom: 100,
//       gap: 8,
//     },
//     itemImage: {
//       width: 100,
//       height: 100,
//       margin: 4,
//       borderRadius: 10,
//     },
//     saveButton: {
//       marginTop: 20,
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     saveText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//   });

//   const toggleItem = (item: WardrobeItem) => {
//     if (selectedItems.find(i => i.id === item.id)) {
//       setSelectedItems(prev => prev.filter(i => i.id !== item.id));
//     } else {
//       setSelectedItems(prev => [...prev, item]);
//     }
//   };

//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     const name = `Outfit ${Date.now()}`;
//     onSaveOutfit(selectedItems, name);
//     setSaved(true);
//   };

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={styles.title}>Build Your Outfit</Text>

//       <Text style={styles.subtitle}>Selected Items:</Text>
//       <View style={styles.selectedRow}>
//         {selectedItems.map(item => (
//           <Image
//             key={item.id}
//             source={{uri: item.image}}
//             style={styles.selectedImage}
//           />
//         ))}
//       </View>

//       <Text style={styles.subtitle}>Tap items to add:</Text>
//       <View style={styles.grid}>
//         {wardrobe.map(item => {
//           const isSelected = selectedItems.some(i => i.id === item.id);
//           return (
//             <TouchableOpacity key={item.id} onPress={() => toggleItem(item)}>
//               <Image
//                 source={{uri: item.image}}
//                 style={[
//                   styles.itemImage,
//                   isSelected && {borderColor: '#4ade80', borderWidth: 3},
//                 ]}
//               />
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       <TouchableOpacity
//         style={[
//           styles.saveButton,
//           {backgroundColor: selectedItems.length ? '#4ade80' : '#999'},
//         ]}
//         onPress={handleSave}
//         disabled={selectedItems.length === 0}>
//         <Text style={styles.saveText}>
//           {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//         </Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

//////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   Image,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// type Props = {
//   wardrobe: WardrobeItem[];
//   onSaveOutfit: (outfit: WardrobeItem[], name: string) => void;
// };

// export default function OutfitBuilderScreen({wardrobe, onSaveOutfit}: Props) {
//   const {theme} = useAppTheme();
//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [saved, setSaved] = useState(false);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       padding: 12,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '600',
//       marginVertical: 10,
//     },
//     subtitle: {
//       fontSize: 16,
//       marginTop: 16,
//       marginBottom: 6,
//     },
//     selectedRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     selectedImage: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//     },
//     grid: {
//       paddingBottom: 100,
//       gap: 8,
//     },
//     itemImage: {
//       width: 100,
//       height: 100,
//       margin: 4,
//       borderRadius: 10,
//     },
//     saveButton: {
//       marginTop: 20,
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     saveText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//   });

//   const toggleItem = (item: WardrobeItem) => {
//     if (selectedItems.find(i => i.id === item.id)) {
//       setSelectedItems(prev => prev.filter(i => i.id !== item.id));
//     } else {
//       setSelectedItems(prev => [...prev, item]);
//     }
//   };

//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     const name = `Outfit ${Date.now()}`;
//     onSaveOutfit(selectedItems, name);
//     setSaved(true);
//   };

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={styles.title}>Build Your Outfit</Text>

//       <Text style={styles.subtitle}>Selected Items:</Text>
//       <View style={styles.selectedRow}>
//         {selectedItems.map(item => (
//           <Image
//             key={item.id}
//             source={{uri: item.image}}
//             style={styles.selectedImage}
//           />
//         ))}
//       </View>

//       <Text style={styles.subtitle}>Tap items to add:</Text>
//       <FlatList
//         data={wardrobe}
//         keyExtractor={item => item.id}
//         numColumns={3}
//         contentContainerStyle={styles.grid}
//         renderItem={({item}) => {
//           const isSelected = selectedItems.some(i => i.id === item.id);
//           return (
//             <TouchableOpacity onPress={() => toggleItem(item)}>
//               <Image
//                 source={{uri: item.image}}
//                 style={[
//                   styles.itemImage,
//                   isSelected && {borderColor: '#4ade80', borderWidth: 3},
//                 ]}
//               />
//             </TouchableOpacity>
//           );
//         }}
//       />

//       <TouchableOpacity
//         style={[
//           styles.saveButton,
//           {backgroundColor: selectedItems.length ? '#4ade80' : '#999'},
//         ]}
//         onPress={handleSave}
//         disabled={selectedItems.length === 0}>
//         <Text style={styles.saveText}>
//           {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//         </Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }
