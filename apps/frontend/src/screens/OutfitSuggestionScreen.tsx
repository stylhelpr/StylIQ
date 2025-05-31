import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
import {useAppTheme} from '../context/ThemeContext';

const mockWardrobe: WardrobeItem[] = [
  {
    id: '1',
    image:
      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
    name: 'Linen Shirt',
    mainCategory: 'Tops',
    subCategory: 'Shirts',
    material: 'Linen',
    fit: 'Slim',
    size: 'M',
    notes: '',
    category: 'shirt',
    color: 'White',
    tags: ['modern', 'summer'],
    favorite: true,
    occasion: 'Casual',
  },
  {
    id: '2',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
    name: 'Slim Fit Chinos',
    mainCategory: 'Bottoms',
    subCategory: 'Pants',
    material: 'Cotton',
    fit: 'Slim',
    size: 'M',
    notes: '',
    category: 'pants',
    color: 'Beige',
    tags: ['neutral'],
    favorite: true,
    occasion: 'Casual',
  },
  {
    id: '3',
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
    name: 'White Sneakers',
    mainCategory: 'Shoes',
    subCategory: 'Sneakers',
    material: 'Canvas',
    fit: '',
    size: 'M',
    notes: '',
    category: 'sneakers',
    color: 'White',
    tags: ['clean', 'modern'],
    favorite: true,
    occasion: 'Casual',
  },
];

export default function OutfitSuggestionScreen() {
  const {theme} = useAppTheme();
  const [visibleModal, setVisibleModal] = useState<
    null | 'top' | 'bottom' | 'shoes'
  >(null);

  const {outfit, reasons} = useOutfitSuggestion(mockWardrobe);

  const styles = StyleSheet.create({
    container: {flex: 1},
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      alignItems: 'center',
    },
    header: {
      fontSize: 22,
      fontWeight: '600',
      marginBottom: 24,
      textAlign: 'center',
    },
    card: {
      width: 220,
      borderRadius: 12,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      backgroundColor: theme.colors.surface,
    },
    cardImage: {
      width: 220,
      height: 220,
      borderRadius: 12,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 6,
      textAlign: 'center',
    },
    cardWhy: {
      fontSize: 14,
      color: '#007AFF',
      textAlign: 'center',
      marginBottom: 12,
    },
  });

  const renderCard = (
    label: string,
    item: WardrobeItem | undefined,
    section: 'top' | 'bottom' | 'shoes',
  ) => (
    <View style={[styles.card]}>
      <Image
        source={
          item?.image
            ? {uri: item.image}
            : {uri: 'https://via.placeholder.com/150?text=No+Image'}
        }
        style={styles.cardImage}
      />
      <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
        {item?.name ?? `No ${label} selected`}
      </Text>
      <TouchableOpacity onPress={() => setVisibleModal(section)}>
        <Text style={styles.cardWhy}>Why this {label}?</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, {color: theme.colors.foreground}]}>
          Suggested Outfit
        </Text>
        {renderCard('Top', outfit.top, 'top')}
        {renderCard('Bottom', outfit.bottom, 'bottom')}
        {renderCard('Shoes', outfit.shoes, 'shoes')}
      </ScrollView>

      {/* Modals */}
      <WhyPickedModal
        visible={visibleModal === 'top'}
        item={outfit.top}
        reasons={reasons.top ?? []}
        section="Top"
        onClose={() => setVisibleModal(null)}
      />
      <WhyPickedModal
        visible={visibleModal === 'bottom'}
        item={outfit.bottom}
        reasons={reasons.bottom ?? []}
        section="Bottom"
        onClose={() => setVisibleModal(null)}
      />
      <WhyPickedModal
        visible={visibleModal === 'shoes'}
        item={outfit.shoes}
        reasons={reasons.shoes ?? []}
        section="Shoes"
        onClose={() => setVisibleModal(null)}
      />
    </View>
  );
}

///////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';

