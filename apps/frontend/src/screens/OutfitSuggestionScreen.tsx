import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import {
  useOutfitApi,
  WardrobeItem,
  apiItemToUI,
  pickFirstByCategory,
} from '../hooks/useOutfitApi';
import {API_BASE_URL} from '../config/api';

// Auth & style profile
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';

// Handoff mailbox (singleton)
import {
  consumeHandoff,
  subscribeHandoff,
  type HandoffPayload,
} from '../utils/handoffMailbox';

// Weather utils
import {getCurrentLocation, fetchWeather} from '../utils/travelWeather';

type Props = {navigate: (screen: string, params?: any) => void};

type Weights = {
  constraintsWeight: number;
  styleWeight: number;
  weatherWeight: number;
};

const DEFAULT_WEIGHTS: Weights = {
  constraintsWeight: 1.0,
  styleWeight: 1.2,
  weatherWeight: 0.8,
};

const WEIGHTS_STORAGE_KEY = 'dev.weights';

export default function OutfitSuggestionScreen({navigate}: Props) {
  const userId = useUUID();
  const {user} = useAuth0();
  const {styleProfile} = useStyleProfile(user?.sub || '');
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  // generate a v4 session id (per call we also make one)
  const sid = uuid.v4() as string;

  // ──────────────────────────────────────────────────────────────
  // Local UI state
  // ──────────────────────────────────────────────────────────────
  const [visibleModal, setVisibleModal] = useState<
    null | 'top' | 'bottom' | 'shoes'
  >(null);
  const [lastSpeech, setLastSpeech] = useState('');

  // Weather + filters
  const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'auto'>(
    'auto',
  );
  const [occasion, setOccasion] = useState<string>('Any');
  const [style, setStyle] = useState<string>('Any');

  // Toggles
  const [useWeather, setUseWeather] = useState<boolean>(false);
  const [useStylePrefs, setUseStylePrefs] = useState<boolean>(true);
  const [useFeedback, setUseFeedback] = useState<boolean>(true);
  const [styleAgent, setStyleAgent] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [weights, setWeights] = useState<Weights>({...DEFAULT_WEIGHTS});

  // Live weather context when useWeather && weather==='auto'
  const [liveWeatherCtx, setLiveWeatherCtx] = useState<{
    tempF: number;
    precipitation?: 'none' | 'rain' | 'snow';
    windMph?: number;
    locationName?: string;
  } | null>(null);
  const [liveWxLoading, setLiveWxLoading] = useState(false);
  const [liveWxError, setLiveWxError] = useState<string | null>(null);

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

  const REASON_TAGS = [
    'Too casual',
    'Too formal',
    'Wrong for weather',
    'Color mismatch',
    'Love this',
    'Would wear this',
  ];

  // Backend hook
  const {current, loading, error, regenerate} = useOutfitApi(userId);

  // Voice input
  const handleVoiceStart = async () => {
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
    }
  };

  const getShoppingLink = (missing: string) =>
    `https://www.google.com/search?q=${encodeURIComponent(missing)}&tbm=shop`;

  // ──────────────────────────────────────────────────────────────
  // Handoff wiring — mailbox only (no emitters, no storage)
  // ──────────────────────────────────────────────────────────────
  const didAutoRunRef = useRef(false);
  const [pendingAuto, setPendingAuto] = useState(false);

  const applyHandoff = (payload?: HandoffPayload | null) => {
    if (!payload?.seedPrompt) return;
    setLastSpeech(prev =>
      prev?.trim()?.length ? prev : payload.seedPrompt.trim(),
    );
    if (payload.autogenerate) setPendingAuto(true);
  };

  useEffect(() => {
    console.log('👗 OutfitSuggestionScreen mounted');
    // pick up anything sent before mount
    const first = consumeHandoff();
    if (first) {
      console.log('⬅️ handoff (initial)', first);
      applyHandoff(first);
    }
    // and react to handoffs while mounted
    const unsub = subscribeHandoff(p => {
      console.log('⬅️ handoff (live)', p);
      applyHandoff(p);
    });
    return unsub;
  }, []);

  // Persist dev weights
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WEIGHTS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed === 'object' &&
            Number.isFinite(parsed.constraintsWeight) &&
            Number.isFinite(parsed.styleWeight) &&
            Number.isFinite(parsed.weatherWeight)
          ) {
            setWeights(parsed);
          }
        }
      } catch (e) {
        console.warn('weights load failed', e);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights)).catch(
      e => console.warn('weights save failed', e),
    );
  }, [weights]);

  // Voice → heuristics
  useEffect(() => {
    Voice.onSpeechResults = e => {
      const speech = e.value?.[0]?.toLowerCase() ?? '';
      setLastSpeech(speech);

      if (
        speech.includes('hot') ||
        speech.includes('cold') ||
        speech.includes('rainy')
      ) {
        setWeather(
          (speech.includes('hot')
            ? 'hot'
            : speech.includes('cold')
            ? 'cold'
            : 'rainy') as any,
        );
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
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Auto-run after handoff prompt lands
  useEffect(() => {
    if (!pendingAuto) return;
    if (didAutoRunRef.current) return;
    if (!lastSpeech.trim().length) return;
    didAutoRunRef.current = true;
    setPendingAuto(false);
    console.log('⚡ auto-generate from handoff:', lastSpeech);
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAuto, lastSpeech]);

  // ──────────────────────────────────────────────────────────────
  // Live weather fetch (useWeather && auto)
  // ──────────────────────────────────────────────────────────────
  function owmToPrecip(main: string): 'none' | 'rain' | 'snow' {
    const m = (main || '').toLowerCase();
    if (m.includes('snow')) return 'snow';
    if (
      m.includes('rain') ||
      m.includes('drizzle') ||
      m.includes('thunderstorm')
    )
      return 'rain';
    return 'none';
  }

  useEffect(() => {
    let cancelled = false;

    async function grab() {
      if (!useWeather || weather !== 'auto') {
        setLiveWeatherCtx(null);
        return;
      }

      try {
        setLiveWxLoading(true);
        setLiveWxError(null);

        const {lat, lon} = await getCurrentLocation();
        const wx = await fetchWeather(lat, lon); // returns { celsius, fahrenheit }

        const f = wx.fahrenheit;
        const tempF =
          typeof f?.main?.temp === 'number' ? f.main.temp : undefined;
        const windMph =
          typeof f?.wind?.speed === 'number' ? f.wind.speed : undefined;
        const precip =
          Array.isArray(f?.weather) && f.weather.length
            ? owmToPrecip(f.weather[0].main)
            : 'none';

        const ctx = {
          tempF: tempF ?? 68,
          precipitation: precip as 'none' | 'rain' | 'snow',
          windMph: windMph ?? 5,
          locationName: f?.name || 'Local',
        } as const;

        if (!cancelled) {
          setLiveWeatherCtx(ctx);
          console.log('🌡️ Live WeatherContext ready:', ctx);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.warn('⚠️ Live weather fetch failed:', e?.message || e);
          setLiveWeatherCtx(null);
          setLiveWxError(e?.message || 'Failed to fetch weather');
        }
      } finally {
        if (!cancelled) setLiveWxLoading(false);
      }
    }

    grab();
    return () => {
      cancelled = true;
    };
  }, [useWeather, weather]);

  // ──────────────────────────────────────────────────────────────
  // Query builder (prompt seasoning only)
  // ──────────────────────────────────────────────────────────────
  const builtQuery = useMemo(() => {
    const parts: string[] = [];
    if (occasion !== 'Any') parts.push(occasion);
    if (style !== 'Any') parts.push(style);
    if (useWeather && weather !== 'auto') parts.push(`${weather} weather`);
    if (lastSpeech.trim().length) parts.push(lastSpeech.trim());
    return parts.join(' ').trim() || 'smart casual, balanced neutrals';
  }, [occasion, style, weather, lastSpeech, useWeather]);

  const canGenerate = useMemo(() => lastSpeech.trim().length > 0, [lastSpeech]);

  const chipWeatherContext = useMemo(() => {
    switch (weather) {
      case 'hot':
        return {
          tempF: 85,
          precipitation: 'none' as const,
          windMph: 5,
          locationName: 'Local' as const,
        };
      case 'cold':
        return {
          tempF: 40,
          precipitation: 'none' as const,
          windMph: 10,
          locationName: 'Local' as const,
        };
      case 'rainy':
        return {
          tempF: 55,
          precipitation: 'rain' as const,
          windMph: 12,
          locationName: 'Local' as const,
        };
      default:
        return {
          tempF: 68,
          precipitation: 'none' as const,
          windMph: 5,
          locationName: 'Local' as const,
        };
    }
  }, [weather]);

  // ──────────────────────────────────────────────────────────────
  // Generate / Refine
  // ──────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!userId) return;
    if (!canGenerate) return;

    const sid = uuid.v4() as string;
    setSessionId(sid);

    const wxToSend = useWeather
      ? weather === 'auto'
        ? liveWeatherCtx ?? {
            tempF: 68,
            precipitation: 'none' as const,
            windMph: 5,
            locationName: 'Local' as const,
          }
        : chipWeatherContext
      : undefined;

    const useStyle = useStylePrefs && weights.styleWeight > 0;

    regenerate(builtQuery, {
      topK: 25,
      useWeather,
      sessionId: sid,
      weather: wxToSend,
      styleProfile: useStyle ? styleProfile : undefined,
      useStyle,
      // @ts-ignore
      weights,
      useFeedback,
      styleAgent,
    });
  };

  const handleRefine = (refinement: string) => {
    if (!userId || !sessionId) return;

    // ✅ Get currently displayed items
    const rawItems = Array.isArray((current as any)?.outfits?.[0]?.items)
      ? (current as any).outfits[0].items
      : Array.isArray((current as any)?.items)
      ? (current as any).items
      : [];

    const lockedIds = rawItems
      .map((it: any) => it?.id)
      .filter(
        (id: any): id is string => typeof id === 'string' && id.length > 0,
      );

    regenerate(builtQuery, {
      topK: 25,
      sessionId,
      refinementPrompt: refinement,
      useWeather,
      weather: useWeather ? chipWeatherContext : undefined,
      styleProfile: useStylePrefs ? styleProfile : undefined,
      useStyle: useStylePrefs,
      weights,
      useFeedback,
      styleAgent,
      lockedItemIds: lockedIds,
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Extract cards
  // ──────────────────────────────────────────────────────────────
  const topApi =
    pickFirstByCategory(current?.items, 'Tops') ??
    pickFirstByCategory(current?.items, 'Outerwear');
  const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
  const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

  const top = apiItemToUI(topApi);
  const bottom = apiItemToUI(bottomApi);
  const shoes = apiItemToUI(shoesApi);

  const hasOutfit = useMemo(() => {
    const o: any = current;
    const items = Array.isArray(o?.outfits?.[0]?.items)
      ? o.outfits[0].items
      : Array.isArray(o?.items)
      ? o.items
      : [];
    return Array.isArray(items) && items.length > 0;
  }, [current]);

  const reasons = {
    top: current?.why ? [current.why] : [],
    bottom: current?.why ? [current.why] : [],
    shoes: current?.why ? [current.why] : [],
  };

  // Extract IDs for feedback payload
  const requestId = (current as any)?.request_id ?? null;
  const topLevelOutfitId = (current as any)?.outfit_id ?? null;
  const activeOutfit =
    (current as any)?.outfits && Array.isArray((current as any)?.outfits)
      ? (current as any).outfits[0]
      : null;
  const outfitId = activeOutfit?.outfit_id ?? topLevelOutfitId ?? null;
  const outfitItemIds: string[] = (
    Array.isArray(activeOutfit?.items)
      ? activeOutfit.items
      : Array.isArray((current as any)?.items)
      ? (current as any).items
      : []
  )
    .map((it: any) => it?.id)
    .filter(Boolean);

  // Styles
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
    cardImage: {width: '100%', height: '100%', resizeMode: 'contain'},
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
      backgroundColor: theme.colors.surface3,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
    },
    itemName: {fontSize: 15, fontWeight: '600', color: theme.colors.foreground},
    whyText: {fontSize: 13, color: '#4a90e2', marginTop: 2},
  });

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

  // Loading
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

  return (
    <View
      style={[
        globalStyles.container,
        globalStyles.screen,
        {backgroundColor: theme.colors.background, paddingBottom: 60},
      ]}>
      <View className="sectionTitle">
        <Text
          style={[
            globalStyles.header,
            {color: theme.colors.foreground, marginBottom: 20},
          ]}>
          Style Me
        </Text>

        {/* Header */}
        <View
          style={{
            justifyContent: 'center',
            paddingHorizontal: 50,
            marginBottom: 4,
          }}>
          <Animatable.Text
            animation="fadeInUp"
            duration={800}
            easing="ease-out-cubic"
            delay={150}
            style={{
              textAlign: 'center',
              fontSize: 16,
              color: theme.colors.foreground,
              fontWeight: '500',
            }}>
            "Let's create an outfit! - Just tell me what you want and press
            Create Outfit"
          </Animatable.Text>
        </View>

        <View style={[globalStyles.section]}>
          <View style={globalStyles.centeredSection}>
            <ScrollView
              contentContainerStyle={{
                marginTop: 8,
                paddingBottom: 40,
                alignItems: 'center',
              }}>
              {/* Prompt input with mic */}
              <View
                style={[
                  globalStyles.promptRow,
                  {
                    height: 45,
                    marginBottom: 12,
                    paddingHorizontal: 14,
                    borderWidth: tokens.borderWidth.xl,
                    borderColor: theme.colors.surfaceBorder,
                    backgroundColor: theme.colors.surface3,
                    borderRadius: 20,
                  },
                ]}>
                <TextInput
                  placeholder="What kind of an outfit are you looking for?"
                  placeholderTextColor={theme.colors.muted}
                  style={[
                    globalStyles.promptInput,
                    {color: theme.colors.foreground},
                  ]}
                  value={lastSpeech}
                  onChangeText={setLastSpeech}
                />
                <TouchableOpacity onPress={handleVoiceStart}>
                  <MaterialIcons
                    name="keyboard-voice"
                    size={22}
                    color={theme.colors.foreground}
                    style={{marginRight: 30}}
                  />
                </TouchableOpacity>
              </View>

              {/* Controls */}
              <OutfitTuningControls
                weather={weather}
                occasion={occasion}
                style={style}
                onChangeWeather={v => setWeather(v as any)}
                onChangeOccasion={setOccasion}
                onChangeStyle={setStyle}
                useWeather={useWeather}
                onToggleWeather={setUseWeather}
                useStylePrefs={useStylePrefs}
                onToggleStylePrefs={setUseStylePrefs}
                useFeedback={useFeedback}
                onToggleFeedback={setUseFeedback}
                styleAgent={styleAgent}
                onChangeStyleAgent={setStyleAgent}
                weights={weights}
                onChangeWeights={setWeights}
                onRegenerate={handleGenerate}
                onRefine={handleRefine}
                isGenerating={loading || liveWxLoading}
                canGenerate={canGenerate}
                showRefine={hasOutfit}
              />

              {/* Live weather note */}
              {useWeather && weather === 'auto' && (
                <Text
                  style={{
                    marginBottom: 8,
                    color: liveWxError ? '#f66' : theme.colors.muted,
                  }}>
                  {liveWxError
                    ? `Weather unavailable (${liveWxError}) — using neutral defaults`
                    : liveWeatherCtx
                    ? `Using local weather: ${Math.round(
                        liveWeatherCtx.tempF,
                      )}°F · ${liveWeatherCtx.precipitation} · wind ${
                        liveWeatherCtx.windMph ?? 0
                      } mph`
                    : 'Fetching local weather…'}
                </Text>
              )}

              {/* Outfit cards */}
              {hasOutfit && (
                <>
                  {renderCard('Top', top, 'top')}
                  {renderCard('Bottom', bottom, 'bottom')}
                  {renderCard('Shoes', shoes, 'shoes')}

                  {/* CTAs */}
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
                </>
              )}

              {!!current?.missing && hasOutfit && (
                <View
                  style={{
                    marginTop: 24,
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: theme.colors.surface,
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 400,
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowOffset: {width: 0, height: 2},
                    shadowRadius: 8,
                    elevation: 4,
                  }}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: '700',
                      fontSize: 16,
                      marginBottom: 4,
                    }}>
                    ⚠️ Missing Item
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.foreground,
                      fontSize: 15,
                      textAlign: 'center',
                      marginBottom: 12,
                    }}>
                    {current.missing}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      const url = getShoppingLink(current.missing!);
                      Linking.openURL(url);
                    }}
                    activeOpacity={0.9}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.button1,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      width: '100%',
                    }}>
                    <MaterialIcons
                      name="shopping-cart"
                      size={18}
                      color="#fff"
                      style={{marginRight: 6}}
                    />
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: '600',
                        fontSize: 15,
                      }}>
                      Find Online
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Modals */}
            {hasOutfit && (
              <>
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
              </>
            )}

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
              apiBaseUrl={API_BASE_URL}
              userId={userId}
              requestId={requestId}
              outfitId={outfitId}
              outfitItemIds={outfitItemIds}
            />

            <OutfitNameModal
              visible={showNameModal}
              onClose={() => {
                setShowNameModal(false);
                setPendingSaveOutfit(null);
              }}
              onSave={async (name, date) => {
                if (pendingSaveOutfit && userId) {
                  try {
                    const response = await fetch(
                      `${API_BASE_URL}/custom-outfits`,
                      {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                          user_id: userId,
                          name,
                          top_id: pendingSaveOutfit.top?.id ?? null,
                          bottom_id: pendingSaveOutfit.bottom?.id ?? null,
                          shoes_id: pendingSaveOutfit.shoes?.id ?? null,
                          accessory_ids: [],
                          metadata: {
                            tags: feedbackData.tags,
                            favorited: true,
                          },
                          notes: feedbackData.reason,
                          rating:
                            feedbackData.feedback === 'like'
                              ? 5
                              : feedbackData.feedback === 'dislike'
                              ? 2
                              : null,
                        }),
                      },
                    );
                    if (!response.ok) {
                      throw new Error(
                        `Failed to save outfit: ${response.status}`,
                      );
                    }
                    const result = await response.json();
                    console.log('✅ Outfit saved:', result);
                  } catch (err) {
                    console.error('❌ Error saving outfit:', err);
                  } finally {
                    setShowNameModal(false);
                    setPendingSaveOutfit(null);
                  }
                }
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/////////////////

