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
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

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
  const globalStyles = useGlobalStyles();
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
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    title: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 12,
      letterSpacing: -0.4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    scrollContent: {
      marginTop: 32,
      paddingBottom: 40,
      alignItems: 'center',
    },
    chipsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      width: '100%',
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
      borderRadius: tokens.borderRadius.md,
      padding: 12,
      marginBottom: 12,
      width: '100%',
    },
    cardThumbnail: {
      width: 100,
      height: 100,
      borderRadius: tokens.borderRadius.md,
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
    },
    cardTight: {
      width: '100%',
      backgroundColor: '#1c1c1e',
      borderRadius: tokens.borderRadius.md,
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
      borderRadius: tokens.borderRadius.md,
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: '#1c1c1e',
    },
    cardOverlay: {
      width: '100%',
      height: 200,
      borderRadius: tokens.borderRadius.md,
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
        <Text
          style={[
            globalStyles.label,
            {paddingHorizontal: 6, paddingVertical: 4},
          ]}>
          {label}
        </Text>
      </View>

      {/* ℹ️ Text Overlay */}
      <View style={styles.overlay}>
        <View style={globalStyles.labelContainer2}>
          <Text style={styles.itemName}>
            {item?.name ?? `No ${label} selected`}
          </Text>
          <Text style={styles.whyText}>Why this {label}?</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleGenerate = () => {
    regenerateOutfit();
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <View style={globalStyles.sectionTitle}>
        <Text
          style={[
            globalStyles.header,
            {color: theme.colors.primary, marginBottom: 20},
          ]}>
          Explore
        </Text>

        <View style={[globalStyles.section, {paddingBottom: 100}]}>
          <View style={globalStyles.centeredSection}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Prompt input with mic */}
              <View style={[globalStyles.promptRow, {marginBottom: 20}]}>
                <TextInput
                  placeholder="What are you dressing for?"
                  placeholderTextColor={theme.colors.muted}
                  style={globalStyles.promptInput}
                  value={lastSpeech}
                  onChangeText={setLastSpeech}
                />
                <TouchableOpacity onPress={handleVoiceStart}>
                  <MaterialIcons
                    name="keyboard-voice"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              {/* Filter pills */}
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={globalStyles.pillFixedWidth}
                  onPress={() =>
                    setWeather(prev => (prev === 'hot' ? 'cold' : 'hot'))
                  }>
                  <Text style={globalStyles.pillTextFixedWidth}>
                    Weather: {weather}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={globalStyles.pillFixedWidth}
                  onPress={() =>
                    setOccasion(prev =>
                      prev === 'Casual' ? 'Formal' : 'Casual',
                    )
                  }>
                  <Text style={globalStyles.pillTextFixedWidth}>
                    Occasion: {occasion}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={globalStyles.pillFixedWidth}
                  onPress={() =>
                    setStyle(prev => (prev === 'modern' ? 'retro' : 'modern'))
                  }>
                  <Text style={globalStyles.pillTextFixedWidth}>
                    Style: {style}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  globalStyles.buttonPrimary,
                  {width: 186, marginBottom: 20, marginTop: 8},
                ]}
                onPress={handleGenerate}>
                <Text style={[globalStyles.buttonPrimaryText]}>
                  Generate Outfit
                </Text>
              </TouchableOpacity>

              {/* Suggested outfit */}
              {renderCard('Top', outfit.top, 'top')}
              {renderCard('Bottom', outfit.bottom, 'bottom')}
              {renderCard('Shoes', outfit.shoes, 'shoes')}

              {/* CTA row */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 400,
                  alignSelf: 'center',
                  marginTop: 12,
                }}>
                <TouchableOpacity
                  style={[globalStyles.buttonPrimary, {width: 120}]}
                  onPress={() => setFeedbackModalVisible(true)}>
                  <Text style={globalStyles.buttonPrimaryText}>
                    Rate Outfit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[globalStyles.buttonPrimary, {width: 120}]}
                  onPress={() =>
                    navigate('TryOnOverlay', {
                      outfit,
                      userPhotoUri: Image.resolveAssetSource(
                        require('../assets/images/full-body-temp1.png'),
                      ).uri,
                    })
                  }>
                  <Text style={globalStyles.buttonPrimaryText}>Try On</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[globalStyles.buttonPrimary, {width: 120}]}
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
                  <Text style={globalStyles.buttonPrimaryText}>Save</Text>
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
        </View>
      </View>
    </View>
  );
}

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
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

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
//   const globalStyles = useGlobalStyles();
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
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     title: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//       letterSpacing: -0.4,
//     },
//     sectionTitle: {
//       fontSize: 17,
//       fontWeight: '600',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     scrollContent: {
//       marginTop: 32,
//       paddingBottom: 40,
//       alignItems: 'center',
//     },
//     chipsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 12,
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
//       borderRadius: tokens.borderRadius.md,
//       padding: 12,
//       marginBottom: 12,
//       width: '100%',
//     },
//     cardThumbnail: {
//       width: 100,
//       height: 100,
//       borderRadius: tokens.borderRadius.md,
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
//     },
//     cardTight: {
//       width: '100%',
//       backgroundColor: '#1c1c1e',
//       borderRadius: tokens.borderRadius.md,
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
//       borderRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//     },
//     cardOverlay: {
//       width: '100%',
//       height: 200,
//       borderRadius: tokens.borderRadius.md,
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
//     categoryPill: {
//       position: 'absolute',
//       top: 10,
//       left: 10,
//       backgroundColor: 'rgba(0,0,0,0.9)',
//       paddingVertical: 4,
//       paddingHorizontal: 10,
//       borderRadius: 999,
//     },
//     pillText: {
//       fontSize: 12,
//       color: '#fff',
//       fontWeight: '600',
//       textTransform: 'uppercase',
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

