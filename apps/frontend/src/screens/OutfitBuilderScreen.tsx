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
  ActivityIndicator,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {useQuery} from '@tanstack/react-query';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

type WardrobeItem = {
  id: string;
  image_url: string;
  name: string;
  main_category: string; // e.g. "Tops", "Shoes"
  subcategory: string;
};

type Props = {
  navigate: (screen: string) => void;
};

export default function OutfitBuilderScreen({navigate}: Props) {
  const LOCAL_IP = '192.168.0.106';
  const PORT = 3001;
  const userId = useUUID();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [saved, setSaved] = useState(false);

  const {
    data: wardrobe = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['wardrobe', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe');
      return res.json();
    },
    enabled: !!userId,
  });

  const toggleItem = (item: WardrobeItem) => {
    setSelectedItems(prev =>
      prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item],
    );
  };

  const handleSave = () => {
    if (selectedItems.length === 0) return;
    setShowNameModal(true);
  };

  const finalizeSave = async () => {
    if (selectedItems.length === 0) return;

    const now = new Date();
    const name =
      outfitName.trim() ||
      `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const top = selectedItems.find(i => i.main_category === 'Tops');
    const bottom = selectedItems.find(i => i.main_category === 'Bottoms');
    const shoes = selectedItems.find(i => i.main_category === 'Shoes');
    const accessories = selectedItems.filter(
      i => i.main_category === 'Accessories',
    );

    const thumbnail = selectedItems[0]?.image_url || null;

    try {
      const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          prompt: 'manual',
          name,
          top_id: top?.id,
          bottom_id: bottom?.id,
          shoes_id: shoes?.id,
          accessory_ids: accessories.map(i => i.id),
          location: null,
          weather_data: null,
          thumbnail_url: thumbnail,
        }),
      });

      const newOutfit = await res.json();

      await fetch(`${API_BASE_URL}/outfit/favorite`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          outfit_id: newOutfit.id,
        }),
      });

      setSaved(true);
      setShowNameModal(false);
      setOutfitName('');
      navigate('SavedOutfits');
    } catch (err) {
      console.error('❌ Failed to save outfit:', err);
    }
  };

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    selectedRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    selectedImage: {
      width: 85,
      height: 85,
      borderRadius: 8,
      marginRight: 6,
      marginBottom: 6,
    },
    clearButton: {
      alignSelf: 'flex-end',
      padding: 8,
      marginTop: 4,
      backgroundColor: '#ddd',
      borderRadius: 8,
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
    },
    itemWrapper: {
      position: 'relative',
    },
    itemImage: {
      width: 92,
      height: 92,
      margin: 4,
      borderRadius: tokens.borderRadius.md,
    },
    checkOverlay: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      paddingVertical: 2,
    },
    checkText: {
      color: '#fff',
      fontSize: 12,
    },
    saveButton: {
      width: 160,
      maxWidth: 160,
      paddingVertical: 12,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.button1,
      alignItems: 'center',
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    cancelButton: {
      width: 160,
      maxWidth: 160,
      paddingVertical: 12,
      borderRadius: tokens.borderRadius.md,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    modalContent: {
      padding: 24,
      borderRadius: 12,
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
      backgroundColor: theme.colors.button1,
      marginTop: 20,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalButtonText: {
      fontWeight: '600',
    },
  });

  if (isLoading) {
    return (
      <View
        style={[
          globalStyles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{marginTop: 16, color: theme.colors.foreground}}>
          Loading wardrobe...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[
          globalStyles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <Text style={{color: 'red'}}>Failed to load wardrobe items.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.sectionTitle}>
        <Text style={globalStyles.header}>Build Your Outfit</Text>
      </View>
      <View style={[globalStyles.modalSection]}>
        <View style={[globalStyles.section, {paddingTop: 20}]}>
          <Text style={globalStyles.sectionTitle}>Selected Items:</Text>
          <View style={styles.selectedRow}>
            {selectedItems.map(item => (
              <Image
                key={item.id}
                source={{uri: item.image_url}}
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

          <Text style={globalStyles.title}>Tap items to add:</Text>
          <View style={styles.grid}>
            {wardrobe.map(item => {
              const isSelected = selectedItems.some(i => i.id === item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleItem(item)}>
                  <View style={styles.itemWrapper}>
                    <Image
                      source={{uri: item.image_url}}
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

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 20,
            }}>
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

            <TouchableOpacity
              style={[
                styles.cancelButton,
                {marginLeft: 10, backgroundColor: '#ccc'},
              ]}
              onPress={() => {
                setSelectedItems([]);
                setOutfitName('');
                navigate('Wardrobe');
              }}>
              <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
            </TouchableOpacity>
          </View>

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
        </View>
      </View>
    </ScrollView>
  );
}

//////////////

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
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useQuery} from '@tanstack/react-query';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   main_category: string; // e.g. "Tops", "Shoes"
//   subcategory: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function OutfitBuilderScreen({navigate}: Props) {
//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const toggleItem = (item: WardrobeItem) => {
//     setSelectedItems(prev =>
//       prev.some(i => i.id === item.id)
//         ? prev.filter(i => i.id !== item.id)
//         : [...prev, item],
//     );
//   };

//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     setShowNameModal(true);
//   };

//   const finalizeSave = async () => {
//     if (selectedItems.length === 0) return;

//     const now = new Date();
//     const name =
//       outfitName.trim() ||
//       `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//       })}`;

//     const top = selectedItems.find(i => i.main_category === 'Tops');
//     const bottom = selectedItems.find(i => i.main_category === 'Bottoms');
//     const shoes = selectedItems.find(i => i.main_category === 'Shoes');
//     const accessories = selectedItems.filter(
//       i => i.main_category === 'Accessories',
//     );

//     const thumbnail = selectedItems[0]?.image_url || null;

//     try {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           prompt: 'manual',
//           name,
//           top_id: top?.id,
//           bottom_id: bottom?.id,
//           shoes_id: shoes?.id,
//           accessory_ids: accessories.map(i => i.id),
//           location: null,
//           weather_data: null,
//           thumbnail_url: thumbnail,
//         }),
//       });

//       const newOutfit = await res.json();

//       await fetch(`${API_BASE_URL}/outfit/favorite`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           outfit_id: newOutfit.id,
//         }),
//       });

//       setSaved(true);
//       setShowNameModal(false);
//       setOutfitName('');
//       navigate('SavedOutfits');
//     } catch (err) {
//       console.error('❌ Failed to save outfit:', err);
//     }
//   };

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     selectedRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//     },
//     selectedImage: {
//       width: 85,
//       height: 85,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     clearButton: {
//       alignSelf: 'flex-end',
//       padding: 8,
//       marginTop: 4,
//       backgroundColor: '#ddd',
//       borderRadius: 8,
//       paddingVertical: 6,
//     },
//     clearButtonText: {
//       color: '#333',
//       fontWeight: '500',
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//     },
//     itemWrapper: {
//       position: 'relative',
//     },
//     itemImage: {
//       width: 92,
//       height: 92,
//       margin: 4,
//       borderRadius: tokens.borderRadius.md,
//     },
//     checkOverlay: {
//       position: 'absolute',
//       top: 6,
//       right: 6,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 12,
//       paddingVertical: 2,
//     },
//     checkText: {
//       color: '#fff',
//       fontSize: 12,
//     },
//     saveButton: {
//       width: 160,
//       maxWidth: 160,
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.button1,
//       alignItems: 'center',
//     },
//     saveText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     cancelButton: {
//       width: 160,
//       maxWidth: 160,
//       paddingVertical: 12,
//       borderRadius: tokens.borderRadius.md,
//       alignItems: 'center',
//     },
//     cancelText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
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
//       backgroundColor: theme.colors.button1,
//       marginTop: 20,
//       paddingVertical: 10,
//       borderRadius: 8,
//       alignItems: 'center',
//     },
//     modalButtonText: {
//       fontWeight: '600',
//     },
//   });

//   if (isLoading) {
//     return (
//       <View
//         style={[
//           globalStyles.container,
//           {justifyContent: 'center', alignItems: 'center'},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text style={{marginTop: 16, color: theme.colors.foreground}}>
//           Loading wardrobe...
//         </Text>
//       </View>
//     );
//   }

//   if (isError) {
//     return (
//       <View
//         style={[
//           globalStyles.container,
//           {justifyContent: 'center', alignItems: 'center'},
//         ]}>
//         <Text style={{color: 'red'}}>Failed to load wardrobe items.</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView style={globalStyles.container}>
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Build Your Outfit</Text>
//       </View>

//       <View style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Selected Items:</Text>
//         <View style={styles.selectedRow}>
//           {selectedItems.map(item => (
//             <Image
//               key={item.id}
//               source={{uri: item.image_url}}
//               style={styles.selectedImage}
//             />
//           ))}
//         </View>

//         {selectedItems.length > 0 && (
//           <TouchableOpacity
//             onPress={() => setSelectedItems([])}
//             style={styles.clearButton}>
//             <Text style={styles.clearButtonText}>Clear Selection</Text>
//           </TouchableOpacity>
//         )}

//         <Text style={globalStyles.title}>Tap items to add:</Text>
//         <View style={styles.grid}>
//           {wardrobe.map(item => {
//             const isSelected = selectedItems.some(i => i.id === item.id);
//             return (
//               <TouchableOpacity key={item.id} onPress={() => toggleItem(item)}>
//                 <View style={styles.itemWrapper}>
//                   <Image
//                     source={{uri: item.image_url}}
//                     style={[
//                       styles.itemImage,
//                       isSelected && {borderColor: '#4ade80', borderWidth: 3},
//                     ]}
//                   />
//                   {isSelected && (
//                     <View style={styles.checkOverlay}>
//                       <Text style={styles.checkText}>✓</Text>
//                     </View>
//                   )}
//                 </View>
//               </TouchableOpacity>
//             );
//           })}
//         </View>

//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'center',
//             alignItems: 'center',
//             marginTop: 20,
//           }}>
//           <TouchableOpacity
//             style={[
//               styles.saveButton,
//               {backgroundColor: selectedItems.length ? '#405de6' : '#999'},
//             ]}
//             onPress={handleSave}
//             disabled={selectedItems.length === 0}>
//             <Text style={styles.saveText}>
//               {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[
//               styles.cancelButton,
//               {marginLeft: 10, backgroundColor: '#ccc'},
//             ]}
//             onPress={() => {
//               setSelectedItems([]);
//               setOutfitName('');
//               navigate('Wardrobe');
//             }}>
//             <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
//           </TouchableOpacity>
//         </View>

//         <Modal visible={showNameModal} transparent animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.modalContent}>
//                   <Text
//                     style={{
//                       fontSize: 18,
//                       fontWeight: '600',
//                       color: theme.colors.foreground,
//                     }}>
//                     Name Your Outfit
//                   </Text>

//                   <TextInput
//                     placeholder="Enter outfit name"
//                     placeholderTextColor={theme.colors.muted}
//                     value={outfitName}
//                     onChangeText={setOutfitName}
//                     style={styles.modalInput}
//                   />

//                   <TouchableOpacity
//                     onPress={finalizeSave}
//                     style={styles.modalButton}>
//                     <Text style={styles.modalButtonText}>Save Outfit</Text>
//                   </TouchableOpacity>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>
//     </ScrollView>
//   );
// }

////////////////

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
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useQuery} from '@tanstack/react-query';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   main_category: string; // e.g. "Tops", "Shoes"
//   subcategory: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function OutfitBuilderScreen({navigate}: Props) {
//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//     enabled: !!userId,
//   });