// import React, {useState, useEffect, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   TextInput,
//   ActivityIndicator,
//   Linking,
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
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import uuid from 'react-native-uuid';
// import {
//   useOutfitApi,
//   WardrobeItem,
//   apiItemToUI,
//   pickFirstByCategory,
// } from '../hooks/useOutfitApi';
// import {API_BASE_URL} from '../config/api';

// // Auth & style profile
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// // Handoff mailbox (singleton)
// import {
//   consumeHandoff,
//   subscribeHandoff,
//   type HandoffPayload,
// } from '../utils/handoffMailbox';

// // Weather utils
// import {getCurrentLocation, fetchWeather} from '../utils/travelWeather';

// type Props = {navigate: (screen: string, params?: any) => void};

// type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// const DEFAULT_WEIGHTS: Weights = {
//   constraintsWeight: 1.0,
//   styleWeight: 1.2,
//   weatherWeight: 0.8,
// };

// const WEIGHTS_STORAGE_KEY = 'dev.weights';

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const {styleProfile} = useStyleProfile(user?.sub || '');
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // generate a v4 session id (per call we also make one)
//   const sid = uuid.v4() as string;

//   // ──────────────────────────────────────────────────────────────
//   // Local UI state
//   // ──────────────────────────────────────────────────────────────
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);
//   const [lastSpeech, setLastSpeech] = useState('');

