import React, {useState, useEffect, useMemo, useRef, useCallback} from 'react';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
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
import {fontScale, moderateScale} from '../utils/scale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import {
  useOutfitApi,
  WardrobeItem,
  apiItemToUI,
  pickFirstByCategory,
} from '../hooks/useOutfitApi';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';
import ReaderModal from '../components/FashionFeed/ReaderModal';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useQueryClient} from '@tanstack/react-query';

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

// AI Outfit v2 components
import GuidedRefinementChips from '../components/GuidedRefinementChips/GuidedRefinementChips';
import WardrobePickerModal from '../components/WardrobePickerModal/WardrobePickerModal';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Haptic feedback helper
const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type as any, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

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
  const queryClient = useQueryClient();

  const insets = useSafeAreaInsets();

  // Sync scroll position with global nav for bottom nav hide/show
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (global.__navScrollY) {
        global.__navScrollY.setValue(event.nativeEvent.contentOffset.y);
      }
    },
    [],
  );

  // generate a v4 session id (per call we also make one)
  const sid = uuid.v4() as string;

  // ──────────────────────────────────────────────────────────────
  // Local UI state
  // ──────────────────────────────────────────────────────────────
  const [visibleModal, setVisibleModal] = useState<
    null | 'top' | 'bottom' | 'shoes'
  >(null);
  const [lastSpeech, setLastSpeech] = useState('');

  // 📰 Shopping Reader Modal
  const [shopReaderUrl, setShopReaderUrl] = useState<string | null>(null);
  const [shopReaderTitle, setShopReaderTitle] = useState<string | null>(null);

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

  // ──────────────────────────────────────────────────────────────
  // AI Outfit v2 State
  // ──────────────────────────────────────────────────────────────
  const [showWardrobePicker, setShowWardrobePicker] = useState(false);
  const [lockedItem, setLockedItem] = useState<WardrobeItem | null>(null);
  const [selectedMoodLabel, setSelectedMoodLabel] = useState<string | null>(null);
  const [selectedMoodPrompt, setSelectedMoodPrompt] = useState<string | null>(null);
  const [outfitPrompt, setOutfitPrompt] = useState<string>('');
  const [buildAroundPrompt, setBuildAroundPrompt] = useState<string>('');
  // Swap item mode: track which section is being swapped (null = start from piece mode)
  const [swapSection, setSwapSection] = useState<'top' | 'bottom' | 'shoes' | null>(null);

  const isDisabled = !top || !bottom || !shoes;

  const REASON_TAGS = [
    'Too casual',
    'Too formal',
    'Wrong for weather',
    'Color mismatch',
    'Love this',
    'Would wear this',
  ];

  // Backend hook
  const {current, loading, error, regenerate, clear, outfits, selected, setSelected} = useOutfitApi(userId);

  // Voice input
  const handleVoiceStart = async () => {
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
    }
  };

  // 🔁 Replace your existing getShoppingLinks() with this version
  const AFFILIATE_ID = 'YOUR_AFFILIATE_ID'; // replace later with real IDs

  const getShoppingLinks = (missing: string) => {
    const query = encodeURIComponent(missing);
    const utm = `utm_source=stylhelpr&utm_medium=app&utm_campaign=outfit_suggestion`;

    return [
      {
        name: 'Farfetch',
        url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&${utm}&affid=${AFFILIATE_ID}`,
      },
      {
        name: 'Mr Porter',
        url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&${utm}&affiliate=${AFFILIATE_ID}`,
      },
      {
        name: 'Nordstrom',
        url: `https://www.nordstrom.com/sr?keyword=${query}&${utm}`,
      },
      {
        name: 'Matches Fashion',
        url: `https://www.matchesfashion.com/us/search?q=${query}&${utm}`,
      },
      {
        name: 'SSENSE',
        url: `https://www.ssense.com/en-us/men/search?q=${query}&${utm}`,
      },
      {
        name: 'Google Shop',
        url: `https://www.google.com/search?q=${query}&tbm=shop&${utm}`,
      },
    ];
  };

  // const getShoppingLinks = (missing: string) => {
  //   const query = encodeURIComponent(missing);
  //   return [
  //     {
  //       name: 'Farfetch',
  //       url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
  //     },
  //     {
  //       name: 'Mr Porter',
  //       url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
  //     },
  //     {
  //       name: 'Nordstrom',
  //       url: `https://www.nordstrom.com/sr?keyword=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
  //     },
  //     {
  //       name: 'Matches Fashion',
  //       url: `https://www.matchesfashion.com/us/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
  //     },
  //     {
  //       name: 'SSENSE',
  //       url: `https://www.ssense.com/en-us/men/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
  //     },
  //     {
  //       name: 'Google Shopping',
  //       url: `https://www.google.com/search?q=${query}&tbm=shop&utm_source=stylhelpr&utm_medium=affiliate`,
  //     },
  //   ];
  // };

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
    // pick up anything sent before mount
    const first = consumeHandoff();
    if (first) {
      applyHandoff(first);
    }
    // and react to handoffs while mounted
    const unsub = subscribeHandoff(p => {
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
        // weights load failed silently
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights)).catch(
      () => {},
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
        }
      } catch (e: any) {
        if (!cancelled) {
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
  // AI Outfit v2 Handlers
  // ──────────────────────────────────────────────────────────────

  // "Create Outfit" - Initial generation with NEW session (uses legacy builtQuery)
  const handleV2Generate = () => {
    console.log('[handleV2Generate] Called! userId:', userId);
    if (!userId) {
      console.log('[handleV2Generate] No userId, returning early');
      return;
    }

    // Debug: Log locked item info
    if (lockedItem) {
      console.log('[handleV2Generate] Locked item:', {
        id: lockedItem.id,
        name: lockedItem.name,
        category: (lockedItem as any).mainCategory || (lockedItem as any).main_category,
        fullItem: lockedItem,
      });
    }

    // Clear any existing outfit first to allow fresh generation
    clear();

    // Create NEW session for initial generation
    const newSessionId = uuid.v4() as string;
    setSessionId(newSessionId);
    // Keep lockedItem if user selected one via "Start from a Piece"
    // Keep selectedMoodLabel/Prompt - don't reset it, so user's mood selection persists

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

    // If user selected a locked item, build query around it with buildAroundPrompt
    // Handle both snake_case and camelCase property names from API (cast to any for flexibility)
    const li = lockedItem as any;
    const lockedItemCategory = lockedItem
      ? (li.subCategory || li.subcategory || li.mainCategory || li.main_category || li.name || 'item')
      : '';
    const queryToUse = lockedItem
      ? `outfit built around my ${lockedItemCategory}${buildAroundPrompt ? `: ${buildAroundPrompt}` : ''}`
      : builtQuery;

    // Use existing builtQuery logic (legacy behavior preservation)
    // If user selected a mood before generating, incorporate it
    // For locked items, use buildAroundPrompt; otherwise use outfitPrompt
    const promptParts = lockedItem
      ? [selectedMoodPrompt, buildAroundPrompt].filter(Boolean)
      : [selectedMoodPrompt, outfitPrompt].filter(Boolean);

    const lockedIds = lockedItem ? [lockedItem.id] : undefined;
    console.log('[handleV2Generate] Calling regenerate with:', {
      query: queryToUse,
      lockedItemIds: lockedIds,
      refinementPrompt: promptParts.join(' ') || undefined,
    });

    regenerate(queryToUse, {
      topK: 25,
      useWeather,
      sessionId: newSessionId,
      weather: wxToSend,
      styleProfile: useStyle ? styleProfile : undefined,
      useStyle,
      // @ts-ignore
      weights,
      useFeedback,
      styleAgent,
      // Include selected mood and freeform prompt as context if present
      refinementPrompt: promptParts.join(' ') || undefined,
      // Include locked item if user started from a piece
      lockedItemIds: lockedIds,
    });
  };

  // "Start from a Piece" - Just select the item, don't generate yet
  const handleStartFromPiece = (item: any) => {
    console.log('[handleStartFromPiece] Selected item:', {
      id: item.id,
      name: item.name,
      category: item.mainCategory || item.main_category,
      fullItem: item,
    });
    // Just set the locked item and close modal - user will tap "Create Outfit" to generate
    setLockedItem(item);
    setShowWardrobePicker(false);
    setSwapSection(null);
  };

  // Handle wardrobe item selection (both "start from piece" and "swap" modes)
  const handleWardrobeItemSelect = (item: any) => {
    // Handle both snake_case and camelCase properties
    const itemCategory = item.subCategory || item.subcategory || item.mainCategory || item.main_category || item.name || 'item';

    if (swapSection && sessionId) {
      // Swap mode: update the specific outfit slot with the new item
      h('impactMedium');

      // Get current outfit items to lock the ones we're NOT swapping
      const rawItems = Array.isArray((current as any)?.outfits?.[0]?.items)
        ? (current as any).outfits[0].items
        : Array.isArray((current as any)?.items)
        ? (current as any).items
        : [];

      // Map swapSection to main category for filtering
      const swapCategoryMap: Record<string, string> = {
        'top': 'tops',
        'bottom': 'bottoms',
        'shoes': 'shoes',
      };
      const swapCategory = swapCategoryMap[swapSection] || swapSection;

      // Get IDs of items we want to KEEP (everything except the swapped section)
      const itemsToKeep = rawItems
        .filter((it: any) => {
          const cat = (it?.mainCategory || it?.main_category || '').toLowerCase();
          return cat !== swapCategory;
        })
        .map((it: any) => it?.id)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

      // Lock the items we're keeping PLUS the new item
      const allLockedIds = [...itemsToKeep, item.id];

      // Build swap prompt
      const swapPrompt = `Replace ONLY the ${swapSection} with this specific ${itemCategory}. Keep all other items exactly the same.`;

      // Close modal and reset swap state BEFORE triggering refinement
      setShowWardrobePicker(false);
      setSwapSection(null);

      // Get weather context
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

      // Trigger refinement with ALL relevant items locked
      regenerate(builtQuery, {
        topK: 25,
        useWeather,
        sessionId, // Reuse existing session
        weather: wxToSend,
        styleProfile: useStyle ? styleProfile : undefined,
        useStyle,
        // @ts-ignore
        weights,
        useFeedback,
        styleAgent,
        refinementPrompt: swapPrompt,
        // Lock the items we're keeping + the new item
        lockedItemIds: allLockedIds,
      });
    } else if (swapSection && !sessionId) {
      // Swap mode but no session - shouldn't happen, but handle gracefully
      console.warn('[Swap] No session ID available for swap');
      setShowWardrobePicker(false);
      setSwapSection(null);
    } else {
      // Start from piece mode
      handleStartFromPiece(item);
    }
  };

  // Guided Refinement - REUSES existing session (CRITICAL for session continuity)
  const handleGuidedRefinement = (refinementPrompt: string) => {
    // CRITICAL: Must have existing session - no refinement without it
    if (!userId || !sessionId) return;

    // REUSE existing sessionId - this is non-negotiable
    // NOTE: Do NOT lock items here - the refinement prompt should guide the AI
    // on what to change. Locking all items prevents any changes from happening.
    regenerate(builtQuery, {
      topK: 25,
      sessionId, // REUSE - critical for session continuity
      refinementPrompt,
      useWeather,
      weather: useWeather ? chipWeatherContext : undefined,
      styleProfile: useStylePrefs ? styleProfile : undefined,
      useStyle: useStylePrefs,
      weights,
      useFeedback,
      styleAgent,
      // No lockedItemIds - allow AI to make changes based on refinement prompt
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Extract cards
  // ──────────────────────────────────────────────────────────────

  // Helper to extract preview items from any outfit
  const getOutfitPreview = (outfit: any) => {
    if (!outfit) return null;
    const items = outfit?.items || [];
    const topItem = pickFirstByCategory(items, 'Tops') ?? pickFirstByCategory(items, 'Outerwear');
    const bottomItem = pickFirstByCategory(items, 'Bottoms');
    const shoesItem = pickFirstByCategory(items, 'Shoes');
    return {
      title: outfit?.title || 'Outfit',
      top: apiItemToUI(topItem),
      bottom: apiItemToUI(bottomItem),
      shoes: apiItemToUI(shoesItem),
    };
  };

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
      height: 318,
      borderRadius: tokens.borderRadius.md,
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: '#1c1c1e',
      elevation: 3,
    },
    cardImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    overlay: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.29)',
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
    itemName: {fontSize: 18, fontWeight: '600', color: theme.colors.foreground},
    whyText: {
      fontSize: 18,
      color: theme.colors.button1,
      marginTop: 6,
      fontWeight: '500',
    },
  });

  const renderCard = (
    label: string,
    item: WardrobeItem | undefined,
    section: 'top' | 'bottom' | 'shoes',
  ) => {
    // AI Outfit v2: Check if this item is the locked item
    const isLocked = lockedItem && item?.id === lockedItem.id;

    // Map section to wardrobe category
    const getCategoryForSection = (s: 'top' | 'bottom' | 'shoes') => {
      switch (s) {
        case 'top': return 'Tops';
        case 'bottom': return 'Bottoms';
        case 'shoes': return 'Shoes';
        default: return 'All';
      }
    };

    return (
      <TouchableOpacity
        onPress={() => setVisibleModal(section)}
        activeOpacity={0.9}
        style={[
          styles.cardOverlay,
          {backgroundColor: 'white'},
          isLocked && {borderWidth: 2, borderColor: theme.colors.primary},
        ]}>
        <Image
          source={
            item?.image
              ? {uri: item.image}
              : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
          }
          style={styles.cardImage}
        />
        <View
          style={[
            styles.categoryPill,
            {backgroundColor: theme.colors.background},
          ]}>
          <Text
            style={[
              globalStyles.label,
              {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
            ]}>
            {label}
          </Text>
        </View>
        {/* AI Outfit v2: Locked item indicator */}
        {isLocked && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: theme.colors.primary,
              borderRadius: 12,
              padding: 4,
            }}>
            <MaterialIcons name="lock" size={16} color="#fff" />
          </View>
        )}
        {/* Swap out Item button - hide for locked items */}
        {!isLocked && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              h('impactLight');
              setSwapSection(section);
              setShowWardrobePicker(true);
            }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}>
            <MaterialIcons name="swap-horiz" size={16} color="#fff" />
            <Text style={{color: '#fff', fontSize: 12, fontWeight: '500'}}>
              Swap
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.overlay}>
          <View style={globalStyles.labelContainer2}>
            <Text style={styles.itemName}>
              {item?.name ?? `No ${label} selected`}
            </Text>
            <Text style={styles.whyText}>
              {isLocked ? 'You chose this piece' : `Why this ${label}?`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        {backgroundColor: theme.colors.background, paddingBottom: 350},
      ]}>
      <View
        style={{
          height: insets.top + 60, // ⬅️ 56 is about the old navbar height
          backgroundColor: theme.colors.background, // same tone as old nav
        }}
      />
      
      <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: moderateScale(tokens.spacing.sm),
            marginBottom: 10
          }}>
          <Image
            source={require('../assets/images/Styla1.png')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 8,
              borderWidth: 1,
              borderColor: theme.colors.surfaceBorder,
            }}
            resizeMode="cover"
          />
          <Text style={[globalStyles.header, {paddingLeft: 0}]}>Styla -AI Outfit Studio</Text>
        </View>

        {/* Header */}
        {/* <View
          style={{
            justifyContent: 'center',
            paddingHorizontal: moderateScale(tokens.spacing.xxl),
            marginBottom: moderateScale(tokens.spacing.sm2),
          }}>
          <Animatable.Text
            animation="fadeInUp"
            duration={800}
            easing="ease-out-cubic"
            delay={150}
            style={{
              textAlign: 'center',
              fontSize: fontScale(tokens.fontSize.md),
              color: theme.colors.foreground,
              fontWeight: tokens.fontWeight.normal,
            }}>
            Outfits are assembled from your personal uploaded wardrobe items. Just tell me what kind of look you 
            want and press "Generate Ideas"
          </Animatable.Text>
        </View> */}

        <View style={[globalStyles.section]}>
          <View style={globalStyles.centeredSection}>
            <ScrollView
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                marginTop: 8,
                paddingBottom: 40,
                alignItems: 'center',
              }}>
              {/* AI Outfit v2 Entry State */}
              {!hasOutfit && (
                <Animatable.View
                  animation="fadeInUp"
                  duration={600}
                  easing="ease-out-cubic"
                  style={{
                    alignItems: 'center',
                    width: '100%',
                    paddingHorizontal: 20,
                    marginBottom: 20,
                  }}>
      

                  {/* Mood chips and prompt input visible from entry state - hide when piece selected */}
                  {!lockedItem && (
                    <GuidedRefinementChips
                      onSelectMood={(refinementPrompt, label) => {
                        // Empty strings mean deselection (toggle off)
                        setSelectedMoodLabel(label || null);
                        setSelectedMoodPrompt(refinementPrompt || null);
                      }}
                      onSelectAdjustment={() => {}}
                      disabled={loading}
                      selectedMoodLabel={selectedMoodLabel}
                      showAdjustments={false}
                      promptValue={outfitPrompt}
                      onPromptChange={setOutfitPrompt}
                      promptPlaceholder="e.g. brunch, work, etc..."
                    />
                  )}

                  {/* Start from a Piece button - show only when no piece selected */}
                  {!lockedItem && (
                    <TouchableOpacity
                      style={[
                        globalStyles.buttonSecondary,
                        {width: 200, marginTop: 16},
                      ]}
                      onPress={() => setShowWardrobePicker(true)}
                      disabled={loading}>
                      <Text style={globalStyles.buttonSecondaryText}>
                        Start from a Piece
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Show locked item section when piece is selected */}
                  {lockedItem && (
                    <View style={{
                      alignItems: 'center',
                      marginTop: 16,
                      width: '100%',
                    }}>
                      {/* Thumbnail with close button */}
                      <View style={{
                        position: 'relative',
                        borderRadius: 12,
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: theme.colors.primary,
                      }}>
                        <Image
                          source={{
                            uri: lockedItem.image?.startsWith('http')
                              ? lockedItem.image
                              : `${API_BASE_URL}/${lockedItem.image?.replace(/^\/+/, '')}`,
                          }}
                          style={{
                            width: 100,
                            height: 100,
                            backgroundColor: '#fff',
                          }}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setLockedItem(null);
                            setBuildAroundPrompt('');
                          }}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            borderRadius: 12,
                            padding: 4,
                          }}>
                          <MaterialIcons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <Text style={{
                        fontSize: 12,
                        color: theme.colors.foreground,
                        marginTop: 6,
                        marginBottom: 12,
                      }}>
                        {lockedItem.name || lockedItem.subCategory || lockedItem.mainCategory || 'Selected item'}
                      </Text>

                      {/* "How do you want to build around this item?" freeform input */}
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: theme.colors.muted,
                        marginBottom: 8,
                      }}>
                        How do you want to build around this item?
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: theme.colors.surfaceBorder,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          fontSize: 15,
                          color: theme.colors.foreground,
                          minHeight: 44,
                          width: '100%',
                        }}
                        value={buildAroundPrompt}
                        onChangeText={setBuildAroundPrompt}
                        placeholder="e.g. smart casual for dinner, keep it relaxed..."
                        placeholderTextColor={theme.colors.muted}
                        editable={!loading}
                        multiline
                        numberOfLines={2}
                      />

                    </View>
                  )}

                  {/* Primary CTA: Create Outfit - always at bottom */}
                  <TouchableOpacity
                    style={[
                      globalStyles.buttonPrimary,
                      {width: 200, marginTop: 20},
                      (loading || (!outfitPrompt.trim() && !selectedMoodLabel)) && {opacity: 0.5},
                    ]}
                    onPress={handleV2Generate}
                    disabled={loading || (!outfitPrompt.trim() && !selectedMoodLabel)}>
                    <Text style={globalStyles.buttonPrimaryText}>
                      {loading ? 'Creating…' : 'CREATE OUTFIT'}
                    </Text>
                  </TouchableOpacity>
                </Animatable.View>
              )}

              {/* Controls */}
              <OutfitTuningControls
                weather={weather}
                onChangeWeather={v => setWeather(v as any)}
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
                adjustmentContent={hasOutfit ? (
                  <GuidedRefinementChips
                    onSelectMood={(refinementPrompt, label) => {
                      // Empty strings mean deselection (toggle off)
                      setSelectedMoodLabel(label || null);
                      setSelectedMoodPrompt(refinementPrompt || null);
                      if (refinementPrompt) {
                        handleGuidedRefinement(refinementPrompt);
                      }
                    }}
                    onSelectAdjustment={handleGuidedRefinement}
                    disabled={loading}
                    selectedMoodLabel={selectedMoodLabel}
                    showMoods={false}
                    showPrompt={false}
                  />
                ) : undefined}
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

              {/* Outfit Selector - shows when multiple outfits available */}
              {hasOutfit && outfits.length > 1 && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                  paddingHorizontal: 16,
                }}>
                  {outfits.slice(0, 3).map((outfit, index) => {
                    const preview = getOutfitPreview(outfit);
                    const isSelected = index === selected;
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelected(index)}
                        style={{
                          flex: 1,
                          maxWidth: 110,
                          padding: 8,
                          borderRadius: 12,
                          backgroundColor: isSelected
                            ? theme.colors.primary + '20'
                            : theme.colors.surface2,
                          borderWidth: 2,
                          borderColor: isSelected
                            ? theme.colors.primary
                            : 'transparent',
                        }}>
                        {/* Mini preview images */}
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'center',
                          marginBottom: 6,
                        }}>
                          {[preview?.top, preview?.bottom, preview?.shoes]
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((item, i) => (
                              <Image
                                key={i}
                                source={{uri: item?.image}}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  marginHorizontal: 1,
                                  backgroundColor: theme.colors.surface3,
                                }}
                              />
                            ))}
                        </View>
                        {/* Pick label */}
                        <Text style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.foreground,
                          textAlign: 'center',
                        }} numberOfLines={1}>
                          {index === 0 ? 'Pick #1' : index === 1 ? 'Pick #2' : 'Pick #3'}
                        </Text>
                        <Text style={{
                          fontSize: 9,
                          color: theme.colors.muted,
                          textAlign: 'center',
                          marginTop: 2,
                        }} numberOfLines={1}>
                          {index === 0 ? 'Safe' : index === 1 ? 'Different' : 'Wildcard'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
                      marginTop: 12,
                    }}>
                    <TouchableOpacity
                      style={[globalStyles.buttonPrimary, {width: 120}]}
                      onPress={() => setFeedbackModalVisible(true)}>
                      <Text style={globalStyles.buttonPrimaryText}>
                        Rate Outfit
                      </Text>
                    </TouchableOpacity>
                    {/*
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
                      <Text style={[globalStyles.buttonPrimaryText, {backgroundColor: 'disabled'}]}>
                        Try On
                      </Text>
                    </TouchableOpacity> */}

                    {/* <TouchableOpacity
                      style={[
                        globalStyles.buttonPrimary,
                        {width: 120, opacity: isDisabled ? 0.5 : 1}, // 👈 fade if disabled
                      ]}
                      disabled={isDisabled} // 👈 this is what actually disables the button
                      onPress={() =>
                        navigate('TryOnOverlay', {
                          outfit: {top, bottom, shoes},
                          userPhotoUri: Image.resolveAssetSource(
                            require('../assets/images/full-body-temp1.png'),
                          ).uri,
                        })
                      }>
                      <Text
                        style={[
                          globalStyles.buttonPrimaryText,
                          {color: isDisabled ? '#999' : '#fff'}, // 👈 text color change optional
                        ]}>
                        Try On
                      </Text>
                    </TouchableOpacity> */}

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

                  {/* AI Outfit v2: New Outfit & All Done buttons */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: 400,
                      alignSelf: 'center',
                      marginTop: 16,
                      gap: 12,
                    }}>
                    {/* New Outfit - creates fresh session */}
                    <TouchableOpacity
                      style={[
                        globalStyles.buttonPrimary,
                        {flex: 1},
                      ]}
                      onPress={handleV2Generate}
                      disabled={loading}>
                      <Text style={globalStyles.buttonPrimaryText}>
                        {loading ? 'Creating…' : 'Remix Outfit'}
                      </Text>
                    </TouchableOpacity>

                    {/* All Done - clears and returns to entry */}
                    <TouchableOpacity
                      style={[
                        globalStyles.buttonSecondary,
                        {flex: 1},
                      ]}
                      onPress={() => {
                        clear();
                        setLockedItem(null);
                        setSelectedMoodLabel(null);
                        setSelectedMoodPrompt(null);
                        setOutfitPrompt('');
                        setSessionId(null);
                      }}>
                      <Text style={globalStyles.buttonSecondaryText}>
                        All Done
                      </Text>
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
                  {/* 🛍️ Updated CTA header */}
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: '700',
                      fontSize: 16,
                      marginBottom: 4,
                    }}>
                    🛍️ Complete the Look
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.foreground,
                      fontSize: 15,
                      textAlign: 'center',
                      marginBottom: 16,
                    }}>
                    We couldn’t find a{' '}
                    <Text style={{fontWeight: '600'}}>{current.missing}</Text>{' '}
                    in your wardrobe. Tap below to browse curated options
                    online:
                  </Text>

                  {/* 🛍️ Premium Horizontal Retailer Row */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingVertical: 4,
                      paddingHorizontal: 4,
                    }}>
                    {getShoppingLinks(current.missing!).map(link => (
                      <TouchableOpacity
                        key={link.name}
                        onPress={async () => {
                          // 📊 Track outbound click before opening
                          try {
                            await fetch(
                              `${API_BASE_URL}/analytics/track-click`,
                              {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                  user_id: userId,
                                  retailer: link.name,
                                  query: current.missing,
                                  timestamp: new Date().toISOString(),
                                }),
                              },
                            );
                          } catch (e) {
                            console.warn('Tracking failed', e);
                          }

                          // 📖 Open in in-app Reader
                          setShopReaderUrl(link.url);
                          setShopReaderTitle(
                            `Find ${current.missing} on ${link.name}`,
                          );
                        }}
                        activeOpacity={0.9}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme.colors.surface3,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 20,
                          marginRight: 12,
                          shadowColor: '#000',
                          shadowOpacity: 0.08,
                          shadowRadius: 4,
                          elevation: 2,
                        }}>
                        <MaterialIcons
                          name="storefront"
                          size={18}
                          color={theme.colors.primary}
                          style={{marginRight: 6}}
                        />
                        <Text
                          style={{
                            color: theme.colors.primary,
                            fontWeight: '600',
                            fontSize: 14,
                          }}>
                          {link.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Optional "More" button */}
                  <TouchableOpacity
                    disabled // 👈 disables press interaction
                    style={{
                      marginTop: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      backgroundColor: theme.colors.surface3, // 👈 softer color so it looks inactive
                      opacity: 0.5, // 👈 visually indicate disabled
                    }}>
                    <Text
                      style={{
                        color: theme.colors.muted, // 👈 use muted text to match disabled state
                        fontWeight: '600',
                      }}>
                      View More Retailers →
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
                    const accessToken = await getAccessToken();
                    const response = await fetch(
                      `${API_BASE_URL}/custom-outfits`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${accessToken}`,
                        },
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
                      const errorText = await response.text();
                      console.error('Save outfit failed:', response.status, errorText);
                      throw new Error(
                        `Failed to save outfit: ${response.status}`,
                      );
                    }
                    await response.json();
                    // Invalidate saved-outfits cache so SavedOutfitsScreen refreshes
                    queryClient.invalidateQueries({queryKey: ['saved-outfits', userId]});
                  } catch (err) {
                    console.error('Error saving outfit:', err);
                  } finally {
                    setShowNameModal(false);
                    setPendingSaveOutfit(null);
                  }
                }
              }}
            />
          </View>
        </View>

      <ReaderModal
        visible={!!shopReaderUrl}
        url={shopReaderUrl || undefined}
        title={shopReaderTitle || 'Shop'}
        onClose={() => {
          setShopReaderUrl(null);
          setShopReaderTitle(null);
        }}
      />

      {/* AI Outfit v2: Wardrobe Picker Modal */}
      <WardrobePickerModal
        visible={showWardrobePicker}
        onClose={() => {
          setShowWardrobePicker(false);
          setSwapSection(null);
        }}
        onSelectItem={handleWardrobeItemSelect}
        defaultCategory={
          swapSection === 'top' ? 'Tops' :
          swapSection === 'bottom' ? 'Bottoms' :
          swapSection === 'shoes' ? 'Shoes' :
          undefined
        }
      />
    </View>
  );
}


///////////////////////////

// KEEP VERSION 1 WITH NO SWAP OUT INPUT FIELDS OR BUTTON

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
// import * as Animatable from 'react-native-animatable';
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
// import {fontScale, moderateScale} from '../utils/scale';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import uuid from 'react-native-uuid';
// import {
//   useOutfitApi,
//   WardrobeItem,
//   apiItemToUI,
//   pickFirstByCategory,
// } from '../hooks/useOutfitApi';
// import {API_BASE_URL} from '../config/api';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

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

//   // 📰 Shopping Reader Modal
//   const [shopReaderUrl, setShopReaderUrl] = useState<string | null>(null);
//   const [shopReaderTitle, setShopReaderTitle] = useState<string | null>(null);

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

//   const isDisabled = !top || !bottom || !shoes;

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

//   // 🔁 Replace your existing getShoppingLinks() with this version
//   const AFFILIATE_ID = 'YOUR_AFFILIATE_ID'; // replace later with real IDs

//   const getShoppingLinks = (missing: string) => {
//     const query = encodeURIComponent(missing);
//     const utm = `utm_source=stylhelpr&utm_medium=app&utm_campaign=outfit_suggestion`;

//     return [
//       {
//         name: 'Farfetch',
//         url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&${utm}&affid=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Mr Porter',
//         url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&${utm}&affiliate=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Nordstrom',
//         url: `https://www.nordstrom.com/sr?keyword=${query}&${utm}`,
//       },
//       {
//         name: 'Matches Fashion',
//         url: `https://www.matchesfashion.com/us/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'SSENSE',
//         url: `https://www.ssense.com/en-us/men/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'Google Shop',
//         url: `https://www.google.com/search?q=${query}&tbm=shop&${utm}`,
//       },
//     ];
//   };

//   // const getShoppingLinks = (missing: string) => {
//   //   const query = encodeURIComponent(missing);
//   //   return [
//   //     {
//   //       name: 'Farfetch',
//   //       url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Mr Porter',
//   //       url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Nordstrom',
//   //       url: `https://www.nordstrom.com/sr?keyword=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Matches Fashion',
//   //       url: `https://www.matchesfashion.com/us/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'SSENSE',
//   //       url: `https://www.ssense.com/en-us/men/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Google Shopping',
//   //       url: `https://www.google.com/search?q=${query}&tbm=shop&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //   ];
//   // };

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
//       height: 325,
//       borderRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//       elevation: 3,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'contain',
//     },
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0, 0, 0, 0.29)',
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
//     itemName: {fontSize: 18, fontWeight: '600', color: theme.colors.foreground},
//     whyText: {
//       fontSize: 18,
//       color: theme.colors.button1,
//       marginTop: 6,
//       fontWeight: '500',
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
//       style={[
//         styles.cardOverlay,
//         globalStyles.cardStyles3,
//         {backgroundColor: theme.colors.surface3},
//       ]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View
//         style={[
//           styles.categoryPill,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
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
//         {backgroundColor: theme.colors.background, paddingBottom: 150},
//       ]}>
//       <View className="sectionTitle">
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}> Style Me</Text>
//         </View>

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: moderateScale(tokens.spacing.xxl),
//             marginBottom: moderateScale(tokens.spacing.sm2),
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: fontScale(tokens.fontSize.md),
//               color: theme.colors.foreground,
//               fontWeight: tokens.fontWeight.medium,
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
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
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                   },
//                 ]}>
//                 <TextInput
//                   placeholder="What kind of an outfit are you looking for?"
//                   placeholderTextColor={theme.colors.muted}
//                   style={[
//                     globalStyles.promptInput,
//                     {color: theme.colors.foreground, flex: 1},
//                   ]}
//                   value={lastSpeech}
//                   onChangeText={setLastSpeech}
//                 />