//   const toggleItem = (item: WardrobeItem) => {
//     setSelectedItems(prev =>
//       prev.some(i => i.id === item.id)
//         ? prev.filter(i => i.id !== item.id)
//         : [...prev, item],
//     );
//   };

//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     setShowNameModal(true);
//   };

//   const finalizeSave = async () => {
//     if (selectedItems.length === 0) return;

//     const now = new Date();
//     const name =
//       outfitName.trim() ||
//       `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//       })}`;

//     const top = selectedItems.find(i => i.main_category === 'Tops');
//     const bottom = selectedItems.find(i => i.main_category === 'Bottoms');
//     const shoes = selectedItems.find(i => i.main_category === 'Shoes');
//     const accessories = selectedItems.filter(
//       i => i.main_category === 'Accessories',
//     );

//     const thumbnail = selectedItems[0]?.image_url || null;

//     try {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           prompt: 'manual',
//           name,
//           top_id: top?.id,
//           bottom_id: bottom?.id,
//           shoes_id: shoes?.id,
//           accessory_ids: accessories.map(i => i.id),
//           location: null,
//           weather_data: null,
//           thumbnail_url: thumbnail,
//         }),
//       });

//       const newOutfit = await res.json();

//       await fetch(`${API_BASE_URL}/outfit/favorite`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           outfit_id: newOutfit.id,
//         }),
//       });