// const mockWardrobe: WardrobeItem[] = [
//   {
//     id: '1',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//     name: 'Linen Shirt',
//     mainCategory: 'Tops',
//     subCategory: 'Shirts',
//     material: 'Linen',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'shirt',
//     color: 'White',
//     tags: ['modern', 'summer'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '2',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//     name: 'Slim Fit Chinos',
//     mainCategory: 'Bottoms',
//     subCategory: 'Pants',
//     material: 'Cotton',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'pants',
//     color: 'Beige',
//     tags: ['neutral'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '3',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//     name: 'White Sneakers',
//     mainCategory: 'Shoes',
//     subCategory: 'Sneakers',
//     material: 'Canvas',
//     fit: '',
//     size: 'M',
//     notes: '',
//     category: 'sneakers',
//     color: 'White',
//     tags: ['clean', 'modern'],
//     favorite: true,
//     occasion: 'Casual',
//   },
// ];

// export default function OutfitSuggestionScreen() {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const {outfit, reasons} = useOutfitSuggestion(mockWardrobe);

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     scrollContent: {
//       padding: 16,
//       paddingBottom: 40,
//       alignItems: 'center',
//     },
//     header: {
//       fontSize: 22,
//       fontWeight: '600',
//       marginBottom: 24,
//       textAlign: 'center',
//     },
//     card: {
//       width: 220,
//       borderRadius: 12,
//       marginBottom: 24,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 2},
//       shadowOpacity: 0.15,
//       shadowRadius: 4,
//       elevation: 3,
//       backgroundColor: theme.colors.surface,
//     },
//     cardImage: {
//       width: 220,
//       height: 220,
//       borderRadius: 12,
//       marginBottom: 12,
//     },
//     cardTitle: {
//       fontSize: 16,
//       fontWeight: '600',
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     cardWhy: {
//       fontSize: 14,
//       color: '#007AFF',
//       textAlign: 'center',
//       marginBottom: 12,
//     },
//   });

//   const renderCard = (
//     label: string,
//     item: WardrobeItem | undefined,
//     section: 'top' | 'bottom' | 'shoes',
//   ) => (
//     <View style={[styles.card]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/150?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//         {item?.name ?? `No ${label} selected`}
//       </Text>
//       <TouchableOpacity onPress={() => setVisibleModal(section)}>
//         <Text style={styles.cardWhy}>Why this {label}?</Text>
//       </TouchableOpacity>
//     </View>
//   );

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Suggested Outfit
//         </Text>
//         {renderCard('Top', outfit.top, 'top')}
//         {renderCard('Bottom', outfit.bottom, 'bottom')}
//         {renderCard('Shoes', outfit.shoes, 'shoes')}
//       </ScrollView>

//       {/* Modals */}
//       <WhyPickedModal
//         visible={visibleModal === 'top'}
//         item={outfit.top}
//         reasons={reasons.top ?? []}
//         section="Top"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'bottom'}
//         item={outfit.bottom}
//         reasons={reasons.bottom ?? []}
//         section="Bottom"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'shoes'}
//         item={outfit.shoes}
//         reasons={reasons.shoes ?? []}
//         section="Shoes"
//         onClose={() => setVisibleModal(null)}
//       />
//     </View>
//   );
// }

////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';

// const mockWardrobe: WardrobeItem[] = [
//   {
//     id: '1',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//     name: 'Linen Shirt',
//     mainCategory: 'Tops',
//     subCategory: 'Shirts',
//     material: 'Linen',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'shirt',
//     color: 'White',
//     tags: ['modern', 'summer'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '2',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//     name: 'Slim Fit Chinos',
//     mainCategory: 'Bottoms',
//     subCategory: 'Pants',
//     material: 'Cotton',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'pants',
//     color: 'Beige',
//     tags: ['neutral'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '3',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//     name: 'White Sneakers',
//     mainCategory: 'Shoes',
//     subCategory: 'Sneakers',
//     material: 'Canvas',
//     fit: '',
//     size: 'M',
//     notes: '',
//     category: 'sneakers',
//     color: 'White',
//     tags: ['clean', 'modern'],
//     favorite: true,
//     occasion: 'Casual',
//   },
// ];

// export default function OutfitSuggestionScreen() {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const {outfit, reasons} = useOutfitSuggestion(mockWardrobe);

//   console.log('🧢 Top:', outfit.top?.name);
//   console.log('👖 Bottom:', outfit.bottom?.name);
//   console.log('👟 Shoes:', outfit.shoes?.name);

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     scrollContent: {padding: 16, paddingBottom: 40},
//     header: {
//       fontSize: 22,
//       fontWeight: '600',
//       marginBottom: 20,
//       textAlign: 'center',
//     },
//     item: {marginBottom: 24, alignItems: 'center'},
//     imageFallback: {
//       width: 160,
//       height: 160,
//       backgroundColor: '#444',
//       borderRadius: 10,
//       marginBottom: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     image: {
//       width: 160,
//       height: 160,
//       borderRadius: 10,
//     },
//     name: {fontSize: 16, fontWeight: '500', marginBottom: 4},
//     why: {fontSize: 14, color: '#007AFF'},
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Suggested Outfit
//         </Text>

//         {/* Top Item */}
//         <View style={styles.item}>
//           <View style={styles.imageFallback}>
//             <Image
//               source={
//                 outfit.top?.image
//                   ? {uri: outfit.top.image}
//                   : {
//                       uri: 'https://via.placeholder.com/150?text=No+Image',
//                     }
//               }
//               style={styles.image}
//             />
//           </View>
//           <Text style={[styles.name, {color: theme.colors.foreground}]}>
//             {outfit.top?.name ?? 'No top selected'}
//           </Text>
//           <TouchableOpacity onPress={() => setVisibleModal('top')}>
//             <Text style={styles.why}>Why this top?</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Bottom Item */}
//         <View style={styles.item}>
//           <View style={styles.imageFallback}>
//             <Image
//               source={
//                 outfit.top?.image
//                   ? {uri: outfit.top.image}
//                   : require('../assets/images/free1.jpg')
//               }
//               style={styles.image}
//             />
//           </View>
//           <Text style={[styles.name, {color: theme.colors.foreground}]}>
//             {outfit.bottom?.name ?? 'No bottom selected'}
//           </Text>
//           <TouchableOpacity onPress={() => setVisibleModal('bottom')}>
//             <Text style={styles.why}>Why these bottoms?</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Shoes Item */}
//         <View style={styles.item}>
//           <View style={styles.imageFallback}>
//             <Image
//               source={
//                 outfit.top?.image
//                   ? {uri: outfit.top.image}
//                   : require('../assets/images/free1.jpg')
//               }
//               style={styles.image}
//             />
//           </View>
//           <Text style={[styles.name, {color: theme.colors.foreground}]}>
//             {outfit.shoes?.name ?? 'No shoes selected'}
//           </Text>
//           <TouchableOpacity onPress={() => setVisibleModal('shoes')}>
//             <Text style={styles.why}>Why these shoes?</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Render raw debug output */}
//         <Text style={{color: 'white'}}>🧢 {outfit.top?.name}</Text>
//         <Text style={{color: 'white'}}>👖 {outfit.bottom?.name}</Text>
//         <Text style={{color: 'white'}}>👟 {outfit.shoes?.name}</Text>
//       </ScrollView>

//       {/* Modals */}
//       <WhyPickedModal
//         visible={visibleModal === 'top'}
//         item={outfit.top}
//         reasons={reasons.top ?? []}
//         section="Top"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'bottom'}
//         item={outfit.bottom}
//         reasons={reasons.bottom ?? []}
//         section="Bottom"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'shoes'}
//         item={outfit.shoes}
//         reasons={reasons.shoes ?? []}
//         section="Shoes"
//         onClose={() => setVisibleModal(null)}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   scrollContent: {padding: 16, paddingBottom: 40},
//   header: {
//     fontSize: 22,
//     fontWeight: '600',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   item: {marginBottom: 24, alignItems: 'center'},
//   imageFallback: {
//     width: 160,
//     height: 160,
//     backgroundColor: '#444',
//     borderRadius: 10,
//     marginBottom: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   image: {
//     width: 160,
//     height: 160,
//     borderRadius: 10,
//   },
//   name: {fontSize: 16, fontWeight: '500', marginBottom: 4},
//   why: {fontSize: 14, color: '#007AFF'},
// });

/////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';

// const mockWardrobe: WardrobeItem[] = [
//   {
//     id: '1',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//     name: 'Linen Shirt',
//     mainCategory: 'Tops',
//     subCategory: 'Shirts',
//     material: 'Linen',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'shirt',
//     color: 'White',
//     tags: ['modern', 'summer'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '2',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//     name: 'Slim Fit Chinos',
//     mainCategory: 'Bottoms',
//     subCategory: 'Pants',
//     material: 'Cotton',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'pants',
//     color: 'Beige',
//     tags: ['neutral'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '3',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//     name: 'White Sneakers',
//     mainCategory: 'Shoes',
//     subCategory: 'Sneakers',
//     material: 'Canvas',
//     fit: '',
//     size: 'M',
//     notes: '',
//     category: 'sneakers',
//     color: 'White',
//     tags: ['clean', 'modern'],
//     favorite: true,
//     occasion: 'Casual',
//   },
// ];

// export default function OutfitSuggestionScreen() {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const {outfit, reasons} = useOutfitSuggestion(mockWardrobe);

//   console.log('🧢 Top:', outfit.top?.name);
//   console.log('👖 Bottom:', outfit.bottom?.name);
//   console.log('👟 Shoes:', outfit.shoes?.name);

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     scrollContent: {padding: 16, paddingBottom: 40},
//     header: {
//       fontSize: 22,
//       fontWeight: '600',
//       marginBottom: 20,
//       textAlign: 'center',
//     },
//     item: {marginBottom: 24, alignItems: 'center'},
//     imageFallback: {
//       width: 160,
//       height: 160,
//       backgroundColor: '#444',
//       borderRadius: 10,
//       marginBottom: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     image: {
//       width: 160,
//       height: 160,
//       borderRadius: 10,
//     },
//     name: {fontSize: 16, fontWeight: '500', marginBottom: 4},
//     why: {fontSize: 14, color: '#007AFF'},
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Suggested Outfit
//         </Text>

//         {/* Top Item */}
//         <View style={styles.item}>
//           <View style={styles.imageFallback}>
//             <Image
//               source={
//                 outfit.top?.image
//                   ? {uri: outfit.top.image}
//                   : {
//                       uri: 'https://via.placeholder.com/150?text=No+Image',
//                     }
//               }
//               style={styles.image}
//             />
//           </View>
//           <Text style={[styles.name, {color: theme.colors.foreground}]}>
//             {outfit.top?.name ?? 'No top selected'}
//           </Text>
//           <TouchableOpacity onPress={() => setVisibleModal('top')}>
//             <Text style={styles.why}>Why this top?</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Bottom Item */}
//         <View style={styles.item}>
//           <View style={styles.imageFallback}>
//             <Image
//               source={
//                 outfit.top?.image
//                   ? {uri: outfit.top.image}
//                   : require('../assets/images/free1.jpg')
//               }
//               style={styles.image}
//             />
//           </View>
//           <Text style={[styles.name, {color: theme.colors.foreground}]}>
//             {outfit.bottom?.name ?? 'No bottom selected'}
//           </Text>
//           <TouchableOpacity onPress={() => setVisibleModal('bottom')}>
//             <Text style={styles.why}>Why these bottoms?</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Shoes Item */}
//         <View style={styles.item}>
//           <View style={styles.imageFallback}>
//             <Image
//               source={
//                 outfit.top?.image
//                   ? {uri: outfit.top.image}
//                   : require('../assets/images/free1.jpg')
//               }
//               style={styles.image}
//             />
//           </View>
//           <Text style={[styles.name, {color: theme.colors.foreground}]}>
//             {outfit.shoes?.name ?? 'No shoes selected'}
//           </Text>
//           <TouchableOpacity onPress={() => setVisibleModal('shoes')}>
//             <Text style={styles.why}>Why these shoes?</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Render raw debug output */}
//         <Text style={{color: 'white'}}>🧢 {outfit.top?.name}</Text>
//         <Text style={{color: 'white'}}>👖 {outfit.bottom?.name}</Text>
//         <Text style={{color: 'white'}}>👟 {outfit.shoes?.name}</Text>
//       </ScrollView>

//       {/* Modals */}
//       <WhyPickedModal
//         visible={visibleModal === 'top'}
//         item={outfit.top}
//         reasons={reasons.top ?? []}
//         section="Top"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'bottom'}
//         item={outfit.bottom}
//         reasons={reasons.bottom ?? []}
//         section="Bottom"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'shoes'}
//         item={outfit.shoes}
//         reasons={reasons.shoes ?? []}
//         section="Shoes"
//         onClose={() => setVisibleModal(null)}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   scrollContent: {padding: 16, paddingBottom: 40},
//   header: {
//     fontSize: 22,
//     fontWeight: '600',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   item: {marginBottom: 24, alignItems: 'center'},
//   imageFallback: {
//     width: 160,
//     height: 160,
//     backgroundColor: '#444',
//     borderRadius: 10,
//     marginBottom: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   image: {
//     width: 160,
//     height: 160,
//     borderRadius: 10,
//   },
//   name: {fontSize: 16, fontWeight: '500', marginBottom: 4},
//   why: {fontSize: 14, color: '#007AFF'},
// });

////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';

// const mockWardrobe: WardrobeItem[] = [
//   {
//     id: '1',
//     image: 'https://example.com/shirt.jpg',
//     name: 'Linen Shirt',
//     mainCategory: 'Tops',
//     subCategory: 'Shirts',
//     material: 'Linen',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'shirt',
//     color: 'White',
//     tags: ['modern', 'summer'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '2',
//     image: 'https://example.com/pants.jpg',
//     name: 'Slim Fit Chinos',
//     mainCategory: 'Bottoms',
//     subCategory: 'Pants',
//     material: 'Cotton',
//     fit: 'Slim',
//     size: 'M',
//     notes: '',
//     category: 'pants',
//     color: 'Beige',
//     tags: ['neutral'],
//     favorite: true,
//     occasion: 'Casual',
//   },
//   {
//     id: '3',
//     image: 'https://example.com/shoes.jpg',
//     name: 'White Sneakers',
//     mainCategory: 'Shoes',
//     subCategory: 'Sneakers',
//     material: 'Canvas',
//     fit: '',
//     size: 'M',
//     notes: '',
//     category: 'sneakers',
//     color: 'White',
//     tags: ['clean', 'modern'],
//     favorite: true,
//     occasion: 'Casual',
//   },
// ];

// export default function OutfitSuggestionScreen() {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   //   const {outfit, reasons} = useOutfitSuggestion(mockWardrobe, {
//   //     keywords: ['casual'],
//   //     weather: 'hot',
//   //     fit: 'Slim',
//   //     size: 'M',
//   //     styleTags: ['modern'],
//   //     occasion: 'Casual',
//   //   });

//   const {outfit, reasons} = useOutfitSuggestion(mockWardrobe);

//   console.log('🧢 outfit:', outfit);
//   console.log('📋 reasons:', reasons);

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Suggested Outfit
//         </Text>

//         {!outfit.top && <Text style={{color: 'red'}}>❌ No top matched</Text>}
//         {!outfit.bottom && (
//           <Text style={{color: 'red'}}>❌ No bottom matched</Text>
//         )}
//         {!outfit.shoes && (
//           <Text style={{color: 'red'}}>❌ No shoes matched</Text>
//         )}

//         {outfit.top && (
//           <View style={styles.item}>
//             <Image source={{uri: outfit.top.image}} style={styles.image} />
//             <Text style={[styles.name, {color: theme.colors.foreground}]}>
//               {outfit.top.name}
//             </Text>
//             <TouchableOpacity onPress={() => setVisibleModal('top')}>
//               <Text style={styles.why}>Why this top?</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {outfit.bottom && (
//           <View style={styles.item}>
//             <Image source={{uri: outfit.bottom.image}} style={styles.image} />
//             <Text style={[styles.name, {color: theme.colors.foreground}]}>
//               {outfit.bottom.name}
//             </Text>
//             <TouchableOpacity onPress={() => setVisibleModal('bottom')}>
//               <Text style={styles.why}>Why these bottoms?</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {outfit.shoes && (
//           <View style={styles.item}>
//             <Image source={{uri: outfit.shoes.image}} style={styles.image} />
//             <Text style={[styles.name, {color: theme.colors.foreground}]}>
//               {outfit.shoes.name}
//             </Text>
//             <TouchableOpacity onPress={() => setVisibleModal('shoes')}>
//               <Text style={styles.why}>Why these shoes?</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </ScrollView>

//       <WhyPickedModal
//         visible={visibleModal === 'top'}
//         item={outfit.top}
//         reasons={reasons.top ?? []}
//         section="Top"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'bottom'}
//         item={outfit.bottom}
//         reasons={reasons.bottom ?? []}
//         section="Bottom"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'shoes'}
//         item={outfit.shoes}
//         reasons={reasons.shoes ?? []}
//         section="Shoes"
//         onClose={() => setVisibleModal(null)}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   scrollContent: {padding: 16, paddingBottom: 40},
//   header: {
//     fontSize: 22,
//     fontWeight: '600',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   item: {marginBottom: 24, alignItems: 'center'},
//   image: {
//     width: 160,
//     height: 160,
//     borderRadius: 10,
//     marginBottom: 10,
//     backgroundColor: '#ccc',
//   },
//   name: {fontSize: 16, fontWeight: '500', marginBottom: 4},
//   why: {fontSize: 14, color: '#007AFF'},
// });

//////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';

// const mockWardrobe: WardrobeItem[] = [
//   /* same as before */
// ];

// export default function OutfitSuggestionScreen() {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const {outfit, reasons} = useOutfitSuggestion(mockWardrobe, {
//     keywords: ['casual'],
//     weather: 'hot',
//     fit: 'Slim',
//     size: 'M',
//     styleTags: ['modern'],
//     occasion: 'Casual',
//   });

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Suggested Outfit
//         </Text>

//         {outfit.top && (
//           <View style={styles.item}>
//             <Image source={{uri: outfit.top.image}} style={styles.image} />
//             <Text style={[styles.name, {color: theme.colors.foreground}]}>
//               {outfit.top.name}
//             </Text>
//             <TouchableOpacity onPress={() => setVisibleModal('top')}>
//               <Text style={styles.why}>Why this top?</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {outfit.bottom && (
//           <View style={styles.item}>
//             <Image source={{uri: outfit.bottom.image}} style={styles.image} />
//             <Text style={[styles.name, {color: theme.colors.foreground}]}>
//               {outfit.bottom.name}
//             </Text>
//             <TouchableOpacity onPress={() => setVisibleModal('bottom')}>
//               <Text style={styles.why}>Why these bottoms?</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {outfit.shoes && (
//           <View style={styles.item}>
//             <Image source={{uri: outfit.shoes.image}} style={styles.image} />
//             <Text style={[styles.name, {color: theme.colors.foreground}]}>
//               {outfit.shoes.name}
//             </Text>
//             <TouchableOpacity onPress={() => setVisibleModal('shoes')}>
//               <Text style={styles.why}>Why these shoes?</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </ScrollView>

//       <WhyPickedModal
//         visible={visibleModal === 'top'}
//         item={outfit.top}
//         reasons={reasons.top ?? []}
//         section="Top"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'bottom'}
//         item={outfit.bottom}
//         reasons={reasons.bottom ?? []}
//         section="Bottom"
//         onClose={() => setVisibleModal(null)}
//       />
//       <WhyPickedModal
//         visible={visibleModal === 'shoes'}
//         item={outfit.shoes}
//         reasons={reasons.shoes ?? []}
//         section="Shoes"
//         onClose={() => setVisibleModal(null)}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   scrollContent: {padding: 16, paddingBottom: 40},
//   header: {
//     fontSize: 22,
//     fontWeight: '600',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   item: {marginBottom: 24, alignItems: 'center'},
//   image: {
//     width: 160,
//     height: 160,
//     borderRadius: 10,
//     marginBottom: 10,
//     backgroundColor: '#ccc',
//   },
//   name: {fontSize: 16, fontWeight: '500', marginBottom: 4},
//   why: {fontSize: 14, color: '#007AFF'},
// });