//                 {/* ✅ Clear Button - one tap fix */}
//                 {lastSpeech.length > 0 && (
//                   <TouchableOpacity
//                     onPress={async () => {
//                       try {
//                         // ✅ Stop any ongoing recognition
//                         await Voice.stop();
//                         // ✅ Cancel to flush partial results
//                         await Voice.cancel();
//                       } catch (e) {
//                         console.warn('Voice stop/cancel error', e);
//                       }

//                       // ✅ Clear after a short delay to avoid ghost text from final callbacks
//                       setTimeout(() => {
//                         setLastSpeech('');
//                       }, 100);
//                     }}
//                     style={{paddingHorizontal: 8}}>
//                     <MaterialIcons
//                       name="close"
//                       size={22}
//                       color={theme.colors.foreground2}
//                     />
//                   </TouchableOpacity>
//                 )}

//                 {/* 🎙️ Mic Button */}
//                 <TouchableOpacity onPress={handleVoiceStart}>
//                   <MaterialIcons
//                     name="keyboard-voice"
//                     size={22}
//                     color={theme.colors.foreground}
//                     style={{marginRight: 6}}
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
//                       marginTop: 12,
//                     }}>
//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => setFeedbackModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         Rate Outfit
//                       </Text>
//                     </TouchableOpacity>
//                     {/*
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
//                       <Text style={[globalStyles.buttonPrimaryText, {backgroundColor: 'disabled'}]}>
//                         Try On
//                       </Text>
//                     </TouchableOpacity> */}

