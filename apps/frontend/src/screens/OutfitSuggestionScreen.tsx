import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
import {useAppTheme} from '../context/ThemeContext';
import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {saveFavoriteOutfit} from '../utils/favorites';
import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
import {saveOutfitToDate} from '../utils/calendarStorage';
import Voice from '@react-native-voice/voice';

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

  const [lastSpeech, setLastSpeech] = useState('');

  const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
    'Any',
  );

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
    top: WardrobeItem;
    bottom: WardrobeItem;
    shoes: WardrobeItem;
  }>(null);

  const [feedbackData, setFeedbackData] = useState<{
    feedback: 'like' | 'dislike' | null;
    tags: string[];
    reason: string;
  }>({
    feedback: null,
    tags: [],
    reason: '',
  });

  const REASON_TAGS = [
    'Too casual',
    'Too formal',
    'Wrong for weather',
    'Color mismatch',
    'Love this',
    'Would wear this',
  ];

  const handleVoiceStart = async () => {
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
    }
  };

  const toggleTag = (tag: string) => {
    setFeedbackData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

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

  useEffect(() => {
    Voice.onSpeechResults = e => {
      const speech = e.value?.[0]?.toLowerCase() ?? '';
      setLastSpeech(speech);
      if (
        speech.includes('hot') ||
        speech.includes('cold') ||
        speech.includes('rainy')
      ) {
        setWeather(speech as 'hot' | 'cold' | 'rainy');
      } else if (speech.includes('casual') || speech.includes('formal')) {
        setOccasion(speech);
      } else {
        setStyle(speech);
      }

      regenerateOutfit();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const styles = StyleSheet.create({
    container: {flex: 1},
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      alignItems: 'center',
    },
    header: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.primary,
      paddingHorizontal: 16,
    },
    promptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 12,
      height: 48,
      width: '100%',
    },
    promptInput: {
      flex: 1,
      color: 'white',
      fontSize: 16,
    },
    chipsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      width: '100%',
      marginTop: 0,
    },
    chip: {
      backgroundColor: '#2a2a2a',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    chipText: {
      color: 'white',
      fontSize: 14,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2a2a2a',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      width: '100%',
    },
    cardThumbnail: {
      width: 100,
      height: 100,
      borderRadius: 8,
      marginRight: 12,
    },
    cardDetails: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    cardWhy: {
      fontSize: 14,
      color: '#4a90e2',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 12,
    },
    button: {
      backgroundColor: '#405de6',
      paddingVertical: 10,
      borderRadius: 10,
      width: 120,
    },
    buttonText: {
      color: 'white',
      fontWeight: '600',
      marginLeft: 6,
      textAlign: 'center',
    },
    generateButton: {
      backgroundColor: '#405de6',
      paddingVertical: 10,
      paddingHorizontal: 52,
      borderRadius: 10,
      marginTop: 4,
      marginBottom: 18,
    },
    generateButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    cardTight: {
      width: '100%',
      backgroundColor: '#1c1c1e',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 16,
      elevation: 2,
    },
    cardImageTight: {
      width: '100%',
      height: 180,
      resizeMode: 'cover',
    },
    cardInfo: {
      padding: 12,
    },
    cardName: {
      fontSize: 15,
      fontWeight: '600',
      color: 'white',
      marginBottom: 4,
    },
    card: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: '#1c1c1e',
    },
    cardOverlay: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: '#1c1c1e',
      elevation: 3,
    },
    cardImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    overlay: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    itemName: {
      fontSize: 15,
      fontWeight: '600',
      color: 'white',
    },
    whyText: {
      fontSize: 13,
      color: '#4a90e2',
      marginTop: 2,
    },
    categoryPill: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(0,0,0,0.9)',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
    },
    pillText: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  });

  const renderCard = (
    label: string,
    item: WardrobeItem | undefined,
    section: 'top' | 'bottom' | 'shoes',
  ) => (
    <TouchableOpacity
      onPress={() => setVisibleModal(section)}
      activeOpacity={0.9}
      style={styles.cardOverlay}>
      <Image
        source={
          item?.image
            ? {uri: item.image}
            : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
        }
        style={styles.cardImage}
      />

      {/* 🏷️ Pill Label */}
      <View style={styles.categoryPill}>
        <Text style={styles.pillText}>{label}</Text>
      </View>

      {/* ℹ️ Text Overlay */}
      <View style={styles.overlay}>
        <Text style={styles.itemName}>
          {item?.name ?? `No ${label} selected`}
        </Text>
        <Text style={styles.whyText}>Why this {label}?</Text>
      </View>
    </TouchableOpacity>
  );

  const handleGenerate = () => {
    regenerateOutfit();
  };

  return (
    <>
      <Text style={styles.header}>Style Me</Text>

      <View
        style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Prompt input with mic */}
          <View style={styles.promptRow}>
            <TextInput
              placeholder="What are you dressing for?"
              placeholderTextColor={theme.colors.muted}
              style={styles.promptInput}
              value={lastSpeech}
              onChangeText={setLastSpeech}
            />
            <TouchableOpacity onPress={handleVoiceStart}>
              <MaterialIcons name="keyboard-voice" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Filter pills */}
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={styles.chip}
              onPress={() =>
                setWeather(prev => (prev === 'hot' ? 'cold' : 'hot'))
              }>
              <Text style={styles.chipText}>Weather: {weather}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chip}
              onPress={() =>
                setOccasion(prev => (prev === 'Casual' ? 'Formal' : 'Casual'))
              }>
              <Text style={styles.chipText}>Occasion: {occasion}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chip}
              onPress={() =>
                setStyle(prev => (prev === 'modern' ? 'retro' : 'modern'))
              }>
              <Text style={styles.chipText}>Style: {style}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}>
            <Text style={styles.generateButtonText}>Generate Outfit</Text>
          </TouchableOpacity>

          {/* Suggested outfit */}
          {/* <Text style={[styles.header, {color: theme.colors.foreground}]}>
            Your Outfit
          </Text> */}
          {renderCard('Top', outfit.top, 'top')}
          {renderCard('Bottom', outfit.bottom, 'bottom')}
          {renderCard('Shoes', outfit.shoes, 'shoes')}

          {/* CTA row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setFeedbackModalVisible(true)}>
              <Text style={styles.buttonText}>Rate Outfit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                navigate('TryOnOverlay', {
                  outfit,
                  userPhotoUri: Image.resolveAssetSource(
                    require('../assets/images/full-body-temp1.png'),
                  ).uri,
                })
              }>
              <Text style={styles.buttonText}>Try On</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (outfit.top && outfit.bottom && outfit.shoes) {
                  setPendingSaveOutfit({
                    top: outfit.top,
                    bottom: outfit.bottom,
                    shoes: outfit.shoes,
                  });
                  setShowNameModal(true);
                }
              }}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
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
        <OutfitFeedbackModal
          visible={feedbackModalVisible}
          onClose={() => setFeedbackModalVisible(false)}
          feedbackData={feedbackData}
          setFeedbackData={setFeedbackData}
          toggleTag={toggleTag}
          REASON_TAGS={REASON_TAGS}
          theme={theme}
        />
        <OutfitNameModal
          visible={showNameModal}
          onClose={() => {
            setShowNameModal(false);
            setPendingSaveOutfit(null);
          }}
          onSave={async (name, date) => {
            if (pendingSaveOutfit) {
              const savedOutfit = {
                id: Date.now().toString(),
                name,
                top: pendingSaveOutfit.top,
                bottom: pendingSaveOutfit.bottom,
                shoes: pendingSaveOutfit.shoes,
                createdAt: new Date().toISOString(),
                tags: feedbackData.tags,
                notes: feedbackData.reason,
                rating:
                  feedbackData.feedback === 'like'
                    ? 5
                    : feedbackData.feedback === 'dislike'
                    ? 2
                    : undefined,
                favorited: true,
              };

              await saveFavoriteOutfit(savedOutfit);
              await saveOutfitToDate(date, savedOutfit);
              setShowNameModal(false);
              setPendingSaveOutfit(null);
            }
          }}
        />
      </View>
    </>
  );
}

/////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {saveFavoriteOutfit} from '../utils/favorites';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
// import {saveOutfitToDate} from '../utils/calendarStorage';
// import Voice from '@react-native-voice/voice';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [lastSpeech, setLastSpeech] = useState('');

//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
//     'Any',
//   );

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const speech = e.value?.[0]?.toLowerCase() ?? '';
//       setLastSpeech(speech);
//       if (
//         speech.includes('hot') ||
//         speech.includes('cold') ||
//         speech.includes('rainy')
//       ) {
//         setWeather(speech as 'hot' | 'cold' | 'rainy');
//       } else if (speech.includes('casual') || speech.includes('formal')) {
//         setOccasion(speech);
//       } else {
//         setStyle(speech);
//       }

//       regenerateOutfit();
//     };

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

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
//       marginVertical: 24,
//       textAlign: 'center',
//     },
//     promptRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#1a1a1a',
//       borderRadius: 12,
//       paddingHorizontal: 12,
//       marginBottom: 12,
//       height: 48,
//       width: '100%',
//     },
//     promptInput: {
//       flex: 1,
//       color: 'white',
//       fontSize: 16,
//     },
//     chipsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 20,
//       width: '100%',
//     },
//     chip: {
//       backgroundColor: '#2a2a2a',
//       paddingVertical: 8,
//       paddingHorizontal: 16,
//       borderRadius: 20,
//     },
//     chipText: {
//       color: 'white',
//       fontSize: 14,
//     },
//     cardRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#2a2a2a',
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 12,
//       width: '100%',
//     },
//     cardThumbnail: {
//       width: 100,
//       height: 100,
//       borderRadius: 8,
//       marginRight: 12,
//     },
//     cardDetails: {
//       flex: 1,
//     },
//     cardTitle: {
//       fontSize: 16,
//       fontWeight: '600',
//       marginBottom: 4,
//     },
//     cardWhy: {
//       fontSize: 14,
//       color: '#4a90e2',
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       width: '100%',
//       marginTop: 12,
//     },
//     askAIButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#405de6',
//       paddingVertical: 10,
//       paddingHorizontal: 28,
//       borderRadius: 10,
//     },
//     button: {
//       backgroundColor: '#2a2a2a',
//       paddingVertical: 10,
//       // paddingHorizontal: 40,
//       borderRadius: 10,
//       width: 130,
//     },
//     buttonText: {
//       color: 'white',
//       fontWeight: '600',
//       marginLeft: 6,
//       textAlign: 'center',
//     },
//     generateButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 10,
//       paddingHorizontal: 32,
//       borderRadius: 10,
//       marginBottom: 0,
//       marginTop: 8,
//     },
//     generateButtonText: {
//       color: 'white',
//       fontSize: 16,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//     cardTight: {
//       width: '100%',
//       backgroundColor: '#1c1c1e',
//       borderRadius: 14,
//       overflow: 'hidden',
//       marginBottom: 16,
//       elevation: 2,
//     },
//     cardImageTight: {
//       width: '100%',
//       height: 180,
//       resizeMode: 'cover',
//     },
//     cardInfo: {
//       padding: 12,
//     },
//     cardName: {
//       fontSize: 15,
//       fontWeight: '600',
//       color: 'white',
//       marginBottom: 4,
//     },
//     card: {
//       width: '100%',
//       height: 180,
//       borderRadius: 16,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//     },
//     cardOverlay: {
//       width: '100%',
//       height: 200,
//       borderRadius: 16,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//       elevation: 3,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       paddingVertical: 10,
//       paddingHorizontal: 14,
//     },
//     itemName: {
//       fontSize: 15,
//       fontWeight: '600',
//       color: 'white',
//     },
//     whyText: {
//       fontSize: 13,
//       color: '#4a90e2',
//       marginTop: 2,
//     },
//   });

//   const renderCard = (
//     label: string,
//     item: WardrobeItem | undefined,
//     section: 'top' | 'bottom' | 'shoes',
//   ) => (
//     <TouchableOpacity
//       onPress={() => setVisibleModal(section)}
//       activeOpacity={0.9}
//       style={styles.cardOverlay}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View style={styles.overlay}>
//         <Text style={styles.itemName}>
//           {item?.name ?? `No ${label} selected`}
//         </Text>
//         <Text style={styles.whyText}>Why this {label}?</Text>
//       </View>
//     </TouchableOpacity>
//   );

//   const handleGenerate = () => {
//     regenerateOutfit();
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {/* Prompt input with mic */}
//         <View style={styles.promptRow}>
//           <TextInput
//             placeholder="What are you dressing for?"
//             placeholderTextColor={theme.colors.muted}
//             style={styles.promptInput}
//             value={lastSpeech}
//             onChangeText={setLastSpeech}
//           />
//           <TouchableOpacity onPress={handleVoiceStart}>
//             <MaterialIcons name="keyboard-voice" size={24} color="white" />
//           </TouchableOpacity>
//         </View>

