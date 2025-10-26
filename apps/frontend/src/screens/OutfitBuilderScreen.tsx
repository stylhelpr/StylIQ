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
  Alert,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {useQuery} from '@tanstack/react-query';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type WardrobeItem = {
  id: string;
  image_url: string;
  name: string;
  main_category: string;
  subcategory: string;
};

type Props = {
  navigate: (screen: string) => void;
};

export default function OutfitBuilderScreen({navigate}: Props) {
  const userId = useUUID();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [saved, setSaved] = useState(false);

  const resolveUri = (u?: string) => {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    const base = API_BASE_URL.replace(/\/+$/, '');
    const path = u.replace(/^\/+/, '');
    return `${base}/${path}`;
  };

  const h = (type: string) =>
    ReactNativeHapticFeedback.trigger(type, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  const hSelect = () => h('selection');
  const hSuccess = () => h('notificationSuccess');
  const hWarn = () => h('notificationWarning');
  const hError = () => h('notificationError');

  const {
    data: wardrobe = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['wardrobe', userId],
    queryFn: async () => {
      const url = `${API_BASE_URL}/wardrobe/${encodeURIComponent(userId)}`;
      const res = await fetch(url, {headers: {Accept: 'application/json'}});
      if (!res.ok) throw new Error(`Failed to fetch wardrobe`);
      const json = await res.json();
      return Array.isArray(json) ? json : json?.items ?? [];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const toggleItem = (item: WardrobeItem) => {
    setSelectedItems(prev => {
      if (prev.some(i => i.id === item.id)) {
        hSelect(); // deselect ping
        return prev.filter(i => i.id !== item.id);
      } else {
        if (prev.length >= 3) {
          hWarn(); // gentle warning for limit
          Alert.alert('Limit Reached', 'You can only select up to 3 items.');
          return prev;
        }
        hSelect(); // select ping
        return [...prev, item];
      }
    });
  };

  const handleSave = () => {
    if (selectedItems.length === 0) return;
    h('impactLight');
    setShowNameModal(true);
  };

  // 🧠 Normalize categories into slots
  const categorize = (
    item: WardrobeItem,
  ): 'top' | 'bottom' | 'shoes' | 'accessory' | null => {
    const cat = item.main_category?.toLowerCase() || '';
    if (
      [
        'tops',
        'outerwear',
        'shirts',
        'jackets',
        'knitwear',
        'sweaters',
        'blazers',
        'coats',
      ].some(c => cat.includes(c))
    )
      return 'top';
    if (
      [
        'bottoms',
        'pants',
        'trousers',
        'shorts',
        'skirts',
        'jeans',
        'denim',
      ].some(c => cat.includes(c))
    )
      return 'bottom';
    if (
      ['shoes', 'sneakers', 'loafers', 'boots', 'heels', 'sandals'].some(c =>
        cat.includes(c),
      )
    )
      return 'shoes';
    if (
      [
        'accessories',
        'hats',
        'scarves',
        'belts',
        'jewelry',
        'bags',
        'glasses',
      ].some(c => cat.includes(c))
    )
      return 'accessory';
    return null;
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

    const top = selectedItems.find(i => categorize(i) === 'top');
    const bottom = selectedItems.find(i => categorize(i) === 'bottom');
    const shoes = selectedItems.find(i => categorize(i) === 'shoes');
    const accessories = selectedItems.filter(
      i => categorize(i) === 'accessory',
    );

    if (
      selectedItems.filter(i => categorize(i) === 'top').length > 1 ||
      selectedItems.filter(i => categorize(i) === 'bottom').length > 1 ||
      selectedItems.filter(i => categorize(i) === 'shoes').length > 1
    ) {
      hWarn();
      Alert.alert(
        'Multiple Items Selected',
        'Only one Top, Bottom, and Shoes can be saved per outfit right now.',
        [{text: 'OK'}],
      );
      return;
    }

    const thumbnail = selectedItems[0]?.image_url ?? '';

    try {
      const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          prompt: 'manual',
          name,
          top_id: top?.id ?? null,
          bottom_id: bottom?.id ?? null,
          shoes_id: shoes?.id ?? null,
          accessory_ids: accessories.map(i => i.id),
          thumbnail_url: thumbnail,
        }),
      });

      const newOutfit = await res.json();

      await fetch(`${API_BASE_URL}/outfit/favorite`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId, outfit_id: newOutfit.id}),
      });

      hSuccess();
      setSaved(true);
      setShowNameModal(false);
      setOutfitName('');
      navigate('SavedOutfits');
    } catch (err) {
      hError();
      console.error('❌ Failed to save outfit:', err);
    }
  };

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    selectedRow: {flexDirection: 'row', flexWrap: 'wrap'},
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
      backgroundColor: theme.colors.button1,
      borderRadius: 8,
      paddingVertical: 6,
    },
    clearButtonText: {
      color: theme.colors.buttonText1,
      fontWeight: tokens.fontWeight.medium,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      borderRadius: 25,
      padding: 11,
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.surface,
      flexGrow: 1,
      width: '100%',
    },
    itemWrapper: {position: 'relative', alignItems: 'center'},
    itemImage: {
      width: 86,
      height: 86,
      margin: 4,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.background,
    },
    checkOverlay: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    checkText: {color: theme.colors.foreground, fontSize: 12},
    saveButton: {
      width: 160,
      paddingVertical: 9,
      borderRadius: tokens.borderRadius.sm,
      backgroundColor: theme.colors.button1,
      alignItems: 'center',
    },
    saveText: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.buttonText1,
    },
    cancelButton: {
      width: 160,
      paddingVertical: 9,
      borderRadius: tokens.borderRadius.sm,
      color: theme.colors.buttonText1,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.buttonText1,
    },
    modalContent: {
      padding: 24,
      borderRadius: tokens.borderRadius['2xl'],
      backgroundColor: theme.colors.surface,
      marginHorizontal: 36,
      paddingVertical: 38,
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
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.buttonText1,
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
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}
      contentContainerStyle={{paddingBottom: 120, flexGrow: 1}}>
      <View style={globalStyles.sectionTitle}>
        <Text style={globalStyles.header}>Build Your Outfit</Text>
      </View>

      <View style={[globalStyles.modalSection2]}>
        <View style={[globalStyles.section, {paddingTop: 20}]}>
          <Text style={globalStyles.sectionTitle}>Selected Items:</Text>

          <View
            style={[
              styles.selectedRow,
              {
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 2,
                marginBottom: 14,
                shadowOffset: {width: 0, height: 6},
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
                borderWidth: 1,
                borderColor: theme.colors.surfaceBorder,
                borderRadius: tokens.borderRadius.md,
                backgroundColor: theme.colors.surface,
                justifyContent: 'center',
              },
            ]}>
            {selectedItems.map(item => (
              <Image
                key={item.id}
                source={{uri: resolveUri(item.image_url)}}
                style={styles.selectedImage}
                resizeMode="cover"
              />
            ))}
          </View>

          {selectedItems.length > 0 && (
            <AppleTouchFeedback
              onPress={() => {
                hSelect();
                setSelectedItems([]);
              }}
              style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear Selection</Text>
            </AppleTouchFeedback>
          )}

          <Text style={globalStyles.title}>Tap items to add:</Text>

          {wardrobe.length === 0 ? (
            <View style={{padding: 16}}>
              <Text style={{color: theme.colors.muted}}>
                No wardrobe items yet.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {wardrobe.map((item: WardrobeItem) => {
                const isSelected = selectedItems.some(i => i.id === item.id);
                const uri = resolveUri(item.image_url);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleItem(item)}>
                    <View style={styles.itemWrapper}>
                      <Image
                        source={{uri}}
                        style={[
                          styles.itemImage,
                          isSelected && {
                            borderColor: '#4ade80',
                            borderWidth: 3,
                          },
                        ]}
                        resizeMode="cover"
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
          )}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 20,
            }}>
            <AppleTouchFeedback
              style={[
                styles.saveButton,
                {
                  backgroundColor: selectedItems.length
                    ? theme.colors.button1
                    : '#999',
                },
              ]}
              hapticStyle={selectedItems.length ? 'impactLight' : undefined}
              onPress={handleSave}
              disabled={selectedItems.length === 0}>
              <Text style={styles.saveText}>
                {saved ? '✅ Outfit Saved' : 'Save Outfit'}
              </Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              style={[
                styles.cancelButton,
                {marginLeft: 10, backgroundColor: '#ccc'},
              ]}
              hapticStyle="impactLight"
              onPress={() => {
                setSelectedItems([]);
                setOutfitName('');
                navigate('Wardrobe');
              }}>
              <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
            </AppleTouchFeedback>
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
                        fontWeight: tokens.fontWeight.semiBold,
                        color: theme.colors.foreground,
                        marginBottom: 6,
                      }}>
                      Name Your Outfit
                    </Text>

                    <TextInput
                      placeholder="Enter outfit name"
                      placeholderTextColor={theme.colors.muted}
                      value={outfitName}
                      onChangeText={setOutfitName}
                      style={[styles.modalInput, {marginBottom: 6}]}
                    />

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 20,
                      }}>
                      <AppleTouchFeedback
                        onPress={() => setShowNameModal(false)}
                        hapticStyle="impactLight"
                        style={[
                          globalStyles.buttonPrimary,
                          {
                            paddingHorizontal: 32,
                            backgroundColor: theme.colors.surface3,
                          },
                        ]}>
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </AppleTouchFeedback>

                      <AppleTouchFeedback
                        onPress={finalizeSave}
                        hapticStyle="impactLight"
                        style={[
                          globalStyles.buttonPrimary,
                          {paddingHorizontal: 20},
                        ]}>
                        <Text style={styles.modalButtonText}>Save Outfit</Text>
                      </AppleTouchFeedback>
                    </View>
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