//       {/* 🏷️ Pill Label */}
//       <View style={styles.categoryPill}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 6, paddingVertical: 4},
//           ]}>
//           {label}
//         </Text>
//       </View>

//       {/* ℹ️ Text Overlay */}
//       <View style={styles.overlay}>
//         <View style={globalStyles.labelContainer2}>
//           <Text style={styles.itemName}>
//             {item?.name ?? `No ${label} selected`}
//           </Text>
//           <Text style={styles.whyText}>Why this {label}?</Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );

//   const handleGenerate = () => {
//     regenerateOutfit();
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <View style={globalStyles.sectionTitle}>
//         <Text
//           style={[
//             globalStyles.header,
//             {color: theme.colors.primary, marginBottom: 20},
//           ]}>
//           Explore
//         </Text>

//         <View style={globalStyles.section}>
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             {/* Prompt input with mic */}
//             <View style={[globalStyles.promptRow, {marginBottom: 20}]}>
//               <TextInput
//                 placeholder="What are you dressing for?"
//                 placeholderTextColor={theme.colors.muted}
//                 style={globalStyles.promptInput}
//                 value={lastSpeech}
//                 onChangeText={setLastSpeech}
//               />
//               <TouchableOpacity onPress={handleVoiceStart}>
//                 <MaterialIcons name="keyboard-voice" size={24} color="white" />
//               </TouchableOpacity>
//             </View>

//             {/* Filter pills */}
//             <View style={styles.chipsRow}>
//               <TouchableOpacity
//                 style={globalStyles.pillFixedWidth}
//                 onPress={() =>
//                   setWeather(prev => (prev === 'hot' ? 'cold' : 'hot'))
//                 }>
//                 <Text style={globalStyles.pillTextFixedWidth}>
//                   Weather: {weather}
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={globalStyles.pillFixedWidth}
//                 onPress={() =>
//                   setOccasion(prev => (prev === 'Casual' ? 'Formal' : 'Casual'))
//                 }>
//                 <Text style={globalStyles.pillTextFixedWidth}>
//                   Occasion: {occasion}
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={globalStyles.pillFixedWidth}
//                 onPress={() =>
//                   setStyle(prev => (prev === 'modern' ? 'retro' : 'modern'))
//                 }>
//                 <Text style={globalStyles.pillTextFixedWidth}>
//                   Style: {style}
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <TouchableOpacity
//               style={[
//                 globalStyles.buttonPrimary,
//                 {width: 186, marginBottom: 20, marginTop: 8},
//               ]}
//               onPress={handleGenerate}>
//               <Text style={[globalStyles.buttonPrimaryText]}>
//                 Generate Outfit
//               </Text>
//             </TouchableOpacity>