//                     {/* <TouchableOpacity
//                       style={[
//                         globalStyles.buttonPrimary,
//                         {width: 120, opacity: isDisabled ? 0.5 : 1}, // 👈 fade if disabled
//                       ]}
//                       disabled={isDisabled} // 👈 this is what actually disables the button
//                       onPress={() =>
//                         navigate('TryOnOverlay', {
//                           outfit: {top, bottom, shoes},
//                           userPhotoUri: Image.resolveAssetSource(
//                             require('../assets/images/full-body-temp1.png'),
//                           ).uri,
//                         })
//                       }>
//                       <Text
//                         style={[
//                           globalStyles.buttonPrimaryText,
//                           {color: isDisabled ? '#999' : '#fff'}, // 👈 text color change optional
//                         ]}>
//                         Try On
//                       </Text>
//                     </TouchableOpacity> */}

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
//                   {/* 🛍️ Updated CTA header */}
//                   <Text
//                     style={{
//                       color: theme.colors.primary,
//                       fontWeight: '700',
//                       fontSize: 16,
//                       marginBottom: 4,
//                     }}>
//                     🛍️ Complete the Look
//                   </Text>

//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 15,
//                       textAlign: 'center',
//                       marginBottom: 16,
//                     }}>
//                     We couldn’t find a{' '}
//                     <Text style={{fontWeight: '600'}}>{current.missing}</Text>{' '}
//                     in your wardrobe. Tap below to browse curated options
//                     online:
//                   </Text>