///////////////////

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
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useQuery} from '@tanstack/react-query';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   main_category: string;
//   subcategory: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function OutfitBuilderScreen({navigate}: Props) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   const resolveUri = (u?: string) => {
//     if (!u) return '';
//     if (/^https?:\/\//i.test(u)) return u;
//     const base = API_BASE_URL.replace(/\/+$/, '');
//     const path = u.replace(/^\/+/, '');
//     return `${base}/${path}`;
//   };

//   const h = (type: string) =>
//     ReactNativeHapticFeedback.trigger(type, {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   const hSelect = () => h('selection');
//   const hSuccess = () => h('notificationSuccess');
//   const hWarn = () => h('notificationWarning');
//   const hError = () => h('notificationError');

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const url = `${API_BASE_URL}/wardrobe/${encodeURIComponent(userId)}`;
//       const res = await fetch(url, {headers: {Accept: 'application/json'}});
//       if (!res.ok) throw new Error(`Failed to fetch wardrobe`);
//       const json = await res.json();
//       return Array.isArray(json) ? json : json?.items ?? [];
//     },
//     enabled: !!userId,
//     staleTime: 30_000,
//   });

//   const toggleItem = (item: WardrobeItem) => {
//     setSelectedItems(prev => {
//       if (prev.some(i => i.id === item.id)) {
//         hSelect(); // deselect ping
//         return prev.filter(i => i.id !== item.id);
//       } else {
//         if (prev.length >= 3) {
//           hWarn(); // gentle warning for limit
//           Alert.alert('Limit Reached', 'You can only select up to 3 items.');
//           return prev;
//         }
//         hSelect(); // select ping
//         return [...prev, item];
//       }
//     });
//   };

//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     h('impactMedium');
//     setShowNameModal(true);
//   };

//   // 🧠 Normalize categories into slots
//   const categorize = (
//     item: WardrobeItem,
//   ): 'top' | 'bottom' | 'shoes' | 'accessory' | null => {
//     const cat = item.main_category?.toLowerCase() || '';
//     if (
//       [
//         'tops',
//         'outerwear',
//         'shirts',
//         'jackets',
//         'knitwear',
//         'sweaters',
//         'blazers',
//         'coats',
//       ].some(c => cat.includes(c))
//     )
//       return 'top';
//     if (
//       [
//         'bottoms',
//         'pants',
//         'trousers',
//         'shorts',
//         'skirts',
//         'jeans',
//         'denim',
//       ].some(c => cat.includes(c))
//     )
//       return 'bottom';
//     if (
//       ['shoes', 'sneakers', 'loafers', 'boots', 'heels', 'sandals'].some(c =>
//         cat.includes(c),
//       )
//     )
//       return 'shoes';
//     if (
//       [
//         'accessories',
//         'hats',
//         'scarves',
//         'belts',
//         'jewelry',
//         'bags',
//         'glasses',
//       ].some(c => cat.includes(c))
//     )
//       return 'accessory';
//     return null;
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

//     const top = selectedItems.find(i => categorize(i) === 'top');
//     const bottom = selectedItems.find(i => categorize(i) === 'bottom');
//     const shoes = selectedItems.find(i => categorize(i) === 'shoes');
//     const accessories = selectedItems.filter(
//       i => categorize(i) === 'accessory',
//     );

//     if (
//       selectedItems.filter(i => categorize(i) === 'top').length > 1 ||
//       selectedItems.filter(i => categorize(i) === 'bottom').length > 1 ||
//       selectedItems.filter(i => categorize(i) === 'shoes').length > 1
//     ) {
//       hWarn();
//       Alert.alert(
//         'Multiple Items Selected',
//         'Only one Top, Bottom, and Shoes can be saved per outfit right now.',
//         [{text: 'OK'}],
//       );
//       return;
//     }

//     const thumbnail = selectedItems[0]?.image_url ?? '';

//     try {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           prompt: 'manual',
//           name,
//           top_id: top?.id ?? null,
//           bottom_id: bottom?.id ?? null,
//           shoes_id: shoes?.id ?? null,
//           accessory_ids: accessories.map(i => i.id),
//           thumbnail_url: thumbnail,
//         }),
//       });

//       const newOutfit = await res.json();

//       await fetch(`${API_BASE_URL}/outfit/favorite`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: newOutfit.id}),
//       });