//         {/* Filter pills */}
//         <View style={styles.chipsRow}>
//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setWeather(prev => (prev === 'hot' ? 'cold' : 'hot'))
//             }>
//             <Text style={styles.chipText}>Weather: {weather}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setOccasion(prev => (prev === 'Casual' ? 'Formal' : 'Casual'))
//             }>
//             <Text style={styles.chipText}>Occasion: {occasion}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setStyle(prev => (prev === 'modern' ? 'retro' : 'modern'))
//             }>
//             <Text style={styles.chipText}>Style: {style}</Text>
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity
//           style={styles.generateButton}
//           onPress={handleGenerate}>
//           <Text style={styles.generateButtonText}>Generate Outfit</Text>
//         </TouchableOpacity>

//         {/* Suggested outfit */}
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Your Outfit
//         </Text>
//         {renderCard('Top', outfit.top, 'top')}
//         {renderCard('Bottom', outfit.bottom, 'bottom')}
//         {renderCard('Shoes', outfit.shoes, 'shoes')}

//         {/* CTA row */}
//         <View style={styles.buttonRow}>
//           <TouchableOpacity
//             style={styles.askAIButton}
//             onPress={handleVoiceStart}>
//             <MaterialIcons name="keyboard-voice" size={18} color="white" />
//             <Text style={styles.buttonText}>Ask AI</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.button}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit,
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text style={styles.buttonText}>Try On</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.button}
//             onPress={() => {
//               if (outfit.top && outfit.bottom && outfit.shoes) {
//                 setPendingSaveOutfit({
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 });
//                 setShowNameModal(true);
//               }
//             }}>
//             <Text style={styles.buttonText}>Save</Text>
//           </TouchableOpacity>
//         </View>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={async (name, date) => {
//           if (pendingSaveOutfit) {
//             const savedOutfit = {
//               id: Date.now().toString(),
//               name,
//               top: pendingSaveOutfit.top,
//               bottom: pendingSaveOutfit.bottom,
//               shoes: pendingSaveOutfit.shoes,
//               createdAt: new Date().toISOString(),
//               tags: feedbackData.tags,
//               notes: feedbackData.reason,
//               rating:
//                 feedbackData.feedback === 'like'
//                   ? 5
//                   : feedbackData.feedback === 'dislike'
//                   ? 2
//                   : undefined,
//               favorited: true,
//             };