//                   {/* 🛍️ Premium Horizontal Retailer Row */}
//                   <ScrollView
//                     horizontal
//                     showsHorizontalScrollIndicator={false}
//                     contentContainerStyle={{
//                       paddingVertical: 4,
//                       paddingHorizontal: 4,
//                     }}>
//                     {getShoppingLinks(current.missing!).map(link => (
//                       <TouchableOpacity
//                         key={link.name}
//                         onPress={async () => {
//                           // 📊 Track outbound click before opening
//                           try {
//                             await fetch(
//                               `${API_BASE_URL}/analytics/track-click`,
//                               {
//                                 method: 'POST',
//                                 headers: {'Content-Type': 'application/json'},
//                                 body: JSON.stringify({
//                                   user_id: userId,
//                                   retailer: link.name,
//                                   query: current.missing,
//                                   timestamp: new Date().toISOString(),
//                                 }),
//                               },
//                             );
//                           } catch (e) {
//                             console.warn('Tracking failed', e);
//                           }

//                           // 📖 Open in in-app Reader
//                           setShopReaderUrl(link.url);
//                           setShopReaderTitle(
//                             `Find ${current.missing} on ${link.name}`,
//                           );
//                         }}
//                         activeOpacity={0.9}
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           backgroundColor: theme.colors.surface3,
//                           paddingVertical: 10,
//                           paddingHorizontal: 16,
//                           borderRadius: 20,
//                           marginRight: 12,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.08,
//                           shadowRadius: 4,
//                           elevation: 2,
//                         }}>
//                         <MaterialIcons
//                           name="storefront"
//                           size={18}
//                           color={theme.colors.primary}
//                           style={{marginRight: 6}}
//                         />
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 14,
//                           }}>
//                           {link.name}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>

//                   {/* Optional "More" button */}
//                   <TouchableOpacity
//                     disabled // 👈 disables press interaction
//                     style={{
//                       marginTop: 12,
//                       paddingVertical: 10,
//                       paddingHorizontal: 20,
//                       borderRadius: 12,
//                       backgroundColor: theme.colors.surface3, // 👈 softer color so it looks inactive
//                       opacity: 0.5, // 👈 visually indicate disabled
//                     }}>
//                     <Text
//                       style={{
//                         color: theme.colors.muted, // 👈 use muted text to match disabled state
//                         fontWeight: '600',
//                       }}>
//                       View More Retailers →
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

//       <ReaderModal
//         visible={!!shopReaderUrl}
//         url={shopReaderUrl || undefined}
//         title={shopReaderTitle || 'Shop'}
//         onClose={() => {
//           setShopReaderUrl(null);
//           setShopReaderTitle(null);
//         }}
//       />
//     </View>
//   );
// }

/////////////////////

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
// import * as Animatable from 'react-native-animatable';
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
// import {fontScale, moderateScale} from '../utils/scale';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import uuid from 'react-native-uuid';
// import {
//   useOutfitApi,
//   WardrobeItem,
//   apiItemToUI,
//   pickFirstByCategory,
// } from '../hooks/useOutfitApi';
// import {API_BASE_URL} from '../config/api';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

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

//   // 📰 Shopping Reader Modal
//   const [shopReaderUrl, setShopReaderUrl] = useState<string | null>(null);
//   const [shopReaderTitle, setShopReaderTitle] = useState<string | null>(null);

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

//   const isDisabled = !top || !bottom || !shoes;

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

//   // 🔁 Replace your existing getShoppingLinks() with this version
//   const AFFILIATE_ID = 'YOUR_AFFILIATE_ID'; // replace later with real IDs

//   const getShoppingLinks = (missing: string) => {
//     const query = encodeURIComponent(missing);
//     const utm = `utm_source=stylhelpr&utm_medium=app&utm_campaign=outfit_suggestion`;

//     return [
//       {
//         name: 'Farfetch',
//         url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&${utm}&affid=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Mr Porter',
//         url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&${utm}&affiliate=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Nordstrom',
//         url: `https://www.nordstrom.com/sr?keyword=${query}&${utm}`,
//       },
//       {
//         name: 'Matches Fashion',
//         url: `https://www.matchesfashion.com/us/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'SSENSE',
//         url: `https://www.ssense.com/en-us/men/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'Google Shop',
//         url: `https://www.google.com/search?q=${query}&tbm=shop&${utm}`,
//       },
//     ];
//   };

//   // const getShoppingLinks = (missing: string) => {
//   //   const query = encodeURIComponent(missing);
//   //   return [
//   //     {
//   //       name: 'Farfetch',
//   //       url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Mr Porter',
//   //       url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Nordstrom',
//   //       url: `https://www.nordstrom.com/sr?keyword=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Matches Fashion',
//   //       url: `https://www.matchesfashion.com/us/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'SSENSE',
//   //       url: `https://www.ssense.com/en-us/men/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Google Shopping',
//   //       url: `https://www.google.com/search?q=${query}&tbm=shop&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //   ];
//   // };

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
//       height: 325,
//       borderRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//       elevation: 3,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'contain',
//     },
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0, 0, 0, 0.29)',
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
//     itemName: {fontSize: 18, fontWeight: '600', color: theme.colors.foreground},
//     whyText: {
//       fontSize: 18,
//       color: theme.colors.button1,
//       marginTop: 6,
//       fontWeight: '500',
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
//       style={[
//         styles.cardOverlay,
//         globalStyles.cardStyles3,
//         {backgroundColor: theme.colors.surface3},
//       ]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View
//         style={[
//           styles.categoryPill,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
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
//         {backgroundColor: theme.colors.background, paddingBottom: 150},
//       ]}>
//       <View className="sectionTitle">
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}> Style Me</Text>
//         </View>

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: moderateScale(tokens.spacing.xxl),
//             marginBottom: moderateScale(tokens.spacing.sm2),
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: fontScale(tokens.fontSize.md),
//               color: theme.colors.foreground,
//               fontWeight: tokens.fontWeight.medium,
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
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
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                   },
//                 ]}>
//                 <TextInput
//                   placeholder="What kind of an outfit are you looking for?"
//                   placeholderTextColor={theme.colors.muted}
//                   style={[
//                     globalStyles.promptInput,
//                     {color: theme.colors.foreground, flex: 1},
//                   ]}
//                   value={lastSpeech}
//                   onChangeText={setLastSpeech}
//                 />

//                 {/* ✅ Clear Button - one tap fix */}
//                 {lastSpeech.length > 0 && (
//                   <TouchableOpacity
//                     onPress={async () => {
//                       try {
//                         // ✅ Stop any ongoing recognition
//                         await Voice.stop();
//                         // ✅ Cancel to flush partial results
//                         await Voice.cancel();
//                       } catch (e) {
//                         console.warn('Voice stop/cancel error', e);
//                       }

//                       // ✅ Clear after a short delay to avoid ghost text from final callbacks
//                       setTimeout(() => {
//                         setLastSpeech('');
//                       }, 100);
//                     }}
//                     style={{paddingHorizontal: 8}}>
//                     <MaterialIcons
//                       name="close"
//                       size={22}
//                       color={theme.colors.foreground2}
//                     />
//                   </TouchableOpacity>
//                 )}