//       hSuccess();
//       setSaved(true);
//       setShowNameModal(false);
//       setOutfitName('');
//       navigate('SavedOutfits');
//     } catch (err) {
//       hError();
//       console.error('❌ Failed to save outfit:', err);
//     }
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     selectedRow: {flexDirection: 'row', flexWrap: 'wrap'},
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
//       backgroundColor: theme.colors.button1,
//       borderRadius: 8,
//       paddingVertical: 6,
//     },
//     clearButtonText: {color: theme.colors.buttonText1, fontWeight: '500'},
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       borderRadius: 25,
//       padding: 11,
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       flexGrow: 1,
//       width: '100%',
//     },
//     itemWrapper: {position: 'relative', alignItems: 'center'},
//     itemImage: {
//       width: 86,
//       height: 86,
//       margin: 4,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: '#eee',
//     },
//     checkOverlay: {
//       position: 'absolute',
//       top: 6,
//       right: 6,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 12,
//       paddingVertical: 2,
//       paddingHorizontal: 6,
//     },
//     checkText: {color: '#fff', fontSize: 12},
//     saveButton: {
//       width: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       alignItems: 'center',
//     },
//     saveText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.buttonText1,
//     },
//     cancelButton: {
//       width: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
//       color: theme.colors.buttonText1,
//       alignItems: 'center',
//     },
//     cancelText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.buttonText1,
//     },
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       marginHorizontal: 16,
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
//     modalButtonText: {fontWeight: '600', color: '#fff'},
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
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       contentContainerStyle={{paddingBottom: 120, flexGrow: 1}}>
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Build Your Outfit</Text>
//       </View>

//       <View style={[globalStyles.modalSection2]}>
//         <View style={[globalStyles.section, {paddingTop: 20}]}>
//           <Text style={globalStyles.sectionTitle}>Selected Items:</Text>

//           <View
//             style={[
//               styles.selectedRow,
//               {
//                 paddingHorizontal: 16,
//                 paddingTop: 8,
//                 paddingBottom: 2,
//                 marginBottom: 14,
//                 shadowOffset: {width: 0, height: 6},
//                 shadowOpacity: 0.1,
//                 shadowRadius: 12,
//                 elevation: 5,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//                 borderRadius: tokens.borderRadius.md,
//                 backgroundColor: theme.colors.surface,
//                 justifyContent: 'center',
//               },
//             ]}>
//             {selectedItems.map(item => (
//               <Image
//                 key={item.id}
//                 source={{uri: resolveUri(item.image_url)}}
//                 style={styles.selectedImage}
//                 resizeMode="cover"
//               />
//             ))}
//           </View>

//           {selectedItems.length > 0 && (
//             <AppleTouchFeedback
//               onPress={() => {
//                 hSelect();
//                 setSelectedItems([]);
//               }}
//               hapticStyle="impactLight"
//               style={styles.clearButton}>
//               <Text style={styles.clearButtonText}>Clear Selection</Text>
//             </AppleTouchFeedback>
//           )}

//           <Text style={globalStyles.title}>Tap items to add:</Text>

//           {wardrobe.length === 0 ? (
//             <View style={{padding: 16}}>
//               <Text style={{color: theme.colors.muted}}>
//                 No wardrobe items yet.
//               </Text>
//             </View>
//           ) : (
//             <View style={styles.grid}>
//               {wardrobe.map((item: WardrobeItem) => {
//                 const isSelected = selectedItems.some(i => i.id === item.id);
//                 const uri = resolveUri(item.image_url);
//                 return (
//                   <TouchableOpacity
//                     key={item.id}
//                     onPress={() => toggleItem(item)}>
//                     <View style={styles.itemWrapper}>
//                       <Image
//                         source={{uri}}
//                         style={[
//                           styles.itemImage,
//                           isSelected && {
//                             borderColor: '#4ade80',
//                             borderWidth: 3,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                       {isSelected && (
//                         <View style={styles.checkOverlay}>
//                           <Text style={styles.checkText}>✓</Text>
//                         </View>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>
//           )}

//           <View
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginTop: 20,
//             }}>
//             <AppleTouchFeedback
//               style={[
//                 styles.saveButton,
//                 {
//                   backgroundColor: selectedItems.length
//                     ? theme.colors.button1
//                     : '#999',
//                 },
//               ]}
//               hapticStyle={selectedItems.length ? 'impactMedium' : undefined}
//               onPress={handleSave}
//               disabled={selectedItems.length === 0}>
//               <Text style={styles.saveText}>
//                 {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={[
//                 styles.cancelButton,
//                 {marginLeft: 10, backgroundColor: '#ccc'},
//               ]}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setSelectedItems([]);
//                 setOutfitName('');
//                 navigate('Wardrobe');
//               }}>
//               <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
//             </AppleTouchFeedback>
//           </View>

//           <Modal visible={showNameModal} transparent animationType="fade">
//             <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                 }}>
//                 <TouchableWithoutFeedback>
//                   <View style={styles.modalContent}>
//                     <Text
//                       style={{
//                         fontSize: 18,
//                         fontWeight: '600',
//                         color: theme.colors.foreground,
//                       }}>
//                       Name Your Outfit
//                     </Text>

//                     <TextInput
//                       placeholder="Enter outfit name"
//                       placeholderTextColor={theme.colors.muted}
//                       value={outfitName}
//                       onChangeText={setOutfitName}
//                       style={styles.modalInput}
//                     />

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         marginTop: 20,
//                       }}>
//                       <AppleTouchFeedback
//                         onPress={() => setShowNameModal(false)}
//                         hapticStyle="impactLight"
//                         style={[
//                           styles.modalButton,
//                           {backgroundColor: '#999', flex: 1, marginRight: 8},
//                         ]}>
//                         <Text style={styles.modalButtonText}>Cancel</Text>
//                       </AppleTouchFeedback>

//                       <AppleTouchFeedback
//                         onPress={finalizeSave}
//                         hapticStyle="impactMedium"
//                         style={[styles.modalButton, {flex: 1, marginLeft: 8}]}>
//                         <Text style={styles.modalButtonText}>Save Outfit</Text>
//                       </AppleTouchFeedback>
//                     </View>
//                   </View>
//                 </TouchableWithoutFeedback>
//               </View>
//             </TouchableWithoutFeedback>
//           </Modal>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

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
//   Alert,
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
//   main_category: string;
//   subcategory: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function OutfitBuilderScreen({navigate}: Props) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   const resolveUri = (u?: string) => {
//     if (!u) return '';
//     if (/^https?:\/\//i.test(u)) return u;
//     const base = API_BASE_URL.replace(/\/+$/, '');
//     const path = u.replace(/^\/+/, '');
//     return `${base}/${path}`;
//   };

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const url = `${API_BASE_URL}/wardrobe/${encodeURIComponent(userId)}`;
//       const res = await fetch(url, {headers: {Accept: 'application/json'}});
//       if (!res.ok) throw new Error(`Failed to fetch wardrobe`);
//       const json = await res.json();
//       return Array.isArray(json) ? json : json?.items ?? [];
//     },
//     enabled: !!userId,
//     staleTime: 30_000,
//   });

//   const toggleItem = (item: WardrobeItem) => {
//     setSelectedItems(prev => {
//       if (prev.some(i => i.id === item.id)) {
//         // If already selected, remove it
//         return prev.filter(i => i.id !== item.id);
//       } else {
//         // If adding new, enforce 3-item max
//         if (prev.length >= 3) {
//           Alert.alert('Limit Reached', 'You can only select up to 3 items.');
//           return prev; // don’t add
//         }
//         return [...prev, item];
//       }
//     });
//   };

//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     setShowNameModal(true);
//   };

