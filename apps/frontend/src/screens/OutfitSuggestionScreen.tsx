// OutfitSuggestionScreen.tsx
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useOutfitApi,
  WardrobeItem,
  apiItemToUI,
  pickFirstByCategory,
} from '../hooks/useOutfitApi';
import {Platform} from 'react-native';

// ⬇️ NEW: bring in auth id + style profile
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';

// Reuse weather utils
import {getCurrentLocation, fetchWeather} from '../utils/travelWeather';

type Props = {navigate: (screen: string, params?: any) => void};

// local type to match backend weights shape (no import needed)
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

const FEEDBACK_ENDPOINT = `${
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001'
}/api/feedback/rate`;

const WEIGHTS_STORAGE_KEY = 'dev.weights';

// ===== NEW: tiny per-user feedback signals (stored locally) =====
const PREFS_STORE_KEY = 'outfit_prefs_v1';
const FEEDBACK_LOGS_KEY = 'outfit_feedback_logs_v2';

// ---------- FEEDBACK ENDPOINT (uses whatever you already expose) ----------
const API_BASE = Platform.select({
  ios: 'http://localhost:3001/api',
  android: 'http://10.0.2.2:3001/api', // Android emulator loopback
  default: 'http://localhost:3001/api',
});

// Build a stable outfit_id from the 3 item ids your screen is showing
function buildOutfitId(
  top?: WardrobeItem,
  bottom?: WardrobeItem,
  shoes?: WardrobeItem,
) {
  const t = top?.id ?? '';
  const b = bottom?.id ?? '';
  const s = shoes?.id ?? '';
  return `${t}:${b}:${s}`;
}

type FeedbackSignals = {
  itemBoosts: Record<string, number>; // item_id → +/- count
  subcategoryBoosts: Record<string, number>; // subcategory/mainCategory → +/- count
  colorBoosts: Record<string, number>; // color or color_family → +/- count
  tagPenalties: Record<string, number>; // canonical tag key → penalty count
};

type FeedbackEntry = {
  timestamp: number;
  userId: string;
  requestId: string;
  query: string;
  rating: 1 | -1; // +1 like, -1 dislike
  tags: string[];
  reason?: string;
  selectedItemIds: {top?: string; bottom?: string; shoes?: string};
  weights: Weights;
  useWeather: boolean;
  weather?: {
    tempF: number;
    precipitation?: 'none' | 'rain' | 'snow';
    windMph?: number;
    locationName?: string;
  };
  useStyle: boolean;
};

async function loadSignals(): Promise<FeedbackSignals> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_STORE_KEY);
    return raw
      ? (JSON.parse(raw) as FeedbackSignals)
      : {
          itemBoosts: {},
          subcategoryBoosts: {},
          colorBoosts: {},
          tagPenalties: {},
        };
  } catch {
    return {
      itemBoosts: {},
      subcategoryBoosts: {},
      colorBoosts: {},
      tagPenalties: {},
    };
  }
}

async function saveSignals(s: FeedbackSignals) {
  await AsyncStorage.setItem(PREFS_STORE_KEY, JSON.stringify(s));
}

function normalizeTag(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes('formal')) return 'too_formal';
  if (t.includes('casual')) return 'too_casual';
  if (t.includes('weather')) return 'wrong_weather';
  if (t.includes('color')) return 'color_mismatch';
  if (t.includes('love')) return 'love';
  if (t.includes('wear')) return 'would_wear';
  return t.replace(/\s+/g, '_');
}