//             await saveFavoriteOutfit(savedOutfit);
//             await saveOutfitToDate(date, savedOutfit);
//             setShowNameModal(false);
//             setPendingSaveOutfit(null);
//           }
//         }}
//       />
//     </View>
//   );
// }

//////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {saveFavoriteOutfit} from '../utils/favorites';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
// import {saveOutfitToDate} from '../utils/calendarStorage';
// import Voice from '@react-native-voice/voice';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [lastSpeech, setLastSpeech] = useState('');

//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
//     'Any',
//   );

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const speech = e.value?.[0]?.toLowerCase() ?? '';
//       setLastSpeech(speech);
//       if (
//         speech.includes('hot') ||
//         speech.includes('cold') ||
//         speech.includes('rainy')
//       ) {
//         setWeather(speech as 'hot' | 'cold' | 'rainy');
//       } else if (speech.includes('casual') || speech.includes('formal')) {
//         setOccasion(speech);
//       } else {
//         setStyle(speech);
//       }

//       regenerateOutfit();
//     };

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

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
//       marginVertical: 24,
//       textAlign: 'center',
//     },

//     // 🆕 Prompt + Filter
//     promptRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#1a1a1a',
//       borderRadius: 12,
//       paddingHorizontal: 12,
//       marginBottom: 12,
//       height: 48,
//       width: '100%',
//     },
//     promptInput: {
//       flex: 1,
//       color: 'white',
//       fontSize: 16,
//     },
//     chipsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 20,
//       width: '100%',
//     },
//     chip: {
//       backgroundColor: '#2a2a2a',
//       paddingVertical: 8,
//       paddingHorizontal: 16,
//       borderRadius: 20,
//     },
//     chipText: {
//       color: 'white',
//       fontSize: 14,
//     },

//     // ✅ Modern Outfit Card (side-by-side)
//     cardRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#2a2a2a',
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 12,
//       width: '100%',
//     },
//     cardThumbnail: {
//       width: 100,
//       height: 100,
//       borderRadius: 8,
//       marginRight: 12,
//     },
//     cardDetails: {
//       flex: 1,
//     },
//     cardTitle: {
//       fontSize: 16,
//       fontWeight: '600',
//       marginBottom: 4,
//     },
//     cardWhy: {
//       fontSize: 14,
//       color: '#4a90e2',
//     },

//     // 🎯 Button Row
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       width: '100%',
//       marginTop: 24,
//     },
//     askAIButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#405de6',
//       paddingVertical: 10,
//       paddingHorizontal: 18,
//       borderRadius: 10,
//     },
//     button: {
//       backgroundColor: '#2a2a2a',
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 10,
//     },
//     buttonText: {
//       color: 'white',
//       fontWeight: '600',
//       marginLeft: 6,
//     },
//     generateButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 32,
//       borderRadius: 10,
//       marginBottom: 20,
//       marginTop: 8,
//     },
//     generateButtonText: {
//       color: 'white',
//       fontSize: 16,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//   });