//   // 🧠 Normalize categories into slots
//   const categorize = (
//     item: WardrobeItem,
//   ): 'top' | 'bottom' | 'shoes' | 'accessory' | null => {
//     const cat = item.main_category?.toLowerCase() || '';
//     if (
//       [
//         'tops',
//         'outerwear',
//         'shirts',
//         'jackets',
//         'knitwear',
//         'sweaters',
//         'blazers',
//         'coats',
//       ].some(c => cat.includes(c))
//     )
//       return 'top';
//     if (
//       [
//         'bottoms',
//         'pants',
//         'trousers',
//         'shorts',
//         'skirts',
//         'jeans',
//         'denim',
//       ].some(c => cat.includes(c))
//     )
//       return 'bottom';
//     if (
//       ['shoes', 'sneakers', 'loafers', 'boots', 'heels', 'sandals'].some(c =>
//         cat.includes(c),
//       )
//     )
//       return 'shoes';
//     if (
//       [
//         'accessories',
//         'hats',
//         'scarves',
//         'belts',
//         'jewelry',
//         'bags',
//         'glasses',
//       ].some(c => cat.includes(c))
//     )
//       return 'accessory';
//     return null;
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

//     const top = selectedItems.find(i => categorize(i) === 'top');
//     const bottom = selectedItems.find(i => categorize(i) === 'bottom');
//     const shoes = selectedItems.find(i => categorize(i) === 'shoes');
//     const accessories = selectedItems.filter(
//       i => categorize(i) === 'accessory',
//     );

//     if (
//       selectedItems.filter(i => categorize(i) === 'top').length > 1 ||
//       selectedItems.filter(i => categorize(i) === 'bottom').length > 1 ||
//       selectedItems.filter(i => categorize(i) === 'shoes').length > 1
//     ) {
//       Alert.alert(
//         'Multiple Items Selected',
//         'Only one Top, Bottom, and Shoes can be saved per outfit right now.',
//         [{text: 'OK'}],
//       );
//       return; // ⛔️ stop finalizeSave from continuing
//     }

//     const thumbnail = selectedItems[0]?.image_url ?? '';

//     try {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           prompt: 'manual',
//           name,
//           top_id: top?.id ?? null,
//           bottom_id: bottom?.id ?? null,
//           shoes_id: shoes?.id ?? null,
//           accessory_ids: accessories.map(i => i.id),
//           thumbnail_url: thumbnail,
//         }),
//       });

//       const newOutfit = await res.json();

//       await fetch(`${API_BASE_URL}/outfit/favorite`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: newOutfit.id}),
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
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     selectedRow: {flexDirection: 'row', flexWrap: 'wrap'},
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
//       backgroundColor: theme.colors.foreground,
//       borderRadius: 8,
//       paddingVertical: 6,
//     },
//     clearButtonText: {color: '#333', fontWeight: '500'},
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       borderRadius: 25,
//       padding: 11,
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       flexGrow: 1,
//       width: '100%',
//     },
//     itemWrapper: {position: 'relative', alignItems: 'center'},
//     itemImage: {
//       width: 86,
//       height: 86,
//       margin: 4,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: '#eee',
//     },
//     checkOverlay: {
//       position: 'absolute',
//       top: 6,
//       right: 6,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 12,
//       paddingVertical: 2,
//       paddingHorizontal: 6,
//     },
//     checkText: {color: '#fff', fontSize: 12},
//     saveButton: {
//       width: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       alignItems: 'center',
//     },
//     saveText: {fontSize: 16, fontWeight: '600', color: theme.colors.foreground},
//     cancelButton: {
//       width: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     cancelText: {fontSize: 16, fontWeight: '600', color: '#fff'},
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       marginHorizontal: 16,
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
//     modalButtonText: {fontWeight: '600', color: '#fff'},
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
//     <ScrollView
//       style={globalStyles.container}
//       contentContainerStyle={{paddingBottom: 120, flexGrow: 1}}>
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Build Your Outfit</Text>
//       </View>

//       <View style={[globalStyles.modalSection2]}>
//         <View style={[globalStyles.section, {paddingTop: 20}]}>
//           <Text style={globalStyles.sectionTitle}>Selected Items:</Text>

//           <View
//             style={[
//               styles.selectedRow,
//               {
//                 paddingHorizontal: 16,
//                 paddingTop: 8,
//                 paddingBottom: 2,
//                 marginBottom: 14,
//                 shadowOffset: {width: 0, height: 6},
//                 shadowOpacity: 0.1,
//                 shadowRadius: 12,
//                 elevation: 5,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//                 borderRadius: tokens.borderRadius.md,
//                 backgroundColor: theme.colors.surface,
//                 justifyContent: 'center',
//               },
//             ]}>
//             {selectedItems.map(item => (
//               <Image
//                 key={item.id}
//                 source={{uri: resolveUri(item.image_url)}}
//                 style={styles.selectedImage}
//                 resizeMode="cover"
//               />
//             ))}
//           </View>

//           {selectedItems.length > 0 && (
//             <TouchableOpacity
//               onPress={() => setSelectedItems([])}
//               style={styles.clearButton}>
//               <Text style={styles.clearButtonText}>Clear Selection</Text>
//             </TouchableOpacity>
//           )}

//           <Text style={globalStyles.title}>Tap items to add:</Text>

//           {wardrobe.length === 0 ? (
//             <View style={{padding: 16}}>
//               <Text style={{color: theme.colors.muted}}>
//                 No wardrobe items yet.
//               </Text>
//             </View>
//           ) : (
//             <View style={styles.grid}>
//               {wardrobe.map((item: WardrobeItem) => {
//                 const isSelected = selectedItems.some(i => i.id === item.id);
//                 const uri = resolveUri(item.image_url);
//                 return (
//                   <TouchableOpacity
//                     key={item.id}
//                     onPress={() => toggleItem(item)}>
//                     <View style={styles.itemWrapper}>
//                       <Image
//                         source={{uri}}
//                         style={[
//                           styles.itemImage,
//                           isSelected && {
//                             borderColor: '#4ade80',
//                             borderWidth: 3,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                       {isSelected && (
//                         <View style={styles.checkOverlay}>
//                           <Text style={styles.checkText}>✓</Text>
//                         </View>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>
//           )}

//           <View
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginTop: 20,
//             }}>
//             <TouchableOpacity
//               style={[
//                 styles.saveButton,
//                 {
//                   backgroundColor: selectedItems.length
//                     ? theme.colors.button1
//                     : '#999',
//                 },
//               ]}
//               onPress={handleSave}
//               disabled={selectedItems.length === 0}>
//               <Text style={styles.saveText}>
//                 {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.cancelButton,
//                 {marginLeft: 10, backgroundColor: '#ccc'},
//               ]}
//               onPress={() => {
//                 setSelectedItems([]);
//                 setOutfitName('');
//                 navigate('Wardrobe');
//               }}>
//               <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
//             </TouchableOpacity>
//           </View>

//           <Modal visible={showNameModal} transparent animationType="fade">
//             <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                 }}>
//                 <TouchableWithoutFeedback>
//                   <View style={styles.modalContent}>
//                     <Text
//                       style={{
//                         fontSize: 18,
//                         fontWeight: '600',
//                         color: theme.colors.foreground,
//                       }}>
//                       Name Your Outfit
//                     </Text>

//                     <TextInput
//                       placeholder="Enter outfit name"
//                       placeholderTextColor={theme.colors.muted}
//                       value={outfitName}
//                       onChangeText={setOutfitName}
//                       style={styles.modalInput}
//                     />

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         marginTop: 20,
//                       }}>
//                       <TouchableOpacity
//                         onPress={() => setShowNameModal(false)}
//                         style={[
//                           styles.modalButton,
//                           {backgroundColor: '#999', flex: 1, marginRight: 8},
//                         ]}>
//                         <Text style={styles.modalButtonText}>Cancel</Text>
//                       </TouchableOpacity>