async function updateSignalsFromFeedback(
  entry: FeedbackEntry,
  selectedItems: {
    top?: WardrobeItem;
    bottom?: WardrobeItem;
    shoes?: WardrobeItem;
  },
) {
  const delta = entry.rating; // +1 or -1
  const s = await loadSignals();

  const bump = (map: Record<string, number>, key?: string) => {
    if (!key) return;
    map[key] = (map[key] || 0) + delta;
  };

  // Item-level
  bump(s.itemBoosts, entry.selectedItemIds.top);
  bump(s.itemBoosts, entry.selectedItemIds.bottom);
  bump(s.itemBoosts, entry.selectedItemIds.shoes);

  // Attribute-level (best-effort from available fields)
  const items = [
    selectedItems.top,
    selectedItems.bottom,
    selectedItems.shoes,
  ].filter(Boolean) as WardrobeItem[];

  for (const it of items) {
    // @ts-ignore — tolerate partial shapes
    bump(s.subcategoryBoosts, it.subcategory || it.mainCategory);
    // @ts-ignore
    bump(s.colorBoosts, it.color_family || it.color);
  }

  // Tag penalties (only accumulate for dislikes)
  for (const t of entry.tags || []) {
    const key = normalizeTag(t);
    s.tagPenalties[key] = (s.tagPenalties[key] || 0) + (delta < 0 ? 1 : 0);
  }

  await saveSignals(s);
}

