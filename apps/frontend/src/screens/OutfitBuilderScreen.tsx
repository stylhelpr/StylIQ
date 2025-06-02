import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
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
  const [showNameModal, setShowNameModal] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [saved, setSaved] = useState(false);

  const toggleItem = (item: WardrobeItem) => {
    if (selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const handleSave = () => {
    if (selectedItems.length === 0) return;
    setShowNameModal(true);
  };

  const finalizeSave = () => {
    const now = new Date();
    const name =
      outfitName.trim() ||
      `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    saveOutfit(selectedItems, name);
    setSaved(true);
    setShowNameModal(false);
    setOutfitName('');
    navigate('SavedOutfits');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      marginTop: 20,
      marginBottom: 10,
      paddingHorizontal: 16,
      color: theme.colors.primary,
    },
    subtitle: {
      fontSize: 16,
      marginTop: 16,
      marginBottom: 6,
      paddingHorizontal: 16,
      color: theme.colors.foreground,
    },
    selectedRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
    },
    selectedImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 6,
      marginBottom: 6,
    },
    clearButton: {
      alignSelf: 'flex-end',
      marginHorizontal: 16,
      marginTop: 4,
      backgroundColor: '#ddd',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    clearButtonText: {
      color: '#333',
      fontWeight: '500',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      padding: 16,
      gap: 8,
    },
    itemWrapper: {
      position: 'relative',
    },
    itemImage: {
      width: 100,
      height: 100,
      margin: 4,
      borderRadius: 10,
    },
    checkOverlay: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    checkText: {
      color: '#fff',
      fontSize: 12,
    },
    saveButton: {
      marginTop: 20,
      marginBottom: 40,
      marginHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    modalContent: {
      backgroundColor: 'theme.colors.surface',
      padding: 24,
      borderRadius: 12,
      marginHorizontal: 40,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginTop: 12,
      fontSize: 16,
      borderColor: '#ccc',
      color: theme.colors.foreground,
    },
    modalButton: {
      backgroundColor: '#405de6',
      marginTop: 20,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalButtonText: {
      color: 'theme.colors.background',
      fontWeight: '600',
    },
  });

  return (
    <ScrollView style={styles.container}>
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

      {selectedItems.length > 0 && (
        <TouchableOpacity
          onPress={() => setSelectedItems([])}
          style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear Selection</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.subtitle}>Tap items to add:</Text>
      <View style={styles.grid}>
        {wardrobe.map(item => {
          const isSelected = selectedItems.some(i => i.id === item.id);
          return (
            <TouchableOpacity key={item.id} onPress={() => toggleItem(item)}>
              <View style={styles.itemWrapper}>
                <Image
                  source={{uri: item.image}}
                  style={[
                    styles.itemImage,
                    isSelected && {borderColor: '#4ade80', borderWidth: 3},
                  ]}
                />
                {isSelected && (
                  <View style={styles.checkOverlay}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          {backgroundColor: selectedItems.length ? '#405de6' : '#999'},
        ]}
        onPress={handleSave}
        disabled={selectedItems.length === 0}>
        <Text style={styles.saveText}>
          {saved ? '✅ Outfit Saved' : 'Save Outfit'}
        </Text>
      </TouchableOpacity>

      {/* 🟡 NAME MODAL */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: theme.colors.foreground,
                  }}>
                  Name Your Outfit
                </Text>

                <TextInput
                  placeholder="Enter outfit name"
                  placeholderTextColor={theme.colors.muted}
                  value={outfitName}
                  onChangeText={setOutfitName}
                  style={styles.modalInput}
                />

                <TouchableOpacity
                  onPress={finalizeSave}
                  style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Save Outfit</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

//////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   TextInput,
//   Modal,
//   TouchableWithoutFeedback,
// } from 'react-native';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {useAppTheme} from '../context/ThemeContext';

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
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     title: {
//       fontSize: 24,
//       fontWeight: '600',
//       marginVertical: 10,
//       paddingHorizontal: 16,
//       color: theme.colors.primary,
//     },
//     subtitle: {
//       fontSize: 16,
//       marginTop: 16,
//       marginBottom: 6,
//       paddingHorizontal: 16,
//       color: theme.colors.foreground,
//     },
//     selectedRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       paddingHorizontal: 16,
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
//       padding: 16,
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
//       marginBottom: 40,
//       marginHorizontal: 16,
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     saveText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 24,
//       borderRadius: 12,
//       marginHorizontal: 40,
//     },
//     modalInput: {
//       borderWidth: 1,
//       borderRadius: 8,
//       padding: 10,
//       marginTop: 12,
//       fontSize: 16,
//       borderColor: '#ccc',
//       color: theme.colors.foreground,
//     },
//     modalButton: {
//       backgroundColor: theme.colors.primary,
//       marginTop: 20,
//       paddingVertical: 10,
//       borderRadius: 8,
//       alignItems: 'center',
//     },
//     modalButtonText: {
//       color: theme.colors.background,
//       fontWeight: '600',
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
//     setShowNameModal(true);
//   };

//   const finalizeSave = () => {
//     const now = new Date();
//     const name =
//       outfitName.trim() ||
//       `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//       })}`;

//     saveOutfit(selectedItems, name);
//     setSaved(true);
//     setShowNameModal(false);
//     setOutfitName('');
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

//       {/* 🟡 NAME MODAL */}
//       <Modal visible={showNameModal} transparent animationType="fade">
//         <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//           <View
//             style={{
//               flex: 1,
//               justifyContent: 'center',
//               backgroundColor: 'rgba(0,0,0,0.5)',
//             }}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 <Text
//                   style={{
//                     fontSize: 18,
//                     fontWeight: '600',
//                     color: theme.colors.foreground,
//                   }}>
//                   Name Your Outfit
//                 </Text>

//                 <TextInput
//                   placeholder="Enter outfit name"
//                   placeholderTextColor={theme.colors.muted}
//                   value={outfitName}
//                   onChangeText={setOutfitName}
//                   style={styles.modalInput}
//                 />

//                 <TouchableOpacity
//                   onPress={finalizeSave}
//                   style={styles.modalButton}>
//                   <Text style={styles.modalButtonText}>Save Outfit</Text>
//                 </TouchableOpacity>
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
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
//     container: {flex: 1},
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

//     const now = new Date();
//     const name = `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString(
//       [],
//       {
//         hour: '2-digit',
//         minute: '2-digit',
//       },
//     )}`;

//     saveOutfit(selectedItems, name); // ✅ Actually save the outfit
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