//                       <TouchableOpacity
//                         onPress={finalizeSave}
//                         style={[styles.modalButton, {flex: 1, marginLeft: 8}]}>
//                         <Text style={styles.modalButtonText}>Save Outfit</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </View>
//                 </TouchableWithoutFeedback>
//               </View>
//             </TouchableWithoutFeedback>
//           </Modal>
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
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   TextInput,
//   Modal,
//   TouchableWithoutFeedback,
//   ActivityIndicator,
//   Alert,
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
//   main_category: string;
//   subcategory: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function OutfitBuilderScreen({navigate}: Props) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   const resolveUri = (u?: string) => {
//     if (!u) return '';
//     if (/^https?:\/\//i.test(u)) return u;
//     const base = API_BASE_URL.replace(/\/+$/, '');
//     const path = u.replace(/^\/+/, '');
//     return `${base}/${path}`;
//   };

//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const url = `${API_BASE_URL}/wardrobe/${encodeURIComponent(userId)}`;
//       const res = await fetch(url, {headers: {Accept: 'application/json'}});
//       if (!res.ok) throw new Error(`Failed to fetch wardrobe`);
//       const json = await res.json();
//       return Array.isArray(json) ? json : json?.items ?? [];
//     },
//     enabled: !!userId,
//     staleTime: 30_000,
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

//   // 🧠 Normalize categories into slots
//   const categorize = (
//     item: WardrobeItem,
//   ): 'top' | 'bottom' | 'shoes' | 'accessory' | null => {
//     const cat = item.main_category?.toLowerCase() || '';
//     if (
//       [
//         'tops',
//         'outerwear',
//         'shirts',
//         'jackets',
//         'knitwear',
//         'sweaters',
//         'blazers',
//         'coats',
//       ].some(c => cat.includes(c))
//     )
//       return 'top';
//     if (
//       [
//         'bottoms',
//         'pants',
//         'trousers',
//         'shorts',
//         'skirts',
//         'jeans',
//         'denim',
//       ].some(c => cat.includes(c))
//     )
//       return 'bottom';
//     if (
//       ['shoes', 'sneakers', 'loafers', 'boots', 'heels', 'sandals'].some(c =>
//         cat.includes(c),
//       )
//     )
//       return 'shoes';
//     if (
//       [
//         'accessories',
//         'hats',
//         'scarves',
//         'belts',
//         'jewelry',
//         'bags',
//         'glasses',
//       ].some(c => cat.includes(c))
//     )
//       return 'accessory';
//     return null;
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

//     const top = selectedItems.find(i => categorize(i) === 'top');
//     const bottom = selectedItems.find(i => categorize(i) === 'bottom');
//     const shoes = selectedItems.find(i => categorize(i) === 'shoes');
//     const accessories = selectedItems.filter(
//       i => categorize(i) === 'accessory',
//     );

//     if (
//       selectedItems.filter(i => categorize(i) === 'top').length > 1 ||
//       selectedItems.filter(i => categorize(i) === 'bottom').length > 1 ||
//       selectedItems.filter(i => categorize(i) === 'shoes').length > 1
//     ) {
//       Alert.alert(
//         'Multiple Items Selected',
//         'Only one Top, Bottom, and Shoes can be saved per outfit right now. The first item from each category will be saved.',
//       );
//     }

//     const thumbnail = selectedItems[0]?.image_url ?? '';

//     try {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           prompt: 'manual',
//           name,
//           top_id: top?.id ?? null,
//           bottom_id: bottom?.id ?? null,
//           shoes_id: shoes?.id ?? null,
//           accessory_ids: accessories.map(i => i.id),
//           thumbnail_url: thumbnail,
//         }),
//       });

//       const newOutfit = await res.json();

//       await fetch(`${API_BASE_URL}/outfit/favorite`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: newOutfit.id}),
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
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     selectedRow: {flexDirection: 'row', flexWrap: 'wrap'},
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
//     clearButtonText: {color: '#333', fontWeight: '500'},
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       borderRadius: 25,
//       padding: 11,
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       flexGrow: 1,
//       width: '100%',
//     },
//     itemWrapper: {position: 'relative', alignItems: 'center'},
//     itemImage: {
//       width: 86,
//       height: 86,
//       margin: 4,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: '#eee',
//     },
//     checkOverlay: {
//       position: 'absolute',
//       top: 6,
//       right: 6,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 12,
//       paddingVertical: 2,
//       paddingHorizontal: 6,
//     },
//     checkText: {color: '#fff', fontSize: 12},
//     saveButton: {
//       width: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
//       backgroundColor: theme.colors.button1,
//       alignItems: 'center',
//     },
//     saveText: {fontSize: 16, fontWeight: '600', color: '#fff'},
//     cancelButton: {
//       width: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
//       alignItems: 'center',
//     },
//     cancelText: {fontSize: 16, fontWeight: '600', color: '#fff'},
//     modalContent: {
//       padding: 24,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       marginHorizontal: 16,
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
//     modalButtonText: {fontWeight: '600', color: '#fff'},
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
//     <ScrollView
//       style={globalStyles.container}
//       contentContainerStyle={{paddingBottom: 120, flexGrow: 1}}>
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Build Your Outfit</Text>
//       </View>

//       <View style={[globalStyles.modalSection2]}>
//         <View style={[globalStyles.section, {paddingTop: 20}]}>
//           <Text style={globalStyles.sectionTitle}>Selected Items:</Text>

//           <View
//             style={[
//               styles.selectedRow,
//               {
//                 paddingHorizontal: 16,
//                 paddingTop: 8,
//                 paddingBottom: 2,
//                 marginBottom: 14,
//                 shadowOffset: {width: 0, height: 6},
//                 shadowOpacity: 0.1,
//                 shadowRadius: 12,
//                 elevation: 5,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//                 borderRadius: tokens.borderRadius.md,
//                 backgroundColor: theme.colors.surface,
//               },
//             ]}>
//             {selectedItems.map(item => (
//               <Image
//                 key={item.id}
//                 source={{uri: resolveUri(item.image_url)}}
//                 style={styles.selectedImage}
//                 resizeMode="cover"
//               />
//             ))}
//           </View>

//           {selectedItems.length > 0 && (
//             <TouchableOpacity
//               onPress={() => setSelectedItems([])}
//               style={styles.clearButton}>
//               <Text style={styles.clearButtonText}>Clear Selection</Text>
//             </TouchableOpacity>
//           )}

//           <Text style={globalStyles.title}>Tap items to add:</Text>

//           {wardrobe.length === 0 ? (
//             <View style={{padding: 16}}>
//               <Text style={{color: theme.colors.muted}}>
//                 No wardrobe items yet.
//               </Text>
//             </View>
//           ) : (
//             <View style={styles.grid}>
//               {wardrobe.map((item: WardrobeItem) => {
//                 const isSelected = selectedItems.some(i => i.id === item.id);
//                 const uri = resolveUri(item.image_url);
//                 return (
//                   <TouchableOpacity
//                     key={item.id}
//                     onPress={() => toggleItem(item)}>
//                     <View style={styles.itemWrapper}>
//                       <Image
//                         source={{uri}}
//                         style={[
//                           styles.itemImage,
//                           isSelected && {
//                             borderColor: '#4ade80',
//                             borderWidth: 3,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                       {isSelected && (
//                         <View style={styles.checkOverlay}>
//                           <Text style={styles.checkText}>✓</Text>
//                         </View>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>
//           )}