//   // Weather + filters
//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'auto'>(
//     'auto',
//   );
//   const [occasion, setOccasion] = useState<string>('Any');
//   const [style, setStyle] = useState<string>('Any');

//   // Toggles
//   const [useWeather, setUseWeather] = useState<boolean>(false);
//   const [useStylePrefs, setUseStylePrefs] = useState<boolean>(true);
//   const [useFeedback, setUseFeedback] = useState<boolean>(true);
//   const [styleAgent, setStyleAgent] = useState<string | null>(null);

//   const [sessionId, setSessionId] = useState<string | null>(null);
//   const [weights, setWeights] = useState<Weights>({...DEFAULT_WEIGHTS});

//   // Live weather context when useWeather && weather==='auto'
//   const [liveWeatherCtx, setLiveWeatherCtx] = useState<{
//     tempF: number;
//     precipitation?: 'none' | 'rain' | 'snow';
//     windMph?: number;
//     locationName?: string;
//   } | null>(null);
//   const [liveWxLoading, setLiveWxLoading] = useState(false);
//   const [liveWxError, setLiveWxError] = useState<string | null>(null);

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

//   // Backend hook
//   const {current, loading, error, regenerate} = useOutfitApi(userId);

//   // Voice input
//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

//   const getShoppingLink = (missing: string) =>
//     `https://www.google.com/search?q=${encodeURIComponent(missing)}&tbm=shop`;