//             {/* Suggested outfit */}
//             {renderCard('Top', outfit.top, 'top')}
//             {renderCard('Bottom', outfit.bottom, 'bottom')}
//             {renderCard('Shoes', outfit.shoes, 'shoes')}

//             {/* CTA row */}
//             <View style={styles.buttonRow}>
//               <TouchableOpacity
//                 style={[globalStyles.buttonPrimary, {width: 120}]}
//                 onPress={() => setFeedbackModalVisible(true)}>
//                 <Text style={globalStyles.buttonPrimaryText}>Rate Outfit</Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[globalStyles.buttonPrimary, {width: 120}]}
//                 onPress={() =>
//                   navigate('TryOnOverlay', {
//                     outfit,
//                     userPhotoUri: Image.resolveAssetSource(
//                       require('../assets/images/full-body-temp1.png'),
//                     ).uri,
//                   })
//                 }>
//                 <Text style={globalStyles.buttonPrimaryText}>Try On</Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[globalStyles.buttonPrimary, {width: 120}]}
//                 onPress={() => {
//                   if (outfit.top && outfit.bottom && outfit.shoes) {
//                     setPendingSaveOutfit({
//                       top: outfit.top,
//                       bottom: outfit.bottom,
//                       shoes: outfit.shoes,
//                     });
//                     setShowNameModal(true);
//                   }
//                 }}>
//                 <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//               </TouchableOpacity>
//             </View>
//           </ScrollView>

//           {/* Modals */}
//           <WhyPickedModal
//             visible={visibleModal === 'top'}
//             item={outfit.top}
//             reasons={reasons.top ?? []}
//             section="Top"
//             onClose={() => setVisibleModal(null)}
//           />
//           <WhyPickedModal
//             visible={visibleModal === 'bottom'}
//             item={outfit.bottom}
//             reasons={reasons.bottom ?? []}
//             section="Bottom"
//             onClose={() => setVisibleModal(null)}
//           />
//           <WhyPickedModal
//             visible={visibleModal === 'shoes'}
//             item={outfit.shoes}
//             reasons={reasons.shoes ?? []}
//             section="Shoes"
//             onClose={() => setVisibleModal(null)}
//           />
//           <OutfitFeedbackModal
//             visible={feedbackModalVisible}
//             onClose={() => setFeedbackModalVisible(false)}
//             feedbackData={feedbackData}
//             setFeedbackData={setFeedbackData}
//             toggleTag={toggleTag}
//             REASON_TAGS={REASON_TAGS}
//             theme={theme}
//           />
//           <OutfitNameModal
//             visible={showNameModal}
//             onClose={() => {
//               setShowNameModal(false);
//               setPendingSaveOutfit(null);
//             }}
//             onSave={async (name, date) => {
//               if (pendingSaveOutfit) {
//                 const savedOutfit = {
//                   id: Date.now().toString(),
//                   name,
//                   top: pendingSaveOutfit.top,
//                   bottom: pendingSaveOutfit.bottom,
//                   shoes: pendingSaveOutfit.shoes,
//                   createdAt: new Date().toISOString(),
//                   tags: feedbackData.tags,
//                   notes: feedbackData.reason,
//                   rating:
//                     feedbackData.feedback === 'like'
//                       ? 5
//                       : feedbackData.feedback === 'dislike'
//                       ? 2
//                       : undefined,
//                   favorited: true,
//                 };

//                 await saveFavoriteOutfit(savedOutfit);
//                 await saveOutfitToDate(date, savedOutfit);
//                 setShowNameModal(false);
//                 setPendingSaveOutfit(null);
//               }
//             }}
//           />
//         </View>
//       </View>
//     </View>
//   );
// }