//           <View
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginTop: 20,
//             }}>
//             <TouchableOpacity
//               style={[
//                 styles.saveButton,
//                 {backgroundColor: selectedItems.length ? '#405de6' : '#999'},
//               ]}
//               onPress={handleSave}
//               disabled={selectedItems.length === 0}>
//               <Text style={styles.saveText}>
//                 {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.cancelButton,
//                 {marginLeft: 10, backgroundColor: '#ccc'},
//               ]}
//               onPress={() => {
//                 setSelectedItems([]);
//                 setOutfitName('');
//                 navigate('Wardrobe');
//               }}>
//               <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
//             </TouchableOpacity>
//           </View>

//           <Modal visible={showNameModal} transparent animationType="fade">
//             <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                 }}>
//                 <TouchableWithoutFeedback>
//                   <View style={styles.modalContent}>
//                     <Text
//                       style={{
//                         fontSize: 18,
//                         fontWeight: '600',
//                         color: theme.colors.foreground,
//                       }}>
//                       Name Your Outfit
//                     </Text>
//                     <TextInput
//                       placeholder="Enter outfit name"
//                       placeholderTextColor={theme.colors.muted}
//                       value={outfitName}
//                       onChangeText={setOutfitName}
//                       style={styles.modalInput}
//                     />
//                     <TouchableOpacity
//                       onPress={finalizeSave}
//                       style={styles.modalButton}>
//                       <Text style={styles.modalButtonText}>Save Outfit</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </TouchableWithoutFeedback>
//               </View>
//             </TouchableWithoutFeedback>
//           </Modal>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

//////////////////

// // apps/mobile/src/screens/OutfitBuilderScreen.tsx
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

// // ─────────────────────────────────────────────────────────────
// // Types for items coming from the wardrobe API
// // ─────────────────────────────────────────────────────────────
// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   main_category: string;
//   subcategory: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function OutfitBuilderScreen({navigate}: Props) {
//   // 🔐 per-user namespace used by backend to fetch wardrobe
//   const userId = useUUID();

//   // 🎨 theme + shared styles
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // 🧠 local UI state for the builder
//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   // ─────────────────────────────────────────────────────────────
//   // Ensure image URLs work whether backend returns absolute or relative paths
//   // - If the URL already starts with http(s), pass it through.
//   // - Otherwise, prefix with API_BASE_URL to form a valid absolute URL.
//   // ─────────────────────────────────────────────────────────────
//   const resolveUri = (u?: string) => {
//     if (!u) return '';
//     if (/^https?:\/\//i.test(u)) return u;
//     const base = API_BASE_URL.replace(/\/+$/, '');
//     const path = u.replace(/^\/+/, '');
//     return `${base}/${path}`;
//   };

//   // ─────────────────────────────────────────────────────────────
//   // Fetch wardrobe items for this user
//   // - Uses React Query for caching, loading, error states.
//   // - Endpoint returns an array of items.
//   // ─────────────────────────────────────────────────────────────
//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const url = `${API_BASE_URL}/wardrobe/${encodeURIComponent(userId)}`;
//       const res = await fetch(url, {headers: {Accept: 'application/json'}});
//       if (!res.ok)
//         throw new Error(
//           `Failed to fetch wardrobe: ${res.status} ${res.statusText}`,
//         );
//       const json = await res.json();
//       // Some backends wrap data; normalize to an array
//       return Array.isArray(json) ? json : json?.items ?? [];
//     },
//     enabled: !!userId, // only run when we have a user
//     staleTime: 30_000, // cache for 30s to reduce flicker
//   });

//   // ─────────────────────────────────────────────────────────────
//   // Toggle an item in or out of the current selection
//   // - This lets the user build an outfit manually from the grid.
//   // ─────────────────────────────────────────────────────────────
//   const toggleItem = (item: WardrobeItem) => {
//     setSelectedItems(prev =>
//       prev.some(i => i.id === item.id)
//         ? prev.filter(i => i.id !== item.id)
//         : [...prev, item],
//     );
//   };

//   // Open the name modal once there is something to save
//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     setShowNameModal(true);
//   };

//   // ─────────────────────────────────────────────────────────────
//   // Persist the custom outfit:
//   // 1) Build a default outfit name if user didn't type one.
//   // 2) Split selected items into slots (top/bottom/shoes/accessories).
//   // 3) POST to /custom-outfits to create the outfit.
//   // 4) Optionally favorite the outfit via /outfit/favorite.
//   // 5) Navigate to SavedOutfits upon success.
//   // ─────────────────────────────────────────────────────────────
//   const finalizeSave = async () => {
//     if (selectedItems.length === 0) return;

//     const now = new Date();
//     const name =
//       outfitName.trim() ||
//       `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//       })}`;

//     // Slot candidates based on main_category
//     const top = selectedItems.find(i => i.main_category === 'Tops');
//     const bottom = selectedItems.find(i => i.main_category === 'Bottoms');
//     const shoes = selectedItems.find(i => i.main_category === 'Shoes');
//     const accessories = selectedItems.filter(
//       i => i.main_category === 'Accessories',
//     );

//     // Use the first selected image as thumbnail (if any)
//     const thumbnail = selectedItems[0]?.image_url ?? '';

//     try {
//       // Create the custom outfit record
//       const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           prompt: 'manual', // marks this as user-assembled
//           name,
//           top_id: top?.id,
//           bottom_id: bottom?.id,
//           shoes_id: shoes?.id,
//           accessory_ids: accessories.map(i => i.id),
//           location: null, // reserved for future contextual features
//           weather_data: null, // reserved for future contextual features
//           thumbnail_url: thumbnail,
//         }),
//       });

//       const newOutfit = await res.json();

//       // Immediately favorite the outfit (optional UX choice)
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

//   // ─────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────
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
//       borderRadius: 25,
//       padding: 11,
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       flexGrow: 1,
//       width: '100%',
//     },
//     itemWrapper: {
//       position: 'relative',
//       alignItems: 'center',
//     },
//     itemImage: {
//       width: 86,
//       height: 86,
//       margin: 4,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: '#eee',
//     },
//     checkOverlay: {
//       position: 'absolute',
//       top: 6,
//       right: 6,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 12,
//       paddingVertical: 2,
//       paddingHorizontal: 6,
//     },
//     checkText: {
//       color: '#fff',
//       fontSize: 12,
//     },
//     saveButton: {
//       width: 160,
//       maxWidth: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
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
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
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
//       backgroundColor: theme.colors.surface,
//       marginHorizontal: 16,
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
//       color: '#fff',
//     },
//   });

//   // ─────────────────────────────────────────────────────────────
//   // Loading & error states (from React Query)
//   // ─────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────
//   // Main UI:
//   // - Shows a horizontal list of currently selected items (with thumbnails).
//   // - Grid of all wardrobe items to tap and select/deselect.
//   // - Save/Cancel actions.
//   // - "Name Outfit" modal before persisting to backend.
//   // ─────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={globalStyles.container}
//       contentContainerStyle={{
//         paddingBottom: 120,
//         flexGrow: 1,
//       }}>
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Build Your Outfit</Text>
//       </View>

//       <View style={[globalStyles.modalSection2]}>
//         <View style={[globalStyles.section, {paddingTop: 20}]}>
//           <Text style={globalStyles.sectionTitle}>Selected Items:</Text>