//   const renderCard = (
//     label: string,
//     item: WardrobeItem | undefined,
//     section: 'top' | 'bottom' | 'shoes',
//   ) => (
//     <View style={styles.cardRow}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/150?text=No+Image'}
//         }
//         style={styles.cardThumbnail}
//       />
//       <View style={styles.cardDetails}>
//         <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//           {item?.name ?? `No ${label} selected`}
//         </Text>
//         <TouchableOpacity onPress={() => setVisibleModal(section)}>
//           <Text style={styles.cardWhy}>Why this {label}?</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const handleGenerate = () => {
//     regenerateOutfit();
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {/* Prompt input with mic */}
//         <View style={styles.promptRow}>
//           <TextInput
//             placeholder="What are you dressing for?"
//             placeholderTextColor={theme.colors.muted}
//             style={styles.promptInput}
//             value={lastSpeech}
//             onChangeText={setLastSpeech}
//           />
//           <TouchableOpacity onPress={handleVoiceStart}>
//             <MaterialIcons name="keyboard-voice" size={24} color="white" />
//           </TouchableOpacity>
//         </View>

//         {/* Filter pills */}
//         <View style={styles.chipsRow}>
//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setWeather(prev => (prev === 'hot' ? 'cold' : 'hot'))
//             }>
//             <Text style={styles.chipText}>Weather: {weather}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setOccasion(prev => (prev === 'Casual' ? 'Formal' : 'Casual'))
//             }>
//             <Text style={styles.chipText}>Occasion: {occasion}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setStyle(prev => (prev === 'modern' ? 'retro' : 'modern'))
//             }>
//             <Text style={styles.chipText}>Style: {style}</Text>
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity
//           style={styles.generateButton}
//           onPress={handleGenerate}>
//           <Text style={styles.generateButtonText}>Generate Outfit</Text>
//         </TouchableOpacity>

//         {/* Suggested outfit */}
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Your Outfit
//         </Text>
//         {renderCard('Top', outfit.top, 'top')}
//         {renderCard('Bottom', outfit.bottom, 'bottom')}
//         {renderCard('Shoes', outfit.shoes, 'shoes')}

//         {/* CTA row */}
//         <View style={styles.buttonRow}>
//           <TouchableOpacity
//             style={styles.askAIButton}
//             onPress={handleVoiceStart}>
//             <MaterialIcons name="keyboard-voice" size={18} color="white" />
//             <Text style={styles.buttonText}>Ask AI</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.button}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit,
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text style={styles.buttonText}>Try On</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.button}
//             onPress={() => {
//               if (outfit.top && outfit.bottom && outfit.shoes) {
//                 setPendingSaveOutfit({
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 });
//                 setShowNameModal(true);
//               }
//             }}>
//             <Text style={styles.buttonText}>Save</Text>
//           </TouchableOpacity>
//         </View>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={async (name, date) => {
//           if (pendingSaveOutfit) {
//             const savedOutfit = {
//               id: Date.now().toString(),
//               name,
//               top: pendingSaveOutfit.top,
//               bottom: pendingSaveOutfit.bottom,
//               shoes: pendingSaveOutfit.shoes,
//               createdAt: new Date().toISOString(),
//               tags: feedbackData.tags,
//               notes: feedbackData.reason,
//               rating:
//                 feedbackData.feedback === 'like'
//                   ? 5
//                   : feedbackData.feedback === 'dislike'
//                   ? 2
//                   : undefined,
//               favorited: true,
//             };

//             await saveFavoriteOutfit(savedOutfit);
//             await saveOutfitToDate(date, savedOutfit);
//             setShowNameModal(false);
//             setPendingSaveOutfit(null);
//           }
//         }}
//       />
//     </View>
//   );
// }

///////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {saveFavoriteOutfit} from '../utils/favorites';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
// import {saveOutfitToDate} from '../utils/calendarStorage';
// import Voice from '@react-native-voice/voice';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [lastSpeech, setLastSpeech] = useState('');

//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
//     'Any',
//   );

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const speech = e.value?.[0]?.toLowerCase() ?? '';
//       setLastSpeech(speech);
//       if (
//         speech.includes('hot') ||
//         speech.includes('cold') ||
//         speech.includes('rainy')
//       ) {
//         setWeather(speech as 'hot' | 'cold' | 'rainy');
//       } else if (speech.includes('casual') || speech.includes('formal')) {
//         setOccasion(speech);
//       } else {
//         setStyle(speech);
//       }

//       regenerateOutfit();
//     };

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

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
//       marginVertical: 24,
//       textAlign: 'center',
//     },

//     // 🆕 Prompt + Filter
//     promptRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#1a1a1a',
//       borderRadius: 12,
//       paddingHorizontal: 12,
//       marginBottom: 12,
//       height: 48,
//       width: '100%',
//     },
//     promptInput: {
//       flex: 1,
//       color: 'white',
//       fontSize: 16,
//     },
//     chipsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 20,
//       width: '100%',
//     },
//     chip: {
//       backgroundColor: '#2a2a2a',
//       paddingVertical: 8,
//       paddingHorizontal: 16,
//       borderRadius: 20,
//     },
//     chipText: {
//       color: 'white',
//       fontSize: 14,
//     },

//     // ✅ Modern Outfit Card (side-by-side)
//     cardRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#2a2a2a',
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 12,
//       width: '100%',
//     },
//     cardThumbnail: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 12,
//     },
//     cardDetails: {
//       flex: 1,
//     },
//     cardTitle: {
//       fontSize: 16,
//       fontWeight: '600',
//       marginBottom: 4,
//     },
//     cardWhy: {
//       fontSize: 14,
//       color: '#4a90e2',
//     },