//                 {/* 🎙️ Mic Button */}
//                 <TouchableOpacity onPress={handleVoiceStart}>
//                   <MaterialIcons
//                     name="keyboard-voice"
//                     size={22}
//                     color={theme.colors.foreground}
//                     style={{marginRight: 6}}
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
//                       marginTop: 12,
//                     }}>
//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => setFeedbackModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         Rate Outfit
//                       </Text>
//                     </TouchableOpacity>
//                     {/*
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
//                       <Text style={[globalStyles.buttonPrimaryText, {backgroundColor: 'disabled'}]}>
//                         Try On
//                       </Text>
//                     </TouchableOpacity> */}

//                     <TouchableOpacity
//                       style={[
//                         globalStyles.buttonPrimary,
//                         {width: 120, opacity: isDisabled ? 0.5 : 1}, // 👈 fade if disabled
//                       ]}
//                       disabled={isDisabled} // 👈 this is what actually disables the button
//                       onPress={() =>
//                         navigate('TryOnOverlay', {
//                           outfit: {top, bottom, shoes},
//                           userPhotoUri: Image.resolveAssetSource(
//                             require('../assets/images/full-body-temp1.png'),
//                           ).uri,
//                         })
//                       }>
//                       <Text
//                         style={[
//                           globalStyles.buttonPrimaryText,
//                           {color: isDisabled ? '#999' : '#fff'}, // 👈 text color change optional
//                         ]}>
//                         Try On
//                       </Text>
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
//                   {/* 🛍️ Updated CTA header */}
//                   <Text
//                     style={{
//                       color: theme.colors.primary,
//                       fontWeight: '700',
//                       fontSize: 16,
//                       marginBottom: 4,
//                     }}>
//                     🛍️ Complete the Look
//                   </Text>

//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 15,
//                       textAlign: 'center',
//                       marginBottom: 16,
//                     }}>
//                     We couldn’t find a{' '}
//                     <Text style={{fontWeight: '600'}}>{current.missing}</Text>{' '}
//                     in your wardrobe. Tap below to browse curated options
//                     online:
//                   </Text>

//                   {/* 🛍️ Premium Horizontal Retailer Row */}
//                   <ScrollView
//                     horizontal
//                     showsHorizontalScrollIndicator={false}
//                     contentContainerStyle={{
//                       paddingVertical: 4,
//                       paddingHorizontal: 4,
//                     }}>
//                     {getShoppingLinks(current.missing!).map(link => (
//                       <TouchableOpacity
//                         key={link.name}
//                         onPress={async () => {
//                           // 📊 Track outbound click before opening
//                           try {
//                             await fetch(
//                               `${API_BASE_URL}/analytics/track-click`,
//                               {
//                                 method: 'POST',
//                                 headers: {'Content-Type': 'application/json'},
//                                 body: JSON.stringify({
//                                   user_id: userId,
//                                   retailer: link.name,
//                                   query: current.missing,
//                                   timestamp: new Date().toISOString(),
//                                 }),
//                               },
//                             );
//                           } catch (e) {
//                             console.warn('Tracking failed', e);
//                           }

//                           // 📖 Open in in-app Reader
//                           setShopReaderUrl(link.url);
//                           setShopReaderTitle(
//                             `Find ${current.missing} on ${link.name}`,
//                           );
//                         }}
//                         activeOpacity={0.9}
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           backgroundColor: theme.colors.surface3,
//                           paddingVertical: 10,
//                           paddingHorizontal: 16,
//                           borderRadius: 20,
//                           marginRight: 12,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.08,
//                           shadowRadius: 4,
//                           elevation: 2,
//                         }}>
//                         <MaterialIcons
//                           name="storefront"
//                           size={18}
//                           color={theme.colors.primary}
//                           style={{marginRight: 6}}
//                         />
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 14,
//                           }}>
//                           {link.name}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>

//                   {/* Optional "More" button */}
//                   <TouchableOpacity
//                     disabled // 👈 disables press interaction
//                     style={{
//                       marginTop: 12,
//                       paddingVertical: 10,
//                       paddingHorizontal: 20,
//                       borderRadius: 12,
//                       backgroundColor: theme.colors.surface3, // 👈 softer color so it looks inactive
//                       opacity: 0.5, // 👈 visually indicate disabled
//                     }}>
//                     <Text
//                       style={{
//                         color: theme.colors.muted, // 👈 use muted text to match disabled state
//                         fontWeight: '600',
//                       }}>
//                       View More Retailers →
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

//       <ReaderModal
//         visible={!!shopReaderUrl}
//         url={shopReaderUrl || undefined}
//         title={shopReaderTitle || 'Shop'}
//         onClose={() => {
//           setShopReaderUrl(null);
//           setShopReaderTitle(null);
//         }}
//       />
//     </View>
//   );
// }