//           {/* Selected thumbnails */}
//           <View
//             style={[
//               styles.selectedRow,
//               {
//                 paddingHorizontal: 16,
//                 paddingTop: 8,
//                 paddingBottom: 2,
//                 marginBottom: 14,
//                 shadowOffset: {width: 0, height: 6},
//                 shadowOpacity: 0.1,
//                 shadowRadius: 12,
//                 elevation: 5,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//                 borderRadius: tokens.borderRadius.md,
//                 backgroundColor: theme.colors.surface,
//               },
//             ]}>
//             {selectedItems.map(item => (
//               <Image
//                 key={item.id}
//                 source={{uri: resolveUri(item.image_url)}}
//                 style={styles.selectedImage}
//                 resizeMode="cover"
//               />
//             ))}
//           </View>

//           {/* Clear selection */}
//           {selectedItems.length > 0 && (
//             <TouchableOpacity
//               onPress={() => setSelectedItems([])}
//               style={styles.clearButton}>
//               <Text style={styles.clearButtonText}>Clear Selection</Text>
//             </TouchableOpacity>
//           )}

//           <Text style={globalStyles.title}>Tap items to add:</Text>

//           {/* Grid of wardrobe items */}
//           {wardrobe.length === 0 ? (
//             <View style={{padding: 16}}>
//               <Text style={{color: theme.colors.muted}}>
//                 No wardrobe items yet.
//               </Text>
//             </View>
//           ) : (
//             <View style={styles.grid}>
//               {wardrobe.map(
//                 (item: {
//                   id: any;
//                   image_url: any;
//                   name?: string;
//                   main_category?: string;
//                   subcategory?: string;
//                 }) => {
//                   const isSelected = selectedItems.some(i => i.id === item.id);
//                   const uri = resolveUri(item.image_url);
//                   console.log('🖼️ rendering image uri:', uri);

//                   return (
//                     <TouchableOpacity
//                       key={item.id}
//                       onPress={() => toggleItem(item)}>
//                       <View style={styles.itemWrapper}>
//                         <Image
//                           source={{uri}}
//                           style={[
//                             styles.itemImage,
//                             isSelected && {
//                               borderColor: '#4ade80', // green highlight when selected
//                               borderWidth: 3,
//                             },
//                           ]}
//                           resizeMode="cover"
//                           onError={e =>
//                             console.log(
//                               '❌ image error',
//                               uri,
//                               e.nativeEvent?.error,
//                             )
//                           }
//                         />
//                         {isSelected && (
//                           <View style={styles.checkOverlay}>
//                             <Text style={styles.checkText}>✓</Text>
//                           </View>
//                         )}
//                       </View>
//                     </TouchableOpacity>
//                   );
//                 },
//               )}
//             </View>
//           )}

//           {/* Save / Cancel actions */}
//           <View
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginTop: 20,
//             }}>
//             <TouchableOpacity
//               style={[
//                 styles.saveButton,
//                 {backgroundColor: selectedItems.length ? '#405de6' : '#999'},
//               ]}
//               onPress={handleSave}
//               disabled={selectedItems.length === 0}>
//               <Text style={styles.saveText}>
//                 {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.cancelButton,
//                 {marginLeft: 10, backgroundColor: '#ccc'},
//               ]}
//               onPress={() => {
//                 setSelectedItems([]);
//                 setOutfitName('');
//                 navigate('Wardrobe'); // back to Closet view
//               }}>
//               <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
//             </TouchableOpacity>
//           </View>

//           {/* Name Outfit modal */}
//           <Modal visible={showNameModal} transparent animationType="fade">
//             <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                 }}>
//                 <TouchableWithoutFeedback>
//                   <View style={styles.modalContent}>
//                     <Text
//                       style={{
//                         fontSize: 18,
//                         fontWeight: '600',
//                         color: theme.colors.foreground,
//                       }}>
//                       Name Your Outfit
//                     </Text>

//                     <TextInput
//                       placeholder="Enter outfit name"
//                       placeholderTextColor={theme.colors.muted}
//                       value={outfitName}
//                       onChangeText={setOutfitName}
//                       style={styles.modalInput}
//                     />

//                     <TouchableOpacity
//                       onPress={finalizeSave}
//                       style={styles.modalButton}>
//                       <Text style={styles.modalButtonText}>Save Outfit</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </TouchableWithoutFeedback>
//               </View>
//             </TouchableWithoutFeedback>
//           </Modal>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

////////////////

// // apps/mobile/src/screens/OutfitBuilderScreen.tsx
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