//     // 🎯 Button Row
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       width: '100%',
//       marginTop: 24,
//     },
//     askAIButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: '#405de6',
//       paddingVertical: 10,
//       paddingHorizontal: 18,
//       borderRadius: 10,
//     },
//     button: {
//       backgroundColor: '#2a2a2a',
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 10,
//     },
//     buttonText: {
//       color: 'white',
//       fontWeight: '600',
//       marginLeft: 6,
//     },
//     generateButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 12,
//       paddingHorizontal: 32,
//       borderRadius: 10,
//       marginBottom: 20,
//       marginTop: 8,
//     },
//     generateButtonText: {
//       color: 'white',
//       fontSize: 16,
//       fontWeight: '600',
//       textAlign: 'center',
//     },
//   });

//   const renderCard = (
//     label: string,
//     item: WardrobeItem | undefined,
//     section: 'top' | 'bottom' | 'shoes',
//   ) => (
//     <View style={styles.cardRow}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/150?text=No+Image'}
//         }
//         style={styles.cardThumbnail}
//       />
//       <View style={styles.cardDetails}>
//         <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//           {item?.name ?? `No ${label} selected`}
//         </Text>
//         <TouchableOpacity onPress={() => setVisibleModal(section)}>
//           <Text style={styles.cardWhy}>Why this {label}?</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const handleGenerate = () => {
//     regenerateOutfit();
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {/* Prompt input with mic */}
//         <View style={styles.promptRow}>
//           <TextInput
//             placeholder="What are you dressing for?"
//             placeholderTextColor={theme.colors.muted}
//             style={styles.promptInput}
//             value={lastSpeech}
//             onChangeText={setLastSpeech}
//           />
//           <TouchableOpacity onPress={handleVoiceStart}>
//             <MaterialIcons name="keyboard-voice" size={24} color="white" />
//           </TouchableOpacity>
//         </View>

//         {/* Filter pills */}
//         <View style={styles.chipsRow}>
//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setWeather(prev => (prev === 'hot' ? 'cold' : 'hot'))
//             }>
//             <Text style={styles.chipText}>Weather: {weather}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setOccasion(prev => (prev === 'Casual' ? 'Formal' : 'Casual'))
//             }>
//             <Text style={styles.chipText}>Occasion: {occasion}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.chip}
//             onPress={() =>
//               setStyle(prev => (prev === 'modern' ? 'retro' : 'modern'))
//             }>
//             <Text style={styles.chipText}>Style: {style}</Text>
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity
//           style={styles.generateButton}
//           onPress={handleGenerate}>
//           <Text style={styles.generateButtonText}>Generate Outfit</Text>
//         </TouchableOpacity>

//         {/* Suggested outfit */}
//         <Text style={[styles.header, {color: theme.colors.foreground}]}>
//           Your Outfit
//         </Text>
//         {renderCard('Top', outfit.top, 'top')}
//         {renderCard('Bottom', outfit.bottom, 'bottom')}
//         {renderCard('Shoes', outfit.shoes, 'shoes')}

//         {/* CTA row */}
//         <View style={styles.buttonRow}>
//           <TouchableOpacity
//             style={styles.askAIButton}
//             onPress={handleVoiceStart}>
//             <MaterialIcons name="keyboard-voice" size={18} color="white" />
//             <Text style={styles.buttonText}>Ask AI</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.button}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit,
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text style={styles.buttonText}>Try On</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.button}
//             onPress={() => {
//               if (outfit.top && outfit.bottom && outfit.shoes) {
//                 setPendingSaveOutfit({
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 });
//                 setShowNameModal(true);
//               }
//             }}>
//             <Text style={styles.buttonText}>Save</Text>
//           </TouchableOpacity>
//         </View>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={async (name, date) => {
//           if (pendingSaveOutfit) {
//             const savedOutfit = {
//               id: Date.now().toString(),
//               name,
//               top: pendingSaveOutfit.top,
//               bottom: pendingSaveOutfit.bottom,
//               shoes: pendingSaveOutfit.shoes,
//               createdAt: new Date().toISOString(),
//               tags: feedbackData.tags,
//               notes: feedbackData.reason,
//               rating:
//                 feedbackData.feedback === 'like'
//                   ? 5
//                   : feedbackData.feedback === 'dislike'
//                   ? 2
//                   : undefined,
//               favorited: true,
//             };

//             await saveFavoriteOutfit(savedOutfit);
//             await saveOutfitToDate(date, savedOutfit);
//             setShowNameModal(false);
//             setPendingSaveOutfit(null);
//           }
//         }}
//       />
//     </View>
//   );
// }

/////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {saveFavoriteOutfit} from '../utils/favorites';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
// import {saveOutfitToDate} from '../utils/calendarStorage';
// import Voice from '@react-native-voice/voice';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [lastSpeech, setLastSpeech] = useState('');

//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
//     'Any',
//   );

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const speech = e.value?.[0]?.toLowerCase() ?? '';
//       setLastSpeech(speech);
//       if (
//         speech.includes('hot') ||
//         speech.includes('cold') ||
//         speech.includes('rainy')
//       ) {
//         setWeather(speech as 'hot' | 'cold' | 'rainy');
//       } else if (speech.includes('casual') || speech.includes('formal')) {
//         setOccasion(speech);
//       } else {
//         setStyle(speech);
//       }

//       regenerateOutfit();
//     };

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

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
//     saveOutfitButton: {
//       fontSize: 16,
//       color: theme.colors.foreground,
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
//         <View style={{alignItems: 'center', marginBottom: 16}}>
//           <Text style={[styles.header, {color: theme.colors.foreground}]}>
//             Suggested Outfit
//           </Text>
//           <TouchableOpacity onPress={handleVoiceStart}>
//             <Text style={[styles.cardTitle, {color: theme.colors.primary}]}>
//               🎙️ Start Voice Command
//             </Text>
//           </TouchableOpacity>
//           <Text style={{color: theme.colors.muted}}>Heard: {lastSpeech}</Text>
//         </View>
//         {renderCard('Top', outfit.top, 'top')}
//         {renderCard('Bottom', outfit.bottom, 'bottom')}
//         {renderCard('Shoes', outfit.shoes, 'shoes')}