/////////////////////

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
//   Animated,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import WhyPickedModal from '../components/WhyPickedModal/WhyPickedModal';
// import {useAppTheme} from '../context/ThemeContext';
// import OutfitTuningControls from '../components/OutfitTuningControls/OutfitTuningControls';
// import OutfitFeedbackModal from '../components/OutfitFeedbackModal/OutfitFeebackModal';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import OutfitNameModal from '../components/OutfitNameModal/OutfitNameModal';
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
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {
//   consumeHandoff,
//   subscribeHandoff,
//   type HandoffPayload,
// } from '../utils/handoffMailbox';
// import {getCurrentLocation, fetchWeather} from '../utils/travelWeather';

// const {height} = Dimensions.get('window');

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
//   const sid = uuid.v4() as string;

//   // ──────────────────────────────────────────────
//   // State
//   // ──────────────────────────────────────────────
//   const [visibleModal, setVisibleModal] = useState<
//     null | 'top' | 'bottom' | 'shoes'
//   >(null);
//   const [lastSpeech, setLastSpeech] = useState('');
//   const [shopReaderUrl, setShopReaderUrl] = useState<string | null>(null);
//   const [shopReaderTitle, setShopReaderTitle] = useState<string | null>(null);
//   const [weather, setWeather] = useState<'hot' | 'cold' | 'rainy' | 'auto'>(
//     'auto',
//   );
//   const [occasion, setOccasion] = useState<string>('Any');
//   const [style, setStyle] = useState<string>('Any');
//   const [useWeather, setUseWeather] = useState<boolean>(false);
//   const [useStylePrefs, setUseStylePrefs] = useState<boolean>(true);
//   const [useFeedback, setUseFeedback] = useState<boolean>(true);
//   const [styleAgent, setStyleAgent] = useState<string | null>(null);
//   const [sessionId, setSessionId] = useState<string | null>(null);
//   const [weights, setWeights] = useState<Weights>({...DEFAULT_WEIGHTS});
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

//   const {current, loading, regenerate} = useOutfitApi(userId);
//   const [showMonetizationCard, setShowMonetizationCard] = useState(false);
//   const slideAnim = useRef(new Animated.Value(height)).current;

//   const AFFILIATE_ID = 'YOUR_AFFILIATE_ID';
//   const getShoppingLinks = (missing: string) => {
//     const query = encodeURIComponent(missing);
//     const utm = `utm_source=stylhelpr&utm_medium=app&utm_campaign=outfit_suggestion`;
//     return [
//       {
//         name: 'Farfetch',
//         url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&${utm}&affid=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Mr Porter',
//         url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&${utm}&affiliate=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Nordstrom',
//         url: `https://www.nordstrom.com/sr?keyword=${query}&${utm}`,
//       },
//       {
//         name: 'Matches Fashion',
//         url: `https://www.matchesfashion.com/us/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'SSENSE',
//         url: `https://www.ssense.com/en-us/men/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'Google Shop',
//         url: `https://www.google.com/search?q=${query}&tbm=shop&${utm}`,
//       },
//     ];
//   };

//   // ──────────────────────────────────────────────
//   // Lifecycle
//   // ──────────────────────────────────────────────
//   useEffect(() => {
//     if (current?.missing) {
//       setShowMonetizationCard(true);
//       Animated.timing(slideAnim, {
//         toValue: height * 0.1,
//         duration: 550,
//         useNativeDriver: false,
//       }).start();
//     } else {
//       Animated.timing(slideAnim, {
//         toValue: height,
//         duration: 300,
//         useNativeDriver: false,
//       }).start(() => setShowMonetizationCard(false));
//     }
//   }, [current?.missing]);

//   const topApi =
//     pickFirstByCategory(current?.items, 'Tops') ??
//     pickFirstByCategory(current?.items, 'Outerwear');
//   const bottomApi = pickFirstByCategory(current?.items, 'Bottoms');
//   const shoesApi = pickFirstByCategory(current?.items, 'Shoes');

//   const top = apiItemToUI(topApi);
//   const bottom = apiItemToUI(bottomApi);
//   const shoes = apiItemToUI(shoesApi);

//   const hasOutfit = useMemo(() => {
//     const items = Array.isArray((current as any)?.outfits?.[0]?.items)
//       ? (current as any).outfits[0].items
//       : Array.isArray((current as any)?.items)
//       ? (current as any).items
//       : [];
//     return Array.isArray(items) && items.length > 0;
//   }, [current]);

//   const isDisabled = !top || !bottom || !shoes;

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     cardOverlay: {
//       width: '100%',
//       height: 325,
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
//       backgroundColor: 'rgba(0,0,0,0.3)',
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
//     floatingCard: {
//       position: 'absolute',
//       left: 20,
//       right: 20,
//       borderRadius: 20,
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 12,
//       elevation: 8,
//       zIndex: 999,
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
//       style={[
//         styles.cardOverlay,
//         globalStyles.cardStyles3,
//         {backgroundColor: theme.colors.surface3},
//       ]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View
//         style={[
//           styles.categoryPill,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
//           ]}>
//           {label}
//         </Text>
//       </View>
//       <View style={styles.overlay}>
//         <View style={globalStyles.labelContainer2}>
//           <Text
//             style={{
//               fontSize: 18,
//               fontWeight: '600',
//               color: theme.colors.foreground,
//             }}>
//             {item?.name ?? `No ${label} selected`}
//           </Text>
//           <Text
//             style={{
//               fontSize: 18,
//               color: theme.colors.button1,
//               marginTop: 6,
//               fontWeight: '500',
//             }}>
//             Why this {label}?
//           </Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
//   // ──────────────────────────────────────────────
//   // Loading State
//   // ──────────────────────────────────────────────
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

//   // ──────────────────────────────────────────────
//   // Render
//   // ──────────────────────────────────────────────
//   return (
//     <View
//       style={[
//         globalStyles.container,
//         globalStyles.screen,
//         {backgroundColor: theme.colors.background, paddingBottom: 150},
//       ]}>
//       {/* Floating 🛍️ Monetization Card */}
//       {showMonetizationCard && current?.missing && (
//         <Animated.View style={[styles.floatingCard, {top: slideAnim}]}>
//           <Text
//             style={{
//               color: theme.colors.primary,
//               fontWeight: '700',
//               fontSize: 18,
//               marginBottom: 8,
//               textAlign: 'center',
//             }}>
//             🛍️ Complete the Look
//           </Text>

//           <Text
//             style={{
//               color: theme.colors.foreground,
//               fontSize: 15,
//               textAlign: 'center',
//               marginBottom: 16,
//             }}>
//             We couldn’t find a{' '}
//             <Text style={{fontWeight: '600'}}>{current.missing}</Text> in your
//             wardrobe. Explore curated picks below 👇
//           </Text>

//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{
//               paddingVertical: 4,
//               paddingHorizontal: 4,
//             }}>
//             {getShoppingLinks(current.missing!).map(link => (
//               <TouchableOpacity
//                 key={link.name}
//                 onPress={async () => {
//                   try {
//                     await fetch(`${API_BASE_URL}/analytics/track-click`, {
//                       method: 'POST',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         user_id: userId,
//                         retailer: link.name,
//                         query: current.missing,
//                         timestamp: new Date().toISOString(),
//                       }),
//                     });
//                   } catch (e) {
//                     console.warn('Tracking failed', e);
//                   }
//                   setShopReaderUrl(link.url);
//                   setShopReaderTitle(`Find ${current.missing} on ${link.name}`);
//                 }}
//                 activeOpacity={0.9}
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   backgroundColor: theme.colors.surface3,
//                   paddingVertical: 10,
//                   paddingHorizontal: 16,
//                   borderRadius: 20,
//                   marginRight: 12,
//                   shadowColor: '#000',
//                   shadowOpacity: 0.08,
//                   shadowRadius: 4,
//                   elevation: 2,
//                 }}>
//                 <MaterialIcons
//                   name="storefront"
//                   size={18}
//                   color={theme.colors.primary}
//                   style={{marginRight: 6}}
//                 />
//                 <Text
//                   style={{
//                     color: theme.colors.primary,
//                     fontWeight: '600',
//                     fontSize: 14,
//                   }}>
//                   {link.name}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>

//           <TouchableOpacity
//             disabled
//             style={{
//               marginTop: 12,
//               paddingVertical: 10,
//               paddingHorizontal: 20,
//               borderRadius: 12,
//               backgroundColor: theme.colors.surface3,
//               opacity: 0.5,
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.muted,
//                 fontWeight: '600',
//                 textAlign: 'center',
//               }}>
//               View More Retailers →
//             </Text>
//           </TouchableOpacity>
//         </Animated.View>
//       )}

//       {/* Main Scroll Content */}
//       <ScrollView
//         contentContainerStyle={{
//           marginTop: 8,
//           paddingBottom: 40,
//           alignItems: 'center',
//         }}>
//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: 50,
//             marginBottom: 14,
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: 16,
//               color: theme.colors.foreground,
//               fontWeight: '500',
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
//         </View>

//         {/* Prompt input with mic */}
//         <View
//           style={[
//             globalStyles.promptRow,
//             {
//               height: 45,
//               marginBottom: 12,
//               paddingHorizontal: 14,
//               borderWidth: tokens.borderWidth.xl,
//               borderColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.surface3,
//               borderRadius: 20,
//             },
//           ]}>
//           <TextInput
//             placeholder="What kind of an outfit are you looking for?"
//             placeholderTextColor={theme.colors.muted}
//             style={[globalStyles.promptInput, {color: theme.colors.foreground}]}
//             value={lastSpeech}
//             onChangeText={setLastSpeech}
//           />
//           <TouchableOpacity onPress={async () => await Voice.start('en-US')}>
//             <MaterialIcons
//               name="keyboard-voice"
//               size={22}
//               color={theme.colors.foreground}
//               style={{marginRight: 30}}
//             />
//           </TouchableOpacity>
//         </View>

//         {/* Controls */}
//         <OutfitTuningControls
//           weather={weather}
//           occasion={occasion}
//           style={style}
//           onChangeWeather={v => setWeather(v as any)}
//           onChangeOccasion={setOccasion}
//           onChangeStyle={setStyle}
//           useWeather={useWeather}
//           onToggleWeather={setUseWeather}
//           useStylePrefs={useStylePrefs}
//           onToggleStylePrefs={setUseStylePrefs}
//           useFeedback={useFeedback}
//           onToggleFeedback={setUseFeedback}
//           styleAgent={styleAgent}
//           onChangeStyleAgent={setStyleAgent}
//           weights={weights}
//           onChangeWeights={setWeights}
//           onRegenerate={() => regenerate(lastSpeech)}
//           onRefine={() => {}}
//           isGenerating={loading || liveWxLoading}
//           canGenerate={lastSpeech.trim().length > 0}
//           showRefine={hasOutfit}
//         />

//         {/* Outfit cards */}
//         {hasOutfit && (
//           <>
//             {renderCard('Top', top, 'top')}
//             {renderCard('Bottom', bottom, 'bottom')}
//             {renderCard('Shoes', shoes, 'shoes')}

//             {/* CTA Buttons */}
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 width: '100%',
//                 maxWidth: 400,
//                 alignSelf: 'center',
//                 marginTop: 12,
//               }}>
//               <TouchableOpacity
//                 style={[globalStyles.buttonPrimary, {width: 120}]}
//                 onPress={() => setFeedbackModalVisible(true)}>
//                 <Text style={globalStyles.buttonPrimaryText}>Rate Outfit</Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {width: 120, opacity: isDisabled ? 0.5 : 1},
//                 ]}
//                 disabled={isDisabled}
//                 onPress={() =>
//                   navigate('TryOnOverlay', {
//                     outfit: {top, bottom, shoes},
//                   })
//                 }>
//                 <Text
//                   style={[
//                     globalStyles.buttonPrimaryText,
//                     {color: isDisabled ? '#999' : '#fff'},
//                   ]}>
//                   Try On
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[globalStyles.buttonPrimary, {width: 120}]}
//                 onPress={() => {
//                   if (top && bottom && shoes) {
//                     setPendingSaveOutfit({top, bottom, shoes});
//                     setShowNameModal(true);
//                   }
//                 }}>
//                 <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//               </TouchableOpacity>
//             </View>
//           </>
//         )}
//       </ScrollView>

//       {/* Modals */}
//       {hasOutfit && (
//         <>
//           <WhyPickedModal
//             visible={visibleModal === 'top'}
//             item={top}
//             reasons={[]}
//             section="Top"
//             onClose={() => setVisibleModal(null)}
//           />
//           <WhyPickedModal
//             visible={visibleModal === 'bottom'}
//             item={bottom}
//             reasons={[]}
//             section="Bottom"
//             onClose={() => setVisibleModal(null)}
//           />
//           <WhyPickedModal
//             visible={visibleModal === 'shoes'}
//             item={shoes}
//             reasons={[]}
//             section="Shoes"
//             onClose={() => setVisibleModal(null)}
//           />
//         </>
//       )}

//       <OutfitFeedbackModal
//         visible={feedbackModalVisible}
//         onClose={() => setFeedbackModalVisible(false)}
//         feedbackData={feedbackData}
//         setFeedbackData={setFeedbackData}
//         toggleTag={() => {}}
//         REASON_TAGS={[]}
//         theme={theme}
//         apiBaseUrl={API_BASE_URL}
//         userId={userId}
//         requestId={null}
//         outfitId={null}
//         outfitItemIds={[]}
//       />

//       <OutfitNameModal
//         visible={showNameModal}
//         onClose={() => {
//           setShowNameModal(false);
//           setPendingSaveOutfit(null);
//         }}
//         onSave={() => {}}
//       />

//       <ReaderModal
//         visible={!!shopReaderUrl}
//         url={shopReaderUrl || undefined}
//         title={shopReaderTitle || 'Shop'}
//         onClose={() => {
//           setShopReaderUrl(null);
//           setShopReaderTitle(null);
//         }}
//       />
//     </View>
//   );
// }

/////////////////////

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
// import * as Animatable from 'react-native-animatable';
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
// import ReaderModal from '../components/FashionFeed/ReaderModal';

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

//   // 📰 Shopping Reader Modal
//   const [shopReaderUrl, setShopReaderUrl] = useState<string | null>(null);
//   const [shopReaderTitle, setShopReaderTitle] = useState<string | null>(null);

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

//   const isDisabled = !top || !bottom || !shoes;

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

//   // 🔁 Replace your existing getShoppingLinks() with this version
//   const AFFILIATE_ID = 'YOUR_AFFILIATE_ID'; // replace later with real IDs

//   const getShoppingLinks = (missing: string) => {
//     const query = encodeURIComponent(missing);
//     const utm = `utm_source=stylhelpr&utm_medium=app&utm_campaign=outfit_suggestion`;

//     return [
//       {
//         name: 'Farfetch',
//         url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&${utm}&affid=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Mr Porter',
//         url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&${utm}&affiliate=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Nordstrom',
//         url: `https://www.nordstrom.com/sr?keyword=${query}&${utm}`,
//       },
//       {
//         name: 'Matches Fashion',
//         url: `https://www.matchesfashion.com/us/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'SSENSE',
//         url: `https://www.ssense.com/en-us/men/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'Google Shop',
//         url: `https://www.google.com/search?q=${query}&tbm=shop&${utm}`,
//       },
//     ];
//   };

//   // const getShoppingLinks = (missing: string) => {
//   //   const query = encodeURIComponent(missing);
//   //   return [
//   //     {
//   //       name: 'Farfetch',
//   //       url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Mr Porter',
//   //       url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Nordstrom',
//   //       url: `https://www.nordstrom.com/sr?keyword=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Matches Fashion',
//   //       url: `https://www.matchesfashion.com/us/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'SSENSE',
//   //       url: `https://www.ssense.com/en-us/men/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Google Shopping',
//   //       url: `https://www.google.com/search?q=${query}&tbm=shop&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //   ];
//   // };

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
//       height: 325,
//       borderRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//       elevation: 3,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'contain',
//     },
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0, 0, 0, 0.29)',
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
//     itemName: {fontSize: 18, fontWeight: '600', color: theme.colors.foreground},
//     whyText: {
//       fontSize: 18,
//       color: theme.colors.button1,
//       marginTop: 6,
//       fontWeight: '500',
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
//       style={[
//         styles.cardOverlay,
//         globalStyles.cardStyles3,
//         {backgroundColor: theme.colors.surface3},
//       ]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View
//         style={[
//           styles.categoryPill,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
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
//         {backgroundColor: theme.colors.background, paddingBottom: 150},
//       ]}>
//       <View className="sectionTitle">
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}> Style Me</Text>
//         </View>

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: 50,
//             marginBottom: 14,
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: 16,
//               color: theme.colors.foreground,
//               fontWeight: '500',
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
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
//                       marginTop: 12,
//                     }}>
//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => setFeedbackModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         Rate Outfit
//                       </Text>
//                     </TouchableOpacity>
//                     {/*
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
//                       <Text style={[globalStyles.buttonPrimaryText, {backgroundColor: 'disabled'}]}>
//                         Try On
//                       </Text>
//                     </TouchableOpacity> */}

//                     <TouchableOpacity
//                       style={[
//                         globalStyles.buttonPrimary,
//                         {width: 120, opacity: isDisabled ? 0.5 : 1}, // 👈 fade if disabled
//                       ]}
//                       disabled={isDisabled} // 👈 this is what actually disables the button
//                       onPress={() =>
//                         navigate('TryOnOverlay', {
//                           outfit: {top, bottom, shoes},
//                           userPhotoUri: Image.resolveAssetSource(
//                             require('../assets/images/full-body-temp1.png'),
//                           ).uri,
//                         })
//                       }>
//                       <Text
//                         style={[
//                           globalStyles.buttonPrimaryText,
//                           {color: isDisabled ? '#999' : '#fff'}, // 👈 text color change optional
//                         ]}>
//                         Try On
//                       </Text>
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
//                   {/* 🛍️ Updated CTA header */}
//                   <Text
//                     style={{
//                       color: theme.colors.primary,
//                       fontWeight: '700',
//                       fontSize: 16,
//                       marginBottom: 4,
//                     }}>
//                     🛍️ Complete the Look
//                   </Text>

//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 15,
//                       textAlign: 'center',
//                       marginBottom: 16,
//                     }}>
//                     We couldn’t find a{' '}
//                     <Text style={{fontWeight: '600'}}>{current.missing}</Text>{' '}
//                     in your wardrobe. Tap below to browse curated options
//                     online:
//                   </Text>

//                   {/* 🛍️ Premium Horizontal Retailer Row */}
//                   <ScrollView
//                     horizontal
//                     showsHorizontalScrollIndicator={false}
//                     contentContainerStyle={{
//                       paddingVertical: 4,
//                       paddingHorizontal: 4,
//                     }}>
//                     {getShoppingLinks(current.missing!).map(link => (
//                       <TouchableOpacity
//                         key={link.name}
//                         onPress={async () => {
//                           // 📊 Track outbound click before opening
//                           try {
//                             await fetch(
//                               `${API_BASE_URL}/analytics/track-click`,
//                               {
//                                 method: 'POST',
//                                 headers: {'Content-Type': 'application/json'},
//                                 body: JSON.stringify({
//                                   user_id: userId,
//                                   retailer: link.name,
//                                   query: current.missing,
//                                   timestamp: new Date().toISOString(),
//                                 }),
//                               },
//                             );
//                           } catch (e) {
//                             console.warn('Tracking failed', e);
//                           }

//                           // 📖 Open in in-app Reader
//                           setShopReaderUrl(link.url);
//                           setShopReaderTitle(
//                             `Find ${current.missing} on ${link.name}`,
//                           );
//                         }}
//                         activeOpacity={0.9}
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           backgroundColor: theme.colors.surface3,
//                           paddingVertical: 10,
//                           paddingHorizontal: 16,
//                           borderRadius: 20,
//                           marginRight: 12,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.08,
//                           shadowRadius: 4,
//                           elevation: 2,
//                         }}>
//                         <MaterialIcons
//                           name="storefront"
//                           size={18}
//                           color={theme.colors.primary}
//                           style={{marginRight: 6}}
//                         />
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 14,
//                           }}>
//                           {link.name}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>

//                   {/* Optional "More" button */}
//                   <TouchableOpacity
//                     disabled // 👈 disables press interaction
//                     style={{
//                       marginTop: 12,
//                       paddingVertical: 10,
//                       paddingHorizontal: 20,
//                       borderRadius: 12,
//                       backgroundColor: theme.colors.surface3, // 👈 softer color so it looks inactive
//                       opacity: 0.5, // 👈 visually indicate disabled
//                     }}>
//                     <Text
//                       style={{
//                         color: theme.colors.muted, // 👈 use muted text to match disabled state
//                         fontWeight: '600',
//                       }}>
//                       View More Retailers →
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

//       <ReaderModal
//         visible={!!shopReaderUrl}
//         url={shopReaderUrl || undefined}
//         title={shopReaderTitle || 'Shop'}
//         onClose={() => {
//           setShopReaderUrl(null);
//           setShopReaderTitle(null);
//         }}
//       />
//     </View>
//   );
// }

//////////////////////

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
// import * as Animatable from 'react-native-animatable';
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
// import ReaderModal from '../components/FashionFeed/ReaderModal';

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

//   // 📰 Shopping Reader Modal
//   const [shopReaderUrl, setShopReaderUrl] = useState<string | null>(null);
//   const [shopReaderTitle, setShopReaderTitle] = useState<string | null>(null);

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

//   const isDisabled = !top || !bottom || !shoes;

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

//   // 🔁 Replace your existing getShoppingLinks() with this version
//   const AFFILIATE_ID = 'YOUR_AFFILIATE_ID'; // replace later with real IDs

//   const getShoppingLinks = (missing: string) => {
//     const query = encodeURIComponent(missing);
//     const utm = `utm_source=stylhelpr&utm_medium=app&utm_campaign=outfit_suggestion`;

//     return [
//       {
//         name: 'Farfetch',
//         url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&${utm}&affid=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Mr Porter',
//         url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&${utm}&affiliate=${AFFILIATE_ID}`,
//       },
//       {
//         name: 'Nordstrom',
//         url: `https://www.nordstrom.com/sr?keyword=${query}&${utm}`,
//       },
//       {
//         name: 'Matches Fashion',
//         url: `https://www.matchesfashion.com/us/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'SSENSE',
//         url: `https://www.ssense.com/en-us/men/search?q=${query}&${utm}`,
//       },
//       {
//         name: 'Google Shop',
//         url: `https://www.google.com/search?q=${query}&tbm=shop&${utm}`,
//       },
//     ];
//   };

//   // const getShoppingLinks = (missing: string) => {
//   //   const query = encodeURIComponent(missing);
//   //   return [
//   //     {
//   //       name: 'Farfetch',
//   //       url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Mr Porter',
//   //       url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Nordstrom',
//   //       url: `https://www.nordstrom.com/sr?keyword=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Matches Fashion',
//   //       url: `https://www.matchesfashion.com/us/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'SSENSE',
//   //       url: `https://www.ssense.com/en-us/men/search?q=${query}&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //     {
//   //       name: 'Google Shopping',
//   //       url: `https://www.google.com/search?q=${query}&tbm=shop&utm_source=stylhelpr&utm_medium=affiliate`,
//   //     },
//   //   ];
//   // };

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
//       height: 325,
//       borderRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//       elevation: 3,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'contain',
//     },
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0, 0, 0, 0.29)',
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
//     itemName: {fontSize: 18, fontWeight: '600', color: theme.colors.foreground},
//     whyText: {
//       fontSize: 18,
//       color: theme.colors.button1,
//       marginTop: 6,
//       fontWeight: '500',
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
//       style={[
//         styles.cardOverlay,
//         globalStyles.cardStyles3,
//         {backgroundColor: theme.colors.surface3},
//       ]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View
//         style={[
//           styles.categoryPill,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
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
//         {backgroundColor: theme.colors.background, paddingBottom: 150},
//       ]}>
//       <View className="sectionTitle">
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}> Style Me</Text>
//         </View>

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: 50,
//             marginBottom: 14,
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: 16,
//               color: theme.colors.foreground,
//               fontWeight: '500',
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
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
//                       marginTop: 12,
//                     }}>
//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => setFeedbackModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         Rate Outfit
//                       </Text>
//                     </TouchableOpacity>
//                     {/*
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
//                       <Text style={[globalStyles.buttonPrimaryText, {backgroundColor: 'disabled'}]}>
//                         Try On
//                       </Text>
//                     </TouchableOpacity> */}

//                     <TouchableOpacity
//                       style={[
//                         globalStyles.buttonPrimary,
//                         {width: 120, opacity: isDisabled ? 0.5 : 1}, // 👈 fade if disabled
//                       ]}
//                       disabled={isDisabled} // 👈 this is what actually disables the button
//                       onPress={() =>
//                         navigate('TryOnOverlay', {
//                           outfit: {top, bottom, shoes},
//                           userPhotoUri: Image.resolveAssetSource(
//                             require('../assets/images/full-body-temp1.png'),
//                           ).uri,
//                         })
//                       }>
//                       <Text
//                         style={[
//                           globalStyles.buttonPrimaryText,
//                           {color: isDisabled ? '#999' : '#fff'}, // 👈 text color change optional
//                         ]}>
//                         Try On
//                       </Text>
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
//                   {/* 🛍️ Updated CTA header */}
//                   <Text
//                     style={{
//                       color: theme.colors.primary,
//                       fontWeight: '700',
//                       fontSize: 16,
//                       marginBottom: 4,
//                     }}>
//                     🛍️ Complete the Look
//                   </Text>

//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 15,
//                       textAlign: 'center',
//                       marginBottom: 16,
//                     }}>
//                     We couldn’t find a{' '}
//                     <Text style={{fontWeight: '600'}}>{current.missing}</Text>{' '}
//                     in your wardrobe. Tap below to browse curated options
//                     online:
//                   </Text>

//                   {/* 🛍️ Premium Horizontal Retailer Row */}
//                   <ScrollView
//                     horizontal
//                     showsHorizontalScrollIndicator={false}
//                     contentContainerStyle={{
//                       paddingVertical: 4,
//                       paddingHorizontal: 4,
//                     }}>
//                     {getShoppingLinks(current.missing!).map(link => (
//                       <TouchableOpacity
//                         key={link.name}
//                         onPress={async () => {
//                           // 📊 Track outbound click before opening
//                           try {
//                             await fetch(
//                               `${API_BASE_URL}/analytics/track-click`,
//                               {
//                                 method: 'POST',
//                                 headers: {'Content-Type': 'application/json'},
//                                 body: JSON.stringify({
//                                   user_id: userId,
//                                   retailer: link.name,
//                                   query: current.missing,
//                                   timestamp: new Date().toISOString(),
//                                 }),
//                               },
//                             );
//                           } catch (e) {
//                             console.warn('Tracking failed', e);
//                           }

//                           // 📖 Open in in-app Reader
//                           setShopReaderUrl(link.url);
//                           setShopReaderTitle(
//                             `Find ${current.missing} on ${link.name}`,
//                           );
//                         }}
//                         activeOpacity={0.9}
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           backgroundColor: theme.colors.surface3,
//                           paddingVertical: 10,
//                           paddingHorizontal: 16,
//                           borderRadius: 20,
//                           marginRight: 12,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.08,
//                           shadowRadius: 4,
//                           elevation: 2,
//                         }}>
//                         <MaterialIcons
//                           name="storefront"
//                           size={18}
//                           color={theme.colors.primary}
//                           style={{marginRight: 6}}
//                         />
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 14,
//                           }}>
//                           {link.name}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>

//                   {/* Optional "More" button */}
//                   <TouchableOpacity
//                     disabled // 👈 disables press interaction
//                     style={{
//                       marginTop: 12,
//                       paddingVertical: 10,
//                       paddingHorizontal: 20,
//                       borderRadius: 12,
//                       backgroundColor: theme.colors.surface3, // 👈 softer color so it looks inactive
//                       opacity: 0.5, // 👈 visually indicate disabled
//                     }}>
//                     <Text
//                       style={{
//                         color: theme.colors.muted, // 👈 use muted text to match disabled state
//                         fontWeight: '600',
//                       }}>
//                       View More Retailers →
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

//       <ReaderModal
//         visible={!!shopReaderUrl}
//         url={shopReaderUrl || undefined}
//         title={shopReaderTitle || 'Shop'}
//         onClose={() => {
//           setShopReaderUrl(null);
//           setShopReaderTitle(null);
//         }}
//       />
//     </View>
//   );
// }

////////////////////////

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
// import * as Animatable from 'react-native-animatable';
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
// import ReaderModal from '../components/FashionFeed/ReaderModal';

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

//   // 📰 Shopping Reader Modal
//   const [shopReaderUrl, setShopReaderUrl] = useState<string | null>(null);
//   const [shopReaderTitle, setShopReaderTitle] = useState<string | null>(null);

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

//   const isDisabled = !top || !bottom || !shoes;

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

//   const getShoppingLinks = (missing: string) => {
//     const query = encodeURIComponent(missing);
//     return [
//       {
//         name: 'Farfetch',
//         url: `https://www.farfetch.com/shopping/men/items.aspx?q=${query}`,
//       },
//       {
//         name: 'Mr Porter',
//         url: `https://www.mrporter.com/en-us/mens/search?keywords=${query}`,
//       },
//       {
//         name: 'Nordstrom',
//         url: `https://www.nordstrom.com/sr?keyword=${query}`,
//       },
//       {
//         name: 'Matches Fashion',
//         url: `https://www.google.com/search?q=${encodeURIComponent(
//           missing,
//         )}&tbm=shop=${query}`,
//       },
//       {
//         name: 'Google Shop',
//         url: `https://www.google.com/search?q=${encodeURIComponent(
//           missing,
//         )}&tbm=shop=${query}`,
//       },
//       {
//         name: 'SSENSE',
//         url: `https://www.ssense.com/en-us/men/search?q=${query}`,
//       },
//     ];
//   };

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
//       height: 325,
//       borderRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//       elevation: 3,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'contain',
//     },
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0, 0, 0, 0.29)',
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
//     itemName: {fontSize: 18, fontWeight: '600', color: theme.colors.foreground},
//     whyText: {
//       fontSize: 18,
//       color: theme.colors.button1,
//       marginTop: 6,
//       fontWeight: '500',
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
//       style={[
//         styles.cardOverlay,
//         globalStyles.cardStyles3,
//         {backgroundColor: theme.colors.surface3},
//       ]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View
//         style={[
//           styles.categoryPill,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
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
//         {backgroundColor: theme.colors.background, paddingBottom: 150},
//       ]}>
//       <View className="sectionTitle">
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}> Style Me</Text>
//         </View>

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: 50,
//             marginBottom: 14,
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: 16,
//               color: theme.colors.foreground,
//               fontWeight: '500',
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
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
//                       marginTop: 12,
//                     }}>
//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => setFeedbackModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         Rate Outfit
//                       </Text>
//                     </TouchableOpacity>
//                     {/*
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
//                       <Text style={[globalStyles.buttonPrimaryText, {backgroundColor: 'disabled'}]}>
//                         Try On
//                       </Text>
//                     </TouchableOpacity> */}

//                     <TouchableOpacity
//                       style={[
//                         globalStyles.buttonPrimary,
//                         {width: 120, opacity: isDisabled ? 0.5 : 1}, // 👈 fade if disabled
//                       ]}
//                       disabled={isDisabled} // 👈 this is what actually disables the button
//                       onPress={() =>
//                         navigate('TryOnOverlay', {
//                           outfit: {top, bottom, shoes},
//                           userPhotoUri: Image.resolveAssetSource(
//                             require('../assets/images/full-body-temp1.png'),
//                           ).uri,
//                         })
//                       }>
//                       <Text
//                         style={[
//                           globalStyles.buttonPrimaryText,
//                           {color: isDisabled ? '#999' : '#fff'}, // 👈 text color change optional
//                         ]}>
//                         Try On
//                       </Text>
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
//                       marginBottom: 16,
//                     }}>
//                     {current.missing}
//                   </Text>

//                   {/* 🛍️ Premium Horizontal Retailer Row */}
//                   <ScrollView
//                     horizontal
//                     showsHorizontalScrollIndicator={false}
//                     contentContainerStyle={{
//                       paddingVertical: 4,
//                       paddingHorizontal: 4,
//                     }}>
//                     {getShoppingLinks(current.missing!).map(link => (
//                       <TouchableOpacity
//                         key={link.name}
//                         onPress={() => {
//                           setShopReaderUrl(link.url);
//                           setShopReaderTitle(`Find on ${link.name}`);
//                         }}
//                         activeOpacity={0.9}
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           backgroundColor: theme.colors.surface3,
//                           paddingVertical: 10,
//                           paddingHorizontal: 16,
//                           borderRadius: 20,
//                           marginRight: 12,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.08,
//                           shadowRadius: 4,
//                           elevation: 2,
//                         }}>
//                         <MaterialIcons
//                           name="storefront"
//                           size={18}
//                           color={theme.colors.primary}
//                           style={{marginRight: 6}}
//                         />
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 14,
//                           }}>
//                           {link.name}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>

//                   {/* Optional "More" button if you want future scaling */}

//                   <TouchableOpacity
//                     onPress={() =>
//                       navigate('FindMoreRetailers', {query: current.missing})
//                     }
//                     style={{
//                       marginTop: 12,
//                       paddingVertical: 10,
//                       paddingHorizontal: 20,
//                       borderRadius: 12,
//                       backgroundColor: theme.colors.button1,
//                     }}>
//                     <Text
//                       style={{color: theme.colors.primary, fontWeight: '600'}}>
//                       View More Retailers →
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

//       <ReaderModal
//         visible={!!shopReaderUrl}
//         url={shopReaderUrl || undefined}
//         title={shopReaderTitle || 'Shop'}
//         onClose={() => {
//           setShopReaderUrl(null);
//           setShopReaderTitle(null);
//         }}
//       />
//     </View>
//   );
// }

///////////////////////

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
// import * as Animatable from 'react-native-animatable';
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

//   const isDisabled = !top || !bottom || !shoes;

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
//       height: 325,
//       borderRadius: tokens.borderRadius.md,
//       overflow: 'hidden',
//       marginBottom: 16,
//       backgroundColor: '#1c1c1e',
//       elevation: 3,
//     },
//     cardImage: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'contain',
//     },
//     overlay: {
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//       backgroundColor: 'rgba(0, 0, 0, 0.29)',
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
//     itemName: {fontSize: 18, fontWeight: '600', color: theme.colors.foreground},
//     whyText: {
//       fontSize: 18,
//       color: theme.colors.button1,
//       marginTop: 6,
//       fontWeight: '500',
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
//       style={[
//         styles.cardOverlay,
//         globalStyles.cardStyles3,
//         {backgroundColor: theme.colors.surface3},
//       ]}>
//       <Image
//         source={
//           item?.image
//             ? {uri: item.image}
//             : {uri: 'https://via.placeholder.com/300x200?text=No+Image'}
//         }
//         style={styles.cardImage}
//       />
//       <View
//         style={[
//           styles.categoryPill,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Text
//           style={[
//             globalStyles.label,
//             {paddingHorizontal: 8, paddingVertical: 4, fontSize: 16},
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
//         {backgroundColor: theme.colors.background, paddingBottom: 150},
//       ]}>
//       <View className="sectionTitle">
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}> Style Me</Text>
//         </View>

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: 50,
//             marginBottom: 14,
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: 16,
//               color: theme.colors.foreground,
//               fontWeight: '500',
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
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
//                       marginTop: 12,
//                     }}>
//                     <TouchableOpacity
//                       style={[globalStyles.buttonPrimary, {width: 120}]}
//                       onPress={() => setFeedbackModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         Rate Outfit
//                       </Text>
//                     </TouchableOpacity>
//                     {/*
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
//                       <Text style={[globalStyles.buttonPrimaryText, {backgroundColor: 'disabled'}]}>
//                         Try On
//                       </Text>
//                     </TouchableOpacity> */}

//                     <TouchableOpacity
//                       style={[
//                         globalStyles.buttonPrimary,
//                         {width: 120, opacity: isDisabled ? 0.5 : 1}, // 👈 fade if disabled
//                       ]}
//                       disabled={isDisabled} // 👈 this is what actually disables the button
//                       onPress={() =>
//                         navigate('TryOnOverlay', {
//                           outfit: {top, bottom, shoes},
//                           userPhotoUri: Image.resolveAssetSource(
//                             require('../assets/images/full-body-temp1.png'),
//                           ).uri,
//                         })
//                       }>
//                       <Text
//                         style={[
//                           globalStyles.buttonPrimaryText,
//                           {color: isDisabled ? '#999' : '#fff'}, // 👈 text color change optional
//                         ]}>
//                         Try On
//                       </Text>
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
//                       color={theme.colors.foreground}
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

///////////////////////////

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
// import * as Animatable from 'react-native-animatable';
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
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}> Style Me</Text>
//         </View>

//         {/* <Animatable.Text
//           animation="fadeInDown"
//           duration={900}
//           delay={100}
//           easing="ease-out-cubic"
//           style={[
//             globalStyles.header,
//             {color: theme.colors.foreground, marginBottom: 20},
//           ]}>
//           Style Me
//         </Animatable.Text> */}

//         {/* Header */}
//         <View
//           style={{
//             justifyContent: 'center',
//             paddingHorizontal: 50,
//             marginBottom: 4,
//           }}>
//           <Animatable.Text
//             animation="fadeInUp"
//             duration={800}
//             easing="ease-out-cubic"
//             delay={150}
//             style={{
//               textAlign: 'center',
//               fontSize: 16,
//               color: theme.colors.foreground,
//               fontWeight: '500',
//             }}>
//             "Let's create an outfit! - Just tell me what you want and press
//             Create Outfit"
//           </Animatable.Text>
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
