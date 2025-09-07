// apps/mobile/src/screens/OutfitSuggestionScreen.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
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
import {useUUID} from '../context/UUIDContext';
import {
  useOutfitApi,
  WardrobeItem,
  apiItemToUI,
  pickFirstByCategory,
} from '../hooks/useOutfitApi';

type Props = {navigate: (screen: string, params?: any) => void};

export default function OutfitSuggestionScreen({navigate}: Props) {
  // ──────────────────────────────────────────────────────────────
  // Theme + user identity (UUID) that scopes all API calls
  // ──────────────────────────────────────────────────────────────
  const userId = useUUID();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  // ──────────────────────────────────────────────────────────────
  // Local UI state
  // visibleModal: which "Why this item?" modal is open
  // lastSpeech: text captured from voice input (also used as freeform prompt)
  // weather/occasion/style: chip controls that feed the query builder
  // feedback modal + "save outfit" modal state
  // pendingSaveOutfit: snapshot of current cards to persist/favorite
  // feedbackData: payload collected from the feedback modal
  // ──────────────────────────────────────────────────────────────
  const [visibleModal, setVisibleModal] = useState<
    null | 'top' | 'bottom' | 'shoes'
  >(null);
  const [lastSpeech, setLastSpeech] = useState('');
  const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
    'Any',
  );
  const [occasion, setOccasion] = useState<string>('Any');
  const [style, setStyle] = useState<string>('Any');
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
    top: WardrobeItem;
    bottom: WardrobeItem;
    shoes: WardrobeItem;
  }>(null);

  const [feedbackData, setFeedbackData] = useState({
    feedback: null as 'like' | 'dislike' | null,
    tags: [] as string[],
    reason: '',
  });

  // Static list of tags a user can toggle in the feedback modal
  const REASON_TAGS = [
    'Too casual',
    'Too formal',
    'Wrong for weather',
    'Color mismatch',
    'Love this',
    'Would wear this',
  ];

  // ──────────────────────────────────────────────────────────────
  // Backend hook: `useOutfitApi`
  // - current: the latest suggested outfit (items[], why, missing)
  // - loading/error: request state
  // - regenerate(query): ask backend to build outfits for the userId + query
  // The backend re-ranks Pinecone results, consults an LLM, and returns a
  // trimmed outfit ready for the UI.
  // ──────────────────────────────────────────────────────────────
  const {current, loading, error, regenerate} = useOutfitApi(userId);

  // ──────────────────────────────────────────────────────────────
  // Voice input
  // - handleVoiceStart starts speech recognition
  // - onSpeechResults parses keywords -> maps into weather/occasion/style
  //   (fallback: we keep raw text in `lastSpeech` and feed it into the query)
  // ──────────────────────────────────────────────────────────────
  const handleVoiceStart = async () => {
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
    }
  };

  useEffect(() => {
    Voice.onSpeechResults = e => {
      const speech = e.value?.[0]?.toLowerCase() ?? '';
      setLastSpeech(speech);

      // very lightweight NLP: route a few words to the appropriate filter
      if (
        speech.includes('hot') ||
        speech.includes('cold') ||
        speech.includes('rainy')
      ) {
        setWeather(speech as 'hot' | 'cold' | 'rainy');
      } else if (
        speech.includes('casual') ||
        speech.includes('formal') ||
        speech.includes('business')
      ) {
        setOccasion(speech);
      } else {
        setStyle(speech);
      }
    };

    // Clean up listeners when leaving the screen
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Query builder
  // - Composes a natural language prompt from chips (weather/occasion/style)
  //   and any freeform/voice text the user entered.
  // - This string is sent to the backend so it can parse constraints and
  //   rank/select items accordingly.
  // ──────────────────────────────────────────────────────────────
  const builtQuery = useMemo(() => {
    const parts: string[] = [];
    if (occasion && occasion !== 'Any') parts.push(occasion);
    if (style && style !== 'Any') parts.push(style);
    if (weather && weather !== 'Any') parts.push(`${weather} weather`);
    if (lastSpeech.trim().length) parts.push(lastSpeech.trim());
    // a helpful default that nudges a nice baseline when nothing is selected
    return parts.join(' ').trim() || 'smart casual, balanced neutrals';
  }, [occasion, style, weather, lastSpeech]);

  // Fire a new backend generation using the current query
  const handleGenerate = () => {
    if (userId) regenerate(builtQuery);
  };

  // ──────────────────────────────────────────────────────────────
  // Extract the three “cards” from the returned outfit
  // - The backend returns a flat list of items; we map them to Top/Bottom/
  //   Shoes slots using helpers from `useOutfitApi`.
  // - If no Top is present, we allow Outerwear to stand in for it (visual card).
  // ──────────────────────────────────────────────────────────────
  const topApi =
    pickFirstByCategory(current?.items, 'Tops') ??
    pickFirstByCategory(current?.items, 'Outerwear');
  const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
  const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

  // `apiItemToUI` normalizes API shape to the UI’s WardrobeItem shape
  const top = apiItemToUI(topApi);
  const bottom = apiItemToUI(bottomApi);
  const shoes = apiItemToUI(shoesApi);

  // Same “why” rationale is shown on all three cards (compact UI)
  const reasons = {
    top: current?.why ? [current.why] : [],
    bottom: current?.why ? [current.why] : [],
    shoes: current?.why ? [current.why] : [],
  };

  // ──────────────────────────────────────────────────────────────
  // Styles (theme-aware)
  // ──────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
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
    scrollContent: {marginTop: 32, paddingBottom: 40, alignItems: 'center'},
    chipsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      width: '100%',
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
    cardImage: {width: '100%', height: '100%', resizeMode: 'cover'},
    overlay: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 10,
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
    itemName: {fontSize: 15, fontWeight: '600', color: 'white'},
    whyText: {fontSize: 13, color: '#4a90e2', marginTop: 2},
  });

  // ──────────────────────────────────────────────────────────────
  // Helper to render each of the three item cards (Top/Bottom/Shoes)
  // - Tapping opens the “Why Picked” modal for that section
  // - Badge in the top-left indicates the slot
  // - The translucent bottom overlay shows item name and a “Why?” hint
  // ──────────────────────────────────────────────────────────────
  const renderCard = (
    label: string,
    item: WardrobeItem | undefined,
    section: 'top' | 'bottom' | 'shoes',
  ) => (
    <TouchableOpacity
      onPress={() => setVisibleModal(section)}
      activeOpacity={0.9}
      style={[styles.cardOverlay, globalStyles.cardStyles3]}>
      <Image
        source={
          item?.image
            ? {uri: item.image}
            : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
        }
        style={styles.cardImage}
      />
      <View style={styles.categoryPill}>
        <Text
          style={[
            globalStyles.label,
            {paddingHorizontal: 6, paddingVertical: 4},
          ]}>
          {label}
        </Text>
      </View>
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

  // While the backend is building an outfit, show a centered spinner
  if (loading) {
    return (
      <View
        style={[
          globalStyles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{marginTop: 12, color: theme.colors.foreground}}>
          Styling your look…
        </Text>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Main render
  // - Header
  // - Prompt input (+ mic)
  // - Tuning controls (weather/occasion/style) + Generate button
  // - 3 suggestion cards from the current outfit
  // - CTA row: Rate / Try On / Save
  // - Optional “Missing” note if backend says a slot was unavailable
  // - Modals: WhyPicked (per slot), Feedback, Name+Save
  // ──────────────────────────────────────────────────────────────
  return (
    <View
      style={[
        globalStyles.container,
        globalStyles.screen,
        {backgroundColor: theme.colors.background, paddingBottom: 60},
      ]}>
      <View style={globalStyles.sectionTitle}>
        <Text
          style={[
            globalStyles.header,
            {color: theme.colors.primary, marginBottom: 20},
          ]}>
          Explore
        </Text>

        <View style={[globalStyles.section]}>
          <View style={globalStyles.centeredSection}>
            <ScrollView
              contentContainerStyle={{
                marginTop: 8,
                paddingBottom: 40,
                alignItems: 'center',
              }}>
              {/* Prompt input with mic (voice fills `lastSpeech`) */}
              <View style={[globalStyles.promptRow, {marginBottom: 12}]}>
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

              {/* Filter controls → feed the query builder */}
              <OutfitTuningControls
                weather={weather}
                occasion={occasion}
                style={style}
                onChangeWeather={v => setWeather(v as any)}
                onChangeOccasion={setOccasion}
                onChangeStyle={setStyle}
                onRegenerate={handleGenerate}
              />

              {/* Suggested outfit (3 cards) */}
              {renderCard('Top', top, 'top')}
              {renderCard('Bottom', bottom, 'bottom')}
              {renderCard('Shoes', shoes, 'shoes')}

              {/* CTA row: feedback / AR try-on / save to favorites + calendar */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 400,
                  alignSelf: 'center',
                  marginTop: 2,
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
                      outfit: {top, bottom, shoes},
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
                    if (top && bottom && shoes) {
                      setPendingSaveOutfit({top, bottom, shoes});
                      setShowNameModal(true);
                    }
                  }}>
                  <Text style={globalStyles.buttonPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>

              {/* Backend may declare a missing slot (e.g., "Brown loafers") */}
              {!!current?.missing && (
                <Text style={{marginTop: 12, color: theme.colors.muted}}>
                  Missing: {current.missing}
                </Text>
              )}
            </ScrollView>

            {/* Slot-specific “Why we picked this” modals */}
            <WhyPickedModal
              visible={visibleModal === 'top'}
              item={top}
              reasons={reasons.top}
              section="Top"
              onClose={() => setVisibleModal(null)}
            />
            <WhyPickedModal
              visible={visibleModal === 'bottom'}
              item={bottom}
              reasons={reasons.bottom}
              section="Bottom"
              onClose={() => setVisibleModal(null)}
            />
            <WhyPickedModal
              visible={visibleModal === 'shoes'}
              item={shoes}
              reasons={reasons.shoes}
              section="Shoes"
              onClose={() => setVisibleModal(null)}
            />

            {/* Feedback modal: records tags/reason/like-dislike */}
            <OutfitFeedbackModal
              visible={feedbackModalVisible}
              onClose={() => setFeedbackModalVisible(false)}
              feedbackData={feedbackData}
              setFeedbackData={setFeedbackData}
              toggleTag={(tag: string) =>
                setFeedbackData(prev => ({
                  ...prev,
                  tags: prev.tags.includes(tag)
                    ? prev.tags.filter(t => t !== tag)
                    : [...prev.tags, tag],
                }))
              }
              REASON_TAGS={REASON_TAGS}
              theme={theme}
            />

            {/* Save modal: asks for name + date; persists to favorites + calendar */}
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
                    // Map simple like/dislike to a coarse rating for now
                    rating:
                      feedbackData.feedback === 'like'
                        ? 5
                        : feedbackData.feedback === 'dislike'
                        ? 2
                        : undefined,
                    favorited: true,
                  };

                  // 1) Save locally as a favorite
                  await saveFavoriteOutfit(savedOutfit);
                  // 2) Optionally pin on a day in the user's calendar store
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

// // apps/mobile/src/screens/OutfitSuggestionScreen.tsx
// import React, {useState, useEffect, useMemo} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
//   ActivityIndicator,
// } from 'react-native';
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
// import {useUUID} from '../context/UUIDContext';
// import {
//   useOutfitApi,
//   WardrobeItem,
//   apiItemToUI,
//   pickFirstByCategory,
// } from '../hooks/useOutfitApi';

// type Props = {navigate: (screen: string, params?: any) => void};

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);
//   const [lastSpeech, setLastSpeech] = useState('');
//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'Any'>(
//     'Any',
//   );
//   const [occasion, setOccasion] = useState<string>('Any');
//   const [style, setStyle] = useState<string>('Any');

//   const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
//   const [showNameModal, setShowNameModal] = useState(false);
//   const [pendingSaveOutfit, setPendingSaveOutfit] = useState<null | {
//     top: WardrobeItem;
//     bottom: WardrobeItem;
//     shoes: WardrobeItem;
//   }>(null);

//   const [feedbackData, setFeedbackData] = useState({
//     feedback: null as 'like' | 'dislike' | null,
//     tags: [] as string[],
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

//   // 🔌 New backend hook
//   const {current, loading, error, regenerate} = useOutfitApi(userId);

//   // 🎤 voice → filters
//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };
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
//       } else if (
//         speech.includes('casual') ||
//         speech.includes('formal') ||
//         speech.includes('business')
//       ) {
//         setOccasion(speech);
//       } else {
//         setStyle(speech);
//       }
//     };
//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   // 🧠 Build a natural-language query for the API
//   const builtQuery = useMemo(() => {
//     const parts: string[] = [];
//     if (occasion && occasion !== 'Any') parts.push(occasion);
//     if (style && style !== 'Any') parts.push(style);
//     if (weather && weather !== 'Any') parts.push(`${weather} weather`);
//     if (lastSpeech.trim().length) parts.push(lastSpeech.trim());
//     return parts.join(' ').trim() || 'smart casual, balanced neutrals';
//   }, [occasion, style, weather, lastSpeech]);

//   const handleGenerate = () => {
//     if (userId) regenerate(builtQuery);
//   };

//   // 🧩 Pick items for the three cards from the current outfit
//   const topApi =
//     pickFirstByCategory(current?.items, 'Tops') ??
//     pickFirstByCategory(current?.items, 'Outerwear');
//   const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
//   const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

//   const top = apiItemToUI(topApi);
//   const bottom = apiItemToUI(bottomApi);
//   const shoes = apiItemToUI(shoesApi);

//   // 🧾 Reasons: reuse the outfit's "why" for each section
//   const reasons = {
//     top: current?.why ? [current.why] : [],
//     bottom: current?.why ? [current.why] : [],
//     shoes: current?.why ? [current.why] : [],
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
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
//     scrollContent: {marginTop: 32, paddingBottom: 40, alignItems: 'center'},
//     chipsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       width: '100%',
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
//     cardImage: {width: '100%', height: '100%', resizeMode: 'cover'},
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       paddingVertical: 10,
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
//     itemName: {fontSize: 15, fontWeight: '600', color: 'white'},
//     whyText: {fontSize: 13, color: '#4a90e2', marginTop: 2},
//   });

//   const renderCard = (
//     label: string,
//     item: WardrobeItem | undefined,
//     section: 'top' | 'bottom' | 'shoes',
//   ) => (
//     <TouchableOpacity
//       onPress={() => setVisibleModal(section)}
//       activeOpacity={0.9}
//       style={[styles.cardOverlay, globalStyles.cardStyles3]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View style={styles.categoryPill}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 6, paddingVertical: 4},
//           ]}>
//           {label}
//         </Text>
//       </View>
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

//   if (loading) {
//     return (
//       <View
//         style={[
//           globalStyles.container,
//           {justifyContent: 'center', alignItems: 'center'},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text style={{marginTop: 12, color: theme.colors.foreground}}>
//           Styling your look…
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         globalStyles.screen,
//         {backgroundColor: theme.colors.background, paddingBottom: 60},
//       ]}>
//       <View style={globalStyles.sectionTitle}>
//         <Text
//           style={[
//             globalStyles.header,
//             {color: theme.colors.primary, marginBottom: 20},
//           ]}>
//           Explore
//         </Text>

//         <View style={[globalStyles.section]}>
//           <View style={globalStyles.centeredSection}>
//             <ScrollView
//               contentContainerStyle={{
//                 marginTop: 8,
//                 paddingBottom: 40,
//                 alignItems: 'center',
//               }}>
//               {/* Prompt input with mic */}
//               <View style={[globalStyles.promptRow, {marginBottom: 12}]}>
//                 <TextInput
//                   placeholder="What are you dressing for?"
//                   placeholderTextColor={theme.colors.muted}
//                   style={globalStyles.promptInput}
//                   value={lastSpeech}
//                   onChangeText={setLastSpeech}
//                 />
//                 <TouchableOpacity onPress={handleVoiceStart}>
//                   <MaterialIcons
//                     name="keyboard-voice"
//                     size={24}
//                     color="white"
//                   />
//                 </TouchableOpacity>
//               </View>

//               {/* Filter controls (already built) */}
//               <OutfitTuningControls
//                 weather={weather}
//                 occasion={occasion}
//                 style={style}
//                 onChangeWeather={v => setWeather(v as any)}
//                 onChangeOccasion={setOccasion}
//                 onChangeStyle={setStyle}
//                 onRegenerate={handleGenerate}
//               />

//               {/* Suggested outfit (from API) */}
//               {renderCard('Top', top, 'top')}
//               {renderCard('Bottom', bottom, 'bottom')}
//               {renderCard('Shoes', shoes, 'shoes')}

//               {/* CTA row */}
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'space-between',
//                   alignItems: 'center',
//                   width: '100%',
//                   maxWidth: 400,
//                   alignSelf: 'center',
//                   marginTop: 2,
//                 }}>
//                 <TouchableOpacity
//                   style={[globalStyles.buttonPrimary, {width: 120}]}
//                   onPress={() => setFeedbackModalVisible(true)}>
//                   <Text style={globalStyles.buttonPrimaryText}>
//                     Rate Outfit
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={[globalStyles.buttonPrimary, {width: 120}]}
//                   onPress={() =>
//                     navigate('TryOnOverlay', {
//                       outfit: {top, bottom, shoes},
//                       userPhotoUri: Image.resolveAssetSource(
//                         require('../assets/images/full-body-temp1.png'),
//                       ).uri,
//                     })
//                   }>
//                   <Text style={globalStyles.buttonPrimaryText}>Try On</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={[globalStyles.buttonPrimary, {width: 120}]}
//                   onPress={() => {
//                     if (top && bottom && shoes) {
//                       setPendingSaveOutfit({top, bottom, shoes});
//                       setShowNameModal(true);
//                     }
//                   }}>
//                   <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//                 </TouchableOpacity>
//               </View>

//               {/* Missing note from API */}
//               {!!current?.missing && (
//                 <Text style={{marginTop: 12, color: theme.colors.muted}}>
//                   Missing: {current.missing}
//                 </Text>
//               )}
//             </ScrollView>

//             {/* Modals */}
//             <WhyPickedModal
//               visible={visibleModal === 'top'}
//               item={top}
//               reasons={reasons.top}
//               section="Top"
//               onClose={() => setVisibleModal(null)}
//             />
//             <WhyPickedModal
//               visible={visibleModal === 'bottom'}
//               item={bottom}
//               reasons={reasons.bottom}
//               section="Bottom"
//               onClose={() => setVisibleModal(null)}
//             />
//             <WhyPickedModal
//               visible={visibleModal === 'shoes'}
//               item={shoes}
//               reasons={reasons.shoes}
//               section="Shoes"
//               onClose={() => setVisibleModal(null)}
//             />
//             <OutfitFeedbackModal
//               visible={feedbackModalVisible}
//               onClose={() => setFeedbackModalVisible(false)}
//               feedbackData={feedbackData}
//               setFeedbackData={setFeedbackData}
//               toggleTag={(tag: string) =>
//                 setFeedbackData(prev => ({
//                   ...prev,
//                   tags: prev.tags.includes(tag)
//                     ? prev.tags.filter(t => t !== tag)
//                     : [...prev.tags, tag],
//                 }))
//               }
//               REASON_TAGS={REASON_TAGS}
//               theme={theme}
//             />
//             <OutfitNameModal
//               visible={showNameModal}
//               onClose={() => {
//                 setShowNameModal(false);
//                 setPendingSaveOutfit(null);
//               }}
//               onSave={async (name, date) => {
//                 if (pendingSaveOutfit) {
//                   const savedOutfit = {
//                     id: Date.now().toString(),
//                     name,
//                     top: pendingSaveOutfit.top,
//                     bottom: pendingSaveOutfit.bottom,
//                     shoes: pendingSaveOutfit.shoes,
//                     createdAt: new Date().toISOString(),
//                     tags: feedbackData.tags,
//                     notes: feedbackData.reason,
//                     rating:
//                       feedbackData.feedback === 'like'
//                         ? 5
//                         : feedbackData.feedback === 'dislike'
//                         ? 2
//                         : undefined,
//                     favorited: true,
//                   };
//                   await saveFavoriteOutfit(savedOutfit);
//                   await saveOutfitToDate(date, savedOutfit);
//                   setShowNameModal(false);
//                   setPendingSaveOutfit(null);
//                 }
//               }}
//             />
//           </View>
//         </View>
//       </View>
//     </View>
//   );
// }