//       setSaved(true);
//       setShowNameModal(false);
//       setOutfitName('');
//       navigate('SavedOutfits');
//     } catch (err) {
//       console.error('❌ Failed to save outfit:', err);
//     }
//   };

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     selectedRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//     },
//     selectedImage: {
//       width: 85,
//       height: 85,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     clearButton: {
//       alignSelf: 'flex-end',
//       padding: 8,
//       marginTop: 4,
//       backgroundColor: '#ddd',
//       borderRadius: 8,
//       paddingVertical: 6,
//     },
//     clearButtonText: {
//       color: '#333',
//       fontWeight: '500',
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//     },
//     itemWrapper: {
//       position: 'relative',
//     },
//     itemImage: {
//       width: 92,
//       height: 92,
//       margin: 4,
//       borderRadius: tokens.borderRadius.md,
//     },
//     checkOverlay: {
//       position: 'absolute',
//       top: 6,
//       right: 6,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 12,
//       paddingVertical: 2,
//     },
//     checkText: {
//       color: '#fff',
//       fontSize: 12,
//     },
//     saveButton: {
//       marginTop: 20,
//       marginBottom: 14,
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     saveText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     cancelButton: {
//       marginTop: 0,
//       paddingVertical: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     cancelText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
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
//       backgroundColor: theme.colors.button1,
//       marginTop: 20,
//       paddingVertical: 10,
//       borderRadius: 8,
//       alignItems: 'center',
//     },
//     modalButtonText: {
//       fontWeight: '600',
//     },
//   });

//   if (isLoading) {
//     return (
//       <View
//         style={[
//           globalStyles.container,
//           {justifyContent: 'center', alignItems: 'center'},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text style={{marginTop: 16, color: theme.colors.foreground}}>
//           Loading wardrobe...
//         </Text>
//       </View>
//     );
//   }

//   if (isError) {
//     return (
//       <View
//         style={[
//           globalStyles.container,
//           {justifyContent: 'center', alignItems: 'center'},
//         ]}>
//         <Text style={{color: 'red'}}>Failed to load wardrobe items.</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView style={globalStyles.container}>
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Build Your Outfit</Text>
//       </View>

//       <View style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Selected Items:</Text>
//         <View style={styles.selectedRow}>
//           {selectedItems.map(item => (
//             <Image
//               key={item.id}
//               source={{uri: item.image_url}}
//               style={styles.selectedImage}
//             />
//           ))}
//         </View>

//         {selectedItems.length > 0 && (
//           <TouchableOpacity
//             onPress={() => setSelectedItems([])}
//             style={styles.clearButton}>
//             <Text style={styles.clearButtonText}>Clear Selection</Text>
//           </TouchableOpacity>
//         )}

//         <Text style={globalStyles.title}>Tap items to add:</Text>
//         <View style={styles.grid}>
//           {wardrobe.map(item => {
//             const isSelected = selectedItems.some(i => i.id === item.id);
//             return (
//               <TouchableOpacity key={item.id} onPress={() => toggleItem(item)}>
//                 <View style={styles.itemWrapper}>
//                   <Image
//                     source={{uri: item.image_url}}
//                     style={[
//                       styles.itemImage,
//                       isSelected && {borderColor: '#4ade80', borderWidth: 3},
//                     ]}
//                   />
//                   {isSelected && (
//                     <View style={styles.checkOverlay}>
//                       <Text style={styles.checkText}>✓</Text>
//                     </View>
//                   )}
//                 </View>
//               </TouchableOpacity>
//             );
//           })}
//         </View>

//         <TouchableOpacity
//           style={[
//             styles.saveButton,
//             {backgroundColor: selectedItems.length ? '#405de6' : '#999'},
//           ]}
//           onPress={handleSave}
//           disabled={selectedItems.length === 0}>
//           <Text style={styles.saveText}>
//             {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[styles.cancelButton, {backgroundColor: '#ccc'}]}
//           onPress={() => {
//             setSelectedItems([]);
//             setOutfitName('');
//             navigate('Wardrobe');
//           }}>
//           <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
//         </TouchableOpacity>

//         <Modal visible={showNameModal} transparent animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//               }}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.modalContent}>
//                   <Text
//                     style={{
//                       fontSize: 18,
//                       fontWeight: '600',
//                       color: theme.colors.foreground,
//                     }}>
//                     Name Your Outfit
//                   </Text>

//                   <TextInput
//                     placeholder="Enter outfit name"
//                     placeholderTextColor={theme.colors.muted}
//                     value={outfitName}
//                     onChangeText={setOutfitName}
//                     style={styles.modalInput}
//                   />

//                   <TouchableOpacity
//                     onPress={finalizeSave}
//                     style={styles.modalButton}>
//                     <Text style={styles.modalButtonText}>Save Outfit</Text>
//                   </TouchableOpacity>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>
//     </ScrollView>
//   );
// }