//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <>
//             <TouchableOpacity
//               style={{
//                 backgroundColor: '#405de6',
//                 paddingVertical: 10,
//                 paddingHorizontal: 24,
//                 borderRadius: 10,
//                 marginTop: 12,
//               }}
//               onPress={() =>
//                 navigate('TryOnOverlay', {
//                   outfit: {
//                     top: outfit.top,
//                     bottom: outfit.bottom,
//                     shoes: outfit.shoes,
//                   },
//                   userPhotoUri: Image.resolveAssetSource(
//                     require('../assets/images/full-body-temp1.png'),
//                   ).uri,
//                 })
//               }>
//               <Text
//                 style={{
//                   color: 'white',
//                   fontWeight: '600',
//                   textAlign: 'center',
//                 }}>
//                 Try This Outfit On
//               </Text>
//             </TouchableOpacity>
//           </>
//         )}

//         <View style={{marginTop: 24}}>
//           <TouchableOpacity
//             style={{
//               backgroundColor: '#405de6',
//               paddingVertical: 10,
//               paddingHorizontal: 30,
//               borderRadius: 10,
//             }}
//             onPress={() => setFeedbackModalVisible(true)}>
//             <Text
//               style={{color: 'white', fontWeight: '600', textAlign: 'center'}}>
//               Rate This Outfit
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               backgroundColor: '#405de6',
//               paddingVertical: 10,
//               paddingHorizontal: 30,
//               borderRadius: 10,
//               marginTop: 16,
//             }}
//             onPress={() => {
//               setPendingSaveOutfit({
//                 top: outfit.top!,
//                 bottom: outfit.bottom!,
//                 shoes: outfit.shoes!,
//               });
//               setShowNameModal(true);
//             }}>
//             <Text
//               style={{
//                 color: 'white',
//                 fontWeight: '600',
//                 textAlign: 'center',
//               }}>
//               Save This Outfit
//             </Text>
//           </TouchableOpacity>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={async (name, date) => {
//           if (pendingSaveOutfit) {
//             const savedOutfit = {
//               id: Date.now().toString(),
//               name,
//               top: pendingSaveOutfit.top,
//               bottom: pendingSaveOutfit.bottom,
//               shoes: pendingSaveOutfit.shoes,
//               createdAt: new Date().toISOString(),
//               tags: feedbackData.tags,
//               notes: feedbackData.reason,
//               rating:
//                 feedbackData.feedback === 'like'
//                   ? 5
//                   : feedbackData.feedback === 'dislike'
//                   ? 2
//                   : undefined,
//               favorited: true,
//             };

//             await saveFavoriteOutfit(savedOutfit);
//             await saveOutfitToDate(date, savedOutfit); // 📅 calendar save
//             setShowNameModal(false);
//             setPendingSaveOutfit(null);
//           }
//         }}
//       />
//     </View>
//   );
// }

/////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {saveFavoriteOutfit} from '../utils/favorites';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
// import {saveOutfitToDate} from '../utils/calendarStorage';
// import Voice from '@react-native-voice/voice';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [lastSpeech, setLastSpeech] = useState('');

//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
//     'Any',
//   );

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const speech = e.value?.[0]?.toLowerCase() ?? '';
//       setLastSpeech(speech);
//       if (
//         speech.includes('hot') ||
//         speech.includes('cold') ||
//         speech.includes('rainy')
//       ) {
//         setWeather(speech as 'hot' | 'cold' | 'rainy');
//       } else if (speech.includes('casual') || speech.includes('formal')) {
//         setOccasion(speech);
//       } else {
//         setStyle(speech);
//       }

//       regenerateOutfit();
//     };

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

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
//     saveOutfitButton: {
//       fontSize: 16,
//       color: theme.colors.foreground,
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
//         <View style={{alignItems: 'center', marginBottom: 16}}>
//           <Text style={[styles.header, {color: theme.colors.foreground}]}>
//             Suggested Outfit
//           </Text>
//           <TouchableOpacity onPress={handleVoiceStart}>
//             <Text style={[styles.cardTitle, {color: theme.colors.primary}]}>
//               🎙️ Start Voice Command
//             </Text>
//           </TouchableOpacity>
//           <Text style={{color: theme.colors.muted}}>Heard: {lastSpeech}</Text>
//         </View>
//         {renderCard('Top', outfit.top, 'top')}
//         {renderCard('Bottom', outfit.bottom, 'bottom')}
//         {renderCard('Shoes', outfit.shoes, 'shoes')}
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <>
//             <TouchableOpacity
//               style={{
//                 backgroundColor: theme.colors.primary,
//                 paddingVertical: 10,
//                 paddingHorizontal: 24,
//                 borderRadius: 10,
//                 marginTop: 12,
//               }}
//               onPress={() =>
//                 navigate('TryOnOverlay', {
//                   outfit: {
//                     top: outfit.top,
//                     bottom: outfit.bottom,
//                     shoes: outfit.shoes,
//                   },
//                   userPhotoUri: Image.resolveAssetSource(
//                     require('../assets/images/full-body-temp1.png'),
//                   ).uri,
//                 })
//               }>
//               <Text
//                 style={{
//                   color: 'black',
//                   fontWeight: '600',
//                   textAlign: 'center',
//                 }}>
//                 Try This Outfit On
//               </Text>
//             </TouchableOpacity>

//             {/* ✅ This now sits OUTSIDE and is valid */}
//             <TouchableOpacity onPress={handleVoiceStart}>
//               <Text style={styles.cardTitle}>Start Voice Command</Text>
//             </TouchableOpacity>
//             <Text style={styles.cardTitle}>{outfit.top?.name}</Text>
//             <Text style={styles.cardTitle}>{outfit.bottom?.name}</Text>
//             <Text style={styles.cardTitle}>{outfit.shoes?.name}</Text>
//           </>
//         )}