//   // ──────────────────────────────────────────────────────────────
//   // Handoff wiring — mailbox only (no emitters, no storage)
//   // ──────────────────────────────────────────────────────────────
//   const didAutoRunRef = useRef(false);
//   const [pendingAuto, setPendingAuto] = useState(false);

//   const applyHandoff = (payload?: HandoffPayload | null) => {
//     if (!payload?.seedPrompt) return;
//     setLastSpeech(prev =>
//       prev?.trim()?.length ? prev : payload.seedPrompt.trim(),
//     );
//     if (payload.autogenerate) setPendingAuto(true);
//   };

//   useEffect(() => {
//     console.log('👗 OutfitSuggestionScreen mounted');
//     // pick up anything sent before mount
//     const first = consumeHandoff();
//     if (first) {
//       console.log('⬅️ handoff (initial)', first);
//       applyHandoff(first);
//     }
//     // and react to handoffs while mounted
//     const unsub = subscribeHandoff(p => {
//       console.log('⬅️ handoff (live)', p);
//       applyHandoff(p);
//     });
//     return unsub;
//   }, []);

//   // Persist dev weights
//   useEffect(() => {
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(WEIGHTS_STORAGE_KEY);
//         if (raw) {
//           const parsed = JSON.parse(raw);
//           if (
//             parsed &&
//             typeof parsed === 'object' &&
//             Number.isFinite(parsed.constraintsWeight) &&
//             Number.isFinite(parsed.styleWeight) &&
//             Number.isFinite(parsed.weatherWeight)
//           ) {
//             setWeights(parsed);
//           }
//         }
//       } catch (e) {
//         console.warn('weights load failed', e);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     AsyncStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights)).catch(
//       e => console.warn('weights save failed', e),
//     );
//   }, [weights]);

//   // Voice → heuristics
//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const speech = e.value?.[0]?.toLowerCase() ?? '';
//       setLastSpeech(speech);

//       if (
//         speech.includes('hot') ||
//         speech.includes('cold') ||
//         speech.includes('rainy')
//       ) {
//         setWeather(
//           (speech.includes('hot')
//             ? 'hot'
//             : speech.includes('cold')
//             ? 'cold'
//             : 'rainy') as any,
//         );
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

//   // Auto-run after handoff prompt lands
//   useEffect(() => {
//     if (!pendingAuto) return;
//     if (didAutoRunRef.current) return;
//     if (!lastSpeech.trim().length) return;
//     didAutoRunRef.current = true;
//     setPendingAuto(false);
//     console.log('⚡ auto-generate from handoff:', lastSpeech);
//     handleGenerate();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [pendingAuto, lastSpeech]);

//   // ──────────────────────────────────────────────────────────────
//   // Live weather fetch (useWeather && auto)
//   // ──────────────────────────────────────────────────────────────
//   function owmToPrecip(main: string): 'none' | 'rain' | 'snow' {
//     const m = (main || '').toLowerCase();
//     if (m.includes('snow')) return 'snow';
//     if (
//       m.includes('rain') ||
//       m.includes('drizzle') ||
//       m.includes('thunderstorm')
//     )
//       return 'rain';
//     return 'none';
//   }

//   useEffect(() => {
//     let cancelled = false;

//     async function grab() {
//       if (!useWeather || weather !== 'auto') {
//         setLiveWeatherCtx(null);
//         return;
//       }

//       try {
//         setLiveWxLoading(true);
//         setLiveWxError(null);

//         const {lat, lon} = await getCurrentLocation();
//         const wx = await fetchWeather(lat, lon); // returns { celsius, fahrenheit }

//         const f = wx.fahrenheit;
//         const tempF =
//           typeof f?.main?.temp === 'number' ? f.main.temp : undefined;
//         const windMph =
//           typeof f?.wind?.speed === 'number' ? f.wind.speed : undefined;
//         const precip =
//           Array.isArray(f?.weather) && f.weather.length
//             ? owmToPrecip(f.weather[0].main)
//             : 'none';

//         const ctx = {
//           tempF: tempF ?? 68,
//           precipitation: precip as 'none' | 'rain' | 'snow',
//           windMph: windMph ?? 5,
//           locationName: f?.name || 'Local',
//         } as const;

//         if (!cancelled) {
//           setLiveWeatherCtx(ctx);
//           console.log('🌡️ Live WeatherContext ready:', ctx);
//         }
//       } catch (e: any) {
//         if (!cancelled) {
//           console.warn('⚠️ Live weather fetch failed:', e?.message || e);
//           setLiveWeatherCtx(null);
//           setLiveWxError(e?.message || 'Failed to fetch weather');
//         }
//       } finally {
//         if (!cancelled) setLiveWxLoading(false);
//       }
//     }

//     grab();
//     return () => {
//       cancelled = true;
//     };
//   }, [useWeather, weather]);

//   // ──────────────────────────────────────────────────────────────
//   // Query builder (prompt seasoning only)
//   // ──────────────────────────────────────────────────────────────
//   const builtQuery = useMemo(() => {
//     const parts: string[] = [];
//     if (occasion !== 'Any') parts.push(occasion);
//     if (style !== 'Any') parts.push(style);
//     if (useWeather && weather !== 'auto') parts.push(`${weather} weather`);
//     if (lastSpeech.trim().length) parts.push(lastSpeech.trim());
//     return parts.join(' ').trim() || 'smart casual, balanced neutrals';
//   }, [occasion, style, weather, lastSpeech, useWeather]);

//   const canGenerate = useMemo(() => lastSpeech.trim().length > 0, [lastSpeech]);

//   const chipWeatherContext = useMemo(() => {
//     switch (weather) {
//       case 'hot':
//         return {
//           tempF: 85,
//           precipitation: 'none' as const,
//           windMph: 5,
//           locationName: 'Local' as const,
//         };
//       case 'cold':
//         return {
//           tempF: 40,
//           precipitation: 'none' as const,
//           windMph: 10,
//           locationName: 'Local' as const,
//         };
//       case 'rainy':
//         return {
//           tempF: 55,
//           precipitation: 'rain' as const,
//           windMph: 12,
//           locationName: 'Local' as const,
//         };
//       default:
//         return {
//           tempF: 68,
//           precipitation: 'none' as const,
//           windMph: 5,
//           locationName: 'Local' as const,
//         };
//     }
//   }, [weather]);

//   // ──────────────────────────────────────────────────────────────
//   // Generate / Refine
//   // ──────────────────────────────────────────────────────────────
//   const handleGenerate = () => {
//     if (!userId) return;
//     if (!canGenerate) return;

//     const sid = uuid.v4() as string;
//     setSessionId(sid);

//     const wxToSend = useWeather
//       ? weather === 'auto'
//         ? liveWeatherCtx ?? {
//             tempF: 68,
//             precipitation: 'none' as const,
//             windMph: 5,
//             locationName: 'Local' as const,
//           }
//         : chipWeatherContext
//       : undefined;

//     const useStyle = useStylePrefs && weights.styleWeight > 0;

//     regenerate(builtQuery, {
//       topK: 25,
//       useWeather,
//       sessionId: sid,
//       weather: wxToSend,
//       styleProfile: useStyle ? styleProfile : undefined,
//       useStyle,
//       // @ts-ignore
//       weights,
//       useFeedback,
//       styleAgent,
//     });
//   };

//   const handleRefine = (refinement: string) => {
//     if (!userId || !sessionId) return;

//     // ✅ Get currently displayed items
//     const rawItems = Array.isArray((current as any)?.outfits?.[0]?.items)
//       ? (current as any).outfits[0].items
//       : Array.isArray((current as any)?.items)
//       ? (current as any).items
//       : [];

//     const lockedIds = rawItems
//       .map((it: any) => it?.id)
//       .filter(
//         (id: any): id is string => typeof id === 'string' && id.length > 0,
//       );

//     regenerate(builtQuery, {
//       topK: 25,
//       sessionId,
//       refinementPrompt: refinement,
//       useWeather,
//       weather: useWeather ? chipWeatherContext : undefined,
//       styleProfile: useStylePrefs ? styleProfile : undefined,
//       useStyle: useStylePrefs,
//       weights,
//       useFeedback,
//       styleAgent,
//       lockedItemIds: lockedIds,
//     });
//   };

//   // ──────────────────────────────────────────────────────────────
//   // Extract cards
//   // ──────────────────────────────────────────────────────────────
//   const topApi =
//     pickFirstByCategory(current?.items, 'Tops') ??
//     pickFirstByCategory(current?.items, 'Outerwear');
//   const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
//   const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

//   const top = apiItemToUI(topApi);
//   const bottom = apiItemToUI(bottomApi);
//   const shoes = apiItemToUI(shoesApi);

//   const hasOutfit = useMemo(() => {
//     const o: any = current;
//     const items = Array.isArray(o?.outfits?.[0]?.items)
//       ? o.outfits[0].items
//       : Array.isArray(o?.items)
//       ? o.items
//       : [];
//     return Array.isArray(items) && items.length > 0;
//   }, [current]);

//   const reasons = {
//     top: current?.why ? [current.why] : [],
//     bottom: current?.why ? [current.why] : [],
//     shoes: current?.why ? [current.why] : [],
//   };

//   // Extract IDs for feedback payload
//   const requestId = (current as any)?.request_id ?? null;
//   const topLevelOutfitId = (current as any)?.outfit_id ?? null;
//   const activeOutfit =
//     (current as any)?.outfits && Array.isArray((current as any)?.outfits)
//       ? (current as any).outfits[0]
//       : null;
//   const outfitId = activeOutfit?.outfit_id ?? topLevelOutfitId ?? null;
//   const outfitItemIds: string[] = (
//     Array.isArray(activeOutfit?.items)
//       ? activeOutfit.items
//       : Array.isArray((current as any)?.items)
//       ? (current as any).items
//       : []
//   )
//     .map((it: any) => it?.id)
//     .filter(Boolean);

//   // Styles
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
//     cardImage: {width: '100%', height: '100%', resizeMode: 'contain'},
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
//       backgroundColor: theme.colors.surface3,
//       paddingVertical: 4,
//       paddingHorizontal: 10,
//       borderRadius: 999,
//     },
//     itemName: {fontSize: 15, fontWeight: '600', color: theme.colors.foreground},
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

//   // Loading
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
//       <View className="sectionTitle">
//         <Text
//           style={[
//             globalStyles.header,
//             {color: theme.colors.foreground, marginBottom: 20},
//           ]}>
//           Style Me
//         </Text>

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: 50,
//             marginBottom: 4,
//           }}>
//           <Text
//             style={{
//               textAlign: 'center',
//               fontSize: 16,
//               color: theme.colors.foreground,
//               fontWeight: '500',
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Text>
//         </View>

//         <View style={[globalStyles.section]}>
//           <View style={globalStyles.centeredSection}>
//             <ScrollView
//               contentContainerStyle={{
//                 marginTop: 8,
//                 paddingBottom: 40,
//                 alignItems: 'center',
//               }}>
//               {/* Prompt input with mic */}
//               <View
//                 style={[
//                   globalStyles.promptRow,
//                   {
//                     height: 45,
//                     marginBottom: 12,
//                     paddingHorizontal: 14,
//                     borderWidth: tokens.borderWidth.xl,
//                     borderColor: theme.colors.surfaceBorder,
//                     backgroundColor: theme.colors.surface3,
//                     borderRadius: 20,
//                   },
//                 ]}>
//                 <TextInput
//                   placeholder="What kind of an outfit are you looking for?"
//                   placeholderTextColor={theme.colors.muted}
//                   style={[
//                     globalStyles.promptInput,
//                     {color: theme.colors.foreground},
//                   ]}
//                   value={lastSpeech}
//                   onChangeText={setLastSpeech}
//                 />
//                 <TouchableOpacity onPress={handleVoiceStart}>
//                   <MaterialIcons
//                     name="keyboard-voice"
//                     size={22}
//                     color={theme.colors.foreground}
//                     style={{marginRight: 30}}
//                   />
//                 </TouchableOpacity>
//               </View>

//               {/* Controls */}
//               <OutfitTuningControls
//                 weather={weather}
//                 occasion={occasion}
//                 style={style}
//                 onChangeWeather={v => setWeather(v as any)}
//                 onChangeOccasion={setOccasion}
//                 onChangeStyle={setStyle}
//                 useWeather={useWeather}
//                 onToggleWeather={setUseWeather}
//                 useStylePrefs={useStylePrefs}
//                 onToggleStylePrefs={setUseStylePrefs}
//                 useFeedback={useFeedback}
//                 onToggleFeedback={setUseFeedback}
//                 styleAgent={styleAgent}
//                 onChangeStyleAgent={setStyleAgent}
//                 weights={weights}
//                 onChangeWeights={setWeights}
//                 onRegenerate={handleGenerate}
//                 onRefine={handleRefine}
//                 isGenerating={loading || liveWxLoading}
//                 canGenerate={canGenerate}
//                 showRefine={hasOutfit}
//               />

//               {/* Live weather note */}
//               {useWeather && weather === 'auto' && (
//                 <Text
//                   style={{
//                     marginBottom: 8,
//                     color: liveWxError ? '#f66' : theme.colors.muted,
//                   }}>
//                   {liveWxError
//                     ? `Weather unavailable (${liveWxError}) — using neutral defaults`
//                     : liveWeatherCtx
//                     ? `Using local weather: ${Math.round(
//                         liveWeatherCtx.tempF,
//                       )}°F · ${liveWeatherCtx.precipitation} · wind ${
//                         liveWeatherCtx.windMph ?? 0
//                       } mph`
//                     : 'Fetching local weather…'}
//                 </Text>
//               )}

//               {/* Outfit cards */}
//               {hasOutfit && (
//                 <>
//                   {renderCard('Top', top, 'top')}
//                   {renderCard('Bottom', bottom, 'bottom')}
//                   {renderCard('Shoes', shoes, 'shoes')}