// // ─────────────────────────────────────────────────────────────
// // Types for items coming from the wardrobe API
// // ─────────────────────────────────────────────────────────────
// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   main_category: string;
//   subcategory: string;
// };

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function OutfitBuilderScreen({navigate}: Props) {
//   // 🔐 per-user namespace used by backend to fetch wardrobe
//   const userId = useUUID();

//   // 🎨 theme + shared styles
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // 🧠 local UI state for the builder
//   const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [outfitName, setOutfitName] = useState('');
//   const [saved, setSaved] = useState(false);

//   // ─────────────────────────────────────────────────────────────
//   // Ensure image URLs work whether backend returns absolute or relative paths
//   // - If the URL already starts with http(s), pass it through.
//   // - Otherwise, prefix with API_BASE_URL to form a valid absolute URL.
//   // ─────────────────────────────────────────────────────────────
//   const resolveUri = (u?: string) => {
//     if (!u) return '';
//     if (/^https?:\/\//i.test(u)) return u;
//     const base = API_BASE_URL.replace(/\/+$/, '');
//     const path = u.replace(/^\/+/, '');
//     return `${base}/${path}`;
//   };

//   // ─────────────────────────────────────────────────────────────
//   // Fetch wardrobe items for this user
//   // - Uses React Query for caching, loading, error states.
//   // - Endpoint returns an array of items.
//   // ─────────────────────────────────────────────────────────────
//   const {
//     data: wardrobe = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ['wardrobe', userId],
//     queryFn: async () => {
//       const url = `${API_BASE_URL}/wardrobe/${encodeURIComponent(userId)}`;
//       const res = await fetch(url, {headers: {Accept: 'application/json'}});
//       if (!res.ok)
//         throw new Error(
//           `Failed to fetch wardrobe: ${res.status} ${res.statusText}`,
//         );
//       const json = await res.json();
//       // Some backends wrap data; normalize to an array
//       return Array.isArray(json) ? json : json?.items ?? [];
//     },
//     enabled: !!userId, // only run when we have a user
//     staleTime: 30_000, // cache for 30s to reduce flicker
//   });

//   // ─────────────────────────────────────────────────────────────
//   // Toggle an item in or out of the current selection
//   // - This lets the user build an outfit manually from the grid.
//   // ─────────────────────────────────────────────────────────────
//   const toggleItem = (item: WardrobeItem) => {
//     setSelectedItems(prev =>
//       prev.some(i => i.id === item.id)
//         ? prev.filter(i => i.id !== item.id)
//         : [...prev, item],
//     );
//   };

//   // Open the name modal once there is something to save
//   const handleSave = () => {
//     if (selectedItems.length === 0) return;
//     setShowNameModal(true);
//   };

//   // ─────────────────────────────────────────────────────────────
//   // Persist the custom outfit:
//   // 1) Build a default outfit name if user didn't type one.
//   // 2) Split selected items into slots (top/bottom/shoes/accessories).
//   // 3) POST to /custom-outfits to create the outfit.
//   // 4) Optionally favorite the outfit via /outfit/favorite.
//   // 5) Navigate to SavedOutfits upon success.
//   // ─────────────────────────────────────────────────────────────
//   const finalizeSave = async () => {
//     if (selectedItems.length === 0) return;

//     const now = new Date();
//     const name =
//       outfitName.trim() ||
//       `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//       })}`;

//     // Slot candidates based on main_category
//     const top = selectedItems.find(i => i.main_category === 'Tops');
//     const bottom = selectedItems.find(i => i.main_category === 'Bottoms');
//     const shoes = selectedItems.find(i => i.main_category === 'Shoes');
//     const accessories = selectedItems.filter(
//       i => i.main_category === 'Accessories',
//     );

//     // Use the first selected image as thumbnail (if any)
//     const thumbnail = selectedItems[0]?.image_url ?? '';

//     try {
//       // Create the custom outfit record
//       const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           prompt: 'manual', // marks this as user-assembled
//           name,
//           top_id: top?.id,
//           bottom_id: bottom?.id,
//           shoes_id: shoes?.id,
//           accessory_ids: accessories.map(i => i.id),
//           location: null, // reserved for future contextual features
//           weather_data: null, // reserved for future contextual features
//           thumbnail_url: thumbnail,
//         }),
//       });

//       const newOutfit = await res.json();

//       // Immediately favorite the outfit (optional UX choice)
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

//   // ─────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────
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
//       borderRadius: 25,
//       padding: 11,
//       shadowOffset: {width: 0, height: 6},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//     },
//     itemWrapper: {
//       position: 'relative',
//       alignItems: 'center',
//     },
//     itemImage: {
//       width: 86,
//       height: 86,
//       margin: 4,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: '#eee',
//     },
//     checkOverlay: {
//       position: 'absolute',
//       top: 6,
//       right: 6,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 12,
//       paddingVertical: 2,
//       paddingHorizontal: 6,
//     },
//     checkText: {
//       color: '#fff',
//       fontSize: 12,
//     },
//     saveButton: {
//       width: 160,
//       maxWidth: 160,
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
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
//       paddingVertical: 9,
//       borderRadius: tokens.borderRadius.sm,
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
//       backgroundColor: theme.colors.surface,
//       marginHorizontal: 16,
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
//       color: '#fff',
//     },
//   });

//   // ─────────────────────────────────────────────────────────────
//   // Loading & error states (from React Query)
//   // ─────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────
//   // Main UI:
//   // - Shows a horizontal list of currently selected items (with thumbnails).
//   // - Grid of all wardrobe items to tap and select/deselect.
//   // - Save/Cancel actions.
//   // - "Name Outfit" modal before persisting to backend.
//   // ─────────────────────────────────────────────────────────────
//   return (
//     <ScrollView style={globalStyles.container}>
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Build Your Outfit</Text>
//       </View>

//       <View style={[globalStyles.modalSection2]}>
//         <View style={[globalStyles.section, {paddingTop: 20}]}>
//           <Text style={globalStyles.sectionTitle}>Selected Items:</Text>

//           {/* Selected thumbnails */}
//           <View
//             style={[
//               styles.selectedRow,
//               {
//                 paddingHorizontal: 16,
//                 paddingTop: 8,
//                 paddingBottom: 2,
//                 marginBottom: 14,
//                 shadowOffset: {width: 0, height: 6},
//                 shadowOpacity: 0.1,
//                 shadowRadius: 12,
//                 elevation: 5,
//                 borderWidth: 1,
//                 borderColor: theme.colors.surfaceBorder,
//                 borderRadius: tokens.borderRadius.md,
//                 backgroundColor: theme.colors.surface,
//               },
//             ]}>
//             {selectedItems.map(item => (
//               <Image
//                 key={item.id}
//                 source={{uri: resolveUri(item.image_url)}}
//                 style={styles.selectedImage}
//                 resizeMode="cover"
//               />
//             ))}
//           </View>

//           {/* Clear selection */}
//           {selectedItems.length > 0 && (
//             <TouchableOpacity
//               onPress={() => setSelectedItems([])}
//               style={styles.clearButton}>
//               <Text style={styles.clearButtonText}>Clear Selection</Text>
//             </TouchableOpacity>
//           )}

//           <Text style={globalStyles.title}>Tap items to add:</Text>

//           {/* Grid of wardrobe items */}
//           {wardrobe.length === 0 ? (
//             <View style={{padding: 16}}>
//               <Text style={{color: theme.colors.muted}}>
//                 No wardrobe items yet.
//               </Text>
//             </View>
//           ) : (
//             <View style={styles.grid}>
//               {wardrobe.map(item => {
//                 const isSelected = selectedItems.some(i => i.id === item.id);
//                 const uri = resolveUri(item.image_url);
//                 console.log('🖼️ rendering image uri:', uri);

//                 return (
//                   <TouchableOpacity
//                     key={item.id}
//                     onPress={() => toggleItem(item)}>
//                     <View style={styles.itemWrapper}>
//                       <Image
//                         source={{uri}}
//                         style={[
//                           styles.itemImage,
//                           isSelected && {
//                             borderColor: '#4ade80', // green highlight when selected
//                             borderWidth: 3,
//                           },
//                         ]}
//                         resizeMode="cover"
//                         onError={e =>
//                           console.log(
//                             '❌ image error',
//                             uri,
//                             e.nativeEvent?.error,
//                           )
//                         }
//                       />
//                       {isSelected && (
//                         <View style={styles.checkOverlay}>
//                           <Text style={styles.checkText}>✓</Text>
//                         </View>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>
//           )}

//           {/* Save / Cancel actions */}
//           <View
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               marginTop: 20,
//             }}>
//             <TouchableOpacity
//               style={[
//                 styles.saveButton,
//                 {backgroundColor: selectedItems.length ? '#405de6' : '#999'},
//               ]}
//               onPress={handleSave}
//               disabled={selectedItems.length === 0}>
//               <Text style={styles.saveText}>
//                 {saved ? '✅ Outfit Saved' : 'Save Outfit'}
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.cancelButton,
//                 {marginLeft: 10, backgroundColor: '#ccc'},
//               ]}
//               onPress={() => {
//                 setSelectedItems([]);
//                 setOutfitName('');
//                 navigate('Wardrobe'); // back to Closet view
//               }}>
//               <Text style={[styles.cancelText, {color: '#000'}]}>Cancel</Text>
//             </TouchableOpacity>
//           </View>

//           {/* Name Outfit modal */}
//           <Modal visible={showNameModal} transparent animationType="fade">
//             <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                 }}>
//                 <TouchableWithoutFeedback>
//                   <View style={styles.modalContent}>
//                     <Text
//                       style={{
//                         fontSize: 18,
//                         fontWeight: '600',
//                         color: theme.colors.foreground,
//                       }}>
//                       Name Your Outfit
//                     </Text>

//                     <TextInput
//                       placeholder="Enter outfit name"
//                       placeholderTextColor={theme.colors.muted}
//                       value={outfitName}
//                       onChangeText={setOutfitName}
//                       style={styles.modalInput}
//                     />

//                     <TouchableOpacity
//                       onPress={finalizeSave}
//                       style={styles.modalButton}>
//                       <Text style={styles.modalButtonText}>Save Outfit</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </TouchableWithoutFeedback>
//               </View>
//             </TouchableWithoutFeedback>
//           </Modal>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }
