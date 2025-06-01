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
import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';

type Props = {
  navigate: (screen: string, params?: any) => void;
};

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

export default function OutfitSuggestionScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const [visibleModal, setVisibleModal] = useState<
    null | 'top' | 'bottom' | 'shoes'
  >(null);

  const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
    'Any',
  );
  const [occasion, setOccasion] = useState<string>('Any');
  const [style, setStyle] = useState<string>('Any');

  const {outfit, reasons, regenerateOutfit} = useOutfitSuggestion(
    mockWardrobe,
    {
      occasion,
      weather,
      styleTags: style !== 'Any' ? [style] : [],
    },
  );

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
    <View style={styles.card}>
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
        <OutfitTuningControls
          weather={weather}
          occasion={occasion}
          style={style}
          onChangeWeather={(v: string) =>
            setWeather(v as 'hot' | 'cold' | 'rainy' | 'Any')
          }
          onChangeOccasion={setOccasion}
          onChangeStyle={setStyle}
          onGenerate={regenerateOutfit}
          onRegenerate={regenerateOutfit}
        />

        <Text style={[styles.header, {color: theme.colors.foreground}]}>
          Suggested Outfit
        </Text>

        {renderCard('Top', outfit.top, 'top')}
        {renderCard('Bottom', outfit.bottom, 'bottom')}
        {renderCard('Shoes', outfit.shoes, 'shoes')}
        {outfit.top && outfit.bottom && outfit.shoes && (
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.primary,
              paddingVertical: 10,
              paddingHorizontal: 24,
              borderRadius: 10,
              marginTop: 12,
            }}
            onPress={() =>
              navigate('TryOnOverlay', {
                outfit: {
                  top: outfit.top,
                  bottom: outfit.bottom,
                  shoes: outfit.shoes,
                },
                userPhotoUri: Image.resolveAssetSource(
                  require('../assets/images/full-body-temp1.png'),
                ).uri,
              })
            }>
            <Text
              style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
              Try This Outfit On
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

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
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';

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

//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
//     'Any',
//   );
//   const [occasion, setOccasion] = useState<string>('Any');
//   const [style, setStyle] = useState<string>('Any');

//   const {outfit, reasons, regenerateOutfit} = useOutfitSuggestion(
//     mockWardrobe,
//     {
//       occasion,
//       weather,
//       styleTags: style !== 'Any' ? [style] : [],
//     },
//   );

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
//     <View style={styles.card}>
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
//         <OutfitTuningControls
//           weather={weather}
//           occasion={occasion}
//           style={style}
//           onChangeWeather={(v: string) =>
//             setWeather(v as 'hot' | 'cold' | 'rainy' | 'Any')
//           }
//           onChangeOccasion={setOccasion}
//           onChangeStyle={setStyle}
//           onGenerate={regenerateOutfit}
//           onRegenerate={regenerateOutfit}
//         />

//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Suggested Outfit
//         </Text>

//         {renderCard('Top', outfit.top, 'top')}
//         {renderCard('Bottom', outfit.bottom, 'bottom')}
//         {renderCard('Shoes', outfit.shoes, 'shoes')}
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