//                   {/* CTAs */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       justifyContent: 'space-between',
//                       alignItems: 'center',
//                       width: '100%',
//                       maxWidth: 400,
//                       alignSelf: 'center',
//                       marginTop: 2,
//                     }}>
//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => setFeedbackModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         Rate Outfit
//                       </Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() =>
//                         navigate('TryOnOverlay', {
//                           outfit: {top, bottom, shoes},
//                           userPhotoUri: Image.resolveAssetSource(
//                             require('../assets/images/full-body-temp1.png'),
//                           ).uri,
//                         })
//                       }>
//                       <Text style={globalStyles.buttonPrimaryText}>Try On</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => {
//                         if (top && bottom && shoes) {
//                           setPendingSaveOutfit({top, bottom, shoes});
//                           setShowNameModal(true);
//                         }
//                       }}>
//                       <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </>
//               )}

//               {!!current?.missing && hasOutfit && (
//                 <View
//                   style={{
//                     marginTop: 24,
//                     padding: 16,
//                     borderRadius: 16,
//                     backgroundColor: theme.colors.surface,
//                     alignItems: 'center',
//                     width: '100%',
//                     maxWidth: 400,
//                     shadowColor: '#000',
//                     shadowOpacity: 0.1,
//                     shadowOffset: {width: 0, height: 2},
//                     shadowRadius: 8,
//                     elevation: 4,
//                   }}>
//                   <Text
//                     style={{
//                       color: theme.colors.primary,
//                       fontWeight: '700',
//                       fontSize: 16,
//                       marginBottom: 4,
//                     }}>
//                     ⚠️ Missing Item
//                   </Text>

//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 15,
//                       textAlign: 'center',
//                       marginBottom: 12,
//                     }}>
//                     {current.missing}
//                   </Text>

//                   <TouchableOpacity
//                     onPress={() => {
//                       const url = getShoppingLink(current.missing!);
//                       Linking.openURL(url);
//                     }}
//                     activeOpacity={0.9}
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       backgroundColor: theme.colors.button1,
//                       paddingVertical: 12,
//                       paddingHorizontal: 20,
//                       borderRadius: 12,
//                       width: '100%',
//                     }}>
//                     <MaterialIcons
//                       name="shopping-cart"
//                       size={18}
//                       color="#fff"
//                       style={{marginRight: 6}}
//                     />
//                     <Text
//                       style={{
//                         color: theme.colors.primary,
//                         fontWeight: '600',
//                         fontSize: 15,
//                       }}>
//                       Find Online
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
//             </ScrollView>

//             {/* Modals */}
//             {hasOutfit && (
//               <>
//                 <WhyPickedModal
//                   visible={visibleModal === 'top'}
//                   item={top}
//                   reasons={reasons.top}
//                   section="Top"
//                   onClose={() => setVisibleModal(null)}
//                 />
//                 <WhyPickedModal
//                   visible={visibleModal === 'bottom'}
//                   item={bottom}
//                   reasons={reasons.bottom}
//                   section="Bottom"
//                   onClose={() => setVisibleModal(null)}
//                 />
//                 <WhyPickedModal
//                   visible={visibleModal === 'shoes'}
//                   item={shoes}
//                   reasons={reasons.shoes}
//                   section="Shoes"
//                   onClose={() => setVisibleModal(null)}
//                 />
//               </>
//             )}

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
//               apiBaseUrl={API_BASE_URL}
//               userId={userId}
//               requestId={requestId}
//               outfitId={outfitId}
//               outfitItemIds={outfitItemIds}
//             />

//             <OutfitNameModal
//               visible={showNameModal}
//               onClose={() => {
//                 setShowNameModal(false);
//                 setPendingSaveOutfit(null);
//               }}
//               onSave={async (name, date) => {
//                 if (pendingSaveOutfit && userId) {
//                   try {
//                     const response = await fetch(
//                       `${API_BASE_URL}/custom-outfits`,
//                       {
//                         method: 'POST',
//                         headers: {'Content-Type': 'application/json'},
//                         body: JSON.stringify({
//                           user_id: userId,
//                           name,
//                           top_id: pendingSaveOutfit.top?.id ?? null,
//                           bottom_id: pendingSaveOutfit.bottom?.id ?? null,
//                           shoes_id: pendingSaveOutfit.shoes?.id ?? null,
//                           accessory_ids: [],
//                           metadata: {
//                             tags: feedbackData.tags,
//                             favorited: true,
//                           },
//                           notes: feedbackData.reason,
//                           rating:
//                             feedbackData.feedback === 'like'
//                               ? 5
//                               : feedbackData.feedback === 'dislike'
//                               ? 2
//                               : null,
//                         }),
//                       },
//                     );
//                     if (!response.ok) {
//                       throw new Error(
//                         `Failed to save outfit: ${response.status}`,
//                       );
//                     }
//                     const result = await response.json();
//                     console.log('✅ Outfit saved:', result);
//                   } catch (err) {
//                     console.error('❌ Error saving outfit:', err);
//                   } finally {
//                     setShowNameModal(false);
//                     setPendingSaveOutfit(null);
//                   }
//                 }
//               }}
//             />
//           </View>
//         </View>
//       </View>
//     </View>
//   );
// }