export default function OutfitSuggestionScreen({navigate}: Props) {
  const userId = useUUID();
  const {user} = useAuth0(); // ← auth0 sub for style profile
  const {styleProfile} = useStyleProfile(user?.sub || ''); // ← raw profile object
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

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

  // Weather toggle (default OFF)
  const [useWeather, setUseWeather] = useState<boolean>(false);

  // NEW: Style profile toggle (default ON)
  const [useStylePrefs, setUseStylePrefs] = useState<boolean>(true);

  // NEW: Dev weights state for reranker
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

  // ──────────────────────────────────────────────────────────────
  // Voice input
  // ──────────────────────────────────────────────────────────────
  const handleVoiceStart = async () => {
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
    }
  };

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

  // ──────────────────────────────────────────────────────────────
  // Live weather fetch when needed (useWeather && weather === 'auto')
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

    // Only inject human text for weather if user explicitly picked an override
    if (useWeather && weather !== 'auto') parts.push(`${weather} weather`);

    if (lastSpeech.trim().length) parts.push(lastSpeech.trim());
    return parts.join(' ').trim() || 'smart casual, balanced neutrals';
  }, [occasion, style, weather, lastSpeech, useWeather]);

  // Preset WeatherContext from overrides
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
      default: // 'auto'
        return {
          tempF: 68,
          precipitation: 'none' as const,
          windMph: 5,
          locationName: 'Local' as const,
        };
    }
  }, [weather]);

  // ──────────────────────────────────────────────────────────────
  // Generate (now includes learned feedback signals)
  // ──────────────────────────────────────────────────────────────
  const [clientRequestId, setClientRequestId] = useState<string>('');
  const handleGenerate = async () => {
    if (!userId) return;

    // Weather payload decision
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

    // If dev slider sets styleWeight to 0, treat as "style off" for backend convenience.
    const useStyle = useStylePrefs && weights.styleWeight > 0;

    // Load learned signals and include in request
    const feedbackSignals = await loadSignals();

    // Generate a client-side request id (backend can echo it back)
    const newReqId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setClientRequestId(newReqId);

    console.log(
      '🔄 Generating outfit → useWeather:',
      useWeather,
      'weather=',
      wxToSend,
      'mode=',
      weather,
      'liveReady=',
      !!liveWeatherCtx,
      'useStylePrefs=',
      useStylePrefs,
      'useStyle(effective)=',
      useStyle,
      'styleProfilePresent=',
      !!styleProfile,
      'weights=',
      weights,
      'feedbackSignals=',
      feedbackSignals,
      'clientRequestId=',
      newReqId,
    );

    regenerate(builtQuery, {
      topK: 25,
      useWeather,
      weather: wxToSend,
      // Send style profile only if the toggle/effective style is ON
      styleProfile: useStyle ? styleProfile : undefined,
      // Hint the hook/back-end about style influence
      useStyle,
      // Always pass weights so backend can respect sliders
      // (your useOutfitApi should include these in the request body)
      // @ts-ignore - tolerated if hook's type doesn't include it yet
      weights,
      // 👇 NEW: pass signals + client_request_id (backend can optionally use/echo back)
      // @ts-ignore
      feedbackSignals,
      // @ts-ignore
      client_request_id: newReqId,
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Extract the three cards
  // ──────────────────────────────────────────────────────────────
  const topApi =
    pickFirstByCategory(current?.items, 'Tops') ??
    pickFirstByCategory(current?.items, 'Outerwear');
  const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
  const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

  const top = apiItemToUI(topApi);
  const bottom = apiItemToUI(bottomApi);
  const shoes = apiItemToUI(shoesApi);

  const reasons = {
    top: current?.why ? [current.why] : [],
    bottom: current?.why ? [current.why] : [],
    shoes: current?.why ? [current.why] : [],
  };

  // Effective request id for tying feedback → generation
  const effectiveRequestId =
    // prefer backend-provided id if present
    // @ts-ignore tolerate flexible shapes
    current?.request_id ||
    // @ts-ignore
    current?.requestId ||
    // @ts-ignore
    current?.trace_id ||
    clientRequestId ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const handleSubmitFeedback = async (fb: {
    feedback: 'like' | 'dislike';
    tags: string[];
    reason: string;
  }) => {
    const rating: 1 | -1 = fb.feedback === 'like' ? 1 : -1;

    if (!userId || userId.length !== 36) {
      console.warn('⛔️ Feedback skipped — invalid userId:', userId);
      return;
    }

    // 1) Resolve IDs robustly from UI OR raw API payload
    const topId =
      top?.id ??
      current?.items?.find(
        i => i.main_category === 'Tops' || i.main_category === 'Outerwear',
      )?.id ??
      current?.items?.[0]?.id;

    const bottomId =
      bottom?.id ??
      current?.items?.find(i => i.main_category === 'Bottoms')?.id;

    const shoesId =
      shoes?.id ?? current?.items?.find(i => i.main_category === 'Shoes')?.id;

    // 2) If any are missing, bail (prevents sending "::" and "{}")
    if (!topId || !bottomId || !shoesId) {
      console.error('❌ Aborting feedback: missing IDs', {
        topId,
        bottomId,
        shoesId,
      });
      return; // do not build payload
    }

    // 3) Build the entry
    const entry: FeedbackEntry = {
      timestamp: Date.now(),
      userId: userId || 'anon',
      requestId: effectiveRequestId,
      query: builtQuery,
      rating,
      tags: fb.tags,
      reason: fb.reason?.trim() || undefined,
      selectedItemIds: {top: topId, bottom: bottomId, shoes: shoesId},
      weights,
      useWeather,
      weather: useWeather
        ? weather === 'auto'
          ? liveWeatherCtx ?? undefined
          : chipWeatherContext
        : undefined,
      useStyle: useStylePrefs && weights.styleWeight > 0,
    };

    // 4) Local log + signals
    try {
      const existing = await AsyncStorage.getItem(FEEDBACK_LOGS_KEY);
      const arr = existing ? JSON.parse(existing) : [];
      arr.push(entry);
      await AsyncStorage.setItem(FEEDBACK_LOGS_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('Feedback log save failed', e);
    }
    await updateSignalsFromFeedback(entry, {top, bottom, shoes});

    // 5) POST to backend (always include explicit strings so JSON.stringify doesn’t drop keys)
    try {
      if (!FEEDBACK_ENDPOINT) {
        console.warn('FEEDBACK_ENDPOINT not configured; skipping backend POST');
        return;
      }

      const notesPayload = {
        request_id: entry.requestId,
        tags: entry.tags,
        reason: entry.reason,
        query: entry.query,
        selected_item_ids: {
          top:
            top?.id ||
            current?.items?.find(i => i.main_category === 'Tops')?.id,
          bottom:
            bottom?.id ||
            current?.items?.find(i => i.main_category === 'Bottoms')?.id,
          shoes:
            shoes?.id ||
            current?.items?.find(i => i.main_category === 'Shoes')?.id,
        },
        weights: entry.weights,
        use_style: entry.useStyle,
        use_weather: entry.useWeather,
        weather: entry.weather,
      };

      const payload = {
        user_id: entry.userId,
        outfit_id: `${topId}:${bottomId}:${shoesId}`,
        rating: fb.feedback,
        notes: JSON.stringify(notesPayload),
      };

      console.log('🚚 POST /feedback/rate payload →', payload);

      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': entry.userId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(
          '❗/feedback/rate failed:',
          res.status,
          res.statusText,
          text,
        );
      }
    } catch (e) {
      console.warn('POST /feedback/rate crashed:', (e as Error)?.message);
    }
  };

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

  // Card renderer
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

  // Loading states
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

  const canRate = !!(
    userId &&
    userId.length === 36 &&
    top?.id &&
    bottom?.id &&
    shoes?.id
  );

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
              {/* Prompt input with mic */}
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

              {/* Controls (now also has Use Style Profile toggle + WEIGHTS) */}
              <OutfitTuningControls
                weather={weather}
                occasion={occasion}
                style={style}
                onChangeWeather={v => setWeather(v as any)}
                onChangeOccasion={setOccasion}
                onChangeStyle={setStyle}
                useWeather={useWeather}
                onToggleWeather={setUseWeather}
                // Style prefs toggle
                useStylePrefs={useStylePrefs}
                onToggleStylePrefs={setUseStylePrefs}
                // DEV weights wiring (prevents undefined crash)
                weights={weights}
                onChangeWeights={setWeights}
                onRegenerate={handleGenerate}
                isGenerating={loading || liveWxLoading}
              />

              {/* Live weather hint only when in Auto mode */}
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

              {/* Suggested outfit cards */}
              {renderCard('Top', top, 'top')}
              {renderCard('Bottom', bottom, 'bottom')}
              {renderCard('Shoes', shoes, 'shoes')}

              {/* CTA row */}
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
                  style={[
                    globalStyles.buttonPrimary,
                    {width: 120, opacity: canRate ? 1 : 0.5},
                  ]}
                  disabled={!canRate}
                  onPress={() => canRate && setFeedbackModalVisible(true)}>
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

              {!!current?.missing && (
                <Text style={{marginTop: 12, color: theme.colors.muted}}>
                  Missing: {current.missing}
                </Text>
              )}
            </ScrollView>

            {/* Modals */}
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
              // 👇 NEW: let parent handle structured submission & learning
              // @ts-ignore — ok until the modal’s Prop type includes onSubmit
              onSubmit={handleSubmitFeedback}
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

////////////////////////////

// // OutfitSuggestionScreen.tsx
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
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {
//   useOutfitApi,
//   WardrobeItem,
//   apiItemToUI,
//   pickFirstByCategory,
// } from '../hooks/useOutfitApi';

// // ⬇️ NEW: bring in auth id + style profile
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// // Reuse weather utils
// import {getCurrentLocation, fetchWeather} from '../utils/travelWeather';

// type Props = {navigate: (screen: string, params?: any) => void};

// // local type to match backend weights shape (no import needed)
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

// // ===== NEW: tiny per-user feedback signals (stored locally) =====
// const PREFS_STORE_KEY = 'outfit_prefs_v1';
// const FEEDBACK_LOGS_KEY = 'outfit_feedback_logs_v2';

// type FeedbackSignals = {
//   itemBoosts: Record<string, number>; // item_id → +/- count
//   subcategoryBoosts: Record<string, number>; // subcategory/mainCategory → +/- count
//   colorBoosts: Record<string, number>; // color or color_family → +/- count
//   tagPenalties: Record<string, number>; // canonical tag key → penalty count
// };

// type FeedbackEntry = {
//   timestamp: number;
//   userId: string;
//   requestId: string;
//   query: string;
//   rating: 1 | -1; // +1 like, -1 dislike
//   tags: string[];
//   reason?: string;
//   selectedItemIds: {top?: string; bottom?: string; shoes?: string};
//   weights: Weights;
//   useWeather: boolean;
//   weather?: {
//     tempF: number;
//     precipitation?: 'none' | 'rain' | 'snow';
//     windMph?: number;
//     locationName?: string;
//   };
//   useStyle: boolean;
// };

// async function loadSignals(): Promise<FeedbackSignals> {
//   try {
//     const raw = await AsyncStorage.getItem(PREFS_STORE_KEY);
//     return raw
//       ? (JSON.parse(raw) as FeedbackSignals)
//       : {
//           itemBoosts: {},
//           subcategoryBoosts: {},
//           colorBoosts: {},
//           tagPenalties: {},
//         };
//   } catch {
//     return {
//       itemBoosts: {},
//       subcategoryBoosts: {},
//       colorBoosts: {},
//       tagPenalties: {},
//     };
//   }
// }

// async function saveSignals(s: FeedbackSignals) {
//   await AsyncStorage.setItem(PREFS_STORE_KEY, JSON.stringify(s));
// }

// function normalizeTag(tag: string): string {
//   const t = tag.toLowerCase();
//   if (t.includes('formal')) return 'too_formal';
//   if (t.includes('casual')) return 'too_casual';
//   if (t.includes('weather')) return 'wrong_weather';
//   if (t.includes('color')) return 'color_mismatch';
//   if (t.includes('love')) return 'love';
//   if (t.includes('wear')) return 'would_wear';
//   return t.replace(/\s+/g, '_');
// }

// async function updateSignalsFromFeedback(
//   entry: FeedbackEntry,
//   selectedItems: {
//     top?: WardrobeItem;
//     bottom?: WardrobeItem;
//     shoes?: WardrobeItem;
//   },
// ) {
//   const delta = entry.rating; // +1 or -1
//   const s = await loadSignals();

//   const bump = (map: Record<string, number>, key?: string) => {
//     if (!key) return;
//     map[key] = (map[key] || 0) + delta;
//   };

//   // Item-level
//   bump(s.itemBoosts, entry.selectedItemIds.top);
//   bump(s.itemBoosts, entry.selectedItemIds.bottom);
//   bump(s.itemBoosts, entry.selectedItemIds.shoes);

//   // Attribute-level (best-effort from available fields)
//   const items = [
//     selectedItems.top,
//     selectedItems.bottom,
//     selectedItems.shoes,
//   ].filter(Boolean) as WardrobeItem[];

//   for (const it of items) {
//     // @ts-ignore — tolerate partial shapes
//     bump(s.subcategoryBoosts, it.subcategory || it.mainCategory);
//     // @ts-ignore
//     bump(s.colorBoosts, it.color_family || it.color);
//   }

//   // Tag penalties (only accumulate for dislikes)
//   for (const t of entry.tags || []) {
//     const key = normalizeTag(t);
//     s.tagPenalties[key] = (s.tagPenalties[key] || 0) + (delta < 0 ? 1 : 0);
//   }

//   await saveSignals(s);
// }

// export default function OutfitSuggestionScreen({navigate}: Props) {
//   const userId = useUUID();
//   const {user} = useAuth0(); // ← auth0 sub for style profile
//   const {styleProfile} = useStyleProfile(user?.sub || ''); // ← raw profile object
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

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

//   // Weather toggle (default OFF)
//   const [useWeather, setUseWeather] = useState<boolean>(false);

//   // NEW: Style profile toggle (default ON)
//   const [useStylePrefs, setUseStylePrefs] = useState<boolean>(true);

//   // NEW: Dev weights state for reranker
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

//   // ──────────────────────────────────────────────────────────────
//   // Voice input
//   // ──────────────────────────────────────────────────────────────
//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

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

//   // ──────────────────────────────────────────────────────────────
//   // Live weather fetch when needed (useWeather && weather === 'auto')
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

//     // Only inject human text for weather if user explicitly picked an override
//     if (useWeather && weather !== 'auto') parts.push(`${weather} weather`);

//     if (lastSpeech.trim().length) parts.push(lastSpeech.trim());
//     return parts.join(' ').trim() || 'smart casual, balanced neutrals';
//   }, [occasion, style, weather, lastSpeech, useWeather]);

//   // Preset WeatherContext from overrides
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
//       default: // 'auto'
//         return {
//           tempF: 68,
//           precipitation: 'none' as const,
//           windMph: 5,
//           locationName: 'Local' as const,
//         };
//     }
//   }, [weather]);

//   // ──────────────────────────────────────────────────────────────
//   // Generate (now includes learned feedback signals)
//   // ──────────────────────────────────────────────────────────────
//   const [clientRequestId, setClientRequestId] = useState<string>('');
//   const handleGenerate = async () => {
//     if (!userId) return;

//     // Weather payload decision
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

//     // If dev slider sets styleWeight to 0, treat as "style off" for backend convenience.
//     const useStyle = useStylePrefs && weights.styleWeight > 0;

//     // Load learned signals and include in request
//     const feedbackSignals = await loadSignals();

//     // Generate a client-side request id (backend can echo it back)
//     const newReqId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
//     setClientRequestId(newReqId);

//     console.log(
//       '🔄 Generating outfit → useWeather:',
//       useWeather,
//       'weather=',
//       wxToSend,
//       'mode=',
//       weather,
//       'liveReady=',
//       !!liveWeatherCtx,
//       'useStylePrefs=',
//       useStylePrefs,
//       'useStyle(effective)=',
//       useStyle,
//       'styleProfilePresent=',
//       !!styleProfile,
//       'weights=',
//       weights,
//       'feedbackSignals=',
//       feedbackSignals,
//       'clientRequestId=',
//       newReqId,
//     );

//     regenerate(builtQuery, {
//       topK: 25,
//       useWeather,
//       weather: wxToSend,
//       // Send style profile only if the toggle/effective style is ON
//       styleProfile: useStyle ? styleProfile : undefined,
//       // Hint the hook/back-end about style influence
//       useStyle,
//       // Always pass weights so backend can respect sliders
//       // (your useOutfitApi should include these in the request body)
//       // @ts-ignore - tolerated if hook's type doesn't include it yet
//       weights,
//       // 👇 NEW: pass signals + client_request_id (backend can optionally use/echo back)
//       // @ts-ignore
//       feedbackSignals,
//       // @ts-ignore
//       client_request_id: newReqId,
//     });
//   };

//   // ──────────────────────────────────────────────────────────────
//   // Extract the three cards
//   // ──────────────────────────────────────────────────────────────
//   const topApi =
//     pickFirstByCategory(current?.items, 'Tops') ??
//     pickFirstByCategory(current?.items, 'Outerwear');
//   const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
//   const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

//   const top = apiItemToUI(topApi);
//   const bottom = apiItemToUI(bottomApi);
//   const shoes = apiItemToUI(shoesApi);

//   const reasons = {
//     top: current?.why ? [current.why] : [],
//     bottom: current?.why ? [current.why] : [],
//     shoes: current?.why ? [current.why] : [],
//   };

//   // Effective request id for tying feedback → generation
//   const effectiveRequestId =
//     // prefer backend-provided id if present
//     // @ts-ignore tolerate flexible shapes
//     current?.request_id ||
//     // @ts-ignore
//     current?.requestId ||
//     // @ts-ignore
//     current?.trace_id ||
//     clientRequestId ||
//     `${Date.now()}-${Math.random().toString(36).slice(2)}`;

//   // ===== NEW: submit feedback handler (updates signals + logs) =====
//   const handleSubmitFeedback = async (fb: {
//     feedback: 'like' | 'dislike';
//     tags: string[];
//     reason: string;
//   }) => {
//     const rating: 1 | -1 = fb.feedback === 'like' ? 1 : -1;

//     const entry: FeedbackEntry = {
//       timestamp: Date.now(),
//       userId: userId || 'anon',
//       requestId: effectiveRequestId,
//       query: builtQuery,
//       rating,
//       tags: fb.tags,
//       reason: fb.reason?.trim() || undefined,
//       selectedItemIds: {top: top?.id, bottom: bottom?.id, shoes: shoes?.id},
//       weights,
//       useWeather,
//       weather: useWeather
//         ? weather === 'auto'
//           ? liveWeatherCtx ?? undefined
//           : chipWeatherContext
//         : undefined,
//       useStyle: useStylePrefs && weights.styleWeight > 0,
//     };

//     // 1) append to local logs (debug/audit)
//     try {
//       const existing = await AsyncStorage.getItem(FEEDBACK_LOGS_KEY);
//       const arr = existing ? JSON.parse(existing) : [];
//       arr.push(entry);
//       await AsyncStorage.setItem(FEEDBACK_LOGS_KEY, JSON.stringify(arr));
//     } catch (e) {
//       console.warn('Feedback log save failed', e);
//     }

//     // 2) update signals
//     await updateSignalsFromFeedback(entry, {top, bottom, shoes});

//     // 3) (optional) POST to backend — safe to comment until endpoint exists
//     // try {
//     //   await fetch(`${API_BASE}/feedback`, {
//     //     method: 'POST',
//     //     headers: {'Content-Type': 'application/json'},
//     //     body: JSON.stringify(entry),
//     //   });
//     // } catch (e) {
//     //   console.log('Feedback POST skipped/failed:', (e as Error)?.message);
//     // }
//   };

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

//   // Card renderer
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

//   // Loading states
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

//               {/* Controls (now also has Use Style Profile toggle + WEIGHTS) */}
//               <OutfitTuningControls
//                 weather={weather}
//                 occasion={occasion}
//                 style={style}
//                 onChangeWeather={v => setWeather(v as any)}
//                 onChangeOccasion={setOccasion}
//                 onChangeStyle={setStyle}
//                 useWeather={useWeather}
//                 onToggleWeather={setUseWeather}
//                 // Style prefs toggle
//                 useStylePrefs={useStylePrefs}
//                 onToggleStylePrefs={setUseStylePrefs}
//                 // DEV weights wiring (prevents undefined crash)
//                 weights={weights}
//                 onChangeWeights={setWeights}
//                 onRegenerate={handleGenerate}
//                 isGenerating={loading || liveWxLoading}
//               />

//               {/* Live weather hint only when in Auto mode */}
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

//               {/* Suggested outfit cards */}
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
//               // 👇 NEW: let parent handle structured submission & learning
//               // @ts-ignore — ok until the modal’s Prop type includes onSubmit
//               onSubmit={handleSubmitFeedback}
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

////////////////////////

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
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {
//   useOutfitApi,
//   WardrobeItem,
//   apiItemToUI,
//   pickFirstByCategory,
// } from '../hooks/useOutfitApi';

// // ⬇️ NEW: bring in auth id + style profile
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// // Reuse weather utils
// import {getCurrentLocation, fetchWeather} from '../utils/travelWeather';

// type Props = {navigate: (screen: string, params?: any) => void};

// // local type to match backend weights shape (no import needed)
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
//   const {user} = useAuth0(); // ← auth0 sub for style profile
//   const {styleProfile} = useStyleProfile(user?.sub || ''); // ← raw profile object
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

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

//   // Weather toggle (default OFF)
//   const [useWeather, setUseWeather] = useState<boolean>(false);

//   // NEW: Style profile toggle (default ON)
//   const [useStylePrefs, setUseStylePrefs] = useState<boolean>(true);

//   // NEW: Dev weights state for reranker
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

//   // ──────────────────────────────────────────────────────────────
//   // Voice input
//   // ──────────────────────────────────────────────────────────────
//   const handleVoiceStart = async () => {
//     try {
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//     }
//   };

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

//   // ──────────────────────────────────────────────────────────────
//   // Live weather fetch when needed (useWeather && weather === 'auto')
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

//     // Only inject human text for weather if user explicitly picked an override
//     if (useWeather && weather !== 'auto') parts.push(`${weather} weather`);

//     if (lastSpeech.trim().length) parts.push(lastSpeech.trim());
//     return parts.join(' ').trim() || 'smart casual, balanced neutrals';
//   }, [occasion, style, weather, lastSpeech, useWeather]);

//   // Preset WeatherContext from overrides
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
//       default: // 'auto'
//         return {
//           tempF: 68,
//           precipitation: 'none' as const,
//           windMph: 5,
//           locationName: 'Local' as const,
//         };
//     }
//   }, [weather]);

//   // ──────────────────────────────────────────────────────────────
//   // Generate
//   // ──────────────────────────────────────────────────────────────
//   const handleGenerate = () => {
//     if (!userId) return;

//     // Weather payload decision
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

//     // If dev slider sets styleWeight to 0, treat as "style off" for backend convenience.
//     const useStyle = useStylePrefs && weights.styleWeight > 0;

//     console.log(
//       '🔄 Generating outfit → useWeather:',
//       useWeather,
//       'weather=',
//       wxToSend,
//       'mode=',
//       weather,
//       'liveReady=',
//       !!liveWeatherCtx,
//       'useStylePrefs=',
//       useStylePrefs,
//       'useStyle(effective)=',
//       useStyle,
//       'styleProfilePresent=',
//       !!styleProfile,
//       'weights=',
//       weights,
//     );

//     regenerate(builtQuery, {
//       topK: 25,
//       useWeather,
//       weather: wxToSend,
//       // Send style profile only if the toggle/effective style is ON
//       styleProfile: useStyle ? styleProfile : undefined,
//       // Hint the hook/back-end about style influence
//       useStyle,
//       // Always pass weights so backend can respect sliders
//       // (your useOutfitApi should include these in the request body)
//       // @ts-ignore - tolerated if hook's type doesn't include it yet
//       weights,
//     });
//   };

//   // ──────────────────────────────────────────────────────────────
//   // Extract the three cards
//   // ──────────────────────────────────────────────────────────────
//   const topApi =
//     pickFirstByCategory(current?.items, 'Tops') ??
//     pickFirstByCategory(current?.items, 'Outerwear');
//   const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
//   const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

//   const top = apiItemToUI(topApi);
//   const bottom = apiItemToUI(bottomApi);
//   const shoes = apiItemToUI(shoesApi);

//   const reasons = {
//     top: current?.why ? [current.why] : [],
//     bottom: current?.why ? [current.why] : [],
//     shoes: current?.why ? [current.why] : [],
//   };

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

//   // Loading states
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

//               {/* Controls (now also has Use Style Profile toggle + WEIGHTS) */}
//               <OutfitTuningControls
//                 weather={weather}
//                 occasion={occasion}
//                 style={style}
//                 onChangeWeather={v => setWeather(v as any)}
//                 onChangeOccasion={setOccasion}
//                 onChangeStyle={setStyle}
//                 useWeather={useWeather}
//                 onToggleWeather={setUseWeather}
//                 // Style prefs toggle
//                 useStylePrefs={useStylePrefs}
//                 onToggleStylePrefs={setUseStylePrefs}
//                 // DEV weights wiring (prevents undefined crash)
//                 weights={weights}
//                 onChangeWeights={setWeights}
//                 onRegenerate={handleGenerate}
//                 isGenerating={loading || liveWxLoading}
//               />

//               {/* Live weather hint only when in Auto mode */}
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

//               {/* Suggested outfit cards */}
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