//         <View style={{marginTop: 24}}>
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//             }}
//             onPress={() => setFeedbackModalVisible(true)}>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Rate This Outfit
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/** 🧥 Existing button stays after feedback */}
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <View style={{marginTop: 24, gap: 12}}>
//             <TouchableOpacity
//               style={{
//                 backgroundColor: theme.colors.primary,
//                 paddingVertical: 10,
//                 paddingHorizontal: 24,
//                 borderRadius: 10,
//               }}
//               onPress={() =>
//                 navigate('TryOnOverlay', {
//                   outfit: {
//                     top: outfit.top,
//                     bottom: outfit.bottom,
//                     shoes: outfit.shoes,
//                   },
//                   userPhotoUri: Image.resolveAssetSource(
//                     require('../assets/images/full-body-temp1.png'),
//                   ).uri,
//                 })
//               }>
//               <Text
//                 style={{
//                   color: 'black',
//                   fontWeight: '600',
//                   textAlign: 'center',
//                 }}>
//                 Try This Outfit On
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity onPress={handleVoiceStart}>
//               <Text style={styles.cardTitle}>Start Voice Command</Text>
//             </TouchableOpacity>

//             <Text style={styles.cardTitle}>{outfit.top?.name}</Text>
//             <Text style={styles.cardTitle}>{outfit.bottom?.name}</Text>
//             <Text style={styles.cardTitle}>{outfit.shoes?.name}</Text>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={async (name, date) => {
//           if (pendingSaveOutfit) {
//             const savedOutfit = {
//               id: Date.now().toString(),
//               name,
//               top: pendingSaveOutfit.top,
//               bottom: pendingSaveOutfit.bottom,
//               shoes: pendingSaveOutfit.shoes,
//               createdAt: new Date().toISOString(),
//               tags: feedbackData.tags,
//               notes: feedbackData.reason,
//               rating:
//                 feedbackData.feedback === 'like'
//                   ? 5
//                   : feedbackData.feedback === 'dislike'
//                   ? 2
//                   : undefined,
//               favorited: true,
//             };

//             await saveFavoriteOutfit(savedOutfit);
//             await saveOutfitToDate(date, savedOutfit); // 📅 calendar save
//             setShowNameModal(false);
//             setPendingSaveOutfit(null);
//           }
//         }}
//       />
//     </View>
//   );
// }

///////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {saveFavoriteOutfit} from '../utils/favorites';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
// import {saveOutfitToDate} from '../utils/calendarStorage';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleFeedback = (type: 'like' | 'dislike') => {
//     setFeedbackData(prev => ({
//       ...prev,
//       feedback: prev.feedback === type ? null : type,
//     }));
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               marginTop: 16,
//               backgroundColor: '#405de6',
//               paddingVertical: 12,
//               borderRadius: 10,
//               alignItems: 'center',
//               width: '50%',
//               alignSelf: 'center',
//             }}
//             onPress={() => {
//               setPendingSaveOutfit({
//                 top: outfit.top,
//                 bottom: outfit.bottom,
//                 shoes: outfit.shoes,
//               });
//               setShowNameModal(true);
//             }}>
//             <Text style={[styles.saveOutfitButton, {fontWeight: '600'}]}>
//               Save to Favorites
//             </Text>
//           </TouchableOpacity>
//         )}

//         <View style={{marginTop: 24}}>
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//             }}
//             onPress={() => setFeedbackModalVisible(true)}>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Rate This Outfit
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/** 🧥 Existing button stays after feedback */}
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//               marginTop: 12,
//             }}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit: {
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 },
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Try This Outfit On
//             </Text>
//           </TouchableOpacity>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={async (name, date) => {
//           if (pendingSaveOutfit) {
//             const savedOutfit = {
//               id: Date.now().toString(),
//               name,
//               top: pendingSaveOutfit.top,
//               bottom: pendingSaveOutfit.bottom,
//               shoes: pendingSaveOutfit.shoes,
//               createdAt: new Date().toISOString(),
//               tags: feedbackData.tags,
//               notes: feedbackData.reason,
//               rating:
//                 feedbackData.feedback === 'like'
//                   ? 5
//                   : feedbackData.feedback === 'dislike'
//                   ? 2
//                   : undefined,
//               favorited: true,
//             };

//             await saveFavoriteOutfit(savedOutfit);
//             await saveOutfitToDate(date, savedOutfit); // 📅 calendar save
//             setShowNameModal(false);
//             setPendingSaveOutfit(null);
//           }
//         }}
//       />
//     </View>
//   );
// }

//////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {saveFavoriteOutfit} from '../utils/favorites';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleFeedback = (type: 'like' | 'dislike') => {
//     setFeedbackData(prev => ({
//       ...prev,
//       feedback: prev.feedback === type ? null : type,
//     }));
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               marginTop: 16,
//               backgroundColor: '#405de6',
//               paddingVertical: 12,
//               borderRadius: 10,
//               alignItems: 'center',
//               width: '50%',
//               alignSelf: 'center',
//             }}
//             onPress={() => {
//               setPendingSaveOutfit({
//                 top: outfit.top,
//                 bottom: outfit.bottom,
//                 shoes: outfit.shoes,
//               });
//               setShowNameModal(true);
//             }}>
//             <Text style={[styles.saveOutfitButton, {fontWeight: '600'}]}>
//               Save to Favorites
//             </Text>
//           </TouchableOpacity>
//         )}

//         <View style={{marginTop: 24}}>
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//             }}
//             onPress={() => setFeedbackModalVisible(true)}>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Rate This Outfit
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/** 🧥 Existing button stays after feedback */}
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//               marginTop: 12,
//             }}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit: {
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 },
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Try This Outfit On
//             </Text>
//           </TouchableOpacity>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={async name => {
//           if (pendingSaveOutfit) {
//             const savedOutfit = {
//               id: Date.now().toString(),
//               name,
//               top: pendingSaveOutfit.top,
//               bottom: pendingSaveOutfit.bottom,
//               shoes: pendingSaveOutfit.shoes,
//               createdAt: new Date().toISOString(),
//               tags: feedbackData.tags,
//               notes: feedbackData.reason,
//               rating:
//                 feedbackData.feedback === 'like'
//                   ? 5
//                   : feedbackData.feedback === 'dislike'
//                   ? 2
//                   : undefined, // ⭐ Rating now included
//               favorited: true,
//             };
//             await saveFavoriteOutfit(savedOutfit);
//             setShowNameModal(false);
//             setPendingSaveOutfit(null);
//           }
//         }}
//       />
//     </View>
//   );
// }

///////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleFeedback = (type: 'like' | 'dislike') => {
//     setFeedbackData(prev => ({
//       ...prev,
//       feedback: prev.feedback === type ? null : type,
//     }));
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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
//         <View style={{marginTop: 24}}>
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//             }}
//             onPress={() => setFeedbackModalVisible(true)}>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Rate This Outfit
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/** 🧥 Existing button stays after feedback */}
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//               marginTop: 12,
//             }}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit: {
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 },
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Try This Outfit On
//             </Text>
//           </TouchableOpacity>
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
//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={toggleTag}
//         REASON_TAGS={REASON_TAGS}
//         theme={theme}
//       />
//     </View>
//   );
// }

//////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
// } from 'react-native';
// import {useOutfitSuggestion, WardrobeItem} from '../hooks/useOutfitSuggestion';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);

//   const [feedbackData, setFeedbackData] = useState<{
//     feedback: 'like' | 'dislike' | null;
//     tags: string[];
//     reason: string;
//   }>({
//     feedback: null,
//     tags: [],
//     reason: '',
//   });

//   const REASON_TAGS = [
//     'Too casual',
//     'Too formal',
//     'Wrong for weather',
//     'Color mismatch',
//     'Love this',
//     'Would wear this',
//   ];

//   const handleFeedback = (type: 'like' | 'dislike') => {
//     setFeedbackData(prev => ({
//       ...prev,
//       feedback: prev.feedback === type ? null : type,
//     }));
//   };

//   const toggleTag = (tag: string) => {
//     setFeedbackData(prev => ({
//       ...prev,
//       tags: prev.tags.includes(tag)
//         ? prev.tags.filter(t => t !== tag)
//         : [...prev.tags, tag],
//     }));
//   };

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
//         <View style={{alignItems: 'center', marginTop: 24, width: '90%'}}>
//           <Text
//             style={{
//               fontSize: 18,
//               fontWeight: '600',
//               color: theme.colors.foreground,
//               marginBottom: 8,
//             }}>
//             Rate this outfit
//           </Text>

//           <Text
//             style={{
//               fontSize: 14,
//               color: theme.colors.foreground,
//               marginBottom: 16,
//               textAlign: 'center',
//             }}>
//             What did you think of this outfit? Let us know so we can improve
//             future suggestions.
//           </Text>

//           <View style={{flexDirection: 'row', gap: 20, marginBottom: 20}}>
//             <TouchableOpacity onPress={() => handleFeedback('like')}>
//               <MaterialIcons
//                 name="thumb-up"
//                 size={30}
//                 color={feedbackData.feedback === 'like' ? 'green' : 'gray'}
//               />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => handleFeedback('dislike')}>
//               <MaterialIcons
//                 name="thumb-down"
//                 size={30}
//                 color={feedbackData.feedback === 'dislike' ? 'red' : 'gray'}
//               />
//             </TouchableOpacity>
//           </View>

//           {feedbackData.feedback && (
//             <>
//               <Text
//                 style={{
//                   fontSize: 14,
//                   color: theme.colors.foreground,
//                   marginBottom: 8,
//                 }}>
//                 Why did you{' '}
//                 {feedbackData.feedback === 'like' ? 'like' : 'dislike'} it?
//               </Text>

//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'center',
//                   gap: 10,
//                   marginBottom: 16,
//                 }}>
//                 {REASON_TAGS.map(tag => (
//                   <TouchableOpacity
//                     key={tag}
//                     onPress={() => toggleTag(tag)}
//                     style={{
//                       borderColor: feedbackData.tags.includes(tag)
//                         ? '#333'
//                         : '#999',
//                       borderWidth: 1,
//                       borderRadius: 20,
//                       paddingHorizontal: 12,
//                       paddingVertical: 6,
//                       backgroundColor: feedbackData.tags.includes(tag)
//                         ? '#ddd'
//                         : '#fff',
//                     }}>
//                     <Text>{tag}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>

//               <TextInput
//                 placeholder="Add any comments or suggestions..."
//                 placeholderTextColor={theme.colors.muted}
//                 value={feedbackData.reason}
//                 onChangeText={text =>
//                   setFeedbackData(prev => ({...prev, reason: text}))
//                 }
//                 style={{
//                   borderWidth: 1,
//                   borderColor: '#ccc',
//                   borderRadius: 10,
//                   padding: 10,
//                   width: '100%',
//                   color: theme.colors.foreground,
//                 }}
//                 multiline
//               />
//             </>
//           )}
//         </View>

//         {/** 🧥 Existing button stays after feedback */}
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//               marginTop: 12,
//             }}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit: {
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 },
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Try This Outfit On
//             </Text>
//           </TouchableOpacity>
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

///////////////

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

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

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

// export default function OutfitSuggestionScreen({navigate}: Props) {
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
//         {outfit.top && outfit.bottom && outfit.shoes && (
//           <TouchableOpacity
//             style={{
//               backgroundColor: theme.colors.primary,
//               paddingVertical: 10,
//               paddingHorizontal: 24,
//               borderRadius: 10,
//               marginTop: 12,
//             }}
//             onPress={() =>
//               navigate('TryOnOverlay', {
//                 outfit: {
//                   top: outfit.top,
//                   bottom: outfit.bottom,
//                   shoes: outfit.shoes,
//                 },
//                 userPhotoUri: Image.resolveAssetSource(
//                   require('../assets/images/full-body-temp1.png'),
//                 ).uri,
//               })
//             }>
//             <Text
//               style={{color: 'black', fontWeight: '600', textAlign: 'center'}}>
//               Try This Outfit On
//             </Text>
//           </TouchableOpacity>
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
